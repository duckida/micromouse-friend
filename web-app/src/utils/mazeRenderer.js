// Maze Renderer
// Canvas-based rendering functions for maze visualization

/**
 * @typedef {Object} Layout
 * @property {number} cellSize - Size of each cell in pixels
 * @property {number} offsetX - X offset for centering
 * @property {number} offsetY - Y offset for centering
 * @property {number} gridWidth - Total grid width
 * @property {number} gridHeight - Total grid height
 */

/**
 * Calculate layout dimensions for the maze grid
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {number} mazeWidth - Maze width in cells
 * @param {number} mazeHeight - Maze height in cells
 * @returns {Layout} Layout dimensions
 */
export function calculateLayout(canvasWidth, canvasHeight, mazeWidth, mazeHeight) {
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

/**
 * Convert maze Y coordinate to canvas Y (maze origin is bottom-left)
 * @param {number} mazeY - Y coordinate in maze (0 = bottom)
 * @param {number} mazeHeight - Total maze height
 * @param {Layout} layout - Layout dimensions
 * @returns {number} Canvas Y coordinate
 */
function mazeYToCanvasY(mazeY, mazeHeight, layout) {
  // Flip Y so that maze Y=0 is at the bottom of the canvas
  return layout.offsetY + (mazeHeight - 1 - mazeY) * layout.cellSize;
}

/**
 * Draw the maze grid
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Layout} layout - Layout dimensions
 * @param {number} mazeWidth - Maze width in cells
 * @param {number} mazeHeight - Maze height in cells
 */
export function drawGrid(ctx, layout, mazeWidth, mazeHeight) {
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  
  // Draw vertical lines
  for (let x = 0; x <= mazeWidth; x++) {
    const px = Math.round(layout.offsetX + x * layout.cellSize) + 0.5;
    ctx.beginPath();
    ctx.moveTo(px, layout.offsetY);
    ctx.lineTo(px, layout.offsetY + layout.gridHeight);
    ctx.stroke();
  }
  
  // Draw horizontal lines
  for (let y = 0; y <= mazeHeight; y++) {
    const py = Math.round(layout.offsetY + y * layout.cellSize) + 0.5;
    ctx.beginPath();
    ctx.moveTo(layout.offsetX, py);
    ctx.lineTo(layout.offsetX + layout.gridWidth, py);
    ctx.stroke();
  }
}

/**
 * Draw walls on the maze
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Layout} layout - Layout dimensions
 * @param {import('./telemetryParser.js').Cell[][]} cells - Cell array
 */
export function drawWalls(ctx, layout, cells) {
  if (!cells || cells.length === 0) return;

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  
  const mazeWidth = cells.length;
  const mazeHeight = cells[0]?.length || 0;

  for (let x = 0; x < mazeWidth; x++) {
    for (let y = 0; y < mazeHeight; y++) {
      const cell = cells[x][y];
      const px = layout.offsetX + x * layout.cellSize;
      const py = mazeYToCanvasY(y, mazeHeight, layout);
      
      // North wall (index 0) - visually at top of cell
      if (cell.w[0]) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + layout.cellSize, py);
        ctx.stroke();
      }
      
      // East wall (index 1) - visually at right of cell
      if (cell.w[1]) {
        ctx.beginPath();
        ctx.moveTo(px + layout.cellSize, py);
        ctx.lineTo(px + layout.cellSize, py + layout.cellSize);
        ctx.stroke();
      }
      
      // South wall (index 2) - visually at bottom of cell
      if (cell.w[2]) {
        ctx.beginPath();
        ctx.moveTo(px, py + layout.cellSize);
        ctx.lineTo(px + layout.cellSize, py + layout.cellSize);
        ctx.stroke();
      }
      
      // West wall (index 3) - visually at left of cell
      if (cell.w[3]) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + layout.cellSize);
        ctx.stroke();
      }
    }
  }
}

/**
 * Get color for cost value
 * @param {number} cost - Cost value (0-255)
 * @param {number} maxCost - Maximum cost value
 * @returns {string} HSL color string
 */
export function getCostColor(cost, maxCost = 255) {
  if (cost === 255) return '#f0f0f0'; // Unexplored
  
  const normalized = Math.min(cost / maxCost, 1);
  const hue = (1 - normalized) * 240; // Blue (240) to Red (0)
  return `hsl(${hue}, 70%, 85%)`;
}

/**
 * Draw floodfill costs on cells
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Layout} layout - Layout dimensions
 * @param {import('./telemetryParser.js').Cell[][]} cells - Cell array
 * @param {number} targetX - Target X coordinate
 * @param {number} targetY - Target Y coordinate
 * @param {boolean} showCosts - Whether to show cost values
 */
export function drawCosts(ctx, layout, cells, targetX, targetY, showCosts = true) {
  if (!cells || cells.length === 0) return;

  const mazeWidth = cells.length;
  const mazeHeight = cells[0]?.length || 0;

  // Find max cost for normalization
  let maxCost = 0;
  for (let x = 0; x < mazeWidth; x++) {
    for (let y = 0; y < mazeHeight; y++) {
      const cost = cells[x][y].c;
      if (cost !== 255 && cost > maxCost) {
        maxCost = cost;
      }
    }
  }

  for (let x = 0; x < mazeWidth; x++) {
    for (let y = 0; y < mazeHeight; y++) {
      const cell = cells[x][y];
      const px = layout.offsetX + x * layout.cellSize;
      const py = mazeYToCanvasY(y, mazeHeight, layout);
      
      // Fill cell background with cost color
      ctx.fillStyle = getCostColor(cell.c, maxCost);
      ctx.fillRect(px + 1, py + 1, layout.cellSize - 2, layout.cellSize - 2);
      
      // Highlight target cell
      if (x === targetX && y === targetY) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.fillRect(px + 1, py + 1, layout.cellSize - 2, layout.cellSize - 2);
      }

      // Draw cost text if enabled
      if (showCosts) {
        ctx.fillStyle = '#333333';
        const fontSize = Math.max(10, Math.min(layout.cellSize / 3, 24));
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textX = px + layout.cellSize / 2;
        const textY = py + layout.cellSize / 2;
        ctx.fillText(cell.c.toString(), textX, textY);
      }
    }
  }
}

/**
 * Draw robot on the maze
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Layout} layout - Layout dimensions
 * @param {number} rx - Robot X coordinate
 * @param {number} ry - Robot Y coordinate
 * @param {number} rd - Robot direction (0, 90, 180, 270)
 * @param {number} mazeHeight - Maze height for coordinate conversion
 */
export function drawRobot(ctx, layout, rx, ry, rd, mazeHeight) {
  const px = layout.offsetX + rx * layout.cellSize + layout.cellSize / 2;
  const py = mazeYToCanvasY(ry, mazeHeight, layout) + layout.cellSize / 2;
  const radius = layout.cellSize * 0.3;
  
  // Draw robot circle
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw direction indicator (triangle)
  // In maze coordinates: 0=North(+Y), 90=East(+X), 180=South(-Y), 270=West(-X)
  // Canvas angles: 0=East(+X), PI/2=South(+Y), PI=West(-X), -PI/2=North(-Y)
  // Convert: canvasAngle = (90 - mazeDir) in degrees, then to radians
  const canvasAngle = ((90 - rd) * Math.PI) / 180;
  const tipX = px + Math.cos(canvasAngle) * radius;
  const tipY = py - Math.sin(canvasAngle) * radius;
  
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    px + Math.cos(canvasAngle + 2.5) * radius * 0.5,
    py - Math.sin(canvasAngle + 2.5) * radius * 0.5
  );
  ctx.lineTo(
    px + Math.cos(canvasAngle - 2.5) * radius * 0.5,
    py - Math.sin(canvasAngle - 2.5) * radius * 0.5
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Render the complete maze
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {import('./telemetryParser.js').MazeState} mazeState - Maze state to render
 * @param {Object} settings - Render settings
 * @param {boolean} settings.showCosts - Whether to show cost values
 * @param {boolean} settings.showWalls - Whether to show walls
 */
export function renderMaze(ctx, mazeState, settings = { showCosts: true, showWalls: true }) {
  if (!mazeState) return;

  const canvas = ctx.canvas;
  const layout = calculateLayout(canvas.width, canvas.height, mazeState.w, mazeState.h);

  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw in order: grid, costs, walls, robot
  drawGrid(ctx, layout, mazeState.w, mazeState.h);
  drawCosts(ctx, layout, mazeState.c, mazeState.tx, mazeState.ty, settings.showCosts);
  
  if (settings.showWalls) {
    drawWalls(ctx, layout, mazeState.c);
  }
  
  drawRobot(ctx, layout, mazeState.rx, mazeState.ry, mazeState.rd, mazeState.h);
}

export default {
  calculateLayout,
  drawGrid,
  drawWalls,
  getCostColor,
  drawCosts,
  drawRobot,
  renderMaze
};