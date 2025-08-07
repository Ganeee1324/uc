/**
 * GLOBAL MEMORY MANAGEMENT SYSTEM
 * Comprehensive RAM optimization and cleanup for the entire application
 * Prevents memory leaks and reduces RAM usage across all components
 */

class GlobalMemoryManager {
    constructor() {
        this.cleanupCallbacks = new Set();
        this.isCleaningUp = false;
        this.memoryPressureThreshold = 0.8; // 80% of available memory
        this.lastCleanupTime = 0;
        this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
        
        this.init();
    }

    init() {
        // Setup page visibility API for background cleanup
        this.setupVisibilityCleanup();
        
        // Setup navigation cleanup
        this.setupNavigationCleanup();
        
        // Setup periodic cleanup
        this.setupPeriodicCleanup();
        
        // Setup memory pressure detection
        this.setupMemoryPressureDetection();
        
        console.log('🧹 Global Memory Manager initialized');
    }

    /**
     * Register a cleanup callback function
     * @param {Function} callback - Function to call during cleanup
     * @param {string} name - Name for debugging purposes
     */
    registerCleanup(callback, name = 'unknown') {
        if (typeof callback === 'function') {
            callback._name = name;
            this.cleanupCallbacks.add(callback);
            console.log(`🧹 Registered cleanup callback: ${name}`);
        }
    }

    /**
     * Unregister a cleanup callback
     * @param {Function} callback - Function to remove
     */
    unregisterCleanup(callback) {
        this.cleanupCallbacks.delete(callback);
    }

    /**
     * Execute all registered cleanup callbacks
     * @param {string} reason - Reason for cleanup (for debugging)
     */
    async executeCleanup(reason = 'manual') {
        if (this.isCleaningUp) return;
        this.isCleaningUp = true;
        
        console.log(`🧹 Executing global cleanup - Reason: ${reason}`);
        const startTime = performance.now();
        
        let cleaned = 0;
        for (const callback of this.cleanupCallbacks) {
            try {
                await callback();
                cleaned++;
            } catch (error) {
                console.error(`🧹 Cleanup error in ${callback._name || 'unknown'}:`, error);
            }
        }
        
        // Force garbage collection if available (Chrome DevTools)
        if (window.gc && typeof window.gc === 'function') {
            try {
                window.gc();
                console.log('🧹 Forced garbage collection');
            } catch (e) {
                // Ignore - not available in production
            }
        }
        
        const duration = performance.now() - startTime;
        console.log(`🧹 Cleanup completed: ${cleaned} callbacks in ${duration.toFixed(2)}ms`);
        
        this.lastCleanupTime = Date.now();
        this.isCleaningUp = false;
    }

    /**
     * Setup page visibility API for cleanup when tab is hidden
     */
    setupVisibilityCleanup() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is now hidden, perform cleanup
                this.executeCleanup('page_hidden');
            }
        });

        // Also cleanup on focus loss (for older browsers)
        window.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.hidden) {
                    this.executeCleanup('window_blur');
                }
            }, 1000); // Delay to avoid false triggers
        });
    }

    /**
     * Setup cleanup on page navigation/unload
     */
    setupNavigationCleanup() {
        // Modern browsers - beforeunload for user-initiated navigation
        window.addEventListener('beforeunload', (event) => {
            this.executeCleanup('before_unload');
        });

        // Page Hide API (most reliable for all navigation types)
        window.addEventListener('pagehide', (event) => {
            this.executeCleanup('page_hide');
        });

        // Visibilitychange as additional fallback
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.executeCleanup('visibility_hidden');
            }
        });
    }

    /**
     * Setup periodic cleanup to prevent memory buildup
     */
    setupPeriodicCleanup() {
        setInterval(() => {
            const now = Date.now();
            if (now - this.lastCleanupTime > this.cleanupInterval) {
                this.executeCleanup('periodic');
            }
        }, this.cleanupInterval);
    }

    /**
     * Setup memory pressure detection (experimental)
     */
    setupMemoryPressureDetection() {
        // Use Performance Observer to monitor memory usage
        if ('memory' in performance) {
            setInterval(() => {
                const memInfo = performance.memory;
                if (memInfo) {
                    const usedMemory = memInfo.usedJSHeapSize;
                    const totalMemory = memInfo.totalJSHeapSize;
                    const limitMemory = memInfo.jsHeapSizeLimit;
                    
                    const memoryPressure = usedMemory / limitMemory;
                    
                    if (memoryPressure > this.memoryPressureThreshold) {
                        console.warn(`🧹 High memory pressure detected: ${(memoryPressure * 100).toFixed(1)}%`);
                        this.executeCleanup('memory_pressure');
                    }
                    
                    // Log memory stats every 5 minutes
                    if (Date.now() - this.lastMemoryLog > 5 * 60 * 1000) {
                        console.log(`💾 Memory usage: ${(usedMemory / 1024 / 1024).toFixed(1)}MB used, ${(totalMemory / 1024 / 1024).toFixed(1)}MB total, ${(limitMemory / 1024 / 1024).toFixed(1)}MB limit`);
                        this.lastMemoryLog = Date.now();
                    }
                }
            }, 30000); // Check every 30 seconds
            
            this.lastMemoryLog = 0;
        }
    }

    /**
     * Get memory statistics
     * @returns {Object} Memory statistics
     */
    getMemoryStats() {
        if ('memory' in performance) {
            const memInfo = performance.memory;
            return {
                used: memInfo.usedJSHeapSize,
                total: memInfo.totalJSHeapSize,
                limit: memInfo.jsHeapSizeLimit,
                usedMB: (memInfo.usedJSHeapSize / 1024 / 1024).toFixed(1),
                totalMB: (memInfo.totalJSHeapSize / 1024 / 1024).toFixed(1),
                limitMB: (memInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(1),
                pressure: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit).toFixed(3)
            };
        }
        return null;
    }

    /**
     * Force cleanup immediately
     */
    forceCleanup() {
        return this.executeCleanup('forced');
    }
}

// Create global instance
window.globalMemoryManager = new GlobalMemoryManager();

// Register core cleanup functions immediately

// 1. Performance Cache Cleanup
if (window.performanceCache && typeof window.performanceCache.clearCache === 'function') {
    window.globalMemoryManager.registerCleanup(
        () => {
            window.performanceCache.clearCache();
        },
        'performance_cache'
    );
}

// 2. PDF Resources Cleanup
if (typeof cleanupPdfResources === 'function') {
    window.globalMemoryManager.registerCleanup(cleanupPdfResources, 'pdf_resources');
}

// 3. Search Component Arrays Cleanup
if (typeof clearAllSearchData === 'function') {
    window.globalMemoryManager.registerCleanup(clearAllSearchData, 'search_data');
}

// 4. DOM Cache Cleanup
window.globalMemoryManager.registerCleanup(
    () => {
        // Clear various DOM caches
        if (window.DOM_ID_CACHE && typeof window.DOM_ID_CACHE.clear === 'function') {
            window.DOM_ID_CACHE.clear();
        }
        
        // Clear any WeakMaps (they should auto-cleanup but this helps)
        if (window.DOM_ELEMENT_CACHE) {
            // WeakMaps can't be cleared manually, but we can remove references
        }
    },
    'dom_cache'
);

// 5. Event Listener Cleanup
window.globalMemoryManager.registerCleanup(
    () => {
        // Remove any global event listeners that might be holding references
        // This is a placeholder - specific components should handle their own cleanup
    },
    'event_listeners'
);

// Add memory stats to global scope for debugging
window.getMemoryStats = () => window.globalMemoryManager.getMemoryStats();
window.forceMemoryCleanup = () => window.globalMemoryManager.forceCleanup();

// Expose for component registration
window.registerMemoryCleanup = (callback, name) => {
    window.globalMemoryManager.registerCleanup(callback, name);
};

console.log('🧹 Global Memory Management System loaded');
console.log('🧹 Available commands: getMemoryStats(), forceMemoryCleanup()');