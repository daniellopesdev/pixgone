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
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [rateLimitError, setRateLimitError] = useState(null);
  const fileInputRef = useRef(null);
  const progressInterval = useRef(null);
  const stuckTimeout = useRef(null);

  // AdBlock detection (improved)
  useEffect(() => {
    let attempts = 0;
    let detected = false;
    function checkAdBlock() {
      const adScript = document.querySelector('script[src*="adsbygoogle.js"]');
      const adElements = document.querySelectorAll('.adsbygoogle');
      const adVisible = Array.from(adElements).some(el => el.offsetHeight > 0);
      if (adScript && adVisible) {
        detected = false;
        setAdblockOpen(false);
      } else if (attempts < 3) {
        attempts++;
        setTimeout(checkAdBlock, 1500);
      } else {
        detected = true;
        setAdblockOpen(true);
      }
    }
    setTimeout(checkAdBlock, 1500);
    return () => { detected = true; };
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

  // Fetch rate limit info on component mount
  useEffect(() => {
    fetchRateLimitInfo();
  }, []);

  const fetchRateLimitInfo = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://pixgone-production.up.railway.app'}/rate-limit-info`);
      if (response.ok) {
        const data = await response.json();
        setRateLimitInfo(data);
      }
    } catch (error) {
      console.log("Could not fetch rate limit info:", error);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      await processImage(file);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      await processImage(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const processImage = async (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image file size must be less than 10MB.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError('');
    setRateLimitError(null);
    setProcessedImage(null);

    // Simulate progress
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) return prev + 2;
        return prev;
      });
    }, 100);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://pixgone-production.up.railway.app'}/remove_background/`, {
        method: 'POST',
        body: formData,
      });

      if (response.status === 429) {
        const errorData = await response.json();
        setRateLimitError(errorData);
        setError(`Rate limit exceeded: ${errorData.message}`);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        setError(`Error: ${errorData.detail || 'Failed to process image'}`);
        return;
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setProcessedImage(imageUrl);
      setProgress(100);
      
      // Update rate limit info after successful processing
      await fetchRateLimitInfo();
      
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

          {/* Rate Limit Status */}
          {rateLimitInfo && (
            <div className="rate-limit-status">
              <div className="rate-limit-info">
                <span>📊 Requests today: {rateLimitInfo.requests_today}/{rateLimitInfo.daily_limit}</span>
                <span>🔄 Remaining: {rateLimitInfo.remaining_requests}</span>
                {rateLimitInfo.is_blocked && (
                  <span className="blocked-warning">🚫 Your IP is blocked for abuse</span>
                )}
              </div>
            </div>
          )}

          <div className="upload-section">
            <div className={`upload-area${adblockOpen ? ' blocked' : ''}`} onDrop={adblockOpen ? undefined : handleDrop} onDragOver={adblockOpen ? undefined : handleDragOver} style={adblockOpen ? { pointerEvents: 'none', opacity: 0.5, filter: 'grayscale(0.7)' } : {}}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={adblockOpen ? undefined : handleFileSelect}
                className="file-input"
                disabled={adblockOpen}
              />
              <div className="upload-content">
                <div className="upload-icon">📁</div>
                <p>Drag & drop an image here or click to browse</p>
                <p className="file-info">Max file size: 10MB</p>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <p>{error}</p>
                {rateLimitError && rateLimitError.code === 'DAILY_LIMIT_EXCEEDED' && (
                  <p className="rate-limit-help">
                    💡 Try again tomorrow or consider upgrading for more requests.
                  </p>
                )}
                {rateLimitError && rateLimitError.code === 'IP_BLOCKED' && (
                  <p className="rate-limit-help">
                    💡 Your IP has been blocked due to excessive usage. Please contact support.
                  </p>
                )}
              </div>
            )}

            {isProcessing && (
              <div className="processing-section">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="processing-text">
                  {showStuckMsg ? "Still processing..." : "Processing your image..."}
                </p>
              </div>
            )}
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
                <button className="download-btn" onClick={downloadImage} disabled={adblockOpen} title={adblockOpen ? 'Enable ads to use this feature' : ''}>
                  Download Image
                </button>
                <button className="reset-btn" onClick={resetApp} disabled={adblockOpen} title={adblockOpen ? 'Enable ads to use this feature' : ''}>
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
