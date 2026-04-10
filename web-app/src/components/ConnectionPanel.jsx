// ConnectionPanel Component
// Handles Web Serial API connection lifecycle

import React from 'react';
import { ConnectionState } from '../utils/connectionManager.js';
import './ConnectionPanel.css';

/**
 * @typedef {Object} ConnectionPanelProps
 * @property {Object} connectionState - Connection state
 * @property {string} connectionState.status - Connection status
 * @property {string|null} connectionState.errorMessage - Error message if any
 * @property {number|null} debugLevel - Current debug level (0 = none, 1 = minimal, 2 = full, null = unknown)
 * @property {Function} onConnect - Connect handler
 * @property {Function} onStartSolve - Start maze solve handler
 * @property {boolean} isSupported - Whether Web Serial API is supported
 */

/**
 * Connection panel component
 * @param {ConnectionPanelProps} props - Component props
 */
export function ConnectionPanel({ 
  connectionState, 
  debugLevel,
  onConnect, 
  onStartSolve,
  isSupported 
}) {
  const { status, errorMessage } = connectionState;

  const getStatusText = () => {
    switch (status) {
      case ConnectionState.CONNECTED:
        return 'Connected';
      case ConnectionState.CONNECTING:
        return 'Connecting...';
      case ConnectionState.ERROR:
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case ConnectionState.CONNECTED:
        return 'status-connected';
      case ConnectionState.CONNECTING:
        return 'status-connecting';
      case ConnectionState.ERROR:
        return 'status-error';
      default:
        return 'status-disconnected';
    }
  };

  const getDebugLevelStatus = () => {
    if (status !== ConnectionState.CONNECTED) return null;
    if (debugLevel === null) return 'Waiting for setup...';
    if (debugLevel === 0) return 'No Telemetry';
    if (debugLevel === 1) return 'Minimal Mode';
    if (debugLevel === 2) return 'Full Mode';
    return 'Unknown Mode';
  };

  const debugStatus = getDebugLevelStatus();

  if (!isSupported) {
    return (
      <div className="connection-panel">
        <div className="connection-error">
          <span className="error-icon">⚠️</span>
          <span>Web Serial API is not supported in this browser. Please use Chrome or Edge.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="connection-panel">
      <div className="connection-status">
        <span className={`status-indicator ${getStatusClass()}`}></span>
        <span className="status-text">{getStatusText()}</span>
        {debugStatus && (
          <span className={`debug-status debug-level-${debugLevel}`}>
            {debugStatus}
          </span>
        )}
      </div>
      
      {errorMessage && (
        <div className="connection-error">
          <span className="error-message">{errorMessage}</span>
        </div>
      )}
      
      <div className="connection-actions">
        {status === ConnectionState.CONNECTED ? (
          <>
            <button 
              className="disconnect-button"
              onClick={() => window.location.reload()}
            >
              Disconnect
            </button>
            <button 
              className="solve-button"
              onClick={onStartSolve}
              disabled={debugLevel === null}
              title={debugLevel === null ? 'Waiting for setup payload from robot' : 'Start maze solving'}
            >
              Start Solve
            </button>
          </>
        ) : (
          <button 
            className="connect-button"
            onClick={onConnect}
            disabled={status === ConnectionState.CONNECTING}
          >
            {status === ConnectionState.CONNECTING ? 'Connecting...' : 'Connect'}
          </button>
        )}
      </div>
    </div>
  );
}

export default ConnectionPanel;
