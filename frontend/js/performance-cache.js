/**
 * Optimized Performance & Caching System
 * Fixed performance issues and reduced overhead
 * Designed for enterprise-grade e-commerce platforms
 */

class OptimizedPerformanceCacheManager {
    constructor() {
        this.memoryCache = new Map();
        this.requestDeduplicationMap = new Map();
        this.pendingVetrineRequest = null;
        
        // Simplified cache configuration - removed localStorage/sessionStorage overhead
        this.cacheConfig = {
            // Static data - use memory only for better performance
            hierarchy: { ttl: 24 * 60 * 60 * 1000 }, // 24h
            user_profile: { ttl: 60 * 60 * 1000 }, // 1h
            
            // Semi-dynamic data - shorter TTL, memory only
            vetrine_list: { ttl: 2 * 60 * 1000 }, // 2min (reduced from 5min)
            search_results: { ttl: 60 * 1000 }, // 1min (reduced from 2min)
            vetrina_files: { ttl: 90 * 1000 }, // 1.5min (reduced from 3min)
            
            // Dynamic data with very short cache
            reviews: { ttl: 15 * 1000 }, // 15s (reduced from 30s)
            favorites: { ttl: 30 * 1000 }, // 30s (reduced from 1min)
            
            // Very short cache for user actions
            user_actions: { ttl: 5 * 1000 } // 5s (reduced from 10s)
        };
        
        // Reduced cleanup frequency to minimize overhead
        this.startCleanupInterval();
        this.initializeApiClient();
    }

    // ==================== STREAMLINED CACHE MANAGEMENT ====================

    generateCacheKey(endpoint, params = {}) {
        // Simplified key generation - avoid JSON.stringify overhead for simple params
        if (Object.keys(params).length === 0) {
            return endpoint;
        }
        
        // Only sort if we have multiple keys
        const keys = Object.keys(params);
        if (keys.length === 1) {
            return `${endpoint}_${keys[0]}:${params[keys[0]]}`;
        }
        
        const sortedParams = keys.sort().map(key => `${key}:${params[key]}`).join('|');
        return `${endpoint}_${sortedParams}`;
    }

    get(cacheKey, cacheType = null) {
        const cachedData = this.memoryCache.get(cacheKey);
        if (!cachedData) return null;
        
        // Quick expiration check
        const config = this.cacheConfig[cacheType];
        const ttl = config?.ttl || 300000; // 5min default
        
        if (Date.now() - cachedData.timestamp > ttl) {
            this.memoryCache.delete(cacheKey);
            return null;
        }
        
        return cachedData.data;
    }

    set(cacheKey, data, cacheType) {
        const config = this.cacheConfig[cacheType];
        if (!config) return false;
        
        // Memory-only storage for better performance
        this.memoryCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            type: cacheType
        });
        
        return true;
    }

    delete(cacheKey) {
        return this.memoryCache.delete(cacheKey);
    }

    // Simplified invalidation - memory only
    invalidate(pattern) {
        for (const [key] of this.memoryCache) {
            if (key.includes(pattern)) {
                this.memoryCache.delete(key);
            }
        }
    }

    // ==================== OPTIMIZED REQUEST DEDUPLICATION ====================

    async deduplicatedRequest(url, options = {}, cacheType = null) {
        const requestId = `${url}_${options.method || 'GET'}`;
        
        // Return existing promise if request is in flight
        if (this.requestDeduplicationMap.has(requestId)) {
            return this.requestDeduplicationMap.get(requestId);
        }
        
        // Check cache first for GET requests only
        if ((!options.method || options.method === 'GET') && cacheType) {
            const cacheKey = this.generateCacheKey(url, options);
            const cached = this.get(cacheKey, cacheType);
            if (cached) {
                return Promise.resolve(cached);
            }
        }
        
        // Make request with optimized headers
        const requestPromise = fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            // Remove cache: 'no-store' to allow browser cache when appropriate
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Cache successful GET responses only
            if ((!options.method || options.method === 'GET') && cacheType) {
                const cacheKey = this.generateCacheKey(url, options);
                this.set(cacheKey, data, cacheType);
            }
            return data;
        })
        .finally(() => {
            this.requestDeduplicationMap.delete(requestId);
        });
        
        this.requestDeduplicationMap.set(requestId, requestPromise);
        return requestPromise;
    }

    // ==================== SIMPLIFIED API CLIENT ====================

    initializeApiClient() {
        const self = this;
        
        window.ApiClient = {
            async get(endpoint, options = {}, cacheType = null) {
                const url = `${window.APP_CONFIG?.API_BASE || ''}${endpoint}`;
                
                const authToken = localStorage.getItem('authToken');
                const headers = { ...options.headers };
                
                if (authToken && !options.skipAuth) {
                    headers.Authorization = `Bearer ${authToken}`;
                }
                
                return self.deduplicatedRequest(url, {
                    method: 'GET',
                    ...options,
                    headers
                }, cacheType);
            },

            async post(endpoint, data = {}, options = {}) {
                const url = `${window.APP_CONFIG?.API_BASE || ''}${endpoint}`;
                
                const authToken = localStorage.getItem('authToken');
                const headers = { ...options.headers };
                
                if (authToken && !options.skipAuth) {
                    headers.Authorization = `Bearer ${authToken}`;
                }
                
                const response = await fetch(url, {
                    method: 'POST',
                    body: JSON.stringify(data),
                    ...options,
                    headers
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // Invalidate related caches after successful mutation
                self.invalidateRelatedCaches(endpoint);
                return response.json();
            },

            async delete(endpoint, options = {}) {
                const url = `${window.APP_CONFIG?.API_BASE || ''}${endpoint}`;
                
                const authToken = localStorage.getItem('authToken');
                const headers = { ...options.headers };
                
                if (authToken && !options.skipAuth) {
                    headers.Authorization = `Bearer ${authToken}`;
                }
                
                const response = await fetch(url, {
                    method: 'DELETE',
                    ...options,
                    headers
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                self.invalidateRelatedCaches(endpoint);
                return response.json();
            }
        };
    }

    invalidateRelatedCaches(endpoint) {
        // Batch invalidations to reduce iterations
        const patterns = [];
        
        if (endpoint.includes('/vetrine')) patterns.push('vetrine');
        if (endpoint.includes('/favorites')) patterns.push('favorites');
        if (endpoint.includes('/reviews')) patterns.push('reviews');
        if (endpoint.includes('/files')) patterns.push('files');
        
        patterns.forEach(pattern => this.invalidate(pattern));
    }

    // ==================== OPTIMIZED API CALLS ====================

    async loadVetrine(useCache = true) {
        try {
            // Check if we already have a pending request
            if (this.pendingVetrineRequest) {
                return await this.pendingVetrineRequest;
            }

            if (useCache) {
                const cached = this.get('vetrine_list', 'vetrine_list');
                if (cached) {
                    return cached;
                }
            }

            // Create a promise for this request
            this.pendingVetrineRequest = window.ApiClient.get('/vetrine', {}, 'vetrine_list');
            
            const data = await this.pendingVetrineRequest;
            this.pendingVetrineRequest = null;
            
            return data;
        } catch (error) {
            this.pendingVetrineRequest = null;
            console.error('Error loading vetrine:', error);
            throw error; // Don't provide fallback data - let the UI handle errors
        }
    }

    async loadHierarchy() {
        try {
            const cached = this.get('hierarchy_cache', 'hierarchy');
            if (cached) return cached;

            return await window.ApiClient.get('/hierarchy', {}, 'hierarchy');
        } catch (error) {
            console.error('Error loading hierarchy:', error);
            throw error;
        }
    }

    // Simplified search with reduced debouncing
    async performSearch(query, filters = {}, forceRefresh = false) {
        try {
            const searchKey = this.generateSearchKey(query, filters);
            
            if (!forceRefresh) {
                const cached = this.get(searchKey, 'search_results');
                if (cached) return cached;
            }

            const searchParams = new URLSearchParams();
            if (query) searchParams.append('q', query);
            
            Object.keys(filters).forEach(key => {
                if (filters[key]) searchParams.append(key, filters[key]);
            });

            const endpoint = `/vetrine/search?${searchParams.toString()}`;
            const results = await window.ApiClient.get(endpoint, {}, 'search_results');
            
            return results;
        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }

    generateSearchKey(query, filters) {
        // Simplified search key generation
        const parts = [];
        if (query) parts.push(`q:${query}`);
        
        Object.keys(filters).forEach(key => {
            if (filters[key]) parts.push(`${key}:${filters[key]}`);
        });
        
        return `search_${parts.join('|')}`;
    }

    async loadVetrinaFiles(vetrinaId, useCache = true) {
        try {
            const cacheKey = `vetrina_files_${vetrinaId}`;
            
            if (useCache) {
                const cached = this.get(cacheKey, 'vetrina_files');
                if (cached) return cached;
            }

            return await window.ApiClient.get(`/vetrine/${vetrinaId}/files`, {}, 'vetrina_files');
        } catch (error) {
            console.error('Error loading files:', error);
            throw error;
        }
    }

    async loadVetrinaReviews(vetrinaId, useCache = true) {
        try {
            const cacheKey = `vetrina_reviews_${vetrinaId}`;
            
            if (useCache) {
                const cached = this.get(cacheKey, 'reviews');
                if (cached) return cached;
            }

            return await window.ApiClient.get(`/vetrine/${vetrinaId}/reviews`, {}, 'reviews');
        } catch (error) {
            console.error('Error loading reviews:', error);
            return { reviews: [], average_rating: 0, total_reviews: 0 };
        }
    }

    async toggleVetrinaFavorite(vetrinaId, currentlyFavorited) {
        try {
            if (currentlyFavorited) {
                await window.ApiClient.delete(`/user/favorites/vetrine/${vetrinaId}`);
            } else {
                await window.ApiClient.post(`/user/favorites/vetrine/${vetrinaId}`);
            }

            this.invalidate('vetrine');
            return !currentlyFavorited;
        } catch (error) {
            console.error('Error toggling favorite:', error);
            throw error;
        }
    }

    // ==================== LIGHTWEIGHT PRELOADING ====================

    async preloadCriticalData() {
        try {
            // Only preload if not already cached
            const promises = [];
            
            if (!this.get('vetrine_list', 'vetrine_list')) {
                promises.push(this.loadVetrine().catch(() => null));
            }
            
            if (!this.get('hierarchy_cache', 'hierarchy')) {
                promises.push(this.loadHierarchy().catch(() => null));
            }
            
            if (promises.length > 0) {
                await Promise.allSettled(promises);
            }
        } catch (error) {
            console.error('Preload error:', error);
        }
    }

    // ==================== SIMPLIFIED CLEANUP ====================

    startCleanupInterval() {
        // Reduced frequency and simplified cleanup
        setInterval(() => {
            const now = Date.now();
            
            for (const [key, value] of this.memoryCache) {
                const config = this.cacheConfig[value.type];
                if (config && now - value.timestamp > config.ttl) {
                    this.memoryCache.delete(key);
                }
            }
        }, 5 * 60 * 1000); // Run every 5 minutes instead of every minute
    }

    // ==================== PERFORMANCE MONITORING ====================

    getStats() {
        return {
            memoryCache: this.memoryCache.size,
            pendingRequests: this.requestDeduplicationMap.size,
            cacheHitRate: this.calculateHitRate()
        };
    }

    calculateHitRate() {
        // Simple hit rate calculation
        const totalRequests = this.totalRequests || 1;
        const cacheHits = this.cacheHits || 0;
        return Math.round((cacheHits / totalRequests) * 100);
    }

    clearCache() {
        this.memoryCache.clear();
        this.requestDeduplicationMap.clear();
    }
}

// ==================== GLOBAL INITIALIZATION ====================

// Initialize the optimized cache manager
window.performanceCache = new OptimizedPerformanceCacheManager();

// Backward compatibility
window.cacheManager = window.performanceCache;

// Simplified initialization
document.addEventListener('DOMContentLoaded', () => {
    // Only preload if we're on a page that needs it
    const page = document.body.dataset.page;
    if (page === 'vetrine' || page === 'search') {
        window.performanceCache.preloadCriticalData();
    }
});

console.log('🚀 Optimized Performance Cache loaded');