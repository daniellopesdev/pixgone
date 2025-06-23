import React from 'react';
import './MethodSelector.css';

const MethodSelector = ({ selectedMethod, onMethodChange }) => {
  return (
    <div className="method-selector">
      <label htmlFor="method-select">Background Removal Method:</label>
      <select
        id="method-select"
        value={selectedMethod}
        onChange={(e) => onMethodChange(e.target.value)}
        className="method-dropdown"
      >
        <option value="">Select a method...</option>
        <option value="ormbg">ormbg (Fast & Reliable)</option>
        <option value="bria_rmbg">Bria RMBG1.4 (High Quality)</option>
      </select>
                  </div>
  );
};

export default MethodSelector;