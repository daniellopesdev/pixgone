import React from 'react';
import './RecommendedProductBanner.css';

const RecommendedProductBanner = () => (
  <div className="recommended-product-banner">
    <div className="product-image-container">
      <span className="recommended-badge">Recommended</span>
      <img
        src="/product.jpg"
        alt="HUION Inspiroy H640P Drawing Tablet"
        className="product-image"
      />
    </div>
    <div className="product-info">
      <h4 className="product-title">HUION Inspiroy H640P Drawing Tablet</h4>
      <ul className="product-features">
        <li>6x4 inch digital art area</li>
        <li>Battery-free stylus, 8192 pen pressure</li>
        <li>6 customizable hot keys</li>
        <li>Works with Mac, PC & Mobile</li>
        <li>Perfect for drawing, writing, design, teaching</li>
      </ul>
      <a
        href="https://amzn.to/4kpBe8y"
        target="_blank"
        rel="noopener noreferrer"
        className="amazon-affiliate-btn"
      >
        View on Amazon →
      </a>
      <p className="affiliate-disclosure">*Affiliate link. As an Amazon Associate, we earn from qualifying purchases.</p>
    </div>
  </div>
);

export default RecommendedProductBanner; 