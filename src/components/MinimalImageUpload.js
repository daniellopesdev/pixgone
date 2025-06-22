import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  useTheme,
  CircularProgress,
  Paper,
  Fade,
  Slide,
  alpha,
  Container,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import axios from 'axios';
import { ResponsiveAd, BannerAd } from './AdBanner';

const MinimalImageUpload = ({ showErrorToast }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalFilename, setOriginalFilename] = useState('');
  const [processedFile, setProcessedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  const theme = useTheme();
  const dropZoneRef = useRef(null);
  const fileInputRef = useRef(null);

  // Use environment variable for API URL (for production deployment)
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:9876';
  
  // Ensure HTTPS for Railway production
  const getSecureURL = (url) => {
    if (url.includes('railway.app') && url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    return url;
  };

  const processFile = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('method', 'ormbg');
    
    try {
      const secureURL = getSecureURL(API_URL);
      const response = await axios.post(`${secureURL}/remove_background/`, formData, {
        responseType: 'blob',
        withCredentials: false,
      });

      if (response) {
        const fileUrl = URL.createObjectURL(response.data);
        return fileUrl;
      }
    } catch (error) {
      console.error('Error processing image:', error);
      showErrorToast('Error processing image. Please try again.');
    }
    return null;
  }, [showErrorToast, API_URL]);

  const handleFileUpload = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showErrorToast('Please select a valid image file');
      return;
    }

    setSelectedFile(URL.createObjectURL(file));
    setOriginalFilename(file.name);
    setProcessedFile(null);
    setProcessing(true);
    
    try {
      const result = await processFile(file);
      setProcessedFile(result);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setProcessing(false);
    }
  }, [processFile, showErrorToast]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDownload = () => {
    if (!processedFile) return;
    
    const link = document.createElement('a');
    link.href = processedFile;
    link.download = `${originalFilename.split('.')[0]}_pixgone.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setProcessedFile(null);
    setOriginalFilename('');
    setProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Top Banner Ad */}
      <ResponsiveAd slot="TOP_BANNER_SLOT" />
      
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography 
          variant="h2" 
          component="h1" 
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
            fontSize: { xs: '2.5rem', md: '3.5rem' }
          }}
        >
          PixGone
        </Typography>
        <Typography 
          variant="h5" 
          color="text.secondary" 
          sx={{ 
            fontWeight: 300,
            mb: 2,
            fontSize: { xs: '1.1rem', md: '1.3rem' }
          }}
        >
          Free AI Background Removal Tool
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ 
            maxWidth: 600,
            mx: 'auto',
            mb: 3
          }}
        >
          Remove backgrounds from your images instantly with our AI-powered tool. 
          Perfect for e-commerce, social media, and professional photography.
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        {/* Upload Area */}
        {!selectedFile && (
          <Fade in={!selectedFile}>
            <Paper
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: `3px dashed ${dragOver ? theme.palette.primary.main : theme.palette.divider}`,
                borderRadius: 4,
                p: { xs: 4, md: 8 },
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: dragOver 
                  ? alpha(theme.palette.primary.main, 0.04)
                  : alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                }
              }}
            >
              <CloudUploadIcon 
                sx={{ 
                  fontSize: { xs: 64, md: 80 }, 
                  color: theme.palette.primary.main,
                  mb: 3,
                  opacity: 0.8
                }} 
              />
              <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
                {dragOver ? 'Drop your image here' : 'Upload Your Image'}
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                Drag & drop or click to select
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supports PNG, JPG, JPEG • Max 10MB
              </Typography>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </Paper>
          </Fade>
        )}

        {/* Processing/Results Area */}
        {selectedFile && (
          <Slide direction="up" in={Boolean(selectedFile)}>
            <Box>
              <Paper 
                sx={{ 
                  borderRadius: 4, 
                  overflow: 'hidden',
                  boxShadow: theme.shadows[8]
                }}
              >
                {/* Image Comparison */}
                <Box sx={{ p: 3 }}>
                  <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
                    {processing ? 'Processing Your Image...' : 'Background Removed!'}
                  </Typography>
                  
                  <Box 
                    sx={{ 
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                      gap: 3,
                      mb: 3
                    }}
                  >
                    {/* Original Image */}
                    <Box>
                      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                        Original
                      </Typography>
                      <Paper
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          background: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                          backgroundSize: '20px 20px',
                          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                        }}
                      >
                        <img
                          src={selectedFile}
                          alt="Original"
                          style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: '300px',
                            objectFit: 'contain',
                            borderRadius: '8px'
                          }}
                        />
                      </Paper>
                    </Box>

                    {/* Processed Image */}
                    <Box>
                      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                        Background Removed
                      </Typography>
                      <Paper
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          background: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                          backgroundSize: '20px 20px',
                          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '200px'
                        }}
                      >
                        {processing ? (
                          <Box sx={{ textAlign: 'center' }}>
                            <CircularProgress size={48} sx={{ mb: 2 }} />
                            <Typography variant="body2" color="text.secondary">
                              AI is removing the background...
                            </Typography>
                          </Box>
                        ) : processedFile ? (
                          <img
                            src={processedFile}
                            alt="Processed"
                            style={{
                              width: '100%',
                              height: 'auto',
                              maxHeight: '300px',
                              objectFit: 'contain',
                              borderRadius: '8px'
                            }}
                          />
                        ) : (
                          <Typography color="text.secondary">
                            Processing failed
                          </Typography>
                        )}
                      </Paper>
                    </Box>
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {processedFile && !processing && (
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownload}
                        sx={{
                          borderRadius: 3,
                          px: 4,
                          py: 1.5,
                          fontWeight: 600,
                          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #1976D2 30%, #0097A7 90%)',
                          }
                        }}
                      >
                        Download PNG
                      </Button>
                    )}
                    
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<RestartAltIcon />}
                      onClick={resetUpload}
                      sx={{
                        borderRadius: 3,
                        px: 4,
                        py: 1.5,
                        fontWeight: 600
                      }}
                    >
                      Upload New Image
                    </Button>
                  </Box>
                </Box>
              </Paper>

              {/* Middle Banner Ad */}
              <Box sx={{ my: 4 }}>
                <BannerAd slot="MIDDLE_BANNER_SLOT" />
              </Box>
            </Box>
          </Slide>
        )}

        {/* Features Section */}
        <Box sx={{ mt: 6, mb: 4 }}>
          <Typography variant="h4" sx={{ textAlign: 'center', mb: 4, fontWeight: 600 }}>
            Why Choose PixGone?
          </Typography>
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 3
            }}
          >
            <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
              <AutoFixHighIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                AI-Powered
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Advanced AI algorithms for precise background removal
              </Typography>
            </Paper>
            
            <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
              <CloudUploadIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                100% Free
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No watermarks, no limits, no signup required
              </Typography>
            </Paper>
            
            <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
              <DownloadIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                Instant Results
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Get your processed image in seconds
              </Typography>
            </Paper>
          </Box>
        </Box>

        {/* Bottom Banner Ad */}
        <ResponsiveAd slot="BOTTOM_BANNER_SLOT" />
      </Box>
    </Container>
  );
};

export default MinimalImageUpload; 