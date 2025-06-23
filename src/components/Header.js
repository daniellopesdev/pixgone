import React from 'react';
import './Header.css';
import logoPix from '../logoPix.png';

const Header = () => {
  return (
    <header className="header">
      <div className="header-container">
        <img src={logoPix} alt="pixGone logo" className="logo-img" />
        <span className="logo-text">pixGone</span>
      </div>
    </header>
  );
};

export default Header; 