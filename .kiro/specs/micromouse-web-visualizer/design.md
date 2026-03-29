# Design Document: Micromouse Web Visualizer

## Overview

The Micromouse Web Visualizer is a real-time telemetry and visualization system consisting of two components:

1. **Arduino Telemetry Module (telemetry.ino)**: Serializes maze state data to JSON and transmits over Serial1 (HC-05 Bluetooth Classic module at 57600 baud)
2. **React Web Application**: Connects to the paired serial port via Web Serial API, receives telemetry packets, and renders an interactive maze visualization on HTML canvas

The system enables developers to observe the robot's maze-solving algorithm in real-time, displaying the maze grid, discovered walls, floodfill cost values, robot position/orientation, and the pathfinding progress.

### Key Design Decisions

- **JSON over binary protocol**: Human-readable for debugging, widely supported, minimal parsing overhead in JavaScript
- **Newline-delimited packets**: Simple framing mechanism, easy to buffer and parse
- **Canvas rendering**: High performance for 60fps updates, full control over drawing primitives
- **Minimal Arduino footprint**: Non-blocking transmission, reads existing global state without modification
- **Web Serial API**: Direct browser-to-serial communication without server middleware

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Micromouse Robot                         │
│  ┌──────────────┐      ┌─────────────────┐                 │
│  │ Maze Solving │─────▶│ telemetry.ino   │                 │
│  │ Logic        │      │ (JSON Encoder)  │                 │
│  │ (mazeLoop)   │      └────────┬────────┘                 │
│  └──────────────┘               │                           │
│         │                       │                           │
│         │ reads                 │ writes                    │
│         ▼                       ▼                           │
│  ┌──────────────────────────────────────┐                  │
│  │  Global State (maze[][], robotX/Y)   │                  │
│  └──────────────────────────────────────┘                  │
│                                 │                           │
│                                 ▼                           │
│                          Serial1 (57600)                    │
│                                 │                           │
└─────────────────────────────────┼───────────────────────────┘
                                  │
                                  │ Bluetooth Classic (HC-05)
                                  │ (paired as serial port)
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Computer / Browser                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              React Web Application                  │    │
│  │                                                      │    │
│  │  ┌──────────────────┐      ┌──────────────────┐   │    │
│  │  │ Connection       │      │ Telemetry        │   │    │
│  │  │ Manager          │─────▶│ Parser           │   │    │
│  │  │ (Web Serial API) │      │ (JSON Decoder)   │   │    │
│  │  └──────────────────┘      └────────┬─────────┘   │    │
│  │                                      │              │    │
│  │                                      ▼              │    │
│  │                            ┌──────────────────┐    │    │
│  │                            │ React State      │    │    │
│  │                            │ (mazeState)      │    │    │
│  │                            └────────┬─────────┘    │    │
│  │                                     │              │    │
│  │                                     ▼              │    │
│  │                            ┌──────────────────┐    │    │
│  │                            │ Maze Renderer    │    │    │
│  │                            │ (Canvas)         │    │    │
│  │                            └──────────────────┘    │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Maze Solving Loop** calls `sendMazeState()` after each cell update
2. **telemetry.ino** reads global maze array and robot position variables
3. **telemetry.ino** serializes data to compact JSON format
4. **telemetry.ino** writes JSON packet + newline to Serial1
5. **HC-05 Module** transmits data over Bluetooth Classic to paired computer
6. **Web Serial API** receives bytes from virtual serial port
7. **Connection Manager** buffers bytes until newline detected
8. **Telemetry Parser** parses JSON into JavaScript object
9. **React State** updates with new maze state
10. **Maze Renderer** redraws canvas with updated visualization

## Components and Interfaces

### Arduino Telemetry Module (telemetry.ino)

#### Public Interface

```cpp
// Call this function from mazeLoop() after maze state changes
void sendMazeState();
```

#### Implementation Strategy

The telemetry module must integrate with existing code without modification. It reads from global variables:

- `maze[MAZE_WIDTH][MAZE_HEIGHT]` - Cell array with cost and wall data
- `robotX`, `robotY`, `robotDir` - Robot position
- `MAZE_WIDTH`, `MAZE_HEIGHT` - Maze dimensions
- `targetX`, `targetY` - Goal cell coordinates

**JSON Packet Format** (compact, minimal whitespace):

```json
{"w":3,"h":3,"tx":2,"ty":2,"rx":0,"ry":0,"rd":0,"c":[[{"x":0,"y":0,"c":4,"w":[0,0,1,1]},{"x":1,"y":0,"c":3,"w":[0,0,1,0]},{"x":2,"y":0,"c":2,"w":[0,1,1,0]}],[{"x":0,"y":1,"c":3,"w":[0,0,0,1]},{"x":1,"y":1,"c":2,"w":[0,0,0,0]},{"x":2,"y":1,"c":1,"w":[0,1,0,0]}],[{"x":0,"y":2,"c":2,"w":[1,0,0,1]},{"x":1,"y":2,"c":1,"w":[1,0,0,0]},{"x":2,"y":2,"c":0,"w":[1,1,0,0]}]]}\n
```

**Field Definitions**:
- `w`: maze width
- `h`: maze height
- `tx`: target X coordinate
- `ty`: target Y coordinate
- `rx`: robot X coordinate
- `ry`: robot Y coordinate
- `rd`: robot direction (0=North, 90=East, 180=South, 270=West)
- `c`: 2D array of cells (indexed as `c[x][y]`)
  - `x`: cell X coordinate
  - `y`: cell Y coordinate
  - `c`: floodfill cost value (0-255)
  - `w`: wall array [north, east, south, west] (0=no wall, 1=wall)

**Buffer Management**:
- Serial1 buffer size on RP2040: typically 256-1024 bytes
- Maximum packet size for 16x16 maze: ~8KB (exceeds buffer)
- Strategy: Only send changed cells (delta encoding) OR limit to smaller mazes (3x3 to 8x8)
- For initial implementation: Support up to 5x5 maze (~1.5KB packet)
- Transmission time at 57600 baud: ~200ms for 1.5KB (acceptable for maze solving frequency)

#### Pseudo-code Implementation

```cpp
void sendMazeState() {
  Serial1.print("{\"w\":");
  Serial1.print(MAZE_WIDTH);
  Serial1.print(",\"h\":");
  Serial1.print(MAZE_HEIGHT);
  Serial1.print(",\"tx\":");
  Serial1.print(targetX);
  Serial1.print(",\"ty\":");
  Serial1.print(targetY);
  Serial1.print(",\"rx\":");
  Serial1.print(robotX);
  Serial1.print(",\"ry\":");
  Serial1.print(robotY);
  Serial1.print(",\"rd\":");
  Serial1.print(robotDir);
  Serial1.print(",\"c\":[");
  
  for (int x = 0; x < MAZE_WIDTH; x++) {
    Serial1.print("[");
    for (int y = 0; y < MAZE_HEIGHT; y++) {
      Serial1.print("{\"x\":");
      Serial1.print(x);
      Serial1.print(",\"y\":");
      Serial1.print(y);
      Serial1.print(",\"c\":");
      Serial1.print(maze[x][y].cost);
      Serial1.print(",\"w\":[");
      Serial1.print(maze[x][y].walls[0] ? 1 : 0);
      Serial1.print(",");
      Serial1.print(maze[x][y].walls[1] ? 1 : 0);
      Serial1.print(",");
      Serial1.print(maze[x][y].walls[2] ? 1 : 0);
      Serial1.print(",");
      Serial1.print(maze[x][y].walls[3] ? 1 : 0);
      Serial1.print("]}");
      if (y < MAZE_HEIGHT - 1) Serial1.print(",");
    }
    Serial1.print("]");
    if (x < MAZE_WIDTH - 1) Serial1.print(",");
  }
  
  Serial1.println("]}");
}
```

### React Web Application

#### Component Hierarchy

```
App
├── ConnectionPanel
│   ├── ConnectButton
│   └── StatusIndicator
├── MazeCanvas
│   └── (canvas element)
├── SettingsPanel
│   ├── ToggleSwitch (show costs)
│   ├── ToggleSwitch (show walls)
│   └── ColorPicker (theme)
└── InfoPanel
    ├── RobotPosition
    └── ConnectionStats
```

#### Component Responsibilities

**App**: Root component, manages global state (mazeState, connectionState, settings), orchestrates data flow

**ConnectionPanel**: Handles Web Serial API connection lifecycle
- Requests port selection
- Opens/closes serial connection
- Displays connection status
- Provides reconnection UI

**MazeCanvas**: Renders maze visualization on HTML canvas
- Draws grid lines
- Draws walls
- Draws cost values
- Draws robot icon with orientation
- Handles responsive sizing
- Implements pan/zoom gestures

**SettingsPanel**: User preferences UI
- Toggle visibility of costs/walls
- Color scheme selection
- Persists to localStorage

**InfoPanel**: Displays telemetry metadata
- Current robot position
- Connection status
- Packet receive rate

### Web Serial API Integration

#### Connection Manager Module

```typescript
interface SerialConfig {
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
}

class ConnectionManager {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private buffer: string = '';
  
  async requestPort(): Promise<void> {
    // Request user to select serial port
    this.port = await navigator.serial.requestPort();
  }
  
  async connect(onPacket: (data: MazeState) => void): Promise<void> {
    if (!this.port) throw new Error('No port selected');
    
    await this.port.open({
      baudRate: 57600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    });
    
    const decoder = new TextDecoderStream();
    this.port.readable.pipeTo(decoder.writable);
    this.reader = decoder.readable.getReader();
    
    this.readLoop(onPacket);
  }
  
  private async readLoop(onPacket: (data: MazeState) => void): Promise<void> {
    while (this.reader) {
      const { value, done } = await this.reader.read();
      if (done) break;
      
      this.buffer += value;
      
      // Process complete packets (newline-delimited)
      let newlineIndex;
      while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
        const packet = this.buffer.substring(0, newlineIndex);
        this.buffer = this.buffer.substring(newlineIndex + 1);
        
        try {
          const parsed = JSON.parse(packet);
          onPacket(parsed);
        } catch (e) {
          console.error('Failed to parse packet:', e);
        }
      }
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.reader) {
      await this.reader.cancel();
      this.reader = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
  }
}
```

### Canvas Rendering Strategy

#### Rendering Pipeline

1. **Calculate Layout**: Determine cell size based on canvas dimensions and maze dimensions
2. **Clear Canvas**: Fill background
3. **Draw Grid**: Draw cell borders
4. **Draw Cost Gradient**: Fill cells with color based on cost value
5. **Draw Cost Text**: Render cost numbers centered in cells
6. **Draw Walls**: Draw thick lines for discovered walls
7. **Draw Robot**: Draw robot icon with directional indicator
8. **Draw Target**: Highlight goal cell

#### Performance Optimizations

- Use `requestAnimationFrame` for smooth rendering
- Only redraw when state changes (React memo)
- Pre-calculate layout dimensions
- Use integer coordinates for crisp lines
- Batch canvas operations

#### Responsive Sizing

```typescript
function calculateLayout(canvasWidth: number, canvasHeight: number, mazeWidth: number, mazeHeight: number) {
  const padding = 20;
  const availableWidth = canvasWidth - 2 * padding;
  const availableHeight = canvasHeight - 2 * padding;
  
  const cellSize = Math.min(
    availableWidth / mazeWidth,
    availableHeight / mazeHeight
  );
  
  const gridWidth = cellSize * mazeWidth;
  const gridHeight = cellSize * mazeHeight;
  
  const offsetX = (canvasWidth - gridWidth) / 2;
  const offsetY = (canvasHeight - gridHeight) / 2;
  
  return { cellSize, offsetX, offsetY, gridWidth, gridHeight };
}
```

#### Drawing Functions

```typescript
function drawGrid(ctx: CanvasRenderingContext2D, layout: Layout, mazeWidth: number, mazeHeight: number) {
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  
  for (let x = 0; x <= mazeWidth; x++) {
    const px = layout.offsetX + x * layout.cellSize;
    ctx.beginPath();
    ctx.moveTo(px, layout.offsetY);
    ctx.lineTo(px, layout.offsetY + layout.gridHeight);
    ctx.stroke();
  }
  
  for (let y = 0; y <= mazeHeight; y++) {
    const py = layout.offsetY + y * layout.cellSize;
    ctx.beginPath();
    ctx.moveTo(layout.offsetX, py);
    ctx.lineTo(layout.offsetX + layout.gridWidth, py);
    ctx.stroke();
  }
}

function drawWalls(ctx: CanvasRenderingContext2D, layout: Layout, cells: Cell[][]) {
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  
  for (let x = 0; x < cells.length; x++) {
    for (let y = 0; y < cells[x].length; y++) {
      const cell = cells[x][y];
      const px = layout.offsetX + x * layout.cellSize;
      const py = layout.offsetY + y * layout.cellSize;
      
      // North wall
      if (cell.w[0]) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + layout.cellSize, py);
        ctx.stroke();
      }
      
      // East wall
      if (cell.w[1]) {
        ctx.beginPath();
        ctx.moveTo(px + layout.cellSize, py);
        ctx.lineTo(px + layout.cellSize, py + layout.cellSize);
        ctx.stroke();
      }
      
      // South wall
      if (cell.w[2]) {
        ctx.beginPath();
        ctx.moveTo(px, py + layout.cellSize);
        ctx.lineTo(px + layout.cellSize, py + layout.cellSize);
        ctx.stroke();
      }
      
      // West wall
      if (cell.w[3]) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + layout.cellSize);
        ctx.stroke();
      }
    }
  }
}

function drawRobot(ctx: CanvasRenderingContext2D, layout: Layout, rx: number, ry: number, rd: number) {
  const px = layout.offsetX + rx * layout.cellSize + layout.cellSize / 2;
  const py = layout.offsetY + ry * layout.cellSize + layout.cellSize / 2;
  const radius = layout.cellSize * 0.3;
  
  // Draw circle
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw direction indicator (triangle)
  const angle = (rd * Math.PI) / 180;
  const tipX = px + Math.cos(angle - Math.PI / 2) * radius;
  const tipY = py + Math.sin(angle - Math.PI / 2) * radius;
  
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    px + Math.cos(angle - Math.PI / 2 + 2.5) * radius * 0.5,
    py + Math.sin(angle - Math.PI / 2 + 2.5) * radius * 0.5
  );
  ctx.lineTo(
    px + Math.cos(angle - Math.PI / 2 - 2.5) * radius * 0.5,
    py + Math.sin(angle - Math.PI / 2 - 2.5) * radius * 0.5
  );
  ctx.closePath();
  ctx.fill();
}

function getCostColor(cost: number, maxCost: number): string {
  if (cost === 255) return '#f0f0f0'; // Unexplored
  
  const normalized = cost / maxCost;
  const hue = (1 - normalized) * 240; // Blue (240) to Red (0)
  return `hsl(${hue}, 70%, 85%)`;
}
```

## Data Models

### TypeScript Interfaces

```typescript
interface Cell {
  x: number;
  y: number;
  c: number;  // cost (0-255, 255 = unexplored)
  w: [number, number, number, number];  // walls [N, E, S, W]
}

interface MazeState {
  w: number;   // width
  h: number;   // height
  tx: number;  // target X
  ty: number;  // target Y
  rx: number;  // robot X
  ry: number;  // robot Y
  rd: number;  // robot direction (0, 90, 180, 270)
  c: Cell[][]; // cells indexed as c[x][y]
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  errorMessage?: string;
  port?: SerialPort;
}

interface Settings {
  showCosts: boolean;
  showWalls: boolean;
  colorScheme: 'default' | 'high-contrast' | 'dark';
}

interface AppState {
  mazeState: MazeState | null;
  connectionState: ConnectionState;
  settings: Settings;
}
```

### Arduino Data Structures

The telemetry module reads from existing structures defined in the Arduino code:

```cpp
struct Cell {
  uint8_t x;
  uint8_t y;
  uint8_t cost;
  bool walls[4];  // [N, E, S, W]
};

extern Cell maze[MAZE_WIDTH][MAZE_HEIGHT];
extern int robotX;
extern int robotY;
extern int robotDir;
extern const uint8_t targetX;
extern const uint8_t targetY;
extern const int MAZE_WIDTH;
extern const int MAZE_HEIGHT;
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Maze State Serialization Round-Trip

*For any* valid maze state (including maze dimensions, all cell data with coordinates/costs/walls, and robot position), serializing to JSON and then deserializing should produce an equivalent maze state with all fields preserved.

**Validates: Requirements 1.1, 1.2, 1.5, 1.6, 3.2**

### Property 2: Telemetry Packet Newline Termination

*For any* maze state, when serialized to a telemetry packet, the output string should end with a newline character ('\n').

**Validates: Requirements 1.7**

### Property 3: Packet Buffering Completeness

*For any* sequence of telemetry packets split into arbitrary byte chunks, the buffering mechanism should reconstruct all complete packets (newline-delimited) without loss or corruption.

**Validates: Requirements 3.1**

### Property 4: Malformed JSON Recovery

*For any* sequence containing malformed JSON packets followed by valid packets, the parser should skip the malformed packets and successfully parse all subsequent valid packets without crashing.

**Validates: Requirements 3.3, 10.2**

### Property 5: Maze State Validation

*For any* JSON object missing required maze state fields (w, h, tx, ty, rx, ry, rd, c), the validation function should reject the object and not update the visualization state.

**Validates: Requirements 3.4**

### Property 6: Grid Layout Square Cells

*For any* viewport dimensions and maze dimensions, the calculated cell size should produce square cells (width equals height) that fit within the available space.

**Validates: Requirements 4.2**

### Property 7: Wall Rendering Correspondence

*For any* maze state, every cell with a wall flag set to true in a given direction should have a corresponding wall line drawn on the canvas at the correct cell boundary.

**Validates: Requirements 4.3**

### Property 8: Maze Dimension Adaptability

*For any* maze dimensions between 3x3 and 16x16, the renderer should successfully calculate layout and render the complete grid without errors.

**Validates: Requirements 4.7**

### Property 9: Cost Color Gradient Monotonicity

*For any* two cells with costs c1 and c2 where c1 < c2 (and neither is 255), the hue value of c1's color should be greater than the hue value of c2's color (cooler to warmer gradient).

**Validates: Requirements 5.2**

### Property 10: Robot Position Rendering

*For any* robot position (rx, ry) within maze bounds, the robot icon should be drawn with its center at the canvas coordinates corresponding to the center of cell (rx, ry).

**Validates: Requirements 6.1**

### Property 11: Robot Orientation Correspondence

*For any* robot direction value (0, 90, 180, 270), the robot's directional indicator should point in the corresponding compass direction (North, East, South, West respectively).

**Validates: Requirements 6.2, 6.6**

### Property 12: Robot Icon Scaling

*For any* cell size, the robot icon radius should be proportional to the cell size (e.g., 0.3 * cellSize), ensuring the robot scales with the grid.

**Validates: Requirements 6.5**

### Property 13: Responsive Layout Adaptation

*For any* screen width between 320px and 1920px, the application layout should render without horizontal scrolling and all UI elements should remain accessible.

**Validates: Requirements 7.1**

### Property 14: Settings Toggle Effect

*For any* settings toggle (showCosts, showWalls), changing the toggle value should result in the corresponding visual elements being shown or hidden in the next render.

**Validates: Requirements 8.2, 8.3**

### Property 15: Color Scheme Application

*For any* color scheme selection, all rendered elements (walls, costs, robot) should use colors from the selected scheme in the next render.

**Validates: Requirements 8.4**

### Property 16: Settings Persistence Round-Trip

*For any* valid settings object, saving to localStorage and then loading should produce an equivalent settings object with all fields preserved.

**Validates: Requirements 8.5, 8.6**

### Property 17: Telemetry Read-Only Behavior

*For any* maze state, calling sendMazeState() should not modify any global variables (maze array, robotX, robotY, robotDir) - the state before and after the call should be identical.

**Validates: Requirements 9.5**

### Property 18: Telemetry Data Source Correspondence

*For any* maze state in global variables, the serialized JSON packet should contain cell costs and wall data that exactly match the values in the global maze array.

**Validates: Requirements 9.3, 9.4**

### Property 19: Dimension Change Reinitialization

*For any* two consecutive telemetry packets with different maze dimensions, receiving the second packet should trigger a grid reinitialization with the new dimensions.

**Validates: Requirements 10.3**

## Error Handling

### Arduino Telemetry Module

**Serial Buffer Overflow**:
- Serial1 buffer on RP2040 is limited (typically 256-1024 bytes)
- For large mazes (>5x5), packet size may exceed buffer capacity
- Mitigation: Limit supported maze size to 5x5 for initial implementation
- Future enhancement: Implement delta encoding (only send changed cells)

**Transmission Blocking**:
- Serial1.print() calls are blocking
- Large packets can take 100-200ms to transmit at 57600 baud
- Mitigation: Only call sendMazeState() after significant state changes (not every loop iteration)
- Ensure transmission completes within acceptable time budget

**Data Integrity**:
- No error detection/correction in serial transmission
- Bluetooth Classic provides some error handling at link layer
- Mitigation: JSON parsing on receiver side will catch corrupted packets
- Invalid packets are logged and discarded

### Web Application

**Connection Errors**:
- Web Serial API not supported: Display browser compatibility message
- Permission denied: Prompt user to grant serial port access
- Port access failed: Display error with troubleshooting steps
- Connection timeout: Abort after 10 seconds, allow retry

**Parsing Errors**:
- Malformed JSON: Log error, discard packet, continue listening
- Missing required fields: Validate before state update, discard invalid packets
- Type mismatches: Use TypeScript for compile-time type safety

**State Errors**:
- Dimension mismatch: Reinitialize grid with new dimensions
- Out-of-bounds robot position: Clamp to valid range or skip update
- Invalid cost values: Treat as unexplored (255)

**Rendering Errors**:
- Canvas context unavailable: Display fallback message
- Layout calculation errors: Use safe defaults
- Animation frame errors: Gracefully degrade to static rendering

**Disconnection Handling**:
- Detect disconnection via Web Serial API events
- Display disconnection message
- Provide manual reconnection button
- Clear stale data on reconnection

**Timeout Warnings**:
- Track time since last packet received
- Display warning if no data for 5 seconds during active connection
- Helps diagnose robot/Bluetooth issues

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, error conditions, and integration points
- **Property tests**: Verify universal properties across all inputs through randomization

Both approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide input space.

### Arduino Telemetry Module Testing

**Property-Based Tests** (using a C++ property testing library or manual test harness):

- Property 1: Maze State Serialization Round-Trip (100+ iterations)
  - Generate random maze states
  - Serialize to JSON string
  - Parse JSON back to maze state
  - Verify all fields match original
  - Tag: **Feature: micromouse-web-visualizer, Property 1: Maze State Serialization Round-Trip**

- Property 2: Telemetry Packet Newline Termination (100+ iterations)
  - Generate random maze states
  - Serialize to string
  - Verify last character is '\n'
  - Tag: **Feature: micromouse-web-visualizer, Property 2: Telemetry Packet Newline Termination**

- Property 17: Telemetry Read-Only Behavior (100+ iterations)
  - Generate random maze states in global variables
  - Capture state snapshot
  - Call sendMazeState()
  - Verify global variables unchanged
  - Tag: **Feature: micromouse-web-visualizer, Property 17: Telemetry Read-Only Behavior**

- Property 18: Telemetry Data Source Correspondence (100+ iterations)
  - Generate random maze states in global variables
  - Call sendMazeState() and capture output
  - Parse JSON
  - Verify all cell costs and walls match global array
  - Tag: **Feature: micromouse-web-visualizer, Property 18: Telemetry Data Source Correspondence**

**Unit Tests**:

- Test sendMazeState() with 3x3 maze (minimum size)
- Test sendMazeState() with 5x5 maze (maximum supported size)
- Test JSON format matches specification
- Test with all walls present
- Test with no walls present
- Test with cost value 255 (unexplored)
- Test with cost value 0 (target)
- Test with robot at each corner position
- Test with robot at each direction (0, 90, 180, 270)

### Web Application Testing

**Property-Based Tests** (using fast-check or similar JavaScript library):

Configure all property tests to run minimum 100 iterations.

- Property 1: Maze State Serialization Round-Trip (100+ iterations)
  - Generate random MazeState objects
  - Serialize to JSON
  - Parse back to object
  - Verify equivalence
  - Tag: **Feature: micromouse-web-visualizer, Property 1: Maze State Serialization Round-Trip**

- Property 3: Packet Buffering Completeness (100+ iterations)
  - Generate random sequences of complete packets
  - Split into random byte chunks
  - Feed to buffer
  - Verify all packets reconstructed
  - Tag: **Feature: micromouse-web-visualizer, Property 3: Packet Buffering Completeness**

- Property 4: Malformed JSON Recovery (100+ iterations)
  - Generate sequences with malformed and valid packets
  - Feed to parser
  - Verify valid packets parsed, malformed skipped
  - Verify no crashes
  - Tag: **Feature: micromouse-web-visualizer, Property 4: Malformed JSON Recovery**

- Property 5: Maze State Validation (100+ iterations)
  - Generate objects with random missing fields
  - Pass to validator
  - Verify rejection
  - Tag: **Feature: micromouse-web-visualizer, Property 5: Maze State Validation**

- Property 6: Grid Layout Square Cells (100+ iterations)
  - Generate random viewport and maze dimensions
  - Calculate layout
  - Verify cellWidth === cellHeight
  - Tag: **Feature: micromouse-web-visualizer, Property 6: Grid Layout Square Cells**

- Property 7: Wall Rendering Correspondence (100+ iterations)
  - Generate random maze states
  - Render to canvas
  - Verify wall lines drawn for each wall flag
  - Tag: **Feature: micromouse-web-visualizer, Property 7: Wall Rendering Correspondence**

- Property 8: Maze Dimension Adaptability (100+ iterations)
  - Generate random dimensions 3x3 to 16x16
  - Render maze
  - Verify no errors
  - Tag: **Feature: micromouse-web-visualizer, Property 8: Maze Dimension Adaptability**

- Property 9: Cost Color Gradient Monotonicity (100+ iterations)
  - Generate random cost pairs where c1 < c2
  - Calculate colors
  - Verify hue(c1) > hue(c2)
  - Tag: **Feature: micromouse-web-visualizer, Property 9: Cost Color Gradient Monotonicity**

- Property 10: Robot Position Rendering (100+ iterations)
  - Generate random robot positions
  - Render robot
  - Verify icon center at correct canvas coordinates
  - Tag: **Feature: micromouse-web-visualizer, Property 10: Robot Position Rendering**

- Property 11: Robot Orientation Correspondence (100+ iterations)
  - Generate random directions
  - Render robot
  - Verify directional indicator points correctly
  - Tag: **Feature: micromouse-web-visualizer, Property 11: Robot Orientation Correspondence**

- Property 12: Robot Icon Scaling (100+ iterations)
  - Generate random cell sizes
  - Render robot
  - Verify icon radius proportional to cell size
  - Tag: **Feature: micromouse-web-visualizer, Property 12: Robot Icon Scaling**

- Property 13: Responsive Layout Adaptation (100+ iterations)
  - Generate random screen widths 320-1920px
  - Render layout
  - Verify no horizontal scroll
  - Tag: **Feature: micromouse-web-visualizer, Property 13: Responsive Layout Adaptation**

- Property 14: Settings Toggle Effect (100+ iterations)
  - Generate random settings states
  - Toggle showCosts/showWalls
  - Verify visual elements shown/hidden
  - Tag: **Feature: micromouse-web-visualizer, Property 14: Settings Toggle Effect**

- Property 15: Color Scheme Application (100+ iterations)
  - Generate random color schemes
  - Apply scheme
  - Verify all elements use scheme colors
  - Tag: **Feature: micromouse-web-visualizer, Property 15: Color Scheme Application**

- Property 16: Settings Persistence Round-Trip (100+ iterations)
  - Generate random settings objects
  - Save to localStorage
  - Load from localStorage
  - Verify equivalence
  - Tag: **Feature: micromouse-web-visualizer, Property 16: Settings Persistence Round-Trip**

- Property 19: Dimension Change Reinitialization (100+ iterations)
  - Generate pairs of packets with different dimensions
  - Process both packets
  - Verify grid reinitialized with new dimensions
  - Tag: **Feature: micromouse-web-visualizer, Property 19: Dimension Change Reinitialization**

**Unit Tests**:

- Connection Manager:
  - Test port selection UI
  - Test connection with correct baud rate (57600)
  - Test connection with correct serial config (8N1)
  - Test connection status display
  - Test connection error display
  - Test disconnection notification
  - Test reconnection flow
  - Test connection timeout (10 seconds)

- Telemetry Parser:
  - Test parsing valid minimal packet
  - Test parsing valid maximal packet
  - Test parsing with extra whitespace
  - Test parsing with missing fields
  - Test parsing with wrong types

- Maze Renderer:
  - Test rendering 3x3 maze
  - Test rendering 16x16 maze
  - Test rendering with all walls
  - Test rendering with no walls
  - Test rendering unexplored cells (cost 255)
  - Test rendering target cell highlight
  - Test rendering robot at (0,0) facing North
  - Test rendering robot at center facing East
  - Test cost text visibility
  - Test grid line visibility

- Settings Panel:
  - Test settings panel exists
  - Test toggle controls exist
  - Test color scheme selector exists
  - Test reset button restores defaults
  - Test settings persist on page reload

- Error Handling:
  - Test Web Serial API not supported message
  - Test permission denied error
  - Test port access failed error
  - Test disconnection message
  - Test no data timeout warning (5 seconds)
  - Test malformed JSON logged and skipped

- Responsive Design:
  - Test layout at 320px width (mobile)
  - Test layout at 768px width (tablet)
  - Test layout at 1920px width (desktop)
  - Test portrait orientation
  - Test landscape orientation
  - Test touch-friendly button sizes

### Integration Testing

- End-to-end test: Arduino → Bluetooth → Web App
  - Run actual robot with telemetry module
  - Connect web app to serial port
  - Verify real-time visualization updates
  - Verify maze solving progress displayed correctly

- Performance testing:
  - Measure rendering frame rate (target: 60fps)
  - Measure packet processing latency
  - Measure memory usage over extended session

### Test Environment

- Arduino: PlatformIO with native testing framework
- Web App: Jest + React Testing Library + fast-check
- Browser compatibility: Chrome/Edge (Web Serial API support required)
- Mobile testing: Chrome on Android (Web Serial API support)

