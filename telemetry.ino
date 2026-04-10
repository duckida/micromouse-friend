// Micromouse Telemetry Module
// Serializes maze state data to JSON and transmits over Serial1 (HC-05 Bluetooth)

// Debug levels
#define DEBUG_NONE 0
#define DEBUG_MINIMAL 1
#define DEBUG_FULL 2

// Current debug level (set in setup)
int debugLevel = DEBUG_FULL;

// External references to global variables defined in main code
extern Cell maze[];
extern const int MAZE_WIDTH;
extern const int MAZE_HEIGHT;
extern int robotX;
extern int robotY;
extern int robotDir;
extern const uint8_t targetX;
extern const uint8_t targetY;
extern volatile int frontSensorValue;
extern volatile int leftSensorValue;
extern volatile int rightSensorValue;
extern const int LEFT_GAP;
extern const int FRONT_WALL;
extern const int RIGHT_GAP;

// Track if setup payload has been sent
bool telemetryInitialized = false;

// Initialize Serial1 if not already initialized
void initTelemetry() {
  // Serial1 should already be initialized at 57600 baud in setup()
  // This function can be called to ensure it's ready
}

// Send setup payload once at initialization
// Includes: debug level, maze dimensions, sensor thresholds
void sendTelemetrySetup() {
  if (!Serial1) {
    return;
  }

  if (debugLevel == DEBUG_NONE) {
    telemetryInitialized = true; // Mark as initialized but don't send
    return;
  }

  Serial1.print("{\"setup\":true,\"level\":");
  Serial1.print(debugLevel);
  Serial1.print(",\"w\":");
  Serial1.print(MAZE_WIDTH);
  Serial1.print(",\"h\":");
  Serial1.print(MAZE_HEIGHT);
  Serial1.print(",\"tl\":");
  Serial1.print(LEFT_GAP);
  Serial1.print(",\"tf\":");
  Serial1.print(FRONT_WALL);
  Serial1.print(",\"tr\":");
  Serial1.print(RIGHT_GAP);
  Serial1.println("}");
  
  telemetryInitialized = true;
}

// Send minimal state: sensor readings + position + direction
// Used for DEBUG_MINIMAL level - walls plotted locally based on sensor readings
void sendMinimalState() {
  if (!Serial1) {
    return;
  }

  Serial1.print("{\"rx\":");
  Serial1.print(robotX);
  Serial1.print(",\"ry\":");
  Serial1.print(robotY);
  Serial1.print(",\"rd\":");
  Serial1.print(robotDir);
  Serial1.print(",\"sf\":");
  Serial1.print(frontSensorValue);
  Serial1.print(",\"sl\":");
  Serial1.print(leftSensorValue);
  Serial1.print(",\"sr\":");
  Serial1.print(rightSensorValue);
  Serial1.println("}");
}

// Send full maze state as JSON over Serial1
// This function reads from global variables without modifying them
// Transmission should complete within 50ms to avoid blocking maze solving
void sendMazeState() {
  // Check if Serial1 is available
  if (!Serial1) {
    return;
  }

  // Start JSON object
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

  // Serialize cell array
  for (int x = 0; x < MAZE_WIDTH; x++) {
    Serial1.print("[");
    for (int y = 0; y < MAZE_HEIGHT; y++) {
      // Get cell from maze array using 2D indexing
      Cell cell = maze[x][y];

      Serial1.print("{\"x\":");
      Serial1.print(x);
      Serial1.print(",\"y\":");
      Serial1.print(y);
      Serial1.print(",\"c\":");
      Serial1.print(cell.cost);
      Serial1.print(",\"w\":[");
      Serial1.print(cell.walls[0] ? 1 : 0);
      Serial1.print(",");
      Serial1.print(cell.walls[1] ? 1 : 0);
      Serial1.print(",");
      Serial1.print(cell.walls[2] ? 1 : 0);
      Serial1.print(",");
      Serial1.print(cell.walls[3] ? 1 : 0);
      Serial1.print("]}");

      if (y < MAZE_HEIGHT - 1) {
        Serial1.print(",");
      }
    }
    Serial1.print("]");
    if (x < MAZE_WIDTH - 1) {
      Serial1.print(",");
    }
  }

  // Close array and object, add newline
  Serial1.println("]}");
}

// Send maze state based on debug level
// Wrapper that calls appropriate function based on debugLevel
void sendDebugState() {
  if (debugLevel == DEBUG_NONE) {
    return; // Don't send any telemetry
  }

  if (!telemetryInitialized) {
    sendTelemetrySetup();
  }

  if (debugLevel == DEBUG_MINIMAL) {
    sendMinimalState();
  } else if (debugLevel == DEBUG_FULL) {
    sendMazeState();
  }
}

// Set debug level (call in setup)
void setDebugLevel(int level) {
  debugLevel = level;
  telemetryInitialized = false; // Force re-send of setup payload
}

// Send wall sensor state as JSON over Serial1
// Call this after updating walls to report current sensor readings
void sendWallState() {
  if (!Serial1) {
    return;
  }

  Serial1.print("{\"sf\":");
  Serial1.print(frontSensorValue);
  Serial1.print(",\"sl\":");
  Serial1.print(leftSensorValue);
  Serial1.print(",\"sr\":");
  Serial1.print(rightSensorValue);
  Serial1.println("}");
}

// Send sensor readings with sensing point index (0, 1, or 2)
// Used during cell traversal at different sensing points
void sendSensorReadings(int sensingPoint) {
  if (!Serial1) {
    return;
  }

  Serial1.print("{\"sp\":");
  Serial1.print(sensingPoint);
  Serial1.print(",\"sf\":");
  Serial1.print(frontSensorValue);
  Serial1.print(",\"sl\":");
  Serial1.print(leftSensorValue);
  Serial1.print(",\"sr\":");
  Serial1.print(rightSensorValue);
  Serial1.print(",\"rx\":");
  Serial1.print(robotX);
  Serial1.print(",\"ry\":");
  Serial1.print(robotY);
  Serial1.print(",\"rd\":");
  Serial1.print(robotDir);
  Serial1.println("}");
}