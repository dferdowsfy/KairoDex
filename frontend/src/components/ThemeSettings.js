import React, { useState, useEffect } from 'react';
import ColorPicker from './ColorPicker';
import TextSizeSlider from './TextSizeSlider';

const ThemeSettings = ({ customColors, setCustomColors, textSizes, setTextSizes, userPreferences, setUserPreferences, onSave, onPasswordChange }) => {
  const [localColors, setLocalColors] = useState(customColors);
  const [localTextSizes, setLocalTextSizes] = useState(textSizes);
  const [localPreferences, setLocalPreferences] = useState(userPreferences);
  const [activeTab, setActiveTab] = useState('themes');
  const [showColorPicker, setShowColorPicker] = useState(null);

  // Preset themes
  const presetThemes = {
    'Dark Blue': {
      background: '#0B1F33',
      cardBackground: 'rgba(255, 255, 255, 0.1)',
      cardBorder: 'rgba(255, 255, 255, 0.2)',
      primaryButton: '#1E85F2',
      secondaryButton: '#10B981',
      textPrimary: '#F8EEDB',
      textSecondary: '#9CA3AF'
    },
    'Dark Purple': {
      background: '#1A1B2E',
      cardBackground: 'rgba(255, 255, 255, 0.08)',
      cardBorder: 'rgba(255, 255, 255, 0.15)',
      primaryButton: '#8B5CF6',
      secondaryButton: '#EC4899',
      textPrimary: '#F3F4F6',
      textSecondary: '#9CA3AF'
    },
    'Dark Green': {
      background: '#0F172A',
      cardBackground: 'rgba(34, 197, 94, 0.1)',
      cardBorder: 'rgba(34, 197, 94, 0.2)',
      primaryButton: '#10B981',
      secondaryButton: '#059669',
      textPrimary: '#F0FDF4',
      textSecondary: '#86EFAC'
    },
    'Light Professional': {
      background: '#F8FAFC',
      cardBackground: 'rgba(255, 255, 255, 0.9)',
      cardBorder: 'rgba(0, 0, 0, 0.1)',
      primaryButton: '#2563EB',
      secondaryButton: '#059669',
      textPrimary: '#1E293B',
      textSecondary: '#64748B'
    },
    'Warm Dark': {
      background: '#2D1B1B',
      cardBackground: 'rgba(255, 255, 255, 0.05)',
      cardBorder: 'rgba(255, 255, 255, 0.1)',
      primaryButton: '#F59E0B',
      secondaryButton: '#D97706',
      textPrimary: '#FEF3C7',
      textSecondary: '#FCD34D'
    },
    'Ocean Blue': {
      background: '#0C4A6E',
      cardBackground: 'rgba(255, 255, 255, 0.1)',
      cardBorder: 'rgba(255, 255, 255, 0.2)',
      primaryButton: '#0EA5E9',
      secondaryButton: '#06B6D4',
      textPrimary: '#E0F2FE',
      textSecondary: '#7DD3FC'
    }
  };

  useEffect(() => {
    setLocalColors(customColors);
    setLocalTextSizes(textSizes);
    setLocalPreferences(userPreferences);
  }, [customColors, textSizes, userPreferences]);

  const applyPresetTheme = (themeName) => {
    const theme = presetThemes[themeName];
    if (theme) {
      setLocalColors(theme);
    }
  };

  const handleColorChange = (colorKey, value) => {
    setLocalColors(prev => ({
      ...prev,
      [colorKey]: value
    }));
  };

  const handleTextSizeChange = (sizeKey, value) => {
    setLocalTextSizes(prev => ({
      ...prev,
      [sizeKey]: value
    }));
  };

  const handlePreferenceChange = (prefKey, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      [prefKey]: value
    }));
  };

  const handleSave = async () => {
    await onSave(localColors, localTextSizes, localPreferences);
  };

  const handleReset = () => {
    setLocalColors(customColors);
    setLocalTextSizes(textSizes);
    setLocalPreferences(userPreferences);
  };



  return (
    <div className="pt-24 pb-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: localColors.textPrimary }}>
            Theme & Settings
          </h1>
          <p className="text-lg" style={{ color: localColors.textSecondary }}>
            Customize your AgentHub experience with themes and preferences
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8">
          {['themes', 'colors', 'text', 'preferences'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 capitalize ${
                activeTab === tab 
                  ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
              style={{ 
                backgroundColor: activeTab === tab ? localColors.primaryButton : 'transparent'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Themes Tab */}
        {activeTab === 'themes' && (
          <div 
            className="backdrop-blur-md rounded-xl border p-6"
            style={{ backgroundColor: localColors.cardBackground, borderColor: localColors.cardBorder }}
          >
            <h3 className="text-xl font-bold mb-6" style={{ color: localColors.textPrimary }}>
              Preset Themes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(presetThemes).map(([themeName, themeColors]) => (
                <div
                  key={themeName}
                  className="p-4 rounded-lg border cursor-pointer transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: themeColors.cardBackground,
                    borderColor: themeColors.cardBorder,
                    border: '2px solid'
                  }}
                  onClick={() => applyPresetTheme(themeName)}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: themeColors.primaryButton }}
                    />
                    <h4 className="font-semibold" style={{ color: themeColors.textPrimary }}>
                      {themeName}
                    </h4>
                  </div>
                  <div className="space-y-2">
                    <div 
                      className="h-3 rounded"
                      style={{ backgroundColor: themeColors.background }}
                    />
                    <div 
                      className="h-2 rounded"
                      style={{ backgroundColor: themeColors.cardBackground }}
                    />
                    <div className="flex space-x-1">
                      <div 
                        className="h-2 flex-1 rounded"
                        style={{ backgroundColor: themeColors.primaryButton }}
                      />
                      <div 
                        className="h-2 flex-1 rounded"
                        style={{ backgroundColor: themeColors.secondaryButton }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Colors Tab */}
        {activeTab === 'colors' && (
          <div 
            className="rounded-xl border p-6 shadow-lg"
            style={{ 
              backgroundColor: localColors.cardBackground, 
              borderColor: localColors.cardBorder,
              opacity: 0.95
            }}
          >
            <h3 className="text-xl font-bold mb-8" style={{ color: localColors.textPrimary }}>
              Custom Colors
            </h3>
            <div className="space-y-8">
              <div>
                <h4 className="font-semibold mb-6" style={{ color: localColors.textPrimary }}>
                  Background Colors
                </h4>
                <div className="space-y-2">
                  <ColorPicker
                    color={localColors.background}
                    onChange={(value) => handleColorChange('background', value)}
                    label="Background"
                    customColors={localColors}
                  />
                  <ColorPicker
                    color={localColors.cardBackground}
                    onChange={(value) => handleColorChange('cardBackground', value)}
                    label="Card Background"
                    customColors={localColors}
                  />
                  <ColorPicker
                    color={localColors.cardBorder}
                    onChange={(value) => handleColorChange('cardBorder', value)}
                    label="Card Border"
                    customColors={localColors}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-6" style={{ color: localColors.textPrimary }}>
                  Text Colors
                </h4>
                <div className="space-y-2">
                  <ColorPicker
                    color={localColors.textPrimary}
                    onChange={(value) => handleColorChange('textPrimary', value)}
                    label="Primary Text"
                    customColors={localColors}
                  />
                  <ColorPicker
                    color={localColors.textSecondary}
                    onChange={(value) => handleColorChange('textSecondary', value)}
                    label="Secondary Text"
                    customColors={localColors}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-6" style={{ color: localColors.textPrimary }}>
                  Button Colors
                </h4>
                <div className="space-y-2">
                  <ColorPicker
                    color={localColors.primaryButton}
                    onChange={(value) => handleColorChange('primaryButton', value)}
                    label="Primary Button"
                    customColors={localColors}
                  />
                  <ColorPicker
                    color={localColors.secondaryButton}
                    onChange={(value) => handleColorChange('secondaryButton', value)}
                    label="Secondary Button"
                    customColors={localColors}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Text Sizes Tab */}
        {activeTab === 'text' && (
          <div 
            className="rounded-xl border p-6 shadow-lg"
            style={{ 
              backgroundColor: localColors.cardBackground, 
              borderColor: localColors.cardBorder,
              opacity: 0.95
            }}
          >
            <h3 className="text-xl font-bold mb-8" style={{ color: localColors.textPrimary }}>
              Text Size Settings
            </h3>
            <div className="space-y-6">
              <TextSizeSlider
                value={parseInt(localTextSizes.emailBody)}
                onChange={(value) => handleTextSizeChange('emailBody', value)}
                label="Email Body Text"
                min={10}
                max={20}
                customColors={localColors}
              />

              <TextSizeSlider
                value={parseInt(localTextSizes.subject)}
                onChange={(value) => handleTextSizeChange('subject', value)}
                label="Subject Line Size"
                min={12}
                max={24}
                customColors={localColors}
              />

              <TextSizeSlider
                value={parseInt(localTextSizes.labels)}
                onChange={(value) => handleTextSizeChange('labels', value)}
                label="Label Text Size"
                min={8}
                max={16}
                customColors={localColors}
              />
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div 
            className="backdrop-blur-md rounded-xl border p-6"
            style={{ backgroundColor: localColors.cardBackground, borderColor: localColors.cardBorder }}
          >
            <h3 className="text-xl font-bold mb-6" style={{ color: localColors.textPrimary }}>
              User Preferences
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold" style={{ color: localColors.textPrimary }}>
                    Auto Save
                  </h4>
                  <p className="text-sm" style={{ color: localColors.textSecondary }}>
                    Automatically save changes as you work
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localPreferences.autoSave}
                    onChange={(e) => handlePreferenceChange('autoSave', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold" style={{ color: localColors.textPrimary }}>
                    Email Notifications
                  </h4>
                  <p className="text-sm" style={{ color: localColors.textSecondary }}>
                    Receive email notifications for important updates
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localPreferences.emailNotifications}
                    onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4 mt-8">
          <button
            onClick={handleSave}
            className="px-6 py-3 rounded-lg font-semibold transition-colors"
            style={{ backgroundColor: localColors.primaryButton, color: 'white' }}
          >
            Save Changes
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 rounded-lg font-semibold transition-colors border"
            style={{ 
              borderColor: localColors.cardBorder,
              color: localColors.textSecondary
            }}
          >
            Reset to Default
          </button>
          {onPasswordChange && (
            <button
              onClick={onPasswordChange}
              className="px-6 py-3 rounded-lg font-semibold transition-colors border"
              style={{ 
                borderColor: localColors.cardBorder,
                color: localColors.textSecondary
              }}
            >
              Change Password
            </button>
          )}
        </div>

        {/* Preview Section */}
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4" style={{ color: localColors.textPrimary }}>
            Live Preview
          </h3>
          <div 
            className="p-6 rounded-xl border"
            style={{ 
              backgroundColor: localColors.cardBackground, 
              borderColor: localColors.cardBorder 
            }}
          >
            <h4 className="font-semibold mb-3" style={{ color: localColors.textPrimary }}>
              Sample Card
            </h4>
            <p className="mb-4" style={{ color: localColors.textSecondary }}>
              This is how your content will look with the current theme settings.
            </p>
            <div className="flex space-x-3">
              <button
                className="px-4 py-2 rounded-lg font-semibold transition-colors"
                style={{ backgroundColor: localColors.primaryButton, color: 'white' }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 rounded-lg font-semibold transition-colors"
                style={{ backgroundColor: localColors.secondaryButton, color: 'white' }}
              >
                Secondary Button
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings; 