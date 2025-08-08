import React, { useState, useRef, useEffect } from 'react';

const ColorPicker = ({ color, onChange, label, customColors }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localColor, setLocalColor] = useState(color);
  const pickerRef = useRef(null);

  // Common color presets
  const colorPresets = [
    '#0B1F33', '#1A1B2E', '#0F172A', '#2D1B1B', '#0C4A6E', '#1E293B',
    '#1E85F2', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899',
    '#F8EEDB', '#F3F4F6', '#F0FDF4', '#FEF3C7', '#E0F2FE', '#F8FAFC',
    '#9CA3AF', '#64748B', '#86EFAC', '#FCD34D', '#7DD3FC', '#94A3B8'
  ];

  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleColorChange = (newColor) => {
    setLocalColor(newColor);
    onChange(newColor);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setLocalColor(value);
    if (value.match(/^#[0-9A-Fa-f]{6}$/)) {
      onChange(value);
    }
  };

  const handlePresetClick = (presetColor) => {
    handleColorChange(presetColor);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center space-x-4 py-3" ref={pickerRef}>
      <label className="text-sm font-medium min-w-[140px]" style={{ color: customColors.textSecondary }}>
        {label}
      </label>
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div
            className="w-10 h-10 rounded-lg border-2 cursor-pointer transition-all hover:scale-110 shadow-sm"
            style={{ 
              backgroundColor: localColor,
              borderColor: customColors.cardBorder
            }}
            onClick={() => setIsOpen(!isOpen)}
          />
          
          {isOpen && (
            <div 
              className="absolute top-full left-0 mt-3 p-4 rounded-xl border shadow-2xl z-50 min-w-[280px]"
              style={{ 
                backgroundColor: customColors.cardBackground,
                borderColor: customColors.cardBorder,
                opacity: 0.98,
                backdropFilter: 'blur(10px)'
              }}
            >
              <div className="mb-4">
                <label className="block text-xs font-medium mb-2" style={{ color: customColors.textSecondary }}>
                  Hex Color
                </label>
                <input
                  type="text"
                  value={localColor}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono border"
                  style={{ 
                    backgroundColor: customColors.cardBackground,
                    borderColor: customColors.cardBorder,
                    color: customColors.textPrimary
                  }}
                  placeholder="#000000"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-xs font-medium mb-3" style={{ color: customColors.textSecondary }}>
                  Quick Colors
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {colorPresets.map((presetColor) => (
                    <div
                      key={presetColor}
                      className="w-8 h-8 rounded-lg border-2 cursor-pointer transition-all hover:scale-125 shadow-sm"
                      style={{ 
                        backgroundColor: presetColor,
                        borderColor: presetColor === localColor ? customColors.primaryButton : customColors.cardBorder
                      }}
                      onClick={() => handlePresetClick(presetColor)}
                      title={presetColor}
                    />
                  ))}
                </div>
              </div>
              
              <div className="pt-3 border-t" style={{ borderColor: customColors.cardBorder }}>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ 
                      backgroundColor: customColors.cardBorder,
                      color: customColors.textSecondary
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ 
                      backgroundColor: customColors.primaryButton,
                      color: 'white'
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <input
          type="text"
          value={localColor}
          onChange={handleInputChange}
          className="px-3 py-2 rounded-lg text-sm font-mono border min-w-[100px]"
          style={{ 
            backgroundColor: customColors.cardBackground,
            borderColor: customColors.cardBorder,
            color: customColors.textPrimary,
            border: '1px solid'
          }}
          placeholder="#000000"
        />
      </div>
    </div>
  );
};

export default ColorPicker; 