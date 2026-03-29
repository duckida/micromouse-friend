# Implementation Plan: Micromouse Web Visualizer

## Overview

This implementation plan covers building a real-time telemetry and visualization system for a Micromouse robot. The system consists of an Arduino telemetry module (C++) that transmits maze state data over Bluetooth Classic (HC-05), and a React web application (JavaScript) that connects via Web Serial API and renders an interactive maze visualization on HTML canvas.

## Tasks

- [x] 1. Set up Arduino telemetry module structure
  - Create `telemetry.ino` file in Arduino project
  - Define `sendMazeState()` function signature
  - Add Serial1 initialization check (57600 baud)
  - _Requirements: 1.4, 9.1, 9.2, 9.6_

- [x] 2. Implement Arduino JSON serialization
  - [x] 2.1 Implement compact JSON packet builder
    - Write code to serialize maze dimensions (w, h)
    - Write code to serialize target position (tx, ty)
    - Write code to serialize robot position (rx, ry, rd)
    - Write code to serialize cell array with nested loops
    - Add newline termination to packet
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7_
  
  - [ ]* 2.2 Write property test for maze state serialization round-trip
    - **Property 1: Maze State Serialization Round-Trip**
    - **Validates: Requirements 1.1, 1.2, 1.5, 1.6, 3.2**
  
  - [ ]* 2.3 Write property test for newline termination
    - **Property 2: Telemetry Packet Newline Termination**
    - **Validates: Requirements 1.7**
  
  - [ ]* 2.4 Write unit tests for Arduino telemetry
    - Test with 3x3 maze (minimum size)
    - Test with 5x5 maze (maximum supported size)
    - Test with all walls present
    - Test with no walls present
    - Test with cost value 255 (unexplored)
    - Test with robot at each direction (0, 90, 180, 270)
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7_

- [x] 3. Implement Arduino read-only telemetry behavior
  - [x] 3.1 Read maze data from global variables
    - Access global `maze[MAZE_WIDTH][MAZE_HEIGHT]` array
    - Access global `robotX`, `robotY`, `robotDir` variables
    - Access global `targetX`, `targetY` constants
    - Ensure no modifications to global state
    - _Requirements: 9.3, 9.4, 9.5_
  
  - [ ]* 3.2 Write property test for read-only behavior
    - **Property 17: Telemetry Read-Only Behavior**
    - **Validates: Requirements 9.5**
  
  - [ ]* 3.3 Write property test for data source correspondence
    - **Property 18: Telemetry Data Source Correspondence**
    - **Validates: Requirements 9.3, 9.4**

- [x] 4. Checkpoint - Ensure Arduino telemetry tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Set up React web application project
  - Initialize React project with Create React App or Vite
  - Install dependencies (no external libraries needed for core functionality)
  - Set up project structure with component folders
  - Configure development environment
  - _Requirements: 7.1, 7.5_

- [x] 6. Implement Web Serial API connection manager
  - [x] 6.1 Create ConnectionManager class
    - Implement `requestPort()` method using Web Serial API
    - Implement `connect()` method with 57600 baud, 8N1 config
    - Implement `disconnect()` method
    - Implement connection state tracking
    - Add 10-second connection timeout
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 10.4_
  
  - [x] 6.2 Implement connection status and error handling
    - Display connection status (disconnected, connecting, connected, error)
    - Display error messages for common failures
    - Handle disconnection events
    - Provide reconnection option
    - Check Web Serial API support
    - _Requirements: 2.4, 2.5, 2.7, 7.5, 10.1, 10.5_
  
  - [ ]* 6.3 Write unit tests for connection manager
    - Test port selection UI
    - Test connection with correct baud rate (57600)
    - Test connection with correct serial config (8N1)
    - Test connection status display
    - Test connection error display
    - Test disconnection notification
    - Test reconnection flow
    - Test connection timeout (10 seconds)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 10.4_

- [x] 7. Implement telemetry packet buffering and parsing
  - [x] 7.1 Create packet buffer with newline delimiter
    - Implement byte buffering in readLoop
    - Split on newline character to extract complete packets
    - Handle partial packets across multiple reads
    - _Requirements: 3.1_
  
  - [x] 7.2 Implement JSON parser with validation
    - Parse JSON packets to JavaScript objects
    - Validate required fields (w, h, tx, ty, rx, ry, rd, c)
    - Handle parsing errors gracefully
    - Log errors and continue processing
    - _Requirements: 3.2, 3.3, 3.4, 10.2_
  
  - [ ]* 7.3 Write property test for packet buffering completeness
    - **Property 3: Packet Buffering Completeness**
    - **Validates: Requirements 3.1**
  
  - [ ]* 7.4 Write property test for malformed JSON recovery
    - **Property 4: Malformed JSON Recovery**
    - **Validates: Requirements 3.3, 10.2**
  
  - [ ]* 7.5 Write property test for maze state validation
    - **Property 5: Maze State Validation**
    - **Validates: Requirements 3.4**
  
  - [ ]* 7.6 Write unit tests for telemetry parser
    - Test parsing valid minimal packet
    - Test parsing valid maximal packet
    - Test parsing with extra whitespace
    - Test parsing with missing fields
    - Test parsing with wrong types
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 8. Implement React state management
  - [x] 8.1 Create App component with state
    - Define mazeState state (MazeState | null)
    - Define connectionState state
    - Define settings state
    - Implement state update handlers
    - _Requirements: 3.6_
  
  - [x] 8.2 Wire connection manager to React state
    - Pass onPacket callback to connection manager
    - Update mazeState when packets received
    - Trigger re-render on state updates
    - Handle dimension changes with reinitialization
    - _Requirements: 3.6, 3.7, 10.3_
  
  - [ ]* 8.3 Write property test for dimension change reinitialization
    - **Property 19: Dimension Change Reinitialization**
    - **Validates: Requirements 10.3**

- [x] 9. Checkpoint - Ensure connection and parsing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement canvas layout calculation
  - [x] 10.1 Create calculateLayout function
    - Calculate cell size based on viewport and maze dimensions
    - Ensure square cells (width === height)
    - Calculate grid offset for centering
    - Add padding around grid
    - Support maze dimensions 3x3 to 16x16
    - _Requirements: 4.2, 4.6, 4.7_
  
  - [ ]* 10.2 Write property test for grid layout square cells
    - **Property 6: Grid Layout Square Cells**
    - **Validates: Requirements 4.2**
  
  - [ ]* 10.3 Write property test for maze dimension adaptability
    - **Property 8: Maze Dimension Adaptability**
    - **Validates: Requirements 4.7**

- [x] 11. Implement maze grid rendering
  - [x] 11.1 Create drawGrid function
    - Draw vertical grid lines
    - Draw horizontal grid lines
    - Use thin lines for cell borders
    - _Requirements: 4.1, 4.5_
  
  - [x] 11.2 Create drawWalls function
    - Draw thick lines for walls based on wall flags
    - Draw walls on correct cell boundaries (N, E, S, W)
    - Use distinct color for discovered walls
    - _Requirements: 4.3, 4.4_
  
  - [ ]* 11.3 Write property test for wall rendering correspondence
    - **Property 7: Wall Rendering Correspondence**
    - **Validates: Requirements 4.3**
  
  - [ ]* 11.4 Write unit tests for maze renderer grid and walls
    - Test rendering 3x3 maze
    - Test rendering 16x16 maze
    - Test rendering with all walls
    - Test rendering with no walls
    - Test grid line visibility
    - _Requirements: 4.1, 4.3, 4.5, 4.7_

- [x] 12. Implement floodfill cost visualization
  - [x] 12.1 Create getCostColor function
    - Implement color gradient from blue (low cost) to red (high cost)
    - Handle unexplored cells (cost 255) with distinct color
    - Use HSL color space for smooth gradient
    - _Requirements: 5.2, 5.3_
  
  - [x] 12.2 Create drawCosts function
    - Fill cells with cost-based background color
    - Draw cost value text centered in each cell
    - Scale text size based on cell dimensions
    - Highlight target cell with distinct marker
    - Toggle visibility based on settings
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 12.3 Write property test for cost color gradient monotonicity
    - **Property 9: Cost Color Gradient Monotonicity**
    - **Validates: Requirements 5.2**
  
  - [ ]* 12.4 Write unit tests for cost rendering
    - Test rendering unexplored cells (cost 255)
    - Test rendering target cell highlight
    - Test cost text visibility
    - _Requirements: 5.1, 5.3, 5.6_

- [x] 13. Implement robot position and orientation rendering
  - [x] 13.1 Create drawRobot function
    - Draw robot icon as circle at robot position
    - Calculate canvas coordinates from grid coordinates
    - Draw directional indicator (triangle) showing orientation
    - Map direction values (0, 90, 180, 270) to compass directions
    - Scale robot icon proportional to cell size
    - Use distinct contrasting color for robot
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_
  
  - [ ]* 13.2 Write property test for robot position rendering
    - **Property 10: Robot Position Rendering**
    - **Validates: Requirements 6.1**
  
  - [ ]* 13.3 Write property test for robot orientation correspondence
    - **Property 11: Robot Orientation Correspondence**
    - **Validates: Requirements 6.2, 6.6**
  
  - [ ]* 13.4 Write property test for robot icon scaling
    - **Property 12: Robot Icon Scaling**
    - **Validates: Requirements 6.5**
  
  - [ ]* 13.5 Write unit tests for robot rendering
    - Test rendering robot at (0,0) facing North
    - Test rendering robot at center facing East
    - _Requirements: 6.1, 6.2_

- [x] 14. Create MazeCanvas React component
  - [x] 14.1 Implement MazeCanvas component
    - Create canvas element with ref
    - Implement useEffect hook for rendering
    - Call all drawing functions in correct order (grid, costs, walls, robot)
    - Use requestAnimationFrame for smooth updates
    - Handle canvas resize events
    - Implement responsive sizing
    - _Requirements: 3.7, 4.1, 4.6, 7.1, 7.6_
  
  - [ ]* 14.2 Write unit tests for MazeCanvas component
    - Test component renders canvas element
    - Test rendering updates when mazeState changes
    - _Requirements: 3.7, 4.1_

- [x] 15. Checkpoint - Ensure rendering tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Create ConnectionPanel React component
  - [x] 16.1 Implement ConnectionPanel UI
    - Create connect button (large, touch-friendly)
    - Create disconnect button
    - Display connection status indicator
    - Display error messages
    - Wire buttons to ConnectionManager methods
    - _Requirements: 2.4, 2.5, 2.7, 7.3, 7.4_
  
  - [ ]* 16.2 Write unit tests for ConnectionPanel
    - Test connect button exists
    - Test disconnect button exists
    - Test status indicator displays correctly
    - _Requirements: 2.4, 7.3_

- [x] 17. Create SettingsPanel React component
  - [x] 17.1 Implement SettingsPanel UI
    - Create toggle switch for showCosts
    - Create toggle switch for showWalls
    - Create color scheme selector
    - Create reset button
    - Wire controls to settings state
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7_
  
  - [x] 17.2 Implement settings persistence
    - Save settings to localStorage on change
    - Load settings from localStorage on app mount
    - Implement reset to defaults
    - _Requirements: 8.5, 8.6, 8.7_
  
  - [ ]* 17.3 Write property test for settings toggle effect
    - **Property 14: Settings Toggle Effect**
    - **Validates: Requirements 8.2, 8.3**
  
  - [ ]* 17.4 Write property test for color scheme application
    - **Property 15: Color Scheme Application**
    - **Validates: Requirements 8.4**
  
  - [ ]* 17.5 Write property test for settings persistence round-trip
    - **Property 16: Settings Persistence Round-Trip**
    - **Validates: Requirements 8.5, 8.6**
  
  - [ ]* 17.6 Write unit tests for SettingsPanel
    - Test settings panel exists
    - Test toggle controls exist
    - Test color scheme selector exists
    - Test reset button restores defaults
    - Test settings persist on page reload
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 18. Create InfoPanel React component
  - [x] 18.1 Implement InfoPanel UI
    - Display current robot position (x, y, direction)
    - Display connection status
    - Display no-data timeout warning (5 seconds)
    - _Requirements: 10.7_
  
  - [ ]* 18.2 Write unit tests for InfoPanel
    - Test robot position display
    - Test connection status display
    - Test timeout warning display
    - _Requirements: 10.7_

- [x] 19. Implement responsive design and mobile support
  - [x] 19.1 Add responsive CSS
    - Implement mobile-first layout
    - Support screen widths 320px to 1920px
    - Ensure no horizontal scrolling
    - Make controls accessible without scrolling
    - Support portrait and landscape orientations
    - _Requirements: 7.1, 7.4, 7.7_
  
  - [x] 19.2 Add touch gesture support
    - Implement touch-friendly button sizes
    - Add pan gesture for maze canvas
    - Add zoom gesture for maze canvas
    - _Requirements: 7.2, 7.3_
  
  - [ ]* 19.3 Write property test for responsive layout adaptation
    - **Property 13: Responsive Layout Adaptation**
    - **Validates: Requirements 7.1**
  
  - [ ]* 19.4 Write unit tests for responsive design
    - Test layout at 320px width (mobile)
    - Test layout at 768px width (tablet)
    - Test layout at 1920px width (desktop)
    - Test portrait orientation
    - Test landscape orientation
    - Test touch-friendly button sizes
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.7_

- [x] 20. Implement error handling and robustness
  - [x] 20.1 Add comprehensive error handling
    - Handle Web Serial API not supported
    - Handle permission denied errors
    - Handle port access failures
    - Handle connection loss with reconnection option
    - Handle malformed JSON with logging
    - Handle dimension changes with reinitialization
    - Display user-friendly error messages
    - _Requirements: 10.1, 10.2, 10.3, 10.5_
  
  - [ ]* 20.2 Write unit tests for error handling
    - Test Web Serial API not supported message
    - Test permission denied error
    - Test port access failed error
    - Test disconnection message
    - Test no data timeout warning (5 seconds)
    - Test malformed JSON logged and skipped
    - _Requirements: 10.1, 10.2, 10.5, 10.7_

- [x] 21. Final checkpoint - Integration and testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 22. End-to-end integration testing
  - Test Arduino telemetry module with actual robot
  - Test Bluetooth connection to computer
  - Test Web Serial API connection to paired serial port
  - Test real-time visualization updates
  - Test maze solving progress display
  - Measure rendering frame rate (target: 60fps)
  - Measure packet processing latency
  - _Requirements: All requirements_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- Arduino code uses C++, web app uses JavaScript (React)
- Web Serial API is only supported in Chrome/Edge browsers
- HC-05 Bluetooth module must be paired to computer before web app can connect