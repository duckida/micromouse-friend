// InfoPanel Component
// Displays telemetry metadata and connection status

import React from 'react';
import './InfoPanel.css';

/**
 * @typedef {Object} InfoPanelProps
 * @property {import('../utils/telemetryParser.js').MazeState|null} mazeState - Current maze state
 * @property {boolean} timeoutWarning - Whether to show timeout warning
 * @property {number|null} debugLevel - Current debug level (0 = minimal, 1 = full, null = unknown)
 * @property {Object} thresholds - Sensor thresholds {tl, tf, tr}
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
 * Get debug level display name
 * @param {number|null} level - Debug level
 * @returns {string} Display name
 */
function getDebugLevelName(level) {
  if (level === 0) return 'Minimal';
  if (level === 1) return 'Full';
  return 'Unknown';
}

/**
 * Info panel component
 * @param {InfoPanelProps} props - Component props
 */
export function InfoPanel({ mazeState, timeoutWarning, debugLevel, thresholds }) {
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
          {/* Debug Level */}
          <div className="info-item">
            <span className="info-label">Debug Level:</span>
            <span className={`info-value debug-level-${debugLevel}`}>
              {getDebugLevelName(debugLevel)}
            </span>
          </div>

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

          {/* Sensor Thresholds */}
          <div className="info-section">
            <h4 className="info-section-title">Thresholds</h4>
            <div className="info-item">
              <span className="info-label">Left Gap:</span>
              <span className="info-value">{thresholds.tl}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Front Wall:</span>
              <span className="info-value">{thresholds.tf}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Right Gap:</span>
              <span className="info-value">{thresholds.tr}</span>
            </div>
          </div>

          {/* Current Sensor Readings */}
          <div className="info-section">
            <h4 className="info-section-title">Sensors</h4>
            <div className="info-item">
              <span className="info-label">Front:</span>
              <span className={`info-value sensor-value ${mazeState.sf >= thresholds.tf ? 'wall-detected' : ''}`}>
                {mazeState.sf !== undefined ? mazeState.sf : '—'}
                {mazeState.sf >= thresholds.tf ? ' (WALL)' : ''}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Left:</span>
              <span className={`info-value sensor-value ${mazeState.sl >= thresholds.tl ? 'wall-detected' : ''}`}>
                {mazeState.sl !== undefined ? mazeState.sl : '—'}
                {mazeState.sl >= thresholds.tl ? ' (GAP)' : ''}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Right:</span>
              <span className={`info-value sensor-value ${mazeState.sr >= thresholds.tr ? 'wall-detected' : ''}`}>
                {mazeState.sr !== undefined ? mazeState.sr : '—'}
                {mazeState.sr >= thresholds.tr ? ' (GAP)' : ''}
              </span>
            </div>
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
