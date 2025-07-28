/**
 * SearchSectionComponent - Instance-based web component
 * 
 * This component creates isolated, reusable search section instances that can
 * be used multiple times on the same page without conflicts.
 * 
 * Usage:
 *   const searchComponent = new SearchSectionComponent(containerElement);
 *   searchComponent.init();
 */

class SearchSectionComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.instanceId = this.generateInstanceId();
        this.options = {
            apiBase: options.apiBase || window.APP_CONFIG?.API_BASE || 'https://symbia.it:5000',
            devMode: options.devMode || false,
            ...options
        };
        
        // Instance-specific state
        this.state = {
            authToken: localStorage.getItem('authToken'),
            isInitialized: false,
            cacheBuster: Date.now()
        };
        
        // Instance-specific DOM cache
        this.dom = {};
        
        // Bound methods for event listeners
        this.boundMethods = {};
    }
    
    /**
     * Generate unique instance ID to avoid conflicts
     */
    generateInstanceId() {
        return 'search-section-' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Initialize the component
     */
    async init() {
        if (this.state.isInitialized) {
            console.warn('SearchSectionComponent already initialized');
            return;
        }
        
        this.injectHTML();
        this.injectCSS();
        this.initializeDOM();
        this.bindEvents();
        
        // Initialize component subsystems
        await this.initializeComponent();
        
        this.state.isInitialized = true;
        
        console.log(`SearchSectionComponent initialized with ID: ${this.instanceId}`);
    }
    
    /**
     * Inject HTML template with instance-specific IDs
     */
    injectHTML() {
        const html = `

<!-- Main Content - Centered Search Interface -->
<main class="main-content" id="${this.instanceId}-mainContent">
    <!-- Search Section with integrated cards -->
    <div class="search-section has-results" id="${this.instanceId}-searchSection">
        <div class="search-container-wrapper">
            <div class="search-container">
                <div class="search-bar-wrapper">
                    <div class="search-bar-background" id="${this.instanceId}-searchBarBackground"></div>
                    <div class="search-bar">
                        <input type="text" class="search-input" id="${this.instanceId}-searchInput" placeholder="Cerca una dispensa...">
                        <input class="toggle-input" id="${this.instanceId}-toggle" name="${this.instanceId}-toggle" type="checkbox" />
                        <label class="toggle-label" for="${this.instanceId}-toggle" id="${this.instanceId}-aiSearchToggle">
                          <div class="cont-icon">
                            <span style="--width: 2; --deg: 25; --duration: 11" class="sparkle"></span>
                            <span style="--width: 1; --deg: 100; --duration: 18" class="sparkle"></span>
                            <span style="--width: 1; --deg: 280; --duration: 5" class="sparkle"></span>
                            <span style="--width: 2; --deg: 200; --duration: 3" class="sparkle"></span>
                            <span style="--width: 2; --deg: 30; --duration: 20" class="sparkle"></span>
                            <span style="--width: 2; --deg: 300; --duration: 9" class="sparkle"></span>
                            <span style="--width: 1; --deg: 250; --duration: 4" class="sparkle"></span>
                            <span style="--width: 2; --deg: 210; --duration: 8" class="sparkle"></span>
                            <span style="--width: 2; --deg: 100; --duration: 9" class="sparkle"></span>
                            <span style="--width: 1; --deg: 15; --duration: 13" class="sparkle"></span>
                            <span style="--width: 1; --deg: 75; --duration: 18" class="sparkle"></span>
                            <span style="--width: 2; --deg: 65; --duration: 6" class="sparkle"></span>
                            <span style="--width: 2; --deg: 50; --duration: 7" class="sparkle"></span>
                            <span style="--width: 1; --deg: 320; --duration: 5" class="sparkle"></span>
                            <span style="--width: 1; --deg: 220; --duration: 5" class="sparkle"></span>
                            <span style="--width: 1; --deg: 215; --duration: 2" class="sparkle"></span>
                            <span style="--width: 2; --deg: 135; --duration: 9" class="sparkle"></span>
                            <span style="--width: 2; --deg: 45; --duration: 4" class="sparkle"></span>
                            <span style="--width: 1; --deg: 78; --duration: 16" class="sparkle"></span>
                            <span style="--width: 1; --deg: 89; --duration: 19" class="sparkle"></span>
                            <span style="--width: 2; --deg: 65; --duration: 14" class="sparkle"></span>
                            <span style="--width: 2; --deg: 97; --duration: 1" class="sparkle"></span>
                            <span style="--width: 1; --deg: 174; --duration: 10" class="sparkle"></span>
                            <span style="--width: 1; --deg: 236; --duration: 5" class="sparkle"></span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" class="icon">
                              <path d="M0.96233 28.61C1.36043 29.0081 1.96007 29.1255 2.47555 28.8971L10.4256 25.3552C13.2236 24.11 16.4254 24.1425 19.2107 25.4401L27.4152 29.2747C27.476 29.3044 27.5418 29.3023 27.6047 29.32C27.6563 29.3348 27.7079 29.3497 27.761 29.3574C27.843 29.3687 27.9194 29.3758 28 29.3688C28.1273 29.3617 28.2531 29.3405 28.3726 29.2945C28.4447 29.262 28.5162 29.2287 28.5749 29.1842C28.6399 29.1446 28.6993 29.0994 28.7509 29.0477L28.9008 28.8582C28.9468 28.7995 28.9793 28.7274 29.0112 28.656C29.0599 28.5322 29.0811 28.4036 29.0882 28.2734C29.0939 28.1957 29.0868 28.1207 29.0769 28.0415C29.0705 27.9955 29.0585 27.9524 29.0472 27.9072C29.0295 27.8343 29.0302 27.7601 28.9984 27.6901L25.1638 19.4855C23.8592 16.7073 23.8273 13.5048 25.0726 10.7068L28.6145 2.75679C28.8429 2.24131 28.7318 1.63531 28.3337 1.2372C27.9165 0.820011 27.271 0.721743 26.7491 0.9961L19.8357 4.59596C16.8418 6.15442 13.2879 6.18696 10.2615 4.70062L1.80308 0.520214C1.7055 0.474959 1.60722 0.441742 1.50964 0.421943C1.44459 0.409215 1.37882 0.395769 1.3074 0.402133C1.14406 0.395769 0.981436 0.428275 0.818095 0.499692C0.77284 0.519491 0.719805 0.545671 0.67455 0.578198C0.596061 0.617088 0.524653 0.675786 0.4596 0.74084C0.394546 0.805894 0.335843 0.877306 0.296245 0.956502C0.263718 1.00176 0.237561 1.05477 0.217762 1.10003C0.152708 1.24286 0.126545 1.40058 0.120181 1.54978C0.120181 1.61483 0.126527 1.6735 0.132891 1.73219C0.15269 1.85664 0.178881 1.97332 0.237571 2.08434L4.41798 10.5427C5.91139 13.5621 5.8725 17.1238 4.3204 20.1099L0.720514 27.0233C0.440499 27.5536 0.545137 28.1928 0.96233 28.61Z"></path>
                            </svg>
                          </div>
                        </label>
                    </div>
                </div>
                <button class="filters-btn" id="${this.instanceId}-filtersBtn">
                    <i class="material-symbols-outlined">tune</i>
                    <span class="filters-text">Filtri</span>
                    <span class="filter-count" id="${this.instanceId}-filterCount">0</span>
                </button>
            </div>
        </div>
        
        <!-- Document Count and Active Filters Display -->
        <div id="${this.instanceId}-documentCountContainer" class="document-count-container" style="display: block;">
            <div class="document-count-and-filters">
                <span id="${this.instanceId}-documentCount" class="document-count">Caricamento...</span>
                
                <!-- Order Dropdown Button -->
                <span class="order-label" style="font-weight: 500; color: #64748b; font-size: 0.95em;">Ordina per:</span>
                <div class="order-dropdown-container">
                    <button class="order-btn" id="${this.instanceId}-orderBtn">
                        <svg class="sort-icon" width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                            <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none">
                                <path d="M1982 4688 c-24 -4 -56 -15 -70 -25 -52 -35 -1340 -1338 -1358 -1373 -27 -55 -23 -137 10 -194 39 -66 93 -99 170 -104 49 -3 71 0 102 16 23 12 234 216 504 486 l465 466 5 -1693 5 -1694 30 -48 c40 -65 97 -95 179 -95 104 1 182 53 206 138 7 25 10 680 10 2000 0 2134 3 2000 -53 2060 -46 49 -129 74 -205 60z"/>
                                <path d="M2995 4671 c-50 -22 -91 -69 -105 -119 -7 -25 -10 -680 -10 -2000 0 -1749 2 -1967 15 -2000 35 -83 103 -123 207 -123 50 0 77 5 96 18 51 35 1350 1348 1368 1383 10 21 17 57 17 91 0 109 -81 198 -187 207 -105 9 -90 20 -608 -496 l-478 -476 -2 1695 -3 1696 -30 48 c-40 65 -97 95 -179 95 -37 0 -77 -8 -101 -19z"/>
                            </g>
                        </svg>
                        <span class="order-text">Rilevanza</span>
                    </button>
                    <div class="order-dropdown-content">
                        <div class="order-option" data-order="relevance">
                            <span class="material-symbols-outlined">auto_awesome</span>
                            <span class="order-text">Rilevanza</span>
                        </div>
                        <div class="order-option" data-order="reviews">
                            <span class="material-symbols-outlined">star</span>
                            <span class="order-text">Recensioni</span>
                        </div>
                        <div class="order-option" data-order="price-lowest">
                            <span class="material-symbols-outlined">trending_up</span>
                            <span class="order-text">Prezzo crescente</span>
                        </div>
                        <div class="order-option" data-order="price-highest">
                            <span class="material-symbols-outlined">trending_down</span>
                            <span class="order-text">Prezzo decrescente</span>
                        </div>
                        <div class="order-option" data-order="date-newest">
                            <span class="material-symbols-outlined">schedule</span>
                            <span class="order-text">Più recenti</span>
                        </div>
                        <div class="order-option" data-order="date-oldest">
                            <span class="material-symbols-outlined">history</span>
                            <span class="order-text">Meno recenti</span>
                        </div>
                        <div class="order-option" data-order="name-asc">
                            <span class="az-text">AZ</span>
                            <span class="order-text">Nome A-Z</span>
                        </div>
                        <div class="order-option" data-order="name-desc">
                            <span class="az-text">ZA</span>
                            <span class="order-text">Nome Z-A</span>
                        </div>
                    </div>
                </div>
            </div>
            <div id="${this.instanceId}-activeFiltersDisplay" class="active-filters-display" style="padding-bottom: 10px;">
                <!-- Active filter pills will be dynamically added here -->
            </div>
        </div>

        <!-- Documents Grid - Will be populated dynamically -->
        <div class="documents-grid" id="${this.instanceId}-documentsGrid">
            <!-- Initial loading cards to prevent layout shift -->
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
            <!-- Repeat for 6 loading cards total -->
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
        </div>
    </div>
</main>

<!-- Advanced Filters Panel (moved outside main for proper fixed positioning) -->
<div class="filters-panel" id="${this.instanceId}-filtersPanel">
    <div class="filters-content">
        <div class="filters-header">
            <div class="filters-header-top">
            <div class="filters-title">
                <h2>🎯 Filtri</h2>
            </div>
            <div class="filters-actions">
                <button class="filter-clear-btn" id="${this.instanceId}-clearAllFilters">
                    <i class="material-symbols-outlined">clear_all</i>
                    Reset
                </button>
                <button class="filters-close" id="${this.instanceId}-filtersClose">
                    <i class="material-symbols-outlined">close</i>
                </button>
            </div>
            </div>
            <div class="filters-header-bottom">
            <div class="filters-subtitle">Trova esattamente quello che cerchi</div>
            </div>
        </div>

        <div class="filters-grid">
            <!-- Academic Context Section -->
            <div class="filter-section">
                <h3 class="filter-section-title">
                    <i class="material-symbols-outlined">school</i>
                    Contesto Accademico
                </h3>
                <div class="filter-group">
                    <div class="filter-item">
                        <label for="${this.instanceId}-facultyFilter" class="filter-label">Facoltà</label>
                        <div class="dropdown-container" data-dropdown="faculty">
                            <div class="dropdown-input-wrapper">
                                <input type="text" id="${this.instanceId}-facultyFilter" class="dropdown-input" placeholder="Scrivi o scegli una facoltà...">
                                <i class="material-symbols-outlined dropdown-arrow">expand_more</i>
                            </div>
                            <div class="dropdown-content" id="${this.instanceId}-facultyDropdown">
                                <div class="dropdown-options" id="${this.instanceId}-facultyOptions"></div>
                            </div>
                        </div>
                    </div>
                    <div class="filter-item">
                        <label for="${this.instanceId}-courseFilter" class="filter-label">Corso</label>
                        <div class="dropdown-container" data-dropdown="course">
                            <div class="dropdown-input-wrapper">
                                <input type="text" id="${this.instanceId}-courseFilter" class="dropdown-input" placeholder="Scrivi o scegli un corso...">
                                <i class="material-symbols-outlined dropdown-arrow">expand_more</i>
                            </div>
                            <div class="dropdown-content" id="${this.instanceId}-courseDropdown">
                                <div class="dropdown-options" id="${this.instanceId}-courseOptions"></div>
                            </div>
                        </div>
                    </div>
                    <div class="filter-item">
                        <label for="${this.instanceId}-canaleFilter" class="filter-label">Canale</label>
                        <div class="dropdown-container" data-dropdown="canale">
                            <div class="dropdown-input-wrapper">
                                <input type="text" id="${this.instanceId}-canaleFilter" class="dropdown-input" placeholder="Scrivi o scegli un canale...">
                                <i class="material-symbols-outlined dropdown-arrow">expand_more</i>
                            </div>
                            <div class="dropdown-content" id="${this.instanceId}-canaleDropdown">
                                <div class="dropdown-options" id="${this.instanceId}-canaleOptions"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Document Properties Section -->
            <div class="filter-section">
                <h3 class="filter-section-title">
                    <i class="material-symbols-outlined">description</i>
                    Tipologia Documento
                </h3>
                <div class="filter-group">
                    <div class="filter-item">
                        <label for="${this.instanceId}-tagFilter" class="filter-label">Tipo Documento</label>
                        <div class="dropdown-container" data-dropdown="tag">
                            <div class="dropdown-input-wrapper">
                                <input type="text" id="${this.instanceId}-tagFilter" class="dropdown-input" placeholder="Tutti i tipi" readonly>
                                <i class="material-symbols-outlined dropdown-arrow">expand_more</i>
                            </div>
                            <div class="dropdown-content" id="${this.instanceId}-tagDropdown">
                                <div class="dropdown-options" id="${this.instanceId}-tagOptions"></div>
                            </div>
                        </div>
                    </div>
                    <div class="filter-item">
                        <label for="${this.instanceId}-documentTypeFilter" class="filter-label">Formato file</label>
                        <div class="dropdown-container" data-dropdown="documentType">
                            <div class="dropdown-input-wrapper">
                                <input type="text" id="${this.instanceId}-documentTypeFilter" class="dropdown-input" placeholder="Tutti i formati" readonly>
                                <i class="material-symbols-outlined dropdown-arrow">expand_more</i>
                            </div>
                            <div class="dropdown-content" id="${this.instanceId}-documentTypeDropdown">
                                <div class="dropdown-options" id="${this.instanceId}-documentTypeOptions"></div>
                            </div>
                        </div>
                    </div>
                    <div class="filter-item">
                        <label for="${this.instanceId}-languageFilter" class="filter-label">Lingua</label>
                        <div class="dropdown-container" data-dropdown="language">
                            <div class="dropdown-input-wrapper">
                                <input type="text" id="${this.instanceId}-languageFilter" class="dropdown-input" placeholder="Tutte le lingue" readonly>
                                <i class="material-symbols-outlined dropdown-arrow">expand_more</i>
                            </div>
                            <div class="dropdown-content" id="${this.instanceId}-languageDropdown">
                                <div class="dropdown-options" id="${this.instanceId}-languageOptions"></div>
                            </div>
                        </div>
                    </div>
                    <div class="filter-item">
                        <label class="filter-label">Tipo Vetrina</label>
                        <div class="vetrina-toggle-group">
                            <button class="vetrina-toggle active" data-vetrina="all">
                                <i class="material-symbols-outlined">select_all</i>
                                Tutte
                            </button>
                            <button class="vetrina-toggle" data-vetrina="single">
                                <i class="material-symbols-outlined">description</i>
                                Singolo File
                            </button>
                            <button class="vetrina-toggle" data-vetrina="multiple">
                                <i class="material-symbols-outlined">folder</i>
                                Pacchetti
                            </button>
                        </div>
                    </div>
                    <!-- Pagine Filter -->
                    <div class="filter-item" id="${this.instanceId}-pagesRangeContainer">
                        <label class="filter-label">Numero di Pagine</label>
                        <div class="pages-range-filter">
                            <div class="dual-range-container">
                                <div class="range-track">
                                    <div class="range-fill" id="${this.instanceId}-pagesRangeFill"></div>
                                </div>
                                <input type="range" id="${this.instanceId}-minPagesRange" class="range-slider range-slider-min" min="1" max="1000" value="1" step="1">
                                <input type="range" id="${this.instanceId}-maxPagesRange" class="range-slider range-slider-max" min="1" max="1000" value="1000" step="1">
                            </div>
                            <div class="range-values">
                                <span id="${this.instanceId}-minPagesValue" class="editable-value" data-type="pages" data-position="min" data-tooltip="Clicca per modificare">1</span><span id="${this.instanceId}-maxPagesValue" class="editable-value" data-type="pages" data-position="max" data-tooltip="Clicca per modificare">1000</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Academic Period Section -->
            <div class="filter-section">
                <h3 class="filter-section-title">
                    <i class="material-symbols-outlined">calendar_month</i>
                    Periodo Accademico
                </h3>
                <div class="filter-group">
                    <div class="filter-item">
                        <label for="${this.instanceId}-academicYearFilter" class="filter-label">Anno Accademico</label>
                        <div class="dropdown-container" data-dropdown="academicYear">
                            <div class="dropdown-input-wrapper">
                                <input type="text" id="${this.instanceId}-academicYearFilter" class="dropdown-input" placeholder="Tutti gli anni" readonly>
                                <i class="material-symbols-outlined dropdown-arrow">expand_more</i>
                            </div>
                            <div class="dropdown-content" id="${this.instanceId}-academicYearDropdown">
                                <div class="dropdown-options" id="${this.instanceId}-academicYearOptions"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quality & Engagement Section -->
            <div class="filter-section">
                <h3 class="filter-section-title">
                    <i class="material-symbols-outlined">star</i>
                    Qualità & Engagement
                </h3>
                <div class="filter-group">
                    <div class="filter-item">
                        <label class="filter-label">Rating Minimo</label>
                        <div class="rating-filter">
                            <div class="rating-stars-filter" id="${this.instanceId}-ratingFilter">
                                <span class="rating-star-filter" data-rating="1">★</span>
                                <span class="rating-star-filter" data-rating="2">★</span>
                                <span class="rating-star-filter" data-rating="3">★</span>
                                <span class="rating-star-filter" data-rating="4">★</span>
                                <span class="rating-star-filter" data-rating="5">★</span>
                            </div>
                            <span class="rating-text" id="${this.instanceId}-ratingText">Qualsiasi rating</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Price & Availability Section -->
            <div class="filter-section">
                <h3 class="filter-section-title">
                    <i class="material-symbols-outlined">payments</i>
                    Prezzo & Disponibilità
                </h3>
                <div class="filter-group">
                    <div class="filter-item">
                        <label class="filter-label">Prezzo</label>
                        <div class="price-toggle-group">
                            <button class="price-toggle active" data-price="all">
                                <i class="material-symbols-outlined">select_all</i>
                                Tutti
                            </button>
                            <button class="price-toggle" data-price="free">
                                <i class="material-symbols-outlined">volunteer_activism</i>
                                Gratis
                            </button>
                            <button class="price-toggle" data-price="paid">
                                <i class="material-symbols-outlined">paid</i>
                                A Pagamento
                            </button>
                        </div>
                    </div>
                    <div class="filter-item" id="${this.instanceId}-priceRangeContainer">
                        <label class="filter-label">Range di Prezzo (€)</label>
                        <div class="price-range-filter">
                            <div class="dual-range-container">
                                <div class="range-track">
                                    <div class="range-fill" id="${this.instanceId}-rangeFill"></div>
                                </div>
                                <input type="range" id="${this.instanceId}-minPriceRange" class="range-slider range-slider-min" min="0" max="100" value="0" step="0.5">
                                <input type="range" id="${this.instanceId}-maxPriceRange" class="range-slider range-slider-max" min="0" max="100" value="100" step="0.5">
                            </div>
                            <div class="price-values">
                                <span id="${this.instanceId}-minPriceValue" class="editable-value" data-type="price" data-position="min" data-tooltip="Clicca per modificare">€0</span>
                                <span id="${this.instanceId}-maxPriceValue" class="editable-value" data-type="price" data-position="max" data-tooltip="Clicca per modificare">€100</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Filters Overlay -->
<div class="filters-overlay" id="${this.instanceId}-filtersOverlay"></div>

<!-- Preview Modal -->
<div id="${this.instanceId}-previewModal" class="preview-modal">
    <div class="preview-content">
        <div class="preview-header">
            <h2 class="preview-title" id="${this.instanceId}-previewTitle">Document Preview</h2>
            <button class="preview-close" id="${this.instanceId}-previewCloseBtn">×</button>
        </div>
        <div id="${this.instanceId}-previewBody" class="preview-body">
            <!-- Preview content will be loaded here -->
        </div>
        <div id="${this.instanceId}-previewActions" class="preview-actions">
            <!-- Action buttons will be added here -->
        </div>
    </div>
</div>

<!-- Scroll to Top Button -->
<button class="scroll-to-top-btn" id="${this.instanceId}-scrollToTopBtn" aria-label="Scroll to top of page">
    <i class="material-symbols-outlined">keyboard_arrow_up</i>
</button>

<!-- Reviews Overlay -->
<div class="reviews-overlay" id="${this.instanceId}-reviewsOverlay">
    <div class="reviews-overlay-content">
        <div class="reviews-overlay-header">
            <h2>
                <span class="material-symbols-outlined">rate_review</span>
                Recensioni
            </h2>
            <button class="close-overlay-btn" data-action="close-reviews">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        
        <div class="reviews-overlay-body">
            <div class="reviews-summary">
                <div class="overall-rating">
                    <div class="rating-display">
                        <div class="big-stars"></div>
                        <span class="big-rating-score">0.0</span>
                    </div>
                    <span class="total-reviews">Basato su 0 recensioni</span>
                </div>
                <button class="add-review-btn" data-action="show-review-form">
                    <span class="material-symbols-outlined">add</span>
                    Aggiungi Recensione
                </button>
            </div>
            
            <div class="reviews-list" id="${this.instanceId}-reviewsList">
                <!-- Reviews will be populated here -->
            </div>
            
            <div class="add-review-form" id="${this.instanceId}-addReviewForm" style="display: none;">
                <h3>Aggiungi la tua recensione</h3>
                <div class="rating-input">
                    <label>Valutazione:</label>
                    <div class="star-rating">
                        <span class="star-input" data-rating="1">★</span>
                        <span class="star-input" data-rating="2">★</span>
                        <span class="star-input" data-rating="3">★</span>
                        <span class="star-input" data-rating="4">★</span>
                        <span class="star-input" data-rating="5">★</span>
                    </div>
                </div>
                <div class="review-text-input">
                    <label for="${this.instanceId}-reviewComment">Commento:</label>
                    <textarea id="${this.instanceId}-reviewComment" placeholder="Condividi la tua esperienza con questo documento..." rows="4"></textarea>
                </div>
                <div class="review-form-actions">
                    <button class="cancel-review-btn" data-action="hide-review-form">Annulla</button>
                    <button class="submit-review-btn" data-action="submit-review">Invia Recensione</button>
                </div>
            </div>
        </div>
    </div>
</div>
        `;
        
        this.container.innerHTML = html;
    }
    
    /**
     * Inject CSS styles (scoped to avoid conflicts)
     */
    injectCSS() {
        const cssId = `search-section-styles-${this.instanceId}`;
        
        // Check if styles already exist
        if (document.getElementById(cssId)) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = cssId;
        style.textContent = `
/*
SearchSectionComponent Scoped Styles
Adapted from search-section.css for instance-based usage
*/

/* Component Container Scope */
.search-section-instance-${this.instanceId} {
    /* Ensure component isolation */
    position: relative;
    box-sizing: border-box;
}

.search-section-instance-${this.instanceId} *,
.search-section-instance-${this.instanceId} *::before,
.search-section-instance-${this.instanceId} *::after {
    box-sizing: border-box;
}

/* Material Icons Scoped */
.search-section-instance-${this.instanceId} .material-symbols-outlined {
    font-family: 'Material Symbols Outlined', 'Material Icons', -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: 'liga';
    font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    min-width: 1em;
    min-height: 1em;
    text-align: center;
    vertical-align: middle;
    opacity: 1;
}

/* Design System Variables (Scoped) */
.search-section-instance-${this.instanceId} {
    /* Pure Color Palette */
    --white: #ffffff;
    --white-soft: #fefefe;
    --white-warm: #fdfdfd;
    --gray-50: #fafbfc;
    --gray-100: #f4f6f8;
    --gray-150: #f1f3f5;
    --gray-200: #e9ecef;
    --gray-300: #dee2e6;
    --gray-400: #ced4da;
    --gray-500: #adb5bd;
    --gray-600: #6c757d;
    --gray-700: #495057;
    --gray-800: #343a40;
    --gray-900: #212529;
    --black: #000000;
    
    /* Accent Colors */
    --blue-50: #f0f9ff;
    --blue-500: #0ea5e9;
    --blue-600: #0284c7;
    --blue-700: #0369a1;
    --green-500: #10b981;
    --green-600: #059669;
    --red-500: #ef4444;
    --orange-500: #f97316;
    --purple-500: #8b5cf6;
    --purple-600: #7c3aed;
    --indigo-500: #6366f1;
    --indigo-600: #4f46e5;
    
    /* Gradients */
    --gradient-primary: linear-gradient(135deg, var(--blue-600) 0%, var(--purple-600) 100%);
    --gradient-secondary: linear-gradient(135deg, var(--indigo-500) 0%, var(--purple-500) 100%);
    --gradient-accent: linear-gradient(135deg, var(--orange-500) 0%, var(--red-500) 100%);
    
    /* Shadows */
    --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.02);
    --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.02);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
    --shadow-luxury: 0 32px 64px -12px rgba(0, 0, 0, 0.12), 0 8px 16px -4px rgba(0, 0, 0, 0.05);
    --shadow-glow: 0 0 40px rgba(99, 102, 241, 0.15);
    
    /* Border Radius */
    --radius-xs: 4px;
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --radius-2xl: 20px;
    --radius-3xl: 24px;
    --radius-full: 9999px;
    
    /* Typography */
    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-mono: 'JetBrains Mono', 'SF Mono', Monaco, 'Cascadia Code', monospace;
    --font-display: 'Space Grotesk', var(--font-sans);
    
    /* Spacing Scale */
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.25rem;
    --space-6: 1.5rem;
    --space-8: 2rem;
    --space-10: 2.5rem;
    --space-12: 3rem;
    --space-16: 4rem;
    --space-20: 5rem;
    --space-24: 6rem;
    --space-32: 8rem;
    
    /* Animation */
    --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
    --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
    --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
    --duration-fast: 150ms;
    --duration-normal: 250ms;
    --duration-slow: 350ms;
    --duration-slower: 500ms;
}

/* Main Content */
.search-section-instance-${this.instanceId} .main-content {
    min-height: 100vh;
    width: 100%;
    position: relative;
    font-family: var(--font-sans);
    background: linear-gradient(135deg, var(--gray-50) 0%, var(--blue-50) 100%);
}

/* Search Section */
.search-section-instance-${this.instanceId} .search-section {
    padding: var(--space-8) var(--space-6);
    max-width: 1400px;
    margin: 0 auto;
    position: relative;
}

.search-section-instance-${this.instanceId} .search-container-wrapper {
    margin-bottom: var(--space-8);
}

.search-section-instance-${this.instanceId} .search-container {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    max-width: 800px;
    margin: 0 auto;
}

/* Search Bar */
.search-section-instance-${this.instanceId} .search-bar-wrapper {
    position: relative;
    flex: 1;
}

.search-section-instance-${this.instanceId} .search-bar-background {
    position: absolute;
    inset: 0;
    background: var(--white);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    z-index: 1;
}

.search-section-instance-${this.instanceId} .search-bar {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    padding: var(--space-4);
    gap: var(--space-3);
}

.search-section-instance-${this.instanceId} .search-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 1.1rem;
    font-weight: 500;
    color: var(--gray-900);
    font-family: var(--font-sans);
}

.search-section-instance-${this.instanceId} .search-input::placeholder {
    color: var(--gray-500);
    font-weight: 400;
}

/* AI Toggle */
.search-section-instance-${this.instanceId} .toggle-input {
    display: none;
}

.search-section-instance-${this.instanceId} .toggle-label {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
    background: var(--gray-100);
    cursor: pointer;
    transition: all var(--duration-normal) var(--ease-out);
    overflow: hidden;
}

.search-section-instance-${this.instanceId} .toggle-input:checked + .toggle-label {
    background: var(--gradient-primary);
    box-shadow: var(--shadow-glow);
}

.search-section-instance-${this.instanceId} .cont-icon {
    position: relative;
    width: 24px;
    height: 24px;
}

.search-section-instance-${this.instanceId} .sparkle {
    position: absolute;
    width: calc(var(--width) * 1px);
    height: calc(var(--width) * 1px);
    background: var(--white);
    border-radius: 50%;
    animation: sparkle calc(var(--duration) * 1s) linear infinite;
    transform: rotate(calc(var(--deg) * 1deg));
    transform-origin: 50% 12px;
}

.search-section-instance-${this.instanceId} .icon {
    width: 20px;
    height: 20px;
    fill: var(--gray-600);
    transition: fill var(--duration-normal) var(--ease-out);
}

.search-section-instance-${this.instanceId} .toggle-input:checked + .toggle-label .icon {
    fill: var(--white);
}

@keyframes sparkle {
    0%, 100% { opacity: 0; transform: rotate(calc(var(--deg) * 1deg)) translateY(-12px) scale(0); }
    50% { opacity: 1; transform: rotate(calc(var(--deg) * 1deg)) translateY(-12px) scale(1); }
}

/* Filters Button */
.search-section-instance-${this.instanceId} .filters-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4) var(--space-5);
    background: var(--white);
    border: 2px solid var(--gray-200);
    border-radius: var(--radius-xl);
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-700);
    cursor: pointer;
    transition: all var(--duration-normal) var(--ease-out);
    box-shadow: var(--shadow-sm);
    font-family: var(--font-sans);
}

.search-section-instance-${this.instanceId} .filters-btn:hover {
    border-color: var(--blue-500);
    color: var(--blue-600);
    box-shadow: var(--shadow-md);
}

.search-section-instance-${this.instanceId} .filter-count {
    background: var(--blue-500);
    color: var(--white);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-full);
    font-size: 0.8rem;
    min-width: 20px;
    text-align: center;
    font-weight: 700;
}

/* Document Count Container */
.search-section-instance-${this.instanceId} .document-count-container {
    margin-bottom: var(--space-6);
    padding: 0 var(--space-4);
}

.search-section-instance-${this.instanceId} .document-count-and-filters {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
}

.search-section-instance-${this.instanceId} .document-count {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--gray-700);
}

/* Order Dropdown */
.search-section-instance-${this.instanceId} .order-label {
    font-weight: 500;
    color: var(--gray-600);
    font-size: 0.95rem;
}

.search-section-instance-${this.instanceId} .order-dropdown-container {
    position: relative;
}

.search-section-instance-${this.instanceId} .order-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--white);
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--gray-700);
    cursor: pointer;
    transition: all var(--duration-normal) var(--ease-out);
    font-family: var(--font-sans);
}

.search-section-instance-${this.instanceId} .order-btn:hover {
    border-color: var(--blue-500);
    box-shadow: var(--shadow-sm);
}

.search-section-instance-${this.instanceId} .sort-icon {
    width: 16px;
    height: 16px;
    fill: currentColor;
}

.search-section-instance-${this.instanceId} .order-dropdown-content {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--white);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    min-width: 200px;
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all var(--duration-normal) var(--ease-out);
}

.search-section-instance-${this.instanceId} .order-dropdown-content.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.search-section-instance-${this.instanceId} .order-option {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    cursor: pointer;
    transition: background-color var(--duration-fast) var(--ease-out);
    font-size: 0.9rem;
    color: var(--gray-700);
}

.search-section-instance-${this.instanceId} .order-option:hover {
    background: var(--gray-50);
}

.search-section-instance-${this.instanceId} .order-option:first-child {
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.search-section-instance-${this.instanceId} .order-option:last-child {
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.search-section-instance-${this.instanceId} .az-text {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.8rem;
    background: var(--gray-100);
    padding: 2px 4px;
    border-radius: 4px;
}

/* Active Filters Display */
.search-section-instance-${this.instanceId} .active-filters-display {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
}

.search-section-instance-${this.instanceId} .filter-pill {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--blue-50);
    border: 1px solid var(--blue-200);
    border-radius: var(--radius-full);
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--blue-700);
}

.search-section-instance-${this.instanceId} .filter-pill-remove {
    cursor: pointer;
    padding: 2px;
    border-radius: 50%;
    transition: background-color var(--duration-fast) var(--ease-out);
}

.search-section-instance-${this.instanceId} .filter-pill-remove:hover {
    background: var(--blue-200);
}

/* Documents Grid */
.search-section-instance-${this.instanceId} .documents-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-6);
    padding: var(--space-4);
}

/* Document Cards */
.search-section-instance-${this.instanceId} .document-card {
    background: var(--white);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
    overflow: hidden;
    transition: all var(--duration-normal) var(--ease-out);
    cursor: pointer;
    position: relative;
}

.search-section-instance-${this.instanceId} .document-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-luxury);
}

.search-section-instance-${this.instanceId} .document-preview {
    position: relative;
    height: 200px;
    background: var(--gray-100);
    overflow: hidden;
}

.search-section-instance-${this.instanceId} .document-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--duration-slower) var(--ease-out);
}

.search-section-instance-${this.instanceId} .document-card:hover .document-preview img {
    transform: scale(1.05);
}

.search-section-instance-${this.instanceId} .rating-badge {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    background: rgba(0, 0, 0, 0.8);
    color: var(--white);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-full);
    font-size: 0.8rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 2px;
}

.search-section-instance-${this.instanceId} .document-content {
    padding: var(--space-5);
}

.search-section-instance-${this.instanceId} .document-header {
    margin-bottom: var(--space-4);
}

.search-section-instance-${this.instanceId} .document-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--gray-900);
    margin-bottom: var(--space-1);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.search-section-instance-${this.instanceId} .document-author {
    font-size: 0.9rem;
    color: var(--gray-600);
    font-weight: 500;
}

.search-section-instance-${this.instanceId} .document-info {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
}

.search-section-instance-${this.instanceId} .info-item {
    font-size: 0.8rem;
    color: var(--gray-600);
    background: var(--gray-50);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-weight: 500;
}

.search-section-instance-${this.instanceId} .document-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.search-section-instance-${this.instanceId} .document-meta {
    font-size: 0.8rem;
    color: var(--gray-500);
}

.search-section-instance-${this.instanceId} .document-price {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--green-600);
}

/* Loading Cards */
.search-section-instance-${this.instanceId} .loading-card {
    pointer-events: none;
}

.search-section-instance-${this.instanceId} .skeleton-preview-circle,
.search-section-instance-${this.instanceId} .skeleton-rating-badge,
.search-section-instance-${this.instanceId} .skeleton-preview-bar,
.search-section-instance-${this.instanceId} .skeleton-favorite-button,
.search-section-instance-${this.instanceId} .skeleton-title,
.search-section-instance-${this.instanceId} .skeleton-author,
.search-section-instance-${this.instanceId} .skeleton-line,
.search-section-instance-${this.instanceId} .skeleton-avatar,
.search-section-instance-${this.instanceId} .skeleton-meta,
.search-section-instance-${this.instanceId} .skeleton-price {
    background: linear-gradient(90deg, var(--gray-200) 25%, var(--gray-100) 50%, var(--gray-200) 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
    border-radius: var(--radius-sm);
}

@keyframes skeleton-loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

.search-section-instance-${this.instanceId} .skeleton-preview-circle {
    width: 100%;
    height: 200px;
    border-radius: 0;
}

.search-section-instance-${this.instanceId} .skeleton-title {
    height: 20px;
    width: 80%;
    margin-bottom: var(--space-2);
}

.search-section-instance-${this.instanceId} .skeleton-author {
    height: 16px;
    width: 60%;
}

.search-section-instance-${this.instanceId} .skeleton-line {
    height: 14px;
    width: 100%;
}

/* No Results */
.search-section-instance-${this.instanceId} .no-results {
    grid-column: 1 / -1;
    text-align: center;
    padding: var(--space-16);
    color: var(--gray-600);
}

.search-section-instance-${this.instanceId} .no-results-icon {
    font-size: 4rem;
    margin-bottom: var(--space-4);
}

.search-section-instance-${this.instanceId} .no-results h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: var(--space-2);
    color: var(--gray-900);
}

/* Filters Panel */
.search-section-instance-${this.instanceId} .filters-panel {
    position: fixed;
    top: 0;
    right: -600px;
    width: 500px;
    height: 100vh;
    background: var(--white);
    box-shadow: var(--shadow-2xl);
    z-index: 1000;
    transition: right var(--duration-slow) var(--ease-out);
    overflow-y: auto;
}

.search-section-instance-${this.instanceId} .filters-panel.open {
    right: 0;
}

.search-section-instance-${this.instanceId} .filters-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    opacity: 0;
    visibility: hidden;
    transition: all var(--duration-normal) var(--ease-out);
}

.search-section-instance-${this.instanceId} .filters-overlay.active {
    opacity: 1;
    visibility: visible;
}

.search-section-instance-${this.instanceId} .filters-content {
    padding: var(--space-6);
}

.search-section-instance-${this.instanceId} .filters-header {
    margin-bottom: var(--space-8);
    border-bottom: 1px solid var(--gray-200);
    padding-bottom: var(--space-6);
}

.search-section-instance-${this.instanceId} .filters-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-4);
}

.search-section-instance-${this.instanceId} .filters-title h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
    margin: 0;
}

.search-section-instance-${this.instanceId} .filters-actions {
    display: flex;
    gap: var(--space-2);
}

.search-section-instance-${this.instanceId} .filter-clear-btn,
.search-section-instance-${this.instanceId} .filters-close {
    padding: var(--space-2);
    background: var(--gray-100);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color var(--duration-fast) var(--ease-out);
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--gray-700);
}

.search-section-instance-${this.instanceId} .filter-clear-btn:hover,
.search-section-instance-${this.instanceId} .filters-close:hover {
    background: var(--gray-200);
}

.search-section-instance-${this.instanceId} .filters-subtitle {
    color: var(--gray-600);
    font-size: 0.9rem;
}

/* Filter Sections */
.search-section-instance-${this.instanceId} .filters-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
}

.search-section-instance-${this.instanceId} .filter-section {
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    background: var(--gray-50);
}

.search-section-instance-${this.instanceId} .filter-section-title {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--gray-900);
    margin-bottom: var(--space-5);
}

.search-section-instance-${this.instanceId} .filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.search-section-instance-${this.instanceId} .filter-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.search-section-instance-${this.instanceId} .filter-label {
    font-weight: 600;
    color: var(--gray-700);
    font-size: 0.9rem;
}

/* Dropdown Styles */
.search-section-instance-${this.instanceId} .dropdown-container {
    position: relative;
}

.search-section-instance-${this.instanceId} .dropdown-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.search-section-instance-${this.instanceId} .dropdown-input {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    background: var(--white);
    transition: border-color var(--duration-fast) var(--ease-out);
    font-family: var(--font-sans);
}

.search-section-instance-${this.instanceId} .dropdown-input:focus {
    outline: none;
    border-color: var(--blue-500);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-section-instance-${this.instanceId} .dropdown-arrow {
    position: absolute;
    right: var(--space-3);
    color: var(--gray-500);
    transition: transform var(--duration-fast) var(--ease-out);
    pointer-events: none;
}

.search-section-instance-${this.instanceId} .dropdown-container.open .dropdown-arrow {
    transform: rotate(180deg);
}

.search-section-instance-${this.instanceId} .dropdown-content {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--white);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 100;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all var(--duration-normal) var(--ease-out);
    max-height: 200px;
    overflow-y: auto;
}

.search-section-instance-${this.instanceId} .dropdown-content.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.search-section-instance-${this.instanceId} .dropdown-option {
    padding: var(--space-3);
    cursor: pointer;
    transition: background-color var(--duration-fast) var(--ease-out);
    font-size: 0.9rem;
    color: var(--gray-700);
}

.search-section-instance-${this.instanceId} .dropdown-option:hover {
    background: var(--blue-50);
}

.search-section-instance-${this.instanceId} .dropdown-option.selected {
    background: var(--blue-100);
    color: var(--blue-700);
    font-weight: 600;
}

/* Toggle Groups */
.search-section-instance-${this.instanceId} .price-toggle-group,
.search-section-instance-${this.instanceId} .vetrina-toggle-group {
    display: flex;
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--gray-300);
}

.search-section-instance-${this.instanceId} .price-toggle,
.search-section-instance-${this.instanceId} .vetrina-toggle {
    flex: 1;
    padding: var(--space-3);
    border: none;
    background: var(--white);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--gray-700);
    border-right: 1px solid var(--gray-300);
    font-family: var(--font-sans);
}

.search-section-instance-${this.instanceId} .price-toggle:last-child,
.search-section-instance-${this.instanceId} .vetrina-toggle:last-child {
    border-right: none;
}

.search-section-instance-${this.instanceId} .price-toggle:hover,
.search-section-instance-${this.instanceId} .vetrina-toggle:hover {
    background: var(--gray-50);
}

.search-section-instance-${this.instanceId} .price-toggle.active,
.search-section-instance-${this.instanceId} .vetrina-toggle.active {
    background: var(--blue-500);
    color: var(--white);
}

/* Range Sliders */
.search-section-instance-${this.instanceId} .price-range-filter,
.search-section-instance-${this.instanceId} .pages-range-filter {
    margin-top: var(--space-2);
}

.search-section-instance-${this.instanceId} .dual-range-container {
    position: relative;
    margin-bottom: var(--space-3);
}

.search-section-instance-${this.instanceId} .range-track {
    height: 6px;
    background: var(--gray-200);
    border-radius: 3px;
    position: relative;
}

.search-section-instance-${this.instanceId} .range-fill {
    height: 100%;
    background: var(--blue-500);
    border-radius: 3px;
    position: absolute;
    left: 0;
    right: 0;
}

.search-section-instance-${this.instanceId} .range-slider {
    position: absolute;
    top: -6px;
    width: 100%;
    height: 18px;
    background: transparent;
    -webkit-appearance: none;
    pointer-events: none;
}

.search-section-instance-${this.instanceId} .range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--blue-500);
    cursor: pointer;
    pointer-events: all;
    box-shadow: var(--shadow-sm);
}

.search-section-instance-${this.instanceId} .range-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--blue-500);
    cursor: pointer;
    pointer-events: all;
    border: none;
    box-shadow: var(--shadow-sm);
}

.search-section-instance-${this.instanceId} .range-values,
.search-section-instance-${this.instanceId} .price-values {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--gray-700);
}

.search-section-instance-${this.instanceId} .editable-value {
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    transition: background-color var(--duration-fast) var(--ease-out);
}

.search-section-instance-${this.instanceId} .editable-value:hover {
    background: var(--gray-100);
}

/* Rating Filter */
.search-section-instance-${this.instanceId} .rating-filter {
    display: flex;
    align-items: center;
    gap: var(--space-3);
}

.search-section-instance-${this.instanceId} .rating-stars-filter {
    display: flex;
    gap: var(--space-1);
}

.search-section-instance-${this.instanceId} .rating-star-filter {
    font-size: 1.5rem;
    color: var(--gray-300);
    cursor: pointer;
    transition: color var(--duration-fast) var(--ease-out);
}

.search-section-instance-${this.instanceId} .rating-star-filter:hover,
.search-section-instance-${this.instanceId} .rating-star-filter.active {
    color: var(--orange-500);
}

.search-section-instance-${this.instanceId} .rating-text {
    font-size: 0.85rem;
    color: var(--gray-600);
    font-weight: 500;
}

/* Scroll to Top */
.search-section-instance-${this.instanceId} .scroll-to-top-btn {
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-6);
    width: 48px;
    height: 48px;
    background: var(--blue-500);
    color: var(--white);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: var(--shadow-lg);
    transition: all var(--duration-normal) var(--ease-out);
    z-index: 100;
    opacity: 0;
    visibility: hidden;
    transform: translateY(20px);
}

.search-section-instance-${this.instanceId} .scroll-to-top-btn.visible {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.search-section-instance-${this.instanceId} .scroll-to-top-btn:hover {
    background: var(--blue-600);
    transform: translateY(-2px);
    box-shadow: var(--shadow-xl);
}

/* Preview Modal */
.search-section-instance-${this.instanceId} .preview-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transition: all var(--duration-normal) var(--ease-out);
}

.search-section-instance-${this.instanceId} .preview-modal.active {
    opacity: 1;
    visibility: visible;
}

.search-section-instance-${this.instanceId} .preview-content {
    background: var(--white);
    border-radius: var(--radius-xl);
    max-width: 800px;
    max-height: 90vh;
    width: 90%;
    overflow: hidden;
    box-shadow: var(--shadow-2xl);
}

.search-section-instance-${this.instanceId} .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-5);
    border-bottom: 1px solid var(--gray-200);
}

.search-section-instance-${this.instanceId} .preview-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--gray-900);
    margin: 0;
}

.search-section-instance-${this.instanceId} .preview-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--gray-500);
    transition: color var(--duration-fast) var(--ease-out);
}

.search-section-instance-${this.instanceId} .preview-close:hover {
    color: var(--gray-900);
}

.search-section-instance-${this.instanceId} .preview-body {
    padding: var(--space-5);
    max-height: 60vh;
    overflow-y: auto;
}

/* Reviews Overlay */
.search-section-instance-${this.instanceId} .reviews-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1500;
    opacity: 0;
    visibility: hidden;
    transition: all var(--duration-normal) var(--ease-out);
}

.search-section-instance-${this.instanceId} .reviews-overlay.active {
    opacity: 1;
    visibility: visible;
}

.search-section-instance-${this.instanceId} .reviews-overlay-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--white);
    border-radius: var(--radius-xl);
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: var(--shadow-2xl);
}

.search-section-instance-${this.instanceId} .reviews-overlay-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-5);
    border-bottom: 1px solid var(--gray-200);
}

.search-section-instance-${this.instanceId} .reviews-overlay-header h2 {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--gray-900);
    margin: 0;
}

.search-section-instance-${this.instanceId} .close-overlay-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--gray-500);
    transition: color var(--duration-fast) var(--ease-out);
    padding: var(--space-1);
}

.search-section-instance-${this.instanceId} .close-overlay-btn:hover {
    color: var(--gray-900);
}

/* Responsive Design */
@media (max-width: 768px) {
    .search-section-instance-${this.instanceId} .search-container {
        flex-direction: column;
        gap: var(--space-3);
    }
    
    .search-section-instance-${this.instanceId} .filters-panel {
        width: 100%;
        right: -100%;
    }
    
    .search-section-instance-${this.instanceId} .documents-grid {
        grid-template-columns: 1fr;
        gap: var(--space-4);
    }
    
    .search-section-instance-${this.instanceId} .document-count-and-filters {
        flex-direction: column;
        align-items: flex-start;
    }
}

@media (max-width: 480px) {
    .search-section-instance-${this.instanceId} .search-section {
        padding: var(--space-4);
    }
    
    .search-section-instance-${this.instanceId} .documents-grid {
        padding: var(--space-2);
    }
    
    .search-section-instance-${this.instanceId} .document-card {
        border-radius: var(--radius-lg);
    }
    
    .search-section-instance-${this.instanceId} .filters-content {
        padding: var(--space-4);
    }
}
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Initialize DOM cache with instance-specific selectors
     */
    initializeDOM() {
        // Add scoping class to container
        this.container.className = `search-section-instance-${this.instanceId}`;
        
        // Cache commonly used elements with instance-specific IDs
        this.dom = {
            searchSection: this.container.querySelector('.search-section'),
            searchInput: this.container.querySelector(`#${this.instanceId}-searchInput`),
            documentsGrid: this.container.querySelector(`#${this.instanceId}-documentsGrid`),
            documentCount: this.container.querySelector(`#${this.instanceId}-documentCount`),
            documentCountContainer: this.container.querySelector(`#${this.instanceId}-documentCountContainer`),
            filtersBtn: this.container.querySelector(`#${this.instanceId}-filtersBtn`),
            filtersPanel: this.container.querySelector(`#${this.instanceId}-filtersPanel`),
            filtersOverlay: this.container.querySelector(`#${this.instanceId}-filtersOverlay`),
            filtersClose: this.container.querySelector(`#${this.instanceId}-filtersClose`),
            clearAllFilters: this.container.querySelector(`#${this.instanceId}-clearAllFilters`),
            orderBtn: this.container.querySelector(`#${this.instanceId}-orderBtn`),
            activeFiltersDisplay: this.container.querySelector(`#${this.instanceId}-activeFiltersDisplay`),
        };
        
        console.log('DOM cache initialized for instance:', this.instanceId);
    }
    
    /**
     * Bind event listeners with instance scope
     */
    bindEvents() {
        // Initialize state
        this.state.currentVetrine = [];
        this.state.currentFiles = [];
        this.state.originalFiles = [];
        this.state.isFiltersOpen = false;
        this.searchTimeout = null;
        this.windowEventListeners = [];
        
        // Initialize FilterManager
        this.filterManager = new FilterManager();
        
        // Bind methods to maintain proper 'this' context
        this.boundMethods = {
            handleSearchInput: this.handleSearchInput.bind(this),
            handleSearchFocus: this.handleSearchFocus.bind(this),
            handleSearchKeydown: this.handleSearchKeydown.bind(this),
            toggleFiltersPanel: this.toggleFiltersPanel.bind(this),
            clearAllFiltersAction: this.clearAllFiltersAction.bind(this),
            handleContainerClick: this.handleContainerClick.bind(this),
            handleContainerKeydown: this.handleContainerKeydown.bind(this),
            handleWindowResize: this.handleWindowResize.bind(this),
            handleWindowScroll: this.handleWindowScroll.bind(this),
        };
        
        // Add event listeners
        if (this.dom.searchInput) {
            this.dom.searchInput.addEventListener('input', this.boundMethods.handleSearchInput);
            this.dom.searchInput.addEventListener('focus', this.boundMethods.handleSearchFocus);
            this.dom.searchInput.addEventListener('keydown', this.boundMethods.handleSearchKeydown);
        }
        
        if (this.dom.filtersBtn) {
            this.dom.filtersBtn.addEventListener('click', this.boundMethods.toggleFiltersPanel);
        }
        
        if (this.dom.filtersClose) {
            this.dom.filtersClose.addEventListener('click', this.boundMethods.toggleFiltersPanel);
        }
        
        if (this.dom.filtersOverlay) {
            this.dom.filtersOverlay.addEventListener('click', this.boundMethods.toggleFiltersPanel);
        }
        
        if (this.dom.clearAllFilters) {
            this.dom.clearAllFilters.addEventListener('click', this.boundMethods.clearAllFiltersAction);
        }
        
        // Container event delegation
        this.container.addEventListener('click', this.boundMethods.handleContainerClick);
        this.container.addEventListener('keydown', this.boundMethods.handleContainerKeydown);
        
        // Window events
        this.setupWindowEvents();
        
        console.log('Event listeners bound for instance:', this.instanceId);
    }
    
    /**
     * Setup window-level events with cleanup tracking
     */
    setupWindowEvents() {
        this.windowEventListeners = [];
        
        const resizeHandler = this.boundMethods.handleWindowResize;
        const scrollHandler = this.boundMethods.handleWindowScroll;
        
        window.addEventListener('resize', resizeHandler);
        window.addEventListener('scroll', scrollHandler);
        
        // Track for cleanup
        this.windowEventListeners.push(
            { event: 'resize', handler: resizeHandler },
            { event: 'scroll', handler: scrollHandler }
        );
    }

    /**
     * Handle search input changes
     */
    handleSearchInput(event) {
        const query = event.target.value.trim();
        
        // Debounce search
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    }

    /**
     * Handle search input focus
     */
    handleSearchFocus(event) {
        event.target.parentElement.classList.add('focused');
    }

    /**
     * Handle search keydown events
     */
    handleSearchKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.performSearch(event.target.value.trim());
        }
    }

    /**
     * Handle container click events (event delegation)
     */
    handleContainerClick(event) {
        // Close dropdowns when clicking outside
        if (!event.target.closest('.dropdown-container')) {
            this.closeAllDropdowns();
        }

        // Handle specific element clicks
        if (event.target.matches('.dropdown-option')) {
            this.handleDropdownOptionClick(event);
        }
        
        if (event.target.matches('.order-option')) {
            this.handleOrderOptionClick(event);
        }
    }

    /**
     * Handle container keydown events
     */
    handleContainerKeydown(event) {
        // Handle keyboard navigation for dropdowns, filters, etc.
        if (event.key === 'Escape') {
            this.closeAllDropdowns();
            if (this.state.isFiltersOpen) {
                this.toggleFiltersPanel();
            }
        }
    }

    /**
     * Handle window resize events
     */
    handleWindowResize() {
        // Update layout calculations if needed
        this.updateResponsiveLayout();
    }

    /**
     * Handle window scroll events
     */
    handleWindowScroll() {
        // Update scroll-dependent features
        this.updateScrollToTopButton();
    }

    /**
     * Toggle filters panel
     */
    toggleFiltersPanel() {
        if (!this.dom.filtersPanel || !this.dom.filtersOverlay) return;

        this.state.isFiltersOpen = !this.state.isFiltersOpen;

        if (this.state.isFiltersOpen) {
            this.dom.filtersPanel.classList.add('open');
            this.dom.filtersOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            this.dom.filtersPanel.classList.remove('open');
            this.dom.filtersOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Clear all filters
     */
    clearAllFiltersAction() {
        this.filterManager.clearAllFilters();
        this.resetAllFilterControls();
        this.applyFiltersAndRender();
    }
    
    /**
     * Perform search with instance-specific context
     */
    async performSearch(query) {
        try {
            console.log(`Performing search for instance ${this.instanceId}:`, query);
            
            if (!query || query.trim() === '') {
                // If no query, load all files
                await this.loadAllFiles();
                return;
            }

            const url = `${this.options.apiBase}/vetrine/search?q=${encodeURIComponent(query.trim())}`;
            const headers = {};
            
            if (this.state.authToken) {
                headers['Authorization'] = `Bearer ${this.state.authToken}`;
            }

            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.vetrine) {
                this.state.currentVetrine = data.vetrine || [];
                this.state.originalFiles = this.extractAllFiles(data.vetrine);
                this.state.currentFiles = [...this.state.originalFiles];
                
                await this.renderDocuments(this.state.currentFiles);
            } else {
                throw new Error(data.message || 'Search failed');
            }
            
        } catch (error) {
            console.error(`Search error for instance ${this.instanceId}:`, error);
            this.handleLoadingError(error);
        }
    }

    /**
     * Load all files from API
     */
    async loadAllFiles() {
        try {
            if (this.options.devMode && this.options.devModeNoResults) {
                this.handleNoResults();
                return;
            }

            const url = `${this.options.apiBase}/vetrine`;
            const headers = {};
            
            if (this.state.authToken) {
                headers['Authorization'] = `Bearer ${this.state.authToken}`;
            }

            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.state.currentVetrine = data.vetrine || [];
                this.state.originalFiles = this.extractAllFiles(data.vetrine);
                this.state.currentFiles = [...this.state.originalFiles];
                
                await this.renderDocuments(this.state.currentFiles);
            } else {
                throw new Error(data.message || 'Failed to load files');
            }
        } catch (error) {
            console.error(`Error loading files for instance ${this.instanceId}:`, error);
            this.handleLoadingError(error);
        }
    }

    /**
     * Extract all files from vetrine data
     */
    extractAllFiles(vetrine) {
        const allFiles = [];
        
        vetrine.forEach(vetrina => {
            if (vetrina.files && Array.isArray(vetrina.files)) {
                vetrina.files.forEach(file => {
                    allFiles.push({
                        ...file,
                        vetrina_id: vetrina.id,
                        vetrina_title: vetrina.title,
                        vetrina_type: vetrina.type
                    });
                });
            }
        });
        
        return allFiles;
    }
    
    /**
     * Render documents to the grid
     */
    async renderDocuments(files) {
        if (!this.dom.documentsGrid) return;

        try {
            if (!files || files.length === 0) {
                this.handleNoResults();
                return;
            }

            this.dom.documentsGrid.innerHTML = '';
            this.updateDocumentCount(files.length);

            for (const file of files) {
                const cardElement = await this.createDocumentCard(file);
                this.dom.documentsGrid.appendChild(cardElement);
            }

            this.dom.searchSection.classList.add('has-results');
            this.dom.searchSection.classList.remove('no-results');

        } catch (error) {
            console.error(`Error rendering documents for instance ${this.instanceId}:`, error);
            this.handleRenderError(error);
        }
    }

    /**
     * Create a document card element
     */
    async createDocumentCard(file) {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.setAttribute('data-file-id', file.id);

        // Generate card HTML
        card.innerHTML = this.generateDocumentCardHTML(file);

        // Add event listeners
        this.setupDocumentCardEvents(card, file);

        return card;
    }

    /**
     * Generate HTML for document card
     */
    generateDocumentCardHTML(file) {
        return `
            <div class="document-preview">
                <img src="${file.thumbnail || '/placeholder.jpg'}" alt="${file.title}" loading="lazy">
                <div class="rating-badge">★ ${file.rating || '0.0'}</div>
            </div>
            <div class="document-content">
                <div class="document-header">
                    <div class="document-title-section">
                        <h3 class="document-title">${file.title}</h3>
                        <p class="document-author">${file.author || 'Unknown'}</p>
                    </div>
                </div>
                <div class="document-info">
                    <span class="info-item">${file.pages || 0} pagine</span>
                    <span class="info-item">${file.language || 'IT'}</span>
                    <span class="info-item">${file.fileType || 'PDF'}</span>
                </div>
                <div class="document-footer">
                    <div class="document-meta">
                        <span class="document-date">${this.formatDate(file.createdAt)}</span>
                    </div>
                    <div class="document-price">
                        ${file.price > 0 ? `€${file.price}` : 'Gratis'}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners for document card
     */
    setupDocumentCardEvents(card, file) {
        // Card click handler
        card.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleDocumentCardClick(file);
        });

        // Favorite button handler
        const favoriteBtn = card.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavorite(file.id);
            });
        }

        // Preview button handler
        const previewBtn = card.querySelector('.preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showPreview(file);
            });
        }
    }
    
    /**
     * Update document count display
     */
    updateDocumentCount(count) {
        if (!this.dom.documentCount) return;
        
        this.dom.documentCount.textContent = `${count} ${count === 1 ? 'documento trovato' : 'documenti trovati'}`;
        console.log(`Document count updated for instance ${this.instanceId}:`, count);
    }

    /**
     * Apply all active filters and re-render
     */
    applyFiltersAndRender() {
        const filteredFiles = this.applyFiltersToFiles(this.state.originalFiles);
        this.state.currentFiles = filteredFiles;
        this.renderDocuments(filteredFiles);
        this.updateActiveFiltersDisplay();
    }

    /**
     * Apply filters to file array
     */
    applyFiltersToFiles(files) {
        let filteredFiles = [...files];

        // Search query filter
        const searchQuery = this.dom.searchInput?.value?.trim().toLowerCase();
        if (searchQuery) {
            filteredFiles = filteredFiles.filter(file =>
                file.title.toLowerCase().includes(searchQuery) ||
                file.description?.toLowerCase().includes(searchQuery) ||
                file.author?.toLowerCase().includes(searchQuery)
            );
        }

        // Apply all other filters through FilterManager
        const activeFilters = this.filterManager.getActiveFilters();
        
        Object.entries(activeFilters).forEach(([filterKey, filterValue]) => {
            filteredFiles = this.applySpecificFilter(filteredFiles, filterKey, filterValue);
        });

        return filteredFiles;
    }

    /**
     * Apply a specific filter to files
     */
    applySpecificFilter(files, filterKey, filterValue) {
        switch (filterKey) {
            case 'faculty':
                return files.filter(file => file.faculty === filterValue);
            case 'course':
                return files.filter(file => file.course === filterValue);
            case 'rating':
                return files.filter(file => (file.rating || 0) >= filterValue);
            case 'priceRange':
                return files.filter(file => {
                    const price = file.price || 0;
                    return price >= filterValue.min && price <= filterValue.max;
                });
            case 'documentType':
                return files.filter(file => file.fileType === filterValue);
            case 'language':
                return files.filter(file => file.language === filterValue);
            default:
                return files;
        }
    }

    /**
     * Show loading cards
     */
    showLoadingCards() {
        if (!this.dom.documentsGrid) return;
        
        this.dom.documentsGrid.innerHTML = this.generateLoadingCardsHTML();
    }

    /**
     * Generate loading cards HTML
     */
    generateLoadingCardsHTML() {
        const loadingCard = `
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
        `;
        
        return Array(6).fill(loadingCard).join('');
    }

    /**
     * Handle no results state
     */
    handleNoResults() {
        if (!this.dom.documentsGrid) return;

        this.dom.documentsGrid.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <h3>Nessun documento trovato</h3>
                <p>Prova a modificare i filtri o la ricerca</p>
            </div>
        `;

        this.dom.searchSection.classList.add('no-results');
        this.dom.searchSection.classList.remove('has-results');
        this.updateDocumentCount(0);
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'Data non disponibile';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    // Placeholder methods for missing functionality
    closeAllDropdowns() {
        // Implementation for closing dropdowns
    }

    handleDropdownOptionClick(event) {
        // Implementation for dropdown option clicks
    }

    handleOrderOptionClick(event) {
        // Implementation for order option clicks
    }

    updateResponsiveLayout() {
        // Implementation for responsive layout updates
    }

    updateScrollToTopButton() {
        // Implementation for scroll to top button
    }

    resetAllFilterControls() {
        // Implementation for resetting filter controls
    }

    updateActiveFiltersDisplay() {
        // Implementation for updating active filters display
    }

    handleDocumentCardClick(file) {
        // Implementation for document card clicks
        console.log('Document clicked:', file);
    }

    toggleFavorite(fileId) {
        // Implementation for toggling favorites
        console.log('Toggle favorite:', fileId);
    }

    showPreview(file) {
        // Implementation for showing preview
        console.log('Show preview:', file);
    }

    handleLoadingError(error) {
        console.error('Loading error:', error);
        this.handleNoResults();
    }

    handleRenderError(error) {
        console.error('Render error:', error);
        this.handleNoResults();
    }
    
    /**
     * Destroy the component and clean up
     */
    destroy() {
        // Clear timeouts
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Remove window event listeners
        if (this.windowEventListeners) {
            this.windowEventListeners.forEach(({ event, handler }) => {
                window.removeEventListener(event, handler);
            });
        }
        
        // Reset body overflow
        document.body.style.overflow = '';
        
        // Remove CSS
        const cssElement = document.getElementById(`search-section-styles-${this.instanceId}`);
        if (cssElement) {
            cssElement.remove();
        }
        
        // Clear container
        this.container.innerHTML = '';
        
        // Clear any instance-specific data
        this.state = {};
        this.filterManager = null;
        this.state.isInitialized = false;
        
        console.log(`SearchSectionComponent destroyed: ${this.instanceId}`);
    }
    
    /**
     * Get instance state (for debugging)
     */
    getState() {
        return {
            instanceId: this.instanceId,
            options: this.options,
            state: this.state,
            isInitialized: this.state.isInitialized
        };
    }

    // ===== INSTANCE INITIALIZATION METHODS =====

    /**
     * Initialize all component subsystems
     */
    async initializeComponent() {
        this.showLoadingCards();
        this.checkAuthentication();
        this.initializeUserInfo();
        this.setupEventHandlers();
        this.initializeAnimations();
        this.initializeFilters();
        this.initializeScrollToTop();
        this.initializeAISearchToggle();
        await this.loadValidTags();
        await this.loadAllFiles();
    }

    /**
     * Check user authentication
     */
    checkAuthentication() {
        this.state.authToken = localStorage.getItem('authToken');
        // Add authentication logic here
    }

    /**
     * Initialize user information display
     */
    initializeUserInfo() {
        const userAvatar = this.querySelector(`#${this.instanceId}-userAvatar`);
        const userDropdown = this.querySelector(`#${this.instanceId}-userDropdown`);
        
        if (userAvatar && userDropdown) {
            userAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });
        }
    }

    /**
     * Setup all event handlers with proper scoping
     */
    setupEventHandlers() {
        // Search input events
        if (this.dom.searchInput) {
            this.dom.searchInput.addEventListener('input', this.boundMethods.handleSearchInput);
            this.dom.searchInput.addEventListener('focus', this.boundMethods.handleSearchFocus);
            this.dom.searchInput.addEventListener('keydown', this.boundMethods.handleSearchKeydown);
        }

        // Filter button events
        if (this.dom.filtersBtn) {
            this.dom.filtersBtn.addEventListener('click', this.boundMethods.toggleFiltersPanel);
        }

        // Global click handler (scoped to container)
        this.container.addEventListener('click', this.boundMethods.handleContainerClick);
        
        // Keyboard navigation
        this.container.addEventListener('keydown', this.boundMethods.handleContainerKeydown);
        
        // Window events (if needed, with cleanup tracking)
        this.setupWindowEvents();
    }

    /**
     * Setup window-level events with cleanup tracking
     */
    setupWindowEvents() {
        this.windowEventListeners = [];
        
        const resizeHandler = this.boundMethods.handleWindowResize;
        const scrollHandler = this.boundMethods.handleWindowScroll;
        
        window.addEventListener('resize', resizeHandler);
        window.addEventListener('scroll', scrollHandler);
        
        // Track for cleanup
        this.windowEventListeners.push(
            { event: 'resize', handler: resizeHandler },
            { event: 'scroll', handler: scrollHandler }
        );
    }

    // ===== FILTER SYSTEM METHODS =====

    /**
     * Initialize the complete filter system
     */
    initializeFilters() {
        this.filterManager = new FilterManager();
        this.initializeFilterControls();
        this.initializeCourseFilter();
        this.initializeCanaleFilter();
        this.initializeRatingFilter();
        this.initializeToggleFilters();
        this.initializePriceRangeFilter();
        this.initializeOrderDropdown();
        this.setupDropdowns();
    }

    /**
     * Initialize basic filter controls
     */
    initializeFilterControls() {
        const filtersPanel = this.querySelector(`#${this.instanceId}-filtersPanel`);
        const filtersOverlay = this.querySelector(`#${this.instanceId}-filtersOverlay`);
        const filtersClose = this.querySelector(`#${this.instanceId}-filtersClose`);
        const clearAllFilters = this.querySelector(`#${this.instanceId}-clearAllFilters`);

        if (filtersClose) {
            filtersClose.addEventListener('click', this.boundMethods.toggleFiltersPanel);
        }

        if (filtersOverlay) {
            filtersOverlay.addEventListener('click', this.boundMethods.toggleFiltersPanel);
        }

        if (clearAllFilters) {
            clearAllFilters.addEventListener('click', this.boundMethods.clearAllFiltersAction);
        }
    }

    /**
     * Initialize course filter with autocomplete
     */
    initializeCourseFilter() {
        const courseFilter = this.querySelector(`#${this.instanceId}-courseFilter`);
        const courseDropdown = this.querySelector(`#${this.instanceId}-courseDropdown`);
        
        if (!courseFilter || !courseDropdown) return;

        courseFilter.addEventListener('input', (e) => {
            this.handleCourseFilterInput(e.target.value);
        });

        courseFilter.addEventListener('focus', () => {
            this.showCourseDropdown();
        });
    }

    /**
     * Initialize channel filter
     */
    initializeCanaleFilter() {
        const canaleFilter = this.querySelector(`#${this.instanceId}-canaleFilter`);
        const canaleDropdown = this.querySelector(`#${this.instanceId}-canaleDropdown`);
        
        if (!canaleFilter || !canaleDropdown) return;

        canaleFilter.addEventListener('input', (e) => {
            this.handleCanaleFilterInput(e.target.value);
        });
    }

    /**
     * Initialize rating filter with star interaction
     */
    initializeRatingFilter() {
        const ratingFilter = this.querySelector(`#${this.instanceId}-ratingFilter`);
        if (!ratingFilter) return;

        const stars = ratingFilter.querySelectorAll('.rating-star-filter');
        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                this.setRatingFilter(index + 1);
            });

            star.addEventListener('mouseenter', () => {
                this.highlightStars(index + 1);
            });
        });

        ratingFilter.addEventListener('mouseleave', () => {
            this.resetStarHighlight();
        });
    }

    /**
     * Initialize toggle filter buttons
     */
    initializeToggleFilters() {
        // Price toggles
        const priceToggles = this.querySelectorAll('.price-toggle');
        priceToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                this.handlePriceToggle(e.target.dataset.price);
            });
        });

        // Vetrina toggles
        const vetrinaToggles = this.querySelectorAll('.vetrina-toggle');
        vetrinaToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                this.handleVetrinaToggle(e.target.dataset.vetrina);
            });
        });
    }

    /**
     * Initialize price range filter with dual sliders
     */
    initializePriceRangeFilter() {
        const minPriceRange = this.querySelector(`#${this.instanceId}-minPriceRange`);
        const maxPriceRange = this.querySelector(`#${this.instanceId}-maxPriceRange`);
        const rangeFill = this.querySelector(`#${this.instanceId}-rangeFill`);

        if (!minPriceRange || !maxPriceRange || !rangeFill) return;

        const updatePriceRange = () => {
            const min = parseFloat(minPriceRange.value);
            const max = parseFloat(maxPriceRange.value);

            if (min > max) {
                minPriceRange.value = max;
            }

            this.updatePriceRangeDisplay(min, max);
            this.filterManager.setFilter('priceRange', { min, max });
            this.applyFiltersAndRender();
        };

        minPriceRange.addEventListener('input', updatePriceRange);
        maxPriceRange.addEventListener('input', updatePriceRange);
    }

    /**
     * Initialize order dropdown
     */
    initializeOrderDropdown() {
        const orderBtn = this.querySelector(`#${this.instanceId}-orderBtn`);
        const orderDropdown = this.querySelector('.order-dropdown-content');

        if (!orderBtn || !orderDropdown) return;

        orderBtn.addEventListener('click', () => {
            orderDropdown.classList.toggle('show');
        });

        const orderOptions = orderDropdown.querySelectorAll('.order-option');
        orderOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                this.setOrderOption(e.target.dataset.order);
                orderDropdown.classList.remove('show');
            });
        });
    }

    // ===== DATA LOADING AND RENDERING METHODS =====

    /**
     * Load all files from API
     */
    async loadAllFiles() {
        try {
            console.log(`Loading files for instance ${this.instanceId}...`);
            
            if (this.options.devMode && this.options.devModeNoResults) {
                this.handleNoResults();
                return;
            }

            // Show loading cards first
            this.showLoadingCards();
            console.log(`Showing loading cards for instance ${this.instanceId}`);

            const url = `${this.options.apiBase}/vetrine`;
            console.log(`Making API request to: ${url}`);
            
            const headers = {};
            
            if (this.state.authToken) {
                headers['Authorization'] = `Bearer ${this.state.authToken}`;
            }

            const response = await fetch(url, { headers });
            console.log(`API response status: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`API response data:`, data);
            
            if (data.vetrine) {
                this.state.currentVetrine = data.vetrine || [];
                this.state.originalFiles = this.extractAllFiles(data.vetrine);
                this.state.currentFiles = [...this.state.originalFiles];
                
                console.log(`Loaded ${this.state.currentFiles.length} files for instance ${this.instanceId}`);
                await this.renderDocuments(this.state.currentFiles);
            } else {
                console.log(`No vetrine data found, showing no results`);
                this.handleNoResults();
            }
        } catch (error) {
            console.error(`Error loading files for instance ${this.instanceId}:`, error);
            this.handleLoadingError(error);
        }
    }

    /**
     * Extract all files from vetrine data
     */
    extractAllFiles(vetrine) {
        const allFiles = [];
        
        vetrine.forEach(vetrina => {
            if (vetrina.files && Array.isArray(vetrina.files)) {
                vetrina.files.forEach(file => {
                    allFiles.push({
                        ...file,
                        vetrina_id: vetrina.id,
                        vetrina_title: vetrina.title,
                        vetrina_type: vetrina.type
                    });
                });
            }
        });
        
        return allFiles;
    }

    /**
     * Render documents to the grid
     */
    async renderDocuments(files) {
        if (!this.dom.documentsGrid) return;

        try {
            if (!files || files.length === 0) {
                this.handleNoResults();
                return;
            }

            this.dom.documentsGrid.innerHTML = '';
            this.updateDocumentCount(files.length);

            for (const file of files) {
                const cardElement = await this.createDocumentCard(file);
                this.dom.documentsGrid.appendChild(cardElement);
            }

            this.dom.searchSection.classList.add('has-results');
            this.dom.searchSection.classList.remove('no-results');

        } catch (error) {
            console.error(`Error rendering documents for instance ${this.instanceId}:`, error);
            this.handleRenderError(error);
        }
    }

    /**
     * Create a document card element
     */
    async createDocumentCard(file) {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.setAttribute('data-file-id', file.id);

        // Generate card HTML (adapt from original template)
        card.innerHTML = this.generateDocumentCardHTML(file);

        // Add event listeners
        this.setupDocumentCardEvents(card, file);

        return card;
    }

    /**
     * Generate HTML for document card
     */
    generateDocumentCardHTML(file) {
        // This would contain the full document card template
        // adapted from the original renderDocuments function
        return `
            <div class="document-preview">
                <img src="${file.thumbnail || '/placeholder.jpg'}" alt="${file.title}" loading="lazy">
                <div class="rating-badge">★ ${file.rating || '0.0'}</div>
            </div>
            <div class="document-content">
                <div class="document-header">
                    <div class="document-title-section">
                        <h3 class="document-title">${file.title}</h3>
                        <p class="document-author">${file.author || 'Unknown'}</p>
                    </div>
                </div>
                <div class="document-info">
                    <span class="info-item">${file.pages || 0} pagine</span>
                    <span class="info-item">${file.language || 'IT'}</span>
                    <span class="info-item">${file.fileType || 'PDF'}</span>
                </div>
                <div class="document-footer">
                    <div class="document-meta">
                        <span class="document-date">${this.formatDate(file.createdAt)}</span>
                    </div>
                    <div class="document-price">
                        ${file.price > 0 ? `€${file.price}` : 'Gratis'}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners for document card
     */
    setupDocumentCardEvents(card, file) {
        // Card click handler
        card.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleDocumentCardClick(file);
        });

        // Favorite button handler
        const favoriteBtn = card.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavorite(file.id);
            });
        }

        // Preview button handler
        const previewBtn = card.querySelector('.preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showPreview(file);
            });
        }
    }

    // ===== FILTER APPLICATION METHODS =====

    /**
     * Apply all active filters and re-render
     */
    applyFiltersAndRender() {
        const filteredFiles = this.applyFiltersToFiles(this.state.originalFiles);
        this.state.currentFiles = filteredFiles;
        this.renderDocuments(filteredFiles);
        this.updateActiveFiltersDisplay();
    }

    /**
     * Apply filters to file array
     */
    applyFiltersToFiles(files) {
        let filteredFiles = [...files];

        // Search query filter
        const searchQuery = this.dom.searchInput?.value?.trim().toLowerCase();
        if (searchQuery) {
            filteredFiles = filteredFiles.filter(file =>
                file.title.toLowerCase().includes(searchQuery) ||
                file.description?.toLowerCase().includes(searchQuery) ||
                file.author?.toLowerCase().includes(searchQuery)
            );
        }

        // Apply all other filters through FilterManager
        const activeFilters = this.filterManager.getActiveFilters();
        
        Object.entries(activeFilters).forEach(([filterKey, filterValue]) => {
            filteredFiles = this.applySpecificFilter(filteredFiles, filterKey, filterValue);
        });

        return filteredFiles;
    }

    /**
     * Apply a specific filter to files
     */
    applySpecificFilter(files, filterKey, filterValue) {
        switch (filterKey) {
            case 'faculty':
                return files.filter(file => file.faculty === filterValue);
            case 'course':
                return files.filter(file => file.course === filterValue);
            case 'rating':
                return files.filter(file => (file.rating || 0) >= filterValue);
            case 'priceRange':
                return files.filter(file => {
                    const price = file.price || 0;
                    return price >= filterValue.min && price <= filterValue.max;
                });
            case 'documentType':
                return files.filter(file => file.fileType === filterValue);
            case 'language':
                return files.filter(file => file.language === filterValue);
            default:
                return files;
        }
    }

    // ===== EVENT HANDLER METHODS =====

    /**
     * Handle search input changes
     */
    handleSearchInput(event) {
        const query = event.target.value.trim();
        
        // Debounce search
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    }

    /**
     * Handle search input focus
     */
    handleSearchFocus(event) {
        event.target.parentElement.classList.add('focused');
    }

    /**
     * Handle search keydown events
     */
    handleSearchKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.performSearch(event.target.value.trim());
        }
    }

    /**
     * Handle container click events (event delegation)
     */
    handleContainerClick(event) {
        // Close dropdowns when clicking outside
        if (!event.target.closest('.dropdown-container')) {
            this.closeAllDropdowns();
        }

        // Handle specific element clicks
        if (event.target.matches('.dropdown-option')) {
            this.handleDropdownOptionClick(event);
        }
    }

    /**
     * Handle container keydown events
     */
    handleContainerKeydown(event) {
        // Handle keyboard navigation for dropdowns, filters, etc.
        if (event.key === 'Escape') {
            this.closeAllDropdowns();
            if (this.state.isFiltersOpen) {
                this.toggleFiltersPanel();
            }
        }
    }

    /**
     * Handle window resize events
     */
    handleWindowResize() {
        // Update layout calculations if needed
        this.updateResponsiveLayout();
    }

    /**
     * Handle window scroll events
     */
    handleWindowScroll() {
        // Update scroll-dependent features
        this.updateScrollToTopButton();
    }

    /**
     * Toggle filters panel
     */
    toggleFiltersPanel() {
        const filtersPanel = this.querySelector(`#${this.instanceId}-filtersPanel`);
        const filtersOverlay = this.querySelector(`#${this.instanceId}-filtersOverlay`);

        if (!filtersPanel || !filtersOverlay) return;

        this.state.isFiltersOpen = !this.state.isFiltersOpen;

        if (this.state.isFiltersOpen) {
            filtersPanel.classList.add('open');
            filtersOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            filtersPanel.classList.remove('open');
            filtersOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Clear all filters
     */
    clearAllFiltersAction() {
        this.filterManager.clearAllFilters();
        this.resetAllFilterControls();
        this.applyFiltersAndRender();
    }

    // ===== UTILITY METHODS =====

    /**
     * Show loading cards
     */
    showLoadingCards() {
        if (!this.dom.documentsGrid) return;
        
        this.dom.documentsGrid.innerHTML = this.generateLoadingCardsHTML();
    }

    /**
     * Generate loading cards HTML
     */
    generateLoadingCardsHTML() {
        const loadingCard = `
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
        `;
        
        return Array(6).fill(loadingCard).join('');
    }

    /**
     * Handle no results state
     */
    handleNoResults() {
        if (!this.dom.documentsGrid) return;

        this.dom.documentsGrid.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <h3>Nessun documento trovato</h3>
                <p>Prova a modificare i filtri o la ricerca</p>
            </div>
        `;

        this.dom.searchSection.classList.add('no-results');
        this.dom.searchSection.classList.remove('has-results');
        this.updateDocumentCount(0);
    }

    /**
     * Update document count display
     */
    updateDocumentCount(count) {
        if (!this.dom.documentCount) return;
        
        this.dom.documentCount.textContent = `${count} ${count === 1 ? 'documento trovato' : 'documenti trovati'}`;
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'Data non disponibile';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    /**
     * Helper method to query within component scope
     */
    querySelector(selector) {
        return this.container.querySelector(selector);
    }

    /**
     * Helper method to query multiple elements within component scope
     */
    querySelectorAll(selector) {
        return this.container.querySelectorAll(selector);
    }

    // ===== PLACEHOLDER METHODS (TO BE IMPLEMENTED) =====

    async loadValidTags() {
        // Placeholder for loading valid tags
        console.log(`Loading valid tags for instance ${this.instanceId}`);
    }

    initializeAnimations() {
        // Placeholder for animation initialization
        console.log(`Initializing animations for instance ${this.instanceId}`);
    }

    initializeScrollToTop() {
        // Placeholder for scroll-to-top functionality
        console.log(`Initializing scroll-to-top for instance ${this.instanceId}`);
    }

    initializeAISearchToggle() {
        // Placeholder for AI search toggle
        console.log(`Initializing AI search toggle for instance ${this.instanceId}`);
    }

    setupDropdowns() {
        // Placeholder for dropdown setup
        console.log(`Setting up dropdowns for instance ${this.instanceId}`);
    }

    handleCourseFilterInput(value) {
        // Placeholder for course filter input handling
        console.log(`Course filter input: ${value} for instance ${this.instanceId}`);
    }

    showCourseDropdown() {
        // Placeholder for showing course dropdown
        console.log(`Showing course dropdown for instance ${this.instanceId}`);
    }

    handleCanaleFilterInput(value) {
        // Placeholder for channel filter input handling
        console.log(`Channel filter input: ${value} for instance ${this.instanceId}`);
    }

    setRatingFilter(rating) {
        // Placeholder for setting rating filter
        this.filterManager.setFilter('rating', rating);
        this.applyFiltersAndRender();
        console.log(`Rating filter set to ${rating} for instance ${this.instanceId}`);
    }

    highlightStars(rating) {
        // Placeholder for highlighting stars
        console.log(`Highlighting ${rating} stars for instance ${this.instanceId}`);
    }

    resetStarHighlight() {
        // Placeholder for resetting star highlight
        console.log(`Resetting star highlight for instance ${this.instanceId}`);
    }

    handlePriceToggle(price) {
        // Placeholder for price toggle handling
        console.log(`Price toggle: ${price} for instance ${this.instanceId}`);
    }

    handleVetrinaToggle(vetrina) {
        // Placeholder for vetrina toggle handling
        console.log(`Vetrina toggle: ${vetrina} for instance ${this.instanceId}`);
    }

    updatePriceRangeDisplay(min, max) {
        // Placeholder for updating price range display
        console.log(`Price range: ${min}-${max} for instance ${this.instanceId}`);
    }

    setOrderOption(order) {
        // Placeholder for setting order option
        console.log(`Order option: ${order} for instance ${this.instanceId}`);
    }

    handleLoadingError(error) {
        // Placeholder for handling loading errors
        console.error(`Loading error for instance ${this.instanceId}:`, error);
        this.handleNoResults();
    }

    handleRenderError(error) {
        // Placeholder for handling render errors
        console.error(`Render error for instance ${this.instanceId}:`, error);
    }

    handleDocumentCardClick(file) {
        // Placeholder for document card click handling
        console.log(`Document clicked: ${file.title} for instance ${this.instanceId}`);
    }

    toggleFavorite(fileId) {
        // Placeholder for toggling favorite
        console.log(`Toggle favorite: ${fileId} for instance ${this.instanceId}`);
    }

    showPreview(file) {
        // Placeholder for showing preview
        console.log(`Show preview: ${file.title} for instance ${this.instanceId}`);
    }

    updateActiveFiltersDisplay() {
        // Placeholder for updating active filters display
        console.log(`Updating active filters display for instance ${this.instanceId}`);
    }

    async performSearch(query) {
        try {
            console.log(`Performing search: "${query}" for instance ${this.instanceId}`);
            
            if (!query || query.trim() === '') {
                // If no query, load all files
                await this.loadAllFiles();
                return;
            }

            const url = `${this.options.apiBase}/vetrine/search?q=${encodeURIComponent(query.trim())}`;
            const headers = {};
            
            if (this.state.authToken) {
                headers['Authorization'] = `Bearer ${this.state.authToken}`;
            }

            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.vetrine) {
                this.state.currentVetrine = data.vetrine || [];
                this.state.originalFiles = this.extractAllFiles(data.vetrine);
                this.state.currentFiles = [...this.state.originalFiles];
                
                await this.renderDocuments(this.state.currentFiles);
            } else {
                throw new Error(data.message || 'Search failed');
            }
            
        } catch (error) {
            console.error(`Search error for instance ${this.instanceId}:`, error);
            this.handleLoadingError(error);
        }
    }

    closeAllDropdowns() {
        // Placeholder for closing all dropdowns
        console.log(`Closing all dropdowns for instance ${this.instanceId}`);
    }

    handleDropdownOptionClick(event) {
        // Placeholder for dropdown option click handling
        console.log(`Dropdown option clicked for instance ${this.instanceId}`, event.target);
    }

    updateResponsiveLayout() {
        // Placeholder for updating responsive layout
        console.log(`Updating responsive layout for instance ${this.instanceId}`);
    }

    updateScrollToTopButton() {
        // Only update if scroll-to-top button exists
        const scrollToTopBtn = this.querySelector('.scroll-to-top-btn');
        if (!scrollToTopBtn) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > 300) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    }

    resetAllFilterControls() {
        // Placeholder for resetting all filter controls
        console.log(`Resetting all filter controls for instance ${this.instanceId}`);
    }
}

/**
 * Instance-specific FilterManager class
 */
class FilterManager {
    constructor() {
        this.filters = {};
        this.updateCountTimeout = null;
    }

    setFilter(key, value) {
        if (value === null || value === undefined || value === '') {
            this.removeFilter(key);
            return;
        }
        
        this.filters[key] = value;
        this.scheduleCountUpdate();
    }

    removeFilter(key) {
        delete this.filters[key];
        this.scheduleCountUpdate();
    }

    getFilter(key) {
        return this.filters[key];
    }

    getActiveFilters() {
        return { ...this.filters };
    }

    clearAllFilters() {
        this.filters = {};
        this.scheduleCountUpdate();
    }

    getActiveFilterCount() {
        return Object.keys(this.filters).length;
    }

    scheduleCountUpdate() {
        if (this.updateCountTimeout) {
            clearTimeout(this.updateCountTimeout);
        }
        
        this.updateCountTimeout = setTimeout(() => {
            this.updateFilterCountDisplay();
        }, 100);
    }

    updateFilterCountDisplay() {
        // This method would be called on the component instance
        // Implementation depends on component context
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchSectionComponent;
}

// Global access for script tag usage
if (typeof window !== 'undefined') {
    window.SearchSectionComponent = SearchSectionComponent;
}

/*
=== INTEGRATION INSTRUCTIONS ===

1. HTML Integration:
   - Copy content from search-section.html (lines 29-412)
   - Replace all IDs with template literals: ${this.instanceId}-originalId
   - Remove DOCTYPE, head, and body tags - keep only the main content
   - Update injectHTML() method with the adapted HTML

2. CSS Integration:
   - Copy styles from search-section.css
   - Scope all selectors to prevent global conflicts
   - Remove global imports and resets (handle separately)
   - Update injectCSS() method with the adapted CSS

3. JavaScript Integration:
   - Copy logic from search-section.js
   - Replace global variables with instance properties
   - Replace document.getElementById/querySelector with this.dom references
   - Convert global functions to instance methods
   - Bind all event handlers to maintain proper context
   - Update each placeholder method with the actual implementation

4. Usage Example:
   const container1 = document.getElementById('search-container-1');
   const component1 = new SearchSectionComponent(container1);
   component1.init();
   
   const container2 = document.getElementById('search-container-2');
   const component2 = new SearchSectionComponent(container2, { devMode: true });
   component2.init();

=== END INTEGRATION INSTRUCTIONS ===
*/