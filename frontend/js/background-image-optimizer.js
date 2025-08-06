/**
 * BACKGROUND IMAGE OPTIMIZER
 * Eliminates background image loading delays on page refresh
 * Implements aggressive caching and immediate application strategies
 */

class BackgroundImageOptimizer {
    constructor() {
        this.imageUrl = 'images/bg.png';
        this.fallbackGradient = 'linear-gradient(135deg, #9ddafd 0%, #84d0fc 50%, #9ddafd 100%)';
        this.loadingTimeout = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        this.init();
    }

    init() {
        console.log('🎨 Background Image Optimizer initializing...');
        
        // Try multiple loading strategies simultaneously
        this.loadWithMultipleStrategies();
        
        // Set up fallback timeout
        this.setupFallbackTimeout();
        
        // Listen for page visibility changes to reload if needed
        this.setupVisibilityHandler();
    }

    loadWithMultipleStrategies() {
        // Strategy 1: Direct Image object (fastest)
        this.loadWithImageObject();
        
        // Strategy 2: Canvas preloading (for heavy caching)
        this.loadWithCanvas();
        
        // Strategy 3: Hidden img element (browser cache optimization)
        this.loadWithHiddenElement();
        
        // Strategy 4: Fetch API with cache headers
        this.loadWithFetch();
    }

    loadWithImageObject() {
        const img = new Image();
        
        img.onload = () => {
            this.applyBackgroundImage('image-object');
            this.clearFallbackTimeout();
        };
        
        img.onerror = () => {
            console.warn('Background image failed to load via Image object');
            this.handleLoadError();
        };
        
        // Set high priority and cache headers
        img.crossOrigin = 'anonymous';
        img.src = this.imageUrl + '?v=' + this.getCacheVersion();
    }

    loadWithCanvas() {
        // Use canvas for aggressive caching
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            try {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                // Convert to blob for better caching
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    this.cacheImageBlob(url);
                    this.applyBackgroundImage('canvas');
                });
            } catch (error) {
                console.warn('Canvas background loading failed:', error);
            }
        };
        
        img.src = this.imageUrl;
    }

    loadWithHiddenElement() {
        // Create hidden img element for browser cache optimization
        const hiddenImg = document.createElement('img');
        hiddenImg.style.position = 'absolute';
        hiddenImg.style.left = '-9999px';
        hiddenImg.style.top = '-9999px';
        hiddenImg.style.width = '1px';
        hiddenImg.style.height = '1px';
        hiddenImg.style.opacity = '0';
        
        hiddenImg.onload = () => {
            this.applyBackgroundImage('hidden-element');
            document.body.removeChild(hiddenImg);
        };
        
        hiddenImg.onerror = () => {
            if (document.body.contains(hiddenImg)) {
                document.body.removeChild(hiddenImg);
            }
        };
        
        hiddenImg.src = this.imageUrl;
        document.body.appendChild(hiddenImg);
    }

    async loadWithFetch() {
        try {
            const response = await fetch(this.imageUrl, {
                cache: 'force-cache', // Aggressive caching
                priority: 'high'
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                this.cacheImageBlob(url);
                this.applyBackgroundImage('fetch');
            }
        } catch (error) {
            console.warn('Fetch background loading failed:', error);
        }
    }

    applyBackgroundImage(strategy) {
        // Only apply once - first strategy to succeed wins
        if (document.body.classList.contains('bg-loaded')) {
            console.log(`🎨 Background already loaded, ignoring ${strategy} strategy`);
            return;
        }
        
        console.log(`🎨 Applying background image via ${strategy} strategy`);
        
        // Apply immediately with multiple approaches for maximum compatibility
        const bgElement = document.querySelector('.background-image');
        
        if (bgElement) {
            // Method 1: CSS custom property
            document.documentElement.style.setProperty('--bg-loaded', `url("${this.imageUrl}")`);
            
            // Method 2: Direct style application
            bgElement.style.backgroundImage = `url("${this.imageUrl}")`;
            
            // Method 3: Class-based application
            document.body.classList.add('bg-loaded');
            
            // Method 4: Force repaint
            bgElement.offsetHeight; // Trigger reflow
            
            this.clearFallbackTimeout();
            
            // Store success in session storage
            sessionStorage.setItem('bg-loaded', 'true');
            sessionStorage.setItem('bg-load-time', Date.now().toString());
        }
    }

    setupFallbackTimeout() {
        // If image doesn't load within 2 seconds, use fallback
        this.loadingTimeout = setTimeout(() => {
            if (!document.body.classList.contains('bg-loaded')) {
                console.warn('Background image loading timeout, using fallback');
                this.useFallbackBackground();
            }
        }, 2000);
    }

    clearFallbackTimeout() {
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
    }

    handleLoadError() {
        this.retryCount++;
        
        if (this.retryCount < this.maxRetries) {
            console.log(`Retrying background image load (attempt ${this.retryCount + 1}/${this.maxRetries})`);
            setTimeout(() => {
                this.loadWithImageObject();
            }, 500 * this.retryCount); // Exponential backoff
        } else {
            console.warn('Max retries reached, using fallback background');
            this.useFallbackBackground();
        }
    }

    useFallbackBackground() {
        const bgElement = document.querySelector('.background-image');
        if (bgElement) {
            bgElement.style.backgroundImage = this.fallbackGradient;
            document.body.classList.add('bg-fallback');
            console.log('🎨 Fallback gradient background applied');
        }
    }

    cacheImageBlob(blobUrl) {
        // Store blob URL for immediate reuse
        if ('caches' in window) {
            caches.open('bg-image-cache').then(cache => {
                cache.put(this.imageUrl, new Response(blobUrl));
            }).catch(error => {
                console.warn('Failed to cache background image:', error);
            });
        }
    }

    getCacheVersion() {
        // Generate cache version based on last modified or build timestamp
        return sessionStorage.getItem('bg-cache-version') || Date.now();
    }

    setupVisibilityHandler() {
        // Reload background if page becomes visible and it's missing
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !document.body.classList.contains('bg-loaded')) {
                console.log('Page visible and background missing, reloading...');
                this.retryCount = 0;
                this.loadWithMultipleStrategies();
            }
        });
    }

    // Public API for manual control
    forceReload() {
        document.body.classList.remove('bg-loaded', 'bg-fallback');
        this.retryCount = 0;
        this.loadWithMultipleStrategies();
    }

    preloadForNextNavigation() {
        // Preload for next page navigation
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = this.imageUrl;
        document.head.appendChild(link);
    }
}

// Initialize immediately if on search page
if (document.body.dataset.page === 'search' || window.location.pathname.includes('search')) {
    // Check if background was recently loaded successfully
    const recentLoad = sessionStorage.getItem('bg-load-time');
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    if (!recentLoad || parseInt(recentLoad) < fiveMinutesAgo) {
        // Initialize optimizer
        window.backgroundImageOptimizer = new BackgroundImageOptimizer();
    } else {
        // Background was recently loaded successfully, apply immediately
        console.log('🎨 Using recently cached background image');
        document.documentElement.style.setProperty('--bg-loaded', 'url("images/bg.png")');
        document.body.classList.add('bg-loaded');
    }
}

// Make available globally for debugging
window.reloadBackground = () => {
    if (window.backgroundImageOptimizer) {
        window.backgroundImageOptimizer.forceReload();
    } else {
        window.backgroundImageOptimizer = new BackgroundImageOptimizer();
    }
};

export { BackgroundImageOptimizer };