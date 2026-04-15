import React from 'react';
import './CellViewer.css';

export function CellViewer({ sensingPoints, activeIndex, thresholds, debugLevel }) {
  const defaultPoints = [
    { sf: '-', sl: '-', sr: '-' },
    { sf: '-', sl: '-', sr: '-' },
    { sf: '-', sl: '-', sr: '-' }
  ];

  const points = sensingPoints || defaultPoints;
  const hasThresholds = thresholds && thresholds.tf !== undefined;

  const isWallDetected = (side, value) => {
    if (!hasThresholds || value === '-') return false;
    if (side === 'f') return value >= thresholds.tf;
    if (side === 'l') return value > thresholds.tl;
    if (side === 'r') return value > thresholds.tr;
    return false;
  };

  const getCellClass = (index, side, value) => {
    const classes = ['cell-viewer-cell'];
    if (activeIndex === index) {
      classes.push('active');
    }
    if (isWallDetected(side, value)) {
      classes.push('wall-detected');
    }
    return classes.join(' ');
  };

  // Get the best available front sensor reading (prefer later sensing points)
  const frontValue = points[2]?.sf !== undefined ? points[2].sf :
                     points[1]?.sf !== undefined ? points[1].sf :
                     points[0]?.sf !== undefined ? points[0].sf : '-';

  const frontIsWall = isWallDetected('f', frontValue);

  return (
    <div className="cell-viewer">
      <h3 className="cell-viewer-title">
        Sensing Points
        {debugLevel === 1 && <span className="cell-viewer-badge minimal">Minimal</span>}
      </h3>
      <div className="cell-viewer-container">
        <div className={`cell-viewer-number-top ${frontIsWall ? 'wall-detected' : ''}`}>
          {frontValue}
          {frontIsWall && <span className="wall-indicator">WALL</span>}
        </div>

        <div className="cell-viewer-left-col">
          <div className={getCellClass(0, 'l', points[0]?.sl)}>
            <span className="cell-label">1</span>
            <span className="cell-value">{points[0]?.sl ?? '-'}</span>
          </div>
          <div className={getCellClass(1, 'l', points[1]?.sl)}>
            <span className="cell-label">2</span>
            <span className="cell-value">{points[1]?.sl ?? '-'}</span>
          </div>
          <div className={getCellClass(2, 'l', points[2]?.sl)}>
            <span className="cell-label">3</span>
            <span className="cell-value">{points[2]?.sl ?? '-'}</span>
          </div>
        </div>

        <div className="cell-viewer-circle">
          <div className="cell-viewer-triangle"></div>
        </div>

        <div className="cell-viewer-right-col">
          <div className={getCellClass(0, 'r', points[0]?.sr)}>
            <span className="cell-label">1</span>
            <span className="cell-value">{points[0]?.sr ?? '-'}</span>
          </div>
          <div className={getCellClass(1, 'r', points[1]?.sr)}>
            <span className="cell-label">2</span>
            <span className="cell-value">{points[1]?.sr ?? '-'}</span>
          </div>
          <div className={getCellClass(2, 'r', points[2]?.sr)}>
            <span className="cell-label">3</span>
            <span className="cell-value">{points[2]?.sr ?? '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CellViewer;
