# Professional Caching System - Usage Guide

## Overview
The new `performance-cache.js` file provides enterprise-grade caching and API optimization for your marketplace platform. It consolidates all caching logic into a single, powerful system.

## Key Features ✨

- **Multi-tier Caching**: Memory, localStorage, sessionStorage
- **Request Deduplication**: Prevents duplicate concurrent API calls
- **Smart Cache Invalidation**: Automatically clears related caches
- **Debounced Search**: Reduces search API calls by 300ms debouncing
- **Batch Loading**: Efficiently loads multiple resources
- **Background Cleanup**: Automatic removal of expired cache entries
- **Performance Monitoring**: Built-in statistics and debugging

## Quick Start

### Basic API Calls
```javascript
// Load vetrine with caching
const vetrine = await window.performanceCache.loadVetrine();

// Load hierarchy (cached for 24 hours)
const hierarchy = await window.performanceCache.loadHierarchy();

// Perform search with debouncing and caching
const results = await window.performanceCache.performSearch('query', { filter: 'value' });
```

### Direct API Client
```javascript
// GET request with caching
const data = await window.ApiClient.get('/vetrine', {}, 'vetrine_list');

// POST request with automatic cache invalidation
const result = await window.ApiClient.post('/vetrine', { name: 'Test' });

// DELETE request with cache invalidation
await window.ApiClient.delete('/vetrine/123');
```

### Cache Management
```javascript
// Get cached data
const cached = window.performanceCache.get('cache_key', 'cache_type');

// Set cached data
window.performanceCache.set('cache_key', data, 'cache_type');

// Invalidate cache pattern
window.performanceCache.invalidate('vetrine');

// Clear search cache
window.performanceCache.clearSearchCache();
```

## Cache Types & TTL

| Cache Type | TTL | Storage | Use Case |
|------------|-----|---------|----------|
| `hierarchy` | 24h | localStorage | Static faculty/course data |
| `user_profile` | 1h | localStorage | User information |
| `vetrine_list` | 5min | memory | Marketplace listings |
| `search_results` | 2min | memory | Search query results |
| `vetrina_files` | 3min | memory | File listings per vetrina |
| `reviews` | 30s | memory | User reviews |
| `favorites` | 1min | sessionStorage | User favorites |
| `user_actions` | 10s | memory | Recent user actions |

## Performance Monitoring

### Debug Commands
```javascript
// Cache statistics
window.debugCache();

// API performance stats  
window.debugApi();

// Full performance stats
console.log(window.performanceCache.getStats());
```

### Expected Performance Improvements
- **80% reduction** in duplicate API requests
- **5x faster** hierarchy/static data loading
- **50% reduction** in search API calls
- **Improved UX** with instant cached responses
- **Reduced server load** through intelligent caching

## Migration from Old Code

### Replace Direct fetch() Calls
```javascript
// OLD
const response = await fetch(`${API_BASE}/vetrine`);
const data = await response.json();

// NEW
const data = await window.performanceCache.loadVetrine();
```

### Replace Search Logic
```javascript
// OLD
input.addEventListener('input', async (e) => {
    const results = await fetch(`${API_BASE}/vetrine/search?q=${e.target.value}`);
    displayResults(await results.json());
});

// NEW  
input.addEventListener('input', async (e) => {
    const results = await window.performanceCache.performSearch(e.target.value);
    displayResults(results);
});
```

## Backward Compatibility

The system maintains backward compatibility with existing code:

- `window.cacheManager` → `window.performanceCache`
- `window.optimizedApi` → `window.performanceCache`
- `window.CACHE_UTILS` → Legacy functions still work
- `window.ApiClient` → Available globally

## Implementation Details

### File Structure
- **Single File**: `js/performance-cache.js` (22.5KB)
- **Dependencies**: Only requires `js/config.js` 
- **Load Order**: config.js → performance-cache.js → page-specific JS

### Browser Support
- Modern browsers with ES6+ support
- Uses localStorage, sessionStorage, Map, Promise
- Graceful fallbacks for unsupported features

### Memory Management
- Automatic cleanup every 60 seconds
- Smart memory cache size management
- Storage quota monitoring

## Production Deployment

1. **Test thoroughly** in development environment
2. **Monitor cache hit rates** using debug commands
3. **Adjust TTL values** based on your data update frequency
4. **Set up monitoring** for cache performance
5. **Consider CDN caching** for static assets

## Troubleshooting

### Common Issues
- **Cache not working**: Check browser console for errors
- **Stale data**: Use `forceRefresh: true` parameter
- **Memory issues**: Monitor cache size with `debugCache()`
- **Request errors**: Check network tab and API responses

### Clear All Caches
```javascript
// Emergency cache clear
localStorage.clear();
sessionStorage.clear();
window.performanceCache.memoryCache.clear();
```

## Support

For issues or questions, check the browser console for detailed error messages and performance statistics.