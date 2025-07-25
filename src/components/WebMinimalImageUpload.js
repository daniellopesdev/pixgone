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
import axios from 'axios';

const WebMinimalImageUpload = ({ showErrorToast }) => {
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

  const processFile = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('method', 'ormbg');
    
    try {
      const response = await axios.post(`${API_URL}/remove_background/`, formData, {
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
    link.download = `${originalFilename.split('.')[0]}_no_bg.png`;
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
      {/* <AdBanner 
        slot="top-banner"
        format="horizontal"
        style={{ mb: 4 }}
      /> */}

      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
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
            ORMBG
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 300, mb: 2 }}>
            AI-Powered Background Removal
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Remove backgrounds from your images instantly using advanced AI technology. 
            Perfect for e-commerce, social media, and professional photography.
          </Typography>
        </Box>

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
                border: `2px dashed ${dragOver ? theme.palette.primary.main : theme.palette.divider}`,
                borderRadius: 3,
                p: 6,
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
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[4],
                }
              }}
            >
              <CloudUploadIcon 
                sx={{ 
                  fontSize: 64, 
                  color: theme.palette.primary.main,
                  mb: 2,
                  opacity: 0.8
                }} 
              />
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 500 }}>
                {dragOver ? 'Drop your image here' : 'Upload an image'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Drag & drop or click to select • PNG, JPG, JPEG
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Free • No registration required • Instant results
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
                  borderRadius: 3, 
                  overflow: 'hidden',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                }}
              >
                {/* Image Display */}
                <Box sx={{ position: 'relative' }}>
                  {processedFile ? (
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
                      {/* Original */}
                      <Box sx={{ flex: 1, p: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          Original
                        </Typography>
                        <img 
                          src={selectedFile} 
                          alt="Original" 
                          style={{ 
                            width: '100%', 
                            borderRadius: 8,
                            boxShadow: theme.shadows[2]
                          }} 
                        />
                      </Box>
                      
                      {/* Processed */}
                      <Box sx={{ flex: 1, p: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          Background Removed
                        </Typography>
                        <Box 
                          className="checkerboard"
                          sx={{ borderRadius: 2, overflow: 'hidden' }}
                        >
                          <img 
                            src={processedFile} 
                            alt="Processed" 
                            style={{ 
                              width: '100%',
                              display: 'block'
                            }} 
                          />
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <img 
                        src={selectedFile} 
                        alt="Original" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: 400,
                          borderRadius: 8,
                          boxShadow: theme.shadows[2]
                        }} 
                      />
                      
                      {processing && (
                        <Box sx={{ mt: 3 }}>
                          <CircularProgress size={40} thickness={4} />
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Removing background...
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>

                {/* Action Buttons */}
                <Box sx={{ p: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {!processing && !processedFile && (
                      <Button
                        variant="contained"
                        startIcon={<AutoFixHighIcon />}
                        onClick={() => handleFileUpload(selectedFile)}
                        disabled={processing}
                        sx={{
                          borderRadius: 2,
                          px: 4,
                          py: 1.5,
                          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                          boxShadow: theme.shadows[4],
                          '&:hover': {
                            boxShadow: theme.shadows[8],
                            transform: 'translateY(-1px)'
                          }
                        }}
                      >
                        Remove Background
                      </Button>
                    )}
                    
                    {processedFile && (
                      <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownload}
                        sx={{
                          borderRadius: 2,
                          px: 4,
                          py: 1.5,
                          background: 'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)',
                          boxShadow: theme.shadows[4],
                          '&:hover': {
                            boxShadow: theme.shadows[8],
                            transform: 'translateY(-1px)'
                          }
                        }}
                      >
                        Download
                      </Button>
                    )}
                    
                    <Button
                      variant="outlined"
                      onClick={resetUpload}
                      sx={{
                        borderRadius: 2,
                        px: 4,
                        py: 1.5,
                        borderWidth: 2,
                        '&:hover': {
                          borderWidth: 2,
                          transform: 'translateY(-1px)'
                        }
                      }}
                    >
                      Upload New
                    </Button>
                  </Box>
                </Box>
              </Paper>

              {/* Bottom Ad - After Results */}
              {processedFile && (
                <Box sx={{ mt: 4 }}>
                  {/* <AdBanner 
                    slot="bottom-results"
                    format="horizontal"
                  /> */}
                </Box>
              )}
            </Box>
          </Slide>
        )}

        {/* Bottom Banner Ad */}
        <Box sx={{ mt: 6 }}>
          {/* <AdBanner 
            slot="bottom-banner"
            format="horizontal"
          /> */}
        </Box>

        {/* Features Section */}
        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            Why Choose ORMBG?
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>⚡ Lightning Fast</Typography>
              <Typography variant="body2" color="text.secondary">
                Process images in seconds with our optimized AI
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>🎯 Precise Results</Typography>
              <Typography variant="body2" color="text.secondary">
                Advanced edge detection for perfect cutouts
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>🆓 Completely Free</Typography>
              <Typography variant="body2" color="text.secondary">
                No limits, no watermarks, no registration
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default WebMinimalImageUpload; 