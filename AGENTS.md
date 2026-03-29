# Micromouse Friend - AGENTS.md

## Project Overview

This project implements a **Micromouse robot** with a real-time web visualization system. The system consists of:

1. **Arduino Telemetry Module** (`telemetry.ino`): C++ code that serializes maze state data to JSON and transmits over Serial1 (HC-05 Bluetooth Classic module at 57600 baud)
2. **React Web Application**: Connects to the paired serial port via Web Serial API, receives telemetry packets, and renders an interactive maze visualization on HTML canvas

The robot uses a floodfill algorithm for maze solving, with sensors, motors, encoders, and an MPU6050 for navigation.

## Current State

The main Arduino code is in `micromouse-arduino-code.txt` which includes:
- Motion control (PID-based distance and angle driving)
- Encoder feedback
- MPU6050 gyroscope for heading
- Infrared sensors for wall detection
- Floodfill maze solving algorithm
- Wall following mode
- Multiple test modes via Serial1 configuration

## Planned Features (from .kiro/specs/micromouse-web-visualizer/)

### Arduino Telemetry Module
- `sendMazeState()` function to serialize maze state to JSON
- Transmits: maze dimensions, cell costs/walls, robot position, target coordinates
- JSON format: `{"w":3,"h":3,"tx":2,"ty":2,"rx":0,"ry":0,"rd":0,"c":[[...]]}\n`
- Should be non-blocking (<50ms transmission time)
- Reads from global variables without modifying maze-solving logic

### React Web Application Features
- **Web Serial API connection**: Connect to HC-05 paired serial port at 57600 baud, 8N1
- **Maze visualization**: Canvas-based rendering with grid, walls, costs, robot position
- **Interactive controls**: Connection panel, settings panel, info panel
- **Responsive design**: Mobile-first, works 320px-1920px, touch-friendly
- **Settings persistence**: Local storage for user preferences
- **Error handling**: Graceful handling of disconnection, malformed data, timeouts

## Key Data Structures

### Arduino (C++)
```cpp
struct Cell {
  uint8_t x;
  uint8_t y;
  uint8_t cost;
  bool walls[4];  // [N, E, S, W]
};

extern Cell maze[MAZE_WIDTH][MAZE_HEIGHT];
extern int robotX, robotY, robotDir;
extern const uint8_t targetX, targetY;
```

### Web App (TypeScript)
```typescript
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
```

## Development Guidelines

### Arduino Development
- Use PlatformIO for building/testing
- Target board: RP2040 (Raspberry Pi Pico)
- Serial1 is used for HC-05 (57600 baud)
- Avoid blocking operations that delay maze solving
- Test with actual maze dimensions (3x3 to 5x5 for initial implementation)

### Web App Development
- Framework: React (Create React App or Vite)
- No external dependencies required for core functionality
- Use Canvas API for rendering (60fps target)
- Web Serial API only supported in Chrome/Edge browsers
- Test with HC-05 Bluetooth module paired to computer

## Testing Strategy

The project uses both unit tests and property-based tests:

### Arduino Tests
- Property tests for JSON serialization round-trip
- Unit tests for various maze sizes and wall configurations
- Test with robot at different positions/directions

### Web App Tests
- Jest + React Testing Library + fast-check for property tests
- Unit tests for connection manager, parser, renderer
- Responsive design tests for various screen sizes
- Integration tests for end-to-end functionality

## Important Notes

1. **Web Serial API**: Requires user interaction to select serial port
2. **Bluetooth Pairing**: HC-05 must be paired to computer before web app can connect
3. **Maze Size Limits**: Initial implementation supports 3x3 to 5x5 mazes (~1.5KB packets)
4. **Baud Rate**: 57600 baud for both Arduino Serial1 and Web Serial API
5. **JSON Format**: Compact, newline-delimited packets for simple parsing

## File Structure

```
micromouse-friend/
├── .kiro/
│   └── specs/
│       └── micromouse-web-visualizer/
│           ├── requirements.md    # Feature requirements
│           ├── design.md          # Architecture and design decisions
│           └── tasks.md           # Implementation plan
├── .vscode/
│   └── settings.json
├── micromouse-arduino-code.txt    # Main Arduino code
└── AGENTS.md                      # This file
```

## Development Workflow

1. **Arduino Side**: Add `telemetry.ino` with `sendMazeState()` function
2. **Web App Side**: Build React components (ConnectionPanel, MazeCanvas, SettingsPanel, InfoPanel)
3. **Integration**: Test end-to-end with actual robot and Bluetooth connection
4. **Testing**: Run property tests and unit tests before committing

## Common Commands

### Arduino (PlatformIO)
```bash
pio run                    # Build firmware
pio run -t upload          # Upload to board
pio test                   # Run tests
```

### Web App (React)
```bash
npm install                # Install dependencies
npm start                  # Development server
npm test                   # Run tests
npm run build              # Production build
```

## Additional Resources

- Web Serial API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
- HC-05 Bluetooth Module: Paired as serial port at 57600 baud
- Floodfill Algorithm: Used for maze solving with cost-based pathfinding
- Micromouse Competition Rules: Standard 16x16 maze, 180mm cell size