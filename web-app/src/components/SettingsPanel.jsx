// SettingsPanel Component
// User preferences UI for visualization settings

import React from 'react';
import MazeBackdropUpload from './MazeBackdropUpload.jsx';
import './SettingsPanel.css';

/**
 * @typedef {Object} Settings
 * @property {boolean} showCosts - Whether to show cost values
 * @property {boolean} showWalls - Whether to show walls
 * @property {string} colorScheme - Color scheme ('default', 'high-contrast', 'dark')
 * @property {number} backdropOpacity - Opacity of backdrop image (0-1)
 */

/**
 * @typedef {Object} SettingsPanelProps
 * @property {Settings} settings - Current settings
 * @property {Function} onSettingsChange - Settings change handler
 * @property {string|null} backdropImage - Current backdrop image data URL
 * @property {Function} onBackdropImageUpload - Handler when backdrop image is uploaded
 * @property {Function} onBackdropImageClear - Handler when backdrop image is cleared
 */

/**
 * Settings panel component
 * @param {SettingsPanelProps} props - Component props
 */
export function SettingsPanel({ 
  settings, 
  onSettingsChange, 
  backdropImage, 
  onBackdropImageUpload, 
  onBackdropImageClear 
}) {
  const handleToggle = (key) => {
    onSettingsChange({
      ...settings,
      [key]: !settings[key]
    });
  };

  const handleColorSchemeChange = (e) => {
    onSettingsChange({
      ...settings,
      colorScheme: e.target.value
    });
  };

  const handleReset = () => {
    onSettingsChange({
      showCosts: true,
      showWalls: true,
      colorScheme: 'default',
      backdropOpacity: 0.5
    });
  };

  const handleBackdropOpacityChange = (e) => {
    const opacity = parseFloat(e.target.value);
    onSettingsChange({
      ...settings,
      backdropOpacity: opacity
    });
  };

  return (
    <div className="settings-panel">
      <h3 className="settings-title">Settings</h3>
      
      <div className="settings-group">
        <label className="setting-item">
          <span className="setting-label">Show Cost Values</span>
          <div className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.showCosts}
              onChange={() => handleToggle('showCosts')}
            />
            <span className="toggle-slider"></span>
          </div>
        </label>
        
        <label className="setting-item">
          <span className="setting-label">Show Walls</span>
          <div className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.showWalls}
              onChange={() => handleToggle('showWalls')}
            />
            <span className="toggle-slider"></span>
          </div>
        </label>
      </div>
      
      <div className="settings-group">
        <label className="setting-item">
          <span className="setting-label">Color Scheme</span>
          <select
            value={settings.colorScheme}
            onChange={handleColorSchemeChange}
            className="color-scheme-select"
          >
            <option value="default">Default</option>
            <option value="high-contrast">High Contrast</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>

      <div className="settings-group">
        <h4 className="settings-subtitle">Backdrop Image</h4>
        <MazeBackdropUpload
          backdropImage={backdropImage}
          onImageUpload={onBackdropImageUpload}
          onImageClear={onBackdropImageClear}
        />
        
        {backdropImage && (
          <div className="backdrop-opacity-control">
            <label className="opacity-label">
              <span className="setting-label">Backdrop Opacity</span>
              <span className="opacity-value">{Math.round((settings.backdropOpacity || 0.5) * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.backdropOpacity || 0.5}
              onChange={handleBackdropOpacityChange}
              className="opacity-slider"
            />
          </div>
        )}
      </div>
      
      <button className="reset-button" onClick={handleReset}>
        Reset to Defaults
      </button>
    </div>
  );
}

export default SettingsPanel;