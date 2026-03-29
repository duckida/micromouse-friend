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
 * @typedef {Object} MazeState
 * @property {number} w - Width
 * @property {number} h - Height
 * @property {number} tx - Target X
 * @property {number} ty - Target Y
 * @property {number} rx - Robot X
 * @property {number} ry - Robot Y
 * @property {number} rd - Robot direction (0, 90, 180, 270)
 * @property {Cell[][]} c - Cells indexed as c[x][y]
 */

/**
 * Parse a JSON telemetry packet
 * @param {string} packet - JSON string to parse
 * @returns {MazeState|null} Parsed maze state or null if invalid
 */
export function parsePacket(packet) {
  try {
    const data = JSON.parse(packet);
    
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
    c: cells
  };
}

export default {
  parsePacket,
  validateMazeState,
  createEmptyMazeState
};