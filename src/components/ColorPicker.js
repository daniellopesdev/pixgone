import React, { useState } from 'react';
import './ColorPicker.css';

const ColorPicker = ({ onColorChange, currentColor }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const presetColors = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
    '#008000', '#ffc0cb', '#a52a2a', '#808080', '#ffffff'
  ];

  const handleColorSelect = (color) => {
    onColorChange(color);
    setIsOpen(false);
  };

  const handleCustomColor = (e) => {
    onColorChange(e.target.value);
  };

  return (
    <div className="color-picker">
      <div className="color-picker-header">
        <h3>Background Color</h3>
        <button 
          className="color-picker-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? '▼' : '▲'} Preview Colors
        </button>
      </div>
      
      <div className="current-color-display">
        <div 
          className="color-preview" 
          style={{ backgroundColor: currentColor }}
        ></div>
        <input
          type="color"
          value={currentColor}
          onChange={handleCustomColor}
          className="color-input"
        />
      </div>
      
      {isOpen && (
        <div className="color-picker-panel">
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