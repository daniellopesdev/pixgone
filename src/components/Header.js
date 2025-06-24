import React from 'react';
import CostMonitor from './CostMonitor';
import './Header.css';

const Header = () => {
  const handleDonate = () => {
    // 💰 Ko-fi donation link
    window.open('https://ko-fi.com/daniellopesdev', '_blank', 'noopener,noreferrer');
  };

  const handleGitHub = () => {
    // ⭐ GitHub repository link
    window.open('https://github.com/daniellopesdev/pixgone', '_blank', 'noopener,noreferrer');
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo Section */}
        <div className="logo-section">
          <img src={process.env.PUBLIC_URL + '/logoPix.png'} alt="pixGone logo" className="logo-img" />
          <span className="logo-text">pixGone</span>
        </div>

        {/* Cost Monitor - Compact Version */}
        <div className="header-cost-monitor">
          <CostMonitor compact />
        </div>

        {/* Navigation Section */}
        <nav className="header-nav">
          <div className="nav-buttons">
            <button 
              className="nav-btn github-btn" 
              onClick={handleGitHub}
              title="View source code"
            >
              <span className="btn-icon">⭐</span>
              <span className="btn-text">GitHub</span>
            </button>
            
            <button 
              className="nav-btn donate-btn" 
              onClick={handleDonate}
              title="Support this project"
            >
              <span className="btn-icon">☕</span>
              <span className="btn-text">Donate</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header; 