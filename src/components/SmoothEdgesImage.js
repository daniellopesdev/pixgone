import React, { useRef, useEffect, useState } from 'react';

// Utility to process the image and erase a border around the alpha edge
function eraseAlphaEdge(image, edgeWidth = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imgData;

  // Helper to check if a pixel is on the edge of alpha
  function isEdge(x, y) {
    const idx = (y * width + x) * 4 + 3;
    if (data[idx] === 0) return false; // transparent
    // Check 8 neighbors for transparency
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nidx = (ny * width + nx) * 4 + 3;
        if (data[nidx] === 0) return true;
      }
    }
    return false;
  }

  // Mark edge pixels
  const edgeMask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isEdge(x, y)) edgeMask[y * width + x] = 1;
    }
  }

  // Expand edge by edgeWidth using a simple dilation
  for (let pass = 1; pass < edgeWidth; pass++) {
    const newMask = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (edgeMask[y * width + x]) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
              newMask[ny * width + nx] = 1;
            }
          }
        }
      }
    }
    for (let i = 0; i < edgeMask.length; i++) edgeMask[i] = edgeMask[i] || newMask[i];
  }

  // Erase edge pixels (set alpha to 0)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (edgeMask[y * width + x]) {
        const idx = (y * width + x) * 4 + 3;
        data[idx] = 0;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

const SmoothEdgesImage = ({ src, blurRadius = 2, edgeWidth = 2, style = {}, ...rest }) => {
  const [processedSrc, setProcessedSrc] = useState(null);
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      setImgDims({ width: img.width, height: img.height });
      setProcessedSrc(eraseAlphaEdge(img, edgeWidth));
    };
    img.src = src;
  }, [src, edgeWidth]);

  if (!src || !processedSrc) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style, width: imgDims.width, height: imgDims.height }}>
      {/* Blurred clone */}
      <img
        src={src}
        alt="Blurred background"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: imgDims.width,
          height: imgDims.height,
          filter: `blur(${blurRadius}px)`,
          zIndex: 0,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        draggable={false}
      />
      {/* Top image with erased edge */}
      <img
        src={processedSrc}
        alt="Smooth edges"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: imgDims.width,
          height: imgDims.height,
          zIndex: 1,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        draggable={false}
        {...rest}
      />
    </div>
  );
};

export default SmoothEdgesImage; 