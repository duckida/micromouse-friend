// Micromouse Web Visualizer
// Main App component

import React, { useState, useEffect, useCallback } from 'react';
import { useSerial } from './hooks/useSerial.js';
import ConnectionPanel from './components/ConnectionPanel.jsx';
import MazeCanvas from './components/MazeCanvas.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import InfoPanel from './components/InfoPanel.jsx';
import './App.css';

// Default settings
const DEFAULT_SETTINGS = {
  showCosts: true,
  showWalls: true,
  colorScheme: 'default'
};

// Local storage key for settings
const SETTINGS_STORAGE_KEY = 'micromouse-visualizer-settings';

function App() {
  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return DEFAULT_SETTINGS;
  });

  // Serial connection state
  const {
    connectionState,
    mazeState,
    timeoutWarning,
    connect,
    disconnect,
    send,
    isSupported
  } = useSerial();
  
  // Start maze solving mode
  const handleStartSolve = useCallback(() => {
    send('7\n');
  }, [send]);

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings]);

  // Handle settings change
  const handleSettingsChange = useCallback((newSettings) => {
    setSettings(newSettings);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Micromouse Visualizer</h1>
        <p className="app-subtitle">Real-time maze visualization</p>
      </header>

      <main className="app-main">
        <div className="app-content">
          <div className="visualization-area">
            <MazeCanvas mazeState={mazeState} settings={settings} />
          </div>

          <div className="controls-area">
            <ConnectionPanel
              connectionState={connectionState}
              onConnect={connect}
              onDisconnect={disconnect}
              onStartSolve={handleStartSolve}
              isSupported={isSupported}
            />

            <div className="panels-row">
              <InfoPanel
                mazeState={mazeState}
                connectionState={connectionState}
                timeoutWarning={timeoutWarning}
              />

              <SettingsPanel
                settings={settings}
                onSettingsChange={handleSettingsChange}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>Connect to HC-05 Bluetooth module to view live telemetry</p>
      </footer>
    </div>
  );
}

export default App;