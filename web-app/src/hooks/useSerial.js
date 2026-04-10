// React hook for serial connection
// Manages connection state and maze state updates

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionManager, ConnectionState } from '../utils/connectionManager.js';
import { buildMazeFromMinimalState, createEmptyMazeState } from '../utils/telemetryParser.js';

/**
 * @typedef {Object} UseSerialReturn
 * @property {Object} connectionState - Connection state
 * @property {string} connectionState.status - Connection status
 * @property {string|null} connectionState.errorMessage - Error message if any
 * @property {import('../utils/telemetryParser.js').MazeState|null} mazeState - Current maze state
 * @property {boolean} timeoutWarning - Whether to show timeout warning
 * @property {number|null} debugLevel - Current debug level (0 = minimal, 1 = full, null = unknown)
 * @property {Object} thresholds - Sensor thresholds {tl, tf, tr}
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
  const [debugLevel, setDebugLevel] = useState(2); // Default to DEBUG_FULL (2)
  const [thresholds, setThresholds] = useState({ tl: 7, tf: 30, tr: 7 }); // Default thresholds
  const [mazeDimensions, setMazeDimensions] = useState({ w: 3, h: 6 }); // Default dimensions

  const connectionManagerRef = useRef(null);
  const currentSensors = useRef({ sf: 0, sl: 0, sr: 0 });
  const currentSensingPoints = useRef([null, null, null]);
  const awaitingSetupPayload = useRef(false);

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
          // Setup payload: sent once at initialization
          if (parsed.setup === true) {
            console.log('Received setup payload:', parsed);
            setDebugLevel(parsed.level);
            setThresholds({ tl: parsed.tl, tf: parsed.tf, tr: parsed.tr });
            setMazeDimensions({ w: parsed.w, h: parsed.h });

            // Initialize maze state with dimensions from setup
            const initialState = createEmptyMazeState(parsed.w, parsed.h);
            setMazeState(initialState);
            setPathHistory([{ x: 0, y: 0 }]);
            setStepHistory([]);
            currentSensingPoints.current = [null, null, null];
            awaitingSetupPayload.current = false;
            setTimeoutWarning(false);
            return;
          }

          // Minimal state packet (sensor readings + position)
          if (parsed.rx !== undefined && parsed.ry !== undefined && parsed.rd !== undefined &&
              parsed.sf !== undefined && !('w' in parsed)) {
            setMazeState(prevState => {
              // Build maze from sensor data using thresholds
              const newState = buildMazeFromMinimalState(
                parsed,
                thresholds,
                prevState || createEmptyMazeState(mazeDimensions.w, mazeDimensions.h)
              );

              // Update sensing points if available
              const sensingPoints = [...(prevState?.sensingPoints || [null, null, null])];
              if (parsed.sp !== undefined && parsed.sp >= 0 && parsed.sp <= 2) {
                sensingPoints[parsed.sp] = { sf: parsed.sf, sl: parsed.sl, sr: parsed.sr };
              }

              return { ...newState, sensingPoints };
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
                const sp = currentSensingPoints.current;
                return [...prev, { ...parsed, sf: s.sf, sl: s.sl, sr: s.sr, sensingPoints: [...sp] }];
              }
              return prev;
            });

            currentSensors.current = { sf: parsed.sf, sl: parsed.sl, sr: parsed.sr };
            setTimeoutWarning(false);
            return;
          }

          // Wall state packet (sensor readings only, no position)
          if ('sf' in parsed && !('w' in parsed) && !('rx' in parsed)) {
            const sp = parsed.sp;
            if (sp !== undefined && sp >= 0 && sp <= 2) {
              currentSensingPoints.current[sp] = { sf: parsed.sf, sl: parsed.sl, sr: parsed.sr };
            }
            currentSensors.current = { sf: parsed.sf, sl: parsed.sl, sr: parsed.sr };
            setMazeState(prevState => {
              if (!prevState) return prevState;
              const sensingPoints = [...(prevState.sensingPoints || [null, null, null])];
              if (sp !== undefined && sp >= 0 && sp <= 2) {
                sensingPoints[sp] = { sf: parsed.sf, sl: parsed.sl, sr: parsed.sr };
              }
              return { ...prevState, sf: parsed.sf, sl: parsed.sl, sr: parsed.sr, sensingPoints };
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
              currentSensingPoints.current = [null, null, null];
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
              const sp = currentSensingPoints.current;
              return [...prev, { ...parsed, sf: s.sf, sl: s.sl, sr: s.sr, sensingPoints: [...sp] }];
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
            setDebugLevel(null);
            setPathHistory([]);
            setStepHistory([]);
            currentSensingPoints.current = [null, null, null];
          }
          if (state.status === ConnectionState.ERROR) {
            const msg = (state.errorMessage || '').toLowerCase();
            if (msg.includes('port is already in use') || msg.includes('unexpected error')) {
              window.location.reload();
            }
          }
        }
      );
    } catch (error) {
      console.error('Connection error:', error);
    }
  }, [thresholds, mazeDimensions]);

  // Disconnect from serial port
  const disconnect = useCallback(async () => {
    const manager = connectionManagerRef.current;
    if (!manager) return;

    try {
      await manager.disconnect();
      setTimeoutWarning(false);
      setDebugLevel(null);
      setThresholds({ tl: 7, tf: 30, tr: 7 });
      setMazeDimensions({ w: 3, h: 6 });
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
    debugLevel,
    thresholds,
    connect,
    disconnect,
    send,
    isSupported: ConnectionManager.isSupported()
  };
}

export default useSerial;
