import React, { useState, useEffect } from 'react';

const TextSizeSlider = ({ value, onChange, label, min = 10, max = 24, step = 1, customColors }) => {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSliderChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue + 'px');
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const percentage = ((localValue - min) / (max - min)) * 100;

  return (
    <div className="flex items-center space-x-4 py-4">
      <label className="text-sm font-medium min-w-[140px]" style={{ color: customColors.textSecondary }}>
        {label}
      </label>
      
      <div className="flex-1 flex items-center space-x-4">
        {/* Slider */}
        <div className="flex-1 relative">
          <div 
            className="h-2 rounded-full"
            style={{ backgroundColor: customColors.cardBorder }}
          >
            <div
              className="h-2 rounded-full transition-all duration-200"
              style={{ 
                backgroundColor: customColors.primaryButton,
                width: `${percentage}%`
              }}
            />
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={localValue}
              onChange={handleSliderChange}
              onMouseDown={handleMouseDown}
              className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 w-4 h-4 rounded-full border-2 cursor-pointer transition-all hover:scale-125"
              style={{ 
                backgroundColor: customColors.primaryButton,
                borderColor: 'white',
                left: `calc(${percentage}% - 8px)`,
                transform: 'translateY(-50%)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            />
          </div>
          
          {/* Min/Max labels */}
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: customColors.textSecondary }}>
              {min}px
            </span>
            <span className="text-xs" style={{ color: customColors.textSecondary }}>
              {max}px
            </span>
          </div>
        </div>
        
        {/* Value display */}
        <div className="flex items-center space-x-3">
          <div 
            className="px-3 py-2 rounded-lg border min-w-[80px] text-center"
            style={{ 
              backgroundColor: customColors.cardBackground,
              borderColor: customColors.cardBorder,
              color: customColors.textPrimary,
              border: '1px solid',
              fontSize: localValue + 'px'
            }}
          >
            {localValue}px
          </div>
          
          {/* Preview */}
          <div 
            className="px-3 py-2 rounded-lg border min-w-[120px] text-center"
            style={{ 
              backgroundColor: customColors.cardBackground,
              borderColor: customColors.cardBorder,
              color: customColors.textPrimary,
              border: '1px solid',
              fontSize: localValue + 'px'
            }}
          >
            Preview
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextSizeSlider; 