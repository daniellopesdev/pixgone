import React, { useRef, useState } from 'react';
import SmoothEdgesImage from './SmoothEdgesImage';
import './SmoothEdgesPreviewSlider.css';

const SmoothEdgesPreviewSlider = ({ src, onClose }) => {
  const containerRef = useRef(null);
  const [sliderX, setSliderX] = useState(0.5); // 0 (left) to 1 (right)
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = (e) => {
    setDragging(true);
  };
  const handleMouseUp = () => setDragging(false);
  const handleMouseMove = (e) => {
    if (!dragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    let x = (e.clientX - rect.left) / rect.width;
    x = Math.max(0, Math.min(1, x));
    setSliderX(x);
  };

  // Touch events for mobile
  const handleTouchMove = (e) => {
    if (!dragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    let x = (e.touches[0].clientX - rect.left) / rect.width;
    x = Math.max(0, Math.min(1, x));
    setSliderX(x);
  };

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, width: '95%' }}>
        <div className="preview-modal-header">
          <h3>Compare Smooth Edges</h3>
          <button className="preview-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div
          className="slider-compare-container"
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          style={{ position: 'relative', width: '100%', height: 400, userSelect: 'none', background: '#f8fafc', borderRadius: 12 }}
        >
          {/* Original image (left side) */}
          <img
            src={src}
            alt="Original"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: 12,
              clipPath: `inset(0 ${100 - sliderX * 100}% 0 0)`
            }}
            draggable={false}
          />
          {/* Smooth Edges (right side) */}
          <SmoothEdgesImage
            src={src}
            blurRadius={2}
            edgeWidth={5}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: 12,
              clipPath: `inset(0 0 0 ${sliderX * 100}%)`
            }}
          />
          {/* Slider handle */}
          <div
            className="slider-handle"
            style={{
              position: 'absolute',
              top: 0,
              left: `${sliderX * 100}%`,
              width: 0,
              height: '100%',
              zIndex: 10,
              cursor: 'ew-resize',
              userSelect: 'none',
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          >
            <div className="slider-bar" style={{
              position: 'absolute',
              left: -8,
              top: 0,
              width: 16,
              height: '100%',
              background: 'rgba(0,0,0,0.15)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                width: 4,
                height: '100%',
                background: '#2563eb',
                borderRadius: 2,
                margin: '0 auto',
              }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 14, color: '#64748b' }}>
          <span>Original</span>
          <span>Smooth Edges</span>
        </div>
      </div>
    </div>
  );
};

export default SmoothEdgesPreviewSlider; 