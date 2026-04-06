// InfoPanel Component
// Displays telemetry metadata and connection status

import React from 'react';
import './InfoPanel.css';

/**
 * @typedef {Object} InfoPanelProps
 * @property {import('../utils/telemetryParser.js').MazeState|null} mazeState - Current maze state
 * @property {boolean} timeoutWarning - Whether to show timeout warning
 */

/**
 * Get direction name from degrees
 * @param {number} degrees - Direction in degrees (0, 90, 180, 270)
 * @returns {string} Direction name
 */
function getDirectionName(degrees) {
  switch (degrees) {
    case 0: return 'North';
    case 90: return 'East';
    case 180: return 'South';
    case 270: return 'West';
    default: return `${degrees}°`;
  }
}

/**
 * Info panel component
 * @param {InfoPanelProps} props - Component props
 */
export function InfoPanel({ mazeState, timeoutWarning }) {
  return (
    <div className="info-panel">
      <h3 className="info-title">Robot Info</h3>
      
      {timeoutWarning && (
        <div className="timeout-warning">
          <span className="warning-icon">⚠️</span>
          <span>No data received for 5 seconds. Check robot connection.</span>
        </div>
      )}
      
      {mazeState ? (
        <div className="info-content">
          <div className="info-item">
            <span className="info-label">Position:</span>
            <span className="info-value">
              ({mazeState.rx}, {mazeState.ry})
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-label">Direction:</span>
            <span className="info-value">
              {getDirectionName(mazeState.rd)} ({mazeState.rd}°)
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-label">Target:</span>
            <span className="info-value">
              ({mazeState.tx}, {mazeState.ty})
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-label">Maze Size:</span>
            <span className="info-value">
              {mazeState.w} × {mazeState.h}
            </span>
          </div>
        </div>
      ) : (
        <div className="info-empty">
          <p>No maze data available.</p>
          <p className="info-hint">Connect to robot to view live data.</p>
        </div>
      )}
    </div>
  );
}

export default InfoPanel;