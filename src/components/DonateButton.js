import React from 'react';
import './DonateButton.css';

const DonateButton = ({ 
  variant = 'default', 
  size = 'medium', 
  showWhenDisabled = true,
  appStatus = null,
  className = '',
  buttonTextOverride = null,
  onClick = null
}) => {
  // Don't show button if app is disabled and showWhenDisabled is false
  if (appStatus && !appStatus.enabled && !showWhenDisabled) {
    return null;
  }

  const buttonClass = `donate-button donate-button--${variant} donate-button--${size} ${className}`;
  
  const getButtonText = () => {
    if (buttonTextOverride) return buttonTextOverride;
    if (appStatus && !appStatus.enabled) {
      return 'Keep It Running';
    }
    switch (variant) {
      case 'hero':
        return 'Support the Project';
      case 'header':
        return 'Donate';
      case 'sidebar':
        return 'Support';
      case 'urgent':
        return 'Support Now';
      default:
        return 'Donate';
    }
  };

  const getButtonStyle = () => {
    if (appStatus && !appStatus.enabled) {
      return {
        background: '#dc2626',
        animation: 'pulse 2s infinite'
      };
    }
    return {};
  };

  if (onClick) {
    return (
      <button
        type="button"
        className={buttonClass}
        style={getButtonStyle()}
        title={appStatus && !appStatus.enabled ? 'Service is disabled - help keep it running!' : 'Support the project'}
        onClick={onClick}
      >
        {getButtonText()}
      </button>
    );
  }

  return (
    <a 
      href="https://ko-fi.com/daniellopesdev" 
      target="_blank" 
      rel="noopener noreferrer"
      className={buttonClass}
      style={getButtonStyle()}
      title={appStatus && !appStatus.enabled ? 'Service is disabled - help keep it running!' : 'Support the project'}
    >
      {getButtonText()}
    </a>
  );
};

export default DonateButton; 