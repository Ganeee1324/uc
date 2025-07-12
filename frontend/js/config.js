// Configuration file for different environments
const config = {
    // Development
    development: {
        API_BASE: 'http://146.59.236.26:5000'
    },
    // Production - update this with your actual backend URL
    production: {
        API_BASE: 'http://146.59.236.26:5000' // Your actual backend server
    }
};

// Auto-detect environment
const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
const currentConfig = isProduction ? config.production : config.development;

// Export for use in other files
window.APP_CONFIG = currentConfig; 