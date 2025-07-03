import React, { useEffect, useRef } from 'react';
import './AdBanner.css';

const PLACEHOLDER_SLOTS = [
  '',
  undefined,
  null,
  'YOUR_TOP_AD_SLOT',
  'YOUR_SIDEBAR_AD_SLOT',
  'YOUR_BOTTOM_AD_SLOT',
];

const AdBanner = ({ adSlot, adFormat = 'auto', style = {} }) => {
  const adRef = useRef(null);

  useEffect(() => {
    const loadAd = () => {
      if (!adRef.current) return;

      // Check if container has dimensions
      const rect = adRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        // Retry after a short delay if container has no dimensions
        setTimeout(loadAd, 100);
        return;
      }

      // Check if AdSense is available
      if (window.adsbygoogle) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (error) {
          console.error('AdSense error:', error);
        }
      } else {
        // Wait for AdSense to load
        setTimeout(loadAd, 500);
      }
    };

    loadAd();

    // Cleanup
    return () => {
      // Cleanup if needed
    };
  }, [adSlot, adFormat]);

  if (PLACEHOLDER_SLOTS.includes(adSlot)) return null;

  return (
    <div className="ad-banner" style={style}>
      <ins
        ref={adRef}
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