# Requirements Document

## Introduction

This feature enables real-time visualization of a Micromouse robot's maze-solving progress through a React web application. The system consists of two components: an Arduino telemetry module that transmits maze state data over Bluetooth Classic (HC-05), and a web application that connects to the paired serial port and visualizes the data. The HC-05 module is paired to the computer and appears as a serial port that the Web Serial API can access. The visualization displays the maze grid, discovered walls, floodfill cost values, robot position and orientation, and the intended path.

## Glossary

- **Telemetry_Module**: Arduino code running on the Micromouse robot that serializes and transmits maze state data over Serial1 (HC-05 Bluetooth module)
- **Web_App**: React-based web application that connects to the robot via Web Serial API
- **Maze_State**: Complete snapshot of the maze including dimensions, cell costs, wall data, and robot position
- **Cell**: Individual square in the maze grid containing coordinates (x, y), floodfill cost value, and wall presence flags for four directions
- **Robot_Position**: Current location and orientation of the robot defined by x coordinate, y coordinate, and direction (0=North, 90=East, 180=South, 270=West)
- **Floodfill_Cost**: Numeric value representing the distance from a cell to the target cell, calculated by the floodfill algorithm
- **Wall_Data**: Boolean flags indicating wall presence in four directions (North=0, East=1, South=2, West=3)
- **Telemetry_Packet**: JSON-formatted message containing maze state data transmitted from robot to web application
- **Connection_Manager**: Web Serial API handler that manages serial port selection, connection, and data reception
- **Maze_Renderer**: React component responsible for drawing the maze visualization on HTML canvas
- **HC05_Module**: Bluetooth Classic SPP module connected to Arduino Serial1 at 57600 baud, paired to computer and accessible as serial port
- **Serial_Port**: Virtual COM port created by the operating system when HC05_Module is paired via Bluetooth Classic

## Requirements

### Requirement 1: Telemetry Data Transmission

**User Story:** As a robot developer, I want the Micromouse to transmit its maze state over Bluetooth, so that I can visualize the solving process in real-time.

#### Acceptance Criteria

1. THE Telemetry_Module SHALL serialize Maze_State into JSON format
2. THE Telemetry_Module SHALL include maze dimensions, all Cell data, and Robot_Position in each Telemetry_Packet
3. WHEN the maze state changes, THE Telemetry_Module SHALL transmit a Telemetry_Packet over Serial1
4. THE Telemetry_Module SHALL transmit data at 57600 baud rate
5. THE Telemetry_Module SHALL format each Cell with x coordinate, y coordinate, cost value, and Wall_Data array
6. THE Telemetry_Module SHALL represent Robot_Position with x coordinate, y coordinate, and direction value
7. THE Telemetry_Module SHALL terminate each Telemetry_Packet with a newline character

### Requirement 2: Serial Port Connection Management

**User Story:** As a user, I want to connect to the Micromouse via the paired serial port, so that I can receive telemetry data.

#### Acceptance Criteria

1. THE Connection_Manager SHALL request available Serial_Port list using Web Serial API
2. WHEN a user selects a Serial_Port, THE Connection_Manager SHALL open the port at 57600 baud rate
3. THE Connection_Manager SHALL configure the Serial_Port with 8 data bits, no parity, and 1 stop bit
4. WHEN connection is established, THE Connection_Manager SHALL display connection status to the user
5. IF connection fails, THEN THE Connection_Manager SHALL display an error message with failure reason
6. THE Connection_Manager SHALL maintain connection state and handle disconnection events
7. WHEN disconnected, THE Connection_Manager SHALL notify the user and provide reconnection option

### Requirement 3: Telemetry Data Reception and Parsing

**User Story:** As a web application, I want to receive and parse telemetry packets, so that I can update the maze visualization.

#### Acceptance Criteria

1. WHEN data is received from Serial_Port, THE Web_App SHALL buffer incoming bytes until a complete Telemetry_Packet is received
2. THE Web_App SHALL parse JSON-formatted Telemetry_Packet into Maze_State object
3. IF parsing fails, THEN THE Web_App SHALL log the error and continue listening for next packet
4. THE Web_App SHALL validate that Maze_State contains required fields before updating visualization
5. THE Web_App SHALL extract maze dimensions, Cell array, and Robot_Position from each Telemetry_Packet
6. THE Web_App SHALL update internal state with the latest Maze_State data
7. WHEN Maze_State is updated, THE Web_App SHALL trigger Maze_Renderer to redraw visualization

### Requirement 4: Maze Grid Visualization

**User Story:** As a user, I want to see the maze grid with walls, so that I can understand the maze structure.

#### Acceptance Criteria

1. THE Maze_Renderer SHALL draw a grid representing all cells in the maze
2. THE Maze_Renderer SHALL scale the grid to fit the viewport while maintaining square cell aspect ratio
3. THE Maze_Renderer SHALL draw walls as thick lines on cell boundaries where Wall_Data indicates wall presence
4. THE Maze_Renderer SHALL use distinct colors for discovered walls versus unknown boundaries
5. THE Maze_Renderer SHALL draw cell borders as thin lines to delineate the grid
6. WHEN maze dimensions change, THE Maze_Renderer SHALL recalculate grid layout and redraw
7. THE Maze_Renderer SHALL support configurable maze dimensions from 3x3 up to 16x16

### Requirement 5: Floodfill Cost Display

**User Story:** As a user, I want to see the floodfill cost values in each cell, so that I can understand the robot's pathfinding algorithm.

#### Acceptance Criteria

1. THE Maze_Renderer SHALL display Floodfill_Cost value as text centered in each Cell
2. THE Maze_Renderer SHALL use a color gradient to represent cost values, with lower costs in cooler colors and higher costs in warmer colors
3. WHEN Floodfill_Cost is 255, THE Maze_Renderer SHALL display the cell as unexplored with a distinct visual indicator
4. THE Maze_Renderer SHALL scale text size based on cell dimensions to ensure readability
5. THE Maze_Renderer SHALL update cost display when Maze_State changes
6. THE Maze_Renderer SHALL highlight the target cell with a distinct color or marker

### Requirement 6: Robot Position and Orientation Display

**User Story:** As a user, I want to see where the robot is and which direction it's facing, so that I can track its movement through the maze.

#### Acceptance Criteria

1. THE Maze_Renderer SHALL draw a robot icon at the current Robot_Position coordinates
2. THE Maze_Renderer SHALL orient the robot icon to match the direction value (0=North, 90=East, 180=South, 270=West)
3. THE Maze_Renderer SHALL use a distinct color for the robot icon that contrasts with the maze background
4. WHEN Robot_Position updates, THE Maze_Renderer SHALL animate the robot movement to the new position
5. THE Maze_Renderer SHALL scale the robot icon proportionally to cell size
6. THE Maze_Renderer SHALL draw a directional indicator (arrow or triangle) showing robot orientation

### Requirement 7: Desktop and Mobile Interface

**User Story:** As a user, I want the web app to work on desktop and mobile browsers that support Web Serial API, so that I can visualize the maze.

#### Acceptance Criteria

1. THE Web_App SHALL use responsive design that adapts to screen sizes from 320px to 1920px width
2. THE Web_App SHALL support touch gestures for pan and zoom on the maze visualization
3. THE Web_App SHALL display connection controls as large touch-friendly buttons
4. THE Web_App SHALL use a mobile-first layout with controls accessible without scrolling
5. THE Web_App SHALL detect Web Serial API support and display appropriate message if unavailable
6. THE Web_App SHALL maintain 60fps rendering performance on supported devices
7. THE Web_App SHALL work in both portrait and landscape orientations

### Requirement 8: Configuration and Settings

**User Story:** As a user, I want to configure visualization settings, so that I can customize the display to my preferences.

#### Acceptance Criteria

1. THE Web_App SHALL provide a settings panel for adjusting visualization parameters
2. THE Web_App SHALL allow users to toggle display of Floodfill_Cost values
3. THE Web_App SHALL allow users to toggle display of Wall_Data
4. THE Web_App SHALL allow users to adjust color scheme for walls, costs, and robot
5. THE Web_App SHALL persist user settings in browser local storage
6. WHEN the app loads, THE Web_App SHALL restore previously saved settings
7. THE Web_App SHALL provide a reset button to restore default settings

### Requirement 9: Telemetry Module Integration

**User Story:** As a developer, I want the telemetry module to integrate seamlessly with existing Micromouse code, so that I can add visualization without breaking current functionality.

#### Acceptance Criteria

1. THE Telemetry_Module SHALL be implemented as a separate Arduino file (telemetry.ino)
2. THE Telemetry_Module SHALL expose a function sendMazeState() that can be called from mazeLoop()
3. THE Telemetry_Module SHALL read maze data from the existing global maze array
4. THE Telemetry_Module SHALL read Robot_Position from existing global variables robotX, robotY, and robotDir
5. THE Telemetry_Module SHALL not modify existing maze-solving logic or data structures
6. THE Telemetry_Module SHALL use Serial1 which is already configured for HC05_Module
7. WHEN sendMazeState() is called, THE Telemetry_Module SHALL complete transmission within 50ms to avoid blocking maze solving

### Requirement 10: Error Handling and Robustness

**User Story:** As a user, I want the system to handle errors gracefully, so that temporary issues don't crash the application.

#### Acceptance Criteria

1. IF Serial_Port connection is lost, THEN THE Web_App SHALL display a disconnection message and provide manual reconnection option
2. IF malformed JSON is received, THEN THE Web_App SHALL log the error and continue processing subsequent packets
3. IF maze dimensions in Telemetry_Packet differ from current display, THEN THE Web_App SHALL reinitialize the grid
4. THE Web_App SHALL implement a connection timeout of 10 seconds for serial port opening
5. THE Web_App SHALL display user-friendly error messages for common issues (Web Serial API not supported, permission denied, port access failed)
6. THE Telemetry_Module SHALL handle Serial1 buffer overflow by discarding oldest data
7. IF Web_App receives no data for 5 seconds during active connection, THEN THE Web_App SHALL display a warning indicator
