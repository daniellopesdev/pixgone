import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ColorPicker from './components/ColorPicker';
import AdBanner from './components/AdBanner';
import CostMonitor from './components/CostMonitor';
import DonationStats from './components/DonationStats';
import DonateButton from './components/DonateButton';
import KofiWidgetEnhanced from './components/KofiWidgetEnhanced';
import SmoothEdgesImage from './components/SmoothEdgesImage';
import SmoothEdgesPreviewSlider from './components/SmoothEdgesPreviewSlider';
import './App.css';

const AdblockModal = ({ open, onBypass }) => (
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
        <div className="adblock-actions">
          <button className="bypass-btn" onClick={onBypass}>
            Continue Anyway
          </button>
          <small>Click if you believe this is an error</small>
        </div>
      </div>
    </div>
  ) : null
);

function DonateModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: '90%' }}>
        <div className="preview-modal-header">
          <h3>Support the Project</h3>
          <button className="preview-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <iframe
            title="Ko-fi Donate"
            src="https://ko-fi.com/daniellopesdev/?hidefeed=true&widget=true&embed=true&preview=true"
            style={{ border: 'none', width: '100%', minHeight: 400, maxWidth: 350 }}
            frameBorder="0"
            allowtransparency="true"
          ></iframe>
        </div>
      </div>
    </div>
  );
}

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
  const [showTransparencyInfo, setShowTransparencyInfo] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [currentServerCost, setCurrentServerCost] = useState(0);
  const [donateModalOpen, setDonateModalOpen] = useState(false);
  const [smoothEdges, setSmoothEdges] = useState(false);
  const [showSmoothEdgesPreview, setShowSmoothEdgesPreview] = useState(false);
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

  // Simple and reliable AdBlock detection
  useEffect(() => {
    let detectionTimeout;
    
    const detectAdBlock = () => {
      // Check if user has recently bypassed detection
      const bypassTime = localStorage.getItem('pixgone-adblock-bypass');
      if (bypassTime) {
        const timeSince = Date.now() - parseInt(bypassTime);
        // Bypass lasts for 24 hours
        if (timeSince < 24 * 60 * 60 * 1000) {
          setAdblockDetected(false);
          setAdblockOpen(false);
          console.log('AdBlock detection bypassed - skipping');
          return;
        }
      }

      // Only detect if ads are actually supposed to be there
      const adElements = document.querySelectorAll('.ad-section, .ad-placeholder, [class*="ad-"]');
      
      if (adElements.length === 0) {
        // No ads to check, don't block
        setAdblockDetected(false);
        setAdblockOpen(false);
        return;
      }

      // Create a simple test element
      const testAd = document.createElement('div');
      testAd.className = 'ad-test-element';
      testAd.style.cssText = `
        position: absolute !important;
        left: -9999px !important;
        width: 1px !important;
        height: 1px !important;
        background: url('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7') !important;
      `;
      testAd.innerHTML = '<ins class="adsbygoogle" style="display:block;width:1px;height:1px;"></ins>';
      
      document.body.appendChild(testAd);
      
      // Check after a short delay
      setTimeout(() => {
        const isHidden = testAd.offsetHeight === 0 || 
                       testAd.offsetWidth === 0 ||
                       window.getComputedStyle(testAd).display === 'none' ||
                       window.getComputedStyle(testAd).visibility === 'hidden';
        
        // Also check for common AdBlock indicators
        const hasAdBlockSignatures = (
          typeof window.uBlock !== 'undefined' ||
          typeof window.AdBlocker !== 'undefined' ||
          document.querySelector('.adblock-detected') !== null
        );
        
        // Clean up test element
        if (testAd.parentNode) {
          testAd.parentNode.removeChild(testAd);
        }
        
        // Only block if we have strong evidence
        const shouldBlock = (isHidden && hasAdBlockSignatures) || 
                           (window.location.hostname !== 'localhost' && isHidden);
        
        if (shouldBlock) {
          console.log('AdBlock detected - blocking access');
          setAdblockDetected(true);
          setAdblockOpen(true);
        } else {
          setAdblockDetected(false);
          setAdblockOpen(false);
        }
      }, 200);
    };

    // Only run detection in production or when ads are present
    if (process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost') {
      detectionTimeout = setTimeout(detectAdBlock, 2000);
    } else {
      // In development, don't block
      setAdblockDetected(false);
      setAdblockOpen(false);
    }

    return () => {
      if (detectionTimeout) {
        clearTimeout(detectionTimeout);
      }
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
      if (mutationObserver.current) {
        mutationObserver.current.disconnect();
      }
    };
  }, []);

  // Simplified monitoring - only if actually blocked
  const startContinuousMonitoring = () => {
    detectionInterval.current = setInterval(() => {
      const overlay = document.getElementById('adblock-overlay');
      const modal = document.getElementById('adblock-modal');
      
      if (!overlay || !modal || overlay.style.display === 'none' || modal.style.display === 'none') {
        setAdblockOpen(true);
        setAdblockDetected(true);
      }
    }, 5000); // Check less frequently
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
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      await processImage(file);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    
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

  // Scroll to upload section
  const scrollToUpload = () => {
    const uploadSection = document.querySelector('.upload-workspace, .processing-workspace, .results-workspace');
    if (uploadSection) {
      uploadSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  // Bypass function for false positives
  const bypassAdblockDetection = () => {
    setAdblockDetected(false);
    setAdblockOpen(false);
    localStorage.setItem('pixgone-adblock-bypass', Date.now().toString());
    console.log('AdBlock detection bypassed by user');
  };

  // Image Preview Modal Component
  const ImagePreviewModal = () => (
    showPreviewModal && processedImage ? (
      <div className="preview-modal-overlay" onClick={() => setShowPreviewModal(false)}>
        <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
          <div className="preview-modal-header">
            <h3>Image Preview</h3>
            <button 
              className="preview-close-btn"
              onClick={() => setShowPreviewModal(false)}
            >
              ×
            </button>
          </div>
          
          <div className="preview-content">
            <div className="preview-image-container">
              <div
                className="preview-background"
                style={{ backgroundColor: backgroundColor }}
              >
                <img
                  src={processedImage}
                  alt="Enlarged Preview"
                  className="preview-image"
                />
              </div>
            </div>
            
            <div className="preview-controls">
              <div className="preview-color-section">
                <h4>Test Background Colors</h4>
                <ColorPicker
                  onColorChange={setBackgroundColor}
                  currentColor={backgroundColor}
                />
              </div>
              
              <div className="preview-actions">
                <button className="btn-primary" onClick={downloadImage}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null
  );

  return (
    <div className="App">
      <AdblockModal open={adblockOpen} onBypass={bypassAdblockDetection} />
      <Header onDonateClick={() => setDonateModalOpen(true)} />

      <main className="main-content">
        <div className="container">
          {/* Hero Section */}
          <div className="hero-section">
            <div className="hero-content">
              <h1 className="hero-title">Professional Background Removal</h1>
              <p className="hero-subtitle">Slightly better than some overpriced apps.<br />From the community to the community.</p>
              
              {/* Animated Scroll Button */}
              <button className="hero-cta-btn" onClick={scrollToUpload}>
                <span className="cta-text">Start Removing Backgrounds</span>
              </button>
            </div>
            
            {/* Pixel Grid Animation - Full Hero Coverage */}
            <div className="pixel-grid-animation">
              {Array.from({ length: 144 }, (_, i) => {
                const row = Math.floor(i / 12);
                const col = i % 12;
                const distanceFromCenter = Math.sqrt(Math.pow(row - 5.5, 2) + Math.pow(col - 5.5, 2));
                const waveDelay = distanceFromCenter * 0.15;
                
                return (
                  <div 
                    key={i} 
                    className="pixel" 
                    style={{
                      '--delay': `${waveDelay + Math.random() * 2}s`,
                      '--duration': `${3 + Math.random() * 2}s`,
                      '--intensity': Math.random() > 0.5 ? '1' : '0.6'
                    }}
                  ></div>
                );
              })}
            </div>
          </div>

          {/* Top Ad Space - Strategic placement after hero */}
          <div className="ad-section top-ad">
            <AdBanner adSlot="YOUR_TOP_AD_SLOT" />
          </div>

          {/* Main Content Grid */}
          <div className="main-grid">
            {/* Left Column - Upload/Processing */}
            <div className="upload-column">
              {/* Upload or Processing Area */}
              <div className="main-workspace">
                {!isProcessing && !processedImage ? (
                  /* Upload Area */
                  <div className="upload-workspace" 
                       onDrop={handleDrop} 
                       onDragOver={handleDragOver}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="file-input"
                    />
                    <div className="upload-content">
                      <div className="upload-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17,8 12,3 7,8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                      </div>
                      <h3 className="upload-title">Upload Your Image</h3>
                      <p className="upload-description">Drag & drop an image here or click to browse</p>
                      <div className="upload-specs">
                        <span>• Supports JPG, PNG, WEBP</span>
                        <span>• Max file size: 10MB</span>
                        <span>• Best results with clear subjects</span>
                      </div>
                    </div>

                    {/* Request Info Toggler */}
                    {rateLimitInfo && (
                      <div className="request-toggler">
                        <div className="request-summary">
                          <span className="request-count">{rateLimitInfo.requests_today}/{rateLimitInfo.daily_limit}</span>
                          <span className="request-label">requests today</span>
                          {rateLimitInfo.is_blocked && (
                            <span className="request-blocked">⚠️ Blocked</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : isProcessing ? (
                  /* Processing Area */
                  <div className="processing-workspace">
                    <div className="processing-content">
                      <div className="processing-icon">
                        <div className="processing-spinner"></div>
                      </div>
                      <h3 className="processing-title">Processing Your Image</h3>
                      <p className="processing-description">Our AI is removing the background...</p>
                      
                      <div className="progress-section">
                        <div className="progress-bar-modern">
                          <div className="progress-fill-modern" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="progress-info">
                          <span className="progress-percentage">{progress}%</span>
                          <span className="progress-status">
                            {progress < 30 && "Uploading..."}
                            {progress >= 30 && progress < 90 && "AI is working..."}
                            {progress >= 90 && progress < 100 && "Finalizing..."}
                            {progress === 100 && "Complete!"}
                          </span>
                        </div>
                      </div>

                      {showStuckMsg && (
                        <div className="stuck-message-modern">
                          <div className="stuck-icon">⏳</div>
                          <span>Almost there! Adding finishing touches...</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Results Area */
                  <div className="results-workspace">
                    <div className="image-comparison-modern">
                      <div className="image-card">
                        <h4 className="image-label">Original</h4>
                        {selectedFile && (
                          <div className="image-wrapper">
                            <img
                              src={URL.createObjectURL(selectedFile)}
                              alt="Original"
                              className="comparison-image"
                            />
                          </div>
                        )}
                      </div>

                      <div className="comparison-arrow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9,18 15,12 9,6"/>
                        </svg>
                      </div>

                      <div className="image-card">
                        <h4 className="image-label">Background Removed</h4>
                        <div className="image-wrapper processed">
                          <div className="processed-background" style={{ backgroundColor: backgroundColor }}>
                            {smoothEdges ? (
                              <SmoothEdgesImage src={processedImage} blurRadius={2} edgeWidth={5} />
                            ) : (
                              <img
                                src={processedImage}
                                alt="Processed"
                                className="comparison-image"
                              />
                            )}
                            {/* Enlarge Button Overlay */}
                            <button 
                              className="enlarge-btn"
                              onClick={() => setShowPreviewModal(true)}
                              title="Enlarge and test colors"
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
                                <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                                <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
                                <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                              </svg>
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ marginTop: 8, width: '100%' }}
                              onClick={() => setShowSmoothEdgesPreview(true)}
                            >
                              Compare Smooth Edges
                            </button>
                          </div>
                          <ColorPicker
                            onColorChange={setBackgroundColor}
                            currentColor={backgroundColor}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                      <button className="btn-secondary" onClick={() => setSmoothEdges(v => !v)}>
                        {smoothEdges ? 'Disable Smooth Edges' : 'Enable Smooth Edges'}
                      </button>
                    </div>

                    <div className="action-buttons-modern">
                      <button className="btn-primary" onClick={downloadImage}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15"/>
                          <polyline points="7,10 12,15 17,10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download Image
                      </button>
                      <button className="btn-secondary" onClick={resetApp}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="1,4 1,10 7,10"/>
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                        </svg>
                        Process Another
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Messages */}
                {error && (
                  <div className="error-card">
                    <div className="error-icon">⚠️</div>
                    <div className="error-content">
                      <p className="error-message">{error}</p>
                      {rateLimitError && rateLimitError.code === 'DAILY_LIMIT_EXCEEDED' && (
                        <p className="error-help">Try again tomorrow or contact support.</p>
                      )}
                      {rateLimitError && rateLimitError.code === 'IP_BLOCKED' && (
                        <p className="error-help">Your IP has been blocked. Try again tomorrow.</p>
                      )}
                      {rateLimitError && rateLimitError.code === 'SERVICE_DISABLED' && (
                        <div className="error-help">
                          <p>Service is temporarily disabled due to cost limits.</p>
                          <DonateButton 
                            variant="urgent" 
                            size="small" 
                            showWhenDisabled={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Server Costs & Info */}
            <div className="info-column">
              {/* Community Support & Donation Stats */}
              <DonationStats currentCost={currentServerCost} onDonateClick={() => setDonateModalOpen(true)} />
              
              {/* Server Costs - Aligned Right */}
              <div className="server-costs-card">
                <CostMonitor onTotalCostChange={setCurrentServerCost} />
                
                {/* Transparency Info Toggler */}
                <div className="transparency-toggler">
                  <button 
                    className="transparency-toggle-btn"
                    onClick={() => setShowTransparencyInfo(!showTransparencyInfo)}
                  >
                    <span>Transparency Info</span>
                    <span className={`toggle-icon ${showTransparencyInfo ? 'open' : ''}`}>▼</span>
                  </button>
                  
                  {showTransparencyInfo && (
                    <div className="transparency-info">
                      <h4>Transparent Pricing</h4>
                      <p>
                        We believe in full transparency. These are our real server costs for running this AI service. 
                        Your usage helps cover these expenses and keeps the service free for everyone.
                      </p>
                      <small>Costs updated every 5 minutes via Railway's API</small>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Ad Space */}
              <div className="ad-section sidebar-ad">
                <AdBanner adSlot="YOUR_SIDEBAR_AD_SLOT" />
              </div>
            </div>
          </div>

          {/* Features Section - Highlight Cards */}
          <div className="features-section">
            <h2 className="features-title">Why Choose pixGone?</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🎯</div>
                <h3 className="feature-name">High-Quality AI</h3>
                <p className="feature-description">Advanced background removal with multiple AI models</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <h3 className="feature-name">Privacy Focused</h3>
                <p className="feature-description">No data storage, your images stay private</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💰</div>
                <h3 className="feature-name">Transparent Costs</h3>
                <p className="feature-description">Free to use with full cost transparency</p>
              </div>
            </div>
          </div>

          {/* Ad Spaces */}
          <div className="ad-section bottom-ad">
            <AdBanner adSlot="YOUR_BOTTOM_AD_SLOT" />
          </div>
        </div>
      </main>

      <Footer />

      <ImagePreviewModal />
      
      <DonateModal open={donateModalOpen} onClose={() => setDonateModalOpen(false)} />
      <KofiWidgetEnhanced />

      {showSmoothEdgesPreview && processedImage && (
        <SmoothEdgesPreviewSlider
          src={processedImage}
          onClose={() => setShowSmoothEdgesPreview(false)}
        />
      )}
    </div>
  );
}

export default App;
