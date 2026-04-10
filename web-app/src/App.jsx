// Micromouse Web Visualizer
// Main App component

import React, { useState, useEffect, useCallback } from 'react';
import { useSerial } from './hooks/useSerial.js';
import ConnectionPanel from './components/ConnectionPanel.jsx';
import MazeCanvas from './components/MazeCanvas.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import InfoPanel from './components/InfoPanel.jsx';
import CellViewer from './components/CellViewer.jsx';
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
    debugLevel,
    thresholds,
    connect,
    disconnect,
    send,
    isSupported
  } = useSerial();

  // Step navigation: -1 = live, 0+ = step index
  const [currentStep, setCurrentStep] = useState(-1);

  // Compute display state
  const displayState = currentStep >= 0 && currentStep < stepHistory.length
    ? { ...stepHistory[currentStep], sensingPoints: stepHistory[currentStep].sensingPoints || [null, null, null] }
    : mazeState;
  
  // Get current sensing point data
  const currentSensingPoints = displayState?.sensingPoints || [null, null, null];
  
  // For now, use latest available sensor readings
  const canvasState = displayState;

  const handlePrev = useCallback(() => {
    if (stepHistory.length === 0) return;
    
    // If live, go to last cell
    if (currentStep < 0) {
      setCurrentStep(stepHistory.length - 1);
      return;
    }
    
    // If at first cell, stay there
    if (currentStep === 0) return;
    
    setCurrentStep(prev => prev - 1);
  }, [stepHistory.length, currentStep]);

  const handleNext = useCallback(() => {
    if (stepHistory.length === 0) return;
    
    // If live, go to first cell
    if (currentStep < 0) {
      setCurrentStep(0);
      return;
    }
    
    // If at last cell, go to live
    if (currentStep === stepHistory.length - 1) {
      setCurrentStep(-1);
      return;
    }
    
    setCurrentStep(prev => prev + 1);
  }, [stepHistory.length, currentStep]);

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

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">mouse friend</h1>
      </header>

      <main className="app-main">
        <div className="app-content">
          <div className="visualization-area">
            <MazeCanvas 
              mazeState={canvasState} 
              settings={settings} 
              pathHistory={pathHistory}
              backdropImage={backdropImage}
            />

            {stepHistory.length > 0 && (
              <div className="step-nav">
                <button className="step-nav-btn" onClick={handlePrev}>
                  &lt;
                </button>
                <span className="step-nav-label" onClick={handleGoLive}>
                  {currentStep < 0 
                    ? 'LIVE' 
                    : `Cell ${currentStep + 1} / ${stepHistory.length}`}
                </span>
                <button className="step-nav-btn" onClick={handleNext}>
                  &gt;
                </button>
              </div>
            )}
          </div>

          <div className="cell-viewer-area">
            <CellViewer sensingPoints={currentSensingPoints} thresholds={thresholds} debugLevel={debugLevel} />
          </div>

          <div className="controls-area">
            <ConnectionPanel
              connectionState={connectionState}
              debugLevel={debugLevel}
              onConnect={connect}
              onDisconnect={disconnect}
              onStartSolve={handleStartSolve}
              isSupported={isSupported}
            />

            <div className="panels-row">
              <InfoPanel
                mazeState={displayState}
                timeoutWarning={timeoutWarning}
                debugLevel={debugLevel}
                thresholds={thresholds}
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
