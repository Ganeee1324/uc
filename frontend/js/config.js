// Configuration file for different environments
const config = {
    // Development
    development: {
        API_BASE: 'https://symbia.it:5000'
    },
    // Production - update this with your actual backend URL
    production: {
        API_BASE: 'https://symbia.it:5000' // Use HTTPS for production
    }
};

// Auto-detect environment
const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
const currentConfig = isProduction ? config.production : config.development;

// Debug logging removed

// Export for use in other files
window.APP_CONFIG = currentConfig;

// Global cache management utilities
window.CACHE_UTILS = {
    // Hierarchy cache constants
    HIERARCHY_CACHE_KEY: 'hierarchy_data_cache',
    HIERARCHY_CACHE_VERSION: '1.0',
    HIERARCHY_CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    
    // Generic cache management functions
    getCache: function(key) {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            return cacheData;
        } catch (error) {
            console.warn('⚠️ Error reading cache:', error);
            return null;
        }
    },
    
    setCache: function(key, data, version, duration) {
        try {
            const cacheData = {
                version: version,
                timestamp: Date.now(),
                data: data,
                duration: duration
            };
            localStorage.setItem(key, JSON.stringify(cacheData));
            return true;
        } catch (error) {
            console.warn('⚠️ Error setting cache:', error);
            return false;
        }
    },
    
    clearCache: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('⚠️ Error clearing cache:', error);
            return false;
        }
    },
    
    isCacheValid: function(cacheData, version, duration) {
        if (!cacheData || !cacheData.version || !cacheData.timestamp) {
            return false;
        }
        
        // Check version
        if (cacheData.version !== version) {
            return false;
        }
        
        // Check expiration
        const now = Date.now();
        if (now - cacheData.timestamp > duration) {
            return false;
        }
        
        return true;
    }
}; 