import React, { useEffect } from 'react';

const KofiWidgetEnhanced = () => {
  useEffect(() => {
    // Load Ko-fi widget script
    const script = document.createElement('script');
    script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js';
    script.async = true;
    
    script.onload = () => {
      // Initialize widget with enhanced styling
      if (window.kofiWidgetOverlay) {
        window.kofiWidgetOverlay.draw('daniellopesdev', {
          'type': 'floating-chat',
          'floating-chat.donateButton.text': '☕ Support',
          'floating-chat.donateButton.background-color': '#667eea',
          'floating-chat.donateButton.text-color': '#ffffff',
          'floating-chat.donateButton.background-color-hover': '#5a67d8',
          'floating-chat.donateButton.text-color-hover': '#ffffff',
          'floating-chat.donateButton.border-radius': '25px',
          'floating-chat.donateButton.font-size': '14px',
          'floating-chat.donateButton.font-weight': '600',
          'floating-chat.donateButton.padding': '12px 20px',
          'floating-chat.donateButton.box-shadow': '0 4px 12px rgba(102, 126, 234, 0.3)',
          'floating-chat.donateButton.box-shadow-hover': '0 6px 16px rgba(102, 126, 234, 0.4)',
          'floating-chat.donateButton.transition': 'all 0.3s ease'
        });
      }
    };
    
    document.body.appendChild(script);
    
    // Cleanup
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return null;
};

export default KofiWidgetEnhanced; 