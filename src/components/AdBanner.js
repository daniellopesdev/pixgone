import React, { useEffect } from 'react';
import { Box, Paper, Typography } from '@mui/material';

const AdBanner = ({ 
  slot, 
  format = 'auto', 
  responsive = true, 
  style = {},
  placeholder = true 
}) => {
  useEffect(() => {
    // Load Google AdSense script
    if (window.adsbygoogle && window.adsbygoogle.push) {
      try {
        window.adsbygoogle.push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }
    }
  }, []);

  // Development placeholder
  if (process.env.NODE_ENV === 'development' && placeholder) {
    return (
      <Paper 
        sx={{ 
          p: 2, 
          textAlign: 'center', 
          backgroundColor: 'rgba(0,0,0,0.05)',
          border: '2px dashed #ccc',
          minHeight: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style 
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Ad Placeholder ({format})
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ textAlign: 'center', ...style }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={process.env.REACT_APP_ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </Box>
  );
};

export default AdBanner; 