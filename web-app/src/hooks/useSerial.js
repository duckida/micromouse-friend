// React hook for serial connection
// Manages connection state and maze state updates

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionManager, ConnectionState } from '../utils/connectionManager.js';
import { buildMazeFromMinimalState, createEmptyMazeState } from '../utils/telemetryParser.js';

function cloneMazeSnapshot(state) {
  return {
    ...state,
    c: state.c.map(col => col.map(cell => ({
      ...cell,
      w: [...cell.w]
    }))),
    sensingPoints: [...(state.sensingPoints || [null, null, null])]
  };
}

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
  const mazeStateRef = useRef(null);
  const thresholdsRef = useRef({ tl: 7, tf: 30, tr: 7 });
  const mazeDimensionsRef = useRef({ w: 3, h: 6 });
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
            const nextThresholds = { tl: parsed.tl, tf: parsed.tf, tr: parsed.tr };
            const nextMazeDimensions = { w: parsed.w, h: parsed.h };
            thresholdsRef.current = nextThresholds;
            mazeDimensionsRef.current = nextMazeDimensions;
            setThresholds(nextThresholds);
            setMazeDimensions(nextMazeDimensions);

            // Initialize maze state with dimensions from setup
            const initialState = createEmptyMazeState(parsed.w, parsed.h);
            mazeStateRef.current = initialState;
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
            currentSensors.current = { sf: parsed.sf, sl: parsed.sl, sr: parsed.sr };

            const baseState = mazeStateRef.current || createEmptyMazeState(
              mazeDimensionsRef.current.w,
              mazeDimensionsRef.current.h
            );

            const hasSensingPoint = parsed.sp !== undefined && parsed.sp >= 0 && parsed.sp <= 2;
            const positionChanged = baseState.rx !== parsed.rx || baseState.ry !== parsed.ry;
            const sensingPoints = positionChanged
              ? [null, null, null]
              : [...(baseState.sensingPoints || [null, null, null])];

            if (hasSensingPoint) {
              sensingPoints[parsed.sp] = { sf: parsed.sf, sl: parsed.sl, sr: parsed.sr };
            }

            // Sensing-point packets are for per-cell sensor logging; only the
            // main minimal-state packet should commit walls into the maze.
            const nextMazeState = hasSensingPoint
              ? {
                  ...baseState,
                  rx: parsed.rx,
                  ry: parsed.ry,
                  rd: parsed.rd,
                  sf: parsed.sf,
                  sl: parsed.sl,
                  sr: parsed.sr,
                  sensingPoints
                }
              : {
                  ...buildMazeFromMinimalState(
                    parsed,
                    thresholdsRef.current,
                    baseState
                  ),
                  sensingPoints
                };

            mazeStateRef.current = nextMazeState;
            setMazeState(nextMazeState);

            // Track path history
            setPathHistory(prev => {
              const newX = parsed.rx;
              const newY = parsed.ry;
              const lastPoint = prev[prev.length - 1];
              
              const shouldAdd = !lastPoint || 
                lastPoint.x !== newX || 
                lastPoint.y !== newY ||
                typeof lastPoint.x === 'undefined';
              
              if (shouldAdd) {
                return [...prev, { x: newX, y: newY }];
              }
              return prev;
            });

            // Snapshot maze state on position change
            setStepHistory(prev => {
              const newRx = parsed.rx;
              const newRy = parsed.ry;
              const lastStep = prev[prev.length - 1];
              
              // Add to history if position changed or no previous step
              const shouldAdd = !lastStep || 
                lastStep.rx !== newRx || 
                lastStep.ry !== newRy ||
                typeof lastStep.rx === 'undefined';
              
              const newStep = cloneMazeSnapshot(nextMazeState);

              if (shouldAdd) {
                return [...prev, newStep];
              }

              return [...prev.slice(0, -1), newStep];
            });

            currentSensingPoints.current = sensingPoints;
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
              const nextMazeState = { ...prevState, sf: parsed.sf, sl: parsed.sl, sr: parsed.sr, sensingPoints };
              mazeStateRef.current = nextMazeState;
              return nextMazeState;
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
              mazeDimensionsRef.current = { w: parsed.w, h: parsed.h };
              mazeStateRef.current = parsed;
              return parsed;
            }
            mazeStateRef.current = parsed;
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
       const defaultThresholds = { tl: 7, tf: 30, tr: 7 };
       const defaultMazeDimensions = { w: 3, h: 6 };
       thresholdsRef.current = defaultThresholds;
       mazeDimensionsRef.current = defaultMazeDimensions;
       mazeStateRef.current = null;
       setThresholds(defaultThresholds);
       setMazeDimensions(defaultMazeDimensions);
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
