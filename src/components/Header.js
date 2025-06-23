import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-container">
        <img src={process.env.PUBLIC_URL + '/logoPix.png'} alt="pixGone logo" className="logo-img" />
        <span className="logo-text">pixGone</span>
      </div>
    </header>
  );
};

export default Header; 