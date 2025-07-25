/**
 * Search Section Component - Universal Reusable Search Interface
 * 
 * This component provides a complete search interface with filters, 
 * document display, and AI-powered search capabilities.
 * 
 * Usage:
 * 1. Include this file in your page
 * 2. Initialize with: SearchSection.init(options)
 * 3. Customize with configuration options
 */

class SearchSection {
    constructor(options = {}) {
        this.config = {
            apiBase: options.apiBase || window.APP_CONFIG?.API_BASE || 'https://symbia.it:5000',
            devModeNoResults: options.devModeNoResults || false,
            containerId: options.containerId || 'searchSection',
            onSearchResults: options.onSearchResults || null,
            onFilterChange: options.onFilterChange || null,
            customPlaceholder: options.customPlaceholder || 'Cerca una dispensa...',
            ...options
        };
        
        this.state = {
            searchQuery: '',
            isAiSearchEnabled: false,
            activeFilters: {},
            searchResults: [],
            currentPage: 1,
            totalPages: 1,
            isLoading: false,
            sortOrder: 'relevance'
        };
        
        this.elements = {};
        this.authToken = localStorage.getItem('authToken');
        this.cacheBuster = Date.now();
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initializeFilters();
        this.loadInitialData();
        
        // Make debug function globally accessible
        window.debugSearchSection = () => this.debug();
        
        console.log('🚀 Search Section Component initialized');
    }
    
    cacheElements() {
        const container = document.getElementById(this.config.containerId);
        if (!container) {
            console.error(`Search section container with ID "${this.config.containerId}" not found`);
            return;
        }
        
        this.elements = {
            container,
            searchInput: container.querySelector('#searchInput'),
            searchSection: container.querySelector('.search-section'),
            documentsGrid: container.querySelector('#documentsGrid'),
            documentCount: container.querySelector('#documentCount'),
            documentCountContainer: container.querySelector('#documentCountContainer'),
            filtersBtn: container.querySelector('#filtersBtn'),
            filtersPanel: container.querySelector('#filtersPanel'),
            filtersOverlay: container.querySelector('#filtersOverlay'),
            aiSearchToggle: container.querySelector('#aiSearchToggle'),
            orderBtn: container.querySelector('#orderBtn'),
            orderDropdown: container.querySelector('.order-dropdown-content'),
            scrollToTopBtn: container.querySelector('#scrollToTopBtn'),
            filterCount: container.querySelector('#filterCount'),
            activeFiltersDisplay: container.querySelector('#activeFiltersDisplay')
        };
        
        // Update placeholder if custom one is provided
        if (this.elements.searchInput && this.config.customPlaceholder) {
            this.elements.searchInput.placeholder = this.config.customPlaceholder;
        }
    }
    
    bindEvents() {
        if (!this.elements.searchInput) return;
        
        // Search input events
        this.elements.searchInput.addEventListener('input', 
            this.debounce((e) => this.handleSearchInput(e), 300)
        );
        this.elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch();
            }
        });
        
        // AI search toggle
        if (this.elements.aiSearchToggle) {
            this.elements.aiSearchToggle.addEventListener('change', (e) => {
                this.state.isAiSearchEnabled = e.target.checked;
                this.performSearch();
            });
        }
        
        // Filters button
        if (this.elements.filtersBtn) {
            this.elements.filtersBtn.addEventListener('click', () => this.toggleFilters());
        }
        
        // Filters overlay
        if (this.elements.filtersOverlay) {
            this.elements.filtersOverlay.addEventListener('click', () => this.closeFilters());
        }
        
        // Filters close button
        const filtersClose = this.elements.container?.querySelector('#filtersClose');
        if (filtersClose) {
            filtersClose.addEventListener('click', () => this.closeFilters());
        }
        
        // Clear all filters button
        const clearAllFilters = this.elements.container?.querySelector('#clearAllFilters');
        if (clearAllFilters) {
            clearAllFilters.addEventListener('click', () => this.clearFilters());
        }
        
        // Order dropdown
        if (this.elements.orderBtn) {
            this.elements.orderBtn.addEventListener('click', () => this.toggleOrderDropdown());
        }
        
        if (this.elements.orderDropdown) {
            this.elements.orderDropdown.addEventListener('click', (e) => {
                const option = e.target.closest('.order-option');
                if (option) {
                    this.handleOrderChange(option.dataset.order);
                }
            });
        }
        
        // Scroll to top button
        if (this.elements.scrollToTopBtn) {
            this.elements.scrollToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            
            window.addEventListener('scroll', this.debounce(() => {
                const shouldShow = window.scrollY > 300;
                this.elements.scrollToTopBtn.style.display = shouldShow ? 'flex' : 'none';
            }, 100));
        }
        
        // Document interactions
        if (this.elements.documentsGrid) {
            this.elements.documentsGrid.addEventListener('click', (e) => {
                this.handleDocumentClick(e);
            });
        }
        
        // Window resize for responsive behavior
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));
    }
    
    initializeFilters() {
        // Initialize all filter components
        this.initDropdownFilters();
        this.initRangeFilters();
        this.initToggleFilters();
        this.initRatingFilter();
    }
    
    initDropdownFilters() {
        const dropdowns = this.elements.container?.querySelectorAll('.dropdown-container');
        if (!dropdowns) return;
        
        dropdowns.forEach(dropdown => {
            const input = dropdown.querySelector('.dropdown-input');
            const content = dropdown.querySelector('.dropdown-content');
            const arrow = dropdown.querySelector('.dropdown-arrow');
            
            if (!input || !content) return;
            
            // Toggle dropdown
            input.addEventListener('click', () => {
                this.toggleDropdown(dropdown);
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) {
                    this.closeDropdown(dropdown);
                }
            });
            
            // Handle option selection
            content.addEventListener('click', (e) => {
                const option = e.target.closest('[data-value]');
                if (option) {
                    this.selectDropdownOption(dropdown, option);
                }
            });
        });
    }
    
    initRangeFilters() {
        // Price range filter
        const priceContainer = this.elements.container?.querySelector('#priceRangeContainer');
        if (priceContainer) {
            this.initDualRangeSlider(priceContainer, 'price');
        }
        
        // Pages range filter
        const pagesContainer = this.elements.container?.querySelector('#pagesRangeContainer');
        if (pagesContainer) {
            this.initDualRangeSlider(pagesContainer, 'pages');
        }
    }
    
    initToggleFilters() {
        // Price toggles
        const priceToggles = this.elements.container?.querySelectorAll('.price-toggle');
        if (priceToggles) {
            priceToggles.forEach(toggle => {
                toggle.addEventListener('click', () => {
                    this.handlePriceToggle(toggle);
                });
            });
        }
        
        // Vetrina toggles
        const vetrinaToggles = this.elements.container?.querySelectorAll('.vetrina-toggle');
        if (vetrinaToggles) {
            vetrinaToggles.forEach(toggle => {
                toggle.addEventListener('click', () => {
                    this.handleVetrinaToggle(toggle);
                });
            });
        }
    }
    
    initRatingFilter() {
        const ratingFilter = this.elements.container?.querySelector('#ratingFilter');
        if (!ratingFilter) return;
        
        const stars = ratingFilter.querySelectorAll('.rating-star-filter');
        const ratingText = this.elements.container?.querySelector('#ratingText');
        
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.dataset.rating);
                this.setRatingFilter(rating, stars, ratingText);
            });
            
            star.addEventListener('mouseenter', () => {
                this.previewRating(parseInt(star.dataset.rating), stars);
            });
        });
        
        ratingFilter.addEventListener('mouseleave', () => {
            this.resetRatingPreview(stars);
        });
    }
    
    // Search functionality
    handleSearchInput(e) {
        this.state.searchQuery = e.target.value;
        if (this.state.searchQuery.length >= 2 || this.state.searchQuery.length === 0) {
            this.performSearch();
        }
    }
    
    async performSearch() {
        if (this.state.isLoading) return;
        
        this.state.isLoading = true;
        this.showLoadingState();
        
        try {
            const results = await this.fetchSearchResults();
            this.handleSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            this.showErrorState();
        } finally {
            this.state.isLoading = false;
        }
    }
    
    async fetchSearchResults() {
        if (this.config.devModeNoResults) {
            return { documents: [], total: 0 };
        }
        
        const searchParams = new URLSearchParams({
            q: this.state.searchQuery,
            page: this.state.currentPage,
            sort: this.state.sortOrder,
            ai: this.state.isAiSearchEnabled,
            ...this.state.activeFilters,
            _t: this.cacheBuster
        });
        
        const response = await fetch(`${this.config.apiBase}/api/search?${searchParams}`, {
            headers: {
                'Authorization': this.authToken ? `Bearer ${this.authToken}` : '',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Search API error: ${response.status}`);
        }
        
        return await response.json();
    }
    
    handleSearchResults(results) {
        this.state.searchResults = results.documents || [];
        this.state.totalPages = Math.ceil((results.total || 0) / 20);
        
        this.renderDocuments();
        this.updateDocumentCount(results.total || 0);
        this.updateSearchSectionState();
        
        // Call custom result handler if provided
        if (this.config.onSearchResults) {
            this.config.onSearchResults(results);
        }
    }
    
    renderDocuments() {
        if (!this.elements.documentsGrid) return;
        
        if (this.state.searchResults.length === 0) {
            this.showNoResults();
            return;
        }
        
        const documentsHTML = this.state.searchResults.map(doc => 
            this.createDocumentCard(doc)
        ).join('');
        
        this.elements.documentsGrid.innerHTML = documentsHTML;
    }
    
    createDocumentCard(document) {
        return `
            <div class="document-card" data-id="${document.id}">
                <div class="document-preview">
                    <img src="${document.thumbnailUrl || '/placeholder.jpg'}" alt="${document.title}" loading="lazy">
                    ${document.rating ? `<div class="rating-badge">${document.rating}</div>` : ''}
                </div>
                <button class="favorite-btn ${document.isFavorite ? 'active' : ''}" data-id="${document.id}">
                    <i class="material-symbols-outlined">favorite</i>
                </button>
                <div class="document-content">
                    <div class="document-header">
                        <div class="document-title-section">
                            <h3 class="document-title">${document.title}</h3>
                            <p class="document-author">di ${document.author}</p>
                        </div>
                    </div>
                    <div class="document-info">
                        <div class="info-item">
                            <i class="material-symbols-outlined">school</i>
                            <span>${document.faculty}</span>
                        </div>
                        <div class="info-item">
                            <i class="material-symbols-outlined">book</i>
                            <span>${document.course}</span>
                        </div>
                        <div class="info-item">
                            <i class="material-symbols-outlined">description</i>
                            <span>${document.pages} pagine</span>
                        </div>
                        <div class="info-item">
                            <i class="material-symbols-outlined">language</i>
                            <span>${document.language}</span>
                        </div>
                    </div>
                    <div class="document-footer">
                        <div class="document-meta">
                            <img src="${document.sellerAvatar}" alt="${document.sellerName}" class="seller-avatar">
                            <span class="seller-name">${document.sellerName}</span>
                        </div>
                        <div class="document-price">
                            ${document.price === 0 ? 'Gratis' : `€${document.price}`}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    showLoadingState() {
        if (!this.elements.documentsGrid) return;
        
        const loadingCards = Array(8).fill(0).map(() => `
            <div class="document-card loading-card">
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
            </div>
        `).join('');
        
        this.elements.documentsGrid.innerHTML = loadingCards;
    }
    
    showNoResults() {
        if (!this.elements.documentsGrid) return;
        
        this.elements.documentsGrid.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">
                    <i class="material-symbols-outlined">search_off</i>
                </div>
                <h3>Nessun risultato trovato</h3>
                <p>Prova a modificare i termini di ricerca o i filtri.</p>
            </div>
        `;
    }
    
    showErrorState() {
        if (!this.elements.documentsGrid) return;
        
        this.elements.documentsGrid.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="material-symbols-outlined">error</i>
                </div>
                <h3>Errore durante la ricerca</h3>
                <p>Si è verificato un errore. Riprova più tardi.</p>
                <button class="retry-btn" onclick="searchSection.performSearch()">Riprova</button>
            </div>
        `;
    }
    
    updateDocumentCount(total) {
        if (this.elements.documentCount) {
            this.elements.documentCount.textContent = `${total} documenti trovati`;
        }
    }
    
    updateSearchSectionState() {
        if (this.elements.searchSection) {
            const hasResults = this.state.searchResults.length > 0;
            this.elements.searchSection.classList.toggle('has-results', hasResults);
            this.elements.searchSection.classList.toggle('no-results', !hasResults);
        }
    }
    
    // Filter functionality
    toggleFilters() {
        if (!this.elements.filtersPanel || !this.elements.filtersOverlay) return;
        
        const isOpen = this.elements.filtersPanel.classList.contains('open');
        
        if (isOpen) {
            this.closeFilters();
        } else {
            this.openFilters();
        }
    }
    
    openFilters() {
        if (!this.elements.filtersPanel || !this.elements.filtersOverlay) return;
        
        this.elements.filtersPanel.classList.add('open');
        this.elements.filtersOverlay.classList.add('active');
        document.body.classList.add('filters-open');
    }
    
    closeFilters() {
        if (!this.elements.filtersPanel || !this.elements.filtersOverlay) return;
        
        this.elements.filtersPanel.classList.remove('open');
        this.elements.filtersOverlay.classList.remove('active');
        document.body.classList.remove('filters-open');
    }
    
    toggleOrderDropdown() {
        if (!this.elements.orderDropdown) return;
        
        const isOpen = this.elements.orderDropdown.classList.contains('show');
        if (isOpen) {
            this.elements.orderDropdown.classList.remove('show');
        } else {
            this.elements.orderDropdown.classList.add('show');
        }
    }
    
    handleOrderChange(order) {
        this.state.sortOrder = order;
        
        // Update button text
        if (this.elements.orderBtn) {
            const orderText = this.elements.orderBtn.querySelector('.order-text');
            const orderOptions = {
                'relevance': 'Rilevanza',
                'reviews': 'Recensioni', 
                'price-lowest': 'Prezzo crescente',
                'price-highest': 'Prezzo decrescente',
                'date-newest': 'Più recenti',
                'date-oldest': 'Meno recenti',
                'name-asc': 'Nome A-Z',
                'name-desc': 'Nome Z-A'
            };
            
            if (orderText) {
                orderText.textContent = orderOptions[order] || 'Rilevanza';
            }
        }
        
        // Close dropdown
        if (this.elements.orderDropdown) {
            this.elements.orderDropdown.classList.remove('show');
        }
        
        // Perform new search
        this.performSearch();
    }
    
    toggleDropdown(dropdown) {
        const isOpen = dropdown.classList.contains('open');
        
        // Close all other dropdowns
        const allDropdowns = this.elements.container.querySelectorAll('.dropdown-container');
        allDropdowns.forEach(d => d.classList.remove('open'));
        
        // Toggle this dropdown
        if (!isOpen) {
            dropdown.classList.add('open');
        }
    }
    
    closeDropdown(dropdown) {
        dropdown.classList.remove('open');
    }
    
    selectDropdownOption(dropdown, option) {
        const input = dropdown.querySelector('.dropdown-input');
        const value = option.dataset.value;
        const text = option.textContent.trim();
        
        if (input) {
            input.value = text;
            input.dataset.value = value;
        }
        
        // Update filters
        const filterType = dropdown.dataset.dropdown;
        if (filterType) {
            this.state.activeFilters[filterType] = value;
            this.updateFilterDisplay();
            this.performSearch();
        }
        
        this.closeDropdown(dropdown);
    }
    
    initDualRangeSlider(container, type) {
        const minSlider = container.querySelector('.range-slider-min');
        const maxSlider = container.querySelector('.range-slider-max');
        const rangeFill = container.querySelector('.range-fill');
        const minValue = container.querySelector(`#min${type.charAt(0).toUpperCase() + type.slice(1)}Value`);
        const maxValue = container.querySelector(`#max${type.charAt(0).toUpperCase() + type.slice(1)}Value`);
        
        if (!minSlider || !maxSlider || !rangeFill) return;
        
        const updateSlider = () => {
            const min = parseInt(minSlider.min);
            const max = parseInt(minSlider.max);
            const minVal = parseInt(minSlider.value);
            const maxVal = parseInt(maxSlider.value);
            
            // Ensure min doesn't exceed max
            if (minVal > maxVal - 1) {
                minSlider.value = maxVal - 1;
            }
            
            // Ensure max doesn't go below min
            if (maxVal < minVal + 1) {
                maxSlider.value = minVal + 1;
            }
            
            // Update visual fill
            const minPercent = ((minSlider.value - min) / (max - min)) * 100;
            const maxPercent = ((maxSlider.value - min) / (max - min)) * 100;
            
            rangeFill.style.left = minPercent + '%';
            rangeFill.style.width = (maxPercent - minPercent) + '%';
            
            // Update value displays
            if (minValue) {
                minValue.textContent = type === 'price' ? `€${minSlider.value}` : minSlider.value;
            }
            if (maxValue) {
                maxValue.textContent = type === 'price' ? `€${maxSlider.value}` : maxSlider.value;
            }
            
            // Update filters
            this.state.activeFilters[`${type}Min`] = minSlider.value;
            this.state.activeFilters[`${type}Max`] = maxSlider.value;
        };
        
        minSlider.addEventListener('input', updateSlider);
        maxSlider.addEventListener('input', updateSlider);
        
        // Initialize
        updateSlider();
    }
    
    handlePriceToggle(toggle) {
        const allToggles = this.elements.container.querySelectorAll('.price-toggle');
        allToggles.forEach(t => t.classList.remove('active'));
        toggle.classList.add('active');
        
        const priceType = toggle.dataset.price;
        this.state.activeFilters.priceType = priceType;
        
        // Show/hide price range based on selection
        const priceRangeContainer = this.elements.container.querySelector('#priceRangeContainer');
        if (priceRangeContainer) {
            priceRangeContainer.style.display = priceType === 'all' ? 'block' : 'none';
        }
        
        this.updateFilterDisplay();
        this.performSearch();
    }
    
    handleVetrinaToggle(toggle) {
        const allToggles = this.elements.container.querySelectorAll('.vetrina-toggle');
        allToggles.forEach(t => t.classList.remove('active'));
        toggle.classList.add('active');
        
        const vetrinaType = toggle.dataset.vetrina;
        this.state.activeFilters.vetrinaType = vetrinaType;
        
        this.updateFilterDisplay();
        this.performSearch();
    }
    
    setRatingFilter(rating, stars, ratingText) {
        this.state.activeFilters.minRating = rating;
        
        // Update visual state
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        
        // Update text
        if (ratingText) {
            ratingText.textContent = rating === 0 ? 'Qualsiasi rating' : `${rating}+ stelle`;
        }
        
        this.updateFilterDisplay();
        this.performSearch();
    }
    
    previewRating(rating, stars) {
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('preview');
            } else {
                star.classList.remove('preview');
            }
        });
    }
    
    resetRatingPreview(stars) {
        stars.forEach(star => {
            star.classList.remove('preview');
        });
    }
    
    // Utility functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    async loadInitialData() {
        try {
            await this.loadFilterOptions();
            this.performSearch();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }
    
    async loadFilterOptions() {
        // Load filter options from API
        // This would populate dropdowns with available faculties, courses, etc.
    }
    
    handleResize() {
        // Handle responsive behavior
        this.updateGridLayout();
    }
    
    updateGridLayout() {
        // Update grid layout based on screen size
    }
    
    handleDocumentClick(e) {
        const card = e.target.closest('.document-card');
        const favoriteBtn = e.target.closest('.favorite-btn');
        
        if (favoriteBtn) {
            e.preventDefault();
            this.toggleFavorite(favoriteBtn.dataset.id);
        } else if (card) {
            this.openDocument(card.dataset.id);
        }
    }
    
    toggleFavorite(documentId) {
        // Toggle favorite status
        console.log('Toggle favorite:', documentId);
    }
    
    openDocument(documentId) {
        // Open document preview or navigate to document page
        console.log('Open document:', documentId);
    }
    
    debug() {
        console.log('🔍 Search Section Debug Info:');
        console.log('State:', this.state);
        console.log('Config:', this.config);
        console.log('Elements:', this.elements);
    }
    
    // Public API methods
    setSearchQuery(query) {
        this.state.searchQuery = query;
        if (this.elements.searchInput) {
            this.elements.searchInput.value = query;
        }
        this.performSearch();
    }
    
    setFilters(filters) {
        this.state.activeFilters = { ...this.state.activeFilters, ...filters };
        this.updateFilterDisplay();
        this.performSearch();
    }
    
    clearFilters() {
        this.state.activeFilters = {};
        this.updateFilterDisplay();
        this.performSearch();
    }
    
    updateFilterDisplay() {
        const count = Object.keys(this.state.activeFilters).length;
        if (this.elements.filterCount) {
            this.elements.filterCount.textContent = count;
            this.elements.filterCount.style.display = count > 0 ? 'inline' : 'none';
        }
    }
    
    destroy() {
        // Clean up event listeners and references
        window.debugSearchSection = null;
        this.elements = {};
    }
}

// Global initialization function
window.SearchSection = SearchSection;

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const searchContainer = document.getElementById('searchSection');
    if (searchContainer && !window.searchSection) {
        window.searchSection = new SearchSection();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchSection;
}