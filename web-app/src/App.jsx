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
  colorScheme: 'default',
  backdropOpacity: 0.5
};

// Local storage key for settings
const SETTINGS_STORAGE_KEY = 'micromouse-visualizer-settings';

// Local storage key for backdrop image
const BACKDROP_IMAGE_STORAGE_KEY = 'micromouse-visualizer-backdrop';

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

  // Backdrop image state
  const [backdropImage, setBackdropImage] = useState(() => {
    try {
      return localStorage.getItem(BACKDROP_IMAGE_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to load backdrop image:', error);
      return null;
    }
  });

  // Serial connection state
  const {
    connectionState,
    mazeState,
    timeoutWarning,
    pathHistory,
    stepHistory,
    connect,
    disconnect,
    send,
    isSupported
  } = useSerial();

  // Step navigation: -1 = live, 0+ = step index
  const [currentStep, setCurrentStep] = useState(-1);

  // Auto-follow live when not navigating
  useEffect(() => {
    if (currentStep >= 0 && currentStep >= stepHistory.length) {
      setCurrentStep(-1);
    }
  }, [stepHistory.length, currentStep]);

  // Compute display state
  const displayState = currentStep >= 0 && currentStep < stepHistory.length
    ? stepHistory[currentStep]
    : mazeState;

  const handlePrev = useCallback(() => {
    if (stepHistory.length === 0) return;
    setCurrentStep(prev => {
      if (prev < 0) return stepHistory.length - 1; // from live, go to last step
      if (prev === 0) return 0;
      return prev - 1;
    });
  }, [stepHistory.length]);

  const handleNext = useCallback(() => {
    if (stepHistory.length === 0) return;
    setCurrentStep(prev => {
      if (prev < 0) return -1; // already live
      if (prev >= stepHistory.length - 1) return -1; // go to live
      return prev + 1;
    });
  }, [stepHistory.length]);

  const handleGoLive = useCallback(() => {
    setCurrentStep(-1);
  }, []);

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

  // Save backdrop image to localStorage when it changes
  useEffect(() => {
    try {
      if (backdropImage) {
        localStorage.setItem(BACKDROP_IMAGE_STORAGE_KEY, backdropImage);
      } else {
        localStorage.removeItem(BACKDROP_IMAGE_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save backdrop image:', error);
    }
  }, [backdropImage]);

  // Handle settings change
  const handleSettingsChange = useCallback((newSettings) => {
    setSettings(newSettings);
  }, []);

  // Handle backdrop image upload
  const handleBackdropImageUpload = useCallback((dataUrl) => {
    setBackdropImage(dataUrl);
  }, []);

  // Handle backdrop image clear
  const handleBackdropImageClear = useCallback(() => {
    setBackdropImage(null);
  }, []);

  const isLive = currentStep < 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">mouse friend</h1>
      </header>

      <main className="app-main">
        <div className="app-content">
          <div className="visualization-area">
            <MazeCanvas 
              mazeState={displayState} 
              settings={settings} 
              pathHistory={pathHistory}
              backdropImage={backdropImage}
            />

            {stepHistory.length > 0 && (
              <div className="step-nav">
                <button className="step-nav-btn" onClick={handlePrev} disabled={stepHistory.length === 0 || currentStep === 0}>
                  &lt;
                </button>
                <span className="step-nav-label" onClick={!isLive ? handleGoLive : undefined}>
                  {isLive ? 'LIVE' : `${currentStep + 1} / ${stepHistory.length}`}
                </span>
                <button className="step-nav-btn" onClick={handleNext} disabled={stepHistory.length === 0}>
                  &gt;
                </button>
              </div>
            )}
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
                mazeState={displayState}
                connectionState={connectionState}
                timeoutWarning={timeoutWarning}
              />

              <SettingsPanel
                settings={settings}
                onSettingsChange={handleSettingsChange}
                backdropImage={backdropImage}
                onBackdropImageUpload={handleBackdropImageUpload}
                onBackdropImageClear={handleBackdropImageClear}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
