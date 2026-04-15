// Telemetry Parser
// Parses and validates JSON telemetry packets from the Micromouse robot

/**
 * @typedef {Object} Cell
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {number} c - Cost value (0-255, 255 = unexplored)
 * @property {[number, number, number, number]} w - Walls [N, E, S, W]
 */

/**
 * @typedef {Object} WallState
 * @property {number} sf - Front sensor value
 * @property {number} sl - Left sensor value
 * @property {number} sr - Right sensor value
 * @property {number} [sp] - Sensing point index (0, 1, or 2)
 */

/**
 * @typedef {Object} SensorReading
 * @property {number} sf - Front sensor value
 * @property {number} sl - Left sensor value
 * @property {number} sr - Right sensor value
 * @property {number} sp - Sensing point index (0, 1, or 2)
 * @property {number} rx - Robot X
 * @property {number} ry - Robot Y
 * @property {number} rd - Robot direction (0, 90, 180, 270)
 */

/**
 * @typedef {Object} MazeState
 * @property {number} w - Width
 * @property {number} h - Height
 * @property {number} tx - Target X
 * @property {number} ty - Target Y
 * @property {number} rx - Robot X
 * @property {number} ry - Robot Y
 * @property {number} rd - Robot direction (0, 90, 180, 270)
 * @property {Cell[][]} c - Cells indexed as c[x][y]
 * @property {number} [sf] - Front sensor value
 * @property {number} [sl] - Left sensor value
 * @property {number} [sr] - Right sensor value
 * @property {number} [sp] - Sensing point index (0, 1, or 2) within current cell
 * @property {Array<{sf: number, sl: number, sr: number}>} [sensingPoints] - Array of 3 sensor readings for current cell
 */

/**
 * @typedef {Object} SetupPayload
 * @property {boolean} setup - Always true
 * @property {number} level - Debug level (0 = none, 1 = minimal, 2 = full)
 * @property {number} w - Maze width
 * @property {number} h - Maze height
 * @property {number} tl - Left wall threshold
 * @property {number} tf - Front wall threshold
 * @property {number} tr - Right wall threshold
 */

/**
 * @typedef {Object} MinimalState
 * @property {number} rx - Robot X
 * @property {number} ry - Robot Y
 * @property {number} rd - Robot direction (0, 90, 180, 270)
 * @property {number} sf - Front sensor value
 * @property {number} sl - Left sensor value
 * @property {number} sr - Right sensor value
 */

/**
 * Parse a JSON telemetry packet
 * @param {string} packet - JSON string to parse
 * @returns {MazeState|WallState|MinimalState|SetupPayload|null} Parsed data or null if invalid
 */
export function parsePacket(packet) {
  try {
    const data = JSON.parse(packet);

    // Setup payload: sent once at initialization
    if (isSetupPayload(data)) {
      return data;
    }

    // Sensor reading with position (minimal mode)
    if (isMinimalState(data)) {
      return data;
    }

    // Wall state packet: has sf/sl/sr but no maze fields
    if (isWallState(data)) {
      return data;
    }

    // Full maze state packet
    if (!validateMazeState(data)) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('JSON parsing error:', error);
    return null;
  }
}

/**
 * Check if a parsed object is a setup payload
 * @param {any} data - Object to check
 * @returns {boolean} True if setup payload
 */
function isSetupPayload(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.setup !== true) return false;
  if (typeof data.level !== 'number' || data.level < 0 || data.level > 2) return false;
  if (typeof data.w !== 'number' || data.w < 1 || data.w > 16) return false;
  if (typeof data.h !== 'number' || data.h < 1 || data.h > 16) return false;
  if (typeof data.tl !== 'number') return false;
  if (typeof data.tf !== 'number') return false;
  if (typeof data.tr !== 'number') return false;
  return true;
}

/**
 * Check if a parsed object is a minimal state packet
 * @param {any} data - Object to check
 * @returns {boolean} True if minimal state packet
 */
function isMinimalState(data) {
  if (!data || typeof data !== 'object') return false;
  // Must have robot position
  if (typeof data.rx !== 'number' || typeof data.ry !== 'number') return false;
  if (typeof data.rd !== 'number') return false;
  // Must have sensor values
  if (typeof data.sf !== 'number' || typeof data.sl !== 'number' || typeof data.sr !== 'number') return false;
  // Must NOT have maze dimension fields (distinguishes from full state)
  if ('w' in data || 'h' in data || 'c' in data) return false;
  // Must NOT be a setup packet
  if (data.setup === true) return false;
  return true;
}

/**
 * Check if a parsed object is a wall state packet
 * @param {any} data - Object to check
 * @returns {boolean} True if wall state packet
 */
function isWallState(data) {
  if (!data || typeof data !== 'object') return false;
  if (!('sf' in data) || !('sl' in data) || !('sr' in data)) return false;
  if ('w' in data || 'h' in data || 'c' in data) return false;
  if ('rx' in data || 'ry' in data || 'rd' in data) return false; // Has position = minimal state
  if (typeof data.sf !== 'number' || typeof data.sl !== 'number' || typeof data.sr !== 'number') return false;
  if (data.sf < 0 || data.sl < 0 || data.sr < 0) return false;
  if (data.sp !== undefined && (typeof data.sp !== 'number' || data.sp < 0 || data.sp > 2)) return false;
  return true;
}

/**
 * Validate that a parsed object has all required maze state fields
 * @param {any} data - Object to validate
 * @returns {boolean} True if valid maze state
 */
export function validateMazeState(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check required top-level fields
  const requiredFields = ['w', 'h', 'tx', 'ty', 'rx', 'ry', 'rd', 'c'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }

  // Check field types
  if (typeof data.w !== 'number' || data.w < 3 || data.w > 16) {
    console.error('Invalid width:', data.w);
    return false;
  }

  if (typeof data.h !== 'number' || data.h < 3 || data.h > 16) {
    console.error('Invalid height:', data.h);
    return false;
  }

  if (typeof data.tx !== 'number' || data.tx < 0 || data.tx >= data.w) {
    console.error('Invalid target X:', data.tx);
    return false;
  }

  if (typeof data.ty !== 'number' || data.ty < 0 || data.ty >= data.h) {
    console.error('Invalid target Y:', data.ty);
    return false;
  }

  if (typeof data.rx !== 'number' || data.rx < 0 || data.rx >= data.w) {
    console.error('Invalid robot X:', data.rx);
    return false;
  }

  if (typeof data.ry !== 'number' || data.ry < 0 || data.ry >= data.h) {
    console.error('Invalid robot Y:', data.ry);
    return false;
  }

  // Direction must be 0, 90, 180, or 270
  if (![0, 90, 180, 270].includes(data.rd)) {
    console.error('Invalid robot direction:', data.rd);
    return false;
  }

  // Validate cell array structure
  if (!Array.isArray(data.c) || data.c.length !== data.w) {
    console.error('Invalid cell array dimensions');
    return false;
  }

  for (let x = 0; x < data.w; x++) {
    if (!Array.isArray(data.c[x]) || data.c[x].length !== data.h) {
      console.error(`Invalid cell array at column ${x}`);
      return false;
    }

    for (let y = 0; y < data.h; y++) {
      const cell = data.c[x][y];

      if (!validateCell(cell, x, y)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Validate a cell object
 * @param {any} cell - Cell object to validate
 * @param {number} expectedX - Expected X coordinate
 * @param {number} expectedY - Expected Y coordinate
 * @returns {boolean} True if valid cell
 */
function validateCell(cell, expectedX, expectedY) {
  if (!cell || typeof cell !== 'object') {
    console.error('Invalid cell object');
    return false;
  }

  if (cell.x !== expectedX || cell.y !== expectedY) {
    console.error(`Cell coordinates mismatch: expected (${expectedX}, ${expectedY}), got (${cell.x}, ${cell.y})`);
    return false;
  }

  if (typeof cell.c !== 'number' || cell.c < 0 || cell.c > 255) {
    console.error('Invalid cell cost:', cell.c);
    return false;
  }

  if (!Array.isArray(cell.w) || cell.w.length !== 4) {
    console.error('Invalid cell walls array');
    return false;
  }

  for (let i = 0; i < 4; i++) {
    if (cell.w[i] !== 0 && cell.w[i] !== 1) {
      console.error(`Invalid wall value at index ${i}:`, cell.w[i]);
      return false;
    }
  }

  return true;
}

/**
 * Convert direction (0, 90, 180, 270) to wall index (0=N, 1=E, 2=S, 3=W)
 * @param {number} direction - Direction in degrees
 * @returns {number} Wall index
 */
export function directionToWallIndex(direction) {
  if (direction === 0) return 0;   // North
  if (direction === 90) return 1;  // East
  if (direction === 180) return 2; // South
  if (direction === 270) return 3; // West
  return 0;
}

/**
 * Get wall index for left/right/relative to current direction
 * @param {number} direction - Current direction (0, 90, 180, 270)
 * @param {string} side - 'left', 'right', or 'front'
 * @returns {number} Wall index (0-3)
 */
export function getRelativeWallIndex(direction, side) {
  const currentDir = directionToWallIndex(direction);
  if (side === 'front') return currentDir;
  if (side === 'right') return (currentDir + 1) % 4;
  if (side === 'left') return (currentDir + 3) % 4;
  return currentDir;
}

/**
 * Build a maze state from minimal sensor data
 * @param {MinimalState} minimalState - Sensor readings + position
 * @param {Object} thresholds - Sensor thresholds {tl, tf, tr}
 * @param {MazeState|null} currentState - Current maze state to update, or null to create new
 * @returns {MazeState} Updated maze state
 */
export function buildMazeFromMinimalState(minimalState, thresholds, currentState = null) {
  const width = currentState?.w || 3; // Default to 3x3 if no current state
  const height = currentState?.h || 3;
  const targetX = currentState?.tx || width - 1;
  const targetY = currentState?.ty || height - 1;

  // Create cells if needed, or copy existing
  const cells = currentState ?
    currentState.c.map(col => col.map(cell => ({
      ...cell,
      w: [...cell.w]
    }))) :
    createEmptyCells(width, height);

  const { rx, ry, rd, sf, sl, sr } = minimalState;

  // Detect walls based on sensor thresholds
  // Front wall (relative to direction)
  const frontWall = sf >= thresholds.tf ? 1 : 0;
  const leftWall = sl > thresholds.tl ? 1 : 0;
  const rightWall = sr > thresholds.tr ? 1 : 0;

  // Get wall indices based on direction
  const frontIdx = getRelativeWallIndex(rd, 'front');
  const leftIdx = getRelativeWallIndex(rd, 'left');
  const rightIdx = getRelativeWallIndex(rd, 'right');

  // Update current cell walls (only set to 1, never clear to 0)
  if (rx >= 0 && rx < width && ry >= 0 && ry < height) {
    // Only update if wall is detected (set to 1), don't clear existing walls
    if (frontWall) cells[rx][ry].w[frontIdx] = 1;
    if (leftWall) cells[rx][ry].w[leftIdx] = 1;
    if (rightWall) cells[rx][ry].w[rightIdx] = 1;

    // Update neighbor cells (for bidirectional walls)
    const neighbors = [
      { x: rx, y: ry + 1, wallIdx: 0, oppIdx: 2 }, // North
      { x: rx + 1, y: ry, wallIdx: 1, oppIdx: 3 }, // East
      { x: rx, y: ry - 1, wallIdx: 2, oppIdx: 0 }, // South
      { x: rx - 1, y: ry, wallIdx: 3, oppIdx: 1 }, // West
    ];

    // Update front neighbor
    if (frontWall && frontIdx < 4) {
      const n = neighbors[frontIdx];
      if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
        cells[n.x][n.y].w[n.oppIdx] = 1;
      }
    }
    // Update left neighbor
    if (leftWall && leftIdx < 4) {
      const n = neighbors[leftIdx];
      if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
        cells[n.x][n.y].w[n.oppIdx] = 1;
      }
    }
    // Update right neighbor
    if (rightWall && rightIdx < 4) {
      const n = neighbors[rightIdx];
      if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
        cells[n.x][n.y].w[n.oppIdx] = 1;
      }
    }
  }

  return {
    w: width,
    h: height,
    tx: targetX,
    ty: targetY,
    rx,
    ry,
    rd,
    c: cells,
    sf,
    sl,
    sr,
    sensingPoints: currentState?.sensingPoints || [null, null, null]
  };
}

/**
 * Create empty cells array
 * @param {number} width - Maze width
 * @param {number} height - Maze height
 * @returns {Cell[][]} Empty cells array
 */
function createEmptyCells(width, height) {
  const cells = [];
  for (let x = 0; x < width; x++) {
    cells[x] = [];
    for (let y = 0; y < height; y++) {
      cells[x][y] = {
        x,
        y,
        c: 255, // Unexplored
        w: [0, 0, 0, 0] // No walls
      };
    }
  }
  return cells;
}

/**
 * Create an empty maze state for testing
 * @param {number} width - Maze width
 * @param {number} height - Maze height
 * @returns {MazeState} Empty maze state
 */
export function createEmptyMazeState(width = 3, height = 3) {
  const cells = [];

  for (let x = 0; x < width; x++) {
    cells[x] = [];
    for (let y = 0; y < height; y++) {
      cells[x][y] = {
        x,
        y,
        c: 255, // Unexplored
        w: [0, 0, 0, 0] // No walls
      };
    }
  }

  return {
    w: width,
    h: height,
    tx: width - 1,
    ty: height - 1,
    rx: 0,
    ry: 0,
    rd: 0,
    c: cells,
    sf: 0,
    sl: 0,
    sr: 0
  };
}

export default {
  parsePacket,
  validateMazeState,
  createEmptyMazeState,
  buildMazeFromMinimalState,
  directionToWallIndex,
  getRelativeWallIndex
};
