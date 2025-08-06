/**
 * INSTANT LOADING SYSTEM
 * Optimized for sub-1s loading with zero layout shift
 * Implements performance patterns from modern e-commerce platforms
 */

class InstantLoadingSystem {
    constructor() {
        this.initialized = false;
        this.criticalResourcesLoaded = false;
        this.skeletonManager = new SkeletonManager();
        this.performanceTracker = new PerformanceTracker();
        
        // Optimized caching with reduced overhead
        this.cache = new Map();
        this.preloadQueue = [];
        
        // Initialize immediately
        this.init();
    }

    init() {
        if (this.initialized) return;
        
        // Mark start time for performance tracking
        this.performanceTracker.markStart('page-load');
        
        // Preload critical resources immediately
        this.preloadCriticalResources();
        
        // Initialize skeleton system
        this.skeletonManager.init();
        
        // Setup instant UI rendering
        this.setupInstantUI();
        
        // Setup progressive enhancement
        this.setupProgressiveEnhancement();
        
        this.initialized = true;
        console.log('⚡ Instant Loading System initialized');
    }

    preloadCriticalResources() {
        const criticalResources = [
            // REMOVED: Background image (now handled by CSS directly)
            { type: 'image', url: 'images/Logo.png', priority: 'high' },
            { type: 'font', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', priority: 'high' },
            { type: 'api', url: '/vetrine', priority: 'medium' }
        ];

        criticalResources.forEach(resource => {
            this.preloadResource(resource);
        });
    }

    preloadResource(resource) {
        switch (resource.type) {
            case 'image':
                this.preloadImage(resource.url);
                break;
            case 'font':
                this.preloadFont(resource.url);
                break;
            case 'api':
                this.preloadApi(resource.url);
                break;
        }
    }

    preloadImage(url) {
        const img = new Image();
        
        // Simple image preloading (background image handled by CSS)
        img.onload = () => {
            this.cache.set(url, { type: 'image', data: img, timestamp: Date.now() });
        };
        
        img.src = url;
    }

    preloadFont(url) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = url;
        document.head.appendChild(link);
    }

    preloadApi(endpoint) {
        // Only preload if we have auth token and cache is empty
        const authToken = localStorage.getItem('authToken');
        if (!authToken || this.cache.has(endpoint)) return;

        fetch(`${window.APP_CONFIG?.API_BASE || ''}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        })
        .then(response => response.json())
        .then(data => {
            this.cache.set(endpoint, { type: 'api', data, timestamp: Date.now() });
        })
        .catch(() => {}); // Silent fail for preloading
    }

    setupInstantUI() {
        // Show skeleton immediately - no waiting for data
        this.skeletonManager.showInitialSkeletons();
        
        // Mark UI as interactive immediately
        document.body.classList.add('ui-ready');
        
        // Enable search input immediately
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.disabled = false;
            searchInput.focus();
        }
        
        this.performanceTracker.markEnd('page-load');
        this.performanceTracker.markStart('data-load');
    }

    setupProgressiveEnhancement() {
        // Load data progressively without blocking UI
        this.loadDataProgressively();
        
        // Setup optimistic UI updates
        this.setupOptimisticUI();
        
        // Setup intersection observer for lazy loading
        this.setupLazyLoading();
    }

    async loadDataProgressively() {
        try {
            // Check cache first
            let data = this.cache.get('/vetrine');
            
            if (!data || this.isExpired(data)) {
                // Load fresh data
                data = await this.fetchWithOptimizations('/vetrine');
                this.cache.set('/vetrine', { type: 'api', data: data.data || data, timestamp: Date.now() });
            } else {
                data = data.data;
            }
            
            // Replace skeletons with real data
            this.skeletonManager.replaceWithData(data);
            this.performanceTracker.markEnd('data-load');
            
        } catch (error) {
            console.error('Progressive data loading failed:', error);
            // Keep skeletons visible and show error state
            this.skeletonManager.showErrorState();
        }
    }

    async fetchWithOptimizations(endpoint) {
        const authToken = localStorage.getItem('authToken');
        const url = `${window.APP_CONFIG?.API_BASE || ''}${endpoint}`;
        
        return fetch(url, {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
            // Allow browser caching for better performance
            cache: 'default'
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        });
    }

    setupOptimisticUI() {
        // Setup search with optimistic updates
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            
            // Show loading state immediately
            this.skeletonManager.showSearchLoading();
            
            searchTimeout = setTimeout(() => {
                this.performOptimisticSearch(e.target.value);
            }, 300); // Debounced search
        });
    }

    async performOptimisticSearch(query) {
        if (!query.trim()) {
            // Show all documents immediately from cache
            const cached = this.cache.get('/vetrine');
            if (cached && !this.isExpired(cached)) {
                this.skeletonManager.replaceWithData(cached.data);
                return;
            }
        }

        try {
            const searchUrl = `/vetrine/search?q=${encodeURIComponent(query)}`;
            const results = await this.fetchWithOptimizations(searchUrl);
            
            // Update UI immediately
            this.skeletonManager.replaceWithData(results);
            
            // Cache results
            this.cache.set(searchUrl, { type: 'api', data: results, timestamp: Date.now() });
            
        } catch (error) {
            console.error('Search failed:', error);
            this.skeletonManager.showErrorState();
        }
    }

    setupLazyLoading() {
        // Lazy load non-critical images and components
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadLazyElement(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { 
            rootMargin: '50px' // Start loading 50px before element enters viewport
        });

        // Observe elements marked for lazy loading
        document.querySelectorAll('[data-lazy]').forEach(el => {
            observer.observe(el);
        });
    }

    loadLazyElement(element) {
        const src = element.dataset.lazy;
        if (element.tagName === 'IMG') {
            element.src = src;
            element.removeAttribute('data-lazy');
        }
    }

    isExpired(cacheEntry, ttl = 5 * 60 * 1000) { // 5 minutes default TTL
        return Date.now() - cacheEntry.timestamp > ttl;
    }

    // Public API for component integration
    showSkeletons() {
        this.skeletonManager.showSkeletons();
    }

    hideSkeletons() {
        this.skeletonManager.hideSkeletons();
    }

    updateWithData(data) {
        this.skeletonManager.replaceWithData(data);
    }
}

class SkeletonManager {
    constructor() {
        this.skeletonCount = 8; // Number of skeleton cards to show
        this.documentsGrid = null;
    }

    init() {
        this.documentsGrid = document.getElementById('documentsGrid');
        if (!this.documentsGrid) {
            console.warn('Documents grid not found - skeleton system disabled');
            return;
        }
    }

    showInitialSkeletons() {
        if (!this.documentsGrid) return;
        
        // Clear existing content
        this.documentsGrid.innerHTML = '';
        
        // Add loading class for proper styling
        this.documentsGrid.classList.add('loading');
        
        // Generate skeleton cards with exact dimensions
        for (let i = 0; i < this.skeletonCount; i++) {
            const skeleton = this.createSkeletonCard(i);
            this.documentsGrid.appendChild(skeleton);
        }
    }

    createSkeletonCard(index) {
        const card = document.createElement('div');
        card.className = 'document-card loading-card';
        card.setAttribute('data-skeleton-index', index);
        
        card.innerHTML = `
            <div class="document-preview loading-preview">
                <div class="skeleton-preview-circle"></div>
                <div class="skeleton-rating-badge"></div>
                <div class="skeleton-preview-bar"></div>
            </div>
            <div class="skeleton-favorite-button"></div>
            <div class="document-content">
                <div class="document-header">
                    <div class="document-title-section">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-author"></div>
                    </div>
                </div>
                <div class="document-info">
                    <div class="skeleton-line info-item"></div>
                    <div class="skeleton-line info-item"></div>
                    <div class="skeleton-line info-item"></div>
                    <div class="skeleton-line info-item"></div>
                </div>
                <div class="document-footer">
                    <div class="skeleton-footer-left">
                        <div class="skeleton-avatar"></div>
                        <div class="skeleton-meta"></div>
                    </div>
                    <div class="skeleton-price"></div>
                </div>
            </div>
        `;
        
        return card;
    }

    showSearchLoading() {
        if (!this.documentsGrid) return;
        
        // Replace current content with skeletons
        this.showInitialSkeletons();
    }

    replaceWithData(data) {
        if (!this.documentsGrid || !data) return;
        
        // Remove loading state
        this.documentsGrid.classList.remove('loading');
        
        // Clear skeletons
        this.documentsGrid.innerHTML = '';
        
        // Add real cards
        const documents = Array.isArray(data) ? data : (data.vetrine || data.documents || []);
        
        if (documents.length === 0) {
            this.showNoResultsState();
            return;
        }
        
        documents.forEach(doc => {
            const card = this.createDocumentCard(doc);
            this.documentsGrid.appendChild(card);
        });
    }

    createDocumentCard(doc) {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.setAttribute('data-document-id', doc.id);
        
        // Create card content with exact same structure as skeleton
        card.innerHTML = `
            <div class="document-preview">
                ${doc.preview_url ? 
                    `<img src="${doc.preview_url}" alt="${doc.title}" loading="lazy">` : 
                    '<div class="preview-placeholder"></div>'
                }
                ${doc.rating ? `<div class="rating-badge">${doc.rating}</div>` : ''}
            </div>
            <button class="favorite-button" data-document-id="${doc.id}">
                <i class="material-symbols-outlined">${doc.is_favorited ? 'favorite' : 'favorite_border'}</i>
            </button>
            <div class="document-content">
                <div class="document-header">
                    <div class="document-title-section">
                        <h3 class="document-title">${doc.title || 'Untitled Document'}</h3>
                        <p class="document-author">di ${doc.author || doc.user_name || 'Autore sconosciuto'}</p>
                    </div>
                </div>
                <div class="document-info">
                    <div class="info-item">${doc.course || 'Corso non specificato'}</div>
                    <div class="info-item">${doc.faculty || 'Facoltà non specificata'}</div>
                    <div class="info-item">${doc.pages ? `${doc.pages} pagine` : 'Pagine non specificate'}</div>
                    <div class="info-item">${doc.file_type || 'Tipo file non specificato'}</div>
                </div>
                <div class="document-footer">
                    <div class="footer-left">
                        <div class="user-avatar">${(doc.user_name || 'U')[0].toUpperCase()}</div>
                        <div class="user-meta">
                            <span class="upload-date">${this.formatDate(doc.created_at)}</span>
                        </div>
                    </div>
                    <div class="document-price">
                        ${doc.price ? `€${doc.price}` : 'Gratis'}
                    </div>
                </div>
            </div>
        `;
        
        return card;
    }

    showNoResultsState() {
        this.documentsGrid.innerHTML = '<div class="no-results">Nessun documento trovato</div>';
        this.documentsGrid.classList.add('no-results-state');
    }

    showErrorState() {
        this.documentsGrid.innerHTML = '<div class="error-state">Errore nel caricamento dei documenti</div>';
        this.documentsGrid.classList.add('error-state');
    }

    formatDate(dateString) {
        if (!dateString) return 'Data non disponibile';
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT');
    }
}

class PerformanceTracker {
    constructor() {
        this.marks = new Map();
        this.measures = new Map();
    }

    markStart(name) {
        this.marks.set(`${name}-start`, performance.now());
        performance.mark(`${name}-start`);
    }

    markEnd(name) {
        const endTime = performance.now();
        this.marks.set(`${name}-end`, endTime);
        performance.mark(`${name}-end`);
        
        const startTime = this.marks.get(`${name}-start`);
        if (startTime) {
            const duration = endTime - startTime;
            this.measures.set(name, duration);
            performance.measure(name, `${name}-start`, `${name}-end`);
            
            console.log(`⏱️ ${name}: ${Math.round(duration)}ms`);
        }
    }

    getMetrics() {
        return {
            marks: Object.fromEntries(this.marks),
            measures: Object.fromEntries(this.measures)
        };
    }
}

// Initialize the system immediately
window.instantLoadingSystem = new InstantLoadingSystem();

// Export for external use
export { InstantLoadingSystem, SkeletonManager, PerformanceTracker };