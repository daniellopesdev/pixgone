import React, { useEffect } from 'react';
import './AdBanner.css';

const AdBanner = ({ adSlot, adFormat = 'auto', style = {} }) => {
  useEffect(() => {
    // Load AdSense script if not already loaded
    if (window.adsbygoogle) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error('AdSense error:', error);
      }
    }
  }, []);

  return (
    <div className="ad-banner" style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-5880272751774844"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdBanner; 