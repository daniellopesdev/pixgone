# 🎨 Pixgone - AI-Powered Background Removal

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Now-blue?style=for-the-badge)](https://your-frontend-url.railway.app)
[![Support Project](https://img.shields.io/badge/☕_Support_Project-Ko--fi-orange?style=for-the-badge)](https://ko-fi.com/daniellopesdev)
[![GitHub Stars](https://img.shields.io/github/stars/daniellopesdev/pixgone?style=for-the-badge&logo=github)](https://github.com/daniellopesdev/pixgone/stargazers)

> **🚀 Professional-grade AI background removal using ORMBG. Free, fast, and transparent. No signups, no watermarks, just results.**

![Pixgone Banner](public/logoPix.png)

## 🌟 Why Pixgone?

Unlike expensive subscription services, Pixgone is **completely free** and **open source**. We believe in transparency - you can see exactly how your images are processed and what it costs to run the service.

### 🎯 **Perfect For:**
- 📸 **Content Creators** - Clean product photos, social media content
- 🎨 **Designers** - Quick mockups, design assets
- 🏢 **Small Businesses** - Professional product catalogs
- 👩‍💻 **Developers** - Learning AI implementation, contributing to open source
- 🎓 **Students** - Free alternative to expensive tools

## ✨ Features Overview

### 🤖 **ORMBG AI Model**
Powered by **ORMBG** (Omni-Relational Multi-scale Background Generation) - a state-of-the-art background removal model:
- **Fast Processing** - Optimized for speed and accuracy
- **High Quality** - Professional-grade results
- **Reliable** - Consistent performance across different image types
- **GPU Accelerated** - Enhanced performance with CUDA support

### 🚀 **Core Features**
- ⚡ **Instant Processing** - Server-side AI with GPU acceleration
- 💯 **100% Free** - No subscriptions, credits, or hidden fees
- 🎨 **Live Preview** - Real-time background color picker
- 📱 **Mobile Responsive** - Works perfectly on all devices
- 🔒 **Privacy First** - Images processed securely, never stored
- 🎬 **Video Support** - Background removal for video files (MP4, WebM)
- 📊 **Cost Transparency** - Real-time server cost monitoring
- 🚫 **AdBlock Detection** - Smart monetization with user experience focus

### 🎨 **User Experience**
- **Drag & Drop Upload** - Intuitive file handling
- **Real-time Progress** - Animated progress with status updates
- **Background Preview** - Test different background colors instantly
- **One-Click Download** - High-quality PNG output
- **Processing Animation** - Engaging waiting experience with humor
- **Error Handling** - Clear feedback and recovery options

### 💰 **Monetization & Transparency**
- **Real-time Cost Display** - See actual server costs via Railway API
- **Easy Donations** - Ko-fi integration for user support
- **GitHub Integration** - Open source credibility and community building
- **AdSense Integration** - Non-intrusive advertising
- **Rate Limiting** - Redis-based fair usage policy

## 🏗️ Technical Architecture

### **Frontend Stack**
```javascript
React 18.3.1          // Modern UI framework
Material-UI Components // Professional design system
CSS3 Animations       // Smooth user interactions
Responsive Design     // Mobile-first approach
PWA Features          // App-like experience
```

### **Backend Stack**
```python
FastAPI              // High-performance async API
Python 3.8+         // Core backend language
ORMBG Model         // AI background removal
GPU Optimization    // CUDA support for faster processing
Redis Rate Limiting // Fair usage enforcement
Railway Deployment  // Cloud hosting platform
```

### **AI Processing**
```python
# ORMBG Model Processing
ORMBG → Professional background removal
GPU acceleration for enhanced performance
Memory-efficient processing
```

### **Infrastructure**
- **Railway Cloud** - Automatic scaling and deployment
- **Redis** - Rate limiting and session management
- **Docker** - Containerized deployment
- **GitHub Actions** - CI/CD pipeline ready
- **Environment Management** - Secure configuration handling

## 🚀 Quick Start Guide

### Option 1: Use Online (Recommended)
Visit the [live demo](https://your-frontend-url.railway.app) - no setup required!

### Option 2: Local Development

#### Prerequisites
- **Node.js 18+** - Frontend development
- **Python 3.8+** - Backend AI processing
- **8GB+ RAM** - For AI model loading
- **GPU (Optional)** - Faster processing with CUDA

#### 🎯 **Frontend Setup**
```bash
# Clone repository
git clone https://github.com/daniellopesdev/pixgone.git
cd pixgone

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm start
# Opens http://localhost:3000
```

#### 🤖 **Backend Setup**
```bash
# Navigate to server directory
cd server

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with Railway credentials (optional)

# Download AI models (first run)
python -c "
from rembg import new_session
new_session('u2net')
new_session('u2net_human_seg')
new_session('isnet-general-use')
print('✅ Models downloaded successfully!')
"

# Start server
python server.py
# API available at http://localhost:9876
```

## 🔧 Configuration Guide

### **Environment Variables**

#### Frontend (.env)
```env
# API Configuration
REACT_APP_API_URL=http://localhost:9876

# Optional: Google AdSense
REACT_APP_ADSENSE_CLIENT=ca-pub-your-id
```

#### Backend (server/.env)
```env
# Railway Cost Monitoring (Optional)
RAILWAY_API_TOKEN=your_railway_api_token_here
RAILWAY_PROJECT_ID=your_railway_project_id_here

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379

# Rate Limiting
DAILY_LIMIT=100
RATE_LIMIT_PER_MINUTE=5
```

### **Railway Setup** 
For detailed Railway deployment with cost monitoring:
📖 **[Complete Railway Setup Guide](RAILWAY_SETUP.md)**

## 🌐 Deployment Options

### 🚄 **Railway (Recommended)**
```bash
# One-click deployment
railway login
railway link
railway up
```

### 🐳 **Docker**
```bash
# Build and run
docker build -t pixgone .
docker run -p 3000:3000 -p 9876:9876 pixgone
```

### ☁️ **Other Platforms**
- **Vercel** - Frontend deployment
- **Heroku** - Full-stack deployment  
- **AWS/GCP** - Enterprise deployment
- **DigitalOcean** - VPS deployment

## 📊 Performance & Optimization

### **Processing Speed**
- **GPU Acceleration** - 3-5x faster with CUDA
- **Model Pre-loading** - Eliminates cold start delays
- **Async Processing** - Non-blocking request handling
- **Memory Management** - Efficient GPU memory usage

### **User Experience**
- **Progress Tracking** - Real-time processing updates
- **Background Tasks** - Non-blocking file processing
- **Error Recovery** - Graceful failure handling
- **Mobile Optimization** - Touch-friendly interface

### **Scalability**
- **Rate Limiting** - Prevents abuse and ensures fair usage
- **Horizontal Scaling** - Railway automatic scaling
- **CDN Ready** - Static asset optimization
- **Database Free** - Stateless architecture

## 🛡️ Security & Privacy

### **Data Protection**
- 🔒 **No Storage** - Images deleted immediately after processing
- 🛡️ **Secure Upload** - Encrypted file transmission
- 🚫 **No Tracking** - Minimal user data collection
- 🔐 **Environment Variables** - Secure credential management

### **Rate Limiting**
- **Daily Limits** - Prevents abuse
- **IP-based Tracking** - Fair usage enforcement
- **Redis Backend** - Fast, reliable limiting
- **Graceful Degradation** - Clear error messages

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### **🐛 Bug Reports**
- Use GitHub Issues
- Include error messages
- Provide steps to reproduce
- Mention your environment

### **✨ Feature Requests**
- Check existing issues first
- Describe the use case
- Consider implementation complexity
- Discuss before coding

### **🔧 Development Process**
```bash
# 1. Fork the repository
git clone https://github.com/yourusername/pixgone.git

# 2. Create feature branch
git checkout -b feature/amazing-feature

# 3. Make changes and test
npm test              # Frontend tests
python -m pytest     # Backend tests

# 4. Commit with clear messages
git commit -m "feat: add amazing feature"

# 5. Push and create PR
git push origin feature/amazing-feature
```

### **📋 Development Guidelines**
- **Code Style** - Follow existing patterns
- **Documentation** - Update README for new features
- **Testing** - Add tests for new functionality
- **Performance** - Consider memory and speed impact

## 📈 Roadmap

### **🎯 Planned Features**
- [ ] **Batch Processing** - Multiple images at once
- [ ] **API Keys** - Premium rate limits
- [ ] **Custom Models** - User-uploaded AI models
- [ ] **Image Enhancement** - Upscaling and filtering
- [ ] **Team Collaboration** - Shared workspaces
- [ ] **Plugin System** - Third-party integrations

### **🔧 Technical Improvements**
- [ ] **WebAssembly** - Client-side processing option
- [ ] **Progressive Web App** - Offline capability
- [ ] **GraphQL API** - More flexible data fetching
- [ ] **Microservices** - Improved scalability
- [ ] **Monitoring** - Advanced analytics
- [ ] **Caching** - Improved performance

## 📚 API Documentation

### **POST /remove_background/**
Remove background from an image using ORMBG.

```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('method', 'ormbg');

fetch('/remove_background/', {
    method: 'POST',
    body: formData
})
.then(response => response.blob())
.then(blob => {
    // Process result image
});
```

### **GET /railway-costs**
Get current server costs (if configured).

```javascript
fetch('/railway-costs')
.then(response => response.json())
.then(data => {
    console.log('Monthly cost:', data.costs.total_cost);
});
```

### **POST /remove_background_video/**
Process video files for background removal.

```javascript
const formData = new FormData();
formData.append('file', videoFile);
formData.append('method', 'ormbg');

fetch('/remove_background_video/', {
    method: 'POST',
    body: formData
})
.then(response => response.json())
.then(data => {
    // Poll /status/{video_id} for progress
});
```

## 💡 Use Cases & Examples

### **🛍️ E-commerce**
- Product photography
- Catalog image consistency
- Marketing material creation
- Social media content

### **👨‍💼 Professional**
- LinkedIn profile photos
- Corporate headshots
- Presentation graphics
- Website imagery

### **🎨 Creative Projects**
- Digital art composition
- Photo manipulation
- Design mockups
- Creative portfolios

### **📚 Educational**
- Learning AI implementation
- Computer vision projects
- Open source contribution
- Full-stack development

## ⚡ Performance Benchmarks

| Model | Average Speed | Quality | Best For |
|-------|---------------|---------|----------|
| ORMBG | 1.8s | ⭐⭐⭐⭐ | Portraits |

*Benchmarks on Railway Pro plan with GPU acceleration*

## 🔗 Links & Resources

### **🌐 Live Services**
- [🎨 Live Demo](https://your-frontend-url.railway.app) - Try it now
- [📊 API Status](https://your-backend-url.railway.app/docs) - OpenAPI docs
- [💰 Cost Monitor](https://your-frontend-url.railway.app) - Real-time costs

### **📖 Documentation**
- [🚄 Railway Setup Guide](RAILWAY_SETUP.md) - Deployment guide
- [🔧 API Documentation](https://your-backend-url.railway.app/docs) - Technical reference
- [🐛 Issues](https://github.com/daniellopesdev/pixgone/issues) - Bug reports & features

### **💬 Community**
- [💝 Support Project](https://ko-fi.com/daniellopesdev) - Buy me a coffee
- [⭐ GitHub](https://github.com/daniellopesdev/pixgone) - Star the repository
- [🐦 Twitter](https://twitter.com/daniellopesdev) - Follow for updates

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

```
MIT License - Feel free to:
✅ Use for commercial projects
✅ Modify and distribute
✅ Private use
✅ Include in proprietary software
```

## ☕ Support the Project

If Pixgone has helped you, consider supporting its development:

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/daniellopesdev)

**Why support?**
- 💰 Helps cover server costs (transparent pricing shown in app)
- 🚀 Enables new features and improvements
- 🌟 Shows appreciation for open source work
- 🤝 Supports the developer community

## 🙏 Acknowledgments

- **Railway** - Excellent deployment platform
- **ORMBG Team** - Background removal model
- **React Team** - Amazing frontend framework
- **FastAPI** - Incredible Python web framework

---

<div align="center">

**Made with ❤️ by [Daniel Lopes](https://github.com/daniellopesdev)**

⭐ **Star this repository** if you found it helpful!

[Live Demo](https://your-frontend-url.railway.app) • [Documentation](RAILWAY_SETUP.md) • [Issues](https://github.com/daniellopesdev/pixgone/issues) • [Support](https://ko-fi.com/daniellopesdev)

</div>
