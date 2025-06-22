import React, { useEffect } from 'react';
import { Box } from '@mui/material';

const AdBanner = ({ 
  slot, 
  format = 'auto', 
  responsive = true, 
  style = {},
  className = '',
  adTest = false // Set to true for testing
}) => {
  useEffect(() => {
    try {
      // Only load ads if AdSense is available and not in test mode
      if (window.adsbygoogle && !adTest) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.log('AdSense error:', err);
    }
  }, [adTest]);

  // Don't render ads in development or if no slot provided
  if (process.env.NODE_ENV === 'development' || !slot) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
          border: '2px dashed #ccc',
          borderRadius: 1,
          p: 2,
          m: 1,
          minHeight: format === 'rectangle' ? '250px' : '90px',
          ...style
        }}
        className={className}
      >
        <span style={{ color: '#666', fontSize: '14px' }}>
          AdSense Placeholder - {format}
        </span>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        m: 1,
        ...style
      }}
      className={className}
    >
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          ...style
        }}
        data-ad-client="ca-pub-YOUR_ADSENSE_CLIENT_ID" // Replace with your actual client ID
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive.toString()}
        data-adtest={adTest ? 'on' : 'off'}
      />
    </Box>
  );
};

// Predefined ad components for different formats
export const BannerAd = ({ slot, ...props }) => (
  <AdBanner 
    slot={slot} 
    format="horizontal" 
    style={{ minHeight: '90px', width: '100%' }}
    {...props} 
  />
);

export const RectangleAd = ({ slot, ...props }) => (
  <AdBanner 
    slot={slot} 
    format="rectangle" 
    style={{ minHeight: '250px', width: '300px' }}
    {...props} 
  />
);

export const ResponsiveAd = ({ slot, ...props }) => (
  <AdBanner 
    slot={slot} 
    format="auto" 
    responsive={true}
    style={{ minHeight: '90px', width: '100%' }}
    {...props} 
  />
);

export const SquareAd = ({ slot, ...props }) => (
  <AdBanner 
    slot={slot} 
    format="rectangle" 
    style={{ minHeight: '250px', width: '250px' }}
    {...props} 
  />
);

export default AdBanner; 