# Debug Levels Integration Guide

## Overview

The telemetry system now supports two debug levels:

- **DEBUG_MINIMAL (0)**: Sends only sensor readings + position + direction. Walls are plotted locally on the web app based on sensor readings.
- **DEBUG_FULL (1)**: Sends complete maze state including walls, flood fill values, position, etc. (default)

## Setup Payload

At initialization, a setup payload is automatically sent once:
```json
{"setup":true,"level":1,"w":3,"h":6,"tl":7,"tf":30,"tr":7}
```

Fields:
- `level`: Debug level (0 or 1)
- `w`, `h`: Maze dimensions
- `tl`, `tf`, `tr`: Left, Front, Right sensor thresholds

## Integration in main.ino

Add this to your `setup()` function to set the debug level:

```cpp
// Set debug level: 0 = Minimal, 1 = Full
setDebugLevel(DEBUG_MINIMAL);  // or DEBUG_FULL
```

## Updated Telemetry Functions

### 1. sendDebugState()
Call this instead of `sendMazeState()` in your main loop. It automatically sends the appropriate data based on debug level.

```cpp
// In floodfill.ino mazeLoop():
sendDebugState();  // Replaces sendMazeState()
```

### 2. sendSensorReadings(sensingPoint)
Use this for detailed sensor logging at different sensing points during cell traversal.

```cpp
// In floodfill.ino mazeLoop():
checkSideWalls();
sendSensorReadings(0);  // sensing point 0

motion.driveCell(10, DRIVE_PID_NONE);
while (!motion.completed()) {}

checkSideWalls();
updateSideWalls();
sendSensorReadings(1);  // sensing point 1

motion.driveCell(10, DRIVE_PID_NONE);
while (!motion.completed()) {}

checkSideWalls();
updateSideWalls();
sendSensorReadings(2);  // sensing point 2
```

## Minimal Level Output

When `DEBUG_MINIMAL` is set, the telemetry sends:
```json
{"rx":0,"ry":0,"rd":0,"sf":25,"sl":5,"sr":8}
```

Fields:
- `rx`, `ry`, `rd`: Robot position and direction
- `sf`, `sl`, `sr`: Front, Left, Right sensor values

The web app can plot walls locally based on these sensor readings and the known thresholds from the setup payload.

## Full Level Output

When `DEBUG_FULL` is set, the telemetry sends complete maze state:
```json
{"w":3,"h":6,"tx":2,"ty":5,"rx":0,"ry":0,"rd":0,"c":[[...all cells with costs and walls...]]}
```

## Example Integration

In your `floodfill.ino`, update the `mazeLoop()`:

```cpp
void mazeLoop() {
  leftWall = 0;
  rightWall = 0;

  if (robotX == targetX && robotY == targetY) {
    stop();
    delay(5000);
    
    switch(mazeState) {
      case DISCOVERING:
        targetX = 0;
        targetY = 0;
        mazeState = RETURNING;
        break; 
      case RETURNING:
        targetX = GOAL_X;
        targetY = GOAL_Y;
        mazeState = DISCOVERING;
        break;
    }

    return;
  }

  checkAndUpdateFrontWall(); 
  
  updateFlood();
  sendDebugState();  // Changed from sendMazeState()

  // ... rest of the code ...

  // During cell traversal:
  checkSideWalls();
  sendSensorReadings(0);  // Send sensor data at sensing point 0

  motion.driveCell(10, DRIVE_PID_NONE);
  while (!motion.completed()) {}
  
  checkSideWalls();
  updateSideWalls();
  sendSensorReadings(1);  // Send sensor data at sensing point 1

  motion.driveCell(10, DRIVE_PID_NONE);
  while (!motion.completed()) {}
  
  checkSideWalls();
  updateSideWalls();
  sendSensorReadings(2);  // Send sensor data at sensing point 2
  
  // ... rest of the code ...
}
```

## Changing Debug Level

To change debug levels:

1. **Compile-time**: Set in code before uploading
   ```cpp
   setDebugLevel(DEBUG_MINIMAL);
   ```

2. **Runtime**: You can add a Serial command to change it dynamically
   ```cpp
   // In loop(), add command handler
   if (Serial1.available()) {
     char cmd = Serial1.read();
     if (cmd == '0') setDebugLevel(DEBUG_MINIMAL);
     else if (cmd == '1') setDebugLevel(DEBUG_FULL);
   }
   ```

## Benefits

- **Minimal**: Lower bandwidth, faster transmission (<10ms), easier to debug sensor behavior
- **Full**: Complete state visualization, better for algorithm debugging
- **Setup payload**: Sent once, reduces repeated data transmission
