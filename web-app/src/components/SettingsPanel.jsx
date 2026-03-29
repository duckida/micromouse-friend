// SettingsPanel Component
// User preferences UI for visualization settings

import React from 'react';
import './SettingsPanel.css';

/**
 * @typedef {Object} Settings
 * @property {boolean} showCosts - Whether to show cost values
 * @property {boolean} showWalls - Whether to show walls
 * @property {string} colorScheme - Color scheme ('default', 'high-contrast', 'dark')
 */

/**
 * @typedef {Object} SettingsPanelProps
 * @property {Settings} settings - Current settings
 * @property {Function} onSettingsChange - Settings change handler
 */

/**
 * Settings panel component
 * @param {SettingsPanelProps} props - Component props
 */
export function SettingsPanel({ settings, onSettingsChange }) {
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
      colorScheme: 'default'
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
      
      <button className="reset-button" onClick={handleReset}>
        Reset to Defaults
      </button>
    </div>
  );
}

export default SettingsPanel;