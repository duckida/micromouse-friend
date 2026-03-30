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
  const padding = 24;
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
 */
function mazeYToCanvasY(mazeY, mazeHeight, layout) {
  return layout.offsetY + (mazeHeight - 1 - mazeY) * layout.cellSize;
}

/**
 * Draw the maze grid with rounded corners
 */
export function drawGrid(ctx, layout, mazeWidth, mazeHeight) {
  ctx.strokeStyle = '#e4e4e7';
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
 */
export function drawWalls(ctx, layout, cells) {
  if (!cells || cells.length === 0) return;

  const mazeWidth = cells.length;
  const mazeHeight = cells[0]?.length || 0;

  // Draw outer border first
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const bx = layout.offsetX;
  const by = layout.offsetY;
  const bw = layout.gridWidth;
  const bh = layout.gridHeight;
  
  ctx.strokeRect(bx, by, bw, bh);

  // Draw inner walls
  ctx.lineWidth = 4;

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
 * Draw floodfill costs on cells - purple mono font, no background colors
 */
export function drawCosts(ctx, layout, cells, targetX, targetY, showCosts = true) {
  if (!cells || cells.length === 0) return;

  const mazeWidth = cells.length;
  const mazeHeight = cells[0]?.length || 0;

  for (let x = 0; x < mazeWidth; x++) {
    for (let y = 0; y < mazeHeight; y++) {
      const cell = cells[x][y];
      const px = layout.offsetX + x * layout.cellSize;
      const py = mazeYToCanvasY(y, mazeHeight, layout);
      
      // Highlight target cell with subtle purple background
      if (x === targetX && y === targetY) {
        ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 2, layout.cellSize - 4, layout.cellSize - 4, 4);
        ctx.fill();
      }

      // Draw cost text if enabled
      if (showCosts) {
        const costText = cell.c === 255 ? '?' : cell.c.toString();
        
        // Larger font size, purple color, mono font
        const fontSize = Math.max(14, Math.min(layout.cellSize * 0.4, 32));
        ctx.font = `600 ${fontSize}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Purple color for costs
        ctx.fillStyle = cell.c === 255 ? '#a1a1aa' : '#7c3aed';
        
        const textX = px + layout.cellSize / 2;
        const textY = py + layout.cellSize / 2;
        ctx.fillText(costText, textX, textY);
      }
    }
  }
}

/**
 * Draw robot path history
 */
export function drawPath(ctx, layout, pathHistory, mazeHeight) {
  if (!pathHistory || pathHistory.length < 2) return;

  ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([8, 4]);

  ctx.beginPath();

  for (let i = 0; i < pathHistory.length; i++) {
    const point = pathHistory[i];
    const px = layout.offsetX + point.x * layout.cellSize + layout.cellSize / 2;
    const py = mazeYToCanvasY(point.y, mazeHeight, layout) + layout.cellSize / 2;

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.stroke();
  ctx.setLineDash([]);

  // Draw path dots
  for (const point of pathHistory) {
    const px = layout.offsetX + point.x * layout.cellSize + layout.cellSize / 2;
    const py = mazeYToCanvasY(point.y, mazeHeight, layout) + layout.cellSize / 2;

    ctx.fillStyle = 'rgba(139, 92, 246, 0.6)';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, 2 * Math.PI);
    ctx.fill();
  }
}

/**
 * Draw robot on the maze with sensor indicators
 */
export function drawRobot(ctx, layout, rx, ry, rd, mazeHeight, sensors = null) {
  const px = layout.offsetX + rx * layout.cellSize + layout.cellSize / 2;
  const py = mazeYToCanvasY(ry, mazeHeight, layout) + layout.cellSize / 2;
  const radius = layout.cellSize * 0.35;
  
  // Sensor thresholds (matching Arduino wall detection)
  const FRONT_WALL_THRESHOLD = 40;
  const LEFT_WALL_THRESHOLD = 7;
  const RIGHT_WALL_THRESHOLD = 6;

  // Draw sensor indicator arcs if sensor data is available
  if (sensors && (sensors.sf !== undefined || sensors.sl !== undefined || sensors.sr !== undefined)) {
    const canvasAngle = ((90 - rd) * Math.PI) / 180;
    const arcWidth = 0.45; // Half-width of each arc in radians
    const arcOuter = radius + layout.cellSize * 0.12;
    const arcInner = radius + 2;
    const fontSize = Math.max(9, Math.min(layout.cellSize * 0.16, 14));

    const sensorData = [
      { angle: canvasAngle, value: sensors.sf, threshold: FRONT_WALL_THRESHOLD, label: 'F' },
      { angle: canvasAngle + Math.PI / 2, value: sensors.sl, threshold: LEFT_WALL_THRESHOLD, label: 'L' },
      { angle: canvasAngle - Math.PI / 2, value: sensors.sr, threshold: RIGHT_WALL_THRESHOLD, label: 'R' }
    ];

    for (const sensor of sensorData) {
      if (sensor.value === undefined) continue;

      const wallDetected = sensor.value >= sensor.threshold;
      const startAngle = sensor.angle - arcWidth;
      const endAngle = sensor.angle + arcWidth;

      // Arc fill
      ctx.beginPath();
      ctx.arc(px, py, arcOuter, startAngle, endAngle);
      ctx.arc(px, py, arcInner, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = wallDetected ? 'rgba(239, 68, 68, 0.85)' : 'rgba(34, 197, 94, 0.85)';
      ctx.fill();

      // Value label outside the arc
      const labelDist = arcOuter + fontSize * 0.8;
      const labelX = px + Math.cos(sensor.angle) * labelDist;
      const labelY = py + Math.sin(sensor.angle) * labelDist;

      ctx.font = `700 ${fontSize}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = wallDetected ? '#dc2626' : '#16a34a';
      ctx.fillText(sensor.value.toString(), labelX, labelY);
    }
  }

  // Outer glow
  ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
  ctx.shadowBlur = 12;
  
  // Draw robot circle with gradient
  const gradient = ctx.createRadialGradient(px - radius * 0.3, py - radius * 0.3, 0, px, py, radius);
  gradient.addColorStop(0, '#a78bfa');
  gradient.addColorStop(1, '#7c3aed');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  
  // Draw white border
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, 2 * Math.PI);
  ctx.stroke();
  
  // Draw direction indicator (triangle pointing in maze direction)
  const canvasAngle = ((90 - rd) * Math.PI) / 180;
  const tipX = px + Math.cos(canvasAngle) * radius * 0.8;
  const tipY = py - Math.sin(canvasAngle) * radius * 0.8;
  
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    px + Math.cos(canvasAngle + 2.2) * radius * 0.4,
    py - Math.sin(canvasAngle + 2.2) * radius * 0.4
  );
  ctx.lineTo(
    px + Math.cos(canvasAngle - 2.2) * radius * 0.4,
    py - Math.sin(canvasAngle - 2.2) * radius * 0.4
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw backdrop image behind the maze
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {HTMLImageElement} backdropImage - The backdrop image
 * @param {number} opacity - Opacity of the backdrop (0-1)
 */
export function drawBackdrop(ctx, canvas, backdropImage, opacity = 0.5) {
  if (!backdropImage || !backdropImage.complete || !backdropImage.naturalWidth) return;

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const imgWidth = backdropImage.naturalWidth;
  const imgHeight = backdropImage.naturalHeight;

  // Calculate how to fit the image to cover the canvas while maintaining aspect ratio
  const scale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
  const scaledWidth = imgWidth * scale;
  const scaledHeight = imgHeight * scale;
  
  // Center the image
  const x = (canvasWidth - scaledWidth) / 2;
  const y = (canvasHeight - scaledHeight) / 2;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(backdropImage, x, y, scaledWidth, scaledHeight);
  ctx.restore();
}

/**
 * Render the complete maze
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} mazeState - Maze state to render
 * @param {Object} settings - Render settings
 * @param {Array} pathHistory - Path history array
 * @param {HTMLImageElement|null} backdropImage - Optional backdrop image
 */
export function renderMaze(ctx, mazeState, settings = { showCosts: true, showWalls: true, backdropOpacity: 0.5 }, pathHistory = [], backdropImage = null) {
  const canvas = ctx.canvas;
  
  // Clear canvas with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw backdrop image if provided
  if (backdropImage) {
    drawBackdrop(ctx, canvas, backdropImage, settings.backdropOpacity || 0.5);
  }

  if (!mazeState) {
    // Draw placeholder text if no maze state
    ctx.fillStyle = '#999999';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Connect to robot to view maze', canvas.width / 2, canvas.height / 2);
    return;
  }

  const layout = calculateLayout(canvas.width, canvas.height, mazeState.w, mazeState.h);

  // Draw in order: grid, costs, path, walls, robot
  drawGrid(ctx, layout, mazeState.w, mazeState.h);
  drawCosts(ctx, layout, mazeState.c, mazeState.tx, mazeState.ty, settings.showCosts);
  drawPath(ctx, layout, pathHistory, mazeState.h);
  
  if (settings.showWalls) {
    drawWalls(ctx, layout, mazeState.c);
  }
  
  drawRobot(ctx, layout, mazeState.rx, mazeState.ry, mazeState.rd, mazeState.h, {
    sf: mazeState.sf,
    sl: mazeState.sl,
    sr: mazeState.sr
  });
}

export default {
  calculateLayout,
  drawGrid,
  drawWalls,
  drawCosts,
  drawPath,
  drawRobot,
  drawBackdrop,
  renderMaze
};