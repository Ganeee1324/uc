/**
 * Professional Performance & Caching System
 * Consolidated caching, API optimization, and performance management
 * Designed for enterprise-grade e-commerce platforms
 */

class PerformanceCacheManager {
    constructor() {
        this.memoryCache = new Map();
        this.requestDeduplicationMap = new Map();
        this.searchCache = new Map();
        this.searchDebounceTimer = null;
        this.lastSearchQuery = '';
        this.lastSearchParams = {};
        
        // Cache configuration with TTL and storage strategy
        this.cacheConfig = {
            // Static data - rarely changes
            hierarchy: { ttl: 24 * 60 * 60 * 1000, storage: 'localStorage' }, // 24h
            user_profile: { ttl: 60 * 60 * 1000, storage: 'localStorage' }, // 1h
            
            // Semi-dynamic data
            vetrine_list: { ttl: 5 * 60 * 1000, storage: 'memory' }, // 5min
            search_results: { ttl: 2 * 60 * 1000, storage: 'memory' }, // 2min
            vetrina_files: { ttl: 3 * 60 * 1000, storage: 'memory' }, // 3min
            
            // Dynamic data with short cache
            reviews: { ttl: 30 * 1000, storage: 'memory' }, // 30s
            favorites: { ttl: 60 * 1000, storage: 'sessionStorage' }, // 1min
            
            // Very short cache for user actions
            user_actions: { ttl: 10 * 1000, storage: 'memory' } // 10s
        };
        
        this.startCleanupInterval();
        this.initializeApiClient();
    }

    // ==================== CORE CACHE MANAGEMENT ====================

    generateCacheKey(endpoint, params = {}) {
        const sortedParams = Object.keys(params).sort().reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});
        return `${endpoint}_${JSON.stringify(sortedParams)}`;
    }

    get(cacheKey, cacheType = null, forceExpired = false) {
        const config = cacheType ? this.cacheConfig[cacheType] : null;
        
        try {
            let cachedData = null;
            
            // Try memory cache first (fastest)
            if (this.memoryCache.has(cacheKey)) {
                cachedData = this.memoryCache.get(cacheKey);
            }
            // Try localStorage/sessionStorage
            else if (config && config.storage !== 'memory') {
                const storage = config.storage === 'localStorage' ? localStorage : sessionStorage;
                const cached = storage.getItem(cacheKey);
                if (cached) {
                    cachedData = JSON.parse(cached);
                }
            }
            
            if (!cachedData) return null;
            
            // Check expiration
            if (forceExpired) {
                // If forceExpired is true, we assume the cache is expired and return it
                return cachedData;
            }

            if (Date.now() - cachedData.timestamp > (config?.ttl || 300000)) {
                this.delete(cacheKey, config?.storage);
                return null;
            }
            
            // Move to memory cache if accessed from storage
            if (config && config.storage !== 'memory' && cachedData) {
                this.memoryCache.set(cacheKey, cachedData);
            }
            
            return cachedData.data;
            
        } catch (error) {
            console.warn('Cache read error:', error);
            return null;
        }
    }

    set(cacheKey, data, cacheType) {
        const config = this.cacheConfig[cacheType];
        if (!config) return false;
        
        const cacheData = {
            data,
            timestamp: Date.now(),
            type: cacheType,
            version: '1.0'
        };
        
        try {
            // Always set in memory for fast access
            this.memoryCache.set(cacheKey, cacheData);
            
            // Also persist to storage if configured
            if (config.storage !== 'memory') {
                const storage = config.storage === 'localStorage' ? localStorage : sessionStorage;
                storage.setItem(cacheKey, JSON.stringify(cacheData));
            }
            
            return true;
        } catch (error) {
            console.warn('Cache write error:', error);
            return false;
        }
    }

    delete(cacheKey, storageType = null) {
        try {
            this.memoryCache.delete(cacheKey);
            
            if (storageType === 'localStorage') {
                localStorage.removeItem(cacheKey);
            } else if (storageType === 'sessionStorage') {
                sessionStorage.removeItem(cacheKey);
            } else {
                localStorage.removeItem(cacheKey);
                sessionStorage.removeItem(cacheKey);
            }
            return true;
        } catch (error) {
            console.warn('Cache delete error:', error);
            return false;
        }
    }

    invalidate(pattern) {
        // Invalidate memory cache
        for (const [key] of this.memoryCache) {
            if (key.includes(pattern)) {
                this.memoryCache.delete(key);
            }
        }
        
        // Invalidate localStorage and sessionStorage
        [localStorage, sessionStorage].forEach(storage => {
            try {
                Object.keys(storage).forEach(key => {
                    if (key.includes(pattern)) {
                        storage.removeItem(key);
                    }
                });
            } catch (error) {
                console.warn('Storage invalidation error:', error);
            }
        });
    }

    // ==================== REQUEST DEDUPLICATION ====================

    async deduplicatedRequest(url, options = {}, cacheType = null) {
        const requestId = `${url}_${JSON.stringify(options)}`;
        
        // Return existing promise if request is in flight
        if (this.requestDeduplicationMap.has(requestId)) {
            return this.requestDeduplicationMap.get(requestId);
        }
        
        // Check cache first
        if (cacheType) {
            const cacheKey = this.generateCacheKey(url, options);
            const cached = this.get(cacheKey, cacheType);
            if (cached) {
                return Promise.resolve(cached);
            }
        }
        
        // Make request
        const requestPromise = fetch(url, {
            ...options,
            headers: {
                ...options.headers
            },
            cache: 'no-store'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Cache the result
            if (cacheType) {
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

    // ==================== API CLIENT ====================

    initializeApiClient() {
        const self = this;
        
        window.ApiClient = {
            async get(endpoint, options = {}, cacheType = null) {
                const url = `${window.APP_CONFIG.API_BASE}${endpoint}`;
                
                const authToken = localStorage.getItem('authToken');
                const headers = {
                    'Content-Type': 'application/json',
                    ...options.headers
                };
                
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
                const url = `${window.APP_CONFIG.API_BASE}${endpoint}`;
                
                const authToken = localStorage.getItem('authToken');
                const headers = {
                    'Content-Type': 'application/json',
                    ...options.headers
                };
                
                if (authToken && !options.skipAuth) {
                    headers.Authorization = `Bearer ${authToken}`;
                }
                
                const response = await fetch(url, {
                    method: 'POST',
                    body: JSON.stringify(data),
                    ...options,
                    headers,
                    cache: 'no-store'
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                self.invalidateRelatedCaches(endpoint);
                return response.json();
            },

            async delete(endpoint, options = {}) {
                const url = `${window.APP_CONFIG.API_BASE}${endpoint}`;
                
                const authToken = localStorage.getItem('authToken');
                const headers = {
                    'Content-Type': 'application/json',
                    ...options.headers
                };
                
                if (authToken && !options.skipAuth) {
                    headers.Authorization = `Bearer ${authToken}`;
                }
                
                const response = await fetch(url, {
                    method: 'DELETE',
                    ...options,
                    headers,
                    cache: 'no-store'
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                self.invalidateRelatedCaches(endpoint);
                return response.json();
            },

            async batch(requests) {
                return self.batchRequests(requests);
            }
        };
    }

    invalidateRelatedCaches(endpoint) {
        if (endpoint.includes('/vetrine')) {
            this.invalidate('vetrine');
        }
        if (endpoint.includes('/favorites')) {
            this.invalidate('favorites');
        }
        if (endpoint.includes('/reviews')) {
            this.invalidate('reviews');
        }
        if (endpoint.includes('/files')) {
            this.invalidate('files');
        }
    }

    async batchRequests(requests) {
        return Promise.allSettled(
            requests.map(({ url, options, cacheType }) => 
                this.deduplicatedRequest(url, options, cacheType)
            )
        );
    }

    // ==================== OPTIMIZED API CALLS ====================

    async loadVetrine(useCache = true) {
        try {
            if (useCache) {
                const cached = this.get('vetrine_list', 'vetrine_list');
                if (cached) {
                    console.log('✅ Loaded vetrine from cache');
                    return cached;
                }
            }

            console.log('🔄 Loading vetrine from API...');
            const data = await window.ApiClient.get('/vetrine', {}, 'vetrine_list');
            return data;
        } catch (error) {
            console.error('❌ Error loading vetrine:', error);
            
            // Enhanced error handling with fallback mechanisms
            if (error.message.includes('500') || error.message.includes('INTERNAL SERVER ERROR')) {
                console.warn('⚠️ Server error detected, attempting fallback strategies...');
                
                // Try to get cached data even if expired
                const expiredCache = this.get('vetrine_list', 'vetrine_list', true); // Force get expired cache
                if (expiredCache) {
                    console.log('🔄 Using expired cache as fallback');
                    return expiredCache;
                }
                
                // Return empty structure to prevent complete failure
                console.log('🔄 Returning empty vetrine structure as fallback');
                return {
                    vetrine: [],
                    error: 'Server temporarily unavailable',
                    fallback: true
                };
            }
            
            // For other errors, try to get any available cache
            const anyCache = this.get('vetrine_list', 'vetrine_list', true);
            if (anyCache) {
                console.log('🔄 Using any available cache as fallback');
                return anyCache;
            }
            
            // Final fallback
            console.log('🔄 Returning empty structure as final fallback');
            return {
                vetrine: [],
                error: 'Unable to load data',
                fallback: true
            };
        }
    }

    async loadHierarchy() {
        try {
            const cached = this.get('hierarchy_cache', 'hierarchy');
            if (cached) {
                console.log('✅ Loaded hierarchy from cache');
                return cached;
            }

            console.log('🔄 Loading hierarchy from API...');
            const data = await window.ApiClient.get('/hierarchy', {}, 'hierarchy');
            return data;
        } catch (error) {
            console.error('❌ Error loading hierarchy:', error);
            throw error;
        }
    }

    async performSearch(query, filters = {}, forceRefresh = false) {
        return new Promise((resolve, reject) => {
            if (this.searchDebounceTimer) {
                clearTimeout(this.searchDebounceTimer);
            }

            this.searchDebounceTimer = setTimeout(async () => {
                try {
                    const searchKey = this.generateSearchKey(query, filters);
                    
                    if (!forceRefresh) {
                        const cached = this.get(searchKey, 'search_results');
                        if (cached) {
                            console.log('✅ Loaded search results from cache');
                            resolve(cached);
                            return;
                        }
                    }

                    const searchParams = new URLSearchParams();
                    if (query) searchParams.append('q', query);
                    
                    Object.keys(filters).forEach(key => {
                        if (filters[key]) {
                            searchParams.append(key, filters[key]);
                        }
                    });

                    const endpoint = `/vetrine/search?${searchParams.toString()}`;
                    console.log('🔍 Performing search:', endpoint);

                    const results = await window.ApiClient.get(endpoint, {}, 'search_results');
                    this.set(searchKey, results, 'search_results');
                    
                    this.lastSearchQuery = query;
                    this.lastSearchParams = filters;
                    
                    resolve(results);
                } catch (error) {
                    console.error('❌ Search error:', error);
                    reject(error);
                }
            }, 300);
        });
    }

    generateSearchKey(query, filters) {
        const searchObj = { query, ...filters };
        const sortedKeys = Object.keys(searchObj).sort();
        const keyString = sortedKeys.map(key => `${key}:${searchObj[key]}`).join('|');
        return `search_${btoa(keyString)}`;
    }

    async loadVetrinaFiles(vetrinaId, useCache = true) {
        try {
            const cacheKey = `vetrina_files_${vetrinaId}`;
            
            if (useCache) {
                const cached = this.get(cacheKey, 'vetrina_files');
                if (cached) {
                    console.log(`✅ Loaded files for vetrina ${vetrinaId} from cache`);
                    return cached;
                }
            }

            console.log(`🔄 Loading files for vetrina ${vetrinaId}...`);
            const data = await window.ApiClient.get(`/vetrine/${vetrinaId}/files`, {}, 'vetrina_files');
            this.set(cacheKey, data, 'vetrina_files');
            return data;
        } catch (error) {
            console.error(`❌ Error loading files for vetrina ${vetrinaId}:`, error);
            throw error;
        }
    }

    async loadVetrinaReviews(vetrinaId, useCache = true) {
        try {
            const cacheKey = `reviews_${vetrinaId}`;
            
            if (useCache) {
                const cached = this.get(cacheKey, 'reviews');
                if (cached) {
                    console.log(`✅ Loaded reviews for vetrina ${vetrinaId} from cache`);
                    return cached;
                }
            }

            console.log(`🔄 Loading reviews for vetrina ${vetrinaId}...`);
            const data = await window.ApiClient.get(`/vetrine/${vetrinaId}/reviews`, {}, 'reviews');
            this.set(cacheKey, data, 'reviews');
            return data;
        } catch (error) {
            console.error(`❌ Error loading reviews for vetrina ${vetrinaId}:`, error);
            throw error;
        }
    }



    async toggleVetrinaFavorite(vetrinaId, currentlyFavorited) {
        try {
            console.log(`${currentlyFavorited ? '➖' : '➕'} Toggling favorite for vetrina ${vetrinaId}`);
            
            if (currentlyFavorited) {
                await window.ApiClient.delete(`/user/favorites/vetrine/${vetrinaId}`);
            } else {
                await window.ApiClient.post(`/user/favorites/vetrine/${vetrinaId}`);
            }

            this.invalidate('favorites');
            return !currentlyFavorited;
        } catch (error) {
            console.error('❌ Error toggling favorite:', error);
            throw error;
        }
    }

    // ==================== PRELOADING & OPTIMIZATION ====================

    async preloadCriticalData() {
        try {
            console.log('🚀 Preloading critical data...');
            
            const [hierarchy, vetrine] = await Promise.allSettled([
                this.loadHierarchy(),
                this.loadVetrine()
            ]);

            console.log('✅ Critical data preloaded');
            return {
                hierarchy: hierarchy.status === 'fulfilled' ? hierarchy.value : null,
                vetrine: vetrine.status === 'fulfilled' ? vetrine.value : null
            };
        } catch (error) {
            console.error('❌ Error preloading data:', error);
            throw error;
        }
    }

    warmCache(userContext = {}) {
        if (userContext.page === 'search') {
            this.deduplicatedRequest(`${window.APP_CONFIG.API_BASE}/vetrine`, {}, 'vetrine_list');
        }
    }

    // ==================== CLEANUP & MAINTENANCE ====================

    startCleanupInterval() {
        setInterval(() => {
            const now = Date.now();
            
            // Clean memory cache
            for (const [key, value] of this.memoryCache) {
                const config = this.cacheConfig[value.type];
                if (config && now - value.timestamp > config.ttl) {
                    this.memoryCache.delete(key);
                }
            }
            
            // Clean localStorage/sessionStorage
            [localStorage, sessionStorage].forEach(storage => {
                try {
                    Object.keys(storage).forEach(key => {
                        if (key.startsWith('cache_') || key.includes('_cache')) {
                            try {
                                const data = JSON.parse(storage.getItem(key));
                                const config = this.cacheConfig[data.type];
                                if (config && now - data.timestamp > config.ttl) {
                                    storage.removeItem(key);
                                }
                            } catch (e) {
                                storage.removeItem(key);
                            }
                        }
                    });
                } catch (error) {
                    console.warn('Storage cleanup error:', error);
                }
            });
        }, 60000); // Run every minute
    }

    // ==================== PERFORMANCE MONITORING ====================

    getStats() {
        return {
            memoryCache: {
                size: this.memoryCache.size,
                keys: Array.from(this.memoryCache.keys())
            },
            pendingRequests: {
                count: this.requestDeduplicationMap.size,
                requests: Array.from(this.requestDeduplicationMap.keys())
            },
            localStorage: {
                cacheKeys: Object.keys(localStorage).filter(k => k.includes('cache')).length
            },
            sessionStorage: {
                cacheKeys: Object.keys(sessionStorage).filter(k => k.includes('cache')).length
            },
            lastSearch: {
                query: this.lastSearchQuery,
                params: this.lastSearchParams
            }
        };
    }

    clearSearchCache() {
        this.invalidate('search_');
        this.searchCache.clear();
        console.log('🧹 Search cache cleared');
    }
}

// ==================== GLOBAL INITIALIZATION ====================

// Initialize the performance cache manager
window.performanceCache = new PerformanceCacheManager();

// Legacy compatibility - expose as separate objects for backward compatibility
window.cacheManager = window.performanceCache;
window.optimizedApi = window.performanceCache;

// Legacy CACHE_UTILS for backward compatibility
window.CACHE_UTILS = {
    HIERARCHY_CACHE_KEY: 'hierarchy_data_cache',
    HIERARCHY_CACHE_VERSION: '1.0',
    HIERARCHY_CACHE_DURATION: 24 * 60 * 60 * 1000,
    
    getCache: function(key) {
        return window.performanceCache.get(key);
    },
    
    setCache: function(key, data) {
        return window.performanceCache.set(key, data, 'custom');
    },
    
    clearCache: function(key) {
        return window.performanceCache.delete(key);
    },
    
    isCacheValid: function(cacheData, version, duration) {
        return cacheData && (Date.now() - cacheData.timestamp < duration);
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.performanceCache.preloadCriticalData();
    window.performanceCache.warmCache({ page: document.body.dataset.page });
});

// Debug helpers
window.debugCache = () => {
    console.log('Cache Statistics:', window.performanceCache.getStats());
};

window.debugApi = () => {
    console.log('API Performance Stats:', window.performanceCache.getStats());
};

console.log('🚀 Professional Performance & Caching System loaded successfully');