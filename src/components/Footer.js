import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>PixGone</h3>
            <p>Professional background removal made simple and free.</p>
          </div>
          
          <div className="footer-section">
            <h4>Features</h4>
            <ul>
              <li>AI Background Removal</li>
              <li>Multiple Background Colors</li>
              <li>High Quality Output</li>
              <li>Free to Use</li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2025 PixGone. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 