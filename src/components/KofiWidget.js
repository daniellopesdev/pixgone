import React, { useEffect } from 'react';

const KofiWidget = () => {
  useEffect(() => {
    // Load Ko-fi widget script
    const script = document.createElement('script');
    script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js';
    script.async = true;
    
    script.onload = () => {
      // Initialize widget after script loads
      if (window.kofiWidgetOverlay) {
        window.kofiWidgetOverlay.draw('daniellopesdev', {
          'type': 'floating-chat',
          'floating-chat.donateButton.text': 'Donate',
          'floating-chat.donateButton.background-color': '#323842',
          'floating-chat.donateButton.text-color': '#fff'
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

  return null; // This component doesn't render anything visible
};

export default KofiWidget; 