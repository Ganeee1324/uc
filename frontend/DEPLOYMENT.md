# Frontend Deployment Guide

## 🚀 Quick Deploy Options

### 1. GitHub Pages (Recommended)
```bash
# Push to GitHub
git push origin main

# Enable GitHub Pages:
# 1. Go to repository Settings
# 2. Scroll to "Pages" section
# 3. Select "Deploy from a branch"
# 4. Choose "main" branch and "/ (root)" folder
# 5. Save
```

### 2. Netlify
```bash
# Option A: Drag & Drop
# 1. Go to netlify.com
# 2. Drag the frontend folder to the deploy area

# Option B: Git Integration
# 1. Connect your GitHub repository
# 2. Set build command: (leave empty for static site)
# 3. Set publish directory: frontend
```

### 3. Vercel
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
cd frontend
vercel

# 3. Follow prompts
```

## ⚙️ Configuration

### Update Backend URL
Before deploying, update the backend URL in `js/config.js`:

```javascript
production: {
    API_BASE: 'https://your-backend-domain.com' // Update this
}
```

### CORS Setup
Ensure your backend allows requests from your frontend domain:

```python
# In your Flask backend
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=[
    "https://your-frontend-domain.com",
    "http://localhost:3000"  # For development
])
```

## 📁 File Structure
```
frontend/
├── css/
├── js/
│   ├── config.js          # Environment configuration
│   ├── search.js          # Main search functionality
│   ├── vendor-page.js     # Vendor page functionality
│   └── document-preview.js # Document preview
├── images/
├── *.html                 # HTML pages
└── DEPLOYMENT.md          # This file
```

## 🔧 Environment Variables
The app automatically detects environment:
- **Development**: Uses `http://146.59.236.26:5000`
- **Production**: Uses the URL in `config.js`

## 🌐 Custom Domain
After deployment, you can add a custom domain in your hosting platform's settings.

## 📱 Testing
1. Deploy to staging first
2. Test all functionality
3. Update backend CORS if needed
4. Deploy to production

## 🚨 Common Issues
- **CORS errors**: Update backend CORS settings
- **404 errors**: Ensure all file paths are correct
- **API errors**: Check backend URL in config.js 