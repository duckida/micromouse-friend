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
  const [stepHistory, setStepHistory] = useState([]);
  
  const connectionManagerRef = useRef(null);
  const currentSensors = useRef({ sf: 0, sl: 0, sr: 0 });

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
          // Wall state packet: merge sensor data into existing maze state
          if ('sf' in parsed && !('w' in parsed)) {
            currentSensors.current = { sf: parsed.sf, sl: parsed.sl, sr: parsed.sr };
            setMazeState(prevState => {
              if (!prevState) return prevState;
              return { ...prevState, sf: parsed.sf, sl: parsed.sl, sr: parsed.sr };
            });
            setTimeoutWarning(false);
            return;
          }

          // Full maze state packet
          setMazeState(prevState => {
            // Handle dimension changes - reset histories
            if (prevState && (prevState.w !== parsed.w || prevState.h !== parsed.h)) {
              setPathHistory([{ x: parsed.rx, y: parsed.ry }]);
              setStepHistory([]);
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

          // Snapshot maze state on position change
          setStepHistory(prev => {
            const lastStep = prev[prev.length - 1];
            if (!lastStep || lastStep.rx !== parsed.rx || lastStep.ry !== parsed.ry) {
              const s = currentSensors.current;
              return [...prev, { ...parsed, sf: s.sf, sl: s.sl, sr: s.sr }];
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
    stepHistory,
    connect,
    disconnect,
    send,
    isSupported: ConnectionManager.isSupported()
  };
}

export default useSerial;