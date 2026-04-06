// CellViewer Component
// Displays the 3 sensing point values for the current cell

import React from 'react';
import './CellViewer.css';

export function CellViewer({ sensingPoints }) {
  if (!sensingPoints || sensingPoints.every(sp => sp === null)) {
    return null;
  }

  const hasData = sensingPoints.some(sp => sp !== null);

  if (!hasData) {
    return null;
  }

  return (
    <div className="cell-viewer">
      <div className="cell-viewer-title">Sensing Points</div>
      <div className="sensing-points">
        {sensingPoints.map((sp, index) => (
          <div key={index} className={`sensing-point ${sp ? 'has-data' : ''}`}>
            <div className="sensing-point-label">{index + 1}</div>
            {sp ? (
              <div className="sensing-point-values">
                <div className="sensor-value">
                  <span className="sensor-label">F:</span>
                  <span className="sensor-number">{sp.sf}</span>
                </div>
                <div className="sensor-value">
                  <span className="sensor-label">L:</span>
                  <span className="sensor-number">{sp.sl}</span>
                </div>
                <div className="sensor-value">
                  <span className="sensor-label">R:</span>
                  <span className="sensor-number">{sp.sr}</span>
                </div>
              </div>
            ) : (
              <div className="sensing-point-empty">-</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CellViewer;
