import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ColorPicker from './components/ColorPicker';
import AdBanner from './components/AdBanner';
import CostMonitor from './components/CostMonitor';
import './App.css';

const AdblockModal = ({ open }) => (
  open ? (
    <div className="adblock-modal-overlay" id="adblock-overlay">
      <div className="adblock-modal" id="adblock-modal">
        <div className="adblock-emoji">🦄🚫</div>
        <h2>AdBlock Detected!</h2>
        <p>
          Hey! Please disable your ad blocker to use <b>pixGone</b>.<br />
          We only show a few ads to keep it free.<br />
          <small>Refresh the page after disabling AdBlock.</small>
        </p>
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
  const [adblockDetected, setAdblockDetected] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [rateLimitError, setRateLimitError] = useState(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const fileInputRef = useRef(null);
  const progressInterval = useRef(null);
  const stuckTimeout = useRef(null);
  const detectionInterval = useRef(null);
  const mutationObserver = useRef(null);

  // Funny waiting messages
  const waitingMessages = [
    "🎭 Teaching pixels to disappear like magic...",
    "🔮 Consulting with the background removal wizards...",
    "🚀 Launching pixels into the void...",
    "🎨 AI is having an artistic moment...",
    "🤖 Robots are arguing about which pixels to keep...",
    "☕ AI is taking a coffee break... just kidding, still working!",
    "🎪 Performing digital circus tricks...",
    "🧙‍♂️ Casting background removal spells...",
    "🎯 Playing hide and seek with backgrounds...",
    "🌪️ Creating a pixel tornado...",
    "🎮 AI is in the zone, please don't disturb...",
    "🍕 Better than waiting for pizza delivery!",
    "🎪 The pixels are doing backflips...",
    "🚁 Sending backgrounds to another dimension...",
    "🎨 Pablo Pic-AI-so is working on your image...",
    "🔍 Looking for backgrounds... none found!",
    "🎭 Backgrounds are staging a dramatic exit...",
    "🌊 Surfing through layers of pixels...",
    "🎪 The greatest pixel show on earth!",
    "🤹‍♂️ Juggling millions of pixels...",
    "🎬 Directing the great background escape...",
    "🔥 Making backgrounds vanish faster than your motivation on Monday!",
    "🎯 Precision pixel removal in progress...",
    "🌈 Creating transparency magic...",
    "🎪 The AI circus is in town!"
  ];

  // Enhanced AdBlock detection with multiple methods
  useEffect(() => {
    let detectionAttempts = 0;
    const maxAttempts = 5;
    
    // Add protection against console manipulation
    const protectConsole = () => {
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;
      
      console.log = console.warn = console.error = function() {
        if (arguments[0] && typeof arguments[0] === 'string' && 
            (arguments[0].includes('adblock') || arguments[0].includes('AdBlock'))) {
          return;
        }
        return originalLog.apply(console, arguments);
      };
    };

    // Prevent right-click and F12 on adblock modal
    const preventDevTools = (e) => {
      const target = e.target;
      const isAdblockElement = target.closest('#adblock-overlay') || target.closest('#adblock-modal');
      
      if (isAdblockElement) {
        // Prevent right-click
        if (e.type === 'contextmenu') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        
        // Prevent F12, Ctrl+Shift+I, Ctrl+U, etc.
        if (e.type === 'keydown') {
          if (e.key === 'F12' || 
              (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) ||
              (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }
      }
    };

    // Create bait element for AdBlock detection
    const createBaitElement = () => {
      const bait = document.createElement('div');
      bait.className = 'adsbox ad-banner-top advertisement ads';
      bait.style.position = 'absolute';
      bait.style.left = '-9999px';
      bait.style.height = '1px';
      bait.style.width = '1px';
      bait.innerHTML = '<img src="http://googleads.g.doubleclick.net/pagead/ads" width="1" height="1">';
      document.body.appendChild(bait);
      return bait;
    };

    // Multiple detection methods
    const detectAdBlock = () => {
      detectionAttempts++;
      let adBlockDetected = false;

      try {
        // Method 1: Check for AdSense script and visibility
        const adScript = document.querySelector('script[src*="adsbygoogle.js"]');
        const adElements = document.querySelectorAll('.adsbygoogle');
        const adVisible = Array.from(adElements).some(el => el.offsetHeight > 0 && el.offsetWidth > 0);
        
        // Method 2: Bait element detection
        const baitElement = createBaitElement();
        setTimeout(() => {
          const baitBlocked = baitElement.offsetHeight === 0 || 
                            window.getComputedStyle(baitElement).display === 'none' ||
                            window.getComputedStyle(baitElement).visibility === 'hidden';
          
          // Method 3: Check for common AdBlock signatures
          const adBlockSignatures = [
            () => typeof window.uBlock !== 'undefined',
            () => typeof window.adblockDetector !== 'undefined',
            () => document.querySelector('[id*="adblock"]') !== null,
            () => document.querySelector('[class*="adblock"]') !== null
          ];

          const signatureDetected = adBlockSignatures.some(check => {
            try { return check(); } catch { return false; }
          });

          if (baitElement.parentNode) {
            baitElement.parentNode.removeChild(baitElement);
          }

          // Determine if AdBlock is active
          adBlockDetected = baitBlocked || signatureDetected || (!adScript || !adVisible);

          if (adBlockDetected) {
            setAdblockDetected(true);
            setAdblockOpen(true);
            startContinuousMonitoring();
            protectConsole();
            
            // Add event listeners for dev tools prevention
            document.addEventListener('contextmenu', preventDevTools, true);
            document.addEventListener('keydown', preventDevTools, true);
          } else if (detectionAttempts < maxAttempts) {
            setTimeout(detectAdBlock, 2000);
          } else {
            setAdblockDetected(false);
            setAdblockOpen(false);
          }
        }, 100);

      } catch (error) {
        console.log('Detection error:', error);
        if (detectionAttempts < maxAttempts) {
          setTimeout(detectAdBlock, 2000);
        }
      }
    };

    // Start initial detection
    setTimeout(detectAdBlock, 1500);

    return () => {
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
      if (mutationObserver.current) {
        mutationObserver.current.disconnect();
      }
      // Clean up event listeners
      document.removeEventListener('contextmenu', preventDevTools, true);
      document.removeEventListener('keydown', preventDevTools, true);
    };
  }, []);

  // Continuous monitoring to prevent bypass attempts
  const startContinuousMonitoring = () => {
    // Periodic re-detection
    detectionInterval.current = setInterval(() => {
      const overlay = document.getElementById('adblock-overlay');
      const modal = document.getElementById('adblock-modal');
      
      if (!overlay || !modal || overlay.style.display === 'none' || modal.style.display === 'none') {
        setAdblockOpen(true);
        setAdblockDetected(true);
      }
    }, 1000);

    // DOM mutation observer to detect removal attempts
    if ('MutationObserver' in window) {
      mutationObserver.current = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            const overlay = document.getElementById('adblock-overlay');
            if (!overlay && adblockDetected) {
              setTimeout(() => {
                setAdblockOpen(true);
              }, 100);
            }
          }
          
          if (mutation.type === 'attributes') {
            const target = mutation.target;
            if (target.id === 'adblock-overlay' || target.id === 'adblock-modal') {
              if (target.style.display === 'none' || target.style.visibility === 'hidden') {
                setTimeout(() => {
                  target.style.display = '';
                  target.style.visibility = '';
                }, 50);
              }
            }
          }
        });
      });

      mutationObserver.current.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
  };

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
    // Only try to fetch rate limit info if we're not in development
    if (process.env.NODE_ENV === 'production') {
      fetchRateLimitInfo();
    }
  }, []);

  // Rotate through funny messages during processing
  useEffect(() => {
    let messageInterval;
    if (isProcessing) {
      setCurrentMessage(waitingMessages[0]);
      messageInterval = setInterval(() => {
        setCurrentMessage(prev => {
          const currentIndex = waitingMessages.indexOf(prev);
          const nextIndex = (currentIndex + 1) % waitingMessages.length;
          return waitingMessages[nextIndex];
        });
      }, 1500); // Faster rotation - change message every 1.5 seconds
    } else {
      setCurrentMessage('');
    }

    return () => {
      if (messageInterval) {
        clearInterval(messageInterval);
      }
    };
  }, [isProcessing]);

  const fetchRateLimitInfo = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://pixgone-production.up.railway.app'}/rate-limit-info`);
      if (response.ok) {
        const data = await response.json();
        setRateLimitInfo(data);
      } else if (response.status === 404) {
        // Endpoint not available (old server version), hide rate limit info
        console.log("Rate limit info endpoint not available");
        setRateLimitInfo(null);
      }
    } catch (error) {
      console.log("Could not fetch rate limit info:", error);
      setRateLimitInfo(null);
    }
  };

  const handleFileSelect = async (event) => {
    // Block file selection if AdBlock is detected
    if (adblockDetected) {
      event.target.value = '';
      setError('Please disable your ad blocker to use this service.');
      return;
    }

    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      await processImage(file);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    
    // Block file drop if AdBlock is detected
    if (adblockDetected) {
      setError('Please disable your ad blocker to use this service.');
      return;
    }

    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      await processImage(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const processImage = async (file) => {
    // Block processing if AdBlock is detected
    if (adblockDetected) {
      setError('Please disable your ad blocker to use this service.');
      return;
    }

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

    // Enhanced progress simulation
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 70) return prev + 3; // Faster initial progress
        if (prev < 85) return prev + 1; // Slower middle phase
        if (prev < 95) return prev + 0.5; // Very slow final phase
        return prev; // Stop at 95% until completion
      });
    }, 150);

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
      <AdblockModal open={adblockOpen} />
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
                <span>Requests today: {rateLimitInfo.requests_today}/{rateLimitInfo.daily_limit}</span>
                <span>Remaining: {rateLimitInfo.remaining_requests}</span>
                {rateLimitInfo.is_blocked && (
                  <span className="blocked-warning">Your IP is blocked for abuse</span>
                )}
              </div>
            </div>
          )}

          {/* Cost Transparency Section */}
          <div className="transparency-section">
            <CostMonitor />
            <div className="transparency-note">
              <h3>Transparent Pricing</h3>
              <p>
                We believe in full transparency. These are our real server costs for running this AI service.
                Your usage helps cover these expenses and keeps the service free for everyone.
              </p>
              <small>Costs are updated every 5 minutes via Railway's API</small>
            </div>
          </div>

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
                <div className="upload-icon">+</div>
                <p>Drag & drop an image here or click to browse</p>
                <p className="file-info">Max file size: 10MB</p>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <p>{error}</p>
                {rateLimitError && rateLimitError.code === 'DAILY_LIMIT_EXCEEDED' && (
                  <p className="rate-limit-help">
                    Try again tomorrow.
                  </p>
                )}
                {rateLimitError && rateLimitError.code === 'IP_BLOCKED' && (
                  <p className="rate-limit-help">
                    Your IP has been blocked due to excessive usage. Try again tomorrow.
                  </p>
                )}
              </div>
            )}

            {isProcessing && (
              <div className="processing-section minimal">
                <div className="processing-header">
                  <div className="loading-spinner"></div>
                  <h3>Processing Your Image…</h3>
                </div>
                <div className="progress-container minimal">
                  <div className="progress-bar minimal">
                    <div className="progress-fill minimal" style={{ width: `${progress}%` }}></div>
                    <div className="progress-text minimal">{progress}%</div>
                  </div>
                </div>
                <div className="processing-status-message">
                  {progress < 30 && <span className="processing-status-text">Uploading…</span>}
                  {progress >= 30 && progress < 90 && <span className="processing-status-text">AI is working…</span>}
                  {progress >= 90 && progress < 100 && <span className="processing-status-text">Finalizing…</span>}
                  {progress === 100 && <span className="processing-status-text">Done!</span>}
                </div>
                {showStuckMsg && (
                  <div className="stuck-message minimal">
                    <div className="stuck-spinner"></div>
                    <span>Almost there! The AI is putting the finishing touches…</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {processedImage && (
            <div className="results-section">
              <div className="image-comparison">
                <div className="image-container">
                  <h3>Original</h3>
                  {selectedFile && (
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Original"
                      className="preview-image"
                    />
                  )}
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
