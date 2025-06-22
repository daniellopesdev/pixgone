import React, { useState } from 'react';
import './ColorPicker.css';

const ColorPicker = ({ onColorChange, currentColor }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const presetColors = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
    '#008000', '#ffc0cb', '#a52a2a', '#808080'
  ];

  const handleColorSelect = (color) => {
    onColorChange(color);
    setIsOpen(false);
  };

  const handleCustomColor = (e) => {
    onColorChange(e.target.value);
  };

  return (
    <div className="color-picker-compact">
      <button 
        className="color-picker-button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: currentColor }}
        title="Change background color"
      >
        🎨
      </button>
      
      {isOpen && (
        <div className="color-picker-dropdown">
          <div className="color-picker-header">
            <span>Background Color</span>
            <button 
              className="close-button"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>
          
          <div className="custom-color-section">
            <input
              type="color"
              value={currentColor}
              onChange={handleCustomColor}
              className="color-input"
            />
            <span>Custom</span>
          </div>
          
          <div className="preset-colors">
            {presetColors.map((color, index) => (
              <button
                key={index}
                className="color-option"
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker; 