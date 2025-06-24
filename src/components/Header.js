import React, { useState, useEffect } from 'react';
import DonateButton from './DonateButton';
import './Header.css';

const Header = () => {
  const [appStatus, setAppStatus] = useState(null);

  useEffect(() => {
    const fetchAppStatus = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://pixgone-production.up.railway.app'}/api/app-status`);
        if (response.ok) {
          const status = await response.json();
          setAppStatus(status);
        }
      } catch (err) {
        console.error('Error fetching app status:', err);
      }
    };

    fetchAppStatus();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAppStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
        </div>

        {/* Navigation Section */}
        <nav className="header-nav">
          <div className="nav-buttons">
            <button 
              className="nav-btn github-btn" 
              onClick={handleGitHub}
              title="View source code"
            >
              <span className="btn-text">GitHub</span>
            </button>
            
            <DonateButton 
              variant="header" 
              size="small" 
              appStatus={appStatus}
              showWhenDisabled={true}
            />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header; 