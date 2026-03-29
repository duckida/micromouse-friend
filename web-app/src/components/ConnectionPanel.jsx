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
 * @property {Function} onConnect - Connect handler
 * @property {Function} onDisconnect - Disconnect handler
 * @property {Function} onStartSolve - Start maze solve handler
 * @property {boolean} isSupported - Whether Web Serial API is supported
 */

/**
 * Connection panel component
 * @param {ConnectionPanelProps} props - Component props
 */
export function ConnectionPanel({ 
  connectionState, 
  onConnect, 
  onDisconnect, 
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
              onClick={onDisconnect}
            >
              Disconnect
            </button>
            <button 
              className="solve-button"
              onClick={onStartSolve}
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