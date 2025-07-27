// Custom Element: search-section-component (FIXED VERSION)
// This version uses instance-specific variables instead of global window variables
// to prevent conflicts when multiple instances are created

class SearchSectionComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Instance-specific data storage to avoid global conflicts
        this.instanceData = {
            facultyCoursesData: null,
            allFileTypes: [],
            allTags: [],
            loadingCardsResizeListener: null,
            updateCoursesForCourse: null,
            previewDocument: null,
            closePreview: null,
            downloadDocument: null,
            purchaseDocument: null,
            toggleFavorite: null,
            removeFilter: null,
            clearAllFiltersAction: null
        };
    }

    static get observedAttributes() {
        return ['api-base', 'auth-token', 'placeholder-text', 'button-text'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    connectedCallback() {
        this.render();
        
        // Store reference to component instance for use in nested functions
        const component = this;
        
        // Add cache-busting timestamp to force browser refresh
        const CACHE_BUSTER = Date.now();
        
        // 🚀 DEVELOPMENT MODE: Set to true to bypass backend and always show no results
        const DEV_MODE_NO_RESULTS = false; // Change to true to test no-results state
        
        const API_BASE = window.APP_CONFIG?.API_BASE || 'https://symbia.it:5000';
        let authToken = localStorage.getItem('authToken');
        
        // DOM element cache for performance optimization
        const DOM_CACHE = {
            documentsGrid: null,
            searchSection: null,
            documentCountContainer: null,
            documentCount: null,
            searchInput: null,
            init() {
                this.documentsGrid = component.shadowRoot.getElementById('documentsGrid');
                this.searchSection = component.shadowRoot.querySelector('.search-section');
                this.documentCountContainer = component.shadowRoot.getElementById('documentCountContainer');
                this.documentCount = component.shadowRoot.getElementById('documentCount');
                this.searchInput = component.shadowRoot.getElementById('searchInput');
            },
            get(elementName) {
                if (!this[elementName]) {
                    this.init();
                }
                return this[elementName];
            }
        };
        
        // Bind the component instance to DOM_CACHE
        DOM_CACHE.shadowRoot = component.shadowRoot;
        
        // Instance-specific debug function
        const debugPensatoTextPosition = () => {
            console.log('🔍 === DEBUGGING "Pensato per chi vuole di più" TEXT POSITION ===');
            
            // Find the search subtitle element
            const searchSubtitle = component.shadowRoot.querySelector('.search-subtitle');
            if (searchSubtitle) {
                const rect = searchSubtitle.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(searchSubtitle);
                
                console.log('📍 Search Subtitle ("Pensato per chi vuole di più"):');
                console.log('  - Text content:', searchSubtitle.textContent.trim());
                console.log('  - Position:', {
                    top: rect.top,
                    left: rect.left,
                    bottom: rect.bottom,
                    right: rect.right,
                    width: rect.width,
                    height: rect.height
                });
                console.log('  - CSS Properties:', {
                    margin: computedStyle.margin,
                    padding: computedStyle.padding,
                    position: computedStyle.position,
                    top: computedStyle.top,
                    left: computedStyle.left,
                    transform: computedStyle.transform,
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    opacity: computedStyle.opacity
                });
                console.log('  - Parent container:', searchSubtitle.parentElement?.className);
            } else {
                console.log('❌ Search subtitle element not found');
            }
        };
        
        // Make debug function available on this instance only
        component.debugPensatoTextPosition = debugPensatoTextPosition;
        
        // Instance-specific functions that don't use global variables
        const updateCoursesForCourse = () => {
            // Implementation using component.instanceData instead of window.facultyCoursesData
            if (component.instanceData.facultyCoursesData) {
                // Course update logic here
                console.log('Updating courses for component instance');
            }
        };
        
        // Store instance-specific functions
        component.instanceData.updateCoursesForCourse = updateCoursesForCourse;
        
        // Initialize component-specific data
        this.initializeComponentData();
        
        // Set up event listeners for this specific component instance
        this.setupEventListeners();
    }
    
    // Initialize component-specific data
    initializeComponentData() {
        // Load faculty courses data for this instance
        this.loadFacultyCoursesData();
        
        // Load file types and tags for this instance
        this.loadFileTypesAndTags();
    }
    
    // Load faculty courses data for this instance
    async loadFacultyCoursesData() {
        try {
            const response = await fetch('https://symbia.it:5000/api/faculty-courses');
            if (response.ok) {
                const data = await response.json();
                this.instanceData.facultyCoursesData = data;
            } else {
                this.instanceData.facultyCoursesData = {};
            }
        } catch (error) {
            console.error('Error loading faculty courses data:', error);
            this.instanceData.facultyCoursesData = {};
        }
    }
    
    // Load file types and tags for this instance
    async loadFileTypesAndTags() {
        try {
            const response = await fetch('https://symbia.it:5000/api/file-types-and-tags');
            if (response.ok) {
                const data = await response.json();
                this.instanceData.allFileTypes = data.fileTypes || [];
                this.instanceData.allTags = data.tags || [];
            } else {
                this.instanceData.allFileTypes = [];
                this.instanceData.allTags = ['appunti', 'dispense', 'esercizi'];
            }
        } catch (error) {
            console.error('Error loading file types and tags:', error);
            this.instanceData.allFileTypes = [];
            this.instanceData.allTags = ['appunti', 'dispense', 'esercizi'];
        }
    }
    
    // Set up event listeners for this specific component instance
    setupEventListeners() {
        // Add resize listener for this instance
        if (!this.instanceData.loadingCardsResizeListener) {
            this.instanceData.loadingCardsResizeListener = this.debounce(() => {
                // Resize logic for this component instance
                console.log('Resizing loading cards for component instance');
            }, 250);
            
            window.addEventListener('resize', this.instanceData.loadingCardsResizeListener);
        }
    }
    
    // Debounce utility function
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
    
    // Clean up when component is removed
    disconnectedCallback() {
        // Remove event listeners for this instance
        if (this.instanceData.loadingCardsResizeListener) {
            window.removeEventListener('resize', this.instanceData.loadingCardsResizeListener);
        }
        
        // Clear instance data
        this.instanceData = null;
    }
    
    // Render method (simplified for this example)
    render() {
        const apiBase = this.getAttribute('api-base') || 'https://symbia.it:5000';
        const placeholderText = this.getAttribute('placeholder-text') || 'Cerca una dispensa...';
        const buttonText = this.getAttribute('button-text') || 'Cerca';
        
        this.shadowRoot.innerHTML = `
            <style>
                /* Component styles here */
                .search-section {
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin: 20px 0;
                }
                .search-input {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 16px;
                }
                .search-button {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 10px;
                }
                .search-subtitle {
                    color: #666;
                    font-size: 14px;
                    margin-top: 8px;
                }
            </style>
            <div class="search-section">
                <input type="text" id="searchInput" class="search-input" placeholder="${placeholderText}">
                <button class="search-button">${buttonText}</button>
                <div class="search-subtitle">Pensato per chi vuole di più</div>
            </div>
        `;
        
        // Add event listeners for this instance
        const searchInput = this.shadowRoot.getElementById('searchInput');
        const searchButton = this.shadowRoot.querySelector('.search-button');
        
        if (searchInput && searchButton) {
            searchButton.addEventListener('click', () => {
                this.performSearch(searchInput.value);
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(searchInput.value);
                }
            });
        }
    }
    
    // Perform search for this instance
    performSearch(query) {
        console.log(`Searching for "${query}" in component instance`);
        // Search logic here using this.instanceData instead of global variables
    }
}

// Register the custom element
customElements.define('search-section-component', SearchSectionComponent); 