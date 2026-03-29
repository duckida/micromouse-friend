// React hook for serial connection
// Manages connection state and maze state updates

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionManager, ConnectionState } from '../utils/connectionManager.js';

/**
 * @typedef {Object} UseSerialReturn
 * @property {Object} connectionState - Connection state
 * @property {string} connectionState.status - Connection status
 * @property {string|null} connectionState.errorMessage - Error message if any
 * @property {import('../utils/telemetryParser.js').MazeState|null} mazeState - Current maze state
 * @property {boolean} timeoutWarning - Whether to show timeout warning
 * @property {Function} connect - Connect to serial port
 * @property {Function} disconnect - Disconnect from serial port
 * @property {boolean} isSupported - Whether Web Serial API is supported
 */

/**
 * React hook for managing serial connection
 * @returns {UseSerialReturn} Serial connection state and methods
 */
export function useSerial() {
  const [connectionState, setConnectionState] = useState({
    status: ConnectionState.DISCONNECTED,
    errorMessage: null
  });
  
  const [mazeState, setMazeState] = useState(null);
  const [timeoutWarning, setTimeoutWarning] = useState(false);
  const [pathHistory, setPathHistory] = useState([]);
  
  const connectionManagerRef = useRef(null);

  // Initialize connection manager
  useEffect(() => {
    connectionManagerRef.current = new ConnectionManager();
    
    return () => {
      // Cleanup on unmount
      if (connectionManagerRef.current) {
        connectionManagerRef.current.disconnect();
      }
    };
  }, []);

  // Send data over serial
  const send = useCallback(async (data) => {
    const manager = connectionManagerRef.current;
    if (!manager) return;
    
    try {
      await manager.send(data);
    } catch (error) {
      console.error('Send error:', error);
    }
  }, []);

  // Check for data timeout periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionManagerRef.current?.checkDataTimeout()) {
        setTimeoutWarning(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Connect to serial port
  const connect = useCallback(async () => {
    const manager = connectionManagerRef.current;
    if (!manager) return;

    try {
      await manager.requestPort();
      
      await manager.connect(
        // onPacket callback
        (parsed) => {
          setMazeState(prevState => {
            // Handle dimension changes - reset path history
            if (prevState && (prevState.w !== parsed.w || prevState.h !== parsed.h)) {
              setPathHistory([{ x: parsed.rx, y: parsed.ry }]);
              return parsed;
            }
            return parsed;
          });
          
          // Track path history
          setPathHistory(prev => {
            const lastPoint = prev[prev.length - 1];
            if (!lastPoint || lastPoint.x !== parsed.rx || lastPoint.y !== parsed.ry) {
              return [...prev, { x: parsed.rx, y: parsed.ry }];
            }
            return prev;
          });
          
          setTimeoutWarning(false);
        },
        // onStateChange callback
        (state) => {
          setConnectionState(state);
          if (state.status === ConnectionState.DISCONNECTED) {
            setTimeoutWarning(false);
          }
        }
      );
    } catch (error) {
      console.error('Connection error:', error);
    }
  }, []);

  // Disconnect from serial port
  const disconnect = useCallback(async () => {
    const manager = connectionManagerRef.current;
    if (!manager) return;

    try {
      await manager.disconnect();
      setTimeoutWarning(false);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, []);

  return {
    connectionState,
    mazeState,
    timeoutWarning,
    pathHistory,
    connect,
    disconnect,
    send,
    isSupported: ConnectionManager.isSupported()
  };
}

export default useSerial;