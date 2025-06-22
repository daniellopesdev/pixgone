import React, { useState, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ColorPicker from './components/ColorPicker';
import MethodSelector from './components/MethodSelector';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [selectedMethod, setSelectedMethod] = useState('ormbg');
  const fileInputRef = useRef(null);

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
    setError('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('method', selectedMethod);

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
    } catch (error) {
      console.error('Error processing image:', error);
      setError('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="App">
      <Header />
      
      <main className="main-content">
        <div className="container">
          <div className="hero-section">
            <h1>Remove Background from Images</h1>
            <p>Professional AI-powered background removal. Free, fast, and easy to use.</p>
          </div>

          {/* Top Ad Space */}
          <div className="ad-section">
            <div className="ad-placeholder">
              <p>Advertisement Space</p>
            </div>
          </div>

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
                <button className="process-btn" onClick={processImage} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Remove Background'}
                </button>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}
          </div>

          {processedImage && (
            <div className="results-section">
              <MethodSelector 
                selectedMethod={selectedMethod}
                onMethodChange={setSelectedMethod}
              />
              
              <ColorPicker 
                onColorChange={setBackgroundColor} 
                currentColor={backgroundColor} 
              />
              
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
          <div className="ad-section">
            <div className="ad-placeholder">
              <p>Advertisement Space</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
