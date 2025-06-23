import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ColorPicker from './components/ColorPicker';
import AdBanner from './components/AdBanner';
import './App.css';

const AdblockModal = ({ open, onClose }) => (
  open ? (
    <div className="adblock-modal-overlay">
      <div className="adblock-modal">
        <div className="adblock-emoji">🦄🚫</div>
        <h2>AdBlock Detected!</h2>
        <p>
          Hey! Please disable your ad blocker to use <b>pixGone</b>.<br />
          We only show a few ads to keep it free<br />
          (and slightly better than some overpriced apps).
        </p>
        <button className="modal-btn" onClick={onClose}>Okay, I'll disable it!</button>
      </div>
    </div>
  ) : null
);

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [showStuckMsg, setShowStuckMsg] = useState(false);
  const [adblockOpen, setAdblockOpen] = useState(false);
  const fileInputRef = useRef(null);
  const progressInterval = useRef(null);
  const stuckTimeout = useRef(null);

  // AdBlock detection
  useEffect(() => {
    setTimeout(() => {
      const ad = document.querySelector('.adsbygoogle');
      if (!ad || ad.offsetHeight === 0) {
        setAdblockOpen(true);
      }
    }, 2000);
  }, []);

  // Progress stuck message
  useEffect(() => {
    if (isProcessing && progress >= 90 && progress < 100) {
      stuckTimeout.current = setTimeout(() => setShowStuckMsg(true), 3000);
    } else {
      setShowStuckMsg(false);
      clearTimeout(stuckTimeout.current);
    }
    return () => clearTimeout(stuckTimeout.current);
  }, [isProcessing, progress]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setError('');
      setProcessedImage(null);
    } else {
      setError('Please select a valid image file.');
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setError('');
      setProcessedImage(null);
    } else {
      setError('Please drop a valid image file.');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const processImage = async () => {
    if (!selectedFile) {
      setError('Please select an image first.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError('');

    // Simulate progress
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) return prev + 2;
        return prev;
      });
    }, 100);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://pixgone-production.up.railway.app'}/remove_background/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setProcessedImage(imageUrl);
      setProgress(100);
    } catch (error) {
      console.error('Error processing image:', error);
      setError('Failed to process image. Please try again.');
      setProgress(0);
    } finally {
      setIsProcessing(false);
      clearInterval(progressInterval.current);
    }
  };

  const downloadImage = () => {
    if (processedImage) {
      const link = document.createElement('a');
      link.href = processedImage;
      link.download = 'pixgone_processed.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetApp = () => {
    setSelectedFile(null);
    setProcessedImage(null);
    setError('');
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="App">
      <AdblockModal open={adblockOpen} onClose={() => setAdblockOpen(false)} />
      <Header />

      <main className="main-content">
        <div className="container">
          <div className="hero-section">
            <h1>Slightly better than some overpriced apps.</h1>
            <p>AI-powered background removal. Free, fast, and easy to use.</p>
          </div>

          {/* Top Ad Space */}
          <AdBanner adSlot="YOUR_TOP_AD_SLOT" />

          <div className="upload-section">
            <div className="upload-area" onDrop={handleDrop} onDragOver={handleDragOver}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="file-input"
              />
              <div className="upload-content">
                <div className="upload-icon">📁</div>
                <p>Drag & drop an image here or click to browse</p>
                <button className="browse-btn" onClick={() => fileInputRef.current?.click()}>
                  Choose File
                </button>
              </div>
            </div>

            {selectedFile && (
              <div className="file-info">
                <p>Selected: {selectedFile.name}</p>
                <button
                  className="process-btn"
                  onClick={processImage}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Remove Background'}
                </button>
              </div>
            )}

            {isProcessing && (
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${progress}%` }} />
                <span className="progress-label">{progress}%</span>

              </div>
            )}

            {showStuckMsg && (
              <div className="progress-stuck-msg">It's still processing, don't worry.</div>
            )}

            {error && <div className="error-message">{error}</div>}
          </div>

          {processedImage && (
            <div className="results-section">
              <div className="image-comparison">
                <div className="image-container">
                  <h3>Original</h3>
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Original"
                    className="preview-image"
                  />
                </div>

                <div className="image-container">
                  <h3>Background Removed</h3>
                  <div
                    className="processed-image-container"
                    style={{ backgroundColor: backgroundColor }}
                  >
                    <img
                      src={processedImage}
                      alt="Processed"
                      className="preview-image"
                    />
                    <ColorPicker
                      onColorChange={setBackgroundColor}
                      currentColor={backgroundColor}
                    />
                  </div>
                </div>
              </div>

              <div className="action-buttons">
                <button className="download-btn" onClick={downloadImage}>
                  Download Image
                </button>
                <button className="reset-btn" onClick={resetApp}>
                  Process Another Image
                </button>
              </div>
            </div>
          )}

          {/* Bottom Ad Space */}
          <AdBanner adSlot="YOUR_BOTTOM_AD_SLOT" />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
