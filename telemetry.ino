// Micromouse Telemetry Module
// Serializes maze state data to JSON and transmits over Serial1 (HC-05 Bluetooth)

// External references to global variables defined in main code
extern Cell maze[];
extern const int MAZE_WIDTH;
extern const int MAZE_HEIGHT;
extern int robotX;
extern int robotY;
extern int robotDir;
extern const uint8_t targetX;
extern const uint8_t targetY;

// Initialize Serial1 if not already initialized
void initTelemetry() {
  // Serial1 should already be initialized at 57600 baud in setup()
  // This function can be called to ensure it's ready
}

// Send maze state as JSON over Serial1
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