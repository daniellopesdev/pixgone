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
        <option value="ormbg">ormbg (Recommended)</option>
        <option value="inspyrenet">InSPyReNet</option>
      </select>
    </div>
  );
};

export default MethodSelector;