// Custom Element: search-section-component
class SearchSectionComponent extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      // Generate unique instance ID to prevent conflicts between multiple instances
      // Use provided instance-id attribute or generate a unique one
      const providedId = this.getAttribute('instance-id');
      this.instanceId = providedId || 'search-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
      this.isInitialized = false;
    }
  
    static get observedAttributes() {
      return ['api-base', 'auth-token', 'placeholder-text', 'button-text', 'instance-id'];
    }
  
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue !== newValue) {
        this.render();
      }
    }
  
    connectedCallback() {
      // Prevent duplicate initialization
      if (this.isInitialized) {
        console.log(`🔄 Search component ${this.instanceId} already initialized, skipping`);
        return;
      }
      
      console.log(`🚀 Initializing search component ${this.instanceId}`);
      this.render();
      
      // Mark as initialized to prevent duplicate setup
      this.isInitialized = true;
      
      // Initialize this component instance completely
      this.initializeComponentInstance();
      this.setupInstanceEventListeners();
    }
    
    disconnectedCallback() {
      // Cleanup when component is removed
      console.log(`🔌 Component ${this.instanceId} disconnected`);
      
      // Clean up all event listeners
      if (this.cleanupEventListeners) {
          this.cleanupEventListeners();
      }
      
      // Clean up instance-specific storage if needed
      if (this.removeStorageItem) {
          this.removeStorageItem('filters');
          this.removeStorageItem('tags');
          this.removeStorageItem('ai_search');
      }
      
      if (this.removeSessionItem) {
          this.removeSessionItem('favorites_changed');
          this.removeSessionItem('navigating');
      }
      
      // Clean up any remaining global references
      if (this.loadingCardsResizeListener) {
          this.loadingCardsResizeListener = null;
      }
      
      // Clear any cached data
      this.facultyCoursesData = null;
      this.allTags = [];
      this.allFileTypes = [];
      
      // Clear component state
      if (this.componentState) {
          this.componentState.currentVetrine = [];
          this.componentState.currentFiles = [];
          this.componentState.originalFiles = [];
      }
    }
    
    initializeComponentInstance() {
      // Store reference to component instance for use in nested functions
      const component = this;
      
      // Helper function to generate unique IDs for this instance
      this.getUniqueId = (baseId) => `${baseId}-${this.instanceId}`;
      
      // Helper function to get DOM elements with instance-specific IDs
      this.getElement = (elementId) => {
          return component.shadowRoot.getElementById(this.getUniqueId(elementId));
      };
      
      // Instance-specific configuration
      this.CACHE_BUSTER = Date.now();
      this.DEV_MODE_NO_RESULTS = false; // Change to true to test no-results state
      this.API_BASE = window.APP_CONFIG?.API_BASE || 'https://symbia.it:5000';
      this.authToken = localStorage.getItem('authToken');
      
      // Instance-specific data storage
      this.facultyCoursesData = null;
      this.allTags = [];
      this.allFileTypes = [];
      
      // Instance-specific storage keys to prevent conflicts
      this.storagePrefix = `search_component_${this.instanceId}_`;
      this.cacheBusterKey = `${this.storagePrefix}cache_buster`;
      this.filtersKey = `${this.storagePrefix}filters`;
      this.tagsKey = `${this.storagePrefix}tags`;
      this.aiSearchKey = `${this.storagePrefix}ai_search`;
      this.favoritesKey = `${this.storagePrefix}favorites_changed`;
      this.navigationKey = `${this.storagePrefix}navigating`;
      
      // Instance-specific event listener tracking
      this.eventListeners = new Map();
      
      // Setup instance-specific event listeners
      this.setupInstanceEventListeners = function() {
          // Click handler for actions inside this component only
          this.addGlobalEventListener(document, 'click', (e) => {
              if (!this.shadowRoot.contains(e.target)) return;
              
              // Handle filter actions
              if (e.target.closest('[data-action="clear-all-filters"]')) {
                  this.clearAllFiltersAction();
              }
              
              if (e.target.closest('[data-action="remove-filter"]')) {
                  const element = e.target.closest('[data-action="remove-filter"]');
                  const filterKey = element.getAttribute('data-filter-key');
                  const specificValue = element.getAttribute('data-specific-value');
                  if (filterKey) {
                      this.removeActiveFilter(filterKey, e, specificValue);
                  }
              }
              
              if (e.target.closest('[data-action="toggle-favorite"]')) {
                  const element = e.target.closest('[data-action="toggle-favorite"]');
                  this.toggleFavorite(element, e);
              }
              
              if (e.target.closest('[data-action="navigate"]')) {
                  const element = e.target.closest('[data-action="navigate"]');
                  const url = element.getAttribute('data-url');
                  if (url) {
                      window.location.href = url;
                  }
              }
              
              if (e.target.closest('[data-action="download-document"]')) {
                  const element = e.target.closest('[data-action="download-document"]');
                  const fileId = element.getAttribute('data-file-id');
                  if (fileId) {
                      this.downloadDocument(fileId);
                      this.closePreview();
                  }
              }
              
              if (e.target.closest('[data-action="purchase-document"]')) {
                  const element = e.target.closest('[data-action="purchase-document"]');
                  const fileId = element.getAttribute('data-file-id');
                  if (fileId) {
                      this.purchaseDocument(fileId);
                      this.closePreview();
                  }
              }
              
              if (e.target.closest('[data-action="close-preview"]')) {
                  this.closePreview();
              }
              
              if (e.target.closest('[data-action="view-full-document"]')) {
                  const element = e.target.closest('[data-action="view-full-document"]');
                  const docId = element.getAttribute('data-doc-id');
                  if (docId) {
                      window.location.href = `document-preview.html?id=${docId}`;
                  }
              }
              
              if (e.target.closest('[data-action="add-to-cart"]')) {
                  const element = e.target.closest('[data-action="add-to-cart"]');
                  const docId = element.getAttribute('data-doc-id');
                  if (docId) {
                      this.addToCart(docId, e);
                  }
              }
          });
          
          // Keydown handler for shortcuts and Escape
          this.addGlobalEventListener(document, 'keydown', (e) => {
              // Only handle if focus is inside this component
              if (!this.shadowRoot.contains(document.activeElement)) return;
              
              if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'c') {
                  e.preventDefault();
                  this.clearAllFiltersAction();
              }
              
              if (e.key === 'Escape' && this.componentState.isFiltersOpen) {
                  this.closeFiltersPanel();
              }
          });
          
          // Window navigation events (these are global, but we still clean them up per instance)
          this.addGlobalEventListener(window, 'pageshow', (event) => {
              const favoritesChanged = this.getSessionItem('favorites_changed');
              if (favoritesChanged === 'true') {
                  this.removeSessionItem('favorites_changed');
              }
          });
          
          this.addGlobalEventListener(window, 'beforeunload', () => {
              this.isLeavingPage = true;
          });
          
          this.addGlobalEventListener(window, 'pageshow', async (event) => {
              if (this.isLeavingPage && this.componentState.currentFiles && this.componentState.currentFiles.length > 0) {
                  this.isLeavingPage = false;
              }
          });
          
          this.addGlobalEventListener(window, 'popstate', async (event) => {
              if (this.componentState.currentFiles && this.componentState.currentFiles.length > 0) {
                  // No-op, but reserved for future instance logic
              }
          });
          
          // Window resize and scroll events
          this.addGlobalEventListener(window, 'resize', () => {
              this.repositionOpenDropdowns();
          });
          
          this.addGlobalEventListener(window, 'scroll', () => {
              this.repositionOpenDropdowns();
          });
          
          this.addGlobalEventListener(window, 'resize', () => {
              if (this.loadingCardsResizeListener) {
                  this.loadingCardsResizeListener();
              }
          });
          
          this.addGlobalEventListener(window, 'scroll', (e) => {
              if (this.handleScroll) {
                  this.handleScroll(e);
              }
          });
          
          this.addGlobalEventListener(window, 'resize', () => {
              if (this.adjustScrollThreshold) {
                  this.adjustScrollThreshold();
              }
          });
          
          this.addGlobalEventListener(window, 'scroll', (e) => {
              if (this.throttledHandleScroll) {
                  this.throttledHandleScroll(e);
              }
          });
          
          this.addGlobalEventListener(window, 'load', () => {
              if (this.adjustBackgroundPosition) {
                  this.adjustBackgroundPosition();
              }
          });
          
          this.addGlobalEventListener(window, 'resize', () => {
              if (this.adjustBackgroundPosition) {
                  this.debounce(this.adjustBackgroundPosition, 50)();
              }
          });
          
          this.addGlobalEventListener(window, 'scroll', () => {
              const searchContainerWrapper = this.shadowRoot.querySelector('.search-container-wrapper');
              if (searchContainerWrapper) {
                  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                  if (scrollTop > 100) {
                      searchContainerWrapper.classList.add('is-stuck');
                  } else {
                      searchContainerWrapper.classList.remove('is-stuck');
                  }
              }
          });
          
          // DOMContentLoaded events
          this.addGlobalEventListener(document, 'DOMContentLoaded', () => {
              if (this.adjustBackgroundPosition) {
                  this.adjustBackgroundPosition();
              }
          });
          
          this.addGlobalEventListener(document, 'DOMContentLoaded', () => {
              this.showIconsImmediately();
          });
          
          this.addGlobalEventListener(document, 'DOMContentLoaded', () => {
              if (this.initializePagesRangeFilter) {
                  this.initializePagesRangeFilter();
              }
          });
      };
      
      // Instance-specific constants
      this.HIERARCHY_CACHE_KEY = `hierarchy_data_cache_${this.instanceId}`;
      
      // Instance-specific typewriter suggestions
      this.standardSuggestions = [
          'Cerca appunti di matematica...',
          'Trova dispense di fisica...',
          'Esercizi di programmazione...',
          'Appunti di economia...',
          'Dispense di ingegneria...'
      ];
      
      this.aiSuggestions = [
          'Trova documenti simili a...',
          'Cerca materiale correlato a...',
          'Mostrami appunti su...',
          'Trova esercizi simili a...',
          'Cerca dispense correlate a...'
      ];
      
      // Instance-specific storage methods
      this.setStorageItem = (key, value) => {
          const fullKey = `${this.storagePrefix}${key}`;
          localStorage.setItem(fullKey, JSON.stringify(value));
      };
      
      this.getStorageItem = (key, defaultValue = null) => {
          const fullKey = `${this.storagePrefix}${key}`;
          const item = localStorage.getItem(fullKey);
          return item ? JSON.parse(item) : defaultValue;
      };
      
      this.removeStorageItem = (key) => {
          const fullKey = `${this.storagePrefix}${key}`;
          localStorage.removeItem(fullKey);
      };
      
      this.setSessionItem = (key, value) => {
          const fullKey = `${this.storagePrefix}${key}`;
          sessionStorage.setItem(fullKey, JSON.stringify(value));
      };
      
      this.getSessionItem = (key, defaultValue = null) => {
          const fullKey = `${this.storagePrefix}${key}`;
          const item = sessionStorage.getItem(fullKey);
          return item ? JSON.parse(item) : defaultValue;
      };
      
      this.removeSessionItem = (key) => {
          const fullKey = `${this.storagePrefix}${key}`;
          sessionStorage.removeItem(fullKey);
      };
      
      // Instance-specific event listener management
      this.addGlobalEventListener = (target, event, handler, options = {}) => {
          const listenerId = `${event}_${Date.now()}_${Math.random()}`;
          target.addEventListener(event, handler, options);
          this.eventListeners.set(listenerId, { target, event, handler, options });
          return listenerId;
      };
      
      this.removeGlobalEventListener = (listenerId) => {
          const listener = this.eventListeners.get(listenerId);
          if (listener) {
              listener.target.removeEventListener(listener.event, listener.handler, listener.options);
              this.eventListeners.delete(listenerId);
          }
      };
      
      this.cleanupEventListeners = () => {
          this.eventListeners.forEach((listener, id) => {
              listener.target.removeEventListener(listener.event, listener.handler, listener.options);
          });
          this.eventListeners.clear();
      };
      
      // Instance-specific DOM element cache
      this.DOM_CACHE = {
          documentsGrid: null,
          searchSection: null,
          documentCountContainer: null,
          documentCount: null,
          searchInput: null,
          filtersBtn: null,
          filterCount: null,
          init: () => {
              this.DOM_CACHE.documentsGrid = component.shadowRoot.getElementById(this.getUniqueId('documentsGrid'));
              this.DOM_CACHE.searchSection = component.shadowRoot.querySelector('.search-section');
              this.DOM_CACHE.documentCountContainer = component.shadowRoot.getElementById(this.getUniqueId('documentCountContainer'));
              this.DOM_CACHE.documentCount = component.shadowRoot.getElementById(this.getUniqueId('documentCount'));
              this.DOM_CACHE.searchInput = component.shadowRoot.getElementById(this.getUniqueId('searchInput'));
              this.DOM_CACHE.filtersBtn = component.shadowRoot.getElementById(this.getUniqueId('filtersBtn'));
              this.DOM_CACHE.filterCount = component.shadowRoot.getElementById(this.getUniqueId('filterCount'));
          },
          get: (elementName) => {
              if (!this.DOM_CACHE[elementName]) {
                  this.DOM_CACHE.init();
              }
              return this.DOM_CACHE[elementName];
          }
      };
      
      // Create local references for backward compatibility within this instance
      const DOM_CACHE = this.DOM_CACHE;
      const getUniqueId = this.getUniqueId;
      const getElement = this.getElement;
      const API_BASE = this.API_BASE;
      let authToken = this.authToken;
      
      // Debug function to track "Pensato per chi vuole di più" text position
      const debugPensatoTextPosition = () => {
          // Debug function for this component instance
          component.debugPensatoTextPosition = debugPensatoTextPosition;
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
          
          // Check search section
          const searchSection = component.shadowRoot.querySelector('.search-section');
          if (searchSection) {
              const rect = searchSection.getBoundingClientRect();
              const computedStyle = window.getComputedStyle(searchSection);
              
              console.log('📍 Search Section:');
              console.log('  - Position:', {
                  top: rect.top,
                  left: rect.left,
                  bottom: rect.bottom,
                  right: rect.right,
                  width: rect.width,
                  height: rect.height
              });
              console.log('  - CSS Properties:', {
                  minHeight: computedStyle.minHeight,
                  height: computedStyle.height,
                  padding: computedStyle.padding,
                  margin: computedStyle.margin,
                  position: computedStyle.position,
                  display: computedStyle.display
              });
              console.log('  - Has no-results class:', searchSection.classList.contains('has-results'));
          }
          
          // Check documents grid
          const documentsGrid = component.shadowRoot.getElementById(getUniqueId('documentsGrid'));
          if (documentsGrid) {
              const rect = documentsGrid.getBoundingClientRect();
              const computedStyle = window.getComputedStyle(documentsGrid);
              const hasNoResults = documentsGrid.querySelector('.no-results');
              
              console.log('📍 Documents Grid:');
              console.log('  - Position:', {
                  top: rect.top,
                  left: rect.left,
                  bottom: rect.bottom,
                  right: rect.right,
                  width: rect.width,
                  height: rect.height
              });
              console.log('  - CSS Properties:', {
                  minHeight: computedStyle.minHeight,
                  height: computedStyle.height,
                  padding: computedStyle.padding,
                  margin: computedStyle.margin,
                  position: computedStyle.position,
                  display: computedStyle.display,
                  gridTemplateColumns: computedStyle.gridTemplateColumns
              });
              console.log('  - Has no-results:', !!hasNoResults);
              console.log('  - Number of children:', documentsGrid.children.length);
              console.log('  - Loading cards count:', documentsGrid.querySelectorAll('.document-card.loading').length);
          }
          
          // Check main content
          const mainContent = component.shadowRoot.querySelector('.main-content');
          if (mainContent) {
              const rect = mainContent.getBoundingClientRect();
              const computedStyle = window.getComputedStyle(mainContent);
              
              console.log('📍 Main Content:');
              console.log('  - Position:', {
                  top: rect.top,
                  left: rect.left,
                  bottom: rect.bottom,
                  right: rect.right,
                  width: rect.width,
                  height: rect.height
              });
              console.log('  - CSS Properties:', {
                  padding: computedStyle.padding,
                  margin: computedStyle.margin,
                  position: computedStyle.position,
                  display: computedStyle.display
              });
          }
          
          // Check if we're in no-results state
          const noResultsElement = component.shadowRoot.querySelector('.no-results');
          if (noResultsElement) {
              const rect = noResultsElement.getBoundingClientRect();
              const computedStyle = window.getComputedStyle(noResultsElement);
              
              console.log('📍 No-Results Element:');
              console.log('  - Position:', {
                  top: rect.top,
                  left: rect.left,
                  bottom: rect.bottom,
                  right: rect.right,
                  width: rect.width,
                  height: rect.height
              });
              console.log('  - CSS Properties:', {
                  position: computedStyle.position,
                  top: computedStyle.top,
                  left: computedStyle.left,
                  transform: computedStyle.transform,
                  zIndex: computedStyle.zIndex,
                  display: computedStyle.display
              });
          }
          
          // Check elements below the grid that might be affected
          const elementsBelowGrid = [];
          if (documentsGrid) {
              let nextElement = documentsGrid.nextElementSibling;
              let count = 0;
              while (nextElement && count < 5) {
                  const rect = nextElement.getBoundingClientRect();
                  elementsBelowGrid.push({
                      element: nextElement,
                      className: nextElement.className,
                      tagName: nextElement.tagName,
                      position: {
                          top: rect.top,
                          left: rect.left,
                          bottom: rect.bottom,
                          right: rect.right,
                          width: rect.width,
                          height: rect.height
                      }
                  });
                  nextElement = nextElement.nextElementSibling;
                  count++;
              }
          }
          
          if (elementsBelowGrid.length > 0) {
              console.log('📍 Elements Below Grid:');
              elementsBelowGrid.forEach((item, index) => {
                  console.log(`  ${index + 1}. ${item.tagName}.${item.className}:`, item.position);
              });
          }
          
          console.log('🔍 === END DEBUGGING ===\n');
      }
      
      // Handle CSP-compliant event handlers - now handled in setupInstanceEventListeners
      this.handleCSPEventHandlers = function() {
          // This method is now deprecated - all event handling is done in setupInstanceEventListeners
          console.log('handleCSPEventHandlers is deprecated - use setupInstanceEventListeners');
      };
      
      // Check if user is authenticated, but don't redirect - just return status
      this.checkAuthentication = function() {
          return !!this.authToken;
      };
      
            // Create instance-specific state to prevent conflicts between multiple components
      this.componentState = {
          currentVetrine: [],
          currentFiles: [],
          originalFiles: [], // Keep original unfiltered data
          isFiltersOpen: false,
          isSearching: false,
          currentPage: 1,
          totalPages: 1,
          searchQuery: '',
          appliedFilters: {},
          documentCount: 0
      };
      
            // Initialize instance methods
    this.initializeInstanceMethods = this.initializeInstanceMethods.bind(this);
    this.handleCSPEventHandlers = this.handleCSPEventHandlers.bind(this);
    this.checkAuthentication = this.checkAuthentication.bind(this);
    this.initializeUserInfo = this.initializeUserInfo.bind(this);
    this.fetchCurrentUserData = this.fetchCurrentUserData.bind(this);
    this.updateHeaderUserInfo = this.updateHeaderUserInfo.bind(this);
    this.initializeStaticComponents = this.initializeStaticComponents.bind(this);
    this.initializeDynamicComponents = this.initializeDynamicComponents.bind(this);
    this.initializeAnimations = this.initializeAnimations.bind(this);
    this.initializeFilters = this.initializeFilters.bind(this);
    this.initializeFilterControls = this.initializeFilterControls.bind(this);
    this.handleFilterChangeImmediate = this.handleFilterChangeImmediate.bind(this);
    this.initializeCourseFilter = this.initializeCourseFilter.bind(this);
    this.updateCourses = this.updateCourses.bind(this);
    this.showSuggestions = this.showSuggestions.bind(this);
    this.hideSuggestions = this.hideSuggestions.bind(this);
    this.handleKeyNavigation = this.handleKeyNavigation.bind(this);
    this.updateSelection = this.updateSelection.bind(this);
    this.selectCourse = this.selectCourse.bind(this);
    this.initializeCanaleFilter = this.initializeCanaleFilter.bind(this);
    this.selectCanale = this.selectCanale.bind(this);
    this.clearCourseFilter = this.clearCourseFilter.bind(this);
    this.updateCoursesForFaculty = this.updateCoursesForFaculty.bind(this);
    this.setupDropdowns = this.setupDropdowns.bind(this);
    this.toggleDropdown = this.toggleDropdown.bind(this);
    this.positionDropdown = this.positionDropdown.bind(this);
    this.closeAllDropdowns = this.closeAllDropdowns.bind(this);
    this.repositionOpenDropdowns = this.repositionOpenDropdowns.bind(this);
    this.resetDropdownHighlight = this.resetDropdownHighlight.bind(this);
    this.getHierarchyCache = this.getHierarchyCache.bind(this);
    this.setHierarchyCache = this.setHierarchyCache.bind(this);
    this.clearHierarchyCache = this.clearHierarchyCache.bind(this);
    this.loadHierarchyData = this.loadHierarchyData.bind(this);
    this.getExpiredHierarchyCache = this.getExpiredHierarchyCache.bind(this);
    this.refreshHierarchyData = this.refreshHierarchyData.bind(this);
    this.populateDropdownOptions = this.populateDropdownOptions.bind(this);
    this.populateOptions = this.populateOptions.bind(this);
    this.filterDropdownOptions = this.filterDropdownOptions.bind(this);
    this.selectDropdownOption = this.selectDropdownOption.bind(this);
    this.removeSpecificFilterValue = this.removeSpecificFilterValue.bind(this);
    this.updateActiveFilterIndicators = this.updateActiveFilterIndicators.bind(this);
    this.removeFilterFromDropdown = this.removeFilterFromDropdown.bind(this);
    this.handleDropdownKeyboard = this.handleDropdownKeyboard.bind(this);
    this.initializeRatingFilter = this.initializeRatingFilter.bind(this);
    this.initializeToggleFilters = this.initializeToggleFilters.bind(this);
    this.initializePriceRangeFilter = this.initializePriceRangeFilter.bind(this);
    this.debounce = this.debounce.bind(this);
    this.handlePriceRangeChange = this.handlePriceRangeChange.bind(this);
    this.updatePriceSliderFill = this.updatePriceSliderFill.bind(this);
    this.initializeEditableValues = this.initializeEditableValues.bind(this);
    this.handleEditableValueClick = this.handleEditableValueClick.bind(this);
    this.handleEditableValueKeydown = this.handleEditableValueKeydown.bind(this);
    this.handleEditableValueInputKeydown = this.handleEditableValueInputKeydown.bind(this);
    this.handleEditableValueBlur = this.handleEditableValueBlur.bind(this);
    this.updateRangeSliderFromEditableValue = this.updateRangeSliderFromEditableValue.bind(this);
    this.applyPriceFilters = this.applyPriceFilters.bind(this);
    this.initializeOrderDropdown = this.initializeOrderDropdown.bind(this);
    this.selectOrderOption = this.selectOrderOption.bind(this);
    this.applyOrderToResults = this.applyOrderToResults.bind(this);
    this.sortDocuments = this.sortDocuments.bind(this);
    this.applyFiltersAndRender = this.applyFiltersAndRender.bind(this);
    this.toggleFiltersPanel = this.toggleFiltersPanel.bind(this);
    this.addBottomClearAllButton = this.addBottomClearAllButton.bind(this);
    this.updateBottomFilterCount = this.updateBottomFilterCount.bind(this);
    this.updateActiveFiltersDisplay = this.updateActiveFiltersDisplay.bind(this);
    this.closeFiltersPanel = this.closeFiltersPanel.bind(this);
    this.populateFilterOptions = this.populateFilterOptions.bind(this);
    this.populateDropdownFilter = this.populateDropdownFilter.bind(this);
    this.populateSelect = this.populateSelect.bind(this);
    this.clearAllFiltersAction = this.clearAllFiltersAction.bind(this);
    this.applyFiltersToFiles = this.applyFiltersToFiles.bind(this);
    this.removeActiveFilter = this.removeActiveFilter.bind(this);
    this.removeSpecificFilterValueFromPill = this.removeSpecificFilterValueFromPill.bind(this);
    this.clearAllActiveFilters = this.clearAllActiveFilters.bind(this);
    this.removeFilter = this.removeFilter.bind(this);
    this.getAvatarVariant = this.getAvatarVariant.bind(this);
    this.getConsistentGradient = this.getConsistentGradient.bind(this);
    this.createGradientAvatar = this.createGradientAvatar.bind(this);
    this.getInitials = this.getInitials.bind(this);
    this.makeRequest = this.makeRequest.bind(this);
    this.makeSimpleRequest = this.makeSimpleRequest.bind(this);
    this.makeAuthenticatedRequest = this.makeAuthenticatedRequest.bind(this);
    this.showLoadingCards = this.showLoadingCards.bind(this);
    this.loadAllFiles = this.loadAllFiles.bind(this);
    this.extractCourseFromVetrina = this.extractCourseFromVetrina.bind(this);
    this.extractFacultyFromVetrina = this.extractFacultyFromVetrina.bind(this);
    this.extractTagsFromVetrina = this.extractTagsFromVetrina.bind(this);
    this.extractPrimaryTagFromVetrina = this.extractPrimaryTagFromVetrina.bind(this);
    this.loadValidTags = this.loadValidTags.bind(this);
    this.updateDocumentCardTags = this.updateDocumentCardTags.bind(this);
    this.getFileTypeFromFilename = this.getFileTypeFromFilename.bind(this);
    this.loadVetrinaFiles = this.loadVetrinaFiles.bind(this);
    this.getDocumentPreviewIcon = this.getDocumentPreviewIcon.bind(this);
    this.getDocumentCategory = this.getDocumentCategory.bind(this);
    this.getTagIcon = this.getTagIcon.bind(this);
    }
    
    initializeInstanceMethods() {
      // Make critical functions instance-specific to prevent conflicts between components
      
      // Instance-specific showStatus function
      this.showStatus = function(message, type = 'success') {
          console.log(`[${this.instanceId}] Status: ${message}`);
          const documentCount = this.DOM_CACHE.get('documentCount');
          if (documentCount) {
              documentCount.textContent = message;
              this.componentState.documentCount = message;
          }
      };
      
      // Instance-specific renderDocuments function
      this.renderDocuments = function(files) {
          console.log(`[${this.instanceId}] Rendering ${files.length} documents`);
          const documentsGrid = this.DOM_CACHE.get('documentsGrid');
          if (documentsGrid) {
              // Clear existing content
              documentsGrid.innerHTML = '';
              
              // Update component state
              this.componentState.currentFiles = files;
              this.componentState.originalFiles = [...files];
              
              // Update document count
              this.showStatus(`${files.length} documenti trovati`);
              
              // Create simple document cards for testing
              if (files.length > 0) {
                  files.forEach((file, index) => {
                      const card = document.createElement('div');
                      card.className = 'document-card';
                      card.innerHTML = `
                          <div class="document-preview">
                              <div class="document-title">${file.title || `Document ${index + 1}`}</div>
                              <div class="document-meta">Component: ${this.instanceId}</div>
                          </div>
                      `;
                      documentsGrid.appendChild(card);
                  });
              } else {
                  // Show empty state
                  documentsGrid.innerHTML = `
                      <div class="no-results">
                          <div class="no-results-text">
                              <h3>Nessun documento trovato</h3>
                              <p>Component: ${this.instanceId}</p>
                          </div>
                      </div>
                  `;
              }
          }
      };
    }
    
    startComponentLogic() {
      
      // Create local references for backward compatibility within this instance
      let currentVetrine = this.componentState.currentVetrine;
      let currentFiles = this.componentState.currentFiles;
      let originalFiles = this.componentState.originalFiles;
      let isFiltersOpen = this.componentState.isFiltersOpen;
      
      // Use instance-specific references
      const DOM_CACHE = this.DOM_CACHE;
      const getUniqueId = this.getUniqueId;
      const getElement = this.getElement;
      const API_BASE = this.API_BASE;
      let authToken = this.authToken;
      
      // Override functions to use instance methods
      const showStatus = this.showStatus;
      const renderDocuments = this.renderDocuments;
      
      // Initialize component with test data based on instance
      setTimeout(() => {
          showStatus(`Component ${component.instanceId} initialized`);
          
          // Create different test data for each component
          let testData = [];
          const instanceId = component.instanceId;
          
          if (instanceId.includes('main')) {
              testData = [
                  { title: 'Main Document 1', type: 'main' },
                  { title: 'Main Document 2', type: 'main' },
                  { title: 'Main Document 3', type: 'main' }
              ];
          } else if (instanceId.includes('documents')) {
              testData = [
                  { title: 'My Document 1', type: 'documents' },
                  { title: 'My Document 2', type: 'documents' }
              ];
          } else if (instanceId.includes('favorites')) {
              testData = [
                  { title: 'Favorite Document 1', type: 'favorites' },
                  { title: 'Favorite Document 2', type: 'favorites' },
                  { title: 'Favorite Document 3', type: 'favorites' },
                  { title: 'Favorite Document 4', type: 'favorites' }
              ];
          }
          
          renderDocuments(testData);
                }, 100);
          
          // Initialize the component
          const initializeComponent = async function() {
              // Show loading cards immediately when page loads
              showLoadingCards();
              
              // Force clear any cached data that might be causing issues
                        if (component.getSessionItem('cache_buster') !== component.CACHE_BUSTER.toString()) {
              // Only clear this component's session storage, not all
              component.removeSessionItem('cache_buster');
              component.setSessionItem('cache_buster', component.CACHE_BUSTER.toString());
              }
              
              // Check authentication after showing loading state
              const isAuthenticated = component.checkAuthentication();
              
              // Initialize user info (will show login button if not authenticated)
              component.initializeUserInfo();
              
              // Initialize CSP-compliant event handlers
              component.handleCSPEventHandlers();
              
              // Use requestAnimationFrame to ensure DOM is ready before initializing UI components
              requestAnimationFrame(() => {
                  component.initializeStaticComponents();
              });
              
              // Load valid tags from backend first
              await component.loadValidTags();
              
              // Load files for both authenticated and guest users
              await component.loadAllFiles();
      
                  // Ensure documents are shown after loading
          if (originalFiles && originalFiles.length > 0) {
              renderDocuments(originalFiles);
              component.componentState.currentFiles = component.componentState.originalFiles;
              currentFiles = component.componentState.currentFiles;
              showStatus(`${originalFiles.length} documenti disponibili 📚`);
              
              // Initialize dynamic components after data is loaded
              component.initializeDynamicComponents();
              
              // Debug position after initial render
              setTimeout(() => component.debugPensatoTextPosition(), 200);
          }
              
              // Small delay to ensure DOM is fully ready, then clear filters (fresh start)
              setTimeout(() => {
                  restoreFiltersFromStorage();
                  
                  // Additional check to ensure all UI elements are properly updated
                  setTimeout(() => {
                      updateActiveFilterIndicators();
                      updateActiveFiltersDisplay();
                      
                      // Final safety check - if no documents are shown, show all documents
                      setTimeout(() => {
                          const documentsGrid = component.shadowRoot.getElementById ('documentsGrid');
                          if (documentsGrid && documentsGrid.children.length === 0 && originalFiles && originalFiles.length > 0) {
                              renderDocuments(originalFiles);
                              component.componentState.currentFiles = component.componentState.originalFiles;
                              currentFiles = component.componentState.currentFiles;
                              showStatus(`${originalFiles.length} documenti disponibili 📚`);
                          }
                      }, 500);
                  }, 50);
              }, 100);
              
              // Favorite status is already loaded from the backend in loadAllFiles()
              // No need to refresh on page load since the data is already correct
          
          // Keyboard shortcuts and navigation events are now handled in setupInstanceEventListeners
          // Mark when we're leaving the page
          this.isLeavingPage = false;
      };
      
      this.initializeUserInfo = async function() {
          const user = await component.fetchCurrentUserData();
          component.updateHeaderUserInfo(user);
      };
      
      this.fetchCurrentUserData = async function() {
          const cachedUser = localStorage.getItem('currentUser');
          if (cachedUser) {
              return JSON.parse(cachedUser);
          }
      
          // If cache is empty, return null (user is not authenticated)
          return null;
      };
      
      this.updateHeaderUserInfo = function(user) {
          const userAvatar = component.shadowRoot.getElementById ('userAvatar');
          const dropdownAvatar = component.shadowRoot.getElementById ('dropdownAvatar');
          const dropdownUserName = component.shadowRoot.getElementById ('dropdownUserName');
          const dropdownUserEmail = component.shadowRoot.getElementById ('dropdownUserEmail');
          
          if (user) {
              // Construct the user's full name for the avatar
              let fullName = '';
              if (user.name && user.surname) {
                  fullName = `${user.name} ${user.surname}`;
              } else if (user.name) {
                  fullName = user.name;
              } else if (user.username) {
                  fullName = user.username;
              } else {
                  fullName = 'User';
              }
              
              // Use consistent gradient avatar instead of UI Avatars service
              const gradientAvatar = createGradientAvatar(fullName, user.username);
              if (userAvatar) {
                  userAvatar.innerHTML = gradientAvatar;
              }
              
              // Apply the same gradient to dropdown avatar
              if (dropdownAvatar) {
                  const gradient = getConsistentGradient(user.username);
                  dropdownAvatar.style.background = gradient;
                  dropdownAvatar.textContent = getInitials(fullName);
                  dropdownAvatar.style.color = 'white';
                  dropdownAvatar.style.fontWeight = '700';
                  dropdownAvatar.style.fontSize = '18px';
                  dropdownAvatar.style.display = 'flex';
                  dropdownAvatar.style.alignItems = 'center';
                  dropdownAvatar.style.justifyContent = 'center';
              }
              
              if (dropdownUserName) {
                  dropdownUserName.textContent = user.username || fullName;
              }
              if (dropdownUserEmail) {
                  dropdownUserEmail.textContent = user.email;
              }
              
              // Handle hover and click for user avatar
              const userInfo = component.shadowRoot.querySelector('.user-info');
              let hoverTimeout;
              
              // Check if device supports hover
              const supportsHover = window.matchMedia('(hover: hover)').matches;
              
              if (supportsHover && userAvatar) {
                  // Show dropdown on hover with delay to prevent accidental closing
                  userAvatar.addEventListener('mouseenter', (event) => {
                      event.stopPropagation();
                      clearTimeout(hoverTimeout);
                      userInfo.classList.add('open');
                  });
                  
                  // Handle mouse enter on dropdown to keep it open
                  const userDropdown = component.shadowRoot.getElementById ('userDropdown');
                  if (userDropdown) {
                      userDropdown.addEventListener('mouseenter', (event) => {
                          event.stopPropagation();
                          clearTimeout(hoverTimeout);
                          userInfo.classList.add('open');
                      });
                  }
                  
                  // Hide dropdown when mouse leaves the user info area with small delay
                  userInfo.addEventListener('mouseleave', (event) => {
                      event.stopPropagation();
                      hoverTimeout = setTimeout(() => {
                          userInfo.classList.remove('open');
                      }, 150); // Small delay to allow moving to dropdown
                  });
                  
                  // Cancel timeout when re-entering the area
                  userInfo.addEventListener('mouseenter', (event) => {
                      event.stopPropagation();
                      clearTimeout(hoverTimeout);
                  });
              }
              
              // Redirect to profile when user clicks their avatar
              if (userAvatar) {
                  userAvatar.addEventListener('click', (event) => {
                      event.stopPropagation();
                      // Redirect to profile with user info
                      window.location.href = 'profile.html';
                  });
              }
      
              // Make dropdown user info clickable to redirect to profile
              const dropdownUserInfo = component.shadowRoot.querySelector('.dropdown-user-info');
              if (dropdownUserInfo) {
                  dropdownUserInfo.addEventListener('click', (event) => {
                      event.stopPropagation();
                      // Redirect to profile page
                      window.location.href = 'profile.html';
                  });
              }
      
              // Make dropdown avatar clickable to redirect to profile
              if (dropdownAvatar) {
                  dropdownAvatar.addEventListener('click', (event) => {
                      event.stopPropagation();
                      // Redirect to profile page
                      window.location.href = 'profile.html';
                  });
              }
      
              // Make dropdown username clickable to redirect to profile
              if (dropdownUserName) {
                  dropdownUserName.addEventListener('click', (event) => {
                      event.stopPropagation();
                      // Redirect to profile page
                      window.location.href = 'profile.html';
                  });
              }
      
              // Logout button
              const logoutBtn = component.shadowRoot.getElementById ('logoutBtn');
              if(logoutBtn) {
                  logoutBtn.addEventListener('click', (e) => {
                      e.preventDefault();
                      logout();
                  });
              }
      
          } else {
              // Handle case where user is not logged in - show login button
              userAvatar.innerHTML = `
                  <button class="login-btn" onclick="window.location.href='index.html'">
                      <span class="login-btn-text">Accedi</span>
                  </button>
              `;
              
              // Remove dropdown functionality for non-authenticated users
              const userInfo = component.shadowRoot.querySelector('.user-info');
              if (userInfo) {
                  userInfo.classList.remove('open');
              }
          }
      };
      
      // User info click handling is now done in setupInstanceEventListeners
      
      // ===========================
      // ROBUST INITIALIZATION SYSTEM
      // ===========================
      // Fixed timing issues where UI components were initialized before
      // shadow DOM elements were available. Now uses:
      // 1. requestAnimationFrame for static components (filters, scroll to top, AI toggle)
      // 2. Dynamic initialization after data loading for animations
      // 3. Proper error handling and retry mechanisms
      // 4. Debug logging for troubleshooting
      
      this.initializeStaticComponents = function() {
          try {
              // Initialize static UI components that depend on shadow DOM elements
              component.initializeFilters();
              component.initializeScrollToTop();
              component.initializeAISearchToggle();
              component.initializeReviewsOverlay();
              
              console.log('✅ Static UI components initialized successfully');
          } catch (error) {
              console.error('❌ Error initializing static components:', error);
              // Retry after a short delay if initialization fails
              setTimeout(() => {
                  console.log('🔄 Retrying static component initialization...');
                  component.initializeStaticComponents();
              }, 100);
          }
      };
      
      this.initializeDynamicComponents = function() {
          try {
              // Initialize components that depend on loaded data
              component.initializeAnimations();
              
              console.log('✅ Dynamic UI components initialized successfully');
          } catch (error) {
              console.error('❌ Error initializing dynamic components:', error);
          }
      };
      
      this.initializeAnimations = function() {
          // Animate document cards only if they exist
          const cards = component.shadowRoot.querySelectorAll('.document-card');
          
          console.log('🔍 Animation elements check:', {
              cardCount: cards.length
          });
          
          if (cards.length === 0) {
              console.log('ℹ️ No document cards found yet - animations will be applied when cards are rendered');
              return;
          }
          
          // Apply entrance animations to existing cards
          setTimeout(() => {
              cards.forEach((card, index) => {
                  card.style.opacity = '1';
                  card.style.transform = 'translateY(0)';
                  card.style.transitionDelay = `${index * 50}ms`; // Stagger animations
              });
          }, 100);
          
          console.log(`✅ Animations initialized for ${cards.length} document cards`);
      };
      
      // ===========================
      // ADVANCED FILTER SYSTEM - FULLY FUNCTIONAL
      // ===========================
      
      this.initializeFilters = function() {
          const filtersBtn = component.shadowRoot.getElementById(getUniqueId('filtersBtn'));
          const filtersPanel = component.shadowRoot.getElementById ('filtersPanel');
          const filtersOverlay = component.shadowRoot.getElementById ('filtersOverlay');
          const filtersClose = component.shadowRoot.getElementById ('filtersClose');
          const clearAllFilters = component.shadowRoot.getElementById ('clearAllFilters');
      
          // Debug element availability
          console.log('🔍 Filter elements check:', {
              filtersBtn: !!filtersBtn,
              filtersPanel: !!filtersPanel,
              filtersOverlay: !!filtersOverlay,
              filtersClose: !!filtersClose,
              clearAllFilters: !!clearAllFilters
          });
      
          // Filter panel toggle
          if (filtersBtn) {
              filtersBtn.addEventListener('click', toggleFiltersPanel);
              console.log('✅ Filters button event listener attached');
          } else {
              console.error('❌ Filters button not found in shadow DOM');
              throw new Error('Filters button not found');
          }
          
          if (filtersClose) filtersClose.addEventListener('click', closeFiltersPanel);
          if (filtersOverlay) filtersOverlay.addEventListener('click', closeFiltersPanel);
      
          // Filter actions
          if (clearAllFilters) clearAllFilters.addEventListener('click', clearAllFiltersAction);
      
          // Always set priceType to 'all' as default on initialization
          if (!component.filterManager.filters.priceType) {
              component.filterManager.filters.priceType = 'all';
          }
      
          // Initialize all filter controls
          component.initializeFilterControls();
      
          // Escape key handling is now done in setupInstanceEventListeners
      };
      
      this.initializeFilterControls = function() {
          // Professional dropdowns (includes all dropdown types now)
          component.setupDropdowns();
          // Rating filter
          component.initializeRatingFilter();
          // Toggle group filters
          component.initializeToggleFilters();
          // Price range filters
          component.initializePriceRangeFilter();
          // Order functionality
          component.initializeOrderDropdown();
          // Ensure price range is visible for 'Tutti' after all initializations
          const priceRangeContainer = component.shadowRoot.getElementById ('priceRangeContainer');
          if (component.filterManager.filters.priceType === 'all' && priceRangeContainer) {
              priceRangeContainer.style.display = 'block';
          }
      };
      
      this.handleFilterChangeImmediate = function(e) {
          // This function is no longer needed since we're using professional dropdowns
          // All filter changes are now handled through the dropdown system
      };
      
      
      
      
      
      this.initializeCourseFilter = function() {
          const courseInput = component.shadowRoot.getElementById ('courseFilter');
          const suggestionsContainer = component.shadowRoot.getElementById ('courseSuggestions');
          let courses = [];
          let selectedIndex = -1;
          
          if (!courseInput || !suggestionsContainer) return;
          
          // Extract courses from hierarchy data
          function updateCourses() {
              if (component.facultyCoursesData) {
                  const selectedFaculty = component.filterManager.filters.faculty;
                  if (selectedFaculty && component.facultyCoursesData[selectedFaculty]) {
                      courses = component.facultyCoursesData[selectedFaculty].map(course => course[1]).sort();
                  } else {
                      // Show all courses if no faculty selected
                      courses = [];
                      Object.values(component.facultyCoursesData).forEach(facultyCourses => {
                          facultyCourses.forEach(course => {
                              courses.push(course[1]);
                          });
                      });
                      courses = [...new Set(courses)].sort();
                  }
              }
          }
          
          courseInput.addEventListener('input', (e) => {
              const query = e.target.value.toLowerCase().trim();
              updateCourses();
              
              if (query.length === 0) {
                  hideSuggestions();
                  component.filterManager.removeFilter('course');
                  return;
              }
              
              const filteredCourses = courses.filter(course => 
                  course.toLowerCase().includes(query)
              );
              
              showSuggestions(filteredCourses);
              selectedIndex = -1;
          });
          
          courseInput.addEventListener('keydown', handleKeyNavigation());
          
          // Hide suggestions when clicking outside
          component.addGlobalEventListener(document, 'click', (e) => {
              if (!courseInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                  hideSuggestions();
              }
          });
          
          function showSuggestions(filteredCourses) {
              if (filteredCourses.length === 0) {
                  hideSuggestions();
                  return;
              }
              
              suggestionsContainer.innerHTML = filteredCourses
                  .slice(0, 10)
                  .map(course => 
                      `<div class="autocomplete-suggestion" data-value="${course}">${course}</div>`
                  ).join('');
              
              suggestionsContainer.classList.add('show');
              
              // Add click handlers
              suggestionsContainer.querySelectorAll('.autocomplete-suggestion').forEach(suggestion => {
                  suggestion.addEventListener('click', () => {
                      selectCourse(suggestion.textContent);
                  });
              });
          }
          
          function hideSuggestions() {
              suggestionsContainer.classList.remove('show');
              selectedIndex = -1;
          }
          
          function handleKeyNavigation() {
              return (e) => {
                  const suggestions = suggestionsContainer.querySelectorAll('.autocomplete-suggestion');
                  
                  if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
                      updateSelection(suggestions);
                  } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      selectedIndex = Math.max(selectedIndex - 1, -1);
                      updateSelection(suggestions);
                  } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                          selectCourse(suggestions[selectedIndex].textContent);
                      } else if (suggestions.length > 0) {
                          selectCourse(suggestions[0].textContent);
                      }
                  } else if (e.key === 'Escape') {
                      hideSuggestions();
                  }
              };
          }
          
          function updateSelection(suggestions) {
              suggestions.forEach((suggestion, index) => {
                  suggestion.classList.toggle('highlighted', index === selectedIndex);
              });
          }
          
          function selectCourse(course) {
              courseInput.value = course;
              component.filterManager.setFilter('course', course);
              hideSuggestions();
          }
          
          // Expose update function for faculty changes
          component.updateCoursesForCourse = updateCourses;
      };
      
      this.initializeCanaleFilter = function() {
          const canaleInput = component.shadowRoot.getElementById ('canaleFilter');
          const suggestionsContainer = component.shadowRoot.getElementById ('canaleSuggestions');
          let canali = ['A', 'B', 'C', 'D', 'E', 'F', 'Canale Unico'];
          let selectedIndex = -1;
          
          if (!canaleInput || !suggestionsContainer) return;
          
          canaleInput.addEventListener('input', (e) => {
              const query = e.target.value.toLowerCase().trim();
              
              if (query.length === 0) {
                  hideSuggestions();
                  component.filterManager.removeFilter('canale');
                  return;
              }
              
              const filteredCanali = canali.filter(canale => 
                  canale.toLowerCase().includes(query)
              );
              
              showSuggestions(filteredCanali);
              selectedIndex = -1;
          });
          
          canaleInput.addEventListener('keydown', handleKeyNavigation());
          
          // Hide suggestions when clicking outside
          component.addGlobalEventListener(document, 'click', (e) => {
              if (!canaleInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                  hideSuggestions();
              }
          });
          
          function showSuggestions(filteredCanali) {
              if (filteredCanali.length === 0) {
                  hideSuggestions();
                  return;
              }
              
              suggestionsContainer.innerHTML = filteredCanali
                          .map(canale =>
                  `<div class="autocomplete-suggestion" data-value="${canale}">Canale ${formatCanaleDisplay(canale)}</div>`
              ).join('');
              
              suggestionsContainer.classList.add('show');
              
              // Add click handlers
              suggestionsContainer.querySelectorAll('.autocomplete-suggestion').forEach(suggestion => {
                  suggestion.addEventListener('click', () => {
                      const canale = suggestion.getAttribute('data-value');
                      selectCanale(canale);
                  });
              });
          }
          
          function hideSuggestions() {
              suggestionsContainer.classList.remove('show');
              selectedIndex = -1;
          }
          
          function handleKeyNavigation() {
              return (e) => {
                  const suggestions = suggestionsContainer.querySelectorAll('.autocomplete-suggestion');
                  
                  if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
                      updateSelection(suggestions);
                  } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      selectedIndex = Math.max(selectedIndex - 1, -1);
                      updateSelection(suggestions);
                  } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                          const canale = suggestions[selectedIndex].getAttribute('data-value');
                          selectCanale(canale);
                      } else if (suggestions.length > 0) {
                          const canale = suggestions[0].getAttribute('data-value');
                          selectCanale(canale);
                      }
                  } else if (e.key === 'Escape') {
                      hideSuggestions();
                  }
              };
          }
          
          function updateSelection(suggestions) {
              suggestions.forEach((suggestion, index) => {
                  suggestion.classList.toggle('highlighted', index === selectedIndex);
              });
          }
          
          function selectCanale(canale) {
              canaleInput.value = canale;
              component.filterManager.setFilter('canale', canale);
              hideSuggestions();
          }
      };
      
      // Helper functions
      this.clearCourseFilter = function() {
          const courseInput = component.shadowRoot.getElementById ('courseFilter');
          if (courseInput) {
              courseInput.value = '';
              component.filterManager.removeFilter('course');
          }
      };
      
      this.updateCoursesForFaculty = function(faculty) {
          if (component.updateCoursesForCourse) {
              component.updateCoursesForCourse();
          }
      };
      
      // Professional Dropdown functionality
      this.setupDropdowns = function() {
          // Initialize hierarchy data first
          loadHierarchyData().then(() => {
              const searchableDropdowns = ['faculty', 'course', 'canale'];
              const staticDropdowns = ['documentType', 'language', 'academicYear', 'tag'];
              const allDropdowns = [...searchableDropdowns, ...staticDropdowns];
              
              // Setup searchable dropdowns (faculty, course, canale)
              searchableDropdowns.forEach(type => {
                  const container = component.shadowRoot.querySelector(`[data-dropdown="${type}"]`);
                  const input = component.shadowRoot.getElementById (`${type}Filter`);
                  const options = component.shadowRoot.getElementById (`${type}Options`);
                  
                  if (!container || !input || !options) return;
                  
                  // Handle filter label click - close dropdown if open, do nothing if closed
                  const label = component.shadowRoot.querySelector(`label[for="${type}Filter"]`);
                  if (label) {
                      label.addEventListener('click', (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const isOpen = container.classList.contains('open');
                          if (isOpen) {
                              container.classList.remove('open');
                          }
                          // Do nothing if dropdown is closed
                      });
                  }
                  
                  // Handle input events (typing to search)
                  input.addEventListener('input', (e) => {
                      const value = e.target.value.trim();
                      
                      // Clear filter if input is empty
                      if (value === '') {
                          delete component.filterManager.filters[type];
                          if (type === 'faculty') {
                              const courseInput = component.shadowRoot.getElementById ('courseFilter');
                              courseInput.value = '';
                              delete component.filterManager.filters.course;
                          }
                          container.classList.remove('open');
                          applyFiltersAndRender();
                          return;
                      }
                      
                      // Show dropdown and filter if not already open
                      if (!container.classList.contains('open')) {
                          toggleDropdown(container, type);
                      } else {
                          // Reset highlighted option to top when user types
                          resetDropdownHighlight(type);
                      }
                      filterDropdownOptions(type, value);
                  });
                  
                  // Handle focus (show dropdown)
                  input.addEventListener('focus', (e) => {
                      if (!container.classList.contains('open')) {
                          toggleDropdown(container, type);
                      }
                  });
                  
                  // Handle input click specifically (not the wrapper)
                  input.addEventListener('click', (e) => {
                      e.stopPropagation();
                      if (!container.classList.contains('open')) {
                          toggleDropdown(container, type);
                      }
                  });
                  
                  // Handle dropdown input wrapper click (for better UX)
                  const inputWrapper = container.querySelector('.dropdown-input-wrapper');
                  if (inputWrapper) {
                      inputWrapper.addEventListener('click', (e) => {
                          e.stopPropagation();
                          if (!container.classList.contains('open')) {
                              toggleDropdown(container, type);
                          }
                      });
                  }
                  
                  // Handle arrow click - close dropdown if open, open if closed
                  const arrow = container.querySelector('.dropdown-arrow');
                  if (arrow) {
                      arrow.addEventListener('click', (e) => {
                          e.stopPropagation();
                          const isOpen = container.classList.contains('open');
                          if (isOpen) {
                              // Close dropdown if already open
                              container.classList.remove('open');
                          } else {
                              // Open dropdown if closed
                              toggleDropdown(container, type);
                              input.focus();
                          }
                      });
                  }
                  
                  // Keyboard navigation
                  input.addEventListener('keydown', (e) => {
                      handleDropdownKeyboard(e, type);
                  });
              });
              
              // Setup static dropdowns (documentType, language, academicYear, tag) - same logic as searchable but no text input
              staticDropdowns.forEach(type => {
                  const container = component.shadowRoot.querySelector(`[data-dropdown="${type}"]`);
                  const input = component.shadowRoot.getElementById (`${type}Filter`);
                  const options = component.shadowRoot.getElementById (`${type}Options`);
                  
                  if (!container || !input || !options) return;
                  
                  // Handle filter label click - close dropdown if open, do nothing if closed
                  const label = component.shadowRoot.querySelector(`label[for="${type}Filter"]`);
                  if (label) {
                      label.addEventListener('click', (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const isOpen = container.classList.contains('open');
                          if (isOpen) {
                              container.classList.remove('open');
                          }
                          // Do nothing if dropdown is closed
                      });
                  }
                  
                  // Handle click to open dropdown (readonly inputs)
                  input.addEventListener('click', (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleDropdown(container, type);
                  });
                  
                  // Handle dropdown input wrapper click (for better UX)
                  const inputWrapper = container.querySelector('.dropdown-input-wrapper');
                  if (inputWrapper) {
                      inputWrapper.addEventListener('click', (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleDropdown(container, type);
                      });
                  }
                  
                  // Handle arrow click - close dropdown if open, open if closed
                  const arrow = container.querySelector('.dropdown-arrow');
                  if (arrow) {
                      arrow.addEventListener('click', (e) => {
                          e.stopPropagation();
                          const isOpen = container.classList.contains('open');
                          if (isOpen) {
                              // Close dropdown if already open
                              container.classList.remove('open');
                          } else {
                              // Open dropdown if closed
                              toggleDropdown(container, type);
                          }
                      });
                  }
                  
                  // Keyboard navigation
                  input.addEventListener('keydown', (e) => {
                      handleDropdownKeyboard(e, type);
                  });
              });
              
              // Close dropdowns when clicking outside (unified for all dropdowns)
              component.addGlobalEventListener(document, 'click', (e) => {
                  // Check if click is on dropdown input wrapper or dropdown content
                  const clickedDropdownInputWrapper = e.target.closest('.dropdown-input-wrapper');
                  const clickedDropdownContent = e.target.closest('.dropdown-content');
                          if (!clickedDropdownInputWrapper && !clickedDropdownContent) {
                      // Click is outside all dropdown areas - close all dropdowns
                      closeAllDropdowns();
                      
                      // Clear any invalid inputs consistently
                      allDropdowns.forEach(type => {
                          const input = component.shadowRoot.getElementById (`${type}Filter`);
                          if (input && !input.readOnly) {
                              const currentValue = input.value.trim();
                              
                              // For multi-select filters, don't validate against currentValue
                              const multiSelectFilters = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear', 'tag'];
                              const isMultiSelect = multiSelectFilters.includes(type);
                              
                              if (!isMultiSelect) {
                                  const isValidSelection = component.filterManager.filters[type] === currentValue;
                                  
                                  if (!isValidSelection && currentValue !== '' && !currentValue.includes(' selected')) {
                                      input.value = '';
                                      delete component.filterManager.filters[type];
                                      if (type === 'faculty') {
                                          const courseInput = component.shadowRoot.getElementById ('courseFilter');
                                          courseInput.value = '';
                                          delete component.filterManager.filters.course;
                                      }
                                      applyFiltersAndRender();
                                  }
                              }
                          }
                      });
                  }
              });
              
              // Handle window resize and scroll to reposition dropdowns
              component.addGlobalEventListener(window, 'resize', () => {
                  repositionOpenDropdowns();
              });
              
              component.addGlobalEventListener(window, 'scroll', () => {
                  repositionOpenDropdowns();
              });
              
              // Initial population
              component.populateDropdownOptions();
          });
      };
      
      this.toggleDropdown = function(container, type) {
          const isOpen = container.classList.contains('open');
          
          // Determine if this is a multi-select filter
          const multiSelectFilters = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear', 'tag'];
          const isMultiSelect = multiSelectFilters.includes(type);
          
          // Close all other dropdowns (except for multi-select if keeping open)
          if (!isMultiSelect || !isOpen) {
              closeAllDropdowns();
          }
          
          if (!isOpen) {
              container.classList.add('open');
              const input = component.shadowRoot.getElementById (`${type}Filter`);
              // Always clear input value so all options are shown
              if (input) input.value = '';
              // Update input styling for multi-select
              if (isMultiSelect && component.filterManager.filters[type] && Array.isArray(component.filterManager.filters[type]) && component.filterManager.filters[type].length > 0) {
                  input.setAttribute('data-multi-selected', 'true');
                  const academicContextFilters = ['faculty', 'course', 'canale'];
                  if (academicContextFilters.includes(type) && component.filterManager.filters[type].length > 1) {
                      input.setAttribute('placeholder', `${component.filterManager.filters[type].length} selezionati - scrivi per cercarne altri...`);
                  }
              }
              component.filterDropdownOptions(type, '');
          }
      };
      
      this.positionDropdown = function(input, dropdown) {
          if (!input || !dropdown) {
              return;
          }
          
          const rect = input.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const dropdownHeight = 250; // approximate max height
          
          // Position below input by default
          let top = rect.bottom + 2;
          
          // If dropdown would go below viewport, position above input instead
          if (top + dropdownHeight > viewportHeight && rect.top > dropdownHeight) {
              top = rect.top - dropdownHeight - 2;
          }
          
          // Ensure minimum width
          const width = Math.max(rect.width, 200);
          
          dropdown.style.top = `${top}px`;
          dropdown.style.left = `${rect.left}px`;
          dropdown.style.width = `${width}px`;
      };
      
      this.closeAllDropdowns = function() {
          component.shadowRoot.querySelectorAll('.dropdown-container').forEach(container => {
              container.classList.remove('open');
          });
      };
      
      this.repositionOpenDropdowns = function() {
          const allDropdowns = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear'];
          allDropdowns.forEach(type => {
              const container = component.shadowRoot.querySelector(`[data-dropdown="${type}"]`);
              if (container && container.classList.contains('open')) {
                  const input = component.shadowRoot.getElementById (`${type}Filter`);
                  const dropdown = component.shadowRoot.getElementById (`${type}Dropdown`);
                  if (input && dropdown) {
                      component.positionDropdown(input, dropdown);
                  }
              }
          });
      };
      
      this.resetDropdownHighlight = function(type) {
          const options = component.shadowRoot.getElementById (`${type}Options`);
          if (options) {
              // Remove all highlights
              options.querySelectorAll('.dropdown-option.highlighted').forEach(option => {
                  option.classList.remove('highlighted');
              });
              // Scroll to top of options
              options.scrollTop = 0;
          }
      };
      
      // Hierarchy Cache Management
      const HIERARCHY_CACHE_KEY = component.HIERARCHY_CACHE_KEY;
      const HIERARCHY_CACHE_VERSION = '1.0';
      const HIERARCHY_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      // Cache management functions
      this.getHierarchyCache = function() {
          try {
              const cached = localStorage.getItem(HIERARCHY_CACHE_KEY);
              if (!cached) return null;
              
              const cacheData = JSON.parse(cached);
              
              // Check cache version
              if (cacheData.version !== HIERARCHY_CACHE_VERSION) {
                  clearHierarchyCache();
                  return null;
              }
              
              // Check cache expiration
              const now = Date.now();
              if (now - cacheData.timestamp > HIERARCHY_CACHE_DURATION) {
                  clearHierarchyCache();
                  return null;
              }
              
              return cacheData.data;
          } catch (error) {
              console.warn('⚠️ Error reading hierarchy cache:', error);
              component.clearHierarchyCache();
              return null;
          }
      };
      
      this.setHierarchyCache = function(data) {
          try {
              const cacheData = {
                  version: HIERARCHY_CACHE_VERSION,
                  timestamp: Date.now(),
                  data: data
              };
              localStorage.setItem(HIERARCHY_CACHE_KEY, JSON.stringify(cacheData));
          } catch (error) {
              console.warn('⚠️ Error caching hierarchy data:', error);
              // Don't throw error - caching failure shouldn't break the app
          }
      };
      
      this.clearHierarchyCache = function() {
          try {
              localStorage.removeItem(HIERARCHY_CACHE_KEY);
          } catch (error) {
              console.warn('⚠️ Error clearing hierarchy cache:', error);
          }
      };
      
      // Enhanced hierarchy loading with caching
      this.loadHierarchyData = async function() {
          // First check if we already have data in memory
          if (component.facultyCoursesData) {
              return;
          }
          
          // Check cache first
          const cachedData = getHierarchyCache();
          if (cachedData) {
              component.facultyCoursesData = cachedData;
              return;
          }
          
          // If no cache, fetch from API
          try {
              const data = await makeSimpleRequest('/hierarchy');
              
              // Validate the data structure
              if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                  component.facultyCoursesData = data;
                  
                  // Cache the data for future use
                  setHierarchyCache(data);
              } else {
                  console.warn('⚠️ Unexpected hierarchy data format:', data);
                  component.facultyCoursesData = {};
              }
          } catch (error) {
              console.error('❌ Error loading hierarchy data:', error);
              component.facultyCoursesData = {};
              
              // If API fails, try to use any available cached data (even if expired)
              const expiredCache = component.getExpiredHierarchyCache();
              if (expiredCache) {
                  component.facultyCoursesData = expiredCache;
              }
          }
      };
      
      // Fallback function to get expired cache data
      this.getExpiredHierarchyCache = function() {
          try {
              const cached = localStorage.getItem(HIERARCHY_CACHE_KEY);
              if (!cached) return null;
              
              const cacheData = JSON.parse(cached);
              
              // Check cache version
              if (cacheData.version !== HIERARCHY_CACHE_VERSION) {
                  return null;
              }
              
              // Return data even if expired
              return cacheData.data;
          } catch (error) {
              console.warn('⚠️ Error reading expired hierarchy cache:', error);
              return null;
          }
      };
      
      // Force refresh hierarchy data (for manual cache invalidation)
      this.refreshHierarchyData = async function() {
          component.clearHierarchyCache();
          component.facultyCoursesData = null;
          await component.loadHierarchyData();
      };
      
      
      
      this.populateDropdownOptions = function() {
          if (!component.facultyCoursesData) return;
          
          // Faculty options
          const faculties = Object.keys(component.facultyCoursesData).sort();
          populateOptions('faculty', faculties);
          
          // Course options (initially all courses)
          const courses = [];
          Object.values(component.facultyCoursesData).forEach(facultyCourses => {
              facultyCourses.forEach(course => courses.push(course[1]));
          });
          const uniqueCourses = [...new Set(courses)].sort();
          populateOptions('course', uniqueCourses);
          
          // Canale options
          component.populateOptions('canale', ['A', 'B', 'C', 'D', 'E', 'F', 'Canale Unico']);
      };
      
      this.populateOptions = function(type, items) {
          const options = component.shadowRoot.getElementById (`${type}Options`);
          const currentValue = component.shadowRoot.getElementById (`${type}Filter`).value;
          
          if (!options) {
              return;
          }
          
          // Language display text mapping
          const languageDisplayMap = {
              'Italian': 'Italiano',
              'English': 'Inglese'
          };
          
          // Tag display text mapping
          const tagDisplayMap = {
              'appunti': 'Appunti',
              'dispense': 'Dispense',
              'esercizi': 'Esercizi'
          };
          
          // Map dropdown types to filter keys
          const filterKeyMap = {
              'faculty': 'faculty',
              'course': 'course',
              'canale': 'canale',
              'documentType': 'documentType',
              'language': 'language',
              'academicYear': 'academicYear',
              'tag': 'tag'
          };
          
          const filterKey = filterKeyMap[type] || type;
          const activeFilterValues = component.filterManager.filters[filterKey];
          
          // Determine which filters support multi-selection
          const multiSelectFilters = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear', 'tag'];
          const isMultiSelect = multiSelectFilters.includes(type);
          
          let optionsHTML = '';
          
          // Show selected options at the top for both multi-select and single-select filters
          if ((isMultiSelect || (!isMultiSelect && activeFilterValues && activeFilterValues !== '')) && activeFilterValues && ((Array.isArray(activeFilterValues) && activeFilterValues.length > 0) || (!Array.isArray(activeFilterValues) && activeFilterValues !== ''))) {
              const selectedValues = Array.isArray(activeFilterValues) ? activeFilterValues : [activeFilterValues];
              const selectedOptionsHTML = selectedValues.map(value => {
                  let displayText = value;
                  if (type === 'language' && languageDisplayMap[value]) {
                      displayText = languageDisplayMap[value];
                  } else if (type === 'tag' && tagDisplayMap[value]) {
                      displayText = tagDisplayMap[value];
                  }
                  return `
                  <div class="dropdown-option selected has-active-filter" data-value="${value}">
                      <span>${displayText}</span>
                      <i class="material-symbols-outlined dropdown-option-remove">close</i>
                  </div>
                  `;
              }).join('');
              optionsHTML += selectedOptionsHTML;
              // Add separator if there are other options
              if (items.length > selectedValues.length) {
                  optionsHTML += '<div class="dropdown-separator"></div>';
              }
              // Show ALL other options (not just unselected ones)
              const otherOptionsHTML = items.filter(item => !selectedValues.includes(item)).map(item => {
                  let displayText = item;
                  if (type === 'language' && languageDisplayMap[item]) {
                      displayText = languageDisplayMap[item];
                  } else if (type === 'tag' && tagDisplayMap[item]) {
                      displayText = tagDisplayMap[item];
                  }
                  return `
                  <div class="dropdown-option" data-value="${item}">
                      <span>${displayText}</span>
                      <i class="material-symbols-outlined dropdown-option-check">check</i>
                  </div>
                  `;
              }).join('');
              optionsHTML += otherOptionsHTML;
          } else {
              // Show all options when no selection or for single-select without selection
              optionsHTML = items.map(item => {
                  let displayText = item;
                  if (type === 'language' && languageDisplayMap[item]) {
                      displayText = languageDisplayMap[item];
                  } else if (type === 'tag' && tagDisplayMap[item]) {
                      displayText = tagDisplayMap[item];
                  }
                  
                  const isSelected = item === currentValue;
                  
                  let classes = 'dropdown-option';
                  if (isSelected) classes += ' selected';
                  
                  return `
                  <div class="${classes}" data-value="${item}">
                      <span>${displayText}</span>
                      <i class="material-symbols-outlined dropdown-option-check">check</i>
                  </div>
                  `;
              }).join('');
          }
          
          options.innerHTML = optionsHTML;
          
          // Add click handlers
          options.querySelectorAll('.dropdown-option').forEach(option => {
              option.addEventListener('click', (e) => {
                  e.stopPropagation();
                  const value = option.dataset.value;
                  const displayText = option.querySelector('span').textContent;
                  
                  if (option.classList.contains('has-active-filter')) {
                      // Remove this filter value
                      component.removeSpecificFilterValue(type, value);
                  } else {
                      // Add this filter value
                      component.selectDropdownOption(type, value, displayText);
                  }
              });
          });
      };
      
      this.filterDropdownOptions = function(type, searchTerm) {
          let items = [];
          
          if (type === 'faculty') {
              items = Object.keys(component.facultyCoursesData || {}).sort();
          } else if (type === 'course') {
              const selectedFaculties = component.filterManager.filters.faculty;
              if (selectedFaculties && component.facultyCoursesData) {
                  const courses = [];
                  if (Array.isArray(selectedFaculties)) {
                      // Multiple faculties selected - show courses from all selected faculties
                      selectedFaculties.forEach(faculty => {
                          if (component.facultyCoursesData[faculty]) {
                              component.facultyCoursesData[faculty].forEach(course => courses.push(course[1]));
                          }
                      });
                  } else if (component.facultyCoursesData[selectedFaculties]) {
                      // Single faculty selected
                      component.facultyCoursesData[selectedFaculties].forEach(course => courses.push(course[1]));
                  }
                  items = [...new Set(courses)].sort();
              } else if (component.facultyCoursesData) {
                  // No faculties selected - show all courses
                  const courses = [];
                  Object.values(component.facultyCoursesData).forEach(facultyCourses => {
                      facultyCourses.forEach(course => courses.push(course[1]));
                  });
                  items = [...new Set(courses)].sort();
              }
          } else if (type === 'canale') {
              items = ['A', 'B', 'C', 'D', 'E', 'F', 'Canale Unico'];
          } else if (type === 'documentType') {
              // Static document types (popular ones first) plus dynamic ones from files
              const staticTypes = ['PDF', 'DOCX', 'PPTX', 'XLSX'];
              const dynamicTypes = component.allFileTypes || [];
              const allTypes = [...staticTypes];
              dynamicTypes.forEach(type => {
                  if (!allTypes.includes(type)) {
                      allTypes.push(type);
                  }
              });
              items = allTypes;
          } else if (type === 'tag') {
              // Use backend tags
              items = component.allTags || ['appunti', 'dispense', 'esercizi'];
          } else if (type === 'language') {
              items = ['Italian', 'English'];
          } else if (type === 'academicYear') {
              items = ['2024/2025', '2023/2024', '2022/2023', '2021/2022'];
          }
          
          // For static dropdowns, show all items (same as searchable but no filtering)
          if (['documentType', 'language', 'academicYear', 'tag'].includes(type)) {
              populateOptions(type, items);
              return;
          }
          
          const filteredItems = items.filter(item => 
              item.toLowerCase().includes(searchTerm.toLowerCase())
          );
          
          // Sort by similarity: items starting with search term first, then by alphabetical order
          const sortedItems = filteredItems.sort((a, b) => {
              const aLower = a.toLowerCase();
              const bLower = b.toLowerCase();
              const searchLower = searchTerm.toLowerCase();
              
              const aStartsWith = aLower.startsWith(searchLower);
              const bStartsWith = bLower.startsWith(searchLower);
              
              // If one starts with search term and other doesn't, prioritize the one that starts with it
              if (aStartsWith && !bStartsWith) return -1;
              if (!aStartsWith && bStartsWith) return 1;
              
              // Special sorting for canale: "Canale Unico" should always be last
              if (type === 'canale') {
                  if (a === 'Canale Unico') return 1;
                  if (b === 'Canale Unico') return -1;
              }
              
              // If both start with search term or both don't, sort alphabetically
              return a.localeCompare(b);
          });
          
          component.populateOptions(type, sortedItems);
      };
      
      this.selectDropdownOption = function(type, value, displayText = null) {
          const input = component.shadowRoot.getElementById (`${type}Filter`);
          const container = component.shadowRoot.querySelector(`[data-dropdown="${type}"]`);
          
          // Map dropdown types to filter keys
          const filterKeyMap = {
              'faculty': 'faculty',
              'course': 'course',
              'canale': 'canale',
              'documentType': 'documentType',
              'language': 'language',
              'academicYear': 'academicYear',
              'tag': 'tag'
          };
          
          const filterKey = filterKeyMap[type] || type;
          
          // Determine which filters support multi-selection
          const multiSelectFilters = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear', 'tag'];
          const isMultiSelect = multiSelectFilters.includes(type);
          
          if (isMultiSelect) {
              // Multi-select behavior
              if (!component.filterManager.filters[filterKey]) {
                  component.filterManager.filters[filterKey] = [];
              }
              if (!component.filterManager.filters[filterKey].includes(value)) {
                  component.filterManager.filters[filterKey].push(value);
              }
              const selectedCount = component.filterManager.filters[filterKey].length;
              const academicContextFilters = ['faculty', 'course', 'canale'];
              if (academicContextFilters.includes(type)) {
                  if (selectedCount === 1) {
                      input.value = displayText || value;
                  } else {
                      input.value = '';
                      input.setAttribute('placeholder', `${selectedCount} selezionati - scrivi per cercarne altri...`);
                  }
              } else {
                  if (selectedCount === 1) {
                      input.value = displayText || value;
                  } else {
                      input.value = `${selectedCount} selected`;
                  }
              }
              setTimeout(() => {
                  filterDropdownOptions(type, '');
              }, 10);
          } else {
              // Single-select: update value, keep dropdown open, and repopulate options
              input.value = displayText || value;
              // Do NOT close dropdown
              if (value && value.trim()) {
                  component.filterManager.filters[filterKey] = value.trim();
              } else {
                  delete component.filterManager.filters[filterKey];
              }
              if (type === 'faculty') {
                  const courseInput = component.shadowRoot.getElementById ('courseFilter');
                  courseInput.value = '';
                  delete component.filterManager.filters.course;
                  filterDropdownOptions('course', '');
              }
              setTimeout(() => {
                  filterDropdownOptions(type, '');
              }, 10);
          }
          
          // Refresh active filter indicators in all dropdowns
          component.updateActiveFilterIndicators();
          
          component.applyFiltersAndRender();
          component.saveFiltersToStorage();
      };
      
      this.removeSpecificFilterValue = function(type, value) {
          // Map dropdown types to filter keys
          const filterKeyMap = {
              'faculty': 'faculty',
              'course': 'course',
              'canale': 'canale',
              'documentType': 'documentType',
              'language': 'language',
              'academicYear': 'academicYear',
              'tag': 'tag'
          };
          
          const filterKey = filterKeyMap[type] || type;
          const input = component.shadowRoot.getElementById (`${type}Filter`);
          
          // Determine which filters support multi-selection
          const multiSelectFilters = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear', 'tag'];
          const isMultiSelect = multiSelectFilters.includes(type);
          
          if (isMultiSelect && component.filterManager.filters[filterKey] && Array.isArray(component.filterManager.filters[filterKey])) {
              // Remove specific value from array
              component.filterManager.filters[filterKey] = component.filterManager.filters[filterKey].filter(v => v !== value);
              
              // Update input display
              const academicContextFilters = ['faculty', 'course', 'canale'];
              
              if (component.filterManager.filters[filterKey].length === 0) {
                  delete component.filterManager.filters[filterKey];
                  input.value = '';
                  // Reset placeholder to default
                  if (academicContextFilters.includes(type)) {
                      const defaultPlaceholders = {
                          'faculty': 'Scrivi o scegli una facoltà...',
                          'course': 'Scrivi o scegli un corso...',
                          'canale': 'Scrivi o scegli un canale...'
                      };
                      input.setAttribute('placeholder', defaultPlaceholders[type] || '');
                  }
              } else if (component.filterManager.filters[filterKey].length === 1) {
                  // Show the single remaining item
                  const remainingValue = component.filterManager.filters[filterKey][0];
                  let displayText = remainingValue;
                  
                  // Apply display mappings
                  const languageDisplayMap = {
                      'Italian': 'Italiano',
                      'English': 'Inglese'
                  };
                  const tagDisplayMap = {
                      'appunti': 'Appunti',
                      'dispense': 'Dispense',
                      'esercizi': 'Esercizi'
                  };
                  
                  if (type === 'language' && languageDisplayMap[remainingValue]) {
                      displayText = languageDisplayMap[remainingValue];
                  } else if (type === 'tag' && tagDisplayMap[remainingValue]) {
                      displayText = tagDisplayMap[remainingValue];
                  }
                  
                  input.value = displayText;
                  // Reset placeholder to default
                  if (academicContextFilters.includes(type)) {
                      const defaultPlaceholders = {
                          'faculty': 'Scrivi o scegli una facoltà...',
                          'course': 'Scrivi o scegli un corso...',
                          'canale': 'Scrivi o scegli un canale...'
                      };
                      input.setAttribute('placeholder', defaultPlaceholders[type] || '');
                  }
              } else {
                  // Multiple items remaining
                  if (academicContextFilters.includes(type)) {
                      // Keep academic context filters searchable
                      input.value = '';
                      input.setAttribute('placeholder', `${component.filterManager.filters[filterKey].length} selezionati - scrivi per cercarne altri...`);
                  } else {
                      // For other filters, show count
                      input.value = `${component.filterManager.filters[filterKey].length} selected`;
                  }
              }
              
              // Re-populate options to update the display
              setTimeout(() => {
                  filterDropdownOptions(type, '');
              }, 10);
              
              // Handle dependent dropdowns for multi-select faculty changes
              if (type === 'faculty') {
                  // Clear course filter since faculty selection changed
                  const courseInput = component.shadowRoot.getElementById ('courseFilter');
                  courseInput.value = '';
                  delete component.filterManager.filters.course;
                  // Update course dropdown options based on remaining faculty selection(s)
                  setTimeout(() => {
                      filterDropdownOptions('course', '');
                  }, 15);
              }
              
          } else {
              // Single-select removal (existing logic)
              delete component.filterManager.filters[filterKey];
              input.value = '';
              
              // Handle dependent dropdowns
              if (type === 'faculty') {
                  // Clear course filter since faculty selection changed
                  const courseInput = component.shadowRoot.getElementById ('courseFilter');
                  courseInput.value = '';
                  delete component.filterManager.filters.course;
                  // Update course dropdown options based on remaining faculty selection(s)
                  filterDropdownOptions('course', '');
              }
          }
          
          // Refresh active filter indicators
          component.updateActiveFilterIndicators();
          
          component.applyFiltersAndRender();
          component.saveFiltersToStorage();
      };
      
      this.updateActiveFilterIndicators = function() {
          // Update indicators for all dropdown types
          const dropdownTypes = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear', 'tag'];
          
          dropdownTypes.forEach(type => {
              const options = component.shadowRoot.getElementById (`${type}Options`);
              if (!options) return;
              
              const filterKeyMap = {
                  'faculty': 'faculty',
                  'course': 'course',
                  'canale': 'canale',
                  'documentType': 'documentType',
                  'language': 'language',
                  'academicYear': 'academicYear',
                  'tag': 'tag'
              };
              
              const filterKey = filterKeyMap[type] || type;
              const activeFilterValue = component.filterManager.filters[filterKey];
              
              options.querySelectorAll('.dropdown-option').forEach(option => {
                  const hasActiveFilter = activeFilterValue === option.dataset.value;
                  option.classList.toggle('has-active-filter', hasActiveFilter);
              });
          });
      };
      
      this.removeFilterFromDropdown = function(type, filterKey) {
          const input = component.shadowRoot.getElementById (`${type}Filter`);
          const container = component.shadowRoot.querySelector(`[data-dropdown="${type}"]`);
          
          // Clear the input
          input.value = '';
          container.classList.remove('open');
          
          // Remove from active filters
          delete component.filterManager.filters[filterKey];
          
          // Update visual selection in dropdown
          const options = component.shadowRoot.getElementById (`${type}Options`);
          if (options) {
              options.querySelectorAll('.dropdown-option').forEach(option => {
                  option.classList.remove('selected');
              });
          }
          
          // Handle dependent dropdowns
          if (type === 'faculty') {
              const courseInput = component.shadowRoot.getElementById ('courseFilter');
              courseInput.value = '';
              delete component.filterManager.filters.course;
              filterDropdownOptions('course', '');
          }
          
          // Add a small delay to ensure activeFilters is properly updated
          setTimeout(() => {
              // Force a complete refresh of the dropdown by calling populateOptions directly
              // instead of going through filterDropdownOptions which might have timing issues
              if (['documentType', 'language', 'academicYear', 'tag'].includes(type)) {
                  let items = [];
                  if (type === 'tag') {
                      items = ['appunti', 'dispense', 'esercizi'];
                  } else if (type === 'language') {
                      items = ['Italian', 'English'];
                  } else if (type === 'academicYear') {
                      items = ['2024/2025', '2023/2024', '2022/2023', '2021/2022'];
                  } else if (type === 'documentType') {
                      const staticTypes = ['PDF', 'DOCX', 'PPTX', 'XLSX'];
                      const dynamicTypes = component.allFileTypes || [];
                      const allTypes = [...staticTypes];
                      dynamicTypes.forEach(type => {
                          if (!allTypes.includes(type)) {
                              allTypes.push(type);
                          }
                      });
                      items = allTypes;
                  }
                  
                  // Call populateOptions directly with the items
                  populateOptions(type, items);
              } else {
                  // For dynamic dropdowns, refresh with current search term
                  const searchTerm = input.value;
                  filterDropdownOptions(type, searchTerm);
              }
              
              // Update active filter indicators in all dropdowns
              component.updateActiveFilterIndicators();
              
              component.applyFiltersAndRender();
              component.saveFiltersToStorage();
          }, 10);
      };
      
      this.handleDropdownKeyboard = function(e, type) {
          const options = component.shadowRoot.getElementById (`${type}Options`);
          const highlighted = options.querySelector('.dropdown-option.highlighted');
          const allOptions = options.querySelectorAll('.dropdown-option');
          
          switch (e.key) {
              case 'ArrowDown':
                  e.preventDefault();
                  const nextOption = highlighted ? highlighted.nextElementSibling : allOptions[0];
                  if (nextOption) {
                      if (highlighted) highlighted.classList.remove('highlighted');
                      nextOption.classList.add('highlighted');
                      nextOption.scrollIntoView({ block: 'nearest' });
                  }
                  break;
                  
              case 'ArrowUp':
                  e.preventDefault();
                  const prevOption = highlighted ? highlighted.previousElementSibling : allOptions[allOptions.length - 1];
                  if (prevOption) {
                      if (highlighted) highlighted.classList.remove('highlighted');
                      prevOption.classList.add('highlighted');
                      prevOption.scrollIntoView({ block: 'nearest' });
                  }
                  break;
                  
              case 'Enter':
                  e.preventDefault();
                  if (highlighted) {
                      selectDropdownOption(type, highlighted.dataset.value);
                  } else if (allOptions.length > 0) {
                      selectDropdownOption(type, allOptions[0].dataset.value);
                  }
                  break;
                  
              case 'Escape':
                  e.preventDefault();
                  component.closeAllDropdowns();
                  break;
          }
      };
      
      this.initializeRatingFilter = function() {
          const ratingStars = component.shadowRoot.querySelectorAll('.rating-star-filter');
          const ratingText = component.shadowRoot.getElementById ('ratingText');
          
          if (!ratingStars.length || !ratingText) return;
          
          ratingStars.forEach((star, index) => {
              star.addEventListener('click', () => {
                  const rating = index + 1;
                  
                  // Check if clicking the same rating to deactivate
                  if (component.filterManager.filters.minRating === rating) {
                      // Deactivate
                      delete component.filterManager.filters.minRating;
                      ratingStars.forEach(s => s.classList.remove('active'));
                      ratingText.textContent = 'Qualsiasi rating';
                  } else {
                      // Activate up to clicked rating
                      component.filterManager.filters.minRating = rating;
                      ratingStars.forEach((s, i) => {
                          s.classList.toggle('active', i < rating);
                      });
                      ratingText.textContent = `${rating}+ stelle`;
                  }
                  
                  // Apply filters immediately
                  applyFiltersAndRender();
                  saveFiltersToStorage();
              });
              
              star.addEventListener('mouseenter', () => {
                  const rating = index + 1;
                  ratingStars.forEach((s, i) => {
                      s.style.color = i < rating ? '#fbbf24' : '#d1d5db';
                  });
              });
              
              star.addEventListener('mouseleave', () => {
                  ratingStars.forEach((s, i) => {
                      const isActive = s.classList.contains('active');
                      s.style.color = isActive ? '#fbbf24' : '#d1d5db';
                  });
              });
          });
      };
      
      this.initializeToggleFilters = function() {
          // Ensure priceType is always set to 'all' by default
          if (!component.filterManager.filters.priceType) {
              component.filterManager.filters.priceType = 'all';
          }
          // Price toggles
          const priceToggles = component.shadowRoot.querySelectorAll('.price-toggle');
          const priceRangeContainer = component.shadowRoot.getElementById ('priceRangeContainer');
      
          // Ensure 'Tutti' is active and price slider is visible on initial load
          let initialSet = false;
          priceToggles.forEach(toggle => {
              if (toggle.dataset.price === 'all' && !initialSet) {
                  toggle.classList.add('active');
                  component.filterManager.filters.priceType = 'all';
                  if (priceRangeContainer) priceRangeContainer.style.display = 'block';
                  initialSet = true;
              } else {
                  toggle.classList.remove('active');
              }
          });
          // Always show price range for 'Tutti' (all) on initialization
          if (priceRangeContainer && component.filterManager.filters.priceType === 'all') {
              priceRangeContainer.style.display = 'block';
          }
      
          priceToggles.forEach(toggle => {
              toggle.addEventListener('click', () => {
                  priceToggles.forEach(t => t.classList.remove('active'));
                  toggle.classList.add('active');
                  const priceType = toggle.dataset.price;
                  if (priceType === 'all') {
                      component.filterManager.filters.priceType = 'all';
                      delete component.filterManager.filters.minPrice;
                      delete component.filterManager.filters.maxPrice;
                      if (priceRangeContainer) priceRangeContainer.style.display = 'block';
                      const minPriceRange = component.shadowRoot.getElementById ('minPriceRange');
                      const maxPriceRange = component.shadowRoot.getElementById ('maxPriceRange');
                      const minPriceValue = component.shadowRoot.getElementById ('minPriceValue');
                      const maxPriceValue = component.shadowRoot.getElementById ('maxPriceValue');
                      if (minPriceRange) minPriceRange.value = 0;
                      if (maxPriceRange) maxPriceRange.value = 100;
                      if (minPriceValue) minPriceValue.textContent = '€0';
                      if (maxPriceValue) maxPriceValue.textContent = '€100';
                      updatePriceSliderFill();
                  } else if (priceType === 'free') {
                      component.filterManager.filters.priceType = 'free';
                      delete component.filterManager.filters.minPrice;
                      delete component.filterManager.filters.maxPrice;
                      if (priceRangeContainer) priceRangeContainer.style.display = 'none';
                  } else if (priceType === 'paid') {
                      component.filterManager.filters.priceType = 'paid';
                      if (priceRangeContainer) priceRangeContainer.style.display = 'block';
                      const minPriceRange = component.shadowRoot.getElementById ('minPriceRange');
                      const maxPriceRange = component.shadowRoot.getElementById ('maxPriceRange');
                      if (minPriceRange && maxPriceRange) {
                          const minVal = parseFloat(minPriceRange.value);
                          const maxVal = parseFloat(maxPriceRange.value);
                          if (minVal !== 0 || maxVal !== 100) {
                              component.filterManager.filters.minPrice = minVal;
                              component.filterManager.filters.maxPrice = maxVal;
                          }
                      }
                  }
                  applyFiltersAndRender();
                  saveFiltersToStorage();
              });
          });
      
          // Vetrina toggles
          const vetrinaToggles = component.shadowRoot.querySelectorAll('.vetrina-toggle');
          vetrinaToggles.forEach(toggle => {
              toggle.addEventListener('click', () => {
                  vetrinaToggles.forEach(t => t.classList.remove('active'));
                  toggle.classList.add('active');
                  const vetrinaType = toggle.dataset.vetrina;
                  if (vetrinaType === 'all') {
                      delete component.filterManager.filters.vetrinaType;
                  } else {
                      component.filterManager.filters.vetrinaType = vetrinaType;
                  }
                  component.applyFiltersAndRender();
                  component.saveFiltersToStorage();
              });
          });
      };
      
      this.initializePriceRangeFilter = function() {
          const minPriceRange = component.shadowRoot.getElementById ('minPriceRange');
          const maxPriceRange = component.shadowRoot.getElementById ('maxPriceRange');
          const minPriceValue = component.shadowRoot.getElementById ('minPriceValue');
          const maxPriceValue = component.shadowRoot.getElementById ('maxPriceValue');
          const rangeFill = component.shadowRoot.getElementById ('rangeFill');
          
          if (minPriceRange && maxPriceRange) {
              // Initialize values but don't add to activeFilters yet
              if (minPriceValue) minPriceValue.textContent = '€0';
              if (maxPriceValue) maxPriceValue.textContent = '€100';
              updatePriceSliderFill();
              
              // Range slider events
              minPriceRange.addEventListener('input', handlePriceRangeChange);
              maxPriceRange.addEventListener('input', handlePriceRangeChange);
              minPriceRange.addEventListener('change', handlePriceRangeChange);
              maxPriceRange.addEventListener('change', handlePriceRangeChange);
              
              // Initialize editable values
              component.initializeEditableValues();
          }
      };
      
      // Debounce function to delay filter application for smooth UX
      this.debounce = function(func, wait) {
          let timeout;
          return function executedFunction(...args) {
              const later = () => {
                  clearTimeout(timeout);
                  func(...args);
              };
              clearTimeout(timeout);
              timeout = setTimeout(later, wait);
          };
      };
      
      // Create debounced version of applyFiltersAndRender
      const debouncedApplyFilters = component.debounce(component.applyFiltersAndRender, 200);
      
      this.handlePriceRangeChange = function() {
          const minPriceRange = component.shadowRoot.getElementById ('minPriceRange');
          const maxPriceRange = component.shadowRoot.getElementById ('maxPriceRange');
          const minPriceValue = component.shadowRoot.getElementById ('minPriceValue');
          const maxPriceValue = component.shadowRoot.getElementById ('maxPriceValue');
          
          let minVal = parseFloat(minPriceRange.value);
          let maxVal = parseFloat(maxPriceRange.value);
          
          if (minVal > maxVal) {
              minVal = maxVal;
              minPriceRange.value = minVal;
          }
          if (maxVal < minVal) {
              maxVal = minVal;
              maxPriceRange.value = maxVal;
          }
          
          // Update display values
          if (minPriceValue) minPriceValue.textContent = `€${minVal}`;
          if (maxPriceValue) maxPriceValue.textContent = `€${maxVal}`;
          
          component.updatePriceSliderFill();
          
          // Apply filters
          component.applyPriceFilters(minVal, maxVal);
      };
      
      this.updatePriceSliderFill = function() {
          const minPriceRange = component.shadowRoot.getElementById ('minPriceRange');
          const maxPriceRange = component.shadowRoot.getElementById ('maxPriceRange');
          const rangeFill = component.shadowRoot.getElementById ('rangeFill');
          
          if (minPriceRange && maxPriceRange && rangeFill) {
              const min = parseFloat(minPriceRange.min);
              const max = parseFloat(minPriceRange.max);
              const minVal = parseFloat(minPriceRange.value);
              const maxVal = parseFloat(maxPriceRange.value);
              
              const minPercent = ((minVal - min) / (max - min)) * 100;
              const maxPercent = ((maxVal - min) / (max - min)) * 100;
              
              rangeFill.style.left = `${minPercent}%`;
              rangeFill.style.width = `${maxPercent - minPercent}%`;
          }
      };
      
      this.initializeEditableValues = function() {
          const editableValues = component.shadowRoot.querySelectorAll('.editable-value');
          
          editableValues.forEach(element => {
              element.addEventListener('click', component.handleEditableValueClick);
              element.addEventListener('keydown', component.handleEditableValueKeydown);
          });
      };
      
      this.handleEditableValueClick = function(event) {
          const element = event.target;
          if (element.classList.contains('editing')) return;
          
          const type = element.getAttribute('data-type');
          const position = element.getAttribute('data-position');
          
          // Create input element
          const input = document.createElement('input');
          input.type = 'number';
          input.className = 'editable-input';
          
          // Set input properties based on type
          if (type === 'price') {
              input.min = '0';
              input.max = '100';
              input.step = '0.5';
              const currentValue = parseFloat(element.textContent.replace('€', '')) || 0;
              input.value = currentValue;
          } else if (type === 'pages') {
              input.min = '1';
              input.max = '1000';
              input.step = '1';
              const currentValue = parseInt(element.textContent) || 1;
              input.value = currentValue;
          }
          
          // Store original content
          element.setAttribute('data-original-content', element.textContent);
          
          // Replace content with input
          element.textContent = '';
          element.appendChild(input);
          element.classList.add('editing');
          
          // Focus and select input
          input.focus();
          input.select();
          
          // Add event listeners
          input.addEventListener('blur', () => component.handleEditableValueBlur(element, type, position));
          input.addEventListener('keydown', (e) => component.handleEditableValueInputKeydown(e, element, type, position));
      };
      
      this.handleEditableValueKeydown = function(event) {
          if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              component.handleEditableValueClick(event);
          }
      };
      
      this.handleEditableValueInputKeydown = function(event, element, type, position) {
          if (event.key === 'Enter') {
              event.preventDefault();
              handleEditableValueBlur(element, type, position);
          } else if (event.key === 'Escape') {
              event.preventDefault();
              // Restore original content
              const originalContent = element.getAttribute('data-original-content');
              element.textContent = originalContent;
              element.classList.remove('editing');
          }
      };
      
      this.handleEditableValueBlur = function(element, type, position) {
          const input = element.querySelector('input');
          if (!input) return;
          
          let newValue = parseFloat(input.value);
          
          // Validate and constrain value
          if (type === 'price') {
              newValue = Math.max(0, Math.min(100, newValue));
              element.textContent = `€${newValue}`;
          } else if (type === 'pages') {
              newValue = Math.max(1, Math.min(1000, newValue));
              element.textContent = newValue;
          }
          
          element.classList.remove('editing');
          
          // Update corresponding range slider
          component.updateRangeSliderFromEditableValue(type, position, newValue);
      };
      
      this.updateRangeSliderFromEditableValue = function(type, position, value) {
          if (type === 'price') {
              const minPriceRange = component.shadowRoot.getElementById ('minPriceRange');
              const maxPriceRange = component.shadowRoot.getElementById ('maxPriceRange');
              
              if (position === 'min') {
                  minPriceRange.value = value;
                  // Ensure min doesn't exceed max
                  if (value > parseFloat(maxPriceRange.value)) {
                      maxPriceRange.value = value;
                      const maxPriceValue = component.shadowRoot.getElementById ('maxPriceValue');
                      if (maxPriceValue) maxPriceValue.textContent = `€${value}`;
                  }
              } else if (position === 'max') {
                  maxPriceRange.value = value;
                  // Ensure max doesn't go below min
                  if (value < parseFloat(minPriceRange.value)) {
                      minPriceRange.value = value;
                      const minPriceValue = component.shadowRoot.getElementById ('minPriceValue');
                      if (minPriceValue) minPriceValue.textContent = `€${value}`;
                  }
              }
              
              updatePriceSliderFill();
              applyPriceFilters(parseFloat(minPriceRange.value), parseFloat(maxPriceRange.value));
              
          } else if (type === 'pages') {
              const minPagesRange = component.shadowRoot.getElementById ('minPagesRange');
              const maxPagesRange = component.shadowRoot.getElementById ('maxPagesRange');
              
              if (position === 'min') {
                  minPagesRange.value = value;
                  // Ensure min doesn't exceed max
                  if (value > parseInt(maxPagesRange.value)) {
                      maxPagesRange.value = value;
                      const maxPagesValue = component.shadowRoot.getElementById ('maxPagesValue');
                      if (maxPagesValue) maxPagesValue.textContent = value;
                  }
              } else if (position === 'max') {
                  maxPagesRange.value = value;
                  // Ensure max doesn't go below min
                  if (value < parseInt(minPagesRange.value)) {
                      minPagesRange.value = value;
                      const minPagesValue = component.shadowRoot.getElementById ('minPagesValue');
                      if (minPagesValue) minPagesValue.textContent = value;
                  }
              }
              
              component.updatePagesSliderFill();
              component.applyPagesFilters(parseInt(minPagesRange.value), parseInt(maxPagesRange.value));
          }
      };
      
      this.applyPriceFilters = function(minVal, maxVal) {
          // Defensive: always delete priceRange array if present
          if (component.filterManager.filters.priceRange) {
              delete component.filterManager.filters.priceRange;
          }
          // If priceType is not set, set it to 'all'
          if (!component.filterManager.filters.priceType) {
              component.filterManager.filters.priceType = 'all';
          }
          // Apply price range filter for both 'paid' and 'all' price types
          if (component.filterManager.filters.priceType === 'paid' || component.filterManager.filters.priceType === 'all') {
              component.filterManager.filters.minPrice = minVal;
              component.filterManager.filters.maxPrice = maxVal;
          }
          
          updateBottomFilterCount();
          updateActiveFiltersDisplay();
          debouncedApplyFilters();
      }
      
      // Order functionality
      let currentOrder = 'relevance';
      
      // Initialize order button text on page load
      component.addGlobalEventListener(document, 'DOMContentLoaded', function() {
          const orderBtn = component.shadowRoot.getElementById ('orderBtn');
          const orderText = orderBtn?.querySelector('.order-text');
          if (orderText) {
              orderText.textContent = 'Rilevanza';
          }
      });
      
      function initializeOrderDropdown() {
          const orderBtn = component.shadowRoot.getElementById ('orderBtn');
          const orderDropdown = component.shadowRoot.querySelector('.order-dropdown-content');
          const orderOptions = component.shadowRoot.querySelectorAll('.order-option');
          
          if (!orderBtn || !orderDropdown) return;
          
          // Toggle dropdown on button click
          orderBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              orderDropdown.classList.toggle('show');
              // Always open downwards: remove .open-upwards if present
              orderDropdown.classList.remove('open-upwards');
              // Close other dropdowns
              closeAllDropdowns();
          });
          
          // Handle order option selection
          orderOptions.forEach(option => {
              option.addEventListener('click', (e) => {
                  e.stopPropagation();
                  const orderType = option.getAttribute('data-order');
                  selectOrderOption(orderType);
                  orderDropdown.classList.remove('show');
              });
          });
          
          // Close dropdown when clicking outside
          component.addGlobalEventListener(document, 'click', (e) => {
              if (!orderBtn.contains(e.target) && !orderDropdown.contains(e.target)) {
                  orderDropdown.classList.remove('show');
              }
          });
          
          // Close dropdown on escape key
          component.addGlobalEventListener(document, 'keydown', (e) => {
              if (e.key === 'Escape') {
                  orderDropdown.classList.remove('show');
              }
          });
      }
      
      function selectOrderOption(orderType) {
          currentOrder = orderType;
          
          // Update button text based on selection
          const orderBtn = component.shadowRoot.getElementById ('orderBtn');
          const orderText = orderBtn.querySelector('.order-text');
          
          const orderLabels = {
              'relevance': 'Rilevanza',
              'reviews': 'Recensioni',
              'price-lowest': 'Prezzo crescente',
              'price-highest': 'Prezzo decrescente',
              'name-asc': 'Nome A-Z',
              'name-desc': 'Nome Z-A',
              'date-newest': 'Più recenti',
              'date-oldest': 'Meno recenti'
          };
          
          if (orderText) {
              orderText.textContent = orderLabels[orderType] || 'Ordina';
          }
          
          // Apply the order to current results
          applyOrderToResults();
      }
      
      function applyOrderToResults() {
          if (!originalFiles || originalFiles.length === 0) return;
          
          // Get current filtered results
          const currentResults = applyClientSideFilters(originalFiles);
          
          // Sort the results based on current order
          const sortedResults = sortDocuments(currentResults, currentOrder);
          
          // Re-render the documents with new order
          renderDocuments(sortedResults);
      }
      
      function sortDocuments(documents, orderType) {
          const sorted = [...documents];
          
          switch (orderType) {
              case 'relevance':
                  // Keep original order (relevance from search)
                  return sorted;
                  
              case 'reviews':
                  return sorted.sort((a, b) => {
                      const ratingA = parseFloat(a.rating || 0);
                      const ratingB = parseFloat(b.rating || 0);
                      return ratingB - ratingA; // Higher ratings first
                  });
                  
              case 'name-asc':
                  return sorted.sort((a, b) => {
                      const titleA = (a.title || '').toLowerCase();
                      const titleB = (b.title || '').toLowerCase();
                      return titleA.localeCompare(titleB);
                  });
                  
              case 'name-desc':
                  return sorted.sort((a, b) => {
                      const titleA = (a.title || '').toLowerCase();
                      const titleB = (b.title || '').toLowerCase();
                      return titleB.localeCompare(titleA);
                  });
                  
              case 'date-newest':
                  return sorted.sort((a, b) => {
                      const dateA = new Date(a.upload_date || 0);
                      const dateB = new Date(b.upload_date || 0);
                      return dateB - dateA;
                  });
                  
              case 'date-oldest':
                  return sorted.sort((a, b) => {
                      const dateA = new Date(a.upload_date || 0);
                      const dateB = new Date(b.upload_date || 0);
                      return dateA - dateB;
                  });
                  
              case 'price-lowest':
                  return sorted.sort((a, b) => {
                      const priceA = parseFloat(a.price || 0);
                      const priceB = parseFloat(b.price || 0);
                      return priceA - priceB;
                  });
                  
              case 'price-highest':
                  return sorted.sort((a, b) => {
                      const priceA = parseFloat(a.price || 0);
                      const priceB = parseFloat(b.price || 0);
                      return priceB - priceA;
                  });
                  
              default:
                  return sorted;
          }
      }
      
      async function applyFiltersAndRender() {
          // Check if we have data loaded
          if (!originalFiles || originalFiles.length === 0) {
              await loadAllFiles();
              return;
          }
          
          // Check if we have backend-searchable filters (course_name, faculty_name) 
          // or if there's an active search query
          const searchInput = component.shadowRoot.getElementById ('searchInput');
          const currentQuery = searchInput?.value?.trim() || '';
          
          const hasBackendFilters = component.filterManager.filters.course || component.filterManager.filters.faculty || component.filterManager.filters.canale || component.filterManager.filters.language || component.filterManager.filters.tag || component.filterManager.filters.documentType || component.filterManager.filters.academicYear || component.filterManager.filters.courseYear;
          
          if (hasBackendFilters || currentQuery) {
              // Use backend search with filters
              await performSearch(currentQuery);
          } else if (Object.keys(component.filterManager.filters).length === 0) {
              // No filters active, show all original files
              renderDocuments(originalFiles);
              currentFiles = originalFiles;
              updateActiveFiltersDisplay();
              updateBottomFilterCount();
              showStatus(`${originalFiles.length} documenti disponibili 📚`);
          } else {
              // Show loading cards for client-side filtering
              showLoadingCards();
              
              // Apply only client-side filters to original data
              const filteredFiles = applyFiltersToFiles(originalFiles);
              component.componentState.currentFiles = filteredFiles;
              currentFiles = component.componentState.currentFiles;
              renderDocuments(filteredFiles);
              updateActiveFiltersDisplay();
              updateBottomFilterCount();
              
              // Show filter status
              const filterCount = Object.keys(component.filterManager.filters).length;
              if (filterCount > 0) {
                  if (filteredFiles.length > 0) {
                      showStatus(`${filteredFiles.length} documenti trovati con ${filterCount} filtri attivi 🎯`);
                  } else {
                      showStatus(`Nessun documento trovato con i filtri applicati 🔍`);
                  }
              }
          }
      }
      
      function toggleFiltersPanel() {
          isFiltersOpen = !isFiltersOpen;
          const filtersPanel = component.shadowRoot.getElementById ('filtersPanel');
          const filtersOverlay = component.shadowRoot.getElementById ('filtersOverlay');
          const mainContent = component.shadowRoot.querySelector('.main-content');
          const documentsGrid = component.shadowRoot.getElementById ('documentsGrid');
          
          if (isFiltersOpen) {
              // Ensure robust positioning before showing
              if (filtersPanel) {
                  filtersPanel.style.position = 'fixed';
                  filtersPanel.style.top = '0';
                  filtersPanel.style.right = '0';
                  filtersPanel.style.bottom = '0';
                  filtersPanel.style.height = '100vh';
                  filtersPanel.style.zIndex = '9999';
                  filtersPanel.style.width = window.innerWidth <= 900 ? '90%' : '380px';
                  filtersPanel.style.maxWidth = window.innerWidth <= 900 ? '350px' : '380px';
                  filtersPanel.style.margin = '0';
                  filtersPanel.style.padding = '0';
                  filtersPanel.classList.add('active');
              }
              if (filtersOverlay) filtersOverlay.classList.add('active');
              if (mainContent) mainContent.classList.add('filters-open');
              if (documentsGrid) documentsGrid.classList.add('filters-open');
                        // Use instance-specific body class to prevent conflicts
          document.body.classList.add(`filters-open-${component.instanceId}`);
          document.body.style.overflow = 'hidden';
              
              // Populate filter options when opening
              populateFilterOptions();
              
              // Add bottom clear all button if it doesn't exist
              addBottomClearAllButton();
              
              showStatus('Panel filtri aperto 🎯');
      
              // Always show price slider if 'Tutti' is active when opening filters
              const priceRangeContainer = component.shadowRoot.getElementById ('priceRangeContainer');
              const tuttiToggle = component.shadowRoot.querySelector('.price-toggle.active[data-price="all"]');
              if (tuttiToggle && priceRangeContainer) {
                  priceRangeContainer.style.display = 'block';
              }
          } else {
              closeFiltersPanel();
          }
      }
      
      function addBottomClearAllButton() {
          const filtersContent = component.shadowRoot.querySelector('.filters-content');
          if (!filtersContent) return;
          
          // Check if bottom clear button already exists
          if (component.shadowRoot.getElementById ('bottomClearAllButton')) return;
          
          // Create bottom clear all button section
          const bottomClearSection = document.createElement('div');
          bottomClearSection.className = 'filters-bottom-actions';
          bottomClearSection.innerHTML = `
              <div class="bottom-clear-container">
                  <button class="bottom-clear-all-btn" id="bottomClearAllButton" data-action="clear-all-filters">
                      <i class="material-symbols-outlined">clear_all</i>
                      <span>Rimuovi tutti i filtri</span>
                  </button>
                  <div class="bottom-clear-info">
                      <span id="bottomFilterCount">0 filtri attivi</span>
                  </div>
              </div>
          `;
          
          // Add to the end of filters content
          filtersContent.appendChild(bottomClearSection);
          
          // Update the bottom filter count
          updateBottomFilterCount();
      }
      
      // Enhanced filter counting system - Instance-specific FilterManager
      this.FilterManager = class {
          constructor(componentInstance) {
              this.component = componentInstance;
              this.filters = {};
              this.updateCountTimeout = null;
          }
          
          // Add or update a filter
          setFilter(key, value) {
              if (value === null || value === '' || value === undefined || 
                  (Array.isArray(value) && value.length === 0)) {
                  delete this.filters[key];
              } else {
                  this.filters[key] = value;
              }
              this.debouncedUpdateCounts();
              this.updateActiveFiltersDisplay();
              
              // Save to localStorage whenever a filter is set
              saveFiltersToStorage();
          }
          
          // Remove a filter
          removeFilter(key) {
              delete this.filters[key];
              this.debouncedUpdateCounts();
              this.updateActiveFiltersDisplay();
              
              // Save to localStorage whenever a filter is removed
              saveFiltersToStorage();
          }
          
          // Get current filter count
          getActiveFilterCount() {
              const filters = this.filters || {};
              let count = 0;
      
              // Price range: count as 1 filter if changed from default
              const minPriceSet = filters.minPrice !== undefined && filters.minPrice !== 0;
              const maxPriceSet = filters.maxPrice !== undefined && filters.maxPrice !== 100;
              if (minPriceSet || maxPriceSet) {
                  count += 1;
              }
      
              // Pages range: count as 1 filter if changed from default
              const minPagesSet = filters.minPages !== undefined && filters.minPages !== 1;
              const maxPagesSet = filters.maxPages !== undefined && filters.maxPages !== 1000;
              if (minPagesSet || maxPagesSet) {
                  count += 1;
              }
      
              // All other filters (skip priceType if 'all')
              Object.entries(filters).forEach(([key, value]) => {
                  if (
                      key === "minPrice" || key === "maxPrice" ||
                      key === "minPages" || key === "maxPages" ||
                      (key === "priceType" && value === "all")
                  ) {
                      return;
                  }
                  if (value !== null && value !== undefined && value !== "") {
                      count += 1;
                  }
              });
      
              return { filters, count };
          }
          
          // Debounced count update to prevent race conditions
          debouncedUpdateCounts() {
              clearTimeout(this.updateCountTimeout);
              this.updateCountTimeout = setTimeout(() => {
                  this.updateBottomFilterCount();
              }, 100);
          }
          
          // Updated count function that uses state instead of DOM counting
          updateBottomFilterCount() {
              const bottomFilterCountElement = this.component.shadowRoot.getElementById ('bottomFilterCount');
              const filterCountBadge = this.component.shadowRoot.getElementById ('filterCount');
              const activeCountObj = this.getActiveFilterCount();
              const activeCount = activeCountObj.count;
              // Debug log
              console.log('[FilterManager] updateBottomFilterCount: activeCount =', activeCount, 'filters:', { ...this.filters });
              // Update footer text
              if (bottomFilterCountElement) {
                  bottomFilterCountElement.textContent = activeCount === 0 ? 'Nessun filtro attivo' : 
                      activeCount === 1 ? '1 filtro attivo' : `${activeCount} filtri attivi`;
              }
              // Update badge
              if (filterCountBadge) {
                  filterCountBadge.textContent = activeCount;
                  if (activeCount > 0) {
                      filterCountBadge.classList.add('active');
                  } else {
                      filterCountBadge.classList.remove('active');
                  }
              }
          }
          
          // Enhanced display update with proper timing
          updateActiveFiltersDisplay() {
              const activeFiltersContainer = component.shadowRoot.getElementById ('activeFiltersDisplay');
              if (!activeFiltersContainer) return;
              // Clear existing pills
              activeFiltersContainer.innerHTML = '';
              const filters = this.filters;
              // Clear All pill (always first)
              const clearAllPill = document.createElement('div');
              clearAllPill.className = 'filter-pill clear-all-filters-btn sticky-left';
              clearAllPill.innerHTML = `
                  <span class="filter-label">Rimuovi tutti</span>
                  <button class="filter-remove" onclick="component.filterManager.clearAllFiltersAction()">
                      <i class="material-symbols-outlined">close</i>
                  </button>
              `;
              activeFiltersContainer.appendChild(clearAllPill);
              // Pages range pill
              const minPagesSet = filters.minPages !== undefined && filters.minPages !== 1;
              const maxPagesSet = filters.maxPages !== undefined && filters.maxPages !== 1000;
              if (minPagesSet || maxPagesSet) {
                  const min = filters.minPages !== undefined ? filters.minPages : 1;
                  const max = filters.maxPages !== undefined ? filters.maxPages : 1000;
                  const pill = document.createElement('div');
                  pill.className = 'filter-pill';
                  pill.setAttribute('data-filter-key', 'pagesRange');
                  pill.innerHTML = `
                      <span class="filter-label">Pagine: ${min}-${max}</span>
                      <button class="filter-remove" onclick="component.filterManager.removeFilter('minPages');component.filterManager.removeFilter('maxPages')">
                          <i class="material-symbols-outlined">close</i>
                      </button>
                  `;
                  activeFiltersContainer.appendChild(pill);
              }
              // Price range pill
              const minPriceSet = filters.minPrice !== undefined && filters.minPrice !== 0;
              const maxPriceSet = filters.maxPrice !== undefined && filters.maxPrice !== 100;
              if (minPriceSet || maxPriceSet) {
                  const min = filters.minPrice !== undefined ? filters.minPrice : 0;
                  const max = filters.maxPrice !== undefined ? filters.maxPrice : 100;
                  const pill = document.createElement('div');
                  pill.className = 'filter-pill';
                  pill.setAttribute('data-filter-key', 'priceRange');
                  pill.innerHTML = `
                      <span class="filter-label">Prezzo: €${min}-€${max}</span>
                      <button class="filter-remove" onclick="component.filterManager.removeFilter('minPrice');component.filterManager.removeFilter('maxPrice')">
                          <i class="material-symbols-outlined">close</i>
                      </button>
                  `;
                  activeFiltersContainer.appendChild(pill);
              }
              // All other filters
              Object.entries(filters).forEach(([key, value]) => {
                  if (["minPages","maxPages","minPrice","maxPrice"].includes(key)) return;
                  const pill = this.createFilterPill(key, value);
                  activeFiltersContainer.appendChild(pill);
              });
              // Use proper timing for animations and count updates
              requestAnimationFrame(() => {
                  activeFiltersContainer.classList.add('visible');
                  // Ensure DOM is fully rendered before counting
                  requestAnimationFrame(() => {
                      this.updateBottomFilterCount();
                  });
              });
          }
          
          // Helper function to create filter pills
          createFilterPill(key, value) {
              const pill = document.createElement('div');
              pill.className = 'filter-pill';
              pill.setAttribute('data-filter-key', key);
              
              // Display logic based on your filter types
              let displayText = '';
              if (typeof value === 'string') {
                  displayText = value;
              } else if (Array.isArray(value)) {
                  displayText = value.join(', ');
              } else {
                  displayText = String(value);
              }
              
              pill.innerHTML = `
                  <span class="filter-label">${key}: ${displayText}</span>
                  <button class="filter-remove" onclick="component.filterManager.removeFilter('${key}')">
                      <i class="material-symbols-outlined">close</i>
                  </button>
              `;
              
              return pill;
          }
      }
      
      // Initialize the filter manager as instance property
      this.filterManager = new this.FilterManager(this);
      
      // Replace your existing functions with calls to the filter manager
      function updateBottomFilterCount() {
          component.filterManager.updateBottomFilterCount();
      }
      
      function updateActiveFiltersDisplay() {
          component.filterManager.updateActiveFiltersDisplay();
      }
      
      function closeFiltersPanel() {
          isFiltersOpen = false;
          const filtersPanel = component.shadowRoot.getElementById ('filtersPanel');
          const filtersOverlay = component.shadowRoot.getElementById ('filtersOverlay');
          const mainContent = component.shadowRoot.querySelector('.main-content');
          const documentsGrid = component.shadowRoot.getElementById ('documentsGrid');
          
          if (filtersPanel) filtersPanel.classList.remove('active');
          if (filtersOverlay) filtersOverlay.classList.remove('active');
          if (mainContent) mainContent.classList.remove('filters-open');
          if (documentsGrid) documentsGrid.classList.remove('filters-open');
          // Remove instance-specific body class
          document.body.classList.remove(`filters-open-${component.instanceId}`);
          document.body.style.overflow = '';
      }
      
      async function populateFilterOptions() {
          // Use cached hierarchy data instead of making API calls
          if (!component.facultyCoursesData) {
              await loadHierarchyData();
          }
          
          // If hierarchy data is still not available, fallback to extract from files
          if (!component.facultyCoursesData || Object.keys(component.facultyCoursesData).length === 0) {
              if (originalFiles && originalFiles.length) {
                  const faculties = [...new Set(originalFiles.map(f => 
                      f.faculty_name || f.vetrina_info?.faculty_name
                  ).filter(Boolean))];
                  
                  const courses = [...new Set(originalFiles.map(f => 
                      f.course_name || f.vetrina_info?.course_name
                  ).filter(Boolean))];
                  
                  // Create a simple fallback hierarchy
                  component.facultyCoursesData = {};
                  faculties.forEach(faculty => {
                      component.facultyCoursesData[faculty] = courses.map(course => ['', course]);
                  });
              } else {
                  // Create mock data when no files or API data is available (for testing/demo)
                  console.log('🔧 No API data or files available, using mock filter data for demo');
                  component.facultyCoursesData = {
                      'Ingegneria': [
                          ['', 'Algoritmi e Strutture Dati'],
                          ['', 'Analisi Matematica'],
                          ['', 'Fisica Generale'],
                          ['', 'Programmazione']
                      ],
                      'Economia': [
                          ['', 'Microeconomia'],
                          ['', 'Macroeconomia'],
                          ['', 'Statistica'],
                          ['', 'Matematica Finanziaria']
                      ],
                      'Medicina': [
                          ['', 'Anatomia'],
                          ['', 'Biologia'],
                          ['', 'Chimica'],
                          ['', 'Fisiologia']
                      ]
                  };
              }
          }
      
          // 🚀 OPTIMIZED: Use vetrina-level data for filter options instead of file metadata
          if (originalFiles.length) {
              // Extract document types from vetrina data
              const documentTypes = [...new Set(originalFiles.map(f => 
                  f.document_type
              ).filter(Boolean))];
              
              const popularTypes = ['PDF', 'DOCX', 'PPTX', 'XLSX'];
              const sortedDocumentTypes = [
                  ...popularTypes.filter(type => documentTypes.includes(type)),
                  ...documentTypes.filter(type => !popularTypes.includes(type)).sort()
              ];
      
              // Update document type dropdown options
              populateDropdownFilter('documentType', sortedDocumentTypes);
              
              // 🚀 NEW: Extract tags from vetrina-level data instead of file metadata
              const allTags = [];
              originalFiles.forEach(vetrina => {
                  if (vetrina.tags && Array.isArray(vetrina.tags)) {
                      allTags.push(...vetrina.tags);
                  }
              });
              
              const uniqueTags = [...new Set(allTags)].sort();
              
              // Update tag dropdown options
              populateDropdownFilter('tag', uniqueTags);
          } else {
              // Add mock filter data when no files are available (for testing/demo)
              console.log('🔧 No files available, using mock filter options for demo');
              
              // Mock document types
              const mockDocumentTypes = ['PDF', 'DOCX', 'PPTX', 'XLSX', 'JPG', 'PNG'];
              populateDropdownFilter('documentType', mockDocumentTypes);
              
              // Mock tags
              const mockTags = ['Matematica', 'Programmazione', 'Fisica', 'Economia', 'Storia', 'Chimica', 'Biologia', 'Inglese'];
              populateDropdownFilter('tag', mockTags);
              
              // Mock academic years
              const mockYears = ['2023/2024', '2022/2023', '2021/2022', '2020/2021'];
              populateDropdownFilter('academicYear', mockYears);
          }
      }
      
      
      
      function populateDropdownFilter(type, options) {
          const optionsContainer = component.shadowRoot.getElementById (`${type}Options`);
          if (!optionsContainer) return;
      
          // Save current selection and input value
          const input = component.shadowRoot.getElementById (`${type}Filter`);
          const currentValue = component.filterManager.filters[type] || '';
          const currentInputValue = input ? input.value : '';
      
          // Clear existing options except the first one (default "All" option)
          const firstOption = optionsContainer.firstElementChild;
          optionsContainer.innerHTML = '';
          if (firstOption) optionsContainer.appendChild(firstOption);
      
          // Add new options
          options.forEach(option => {
              const optionDiv = document.createElement('div');
              optionDiv.className = 'dropdown-option';
              optionDiv.dataset.value = option;
              optionDiv.innerHTML = `
                  <span>${option}</span>
                  <span class="dropdown-option-check">✓</span>
              `;
              optionDiv.addEventListener('click', () => {
                  selectDropdownOption(type, option, option);
              });
              optionsContainer.appendChild(optionDiv);
          });
          
          // Update visual selection based on active filters
          optionsContainer.querySelectorAll('.dropdown-option').forEach(option => {
              const isSelected = Array.isArray(currentValue) 
                  ? currentValue.includes(option.dataset.value)
                  : option.dataset.value === currentValue;
              option.classList.toggle('selected', isSelected);
          });
          
          // Restore input value if it was set
          if (input && currentInputValue && currentInputValue !== '') {
              input.value = currentInputValue;
          }
      }
      
      function populateSelect(selectId, options) {
          const select = component.shadowRoot.getElementById (selectId);
          if (!select) return;
      
          // Save current selection
          const currentValue = select.value;
      
          // Clear existing options except the first one
          const firstOption = select.firstElementChild;
          select.innerHTML = '';
          if (firstOption) select.appendChild(firstOption);
      
          // Add new options sorted alphabetically
          options.sort().forEach(option => {
              const optionElement = document.createElement('option');
              optionElement.value = option;
              optionElement.textContent = option;
              select.appendChild(optionElement);
          });
          
          // Restore selection if it still exists
          if (currentValue && options.includes(currentValue)) {
              select.value = currentValue;
          }
      }
      
      function clearAllFiltersAction() {
          component.filterManager.filters = {};
          
          // Clear filters from localStorage
          try {
              component.removeStorageItem('filters');
              component.removeStorageItem('tags');
          } catch (e) {
              console.warn('Could not clear filters from localStorage:', e);
          }
          
          // Use the comprehensive updateFilterInputs function to ensure complete UI reset
          updateFilterInputs();
          
          // Update all filter indicators and displays
          updateActiveFilterIndicators();
          updateBottomFilterCount();
          updateActiveFiltersDisplay();
          
          // Apply changes immediately
          applyFiltersAndRender();
          
          showStatus('Tutti i filtri sono stati rimossi 🧹');
      }
      
      function applyFiltersToFiles(files) {
          // If no filters are active, return all files
          if (!component.filterManager.filters || Object.keys(component.filterManager.filters).length === 0) {
              return files;
          }
          
          return files.filter(file => {
              // Faculty filter - case insensitive partial match (supports multiple)
              if (component.filterManager.filters.faculty) {
                  const fileFaculty = file.faculty_name || file.vetrina_info?.faculty_name || '';
                  if (Array.isArray(component.filterManager.filters.faculty)) {
                      const hasMatchingFaculty = component.filterManager.filters.faculty.some(selectedFaculty => 
                          fileFaculty.toLowerCase().includes(selectedFaculty.toLowerCase())
                      );
                      if (!hasMatchingFaculty) {
                          return false;
                      }
                  } else {
                      if (!fileFaculty.toLowerCase().includes(component.filterManager.filters.faculty.toLowerCase())) {
                          return false;
                      }
                  }
              }
              
              // Course filter - case insensitive partial match (supports multiple)
              if (component.filterManager.filters.course) {
                  const fileCourse = file.course_name || file.vetrina_info?.course_name || '';
                  if (Array.isArray(component.filterManager.filters.course)) {
                      const hasMatchingCourse = component.filterManager.filters.course.some(selectedCourse => 
                          fileCourse.toLowerCase().includes(selectedCourse.toLowerCase())
                      );
                      if (!hasMatchingCourse) {
                          return false;
                      }
                  } else {
                      if (!fileCourse.toLowerCase().includes(component.filterManager.filters.course.toLowerCase())) {
                          return false;
                      }
                  }
              }
              
              
              
              // Document type filter - exact match (supports multiple)
              if (component.filterManager.filters.documentType) {
                  const fileType = file.document_type || '';
                  if (Array.isArray(component.filterManager.filters.documentType)) {
                      if (!component.filterManager.filters.documentType.includes(fileType)) {
                          return false;
                      }
                  } else {
                      if (fileType !== component.filterManager.filters.documentType) {
                          return false;
                      }
                  }
              }
              
              // Language filter - exact match (supports multiple)
              if (component.filterManager.filters.language) {
                  const fileLanguage = file.language || '';
                  if (Array.isArray(component.filterManager.filters.language)) {
                      if (!component.filterManager.filters.language.includes(fileLanguage)) {
                          return false;
                      }
                  } else {
                      if (fileLanguage !== component.filterManager.filters.language) {
                          return false;
                      }
                  }
              }
              
              // Canale filter - exact match (supports multiple)
              if (component.filterManager.filters.canale) {
                  const fileCanale = file.canale || file.vetrina_info?.canale || '';
                  if (Array.isArray(component.filterManager.filters.canale)) {
                      if (!component.filterManager.filters.canale.includes(fileCanale)) {
                          return false;
                      }
                  } else {
                      if (fileCanale !== component.filterManager.filters.canale) {
                          return false;
                      }
                  }
              }
              
              // Academic year filter - exact match (supports multiple)
              if (component.filterManager.filters.academicYear) {
                  const fileYear = file.academic_year || '';
                  if (Array.isArray(component.filterManager.filters.academicYear)) {
                      if (!component.filterManager.filters.academicYear.includes(fileYear)) {
                          return false;
                      }
                  } else {
                      if (fileYear !== component.filterManager.filters.academicYear) {
                          return false;
                      }
                  }
              }
              
              // Tag filter - supports multiple tags
              if (component.filterManager.filters.tag) {
                  const fileTags = file.tags || [];
                  if (Array.isArray(component.filterManager.filters.tag)) {
                      // File must have at least one of the selected tags
                      const hasMatchingTag = component.filterManager.filters.tag.some(selectedTag => 
                          fileTags.includes(selectedTag)
                      );
                      if (!hasMatchingTag) {
                          return false;
                      }
                  } else {
                      // Single tag filter (backward compatibility)
                      if (!fileTags.includes(component.filterManager.filters.tag)) {
                          return false;
                      }
                  }
              }
              
              // Rating filter - minimum rating
              if (component.filterManager.filters.minRating) {
                  const fileRating = parseFloat(file.rating) || 0;
                  if (fileRating < component.filterManager.filters.minRating) {
                      return false;
                  }
              }
              
              // Price type filter
              if (component.filterManager.filters.priceType) {
                  const filePrice = parseFloat(file.price) || 0;
                  
                  if (component.filterManager.filters.priceType === 'free' && filePrice > 0) {
                      return false;
                  }
                  if (component.filterManager.filters.priceType === 'paid' && filePrice === 0) {
                      return false;
                  }
                  // For 'all', we don't filter by price type, but we may filter by range below
              }
              
              // Price range filter - works for both 'paid' and 'all' price types
              if (component.filterManager.filters.minPrice !== undefined || component.filterManager.filters.maxPrice !== undefined) {
                  const filePrice = parseFloat(file.price) || 0;
                  
                  // Apply minimum price filter
                  if (component.filterManager.filters.minPrice !== undefined && filePrice < component.filterManager.filters.minPrice) {
                      return false;
                  }
                  
                  // Apply maximum price filter
                  if (component.filterManager.filters.maxPrice !== undefined && filePrice > component.filterManager.filters.maxPrice) {
                      return false;
                  }
              }
              
      
              
              // Vetrina type filter - single vs multiple files
              if (component.filterManager.filters.vetrinaType && component.filterManager.filters.vetrinaType !== 'all') {
                  const fileCount = file.fileCount || 1;
                  
                  switch (component.filterManager.filters.vetrinaType) {
                      case 'single':
                          if (fileCount > 1) return false;
                          break;
                      case 'multiple':
                          if (fileCount <= 1) return false;
                          break;
                  }
              }
              
              // Pages (Pagine) filter
              if (typeof component.filterManager.filters.minPages === 'number' && typeof component.filterManager.filters.maxPages === 'number') {
                  const filePages = file.pages || file.vetrina_info?.pages;
                  if (typeof filePages !== 'number') return false;
                  if (filePages < component.filterManager.filters.minPages || filePages > component.filterManager.filters.maxPages) {
                      return false;
                  }
              }
              
              return true;
          });
      }
      
      function updateActiveFiltersDisplay() {
          const activeFiltersContainer = component.shadowRoot.getElementById ('activeFiltersDisplay');
          if (!activeFiltersContainer) return;
          
          const filterEntries = Object.entries(component.filterManager.filters).filter(([key, value]) => {
              return value !== null && value !== undefined && value !== '' && value !== 'all';
          });
          
          if (filterEntries.length === 0) {
              activeFiltersContainer.classList.remove('visible');
              setTimeout(() => {
                  activeFiltersContainer.innerHTML = '';
              }, 400);
              return;
          }
          
          const filterPills = [];
          
          filterEntries.forEach(([key, value]) => {
              let label = '';
              let displayValue = '';
              
              // Handle arrays for multi-select filters
              if (Array.isArray(value)) {
                  value.forEach(item => {
                      let itemLabel = '';
                      let itemValue = '';
                      
                      switch (key) {
                          case 'faculty':
                              itemLabel = 'Facoltà';
                              itemValue = item;
                              break;
                          case 'course':
                              itemLabel = 'Corso';
                              itemValue = item;
                              break;
                                  case 'canale':
                  itemLabel = 'Canale';
                  value = formatCanaleDisplay(value);
                              itemValue = item;
                              break;
                          case 'documentType':
                              itemLabel = 'Tipo';
                              itemValue = item;
                              break;
                          case 'language':
                              itemLabel = 'Lingua';
                              itemValue = item === 'Italian' ? 'Italiano' : item === 'English' ? 'Inglese' : item;
                              break;
                          case 'academicYear':
                              itemLabel = 'Anno';
                              itemValue = item;
                              break;
                          case 'tag':
                              itemLabel = 'Tag';
                              itemValue = getTagDisplayName(item);
                              break;
                      }
                      
                      if (itemLabel && itemValue) {
                          filterPills.push(`
                              <div class="filter-pill" data-filter="${key}" data-value="${item}">
                                  <span class="filter-pill-label">${itemLabel}:</span>
                                  <span class="filter-pill-value">${itemValue}</span>
                                  <span class="filter-pill-remove" data-action="remove-filter" data-filter-key="${key}" data-specific-value="${item}"></span>
                              </div>
                          `);
                      }
                  });
                  return; // Skip the single-value processing below
              }
              
              // Handle single values (existing logic)
              switch (key) {
                  case 'faculty':
                      label = 'Facoltà';
                      displayValue = value;
                      break;
                  case 'course':
                      label = 'Corso';
                      displayValue = value;
                      break;
      
                  case 'documentType':
                      label = 'Tipo';
                      displayValue = value;
                      break;
                  case 'language':
                      label = 'Lingua';
                      displayValue = value === 'Italian' ? 'Italiano' : value === 'English' ? 'Inglese' : value;
                      break;
                          case 'canale':
                  label = 'Canale';
                  value = formatCanaleDisplay(value);
                      displayValue = value;
                      break;
                  case 'academicYear':
                      label = 'Anno';
                      displayValue = value;
                      break;
                  case 'minRating':
                      label = 'Rating';
                      displayValue = `${value}+ ⭐`;
                      break;
                  case 'priceType':
                      if (value === 'free') {
                          label = 'Prezzo';
                          displayValue = 'Gratis';
                      } else if (value === 'paid') {
                          label = 'Prezzo';
                          displayValue = 'A pagamento';
                      }
                      break;
      
                  case 'vetrinaType':
                      const vetrinaLabels = {
                          'single': 'Singolo File',
                          'multiple': 'Pacchetti'
                      };
                      label = 'Tipo Vetrina';
                      displayValue = vetrinaLabels[value];
                      break;
                  case 'tag':
                      label = 'Tag';
                      displayValue = getTagDisplayName(value);
                      break;
              }
              
              if (label && displayValue) {
                  filterPills.push(`
                      <div class="filter-pill" data-filter-key="${key}" data-action="remove-filter">
                          <span class="filter-pill-label">${label}:</span>
                          <span class="filter-pill-value">${displayValue}</span>
                          <div class="filter-pill-remove"></div>
                      </div>
                  `);
              }
          });
          
          // Add price range pill if min/max are set and not default values
          if ((component.filterManager.filters.minPrice !== undefined || component.filterManager.filters.maxPrice !== undefined) &&
              (component.filterManager.filters.minPrice !== 0 || component.filterManager.filters.maxPrice !== 100)) {
              const minPrice = component.filterManager.filters.minPrice !== undefined ? component.filterManager.filters.minPrice : 0;
              const maxPrice = component.filterManager.filters.maxPrice !== undefined ? component.filterManager.filters.maxPrice : 100;
              filterPills.push(`
                  <div class="filter-pill" data-filter-key="priceRange">
                      <span class="filter-pill-label">Prezzo:</span>
                      <span class="filter-pill-value">€${minPrice}-€${maxPrice}</span>
                      <span class="filter-pill-remove" data-action="remove-filter" data-filter-key="priceRange"></span>
                  </div>
              `);
          }
          // Add pages range pill if min/max are set and not default values
          if ((component.filterManager.filters.minPages !== undefined || component.filterManager.filters.maxPages !== undefined) &&
              (component.filterManager.filters.minPages !== 1 || component.filterManager.filters.maxPages !== 1000)) {
              const minPages = component.filterManager.filters.minPages !== undefined ? component.filterManager.filters.minPages : 1;
              const maxPages = component.filterManager.filters.maxPages !== undefined ? component.filterManager.filters.maxPages : 1000;
              filterPills.push(`
                  <div class="filter-pill" data-filter-key="pagesRange">
                      <span class="filter-pill-label">Pagine:</span>
                      <span class="filter-pill-value">${minPages}-${maxPages}</span>
                      <span class="filter-pill-remove" data-action="remove-filter" data-filter-key="pagesRange"></span>
                  </div>
              `);
          }
          
          // Add clear all button if there are filters
          if (filterPills.length > 0) {
              filterPills.unshift(`
                  <button class="clear-all-filters-btn" data-action="clear-all-filters" style="color: #dc2626;">
                      <span class="clear-all-x-icon" style="font-size: 18px; font-weight: bold; margin-right: 6px;">&times;</span>
                      <span class="clear-all-filters-btn-text">Rimuovi tutti</span>
                  </button>
              `);
          }
          
          activeFiltersContainer.innerHTML = filterPills.join('');
          
          // Trigger animation
          setTimeout(() => {
              activeFiltersContainer.classList.add('visible');
              updateBottomFilterCount();
          }, 50);
      
          // Add event delegation for priceRange and pagesRange pills (remove button only)
          activeFiltersContainer.querySelectorAll('.filter-pill[data-filter-key="priceRange"] .filter-pill-remove, .filter-pill[data-filter-key="pagesRange"] .filter-pill-remove').forEach(btn => {
              btn.addEventListener('click', function(event) {
                  event.stopPropagation();
                  removeActiveFilter(btn.closest('.filter-pill').getAttribute('data-filter-key'), event);
              });
          });
      }
      
      // New function to handle individual filter removal with animation
      function removeActiveFilter(filterKey, event, specificValue = null) {
          event?.stopPropagation();
          
          const pill = event?.target.closest('.filter-pill');
          if (pill) {
              pill.style.animation = 'filterPillRemove 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
              setTimeout(() => {
                  if (specificValue) {
                      removeSpecificFilterValueFromPill(filterKey, specificValue);
                  } else {
                      removeFilter(filterKey);
                  }
                  applyFiltersAndRender();
              }, 250);
          } else {
              if (specificValue) {
                  removeSpecificFilterValueFromPill(filterKey, specificValue);
              } else {
                  removeFilter(filterKey);
              }
              applyFiltersAndRender();
          }
      }
      
      function removeSpecificFilterValueFromPill(filterKey, specificValue) {
          if (component.filterManager.filters[filterKey] && Array.isArray(component.filterManager.filters[filterKey])) {
              component.filterManager.filters[filterKey] = component.filterManager.filters[filterKey].filter(v => v !== specificValue);
              
              if (component.filterManager.filters[filterKey].length === 0) {
                  delete component.filterManager.filters[filterKey];
              }
              
              // Update the input display
              const input = component.shadowRoot.getElementById (`${filterKey}Filter`);
              if (input) {
                  if (!component.filterManager.filters[filterKey] || component.filterManager.filters[filterKey].length === 0) {
                      input.value = '';
                  } else if (component.filterManager.filters[filterKey].length === 1) {
                      // Apply display mappings for single remaining item
                      const remainingValue = component.filterManager.filters[filterKey][0];
                      let displayText = remainingValue;
                      
                      const languageDisplayMap = {
                          'Italian': 'Italiano',
                          'English': 'Inglese'
                      };
                      if (filterKey === 'language' && languageDisplayMap[remainingValue]) {
                          displayText = languageDisplayMap[remainingValue];
                      } else if (filterKey === 'tag') {
                          displayText = getTagDisplayName(remainingValue);
                      }
                      
                      input.value = displayText;
                  } else {
                      input.value = `${component.filterManager.filters[filterKey].length} selected`;
                  }
              }
              
              saveFiltersToStorage();
              showStatus('Filtro rimosso 🗑️');
          }
      }
      
      // New function to handle clear all filters with animation
      function clearAllActiveFilters(event) {
          event?.stopPropagation();
          
          const activeFiltersContainer = component.shadowRoot.getElementById ('activeFiltersDisplay');
          if (activeFiltersContainer) {
              // Animate all pills out
              const pills = activeFiltersContainer.querySelectorAll('.filter-pill, .clear-all-filters-btn');
              pills.forEach((pill, index) => {
                  setTimeout(() => {
                      pill.style.animation = 'filterPillRemove 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                  }, index * 50);
              });
              
              setTimeout(() => {
                  clearAllFiltersAction();
              }, pills.length * 50 + 200);
          } else {
              clearAllFiltersAction();
          }
      }
      
      function removeFilter(filterKey) {
          if (filterKey === 'priceRange') {
              // Reset price range but keep priceType
              delete component.filterManager.filters.minPrice;
              delete component.filterManager.filters.maxPrice;
              
              const minPriceRange = component.shadowRoot.getElementById ('minPriceRange');
              const maxPriceRange = component.shadowRoot.getElementById ('maxPriceRange');
              const minPriceValue = component.shadowRoot.getElementById ('minPriceValue');
              const maxPriceValue = component.shadowRoot.getElementById ('maxPriceValue');
              
              if (minPriceRange) minPriceRange.value = 0;
              if (maxPriceRange) maxPriceRange.value = 100;
              if (minPriceValue) minPriceValue.textContent = '€0';
              if (maxPriceValue) maxPriceValue.textContent = '€100';
              updatePriceSliderFill();
              
          } else {
              delete component.filterManager.filters[filterKey];
              
              // Update UI elements
              const filterMap = {
                  'faculty': 'facultyFilter',
                  'course': 'courseFilter',
                  'professor': 'professorFilter',
                  'documentType': 'documentTypeFilter',
                  'language': 'languageFilter',
                  'canale': 'canaleFilter',
                  'academicYear': 'academicYearFilter'
              };
              
              const selectId = filterMap[filterKey];
              if (selectId) {
                  const select = component.shadowRoot.getElementById (selectId);
                  if (select) select.selectedIndex = 0;
              }
              
              // Handle special cases
              if (filterKey === 'minRating') {
                  component.shadowRoot.querySelectorAll('.rating-star-filter').forEach(star => {
                      star.classList.remove('active');
                      star.style.color = '#d1d5db';
                  });
                  const ratingText = component.shadowRoot.getElementById ('ratingText');
                  if (ratingText) ratingText.textContent = 'Qualsiasi rating';
              }
              
              if (filterKey === 'priceType') {
                  // Reset all price-related filters
                  delete component.filterManager.filters.minPrice;
                  delete component.filterManager.filters.maxPrice;
                  
                  component.shadowRoot.querySelectorAll('.price-toggle').forEach(toggle => {
                      toggle.classList.remove('active');
                  });
                  const allPriceToggle = component.shadowRoot.querySelector('.price-toggle[data-price="all"]');
                  if (allPriceToggle) allPriceToggle.classList.add('active');
                  
                  const priceRangeContainer = component.shadowRoot.getElementById ('priceRangeContainer');
                  if (priceRangeContainer) priceRangeContainer.style.display = 'none';
                  
                  // Reset price range sliders
                  const minPriceRange = component.shadowRoot.getElementById ('minPriceRange');
                  const maxPriceRange = component.shadowRoot.getElementById ('maxPriceRange');
                  const minPriceValue = component.shadowRoot.getElementById ('minPriceValue');
                  const maxPriceValue = component.shadowRoot.getElementById ('maxPriceValue');
                  
                  if (minPriceRange) minPriceRange.value = 0;
                  if (maxPriceRange) maxPriceRange.value = 100;
                  if (minPriceValue) minPriceValue.textContent = '€0';
                  if (maxPriceValue) maxPriceValue.textContent = '€100';
                  updatePriceSliderFill();
              }
              
      
              
              if (filterKey === 'vetrinaType') {
                  component.shadowRoot.querySelectorAll('.vetrina-toggle').forEach(toggle => {
                      toggle.classList.remove('active');
                  });
                  const allVetrinaToggle = component.shadowRoot.querySelector('.vetrina-toggle[data-vetrina="all"]');
                  if (allVetrinaToggle) allVetrinaToggle.classList.add('active');
              }
          }
          
          // Apply changes immediately
          applyFiltersAndRender();
          saveFiltersToStorage();
          showStatus('Filtro rimosso 🗑️');
      }
      
      // ===========================
      // CORE FUNCTIONALITY
      // ===========================
      
      // Generate consistent color variant based on username
      function getAvatarVariant(username) {
          if (!username) return 'variant-1';
          let hash = 0;
          for (let i = 0; i < username.length; i++) {
              hash = username.charCodeAt(i) + ((hash << 5) - hash);
          }
          return `variant-${Math.abs(hash % 8) + 1}`;
      }
      
      // Strong gradient definitions - no light yellow gradients
      const STRONG_GRADIENTS = [
          'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',      // Deep Blue to Blue
          'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',      // Purple to Pink
          'linear-gradient(135deg, #059669 0%, #10b981 100%)',      // Green to Emerald
          'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',      // Red to Red
          'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',      // Orange to Orange
          'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',      // Cyan to Cyan
          'linear-gradient(135deg, #be185d 0%, #ec4899 100%)',      // Pink to Pink
          'linear-gradient(135deg, #166534 0%, #22c55e 100%)',      // Green to Green
          'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',      // Dark Red to Red
          'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',      // Dark Blue to Blue
          'linear-gradient(135deg, #6b21a8 0%, #a855f7 100%)',      // Dark Purple to Purple
          'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)'       // Teal to Teal
      ];
      
      function getConsistentGradient(username) {
          if (!username) return STRONG_GRADIENTS[0];
          let hash = 0;
          for (let i = 0; i < username.length; i++) {
              hash = username.charCodeAt(i) + ((hash << 5) - hash);
          }
          return STRONG_GRADIENTS[Math.abs(hash) % STRONG_GRADIENTS.length];
      }
      
      function createGradientAvatar(fullName, username) {
          const gradient = getConsistentGradient(username);
          const initials = getInitials(fullName);
          
          return `
              <div class="user-avatar-gradient" style="
                  width: 100%;
                  height: 100%;
                  border-radius: 50%;
                  background: ${gradient};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: 700;
                  font-size: 16px;
                  text-transform: uppercase;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
              ">
                  ${initials}
              </div>
          `;
      }
      
      function getInitials(fullName) {
          if (!fullName) return 'U';
          
          const names = fullName.trim().split(' ');
          if (names.length >= 2) {
              return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
          } else if (names.length === 1) {
              return names[0].charAt(0).toUpperCase();
          }
          return 'U';
      }
      
      async function makeRequest(url, options = {}) {
          try {
              // Only add Content-Type for requests with body to avoid preflight
              const headers = {};
              
              // Only add Authorization if we have a token
              if (authToken) {
                  headers['Authorization'] = `Bearer ${authToken}`;
              }
              
              // Only add Content-Type for POST/PUT/PATCH requests with body
              if (options.body && ['POST', 'PUT', 'PATCH'].includes(options.method?.toUpperCase())) {
                  headers['Content-Type'] = 'application/json';
              }
              
              // Merge with any additional headers from options
              Object.assign(headers, options.headers || {});
              
              const response = await fetch(API_BASE + url, {
                  ...options,
                  headers
              });
      
              if (!response.ok) {
                  // Handle authentication errors
                  if (response.status === 401 || response.status === 422) {
                      localStorage.removeItem('authToken');
                      localStorage.removeItem('currentUser');
                      // Don't redirect, just clear the data and continue
                      return null;
                  }
                  const data = await response.json();
                  throw new Error(data.msg || `HTTP error! status: ${response.status}`);
              }
      
              return await response.json();
          } catch (error) {
              console.error('Request failed:', error);
              throw error;
          }
      }
      
      // Simple GET request function that avoids preflight
      async function makeSimpleRequest(url) {
          try {
              const response = await fetch(API_BASE + url);
              
              if (!response.ok) {
                  return null;
              }
              
              return await response.json();
          } catch (error) {
              console.error('Simple request failed:', error);
              return null;
          }
      }
      
      // Special request function for authenticated endpoints that handles CORS properly
      async function makeAuthenticatedRequest(url) {
          try {
              // For authenticated requests, we need to handle the preflight properly
              const response = await fetch(API_BASE + url, {
                  method: 'GET',
                  headers: {
                      'Authorization': `Bearer ${authToken}`
                  }
              });
              
              if (!response.ok) {
                  // Handle authentication errors
                  if (response.status === 401 || response.status === 422) {
                      localStorage.removeItem('authToken');
                      localStorage.removeItem('currentUser');
                      // Don't redirect, just clear the data and continue
                      return null;
                  }
                  throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              return await response.json();
          } catch (error) {
              console.error('Authenticated request failed:', error);
              // If it's a CORS error, try to provide a better error message
              if (error.message.includes('Failed to fetch') || error.message.includes('Load failed')) {
                  throw new Error('CORS error: The server does not allow cross-origin requests for this endpoint. Please contact the administrator.');
              }
              throw error;
          }
      }
      
      // Function to create and display loading cards
      function showLoadingCards(count = null) {
          const grid = component.shadowRoot.getElementById ('documentsGrid');
          if (!grid) {
              console.error('❌ Grid element not found!');
              return;
          }
          
          // Remove no-results-state class when showing loading cards
          grid.classList.remove('no-results-state');
          
          // Always add loading class to grid to show existing loading cards
          grid.classList.add('loading');
          
          // Check if there are already loading cards from HTML - if so, just return
          const existingLoadingCards = grid.querySelectorAll('.loading-card');
          if (existingLoadingCards.length > 0) {
              // Ensure the loading cards are visible by adding the loading class
              console.log('📱 Loading cards already exist, ensuring they are visible...');
              return;
          }
          
          grid.innerHTML = '';
          
          // Calculate the number of loading cards based on actual grid columns
          let loadingCardCount = count;
          if (loadingCardCount === null) {
              // Get the actual computed grid columns from CSS
              const computedStyle = window.getComputedStyle(grid);
              const gridTemplateColumns = computedStyle.getPropertyValue('grid-template-columns');
              
              // Count the number of columns by counting the number of '1fr' or similar values
              const columnCount = gridTemplateColumns.split(' ').length;
              
              console.log(`📱 Grid template columns: "${gridTemplateColumns}" (${columnCount} columns)`);
              
              // Use the actual column count for the first row
              loadingCardCount = columnCount;
          }
          
          console.log(`📱 Creating ${loadingCardCount} loading cards for screen width ${window.innerWidth}px`);
          
          // Add loading cards directly to the grid (no separate container)
          for (let i = 0; i < loadingCardCount; i++) {
              const loadingCard = document.createElement('div');
              loadingCard.className = 'document-card loading-card';
              loadingCard.style.animationDelay = `${i * 0.1}s`;
              
              loadingCard.innerHTML = `
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
              
              grid.appendChild(loadingCard);
          }
          
          // Debug position after showing loading cards
          setTimeout(() => debugPensatoTextPosition(), 100);
          
          // Add resize listener to update loading cards when screen size changes
          // Make this instance-specific to prevent conflicts between multiple components
          if (!component.loadingCardsResizeListener) {
              component.loadingCardsResizeListener = debounce(() => {
                  const grid = component.shadowRoot.getElementById ('documentsGrid');
                  if (grid && grid.classList.contains('loading')) {
                      console.log(`📱 [${component.instanceId}] Screen resized, updating loading cards...`);
                      showLoadingCards(); // Recalculate and update loading cards
                  }
              }, 250); // Debounce resize events
              
              // Add to instance-specific event listeners for proper cleanup
              component.addGlobalEventListener(window, 'resize', component.loadingCardsResizeListener);
          }
      }
      
      
      
      async function loadAllFiles() {
          try {
              // 🚀 DEVELOPMENT MODE: Check if we should bypass backend
              if (DEV_MODE_NO_RESULTS) {
                  console.log('🚀 DEV MODE: Bypassing backend, showing no results');
                  showStatus('Modalità sviluppo: Nessun risultato');
                  currentFiles = [];
                  originalFiles = [];
                  renderDocuments([]);
                  return;
              }
              
              showStatus('Caricamento vetrine... 📚');
              
              // Use authenticated or simple request based on auth
              let vetrineResponse;
              if (authToken) {
                  vetrineResponse = await makeAuthenticatedRequest('/vetrine');
              } else {
                  vetrineResponse = await makeSimpleRequest('/vetrine');
              }
              if (!vetrineResponse) {
                  throw new Error('Failed to fetch vetrine');
              }
              
              component.componentState.currentVetrine = vetrineResponse.vetrine || [];
              currentVetrine = component.componentState.currentVetrine;
              
              // Transform vetrine into card items using ONLY vetrina metadata
              const allFiles = [];
              
              for (const vetrina of currentVetrine) {
                  
                  // 🚀 NEW: Use ONLY backend-provided vetrina data - no file metadata needed!
                  const fileCount = vetrina.file_count || 1;
                  const totalPrice = vetrina.price || 0;
                  const actualTags = vetrina.tags || [];
                  
                  // 🚀 NEW: Use backend-provided document types if available, otherwise use generic
                  let documentTypes = [];
                  if (vetrina.document_types && Array.isArray(vetrina.document_types)) {
                      documentTypes = vetrina.document_types;
                  } else {
                      // Fallback: use generic document type based on file count
                      documentTypes = fileCount > 1 ? ['BUNDLE'] : ['Documento'];
                  }
                  
      
                  
                  // Create a card item using ONLY vetrina metadata
                  const vetrineCard = {
                      id: vetrina.id || vetrina.vetrina_id,
                      isVetrina: true,
                      filesLoaded: false, // Mark as NOT loaded - actual files will be loaded on demand
                      fileCount: fileCount, // 🚀 Use backend-provided file_count
                      files: [], // Empty array - actual files will be loaded on demand
                      // Use vetrina info for the card
                      filename: 'Vetrina', // Generic name until files are loaded
                      title: vetrina.name || 'Vetrina Senza Nome',
                      description: vetrina.description || 'No description available',
                      price: totalPrice, // 🚀 Use backend-provided price
                      created_at: vetrina.created_at,
                      // download_count removed - no longer needed
                      rating: vetrina.average_rating || 0, // 🚀 Use backend rating data
                      review_count: vetrina.reviews_count || 0, // 🚀 Use backend review count
                      course_name: vetrina.course_instance?.course_name || extractCourseFromVetrina(vetrina.name),
                      faculty_name: vetrina.course_instance?.faculty_name || extractFacultyFromVetrina(vetrina.name),
                      language: vetrina.course_instance?.language || 'Italiano',
                      canale: vetrina.course_instance?.canale || 'A',
                      course_semester: vetrina.course_instance?.course_semester || 'Primo Semestre',
                      academic_year: `${vetrina.course_instance?.date_year || 2024}/${(vetrina.course_instance?.date_year || 2024) + 1}`,
                      document_types: documentTypes,
                      document_type: fileCount > 1 ? 'BUNDLE' : (documentTypes.length > 0 ? documentTypes[0] : 'Documento'),
                      author_username: vetrina.author?.username || vetrina.owner?.username || 'Unknown',
                      owned: vetrina.owned || false, // 🚀 Use backend-provided ownership status
                      favorite: vetrina.favorite === true,
                      tags: actualTags, // Use the backend-provided tags
                      primary_tag: actualTags.length > 0 ? actualTags[0] : null, // Use first actual tag
                      vetrina_info: {
                          id: vetrina.id || vetrina.vetrina_id,
                          name: vetrina.name,
                          description: vetrina.description,
                          course_instance_id: vetrina.course_instance?.instance_id,
                          owner_id: vetrina.author?.user_id || vetrina.owner?.id,
                          owner_username: vetrina.author?.username || vetrina.owner?.username || 'Unknown'
                      }
                  };
                  
                  allFiles.push(vetrineCard);
              }
              
              component.componentState.currentFiles = allFiles;
              component.componentState.originalFiles = [...allFiles]; // Keep original copy
              currentFiles = component.componentState.currentFiles;
              originalFiles = component.componentState.originalFiles;
              renderDocuments(currentFiles);
              populateFilterOptions();
              showStatus(`${allFiles.length} vetrine caricate con successo! 🎉`);
              
          } catch (error) {
              console.error('Error loading vetrine:', error);
              // Show empty state without error message for guests
              currentFiles = [];
              originalFiles = [];
              renderDocuments([]);
              showStatus('Nessuna vetrina disponibile');
          } finally {
              // Ensure loading class is removed even if there's an error
              const grid = component.shadowRoot.getElementById ('documentsGrid');
              if (grid) {
                  grid.classList.remove('loading');
              }
          }
      }
      
      // Helper function to extract course name from vetrina name
      function extractCourseFromVetrina(vetrinaName) {
          const courseMap = {
              'Mathematics': 'Analisi Matematica I',
              'Computer Science': 'Algoritmi e Strutture Dati',
              'Physics': 'Fisica Generale I',
              'Chemistry': 'Chimica Organica',
              'Engineering': 'Progettazione Meccanica',
              'Business': 'Economia Aziendale'
          };
          
          for (const [key, course] of Object.entries(courseMap)) {
              if (vetrinaName.toLowerCase().includes(key.toLowerCase())) {
                  return course;
              }
          }
          return 'Corso Generale';
      }
      
      // Helper function to extract faculty from vetrina name  
      function extractFacultyFromVetrina(vetrinaName) {
          const facultyMap = {
              'Mathematics': 'Scienze Matematiche',
              'Computer Science': 'Ingegneria Informatica',
              'Physics': 'Scienze Fisiche',
              'Chemistry': 'Scienze Chimiche',
              'Engineering': 'Ingegneria Meccanica',
              'Business': 'Economia e Commercio'
          };
          
          for (const [key, faculty] of Object.entries(facultyMap)) {
              if (vetrinaName.toLowerCase().includes(key.toLowerCase())) {
                  return faculty;
              }
          }
          return 'Facoltà Generale';
      }
      
      // Helper function to extract tags from vetrina metadata
      function extractTagsFromVetrina(vetrina) {
          // If vetrina has tags from backend, use them; otherwise return empty array
          const tags = vetrina.tags || [];
          return tags;
      }
      
      // Helper function to extract primary tag from vetrina metadata
      function extractPrimaryTagFromVetrina(vetrina) {
          const tags = extractTagsFromVetrina(vetrina);
          return tags.length > 0 ? tags[0] : null;
      }
      
      // Function to load valid tags from backend
      async function loadValidTags() {
          try {
              const response = await makeSimpleRequest('/tags');
              if (response && response.tags) {
                  component.allTags = response.tags;
              }
          } catch (error) {
              // Keep default tags: ['appunti', 'dispense', 'esercizi']
          }
      }
      
      // Function to update document card tags in the UI
      function updateDocumentCardTags(vetrinaId, tags) {
          const card = component.shadowRoot.querySelector(`[data-vetrina-id="${vetrinaId}"]`);
          if (!card) return;
          
          const badgesContainer = card.querySelector('.document-type-badges');
          if (!badgesContainer) return;
          
          // Update the badges with the new tags
          if (tags && tags.length > 0) {
              if (tags.length === 1) {
                  badgesContainer.innerHTML = `<div class="document-type-badge">${getTagDisplayName(tags[0])}</div>`;
              } else {
                  badgesContainer.innerHTML = `<div class="document-type-badge">${getTagDisplayName(tags[0])}</div><div class="document-type-badge more-types">+${tags.length - 1}</div>`;
              }
          } else {
              badgesContainer.innerHTML = '<div class="document-type-badge">Documento</div>';
          }
      }
      
      // Helper function to get file type from filename
      function getFileTypeFromFilename(filename) {
          const extension = filename.split('.').pop()?.toLowerCase();
          const typeMap = {
              'pdf': 'PDF',
              'docx': 'DOCX', 
              'doc': 'DOC',
              'pptx': 'PPTX',
              'ppt': 'PPT',
              'xlsx': 'XLSX',
              'xls': 'XLS',
              'dwg': 'DWG',
              'txt': 'TXT'
          };
          return typeMap[extension] || 'FILE';
      }
      
      // Function to fetch files for a specific vetrina on demand
      async function loadVetrinaFiles(vetrinaId) {
          try {
              // Always fetch fresh data from the redacted endpoint
              const filesResponse = await makeAuthenticatedRequest(`/vetrine/${vetrinaId}/files`);
              const realFiles = filesResponse?.files || [];
              
              if (realFiles.length === 0) {
                  return null;
              }
              
              // Calculate totals for the vetrina using REAL data
              const totalSize = realFiles.reduce((sum, file) => sum + (file.size || 0), 0);
              const totalPrice = realFiles.reduce((sum, file) => sum + (file.price || 0), 0);
              
              // Get all unique tags from all files in the vetrina
              const fileTags = realFiles.map(file => file.tag).filter(tag => tag !== null);
              const allTags = Array.from(new Set([...fileTags]));
              
              // Return processed file data
              return {
                  files: realFiles.map(file => ({
                      id: file.file_id,
                      filename: file.filename,
                      title: file.original_filename || file.filename,
                      size: file.size || 0,
                      price: file.price || 0,
                      document_type: getFileTypeFromFilename(file.filename),
                      created_at: file.created_at,
                      owned: file.owned || false,
                      tag: file.tag || null
                  })),
                  fileCount: realFiles.length,
                  totalSize: totalSize,
                  totalPrice: totalPrice,
                  // totalDownloads removed - no longer needed
                  documentTypes: Array.from(new Set(realFiles.map(file => getFileTypeFromFilename(file.filename)))),
                  tags: allTags,
                  primaryTag: allTags.length > 0 ? allTags[0] : null,
                  owned: realFiles.every(file => file.owned)
              };
              
          } catch (error) {
              console.error(`Error loading files for vetrina ${vetrinaId}:`, error);
              return null;
          }
      }
      
      function getDocumentPreviewIcon(filename) {
          const extension = filename.split('.').pop()?.toLowerCase();
          const iconMap = {
              'pdf': '📄',
              'docx': '📝', 
              'doc': '📝',
              'pptx': '📊',
              'ppt': '📊',
              'xlsx': '📊',
              'xls': '📊',
              'dwg': '📐',
              'txt': '📃',
              'jpg': '🖼️',
              'jpeg': '🖼️',
              'png': '🖼️',
              'gif': '🖼️'
          };
          return iconMap[extension] || '📄';
      }
      
      function getDocumentCategory(title, description) {
          const content = (title + ' ' + description).toLowerCase();
          
          // Define keywords for each document type
          const categories = {
              'Esercizi': ['esercizi', 'exercise', 'problema', 'problem', 'quiz', 'test', 'verifica', 'compito', 'prova'],
              'Appunti': ['appunti', 'notes', 'lezione', 'lecture', 'corso', 'class', 'note'],
              'Dispense': ['dispense', 'dispensa', 'handout', 'materiale', 'material', 'guida', 'guide'],
              'Formulari': ['formulario', 'formule', 'formula', 'riassunto', 'summary', 'cheat sheet'],
              'Progetti': ['progetto', 'project', 'tesi', 'thesis', 'elaborato', 'relazione', 'report'],
              'Slide': ['slide', 'slides', 'presentazione', 'presentation', 'powerpoint', 'ppt'],
              'Libro': ['libro', 'book', 'manuale', 'manual', 'testo', 'textbook'],
              'Laboratorio': ['laboratorio', 'lab', 'pratica', 'practice', 'esperimento', 'experiment']
          };
          
          // Check each category for keyword matches
          for (const [category, keywords] of Object.entries(categories)) {
              for (const keyword of keywords) {
                  if (content.includes(keyword)) {
                      return category;
                  }
              }
          }
          
          // Default fallback
          return 'Documento';
      }
      
      // Helper function to get tag icon
      function getTagIcon(tag) {
          const tagIcons = {
              'appunti': '📝',
              'dispense': '📄',
              'esercizi': '🎯'
          };
          return tagIcons[tag] || '🏷️';
      }
      
      // Helper function to get tag display name
      function getTagDisplayName(tag) {
          const tagNames = {
              'appunti': 'Appunti',
              'dispense': 'Dispense',
              'esercizi': 'Esercizi'
          };
          return tagNames[tag] || tag;
      }
      
      // Helper function to format canale display
      function formatCanaleDisplay(canale) {
          if (canale === "0" || canale === 0 || canale === "Canale Unico") {
              return "Unico";
          }
          return canale;
      }
      
      function createMockDocuments() {
          return [
              {
                  id: 'mock-1',
                  title: 'Analisi Matematica I - Appunti',
                  description: 'Appunti completi del corso di Analisi Matematica I con esempi e dimostrazioni',
                  document_type: 'PDF',
                  faculty_name: 'Ingegneria',
                  course_name: 'Analisi Matematica',
                  pages: 150,
                  tags: ['Matematica', 'Limiti', 'Derivate'],
                  average_rating: 4.5,
                  review_count: 23,
                  created_at: '2024-01-15',
                  vetrina_info: {
                      faculty_name: 'Ingegneria',
                      course_name: 'Analisi Matematica',
                      average_rating: 4.5,
                      review_count: 23
                  }
              },
              {
                  id: 'mock-2',
                  title: 'Programmazione Java - Esercizi',
                  description: 'Raccolta di esercizi risolti di programmazione Java per principianti',
                  document_type: 'DOCX',
                  faculty_name: 'Ingegneria',
                  course_name: 'Programmazione',
                  pages: 89,
                  tags: ['Programmazione', 'Java', 'Esercizi'],
                  average_rating: 4.8,
                  review_count: 31,
                  created_at: '2024-01-20',
                  vetrina_info: {
                      faculty_name: 'Ingegneria',
                      course_name: 'Programmazione',
                      average_rating: 4.8,
                      review_count: 31
                  }
              },
              {
                  id: 'mock-3',
                  title: 'Microeconomia - Teoria e Pratica',
                  description: 'Manuale di microeconomia con teoria, grafici e casi pratici',
                  document_type: 'PDF',
                  faculty_name: 'Economia',
                  course_name: 'Microeconomia',
                  pages: 210,
                  tags: ['Economia', 'Mercato', 'Domanda'],
                  average_rating: 4.2,
                  review_count: 18,
                  created_at: '2024-01-25',
                  vetrina_info: {
                      faculty_name: 'Economia',
                      course_name: 'Microeconomia',
                      average_rating: 4.2,
                      review_count: 18
                  }
              },
              {
                  id: 'mock-4',
                  title: 'Anatomia Umana - Atlante',
                  description: 'Atlante illustrato di anatomia umana con immagini dettagliate',
                  document_type: 'PDF',
                  faculty_name: 'Medicina',
                  course_name: 'Anatomia',
                  pages: 320,
                  tags: ['Anatomia', 'Medicina', 'Biologia'],
                  average_rating: 4.9,
                  review_count: 42,
                  created_at: '2024-01-30',
                  vetrina_info: {
                      faculty_name: 'Medicina',
                      course_name: 'Anatomia',
                      average_rating: 4.9,
                      review_count: 42
                  }
              }
          ];
      }
      
      function renderDocumentsWrapper(files) {
          // Delegate to instance method to prevent conflicts between components
          return component.renderDocuments(files);
      }
      
      function renderDocuments_OLD(files) {
          const grid = DOM_CACHE.get('documentsGrid');
          if (!grid) {
              console.error('Documents grid not found');
              return;
          }
          
          // Add demo data when no files are available (for testing/demo)
          if (!files || files.length === 0) {
              // Check if we're in a test environment (no real API data)
              if (!originalFiles || originalFiles.length === 0) {
                  console.log('🔧 No documents available, using mock documents for demo');
                  files = createMockDocuments();
              }
          }
          
          // Remove loading class when rendering real content
          grid.classList.remove('loading');
          
          // Remove any existing no-results overlay when rendering documents
          const existingNoResults = grid.querySelector('.no-results');
          if (existingNoResults) {
              existingNoResults.remove();
          }
          
          // Update search section layout based on results
          const searchSection = DOM_CACHE.get('searchSection');
          if (searchSection) {
              if (!files || files.length === 0) {
                  searchSection.classList.remove('has-results');
              } else {
                  searchSection.classList.add('has-results');
              }
          }
          
          // Update document count display
          const documentCountContainer = DOM_CACHE.get('documentCountContainer');
          const documentCount = DOM_CACHE.get('documentCount');
          
          if (documentCountContainer && documentCount) {
              const count = files ? files.length : 0;
              const documentText = count === 1 ? 'DOCUMENTO TROVATO' : 'DOCUMENTI TROVATI';
              documentCount.textContent = `${count} ${documentText}`;
              documentCountContainer.style.display = 'block';
              // Update active filters display
              updateActiveFiltersDisplay();
          }
          
          if (!files || files.length === 0) {
              // Add no-results-state class to the grid to trigger CSS display
              grid.classList.add('no-results-state');
              
              // Ensure only one row of loading cards is shown in no-results state
              const existingLoadingCards = grid.querySelectorAll('.loading-card');
              
              // Cache computed style to avoid repeated calculations
              if (!grid._cachedColumnCount || grid._lastWindowWidth !== window.innerWidth) {
                  const computedStyle = window.getComputedStyle(grid);
                  const gridTemplateColumns = computedStyle.getPropertyValue('grid-template-columns');
                  grid._cachedColumnCount = gridTemplateColumns.split(' ').length;
                  grid._lastWindowWidth = window.innerWidth;
              }
              const columnCount = grid._cachedColumnCount;
              
              console.log(`📱 No results: Ensuring only ${columnCount} loading cards (one row)`);
              
              // Remove excess loading cards beyond the first row
              existingLoadingCards.forEach((card, index) => {
                  if (index >= columnCount) {
                      card.remove();
                  }
              });
              
              // Remove any existing no-results element first
              const existingNoResults = grid.querySelector('.no-results');
              if (existingNoResults) {
                  existingNoResults.remove();
              }
              
              // Create no-results overlay that appears over the invisible loading cards
              const noResults = document.createElement('div');
              noResults.className = 'no-results';
              noResults.innerHTML = `
                  <span class="material-symbols-outlined">search_off</span>
                  <h3>Nessun risultato trovato</h3>
                  <p>Non abbiamo trovato documenti che corrispondano ai tuoi criteri di ricerca. Prova a modificare i filtri o utilizzare termini di ricerca diversi.</p>
              `;
              
              // Insert the no-results overlay as the first child so it appears on top
              grid.insertBefore(noResults, grid.firstChild);
              
              return;
          }
          
          // Remove no-results-state class when we have results
          grid.classList.remove('no-results-state');
          
          // Clear the grid only when we have results to show
          grid.innerHTML = '';
      
          // Use DocumentFragment for efficient DOM manipulation
          const fragment = document.createDocumentFragment();
      
          files.forEach((item, index) => {
              const card = document.createElement('div');
              card.className = 'document-card';
              card.dataset.id = item.id;
              // Always use the vetrina ID, whether it's a single file or a collection
              card.setAttribute('data-vetrina-id', item.vetrina_id || item.id);
              card.style.animationDelay = `${index * 0.1}s`;
              
              // Make the entire card clickable
              card.style.cursor = 'pointer';
              card.onclick = async (e) => {
                  // Don't trigger if clicking on interactive elements
                  if (e.target.closest('.favorite-button') || e.target.closest('.chunks-button') || e.target.closest('.owner-avatar') || e.target.closest('.rating-badge') || e.target.closest('.add-to-cart-btn') || e.target.closest('.price-cart-container')) {
                      return;
                  }
                  
                  // Mark that we're navigating to another page
                  component.setSessionItem('navigating', 'true');
                  
                  // Navigate to document preview page instead of opening overlay
                  window.location.href = `document-preview.html?id=${item.id}`;
              };
      
              const documentType = item.document_type || 'Documento';
              const documentTitle = item.title || 'Documento Senza Titolo';
              const rating = parseFloat(item.rating) || 0;
              const reviewCount = parseInt(item.review_count) || 0;
              const description = item.description || 'Nessuna descrizione disponibile';
              const price = parseFloat(item.price) || 0;
              
              const stars = generateFractionalStars(rating);
              const documentCategory = getDocumentCategory(documentTitle, description);
              
              // Determine if this is a multi-file vetrina and if files have been loaded
              const isMultiFile = item.isVetrina && item.fileCount > 1;
              const filesLoaded = item.filesLoaded;
              const fileStackClass = isMultiFile ? 'file-stack' : '';
              const stackCountBadge = isMultiFile ? `<div class="file-count-badge">${item.fileCount}</div>` : '';
              
              // Generate preview based on whether files have been loaded
              let previewContent;
              if (item.isVetrina && !filesLoaded) {
                  // Show placeholder for vetrina that hasn't been loaded yet
                  previewContent = `
                      <div class="preview-icon">
                          <span class="document-icon">📁</span>
                          <div class="file-extension">VETRINA</div>
                      </div>
                  `;
              } else if (isMultiFile && filesLoaded) {
                  // Show professional file stack with uniform grid on hover
                  const fileCount = item.fileCount;
                  const files = item.files || [];
                  
                  // Safety check: ensure we have files to display
                  if (files.length === 0) {
                      previewContent = `
                          <div class="preview-icon">
                              <span class="document-icon">📁</span>
                              <div class="file-extension">VETRINA</div>
                          </div>
                      `;
                  } else {
                      // Generate dynamic stack layers based on file count
                      let stackLayers = '';
                      if (fileCount === 2 && files.length >= 2) {
                          stackLayers = `
                              <div class="stack-layer stack-back">
                                  <span class="document-icon">${getDocumentPreviewIcon(files[1].filename)}</span>
                                  <div class="file-extension">${files[1].document_type}</div>
                              </div>
                              <div class="stack-layer stack-front">
                                  <span class="document-icon">${getDocumentPreviewIcon(files[0].filename)}</span>
                                  <div class="file-extension">${files[0].document_type}</div>
                              </div>
                          `;
                  } else if (fileCount === 3) {
                      stackLayers = `
                          <div class="stack-layer stack-back">
                              <span class="document-icon">${getDocumentPreviewIcon(files[2].filename)}</span>
                              <div class="file-extension">${files[2].document_type}</div>
                          </div>
                          <div class="stack-layer stack-middle">
                              <span class="document-icon">${getDocumentPreviewIcon(files[1].filename)}</span>
                              <div class="file-extension">${files[1].document_type}</div>
                          </div>
                          <div class="stack-layer stack-front">
                              <span class="document-icon">${getDocumentPreviewIcon(files[0].filename)}</span>
                              <div class="file-extension">${files[0].document_type}</div>
                          </div>
                      `;
                  } else {
                      // For 4+ files, show first 3 files in stack
                      const filesToShow = files.slice(0, 3);
                      stackLayers = `
                          <div class="stack-layer stack-back">
                              <span class="document-icon">${getDocumentPreviewIcon(filesToShow[2].filename)}</span>
                              <div class="file-extension">${filesToShow[2].document_type}</div>
                          </div>
                          <div class="stack-layer stack-middle">
                              <span class="document-icon">${getDocumentPreviewIcon(filesToShow[1].filename)}</span>
                              <div class="file-extension">${filesToShow[1].document_type}</div>
                          </div>
                          <div class="stack-layer stack-front">
                              <span class="document-icon">${getDocumentPreviewIcon(filesToShow[0].filename)}</span>
                              <div class="file-extension">${filesToShow[0].document_type}</div>
                          </div>
                      `;
                  }
                  
                  previewContent = `
                      <div class="preview-icon ${fileStackClass}" data-file-count="${fileCount}">
                          <div class="file-stack-container">
                              ${stackLayers}
                              ${stackCountBadge}
                          </div>
                      </div>
                  `;
                  }
              } else {
                  // Single file preview or loaded vetrina
                  let filename;
                  if (item.isVetrina && filesLoaded && item.files && item.files.length > 0) {
                      filename = item.files[0].filename;
                  } else {
                      filename = item.filename;
                  }
                  previewContent = `
                      <div class="preview-icon">
                          <span class="document-icon">${getDocumentPreviewIcon(filename)}</span>
                          <div class="file-extension">${documentType}</div>
                      </div>
                  `;
              }
              
      
              // Update the favorite button to include the initial state from the API
              const isFavorited = item.favorite === true;
              card.innerHTML = `
                  <div class="document-preview">
                      ${previewContent}
                      ${item.hasSemanticResults ? `
                          <button class="chunks-button" title="Visualizza ${item.semanticChunks.length} risultati semantici trovati">
                              <span class="material-symbols-outlined">psychology</span>
                              <span class="chunks-count">${item.semanticChunks.length}</span>
                          </button>
                      ` : ''}
                      <div class="document-type-badges">
                          ${(() => {
                              // Use actual file tags (already fetched in loadAllFiles)
                              if (item.tags && item.tags.length > 0) {
                                  if (item.tags.length === 1) {
                                      return `<div class="document-type-badge">${getTagDisplayName(item.tags[0])}</div>`;
                                  } else {
                                      return `<div class="document-type-badge">${getTagDisplayName(item.tags[0])}</div><div class="document-type-badge more-types">+${item.tags.length - 1}</div>`;
                                  }
                              }
                              
                              return '<div class="document-type-badge">Documento</div>';
                          })()}
                      </div>
                      <div class="rating-badge" data-action="open-reviews" data-vetrina-id="${item.id}" data-rating="${rating}" data-review-count="${reviewCount}" title="Mostra recensioni" style="cursor: pointer;">
                          <div class="rating-stars">${stars}</div>
                          <span class="rating-count">(${reviewCount})</span>
                      </div>
                  </div>
                  
                  <button class="favorite-button ${isFavorited ? 'active' : ''}" 
                          data-action="toggle-favorite" 
                          title="${isFavorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}">
                      <span class="material-symbols-outlined">favorite</span>
                  </button>
                  
                  <div class="document-content">
                      <div class="document-header">
                          <div class="document-title-section">
                              <h3 class="document-title" title="${documentTitle}">${documentTitle}</h3>
                              <div class="document-description" title="${description}">${description}</div>
                          </div>
                      </div>
                      <div class="document-info">
                          <div class="document-info-item" title="Facoltà: ${item.faculty_name || 'N/A'}">
                              <span class="info-icon">account_balance</span>
                              <span class="info-text">${item.faculty_name || 'N/A'}</span>
                          </div>
                          <div class="document-info-item" title="Corso: ${item.course_name || 'N/A'}">
                              <span class="info-icon">menu_book</span>
                              <span class="info-text">${item.course_name || 'N/A'}</span>
                          </div>
                          <div class="document-info-item" title="Lingua: ${item.language || 'N/A'}${item.canale !== undefined && item.canale !== null ? ' - Canale: ' + formatCanaleDisplay(item.canale) : ''}">
                              <span class="info-icon">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 22q-2.05 0-3.875-.788t-3.187-2.15t-2.15-3.187T2 12q0-2.075.788-3.887t2.15-3.175t3.187-2.15T12 2q2.075 0 3.888.788t3.174 2.15t2.15 3.175T22 12q0 2.05-.788 3.875t-2.15 3.188t-3.175 2.15T12 22m0-2.05q.65-.9 1.125-1.875T13.9 16h-3.8q.3 1.1.775 2.075T12 19.95m-2.6-.4q-.45-.825-.787-1.713T8.05 16H5.1q.725 1.25 1.813 2.175T9.4 19.55m5.2 0q1.4-.45 2.488-1.375T18.9 16h-2.95q-.225.95-.562 1.838T14.6 19.55M4.25 14h3.4q-.075-.5-.112-.987T7.5 12t.038-1.012T7.65 10h-3.4q-.125.5-.187.988T4 12t.063 1.013t.187.987m5.4 0h4.7q.075-.5.113-.987T14.5 12t-.038-1.012T14.35 10h-4.7q-.075.5-.112.988T9.5 12t.038 1.013t.112.987m6.7 0h3.4q.125-.5.188-.987T20 12t-.062-1.012T19.75 10h-3.4q.075.5.113.988T16.5 12t-.038 1.013t-.112.987m-.4-6h2.95q-.725-1.25-1.812-2.175T14.6 4.45q.45.825.788 1.713T15.95 8M10.1 8h3.8q-.3-1.1-.775-2.075T12 4.05q-.65.9-1.125 1.875T10.1 8m-5 0h2.95q.225-.95.563-1.838T9.4 4.45Q8 4.9 6.912 5.825T5.1 8"/></svg>
                              </span>
                              <span class="info-text">${item.language || 'N/A'}${item.canale !== undefined && item.canale !== null ? ' - Canale ' + formatCanaleDisplay(item.canale) : ''}</span>
                          </div>
                          <div class="document-info-item" title="Anno Accademico: ${item.academic_year || 'N/A'}">
                              <span class="info-icon">calendar_today</span>
                              <span class="info-text">${item.academic_year || 'N/A'}</span>
                          </div>
                      </div>
                      
                      ${item.hasSemanticResults ? `
                      <div class="semantic-results">
                          <div class="semantic-results-header">
                              <span class="material-symbols-outlined">psychology</span>
                              <span>Risultati semantici</span>
                          </div>
                          <div class="semantic-chunks">
                              ${item.semanticChunks.slice(0, 3).map(chunk => `
                                  <div class="semantic-chunk">
                                      <div class="chunk-description">${chunk.chunk_description || chunk.description || 'N/A'}</div>
                                      <div class="chunk-meta">
                                          <span class="chunk-page">Pagina ${chunk.page_number || 'N/A'}</span>
                                      </div>
                                  </div>
                              `).join('')}
                              ${item.semanticChunks.length > 3 ? `
                                  <div class="semantic-chunk-more">
                                      <span class="material-symbols-outlined">more_horiz</span>
                                      <span>+${item.semanticChunks.length - 3} altri risultati</span>
                                  </div>
                              ` : ''}
                          </div>
                      </div>
                      ` : ''}
                      <div class="document-footer">
                          <div class="document-footer-left">
                              <div class="owner-avatar" title="Caricato da ${item.author_username || 'Unknown'}" data-action="navigate" data-url="vendor-page.html?user=${encodeURIComponent(item.author_username || 'Unknown')}" style="
                                  background: ${getConsistentGradient(item.author_username || 'Unknown')};
                                  color: white;
                                  font-weight: 700;
                                  font-size: 12px;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
                                  border: 1.5px solid var(--white);
                              ">
                                  ${getInitials(item.author_username || 'Unknown')}
                              </div>
                              <div class="document-meta">
                                  ${item.isVetrina && !filesLoaded ? 'Click to view' : formatFileSize(item.size || 0)}
                              </div>
                          </div>
                          <div class="document-footer-right">
                              ${price > 0 ? `
                                  <div class="price-cart-container">
                                      <div class="document-price paid" title="Prezzo: ${formatPrice(price)}">
                                          ${formatPrice(price)}
                                      </div>
                                      <button class="add-to-cart-btn" data-action="add-to-cart" data-doc-id="${item.id}" title="Aggiungi al carrello">
                                          <span class="material-symbols-outlined">add_shopping_cart</span>
                                      </button>
                                  </div>
                              ` : `
                                  <div class="document-price free" title="Documento gratuito">
                                      ${formatPrice(price)}
                                  </div>
                              `}
                          </div>
                      </div>
                  </div>
              `;
              
              // Add event handler for chunks button
              if (item.hasSemanticResults) {
                  card.querySelector('.chunks-button').addEventListener('click', (e) => {
                      e.stopPropagation();
                      openChunksOverlay(item);
                  });
              }
      
              fragment.appendChild(card);
          });
      
          // Append all cards to grid at once for better performance
          grid.appendChild(fragment);
      
          // Animate document cards into view
          setTimeout(() => {
              const cards = component.shadowRoot.querySelectorAll('.document-card');
              cards.forEach((card, index) => {
                  card.style.opacity = '1';
                  card.style.transform = 'translateY(0)';
              });
          }, 100);
      }
      
      
      function generateStars(rating) {
          let stars = '';
          for (let i = 1; i <= 5; i++) {
              if (i <= rating) {
                  stars += '<span class="rating-star filled">★</span>';
              } else {
                  stars += '<span class="rating-star">★</span>';
              }
          }
          return stars;
      }
      
      function generateReviewStars(rating) {
          let stars = '';
          for (let i = 1; i <= 5; i++) {
              if (i <= rating) {
                  stars += '<span class="rating-star filled">★</span>';
              } else {
                  stars += '<span class="rating-star" style="color: #d1d5db;">★</span>';
              }
          }
          return stars;
      }
      
      function generateFractionalStars(rating) {
          const ratingPercentage = (rating / 5) * 100;
          return `
              <div class="stars-outer">
                  <div class="stars-inner" style="width: ${ratingPercentage}%"></div>
              </div>
          `;
      }
      
      function getOriginalFilename(filename) {
          // Remove UUID prefix from filename (format: uuid-userid-originalname)
          const parts = filename.split('-');
          if (parts.length >= 3) {
              // Find the last part that looks like a filename (contains a dot)
              let filenameStart = -1;
              for (let i = parts.length - 1; i >= 0; i--) {
                  if (parts[i].includes('.')) {
                      // Work backwards to find where the actual filename starts
                      if (i > 0 && parts[i-1].length <= 3 && /^\d+$/.test(parts[i-1])) {
                          filenameStart = i;
                          break;
                      }
                  }
              }
              
              if (filenameStart > 0) {
                  return parts.slice(filenameStart).join('-');
              }
              
              // Fallback: assume last 2 parts form the filename
              return parts.slice(-2).join('-');
          }
          return filename;
      }
      
      function formatFileSize(bytes) {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      }
      
      function formatPrice(price) {
          if (price === 0) return 'Gratis';
          // Handle decimal prices properly (e.g., 10.50 -> €10.50, 10.00 -> €10)
          const formattedPrice = parseFloat(price).toFixed(2);
          // Remove trailing zeros after decimal point
          const cleanPrice = formattedPrice.replace(/\.?0+$/, '');
          return `€${cleanPrice}`;
      }
      
      function formatDate(dateString) {
          return new Date(dateString).toLocaleDateString('it-IT');
      }
      
      function showStatusWrapper(message, type = 'success') {
          // Delegate to instance method to prevent conflicts between components
          return component.showStatus(message, type);
      }
      
      function showStatus_OLD(message, type = 'success') {
          const notification = document.createElement('div');
          notification.className = `status-message ${type}`;
          notification.textContent = message;
          // Use instance-specific container to prevent conflicts
          const containerId = `notification-container-${component.instanceId}`;
          let container = document.getElementById(containerId);
          if (!container) {
              container = document.createElement('div');
              container.id = containerId;
              document.body.appendChild(container);
          }
          container.appendChild(notification);
          
          setTimeout(() => notification.classList.add('show'), 100);
          
          setTimeout(() => {
              notification.classList.remove('show');
              setTimeout(() => {
                  if (notification.parentNode) {
                      notification.parentNode.removeChild(notification);
                  }
              }, 500);
          }, type === 'success' ? 3000 : 5000);
      }
      
      function showError(message) {
          showStatus(message, 'error');
      }
      
      // Favorite status is already included in vetrine data, no need for separate refresh
      
      async function toggleFavorite(button, event) {
          if (event) {
              event.stopPropagation();
          }
      
          // Get the vetrina ID from the parent card
          const card = button.closest('.document-card');
          const vetrinaId = card.getAttribute('data-vetrina-id');
          
          if (!vetrinaId) {
              showError('Errore: ID vetrina non trovato');
              return;
          }
      
          // Optimistically update UI
          const isActive = button.classList.toggle('active');
          button.setAttribute('title', isActive ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti');
      
          // Set a flag to notify other pages
          component.setSessionItem('favorites_changed', 'true');
      
          try {
              const response = await fetch(`${API_BASE}/user/favorites/vetrine/${vetrinaId}`, {
                  method: isActive ? 'POST' : 'DELETE',
                  headers: {
                      'Authorization': `Bearer ${authToken}`,
                      'Content-Type': 'application/json'
                  }
              });
      
              if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
              }
      
              if (response) {
                  // Update the favorite state in the UI based on the action
                  if (isActive) {
                      // We just added a favorite, so keep button active
                      button.classList.add('active');
                      button.title = 'Rimuovi dai Preferiti';
                      showStatus('Aggiunto ai preferiti! ❤️');
                  } else {
                      // We just removed a favorite, so keep button inactive
                      button.classList.remove('active');
                      button.title = 'Aggiungi ai Preferiti';
                      showStatus('Rimosso dai preferiti 💔');
                  }
                  
                  // Update the local data to keep it in sync
                  const vetrinaIdInt = parseInt(vetrinaId);
                  if (currentFiles) {
                      const vetrinaIndex = currentFiles.findIndex(item => 
                          (item.vetrina_id || item.id) === vetrinaIdInt
                      );
                      if (vetrinaIndex !== -1) {
                          currentFiles[vetrinaIndex].favorite = isActive; // isActive is the new state
                      }
                  }
                  if (originalFiles) {
                      const vetrinaIndex = originalFiles.findIndex(item => 
                          (item.vetrina_id || item.id) === vetrinaIdInt
                      );
                      if (vetrinaIndex !== -1) {
                          originalFiles[vetrinaIndex].favorite = isActive; // isActive is the new state
                      }
                  }
                  
                  // Mark that favorites have been changed so other pages know to refresh
                  component.setSessionItem('favorites_changed', 'true');
              }
          } catch (error) {
              console.error('Error toggling favorite:', error);
              
              // Revert the optimistic UI update
              button.classList.toggle('active'); // Toggle back to original state
              button.setAttribute('title', isActive ? 'Aggiungi ai preferiti' : 'Rimuovi dai preferiti');
              
              // Show specific error message based on error type
              if (error.message.includes('Load failed') || error.message.includes('Failed to fetch')) {
                  showError('Errore di connessione al server. Verifica la tua connessione e riprova.');
              } else if (error.message.includes('500')) {
                  showError('Errore del server. Il servizio preferiti è temporaneamente non disponibile. Riprova più tardi.');
              } else {
                  showError('Errore durante l\'aggiornamento dei preferiti. Riprova più tardi.');
              }
          }
      }
      
      async function previewDocument(fileId) {
          const file = currentFiles.find(f => f.id === fileId);
          if (!file) return;
      
          // Always load files when preview is clicked (on-demand loading)
          try {
              showStatus('Caricamento dettagli documento... 📚');
              
              // Load files for this specific vetrina using the redacted endpoint
              const fileData = await loadVetrinaFiles(file.id);
              if (fileData && fileData.files.length > 0) {
                  // Update the file object with loaded data
                  file.fileCount = fileData.fileCount;
                  file.files = fileData.files;
                  file.size = fileData.totalSize;
                  file.price = fileData.totalPrice;
                  // download_count removed - no longer needed
                  file.document_types = fileData.documentTypes;
                  file.document_type = fileData.fileCount > 1 ? 'BUNDLE' : fileData.documentTypes[0] || 'FILE';
                  file.owned = fileData.owned;
                  file.tags = fileData.tags;
                  file.primary_tag = fileData.primaryTag;
                  file.filesLoaded = true;
                  
                  // Update the filename to show actual file count
                  file.filename = fileData.fileCount > 1 ? `${fileData.fileCount} files` : fileData.files[0].filename;
                  
                  // Update the UI to show the new tags
                  updateDocumentCardTags(file.id, fileData.tags);
              } else {
                  showError('Nessun file trovato per questa vetrina.');
                  return;
              }
          } catch (error) {
              console.error(`Error loading files for vetrina ${file.id}:`, error);
              
              // Check if it's a CORS/preflight error
              if (error.message.includes('CORS error') || error.message.includes('Load failed') || error.message.includes('Failed to fetch')) {
                  showError('Errore CORS: Il server non permette richieste cross-origin per questo endpoint. Contatta l\'amministratore.');
              } else {
                  showError('Errore nel caricamento dei dettagli del documento.');
              }
              return;
          }
      
          // Use REAL database information for preview
          const documentTitle = file.title || 'Documento Senza Titolo';
          const documentType = file.document_type || 'Documento';
          const courseName = file.course_name || file.vetrina_info?.course_name || 'Corso';
          const faculty = file.faculty_name || file.vetrina_info?.faculty_name || 'Facoltà';
          const canale = formatCanaleDisplay(file.canale || file.vetrina_info?.canale || 'A');
          const academicYear = file.academic_year || '2024/2025';
          const language = file.language || 'English';
          const rating = parseFloat(file.rating) || 0;
          const reviewCount = parseInt(file.review_count) || 0;
          const price = parseFloat(file.price) || 0;
          const ownerUsername = file.vetrina_info?.owner_username || 'Unknown';
          
          const previewTitle = component.shadowRoot.getElementById ('previewTitle');
          if (previewTitle) previewTitle.textContent = documentTitle;
          
          const content = `
              <div class="document-overview">
                  <h3>📚 Panoramica Documento</h3>
                  <div class="overview-grid">
                      <div><strong>📄 Tipo:</strong> ${documentType}</div>
                      <div><strong>📊 Dimensione:</strong> ${formatFileSize(file.size)}</div>
                      <div><strong>💰 Prezzo:</strong> ${price === 0 ? 'Gratuito' : '€' + price}</div>
                      <div><strong>👤 Vetrina di:</strong> @${ownerUsername}</div>
                      <div><strong>📚 Corso:</strong> ${courseName}</div>
                      <div><strong>🏛️ Facoltà:</strong> ${faculty}</div>
                      <div><strong>📝 Canale:</strong> ${canale}</div>
                      <div><strong>🗓️ Anno Accademico:</strong> ${academicYear}</div>
                      <div><strong>🌐 Lingua:</strong> ${language}</div>
                      <div><strong>⭐ Rating:</strong> ${rating}/5 (${reviewCount} recensioni)</div>
                      <div><strong>📅 Pubblicato:</strong> ${formatDate(file.created_at)}</div>
                  </div>
              </div>
              
              <div class="document-preview-section">
                  <h3>📖 Anteprima Documento</h3>
                  <div class="preview-container">
                      <img id="modalPreviewImg-${file.id}" 
                           alt="Anteprima documento" 
                           class="full-preview"
                           style="display: none;">
                      <div id="modalPreviewLoading-${file.id}" class="preview-loading">Caricamento anteprima...</div>
                  </div>
                  <div class="preview-description">
                      <h4>📝 Descrizione</h4>
                      <p>${file.description || file.vetrina_info?.description || 'Nessuna descrizione disponibile per questo documento.'}</p>
                  </div>
                  <div class="preview-note">
                      <p><strong>ℹ️ Informazioni:</strong> 
                      ${file.owned ? 'Possiedi già questo documento. Puoi scaricarlo gratuitamente.' : 
                        price === 0 ? 'Questo documento è gratuito e può essere scaricato immediatamente.' : 
                        `Acquista questo documento per €${price} per accedere al contenuto completo.`}
                      </p>
                  </div>
              </div>
          `;
          
          const actions = file.owned ? 
              `<button class="btn primary" data-action="download-document" data-file-id="${file.id}">
                  <i class="material-symbols-outlined">download</i>
                  Scarica Documento
               </button>
               <button class="btn secondary" data-action="close-preview">
                  <i class="material-symbols-outlined">close</i>
                  Chiudi
               </button>` :
              price === 0 ?
              `<button class="btn primary" data-action="download-document" data-file-id="${file.id}">
                  <i class="material-symbols-outlined">download</i>
                  Scarica Gratis
               </button>
               <button class="btn secondary" data-action="close-preview">
                  <i class="material-symbols-outlined">close</i>
                  Chiudi
               </button>` :
              `<button class="btn primary" data-action="purchase-document" data-file-id="${file.id}">
                  <i class="material-symbols-outlined">payment</i>
                  Acquista per €${price}
               </button>
               <button class="btn secondary" data-action="close-preview">
                  <i class="material-symbols-outlined">close</i>
                  Chiudi
               </button>`;
          
          const previewBody = component.shadowRoot.getElementById ('previewBody');
          const previewActions = component.shadowRoot.getElementById ('previewActions');
          const previewModal = component.shadowRoot.getElementById ('previewModal');
          
          if (previewBody) previewBody.innerHTML = content;
          if (previewActions) previewActions.innerHTML = actions;
          if (previewModal) previewModal.classList.add('active');
          
          // Set the preview icon for the modal  
          const modalImg = component.shadowRoot.getElementById (`modalPreviewImg-${file.id}`);
          const modalLoading = component.shadowRoot.getElementById (`modalPreviewLoading-${file.id}`);
          
          if (modalLoading) {
              // Show loading state
              modalLoading.innerHTML = `
                  <div class="preview-loading">
                      <span class="material-symbols-outlined">hourglass_empty</span>
                      <p>Caricamento anteprima...</p>
                  </div>
              `;
              modalLoading.style.display = 'flex';
          }
          
          if (modalImg) {
              modalImg.style.display = 'none';
          }
          
          // Load redacted preview for the first file in the vetrina
          if (file.files && file.files.length > 0) {
              try {
                  const firstFile = file.files[0];
                  const previewResponse = await makeAuthenticatedRequest(`/files/${firstFile.id}/download/redacted`);
                  
                  if (previewResponse && previewResponse.preview_url) {
                      // Show the redacted preview
                      if (modalImg) {
                          modalImg.src = previewResponse.preview_url;
                          modalImg.style.display = 'block';
                          modalImg.onload = () => {
                              if (modalLoading) modalLoading.style.display = 'none';
                          };
                          modalImg.onerror = () => {
                              // Fallback to icon if image fails to load
                              if (modalLoading) {
                                  modalLoading.innerHTML = `
                                      <div class="preview-icon">
                                          <span class="document-icon">${getDocumentPreviewIcon(firstFile.filename)}</span>
                                          <div class="file-extension">${getFileTypeFromFilename(firstFile.filename)}</div>
                                      </div>
                                  `;
                              }
                          };
                      }
                  } else {
                      // Fallback to icon if no preview available
                      if (modalLoading) {
                          modalLoading.innerHTML = `
                              <div class="preview-icon">
                                  <span class="document-icon">${getDocumentPreviewIcon(firstFile.filename)}</span>
                                  <div class="file-extension">${getFileTypeFromFilename(firstFile.filename)}</div>
                              </div>
                          `;
                      }
                  }
              } catch (error) {
                  console.error('Error loading redacted preview:', error);
                  // Fallback to icon on error
                  if (modalLoading) {
                      modalLoading.innerHTML = `
                          <div class="preview-icon">
                              <span class="document-icon">${getDocumentPreviewIcon(file.filename)}</span>
                              <div class="file-extension">${file.document_type}</div>
                          </div>
                      `;
                  }
              }
          } else {
              // No files available, show generic icon
              if (modalLoading) {
                  modalLoading.innerHTML = `
                      <div class="preview-icon">
                          <span class="document-icon">${getDocumentPreviewIcon(file.filename)}</span>
                          <div class="file-extension">${file.document_type}</div>
                      </div>
                  `;
              }
          }
          
          showStatus('Anteprima caricata! 👁️');
      }
      
      function closePreview() {
          const previewModal = component.shadowRoot.getElementById ('previewModal');
          if (previewModal) previewModal.classList.remove('active');
      }
      
      async function downloadDocument(fileId) {
          try {
              showStatus('Download in corso... 📥');
              
              // Create a temporary form to handle the download
              const form = document.createElement('form');
              form.method = 'POST';
              form.action = `${API_BASE}/files/${fileId}/download`;
              form.target = '_blank';
              
              // Add authorization header via hidden input
              const authInput = document.createElement('input');
              authInput.type = 'hidden';
              authInput.name = 'auth_token';
              authInput.value = authToken;
              form.appendChild(authInput);
              
              // Add filename
              const filenameInput = document.createElement('input');
              filenameInput.type = 'hidden';
              filenameInput.name = 'filename';
              filenameInput.value = getOriginalFilename(currentFiles.find(f => f.id === fileId)?.filename) || 'documento';
              form.appendChild(filenameInput);
              
              // Submit the form
                        // Use instance-specific container to prevent conflicts
          const formContainerId = `form-container-${component.instanceId}`;
          let formContainer = document.getElementById(formContainerId);
          if (!formContainer) {
              formContainer = document.createElement('div');
              formContainer.id = formContainerId;
              document.body.appendChild(formContainer);
          }
          formContainer.appendChild(form);
          form.submit();
          formContainer.removeChild(form);
              
              showStatus('Download avviato! 🎉');
          } catch (error) {
              showError('Errore durante il download: ' + error.message);
          }
      }
      
      async function purchaseDocument(fileId) {
          try {
              showStatus('Elaborazione acquisto... 💳');
              await makeRequest(`/files/${fileId}/buy`, { method: 'POST' });
              showStatus('Acquisto completato! Documento sbloccato! 🎉');
              // Reload documents to update ownership status
              loadAllFiles();
          } catch (error) {
              showError('Acquisto fallito: ' + error.message);
          }
      }
      
      // Add Document to Cart
      async function addToCart(docId, event) {
          event.stopPropagation(); // Prevent card click
          
          const button = event.target.closest('.add-to-cart-btn');
          const icon = button.querySelector('.material-symbols-outlined');
          const container = button.closest('.price-cart-container');
          
          // Optimistic UI update
          button.classList.add('adding');
          icon.textContent = 'hourglass_empty';
          
          try {
              // Simulate API call (replace with actual cart API)
              await new Promise(resolve => setTimeout(resolve, 600));
              
              // Success state with enhanced animation
              button.classList.remove('adding');
              button.classList.add('added');
              icon.textContent = 'check_circle';
              
              // Add success animation to the entire container
              if (container) {
                  container.classList.add('cart-success');
              }
              
              // Show success notification
              showStatus('Documento aggiunto al carrello! 🛒', 'success');
              
              // Reset button and container after 2.5 seconds
              setTimeout(() => {
                  button.classList.remove('added');
                  icon.textContent = 'add_shopping_cart';
                  if (container) {
                      container.classList.remove('cart-success');
                  }
              }, 2500);
              
          } catch (error) {
              console.error('Error adding to cart:', error);
              
              // Error state
              button.classList.remove('adding');
              button.classList.add('error');
              icon.textContent = 'error';
              
              // Show error notification
              showStatus('Errore nell\'aggiunta al carrello. Riprova.', 'error');
              
              // Reset button after 2 seconds
              setTimeout(() => {
                  button.classList.remove('error');
                  icon.textContent = 'add_shopping_cart';
              }, 2000);
          }
      }
      
      
      
      
      
      // New function to apply remaining client-side filters (excluding course/faculty which backend handles)
      function applyClientSideFilters(files) {
          let filtered = [...files];
          
          // Apply filters that aren't handled by backend
          Object.entries(component.filterManager.filters).forEach(([key, value]) => {
              if (!value || key === 'course' || key === 'faculty' || key === 'canale' || key === 'language' || key === 'tag' || key === 'documentType' || key === 'academicYear' || key === 'courseYear') return; // Skip backend-handled filters
              
              filtered = filtered.filter(file => {
                  switch (key) {
      
                      case 'language':
                          return file.language && file.language.toLowerCase() === value.toLowerCase();
                      case 'canale':
                          return file.canale && file.canale.toLowerCase() === value.toLowerCase();
                      case 'document_type':
                          return file.document_type && file.document_type.toLowerCase() === value.toLowerCase();
                      case 'tag':
                          return file.tag && file.tag.toLowerCase() === value.toLowerCase();
                      case 'rating_min':
                          return file.rating >= parseInt(value);
                      case 'price_min':
                          return file.price >= parseInt(value);
                      case 'price_max':
                          return file.price <= parseInt(value);
                      case 'owned':
                          return value === 'true' ? file.owned : !file.owned;
                      case 'free':
                          return value === 'true' ? file.price === 0 : file.price > 0;
                      default:
                          return true;
                  }
              });
          });
          
          return filtered;
      }
      
      // Wrapper function to safely call async applyFiltersAndRender from non-async contexts
      function triggerFilterUpdate() {
          applyFiltersAndRender().catch(error => {
              console.error('Filter update error:', error);
              showError('Errore nell\'aggiornamento dei filtri');
          });
          saveFiltersToStorage();
      }
      
      function saveFiltersToStorage() {
          try {
              // Save all filters including tags
              component.setStorageItem('filters', component.filterManager.filters);
              
                              // Also save tags separately for easier access
                if (component.filterManager.filters.tag) {
                    component.setStorageItem('tags', component.filterManager.filters.tag);
                } else {
                    component.removeStorageItem('tags');
                }
          } catch (e) {
              console.warn('Could not save filters to localStorage:', e);
          }
      }
      
      function restoreFiltersFromStorage() {
          try {
              // Try to restore filters from localStorage
              const savedFilters = component.getStorageItem('filters');
              const savedTags = component.getStorageItem('tags');
              
              if (savedFilters) {
                  const parsedFilters = JSON.parse(savedFilters);
                  
                  // Restore all filters
                  component.filterManager.filters = parsedFilters;
                  
                  // Ensure tags are properly restored
                  if (savedTags) {
                      const parsedTags = JSON.parse(savedTags);
                      component.filterManager.filters.tag = parsedTags;
                  }
                  
                  // Update UI to reflect restored filters
                  updateFilterInputs();
                  updateActiveFilterIndicators();
                  updateBottomFilterCount();
                  updateActiveFiltersDisplay();
                  
                  // Apply filters to current documents
                  if (originalFiles && originalFiles.length > 0) {
                      const filteredFiles = applyClientSideFilters(originalFiles);
                      renderDocuments(filteredFiles);
                      currentFiles = filteredFiles;
                      
                      const filterCount = component.filterManager.getActiveFilterCount().count;
                      if (filterCount > 0) {
                          showStatus(`${filteredFiles.length} documenti trovati con ${filterCount} filtro${filterCount > 1 ? 'i' : ''} attivo${filterCount > 1 ? 'i' : ''} 🔍`);
                      } else {
                          showStatus(`${filteredFiles.length} documenti disponibili 📚`);
                      }
                  }
              } else {
                  // No saved filters, start fresh
                  component.filterManager.filters = {};
                  updateFilterInputs();
                  updateActiveFilterIndicators();
                  updateBottomFilterCount();
                  updateActiveFiltersDisplay();
                  
                  // Show all documents
                  if (originalFiles && originalFiles.length > 0) {
                      renderDocuments(originalFiles);
                      currentFiles = originalFiles;
                      showStatus(`${originalFiles.length} documenti disponibili 📚`);
                  }
              }
          } catch (e) {
              console.warn('Could not restore filters from localStorage:', e);
              // Fallback to fresh start
              component.filterManager.filters = {};
              updateFilterInputs();
              updateActiveFilterIndicators();
              updateBottomFilterCount();
              updateActiveFiltersDisplay();
              
              if (originalFiles && originalFiles.length > 0) {
                  renderDocuments(originalFiles);
                  currentFiles = originalFiles;
                  showStatus(`${originalFiles.length} documenti disponibili 📚`);
              }
          }
      }
      
      // New function to save tags specifically
      function saveTagsToStorage(tags) {
          try {
              if (tags && Array.isArray(tags) && tags.length > 0) {
                  localStorage.setItem('searchTags', JSON.stringify(tags));
              } else {
                  component.removeStorageItem('tags');
              }
          } catch (e) {
              console.warn('Could not save tags to localStorage:', e);
          }
      }
      
      // New function to get saved tags
      function getSavedTags() {
          try {
              const savedTags = component.getStorageItem('tags');
              if (savedTags) {
                  return JSON.parse(savedTags);
              }
          } catch (e) {
              console.warn('Could not get saved tags from localStorage:', e);
          }
          return null;
      }
      
      // New function to clear saved tags
      function clearSavedTags() {
          try {
              component.removeStorageItem('tags');
          } catch (e) {
              console.warn('Could not clear tags from localStorage:', e);
          }
      }
      
      function updateFilterInputs() {
          // Language display text mapping
          const languageDisplayMap = {
              'Italian': 'Italiano',
              'English': 'Inglese'
          };
          
          // Tag display text mapping - now using getTagDisplayName function
          
          // Clear all inputs first to ensure clean state
          const allInputs = ['facultyFilter', 'courseFilter', 'canaleFilter', 'documentTypeFilter', 'languageFilter', 'academicYearFilter', 'tagFilter'];
          allInputs.forEach(inputId => {
              const input = component.shadowRoot.getElementById (inputId);
              if (input) {
                  input.value = '';
              }
          });
          
          // Reset all dropdown placeholders
          const dropdownDefaults = {
              'documentTypeFilter': 'Tutti i tipi',
              'languageFilter': 'Tutte le lingue',
              'academicYearFilter': 'Tutti gli anni',
              'tagFilter': 'Tutti i tipi'
          };
          
          Object.entries(dropdownDefaults).forEach(([id, defaultValue]) => {
              const input = component.shadowRoot.getElementById (id);
              if (input) {
                  input.value = defaultValue;
              }
          });
          
      
          
          // Update dropdown inputs
          const dropdownTypes = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear', 'tag'];
          dropdownTypes.forEach(type => {
              const input = component.shadowRoot.getElementById (`${type}Filter`);
              const filterKey = type;
              if (input && component.filterManager.filters[filterKey]) {
                  let displayValue = component.filterManager.filters[filterKey];
                  
                  // Use display text mapping for language and tag
                  if (type === 'language' && languageDisplayMap[component.filterManager.filters[filterKey]]) {
                      displayValue = languageDisplayMap[component.filterManager.filters[filterKey]];
                  } else if (type === 'tag') {
                      // Handle multiple tags
                      if (Array.isArray(component.filterManager.filters[filterKey])) {
                          displayValue = component.filterManager.filters[filterKey].map(tag => getTagDisplayName(tag)).join(', ');
                      } else {
                          displayValue = getTagDisplayName(component.filterManager.filters[filterKey]);
                      }
                  }
                  
                  input.value = displayValue;
              }
          });
          
          // Reset all toggle states first
          const toggleTypes = ['priceType', 'vetrinaType'];
          toggleTypes.forEach(type => {
              const toggleClass = type.replace('Type', '-toggle');
              component.shadowRoot.querySelectorAll(`.${toggleClass}`).forEach(toggle => {
                  toggle.classList.remove('active');
              });
          });
          
          // Update toggle states - if no filter is set, default to "all"
          toggleTypes.forEach(type => {
              const toggleClass = type.replace('Type', '-toggle');
              const dataAttr = type.replace('Type', '');
              
              if (component.filterManager.filters[type] && component.filterManager.filters[type] !== 'all') {
                  // Add active class to the correct toggle
                  const activeToggle = component.shadowRoot.querySelector(`[data-${dataAttr}="${component.filterManager.filters[type]}"]`);
                  if (activeToggle) {
                      activeToggle.classList.add('active');
                  }
              } else {
                  // Default to "all" toggle if no filter is set
                  const allToggle = component.shadowRoot.querySelector(`[data-${dataAttr}="all"]`);
                  if (allToggle) {
                      allToggle.classList.add('active');
                  }
              }
          });
          
          // Restore price range values
          const minPriceRange = component.shadowRoot.getElementById ('minPriceRange');
          const maxPriceRange = component.shadowRoot.getElementById ('maxPriceRange');
          const minPriceValue = component.shadowRoot.getElementById ('minPriceValue');
          const maxPriceValue = component.shadowRoot.getElementById ('maxPriceValue');
          const priceRangeContainer = component.shadowRoot.getElementById ('priceRangeContainer');
          
          if (component.filterManager.filters.minPrice !== undefined && component.filterManager.filters.maxPrice !== undefined) {
              if (minPriceRange) minPriceRange.value = component.filterManager.filters.minPrice;
              if (maxPriceRange) maxPriceRange.value = component.filterManager.filters.maxPrice;
              if (minPriceValue) minPriceValue.textContent = `€${component.filterManager.filters.minPrice}`;
              if (maxPriceValue) maxPriceValue.textContent = `€${component.filterManager.filters.maxPrice}`;
          } else {
              // Default values
              if (minPriceRange) minPriceRange.value = 0;
              if (maxPriceRange) maxPriceRange.value = 100;
              if (minPriceValue) minPriceValue.textContent = '€0';
              if (maxPriceValue) maxPriceValue.textContent = '€100';
          }
          
          // Update price slider fill
          updatePriceSliderFill();
          
          // Show/hide price range container based on price type
          if (priceRangeContainer) {
              if (component.filterManager.filters.priceType === 'paid') {
                  priceRangeContainer.style.display = 'block';
              } else {
                  priceRangeContainer.style.display = 'none';
              }
          }
          
          // Restore rating filter
          const ratingText = component.shadowRoot.getElementById ('ratingText');
          const ratingStars = component.shadowRoot.querySelectorAll('.rating-star-filter');
          
          // Reset all stars first
          ratingStars.forEach(star => {
              star.classList.remove('active');
              star.style.color = '#d1d5db';
          });
          
          if (component.filterManager.filters.rating) {
              const rating = parseInt(component.filterManager.filters.rating);
              for (let i = 0; i < rating; i++) {
                  if (ratingStars[i]) {
                      ratingStars[i].classList.add('active');
                      ratingStars[i].style.color = '#fbbf24';
                  }
              }
              if (ratingText) {
                  ratingText.textContent = `${rating} stelle`;
              }
          } else {
              if (ratingText) {
                  ratingText.textContent = 'Qualsiasi rating';
              }
          }
          
          // Update dropdown option visual states
          dropdownTypes.forEach(type => {
              const optionsContainer = component.shadowRoot.getElementById (`${type}Options`);
              if (optionsContainer) {
                  const options = optionsContainer.querySelectorAll('.dropdown-option');
                  options.forEach(option => {
                      option.classList.remove('selected');
                  });
                  
                  if (component.filterManager.filters[type]) {
                      const selectedOptions = Array.isArray(component.filterManager.filters[type]) ? component.filterManager.filters[type] : [component.filterManager.filters[type]];
                      selectedOptions.forEach(selectedValue => {
                          const selectedOption = optionsContainer.querySelector(`[data-value="${selectedValue}"]`);
                          if (selectedOption) {
                              selectedOption.classList.add('selected');
                          }
                      });
                  }
              }
          });
          
          // Close all dropdowns and suggestion containers
          closeAllDropdowns();
          component.shadowRoot.querySelectorAll('.author-suggestions, .autocomplete-suggestions').forEach(suggestions => {
              suggestions.classList.remove('show');
          });
          component.shadowRoot.querySelectorAll('.author-container').forEach(container => {
              container.classList.remove('open');
          });
      }
      
      function logout() {
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
          showStatus('Logout effettuato con successo');
          setTimeout(() => {
              window.location.reload();
          }, 1000);
      }
      
      // ===========================
      // EVENT LISTENERS
      // ===========================
      
      component.addGlobalEventListener(document, 'DOMContentLoaded', function() {
          const searchInput = component.shadowRoot.getElementById ('searchInput');
          const searchBtn = component.shadowRoot.getElementById ('searchBtn');
          const uploadBtn = component.shadowRoot.getElementById ('uploadBtn');
          const userIcon = component.shadowRoot.getElementById ('userIcon');
      
          if (searchBtn) {
              searchBtn.addEventListener('click', async function() {
                  await performSearch(searchInput.value);
              });
          }
      
          if (searchInput) {
              searchInput.addEventListener('keypress', async function(e) {
                  if (e.key === 'Enter') {
                      await performSearch(searchInput.value);
                  }
              });
      
              // Real-time search with debounce and request cancellation
              let searchTimeout;
              this.currentSearchController = null;
              searchInput.addEventListener('input', function() {
                  clearTimeout(searchTimeout);
                  // Cancel previous request if still pending
                  if (currentSearchController) {
                      currentSearchController.abort();
                      currentSearchController = null;
                  }
                  
                  searchTimeout = setTimeout(async () => {
                      currentSearchController = new AbortController();
                      
                      if (!this.value.trim()) {
                          // If search is cleared, apply current filters or show all
                          if (Object.keys(component.filterManager.filters).length > 0) {
                              await applyFiltersAndRender();
                      } else {
                              await loadAllFiles();
                          }
                      } else if (this.value.length >= 2) {
                          // Only search when at least 2 characters
                          await performSearch(this.value, currentSearchController.signal);
                      }
                      currentSearchController = null;
                  }, 500); // Increased debounce delay for better performance
              });
          }
      
          if (uploadBtn) {
              uploadBtn.addEventListener('click', function() {
                  showStatus('Reindirizzamento alla pagina di upload... 📤');
                  setTimeout(() => {
                      window.location.href = 'upload.html';
                  }, 1000);
              });
          }
      
          if (userIcon) {
              userIcon.addEventListener('click', function() {
                  if (confirm('Sei sicuro di voler effettuare il logout?')) {
                      logout();
                  }
              });
          }
      
          // Close modal when clicking outside
          const previewModal = component.shadowRoot.getElementById ('previewModal');
          if (previewModal) {
              previewModal.addEventListener('click', function(e) {
                  if (e.target === this) {
                      closePreview();
                  }
              });
          }
      
          // Smooth scrolling
          document.documentElement.style.scrollBehavior = 'smooth';
          
          // Initialize keyboard shortcuts
          initializeKeyboardShortcuts();
      });
      
      function initializeKeyboardShortcuts() {
          component.addGlobalEventListener(document, 'keydown', (e) => {
              // Ctrl/Cmd + F to focus search (prevent default browser search)
              if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !e.shiftKey) {
                  e.preventDefault();
                  const searchInput = component.shadowRoot.getElementById ('searchInput');
                  if (searchInput) {
                      searchInput.focus();
                      searchInput.select();
                  }
              }
              
              // Ctrl/Cmd + Shift + F to open filters
              if ((e.ctrlKey || e.metaKey) && e.key === 'F' && e.shiftKey) {
                  e.preventDefault();
                  toggleFiltersPanel();
              }
              
              // Ctrl/Cmd + Alt + C to clear all filters
              if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'c') {
                  e.preventDefault();
                  clearAllFiltersAction();
              }
              
              // Escape to close filters or preview
              if (e.key === 'Escape') {
                  e.preventDefault();
                  if (isFiltersOpen) {
                      closeFiltersPanel();
                  } else {
                      const previewModal = component.shadowRoot.getElementById ('previewModal');
                      if (previewModal && previewModal.classList.contains('active')) {
                          closePreview();
                      }
                  }
              }
          });
      }
      
              // ===========================
      // GLOBAL UTILITIES
              // ===========================
      
      // Make functions globally available for onclick handlers
      component.previewDocument = previewDocument;
      component.closePreview = closePreview;
      component.downloadDocument = downloadDocument;
      component.purchaseDocument = purchaseDocument;
      component.toggleFavorite = toggleFavorite;
      component.removeFilter = removeFilter;
      component.clearAllFiltersAction = clearAllFiltersAction;
      
      async function openQuickLook(vetrina) {
          // Prevent multiple modals
          if (component.shadowRoot.getElementById ('quick-look-overlay')) return;
      
          const modalHTML = `
              <div id="quick-look-overlay" class="quick-look-overlay">
                  <div class="quick-look-modal">
                      <button class="quick-look-close-button">&times;</button>
                      <div class="quick-look-header">
                          <div class="quick-look-header-content">
                              <h2 class="quick-look-title">${vetrina.title || vetrina.name}</h2>
                              <p class="quick-look-description">${vetrina.description || ''}</p>
                              <div class="quick-look-meta">
                                  <span class="quick-look-file-count">Caricamento...</span>
                                  <span class="quick-look-separator">•</span>
                                  <span class="quick-look-author">Caricato da ${vetrina.author_username || 'Unknown'}</span>
                              </div>
                          </div>
                          <div class="quick-look-actions">
                              <button class="quick-look-view-full-btn" data-action="view-full-document" data-doc-id="${vetrina.id}">
                                  <span class="material-symbols-outlined">open_in_new</span>
                                  Visualizza Pagina Completa
                              </button>
                          </div>
                      </div>
                      <div class="quick-look-body">
                          <div class="quick-look-main-preview">
                              <div class="preview-placeholder">
                                  <span class="material-symbols-outlined">visibility</span>
                                  <p>Caricamento file...</p>
                              </div>
                          </div>
                          <div class="quick-look-sidebar">
                              <div class="quick-look-sidebar-header">
                                  <h3>File nella Vetrina</h3>
                              </div>
                              <ul class="quick-look-file-list">
                                  <li class="quick-look-loading">
                                      <div class="loading-spinner"></div>
                                      <span>Caricamento file...</span>
                                  </li>
                              </ul>
                          </div>
                      </div>
                  </div>
              </div>
          `;
      
          // Insert into shadow DOM - find a suitable container
          const mainContent = component.shadowRoot.querySelector('.main-content') || 
                             component.shadowRoot.querySelector('body') ||
                             component.shadowRoot;
          
          if (mainContent && mainContent.insertAdjacentHTML) {
              mainContent.insertAdjacentHTML('beforeend', modalHTML);
          } else {
              // Fallback: create element and append
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = modalHTML;
              const modalElement = tempDiv.firstElementChild;
              if (modalElement) {
                  component.shadowRoot.appendChild(modalElement);
              }
          }
          const overlay = component.shadowRoot.getElementById ('quick-look-overlay');
          const modal = overlay.querySelector('.quick-look-modal');
          const closeButton = overlay.querySelector('.quick-look-close-button');
          const fileList = overlay.querySelector('.quick-look-file-list');
      
          // Load files if not already loaded
          if (!vetrina.filesLoaded) {
              try {
                  const fileData = await loadVetrinaFiles(vetrina.id);
                  if (fileData && fileData.files.length > 0) {
                      // Update the vetrina object with loaded data
                      vetrina.files = fileData.files;
                      vetrina.fileCount = fileData.fileCount;
                      vetrina.size = fileData.totalSize;
                      vetrina.price = fileData.totalPrice;
                      // download_count removed - no longer needed
                      vetrina.document_types = fileData.documentTypes;
                      vetrina.document_type = fileData.fileCount > 1 ? 'BUNDLE' : fileData.documentTypes[0] || 'FILE';
                      vetrina.owned = fileData.owned;
                      vetrina.tags = fileData.tags;
                      vetrina.primary_tag = fileData.primaryTag;
                      vetrina.filesLoaded = true;
                      vetrina.filename = fileData.fileCount > 1 ? `${fileData.fileCount} files` : fileData.files[0].filename;
                      
                      // Update the UI to show the new tags
                      updateDocumentCardTags(vetrina.id, fileData.tags);
                  } else {
                      // Show error state
                      fileList.innerHTML = '<li class="quick-look-error">Nessun file trovato</li>';
                      return;
                  }
              } catch (error) {
                  console.error(`Error loading files for quick look:`, error);
                  fileList.innerHTML = '<li class="quick-look-error">Errore nel caricamento dei file</li>';
                  return;
              }
          }
      
          // Update file count in header
          const fileCountElement = overlay.querySelector('.quick-look-file-count');
          if (fileCountElement) {
              fileCountElement.textContent = `${vetrina.files.length} file${vetrina.files.length !== 1 ? 's' : ''}`;
          }
      
          // Clear loading state and populate file list
          fileList.innerHTML = '';
          vetrina.files.forEach((file, index) => {
              const fileItem = document.createElement('li');
              fileItem.className = 'quick-look-file-item';
              fileItem.dataset.index = index;
              
              // Get file type and size
              const fileType = getFileTypeFromFilename(file.filename);
              const fileSize = formatFileSize(file.size || 0);
              
              fileItem.innerHTML = `
                  <div class="file-item-icon">${getDocumentPreviewIcon(file.filename)}</div>
                  <div class="file-item-content">
                      <div class="file-item-name" title="${file.filename}">${file.filename}</div>
                      <div class="file-item-details">
                          <span class="file-item-type">${fileType}</span>
                          <span class="file-item-separator">•</span>
                          <span class="file-item-size">${fileSize}</span>
                      </div>
                  </div>
              `;
              fileList.appendChild(fileItem);
          });
          
          // Show first file by default
          switchQuickLookPreview(vetrina, 0);
      
          // Event listeners
          closeButton.addEventListener('click', closeQuickLook);
          overlay.addEventListener('click', (e) => {
              if (e.target === overlay) {
                  closeQuickLook();
              }
          });
          fileList.addEventListener('click', (e) => {
              const item = e.target.closest('.quick-look-file-item');
              if (item) {
                  switchQuickLookPreview(vetrina, parseInt(item.dataset.index, 10));
              }
          });
      
          // Keyboard navigation
          component.addGlobalEventListener(document, 'keydown', handleQuickLookKeyboard);
      
          // Animate in
          setTimeout(() => overlay.classList.add('visible'), 10);
      }
      
      function closeQuickLook() {
          const overlay = component.shadowRoot.getElementById ('quick-look-overlay');
          if (overlay) {
              // Remove keyboard event listener
              document.removeEventListener('keydown', handleQuickLookKeyboard);
              
              overlay.classList.remove('visible');
              overlay.addEventListener('transitionend', () => {
                  overlay.remove();
              }, { once: true });
          }
      }
      
      function openChunksOverlay(item) {
          // Prevent multiple modals
          if (component.shadowRoot.getElementById ('chunks-overlay')) return;
      
          // Get current search query
          const searchInput = component.shadowRoot.querySelector('.search-input');
          const currentQuery = searchInput?.value?.trim() || '';
      
          const modalHTML = `
              <div id="chunks-overlay" class="chunks-overlay">
                  <div class="chunks-modal">
                      <button class="chunks-close-button">&times;</button>
                      <div class="chunks-header">
                          <div class="chunks-header-content">
                              <h2 class="chunks-title">Risultati Semantici</h2>
                              <p class="chunks-description">${item.semanticChunks.length} contenuti trovati per "${currentQuery || item.title || item.name}"</p>
                              <div class="chunks-meta">
                                  <span class="material-symbols-outlined">psychology</span>
                                  <span>Ricerca semantica ha identificato questi argomenti specifici nella vetrina</span>
                              </div>
                          </div>
                      </div>
                      <div class="chunks-body">
                          <div class="chunks-horizontal-scroll">
                              ${item.semanticChunks.map((chunk, index) => `
                                  <div class="chunk-preview-card" data-index="${index}">
                                      <div class="chunk-preview-image">
                                          <div class="page-preview-placeholder">
                                              <span class="material-symbols-outlined">description</span>
                                              <span class="page-number">Pagina ${chunk.page_number || 'N/A'}</span>
                                          </div>
                                      </div>
                                      <div class="chunk-preview-content">
                                          <div class="chunk-preview-header">
                                              <div class="chunk-page-info">
                                                  <span class="material-symbols-outlined">description</span>
                                                  <span class="chunk-page">Pagina ${chunk.page_number || 'N/A'}</span>
                                              </div>
      
                                          </div>
                                          <div class="chunk-preview-description">
                                              ${chunk.chunk_description || chunk.description || 'Nessuna descrizione disponibile'}
                                          </div>
                                          ${chunk.context ? `<div class="chunk-preview-context"><strong>Contesto:</strong> ${chunk.context}</div>` : ''}
                                      </div>
                                  </div>
                              `).join('')}
                          </div>
                      </div>
                      <div class="chunks-footer">
                          <button class="chunks-view-full-btn" data-action="view-full-document" data-doc-id="${item.id}">
                              <span class="material-symbols-outlined">open_in_new</span>
                              Visualizza Vetrina Completa
                          </button>
                      </div>
                  </div>
              </div>
          `;
      
          // Insert into shadow DOM - find a suitable container
          const mainContent = component.shadowRoot.querySelector('.main-content') || 
                             component.shadowRoot.querySelector('body') ||
                             component.shadowRoot;
          
          if (mainContent && mainContent.insertAdjacentHTML) {
              mainContent.insertAdjacentHTML('beforeend', modalHTML);
          } else {
              // Fallback: create element and append
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = modalHTML;
              const modalElement = tempDiv.firstElementChild;
              if (modalElement) {
                  component.shadowRoot.appendChild(modalElement);
              }
          }
          
          const overlay = component.shadowRoot.getElementById ('chunks-overlay');
          const closeButton = overlay.querySelector('.chunks-close-button');
          const viewFullBtn = overlay.querySelector('.chunks-view-full-btn');
      
          // Event listeners
          closeButton.addEventListener('click', closeChunksOverlay);
          overlay.addEventListener('click', (e) => {
              if (e.target === overlay) {
                  closeChunksOverlay();
              }
          });
      
          // Handle view full document button
          viewFullBtn.addEventListener('click', (e) => {
              const docId = e.target.closest('[data-doc-id]').dataset.docId;
              closeChunksOverlay();
              // Navigate to document page
              window.location.href = `document-preview.html?id=${docId}`;
          });
      
          // Keyboard navigation
          component.addGlobalEventListener(document, 'keydown', handleChunksKeyboard);
      
          // Animate in
          setTimeout(() => overlay.classList.add('visible'), 10);
      }
      
      function closeChunksOverlay() {
          const overlay = component.shadowRoot.getElementById ('chunks-overlay');
          if (overlay) {
              // Remove keyboard event listener
              document.removeEventListener('keydown', handleChunksKeyboard);
              
              overlay.classList.remove('visible');
              overlay.addEventListener('transitionend', () => {
                  overlay.remove();
              }, { once: true });
          }
      }
      
      function handleChunksKeyboard(e) {
          if (e.key === 'Escape') {
              closeChunksOverlay();
          }
      }
      
      function switchQuickLookPreview(vetrina, index) {
          const file = vetrina.files[index];
          if (!file) return;
      
          const previewContainer = component.shadowRoot.querySelector('.quick-look-main-preview');
          const fileListItems = component.shadowRoot.querySelectorAll('.quick-look-file-list .quick-look-file-item');
      
          // Get file type and size
          const fileType = getFileTypeFromFilename(file.filename);
          const fileSize = formatFileSize(file.size || 0);
      
          // Update preview content
          previewContainer.innerHTML = `
              <div class="preview-content-area">
                  <div class="preview-icon-large">${getDocumentPreviewIcon(file.filename)}</div>
                  <h3 class="preview-filename" title="${file.filename}">${file.filename}</h3>
                  <div class="preview-file-details">
                      <span class="preview-file-type">${fileType}</span>
                      <span class="preview-file-separator">•</span>
                      <span class="preview-file-size">${fileSize}</span>
                  </div>
                  <div class="preview-file-info">
                      <p class="preview-file-description">
                          ${file.description || 'Nessuna descrizione disponibile'}
                      </p>
                  </div>
              </div>
          `;
      
          // Update active class in file list
          fileListItems.forEach((item, i) => {
              item.classList.toggle('active', i === index);
          });
      }
      
      function handleQuickLookKeyboard(e) {
          const overlay = component.shadowRoot.getElementById ('quick-look-overlay');
          if (!overlay) return;
      
          switch (e.key) {
              case 'Escape':
                  closeQuickLook();
                  break;
              case 'ArrowDown':
                  e.preventDefault();
                  navigateQuickLookFile(1);
                  break;
              case 'ArrowUp':
                  e.preventDefault();
                  navigateQuickLookFile(-1);
                  break;
          }
      }
      
      function navigateQuickLookFile(direction) {
          const activeItem = component.shadowRoot.querySelector('.quick-look-file-item.active');
          if (!activeItem) return;
      
          const currentIndex = parseInt(activeItem.dataset.index, 10);
          const fileList = component.shadowRoot.querySelectorAll('.quick-look-file-item');
          const newIndex = (currentIndex + direction + fileList.length) % fileList.length;
          
          const newItem = component.shadowRoot.querySelector(`[data-index="${newIndex}"]`);
          if (newItem) {
              newItem.click();
              newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
      }
      
      
      
      // ===========================
      // PROFESSIONAL SCROLL TO TOP FUNCTIONALITY
      // ===========================
      
      function initializeScrollToTop() {
          const scrollToTopBtn = component.shadowRoot.getElementById ('scrollToTopBtn');
          
          console.log('🔍 Scroll to top elements check:', {
              scrollToTopBtn: !!scrollToTopBtn
          });
          
          if (!scrollToTopBtn) {
              console.error('❌ Scroll to top button not found in shadow DOM');
              throw new Error('Scroll to top button not found');
          }
          
          console.log('✅ Scroll to top button initialized');
      
                this.scrollThreshold = 300; // Show button after scrolling 300px
      this.isScrolling = false;
          let scrollTimeout;
      
          // Show/hide button based on scroll position
          function handleScroll() {
              const scrollY = window.scrollY || window.pageYOffset;
              
              if (scrollY > scrollThreshold) {
                  if (!scrollToTopBtn.classList.contains('visible')) {
                      scrollToTopBtn.classList.add('visible');
                      // Add pulse animation for first appearance
                      setTimeout(() => {
                          scrollToTopBtn.classList.add('pulse');
                          setTimeout(() => {
                              scrollToTopBtn.classList.remove('pulse');
                          }, 1000); // Reduced pulse duration for faster feedback
                      }, 25); // Reduced delay for immediate response
                  }
              } else {
                  scrollToTopBtn.classList.remove('visible');
              }
          }
      
          // Smooth scroll to top using native smooth scrolling
          function scrollToTop() {
              // Remove pulse animation if active
              scrollToTopBtn.classList.remove('pulse');
              
              // Use native smooth scrolling for better performance and smoother animation
              window.scrollTo({
                  top: 0,
                  behavior: 'smooth'
              });
          }
      
          // Event listeners
          component.addGlobalEventListener(window, 'scroll', handleScroll, { passive: true });
          scrollToTopBtn.addEventListener('click', scrollToTop);
          
          // Keyboard accessibility
          scrollToTopBtn.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  scrollToTop();
              }
          });
      
          // Touch device optimizations
          if ('ontouchstart' in window) {
              scrollToTopBtn.addEventListener('touchstart', (e) => {
                  e.preventDefault();
                  scrollToTopBtn.style.transform = 'scale(0.95)';
              }, { passive: false });
              
              scrollToTopBtn.addEventListener('touchend', () => {
                  scrollToTopBtn.style.transform = '';
              });
          }
      
          // Adjust threshold based on viewport height
          function adjustScrollThreshold() {
              const viewportHeight = window.innerHeight;
              scrollThreshold = Math.max(200, viewportHeight * 0.3); // At least 200px, or 30% of viewport
          }
      
          // Initial adjustment and on resize
          adjustScrollThreshold();
          component.addGlobalEventListener(window, 'resize', adjustScrollThreshold);
      
          // Performance optimization: throttle scroll events for better performance
          this.ticking = false;
          
          function throttledHandleScroll() {
              if (!ticking) {
                  requestAnimationFrame(() => {
                      handleScroll();
                      ticking = false;
                  });
                  ticking = true;
              }
          }
      
          // Use throttled version for all devices for better performance
          component.addGlobalEventListener(window, 'scroll', throttledHandleScroll, { passive: true });
      
          throttledHandleScroll(); // Initial check
      }
      
      // ===========================
      // DYNAMIC BACKGROUND POSITIONING
      // ===========================
      
      // Global variable to store image dimensions for immediate access
      let bgImageDimensions = null;
      
      // Preload and cache image dimensions immediately
      function preloadBackgroundImage() {
          const tempImage = new Image();
          tempImage.src = '../../images/bg.png';
          
          const storeImageDimensions = () => {
              if (tempImage.naturalWidth > 0 && tempImage.naturalHeight > 0) {
                  bgImageDimensions = {
                      width: tempImage.naturalWidth,
                      height: tempImage.naturalHeight,
                      aspectRatio: tempImage.naturalWidth / tempImage.naturalHeight
                  };
                  // Position immediately if DOM elements are ready
                  adjustBackgroundPosition();
              }
          };
          
          if (tempImage.complete && tempImage.naturalWidth > 0) {
              storeImageDimensions();
          } else {
              tempImage.onload = storeImageDimensions;
              tempImage.onerror = () => console.error("Background image failed to load");
          }
      }
      
      function adjustBackgroundPosition() {
          const bgElement = component.shadowRoot.querySelector('.background-image');
          const title = component.shadowRoot.querySelector('.search-title');
          const searchContainer = component.shadowRoot.querySelector('.search-container');
      
          if (!bgElement || !title || !searchContainer) {
              return;
          }
      
          // If we don't have image dimensions yet, try to get them
          if (!bgImageDimensions) {
              const tempImage = new Image();
              tempImage.src = '../../images/bg.png';
              
              if (tempImage.complete && tempImage.naturalWidth > 0) {
                  bgImageDimensions = {
                      width: tempImage.naturalWidth,
                      height: tempImage.naturalHeight,
                      aspectRatio: tempImage.naturalWidth / tempImage.naturalHeight
                  };
              } else {
                  // Image not ready yet, will be called again when it loads
                  return;
              }
          }
      
          const calculatePosition = () => {
              const imageAspectRatio = bgImageDimensions.aspectRatio;
      
              // Calculate the rendered height of the background based on viewport width + 2px
              const bgWidth = window.innerWidth + 2;
              const bgRenderedHeight = bgWidth / imageAspectRatio;
      
              // Set the container's height to match the image's rendered height
              bgElement.style.height = `${bgRenderedHeight}px`;
      
              // Find the page anchor's Y-coordinate relative to the document
              const scrollY = window.scrollY;
              const titleRect = title.getBoundingClientRect();
              const searchRect = searchContainer.getBoundingClientRect();
              const pageAnchorY = scrollY + titleRect.bottom + (searchRect.top - titleRect.bottom) / 2;
      
              // Calculate the image's internal anchor point in pixels (50% from the top)
              const imageAnchorInPixels = bgRenderedHeight * 0.50;
      
              // Calculate the final 'top' offset for the element.
              // This makes the image's anchor line up with the page's anchor.
              const finalTopOffset = pageAnchorY - imageAnchorInPixels;
              
              bgElement.style.top = `${finalTopOffset}px`;
          };
      
          calculatePosition();
      }
      
      // Debounce function to limit how often a function can run.
      function debounce(func, wait) {
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
      
      // Start preloading image immediately - even before DOM is ready
      preloadBackgroundImage();
      
      // Initialize background positioning immediately when DOM is ready
      component.addGlobalEventListener(document, 'DOMContentLoaded', () => {
          // Position immediately when DOM is ready
          adjustBackgroundPosition();
      });
      
      // Also run on window load to ensure everything is fully loaded
      component.addGlobalEventListener(window, 'load', adjustBackgroundPosition);
      
      // Add event listeners for dynamic background
      component.addGlobalEventListener(window, 'resize', debounce(adjustBackgroundPosition, 50));
      
      
      
      // Simple scroll handler for sticky search bar
      function initializeStickySearch() {
          const searchContainerWrapper = component.shadowRoot.querySelector('.search-container-wrapper');
          
          if (!searchContainerWrapper) {
              return;
          }
      
          // Simple scroll event listener to add/remove stuck class
          component.addGlobalEventListener(window, 'scroll', () => {
              const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
              
              // Add stuck class when scrolled down
              if (scrollTop > 100) {
                  searchContainerWrapper.classList.add('is-stuck');
              } else {
                  searchContainerWrapper.classList.remove('is-stuck');
              }
          });
      }
      
      component.addGlobalEventListener(document, 'DOMContentLoaded', initializeStickySearch);
      
      // Font Loading Detection Script (moved from search.html for CSP compliance)
      function showIconsImmediately() {
          component.shadowRoot.querySelectorAll('.material-symbols-outlined').forEach(function(element) {
              element.style.visibility = 'visible';
              element.style.opacity = '1';
          });
      }
      
      // Show icons immediately on page load
      showIconsImmediately();
      
      // Update when fonts are ready
      if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(function() {
              if (document.fonts.check('1em "Material Symbols Outlined"')) {
                  showIconsImmediately();
              }
          });
      }
      
      // Additional check after a short delay to ensure icons are visible
      setTimeout(showIconsImmediately, 50);
      
      // Add event listener for preview close button (replaces inline onclick)
      component.addGlobalEventListener(document, 'DOMContentLoaded', function() {
          const previewCloseBtn = component.shadowRoot.getElementById ('previewCloseBtn');
          if (previewCloseBtn) {
              previewCloseBtn.addEventListener('click', closePreview);
          }
      });
      
      // Reviews Overlay System
      this.currentVetrinaForReviews = null;
      this.currentReviews = [];
      this.currentUserReview = null;
      this.selectedRating = 0;
      
      // Initialize reviews overlay functionality
      function initializeReviewsOverlay() {
          const reviewsOverlay = component.shadowRoot.getElementById ('reviewsOverlay');
          if (reviewsOverlay) {
              reviewsOverlay.addEventListener('click', (e) => {
                  if (e.target.id === 'reviewsOverlay') {
                      closeReviewsOverlay();
                  }
              });
          }
      
          // Add event listeners for reviews overlay actions within shadow DOM
          component.shadowRoot.addEventListener('click', (e) => {
              if (e.target.closest('[data-action="open-reviews"]')) {
                  const element = e.target.closest('[data-action="open-reviews"]');
                  const vetrinaId = element.getAttribute('data-vetrina-id');
                  if (vetrinaId) {
                      openReviewsOverlay(vetrinaId);
                  }
              }
      
              if (e.target.closest('[data-action="close-reviews"]')) {
                  closeReviewsOverlay();
              }
      
              if (e.target.closest('[data-action="show-review-form"]')) {
                  showAddReviewForm();
              }
      
              if (e.target.closest('[data-action="hide-review-form"]')) {
                  hideAddReviewForm();
              }
      
              if (e.target.closest('[data-action="submit-review"]')) {
                  submitReview();
              }
      
              if (e.target.closest('[data-action="delete-review"]')) {
                  deleteUserReview();
              }
          });
      
          // Initialize star rating functionality
          initializeStarRating();
      }
      
      // Open reviews overlay for a specific vetrina
      async function openReviewsOverlay(vetrinaId) {
          currentVetrinaForReviews = vetrinaId;
          const overlay = component.shadowRoot.getElementById ('reviewsOverlay');
          
          if (overlay) {
              overlay.classList.add('active');
              // Use instance-specific body class to prevent conflicts
              document.body.classList.add(`reviews-open-${component.instanceId}`);
              document.body.style.overflow = 'hidden';
              
              // Show initial rating data instantly from search results
              showInitialRatingData(vetrinaId);
              
              // Load detailed reviews data in background
              await loadReviewsForVetrina(vetrinaId);
              updateReviewsOverlay();
          }
      }
      
      // Show initial rating data from search results
      function showInitialRatingData(vetrinaId) {
          const reviewsList = component.shadowRoot.getElementById ('reviewsList');
          const bigRatingScore = component.shadowRoot.querySelector('.big-rating-score');
          const totalReviews = component.shadowRoot.querySelector('.total-reviews');
          const bigStars = component.shadowRoot.querySelector('.big-stars');
          const addReviewBtn = component.shadowRoot.querySelector('[data-action="show-review-form"]');
      
          if (!reviewsList || !bigRatingScore || !totalReviews || !bigStars || !addReviewBtn) return;
      
          // Find the vetrina data from search results
          const ratingBadge = component.shadowRoot.querySelector(`[data-vetrina-id="${vetrinaId}"][data-action="open-reviews"]`);
          if (ratingBadge) {
              // Get rating and review count from dataset attributes
              const rating = parseFloat(ratingBadge.dataset.rating) || 0;
              const reviewCount = parseInt(ratingBadge.dataset.reviewCount) || 0;
                  
              // Show initial data instantly
              bigRatingScore.textContent = rating.toFixed(1);
              totalReviews.textContent = `Basato su ${reviewCount} recensioni`;
              bigStars.innerHTML = generateFractionalStars(rating);
              
              // Show loading for reviews list
              reviewsList.innerHTML = `
                  <div class="reviews-loading">
                      <div class="loading-spinner"></div>
                      <p>Caricamento recensioni...</p>
                  </div>
              `;
              
              // Hide add review button until we load user data
              addReviewBtn.style.display = 'none';
              return;
          }
          
          // Fallback to loading state if we can't find the data
          showReviewsLoadingState();
      }
      
      // Show loading state for reviews
      function showReviewsLoadingState() {
          const reviewsList = component.shadowRoot.getElementById ('reviewsList');
          const bigRatingScore = component.shadowRoot.querySelector('.big-rating-score');
          const totalReviews = component.shadowRoot.querySelector('.total-reviews');
          const bigStars = component.shadowRoot.querySelector('.big-stars');
          const addReviewBtn = component.shadowRoot.querySelector('[data-action="show-review-form"]');
      
          if (!reviewsList || !bigRatingScore || !totalReviews || !bigStars || !addReviewBtn) return;
      
          // Show loading state
          bigRatingScore.textContent = '...';
          totalReviews.textContent = 'Caricamento...';
          bigStars.innerHTML = '<div class="loading-stars">★★★★★</div>';
          addReviewBtn.style.display = 'none';
          
          reviewsList.innerHTML = `
              <div class="reviews-loading">
                  <div class="loading-spinner"></div>
                  <p>Caricamento recensioni...</p>
              </div>
          `;
      }
      
      // Close reviews overlay
      function closeReviewsOverlay() {
          const overlay = component.shadowRoot.getElementById ('reviewsOverlay');
          if (overlay) {
              overlay.classList.remove('active');
              // Remove instance-specific body class
              document.body.classList.remove(`reviews-open-${component.instanceId}`);
              document.body.style.overflow = '';
              
              // Reset form
              hideAddReviewForm();
              selectedRating = 0;
              currentUserReview = null;
          }
      }
      
      // Load reviews for a specific vetrina
      async function loadReviewsForVetrina(vetrinaId) {
          try {
              
              const token = localStorage.getItem('authToken');
              
              // Get current user info for debugging
              const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
              
              // Prepare headers
              const headers = {
                  'Content-Type': 'application/json'
              };
              
              // Add Authorization header only if token exists
              if (token) {
                  headers['Authorization'] = `Bearer ${token}`;
              }
      
              const response = await fetch(`${API_BASE}/vetrine/${vetrinaId}/reviews`, {
                  method: 'GET',
                  headers: headers
              });
      
              if (response.ok) {
                  const data = await response.json();
                  currentReviews = data.reviews || [];
                  currentUserReview = data.user_review || null;
                  if (currentUserReview) {
                  }
              } else if (response.status === 401) {
                  console.error('Authentication failed');
                  // Clear auth data if we had a token (user was logged in)
                  if (token) {
                      localStorage.removeItem('authToken');
                      localStorage.removeItem('currentUser');
                  }
                  // User is not authenticated, just load reviews without user data
                  currentReviews = [];
                  currentUserReview = null;
              } else {
                  console.error('Failed to load reviews:', response.status);
                  currentReviews = [];
                  currentUserReview = null;
              }
          } catch (error) {
              console.error('Error loading reviews:', error);
              currentReviews = [];
              currentUserReview = null;
          }
      }
      
      // Update the reviews overlay content
      function updateReviewsOverlay() {
          const reviewsList = component.shadowRoot.getElementById ('reviewsList');
          const bigRatingScore = component.shadowRoot.querySelector('.big-rating-score');
          const totalReviews = component.shadowRoot.querySelector('.total-reviews');
          const bigStars = component.shadowRoot.querySelector('.big-stars');
          const addReviewBtn = component.shadowRoot.querySelector('[data-action="show-review-form"]');
      
          if (!reviewsList || !bigRatingScore || !totalReviews || !bigStars || !addReviewBtn) return;
      
          // Calculate average rating
          const totalRating = currentReviews.reduce((sum, review) => sum + review.rating, 0);
          const averageRating = currentReviews.length > 0 ? (totalRating / currentReviews.length).toFixed(1) : '0.0';
          
          // Update summary
          bigRatingScore.textContent = averageRating;
          totalReviews.textContent = `Basato su ${currentReviews.length} recensioni`;
          
          // Update stars
          bigStars.innerHTML = generateFractionalStars(parseFloat(averageRating));
          
          // Show/hide add review button based on authentication and whether user has already reviewed
          const token = localStorage.getItem('authToken');
          const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
          
          if (!token || !currentUser) {
              // User not authenticated - hide add review button
              addReviewBtn.style.display = 'none';
          } else {
              // Check if user has already reviewed using frontend comparison
              const hasUserReviewed = currentReviews.some(review => 
                  review.user?.user_id === currentUser.user_id
              );
              
              if (hasUserReviewed) {
                  // User already reviewed - hide add review button
                  addReviewBtn.style.display = 'none';
              } else {
                  // User authenticated but hasn't reviewed - show add review button
                  addReviewBtn.style.display = 'flex';
              }
          }
      
          // Render reviews list
          if (currentReviews.length === 0) {
              reviewsList.innerHTML = `
                  <div class="no-reviews-message">
                      <span class="material-symbols-outlined">rate_review</span>
                      <h3>Nessuna recensione ancora</h3>
                      <p>Sii il primo a condividere la tua esperienza con questo documento!</p>
                  </div>
              `;
          } else {
              reviewsList.innerHTML = currentReviews.map(review => `
                  <div class="review-item-overlay">
                      <div class="review-header-overlay">
                          <div class="reviewer-info-overlay">
                              <div class="reviewer-avatar-overlay">
                                  ${createGradientAvatar(
                                      review.user?.username || 'User',
                                      review.user?.username || 'user'
                                  )}
                              </div>
                              <div>
                                  <div class="reviewer-name-overlay">${review.user?.username || review.user?.first_name + ' ' + review.user?.last_name || 'Utente Anonimo'}</div>
                                  <div class="review-rating-overlay">
                                      ${generateReviewStars(review.rating)}
                                  </div>
                              </div>
                          </div>
                          <div class="review-date-overlay">${formatDate(review.review_date)}</div>
                      </div>
                      ${review.review_subject ? `<div class="review-subject-overlay">${review.review_subject}</div>` : ''}
                      <div class="review-text-overlay">${review.review_text}</div>
                      ${(() => {
                          const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
                          // Frontend-only approach: compare current user with review author
                          const isCurrentUserReview = currentUser && currentUser.user_id === review.user?.user_id;
                          const shouldShowDelete = isCurrentUserReview;
                          return shouldShowDelete ? 
                              `<button class="delete-review-btn" data-action="delete-review" title="Elimina recensione">
                                  <span class="material-symbols-outlined">delete</span>
                              </button>` : '';
                      })()}
                  </div>
              `).join('');
          }
      }
      
      // Show add review form
      function showAddReviewForm() {
          const form = component.shadowRoot.getElementById ('addReviewForm');
          const reviewsList = component.shadowRoot.getElementById ('reviewsList');
          const reviewsSummary = component.shadowRoot.querySelector('.reviews-summary');
          
          if (form && reviewsList) {
              form.style.display = 'block';
              reviewsList.style.display = 'none';
              if (reviewsSummary) reviewsSummary.style.display = 'none';
              
              // Reset form
              component.shadowRoot.getElementById ('reviewComment').value = '';
              selectedRating = 0;
              updateStarRatingDisplay();
          }
      }
      
      // Hide add review form
      function hideAddReviewForm() {
          const form = component.shadowRoot.getElementById ('addReviewForm');
          const reviewsList = component.shadowRoot.getElementById ('reviewsList');
          const reviewsSummary = component.shadowRoot.querySelector('.reviews-summary');
          
          if (form && reviewsList) {
              form.style.display = 'none';
              reviewsList.style.display = 'block';
              if (reviewsSummary) reviewsSummary.style.display = 'flex';
              
              // Reset form
              component.shadowRoot.getElementById ('reviewComment').value = '';
              selectedRating = 0;
              updateStarRatingDisplay();
          }
      }
      
      // Initialize star rating functionality
      function initializeStarRating() {
          const starInputs = component.shadowRoot.querySelectorAll('.star-input');
          
          starInputs.forEach(star => {
              star.addEventListener('click', () => {
                  const rating = parseInt(star.getAttribute('data-rating'));
                  selectedRating = rating;
                  updateStarRatingDisplay();
              });
              
              star.addEventListener('mouseenter', () => {
                  const rating = parseInt(star.getAttribute('data-rating'));
                  highlightStars(rating);
              });
              
              star.addEventListener('mouseleave', () => {
                  updateStarRatingDisplay();
              });
          });
      }
      
      // Update star rating display
      function updateStarRatingDisplay() {
          const starInputs = component.shadowRoot.querySelectorAll('.star-input');
          
          starInputs.forEach((star, index) => {
              const starRating = index + 1;
              star.classList.remove('active', 'hover');
              
              if (starRating <= selectedRating) {
                  star.classList.add('active');
              }
          });
      }
      
      // Highlight stars on hover
      function highlightStars(rating) {
          const starInputs = component.shadowRoot.querySelectorAll('.star-input');
          
          starInputs.forEach((star, index) => {
              const starRating = index + 1;
              star.classList.remove('hover');
              
              if (starRating <= rating) {
                  star.classList.add('hover');
              }
          });
      }
      
      // Submit review
      async function submitReview() {
          if (!currentVetrinaForReviews || selectedRating === 0) {
              showError('Seleziona una valutazione prima di inviare la recensione.');
              return;
          }
      
          const comment = component.shadowRoot.getElementById ('reviewComment').value.trim();
          if (!comment) {
              showError('Inserisci un commento per la tua recensione.');
              return;
          }
      
          try {
              
              const token = localStorage.getItem('authToken');
              if (!token) {
                  console.error('No auth token found');
                  showError('Sessione scaduta. Effettua nuovamente l\'accesso.');
                  return;
              }
      
              const response = await fetch(`${API_BASE}/vetrine/${currentVetrinaForReviews}/reviews`, {
                  method: 'POST',
                  headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                      rating: selectedRating,
                      review_text: comment
                  })
              });
      
              if (response.ok) {
                  const data = await response.json();
                  const message = data.msg === 'Review updated' ? 'Recensione aggiornata con successo!' : 'Recensione inviata con successo!';
                  showStatus(message, 'success');
                  hideAddReviewForm();
                  
                  // Reload reviews to show the new one
                  await loadReviewsForVetrina(currentVetrinaForReviews);
                  updateReviewsOverlay();
                  
                  // Update the rating display in the search results
                  updateVetrinaRatingInSearch(currentVetrinaForReviews);
              } else if (response.status === 401) {
                  console.error('Authentication failed');
                  localStorage.removeItem('authToken');
                  localStorage.removeItem('currentUser');
                  showError('Sessione scaduta. Effettua nuovamente l\'accesso.');
                  return;
              } else {
                  const errorData = await response.json();
                  showError(errorData.message || 'Errore nell\'invio della recensione.');
              }
          } catch (error) {
              console.error('Error submitting review:', error);
              showError('Errore di connessione. Riprova più tardi.');
          }
      }
      
      // Delete user review
      async function deleteUserReview() {
          if (!currentVetrinaForReviews) {
              console.error('No vetrina ID for reviews');
              return;
          }
          
          // Check if user is authenticated
          const token = localStorage.getItem('authToken');
          const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
          
          if (!token || !currentUser) {
              console.error('User not authenticated');
              showError('Sessione scaduta. Effettua nuovamente l\'accesso.');
              return;
          }
      
          if (!confirm('Sei sicuro di voler eliminare la tua recensione?')) {
              return;
          }
      
          try {
              
              const token = localStorage.getItem('authToken');
              if (!token) {
                  console.error('No auth token found');
                  showError('Sessione scaduta. Effettua nuovamente l\'accesso.');
                  return;
              }
      
              const response = await fetch(`${API_BASE}/vetrine/${currentVetrinaForReviews}/reviews`, {
                  method: 'DELETE',
                  headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                  }
              });
      
              if (response.ok) {
                  showStatus('Recensione eliminata con successo!', 'success');
                  
                  // Reload reviews
                  await loadReviewsForVetrina(currentVetrinaForReviews);
                  updateReviewsOverlay();
                  
                  // Update the rating display in the search results
                  updateVetrinaRatingInSearch(currentVetrinaForReviews);
              } else if (response.status === 401) {
                  console.error('Authentication failed');
                  localStorage.removeItem('authToken');
                  localStorage.removeItem('currentUser');
                  showError('Sessione scaduta. Effettua nuovamente l\'accesso.');
                  return;
              } else {
                  const errorData = await response.json();
                  showError(errorData.message || 'Errore nell\'eliminazione della recensione.');
              }
          } catch (error) {
              console.error('Error deleting review:', error);
              showError('Errore di connessione. Riprova più tardi.');
          }
      }
      
      // Update vetrina rating in search results
      function updateVetrinaRatingInSearch(vetrinaId) {
          const ratingElements = component.shadowRoot.querySelectorAll(`[data-vetrina-id="${vetrinaId}"] .rating-badge`);
          
          ratingElements.forEach(element => {
              // Reload the rating data for this vetrina
              const vetrina = currentVetrine.find(v => v.id === vetrinaId);
              if (vetrina) {
                  const ratingScore = element.querySelector('.rating-score');
                  const ratingCount = element.querySelector('.rating-count');
                  const ratingStars = element.querySelector('.rating-stars');
                  
                  if (ratingScore) ratingScore.textContent = vetrina.average_rating?.toFixed(1) || '0.0';
                  if (ratingCount) ratingCount.textContent = `(${vetrina.review_count || 0})`;
                  if (ratingStars) ratingStars.innerHTML = generateFractionalStars(vetrina.average_rating || 0);
              }
          });
      }
      
      // Reviews initialization is now handled in initializeStaticComponents()
      
      // Global variable to track AI search state
      this.aiSearchEnabled = false;
      
      // Initialize AI Search Toggle
      function initializeAISearchToggle() {
          const aiToggle = component.shadowRoot.getElementById ('aiSearchToggle');
          const toggleInput = component.shadowRoot.getElementById ('toggle');
          const searchBar = component.shadowRoot.querySelector('.search-bar');
          const searchInput = component.shadowRoot.getElementById ('searchInput');
          
          // Debug element availability
          console.log('🔍 AI search elements check:', {
              aiToggle: !!aiToggle,
              toggleInput: !!toggleInput,
              searchBar: !!searchBar,
              searchInput: !!searchInput
          });
          
          if (!aiToggle || !toggleInput) {
              console.error('❌ AI search elements not found in shadow DOM');
              throw new Error('AI search elements not found');
          }
          
          console.log('✅ AI search toggle initialized');
          
          // Load saved state from localStorage
          const savedState = component.getStorageItem('ai_search');
          if (savedState === 'true') {
              aiSearchEnabled = true;
              toggleInput.checked = true;
              searchBar.classList.add('ai-active');
              const searchBarBackground = component.shadowRoot.getElementById ('searchBarBackground');
              if (searchBarBackground) searchBarBackground.classList.add('ai-active');
              updateSearchPlaceholder(true);
          }
          
          // Toggle event handler
          toggleInput.addEventListener('change', function(e) {
              // Toggle state
              aiSearchEnabled = toggleInput.checked;
              
              // Update UI with enhanced visual feedback
              if (aiSearchEnabled) {
                  searchBar.classList.add('ai-active');
                  const searchBarBackground = component.shadowRoot.getElementById ('searchBarBackground');
                  if (searchBarBackground) searchBarBackground.classList.add('ai-active');
                  updateSearchPlaceholder(true);
                  updateTypewriterForAIMode();
                  if (searchInput.value.length === 0) resumeTypewriter();
                  // Add a subtle animation effect
                  aiToggle.style.transform = 'scale(1.1)';
                  setTimeout(() => {
                      aiToggle.style.transform = '';
                  }, 200);
                  showStatus('Ricerca semantica attivata! 🚀', 'success');
              } else {
                  searchBar.classList.remove('ai-active');
                  const searchBarBackground = component.shadowRoot.getElementById ('searchBarBackground');
                  if (searchBarBackground) searchBarBackground.classList.remove('ai-active');
                  updateSearchPlaceholder(false);
                  updateTypewriterForAIMode();
                  if (searchInput.value.length === 0) resumeTypewriter();
                  // Add a subtle animation effect
                  aiToggle.style.transform = 'scale(0.95)';
                  setTimeout(() => {
                      aiToggle.style.transform = '';
                  }, 200);
                  showStatus('Ricerca standard attivata', 'success');
              }
              
              // Save state to localStorage
              component.setStorageItem('ai_search', aiSearchEnabled.toString());
              
              // If there's a current search query, re-run the search with new mode
              const currentQuery = searchInput.value.trim();
              if (currentQuery) {
                  performSearch(currentQuery);
              }
          });
          
          // Keyboard shortcut: Ctrl+Shift+A to toggle AI search
          component.addGlobalEventListener(document, 'keydown', function(e) {
              if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                  e.preventDefault();
                  toggleInput.checked = !toggleInput.checked;
                  toggleInput.dispatchEvent(new Event('change'));
              }
          });
          
          // Add tooltip on hover
          aiToggle.addEventListener('mouseenter', function() {
              const tooltip = aiSearchEnabled ? 
                  'Disattiva ricerca semantica (Ctrl+Shift+A)' : 
                  'Attiva ricerca semantica (Ctrl+Shift+A)';
              aiToggle.title = tooltip;
          });
          
          // Initialize search input event listeners
          if (searchInput) {
              // Debounced search function
              const debouncedSearch = debounce(async (query) => {
                  await performSearch(query);
              }, 300);
              
              // Input event for real-time search
              searchInput.addEventListener('input', function(e) {
                  const query = e.target.value.trim();
                  if (query.length > 0) {
                      debouncedSearch(query);
                  } else {
                      // If search is cleared, load all files
                      loadAllFiles();
                  }
              });
              
              // Enter key to perform immediate search
              searchInput.addEventListener('keydown', function(e) {
                  if (e.key === 'Enter') {
                      e.preventDefault();
                      const query = e.target.value.trim();
                      if (query.length > 0) {
                          performSearch(query);
                      } else {
                          loadAllFiles();
                      }
                  }
              });
              
              // Focus event to show current mode
              searchInput.addEventListener('focus', function() {
                  if (aiSearchEnabled) {
                      showStatus('Modalità semantica attiva 🤖', 'success');
                  }
              });
          }
      }
      
      // Update search placeholder based on AI mode
      function updateSearchPlaceholder(aiEnabled) {
          const searchInput = component.shadowRoot.getElementById ('searchInput');
          if (!searchInput) return;
          
          if (aiEnabled) {
              searchInput.placeholder = 'Cerca con intelligenza semantica... (es. "concetti di fisica quantistica")';
          } else {
              searchInput.placeholder = 'Cerca una dispensa...';
          }
      }
      
      // Enhanced performSearch function with AI support
      async function performSearch(query) {
          try {
              // 🚀 DEVELOPMENT MODE: Check if we should bypass backend
              if (DEV_MODE_NO_RESULTS) {
                  console.log('🚀 DEV MODE: Bypassing backend search, showing no results');
                  showStatus('Modalità sviluppo: Nessun risultato di ricerca');
                  currentFiles = [];
                  renderDocuments([]);
                  return;
              }
              
              // Show loading cards immediately for search
              showLoadingCards();
              
              // Show search-specific loading message
              if (aiSearchEnabled) {
                  showStatus('Ricerca semantica in corso... 🤖', 'success');
                  // Add loading animation to toggle
                  const aiToggle = component.shadowRoot.getElementById ('aiSearchToggle');
                  if (aiToggle) {
                      aiToggle.classList.add('loading');
                  }
              } else {
                  showStatus('Ricerca standard in corso... 🔍');
              }
              
              // If no query, load all files with current filters
              if (!query || !query.trim()) {
                  await loadAllFiles();
                  return;
              }
              
              // Build search parameters based on search mode
              let searchParams;
              let endpoint;
              
              if (aiSearchEnabled) {
                  // Use new semantic search endpoint
                  endpoint = '/vetrine/search';
                  searchParams = new URLSearchParams();
                  searchParams.append('q', query.trim());
              } else {
                  // Use standard search endpoint
                  endpoint = '/vetrine';
                  searchParams = new URLSearchParams();
                  searchParams.append('text', query.trim());
              }
              
              // Add any active filters to the search
              // Backend-supported filters: course_name, faculty, canale, language, tag, extension, date_year, course_year
              if (component.filterManager.filters.course) {
                  const courseValue = Array.isArray(component.filterManager.filters.course) ? component.filterManager.filters.course[0] : component.filterManager.filters.course;
                  searchParams.append('course_name', courseValue);
              }
              if (component.filterManager.filters.faculty) {
                  const facultyValue = Array.isArray(component.filterManager.filters.faculty) ? component.filterManager.filters.faculty[0] : component.filterManager.filters.faculty;
                  searchParams.append('faculty', facultyValue);
              }
              if (component.filterManager.filters.canale) {
                  const canaleValue = Array.isArray(component.filterManager.filters.canale) ? component.filterManager.filters.canale[0] : component.filterManager.filters.canale;
                  const backendCanaleValue = canaleValue === 'Canale Unico' ? '0' : canaleValue;
                  searchParams.append('canale', backendCanaleValue);
              }
              if (component.filterManager.filters.language) {
                  const languageValue = Array.isArray(component.filterManager.filters.language) ? component.filterManager.filters.language[0] : component.filterManager.filters.language;
                  searchParams.append('language', languageValue);
              }
              if (component.filterManager.filters.tag) {
                  const tagValue = Array.isArray(component.filterManager.filters.tag) ? component.filterManager.filters.tag[0] : component.filterManager.filters.tag;
                  searchParams.append('tag', tagValue);
              }
              if (component.filterManager.filters.documentType) {
                  const docTypeValue = Array.isArray(component.filterManager.filters.documentType) ? component.filterManager.filters.documentType[0] : component.filterManager.filters.documentType;
                  searchParams.append('extension', docTypeValue);
              }
              if (component.filterManager.filters.academicYear) {
                  const yearValue = Array.isArray(component.filterManager.filters.academicYear) ? component.filterManager.filters.academicYear[0] : component.filterManager.filters.academicYear;
                  const year = yearValue.split('/')[0];
                  searchParams.append('date_year', year);
              }
              if (component.filterManager.filters.courseYear) {
                  const courseYearValue = Array.isArray(component.filterManager.filters.courseYear) ? component.filterManager.filters.courseYear[0] : component.filterManager.filters.courseYear;
                  searchParams.append('course_year', courseYearValue);
              }
              
              // Make backend search request with fallback
              let response;
              try {
                  response = await makeAuthenticatedRequest(`${endpoint}?${searchParams.toString()}`);
              } catch (error) {
                  console.warn('⚠️ Backend search failed:', error);
                  
                  // Remove loading state from toggle
                  const aiToggle = component.shadowRoot.getElementById ('aiSearchToggle');
                  if (aiToggle) {
                      aiToggle.classList.remove('loading');
                  }
                  
                  if (aiSearchEnabled) {
                      showStatus('Ricerca semantica non disponibile. Passaggio a ricerca standard...', 'error');
                      // Fallback to standard search
                      aiSearchEnabled = false;
                      const toggle = component.shadowRoot.getElementById ('aiSearchToggle');
                      const searchBar = component.shadowRoot.querySelector('.search-bar');
                      if (toggle) toggle.classList.remove('active');
                      if (searchBar) searchBar.classList.remove('ai-active');
                      updateSearchPlaceholder(false);
                      component.setStorageItem('ai_search', 'false');
                      
                      // Retry with standard search
                      await performSearch(query);
                      return;
                  } else {
                      showStatus('Ricerca backend non disponibile. Riprova più tardi.');
                      currentFiles = [];
                      renderDocuments([]);
                      return;
                  }
              }
          
              // Remove loading state from toggle
              const aiToggle = component.shadowRoot.getElementById ('aiSearchToggle');
              if (aiToggle) {
                  aiToggle.classList.remove('loading');
              }
          
              if (!response) {
                  console.warn('Empty response from backend, showing empty state');
                  currentFiles = [];
                  renderDocuments([]);
                  showStatus('Nessun risultato trovato');
                  return;
              }
              
              // Handle different response formats based on search mode
              let searchResults, totalCount, chunks;
              
              if (aiSearchEnabled) {
                  // New semantic search response format
                  searchResults = response.vetrine || [];
                  totalCount = response.count || searchResults.length;
                  chunks = response.chunks || {};
              } else {
                  // Standard search response format
                  searchResults = response.vetrine || [];
                  totalCount = response.count || searchResults.length;
              }
              
              // If backend search returns 0 results, show empty state
              if (searchResults.length === 0) {
                  currentFiles = [];
                  renderDocuments([]);
                  const searchMode = aiSearchEnabled ? 'semantica' : 'standard';
                  showStatus(`Nessun risultato trovato per "${query}" con ricerca ${searchMode} 🔍`);
                  
                  return;
              }
              
              // Transform backend vetrine results
              const transformedResults = searchResults.map(vetrina => {
                  const vetrineCard = {
                      id: vetrina.vetrina_id,
                      isVetrina: true,
                      filesLoaded: false,
                      fileCount: vetrina.file_count || 0,
                      filename: vetrina.file_count > 1 ? `${vetrina.file_count} files` : 'Documento',
                      title: vetrina.name || 'Vetrina Senza Nome',
                      description: vetrina.description || 'No description available',
                      size: 0,
                      price: vetrina.price || 0,
                      created_at: vetrina.created_at || new Date().toISOString(),
                      rating: vetrina.average_rating || 0,
                      review_count: vetrina.review_count || 0,
                      course_name: vetrina.course_instance?.course_name || extractCourseFromVetrina(vetrina.name),
                      faculty_name: vetrina.course_instance?.faculty_name || extractFacultyFromVetrina(vetrina.name),
                      language: vetrina.course_instance?.language || 'Italiano',
                      canale: vetrina.course_instance?.canale || 'A',
                      course_semester: vetrina.course_instance?.course_semester || 'Primo Semestre',
                      academic_year: `${vetrina.course_instance?.date_year || 2024}/${(vetrina.course_instance?.date_year || 2024) + 1}`,
                      document_types: [],
                      document_type: 'BUNDLE',
                      author_username: vetrina.author?.username || 'Unknown',
                      owned: false,
                      favorite: vetrina.favorite === true,
                      tags: vetrina.tags || [],
                      primary_tag: vetrina.tags && vetrina.tags.length > 0 ? vetrina.tags[0] : null,
                      vetrina_info: {
                          id: vetrina.vetrina_id,
                          name: vetrina.name,
                          description: vetrina.description,
                          course_instance_id: vetrina.course_instance?.course_instance_id,
                          owner_id: vetrina.author?.user_id,
                          owner_username: vetrina.author?.username || 'Unknown'
                      }
                  };
                  
                  // Add semantic search chunks if available
                  if (aiSearchEnabled && chunks && chunks[vetrina.vetrina_id]) {
                      vetrineCard.semanticChunks = chunks[vetrina.vetrina_id];
                      vetrineCard.hasSemanticResults = true;
                  }
                  
                  return vetrineCard;
              });
              
              // Apply any remaining client-side filters
              const filteredResults = applyClientSideFilters(transformedResults);
              
              // Update current files and render
              currentFiles = filteredResults;
              renderDocuments(filteredResults);
              
              // Debug position after search results
              setTimeout(() => debugPensatoTextPosition(), 200);
              
              // Show enhanced search results status
              const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
              const searchSummary = searchTerms.length > 1 
                  ? `"${searchTerms.join('" + "')}"` 
                  : `"${query}"`;
              
              const searchMode = aiSearchEnabled ? 'semantica' : 'standard';
              const aiIcon = aiSearchEnabled ? '🤖' : '🔍';
              
              if (totalCount > filteredResults.length) {
                  showStatus(`Trovati ${filteredResults.length} di ${totalCount} documenti per ${searchSummary} (${searchMode}) ${aiIcon}`);
              } else {
                  showStatus(`Trovati ${filteredResults.length} documenti per ${searchSummary} (${searchMode}) ${aiIcon}`);
              }
              
          } catch (error) {
              console.error('Search error:', error);
              
              // Remove loading state from toggle
              const aiToggle = component.shadowRoot.getElementById ('aiSearchToggle');
              if (aiToggle) {
                  aiToggle.classList.remove('loading');
              }
              
              showError('Errore durante la ricerca. Riprova più tardi.');
              renderDocuments(currentFiles);
          }
      }
      
      // ===========================
      // TYPEWRITER PLACEHOLDER ANIMATION
      // ===========================
      
      // Instance-specific typewriter state
      this.typewriterActive = true;
      this.typewriterPaused = false;
      this.typewriterTimeout = null;
      this.currentTypewriterIndex = 0;
      this.currentTypewriterSuggestions = this.standardSuggestions;
      
      this.setTypewriterSuggestions = function() {
          this.currentTypewriterSuggestions = this.aiSearchEnabled ? this.aiSuggestions : this.standardSuggestions;
      };
      
      this.clearTypewriterPlaceholder = function(input) {
          input.setAttribute('placeholder', '');
      };
      
      this.typewriterAddLetter = function(letter, input) {
          input.setAttribute('placeholder', input.getAttribute('placeholder') + letter);
          return new Promise(resolve => setTimeout(resolve, 60));
      };
      
      this.typewriterDeleteLetter = function(input) {
          let current = input.getAttribute('placeholder');
          if (current.length > 0) {
              input.setAttribute('placeholder', current.slice(0, -1));
          }
          return new Promise(resolve => setTimeout(resolve, 30));
      };
      
      this.typewriterPrintPhrase = async function(phrase, input) {
          this.clearTypewriterPlaceholder(input);
          for (let i = 0; i < phrase.length; i++) {
              if (!this.typewriterActive || this.typewriterPaused) return;
              await this.typewriterAddLetter(phrase[i], input);
          }
          // Wait before deleting
          await new Promise(resolve => setTimeout(resolve, 1200));
          // Delete letters
          for (let i = phrase.length - 1; i >= 0; i--) {
              if (!this.typewriterActive || this.typewriterPaused) return;
              await this.typewriterDeleteLetter(input);
          }
          await new Promise(resolve => setTimeout(resolve, 300));
      };
      
      this.typewriterRun = async function() {
          const input = component.shadowRoot.getElementById(getUniqueId('searchInput'));
          if (!input) return;
          this.setTypewriterSuggestions();
          while (this.typewriterActive) {
              if (this.typewriterPaused) {
                  await new Promise(resolve => setTimeout(resolve, 200));
                  continue;
              }
              const phrase = this.currentTypewriterSuggestions[this.currentTypewriterIndex];
              await this.typewriterPrintPhrase(phrase, input);
              this.currentTypewriterIndex = (this.currentTypewriterIndex + 1) % this.currentTypewriterSuggestions.length;
          }
      }
      
      this.startTypewriter = function() {
          this.typewriterActive = true;
          this.typewriterPaused = false;
          this.currentTypewriterIndex = 0;
          this.setTypewriterSuggestions();
          const input = component.shadowRoot.getElementById(getUniqueId('searchInput'));
          if (input) this.startTypewriterCursor(input);
          this.typewriterRun();
      };
      
      this.stopTypewriter = function() {
          this.typewriterActive = false;
          const input = component.shadowRoot.getElementById(getUniqueId('searchInput'));
          if (input) this.stopTypewriterCursor(input);
      };
      
      this.pauseTypewriter = function() {
          this.typewriterPaused = true;
          const input = component.shadowRoot.getElementById(getUniqueId('searchInput'));
          if (input) this.stopTypewriterCursor(input);
      };
      
      this.resumeTypewriter = function() {
          this.typewriterPaused = false;
          const input = component.shadowRoot.getElementById(getUniqueId('searchInput'));
          if (input && input.value.length === 0) this.startTypewriterCursor(input);
      };
      
      // Instance-specific cursor state
      this.typewriterCursorVisible = true;
      this.typewriterCursorInterval = null;
      
      this.TYPEWRITER_CURSOR_CHAR = '\u258F'; // ▍ Unicode block for a thick caret
      
      this.setTypewriterCursor = function(input, show) {
          let placeholder = input.getAttribute('placeholder') || '';
          if (show) {
              if (!placeholder.endsWith(this.TYPEWRITER_CURSOR_CHAR)) {
                  input.setAttribute('placeholder', placeholder + this.TYPEWRITER_CURSOR_CHAR);
              }
          } else {
              if (placeholder.endsWith(this.TYPEWRITER_CURSOR_CHAR)) {
                  input.setAttribute('placeholder', placeholder.slice(0, -1));
              }
          }
      };
      
      this.startTypewriterCursor = function(input) {
          if (this.typewriterCursorInterval) clearInterval(this.typewriterCursorInterval);
          this.typewriterCursorVisible = true;
          this.setTypewriterCursor(input, true);
          this.typewriterCursorInterval = setInterval(() => {
              this.typewriterCursorVisible = !this.typewriterCursorVisible;
              this.setTypewriterCursor(input, this.typewriterCursorVisible);
          }, 500);
      };
      
      this.stopTypewriterCursor = function(input) {
          if (this.typewriterCursorInterval) clearInterval(this.typewriterCursorInterval);
          this.typewriterCursorInterval = null;
          this.setTypewriterCursor(input, false);
      };
      
      this.clearTypewriterPlaceholderWithCursor = function(input) {
          input.setAttribute('placeholder', '');
      };
      
      this.typewriterAddLetterWithCursor = function(letter, input) {
          let base = input.getAttribute('placeholder') || '';
          if (base.endsWith(this.TYPEWRITER_CURSOR_CHAR)) base = base.slice(0, -1);
          input.setAttribute('placeholder', base + letter + (this.typewriterCursorVisible ? this.TYPEWRITER_CURSOR_CHAR : ''));
          return new Promise(resolve => setTimeout(resolve, 60));
      };
      
      this.typewriterDeleteLetterWithCursor = function(input) {
          let current = input.getAttribute('placeholder') || '';
          if (current.endsWith(this.TYPEWRITER_CURSOR_CHAR)) current = current.slice(0, -1);
          if (current.length > 0) {
              input.setAttribute('placeholder', current.slice(0, -1) + (this.typewriterCursorVisible ? this.TYPEWRITER_CURSOR_CHAR : ''));
          }
          return new Promise(resolve => setTimeout(resolve, 30));
      };
      
      this.typewriterPrintPhraseWithCursor = async function(phrase, input) {
          this.clearTypewriterPlaceholderWithCursor(input);
          this.startTypewriterCursor(input);
          for (let i = 0; i < phrase.length; i++) {
              if (!this.typewriterActive || this.typewriterPaused) { this.stopTypewriterCursor(input); return; }
              await this.typewriterAddLetterWithCursor(phrase[i], input);
          }
          // Wait before deleting
          await new Promise(resolve => setTimeout(resolve, 1200));
          // Delete letters
          for (let i = phrase.length - 1; i >= 0; i--) {
              if (!this.typewriterActive || this.typewriterPaused) { this.stopTypewriterCursor(input); return; }
              await this.typewriterDeleteLetterWithCursor(input);
          }
          await new Promise(resolve => setTimeout(resolve, 300));
          this.stopTypewriterCursor(input);
      };
      
      // ... existing code ...
      // In startTypewriter, after getting the input, start the cursor
      this.startTypewriter = function() {
          this.typewriterActive = true;
          this.typewriterPaused = false;
          this.currentTypewriterIndex = 0;
          this.setTypewriterSuggestions();
          const input = component.shadowRoot.getElementById(getUniqueId('searchInput'));
          if (input) this.startTypewriterCursor(input);
          this.typewriterRun();
      };
      
      // In stopTypewriter and pauseTypewriter, stop the cursor
      this.stopTypewriter = function() {
          this.typewriterActive = false;
          const input = component.shadowRoot.getElementById(getUniqueId('searchInput'));
          if (input) this.stopTypewriterCursor(input);
      };
      
      this.pauseTypewriterWithCursor = function() {
          this.typewriterPaused = true;
          const input = component.shadowRoot.getElementById(getUniqueId('searchInput'));
          if (input) this.stopTypewriterCursor(input);
      };
      
      this.resumeTypewriterWithCursor = function() {
          this.typewriterPaused = false;
          const input = component.shadowRoot.getElementById(getUniqueId('searchInput'));
          if (input && input.value.length === 0) this.startTypewriterCursor(input);
      };
      
      // ... existing code ...
      // In input event listeners, also stop the cursor when paused, and start when resumed
      // ... existing code ...
      
      // --- Pagine (Pages) Range Filter ---
      function initializePagesRangeFilter() {
          const minPagesRange = component.shadowRoot.getElementById ('minPagesRange');
          const maxPagesRange = component.shadowRoot.getElementById ('maxPagesRange');
          const minPagesValue = component.shadowRoot.getElementById ('minPagesValue');
          const maxPagesValue = component.shadowRoot.getElementById ('maxPagesValue');
          const pagesRangeFill = component.shadowRoot.getElementById ('pagesRangeFill');
      
          if (minPagesRange && maxPagesRange) {
              if (minPagesValue) minPagesValue.textContent = '1';
              if (maxPagesValue) maxPagesValue.textContent = '1000';
              updatePagesSliderFill();
      
              // Range slider events
              minPagesRange.addEventListener('input', handlePagesRangeChange);
              maxPagesRange.addEventListener('input', handlePagesRangeChange);
              minPagesRange.addEventListener('change', handlePagesRangeChange);
              maxPagesRange.addEventListener('change', handlePagesRangeChange);
          }
      }
      
      function handlePagesRangeChange() {
          const minPagesRange = component.shadowRoot.getElementById ('minPagesRange');
          const maxPagesRange = component.shadowRoot.getElementById ('maxPagesRange');
          const minPagesValue = component.shadowRoot.getElementById ('minPagesValue');
          const maxPagesValue = component.shadowRoot.getElementById ('maxPagesValue');
      
          let minVal = parseInt(minPagesRange.value);
          let maxVal = parseInt(maxPagesRange.value);
      
          if (minVal > maxVal) {
              minVal = maxVal;
              minPagesRange.value = minVal;
          }
          if (maxVal < minVal) {
              maxVal = minVal;
              maxPagesRange.value = maxVal;
          }
      
          // Update display values
          if (minPagesValue) minPagesValue.textContent = minVal;
          if (maxPagesValue) maxPagesValue.textContent = maxVal;
      
          updatePagesSliderFill();
          
          // Apply filters
          applyPagesFilters(minVal, maxVal);
      }
      
      function updatePagesSliderFill() {
          const minPagesRange = component.shadowRoot.getElementById ('minPagesRange');
          const maxPagesRange = component.shadowRoot.getElementById ('maxPagesRange');
          const pagesRangeFill = component.shadowRoot.getElementById ('pagesRangeFill');
      
          if (minPagesRange && maxPagesRange && pagesRangeFill) {
              const min = parseInt(minPagesRange.min);
              const max = parseInt(minPagesRange.max);
              const minVal = parseInt(minPagesRange.value);
              const maxVal = parseInt(maxPagesRange.value);
      
              const minPercent = ((minVal - min) / (max - min)) * 100;
              const maxPercent = ((maxVal - min) / (max - min)) * 100;
      
              pagesRangeFill.style.left = `${minPercent}%`;
              pagesRangeFill.style.width = `${maxPercent - minPercent}%`;
          }
      }
      
      
      
      function applyPagesFilters(minVal, maxVal) {
          component.filterManager.filters.minPages = minVal;
          component.filterManager.filters.maxPages = maxVal;
          
          updateBottomFilterCount();
          updateActiveFiltersDisplay();
          debouncedApplyFilters();
      }
      
      // ... existing code ...
      // In the main initialization section, call initializePagesRangeFilter()
      component.addGlobalEventListener(document, 'DOMContentLoaded', function() {
          // ... existing code ...
          initializePagesRangeFilter();
          // ... existing code ...
      });
      // ... existing code ...
      
      // ... existing code ...
          // Failsafe: always show price slider if 'Tutti' is active after initialization
          component.addGlobalEventListener(window, 'DOMContentLoaded', () => {
              const priceRangeContainer = component.shadowRoot.getElementById ('priceRangeContainer');
              const tuttiToggle = component.shadowRoot.querySelector('.price-toggle.active[data-price="all"]');
              if (tuttiToggle && priceRangeContainer) {
                  priceRangeContainer.style.display = 'block';
              }
          });
      // ... existing code ...
      
      // ... existing code ...
          // Failsafe: always show price slider if 'Tutti' is active after restoring filters
          setTimeout(() => {
              const priceRangeContainer = component.shadowRoot.getElementById ('priceRangeContainer');
              const tuttiToggle = component.shadowRoot.querySelector('.price-toggle.active[data-price="all"]');
              if (tuttiToggle && priceRangeContainer) {
                  priceRangeContainer.style.display = 'block';
              }
          }, 0);
      // ... existing code ...
      
      // ... existing code ...
          // Add pages range pill if min/max are set and not default values
          if ((component.filterManager.filters.minPages !== undefined || component.filterManager.filters.maxPages !== undefined) &&
              (component.filterManager.filters.minPages !== 1 || component.filterManager.filters.maxPages !== 1000)) {
              const minPages = component.filterManager.filters.minPages !== undefined ? component.filterManager.filters.minPages : 1;
              const maxPages = component.filterManager.filters.maxPages !== undefined ? component.filterManager.filters.maxPages : 1000;
              filterPills.push(`
                  <div class="filter-pill" data-filter-key="pagesRange">
                      <span class="filter-pill-label">Pagine:</span>
                      <span class="filter-pill-value">${minPages}-${maxPages}</span>
                      <span class="filter-pill-remove" data-action="remove-filter" data-filter-key="pagesRange"></span>
                  </div>
              `);
          }
      // ... existing code ...
      
      // ... existing code ...
          // Faculty filter
          const facultyInput = component.shadowRoot.getElementById ('facultyFilter');
          if (facultyInput) {
              facultyInput.addEventListener('change', (e) => {
                  component.filterManager.setFilter('faculty', e.target.value);
              });
          }
          // Course filter
          const courseInput = component.shadowRoot.getElementById ('courseFilter');
          if (courseInput) {
              courseInput.addEventListener('change', (e) => {
                  component.filterManager.setFilter('course', e.target.value);
              });
          }
          // Canale filter
          const canaleInput = component.shadowRoot.getElementById ('canaleFilter');
          if (canaleInput) {
              canaleInput.addEventListener('change', (e) => {
                  component.filterManager.setFilter('canale', e.target.value);
              });
          }
          // Price range sliders
          const minPriceRange = component.shadowRoot.getElementById ('minPriceRange');
          const maxPriceRange = component.shadowRoot.getElementById ('maxPriceRange');
          if (minPriceRange && maxPriceRange) {
              const updatePrice = () => {
                  const min = parseInt(minPriceRange.value, 10);
                  const max = parseInt(maxPriceRange.value, 10);
                  component.filterManager.setFilter('priceRange', [min, max]);
              };
              minPriceRange.addEventListener('input', updatePrice);
              maxPriceRange.addEventListener('input', updatePrice);
          }
          // Pages range sliders
          const minPagesRange = component.shadowRoot.getElementById ('minPagesRange');
          const maxPagesRange = component.shadowRoot.getElementById ('maxPagesRange');
          if (minPagesRange && maxPagesRange) {
              const updatePages = () => {
                  const min = parseInt(minPagesRange.value, 10);
                  const max = parseInt(maxPagesRange.value, 10);
                  component.filterManager.setFilter('minPages', min);
                  component.filterManager.setFilter('maxPages', max);
              };
              minPagesRange.addEventListener('input', updatePages);
              maxPagesRange.addEventListener('input', updatePages);
          }
          // Rating filter (example for stars)
          component.shadowRoot.querySelectorAll('.rating-star-filter').forEach(star => {
              star.addEventListener('click', (e) => {
                  const rating = parseInt(star.getAttribute('data-rating'), 10);
                  component.filterManager.setFilter('minRating', rating);
              });
          });
          // Toggle groups (example for priceType)
          component.shadowRoot.querySelectorAll('.price-toggle').forEach(toggle => {
              toggle.addEventListener('click', (e) => {
                  component.filterManager.setFilter('priceType', toggle.getAttribute('data-price'));
              });
          });
          // Clear all button
          const clearAllBtn = component.shadowRoot.getElementById ('clearAllFilters');
          if (clearAllBtn) {
              clearAllBtn.addEventListener('click', () => {
                  component.filterManager.filters = {};
                  component.filterManager.updateActiveFiltersDisplay();
              });
          }
          // Pills are handled by FilterManager.createFilterPill
      // ... existing code ...
      
      // Start the component initialization
      initializeComponent();
    }
  
    render() {
      // Helper function to generate unique IDs for this instance
      const getUniqueId = (baseId) => `${baseId}-${this.instanceId}`;
      
      const template = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
          
          /* Reset & Foundation */
          *,
          *::before,
          *::after {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
          }
          
          .material-symbols-outlined {
              font-family: 'Material Symbols Outlined', 'Material Icons', sans-serif;
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
          
          /* Enhanced fallback for Material Icons when font doesn't load */
          .material-symbols-outlined:not([style*="font-family"]) {
              font-family: 'Material Icons', 'Material Symbols Outlined', sans-serif;
          }
          
          /* Additional fallback for common icons when font fails to load */
          .material-symbols-outlined::before {
              /* This will be overridden by the actual font, but provides fallback */
              font-family: 'Material Symbols Outlined', 'Material Icons', sans-serif;
          }
          
          /* Design System - Fixed for Shadow DOM */
          :host {
              /* BACKGROUND TRANSITION CONTROL */
              --bg-transition-point: 70vh; /* Change this value to control where blue background starts */
              
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
              
              /* Shadows - Professional grade */
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
              --radius-4xl: 32px;
              --radius-full: 9999px;
              
              /* Transitions */
              --ease-1: cubic-bezier(0.25, 0.46, 0.45, 0.94);
              --ease-2: cubic-bezier(0.165, 0.84, 0.44, 1);
              --ease-3: cubic-bezier(0.19, 1, 0.22, 1);
              --ease-4: cubic-bezier(0.23, 1, 0.32, 1);
              --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
              --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
              
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
              
              /* Background removed for component version */
              
              /* Search Bar Toggle Switch :after Pseudo-element */
              --search-bar-toggle-after: '';
          
          }
          
          /* Ensure CSS variables are inherited by all elements in shadow DOM */
          *, *::before, *::after {
              /* Inherit CSS variables from :host */
          }
          
          /* Background preload removed for component version */
          
          /* Base Styles */
          html {
              scroll-behavior: smooth;
              font-size: 16px;
          }
          
          body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(to right, #9ddafd, #84d0fc, #9ddafd);
              color: var(--gray-900);
              line-height: 1.6;
              min-height: 100vh;
              height: 100%;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1, 'ss01' 1;
              letter-spacing: -0.011em;
              overflow-x: hidden;
              position: relative;
          }
          
          /* Ensure filters panel is never affected by parent container issues */
          body.filters-open {
              position: relative !important;
          }
          
          html {
              height: 100%;
          }
          
          /* Hide scrollbar for webkit browsers */
          body::-webkit-scrollbar {
              display: none;
          }
          
          /* Hide scrollbar for Firefox */
          html {
              scrollbar-width: none;
          }
          
          /* Background image element removed for component version */
          
          /* Header removed for component version */
          
          /* Logo styles removed for component version */
          
          /* Navigation menu styles removed for component version */
          
          /* Auth buttons and user info styles removed for component version */
          
          /* Header user avatar styles removed for component version */
          
          /* Login button styles removed for component version */
          
          /* Responsive login button styles and user/logout styles removed for component version */
          
          .main-content {
              /* --sticky-top-offset is set by JavaScript */
              --sticky-top-offset: 10px; /* Default fallback value */
              padding-top: 100px;
              min-height: calc(100vh - 120px);
              position: relative;
              width: 100%;
              max-width: 100%;
          }
          
          /* Main Content - Dual Layout System */
          .main-content {
              min-height: calc(100vh - 120px);
              position: relative;
              width: 100%;
              max-width: 100%;
          }
          
          /* Initial Search Section - Centered Layout */
          .search-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              margin-top: 0;
              padding: var(--space-12);
              text-align: center;
              position: relative;
              width: 100%;
              max-width: 100%;
          }
          
          /* Loading state - remove excess height */
          .search-section.loading {
              min-height: auto; /* Let content determine height */
              height: auto; /* Auto height based on content */
          }
          
          /* When there are results, keep title and subtitle centered but adjust layout */
          .search-section.has-results {
              justify-content: flex-start;
              align-items: center;
              text-align: center;
              width: 100%;
              max-width: 100%;
          }
          
          /* Empty state styling - Professional and Stunning */
          /* ==================== UNIFIED LOADING AND NO-RESULTS STATE ==================== */
          
          /* Base grid container - consistent for all states */
          .documents-grid {
              padding-top: 10px;
              margin-top: var(--space-2);
              margin-bottom: 40px;
              display: grid;
              grid-template-columns: repeat(8, minmax(0, 1fr));
              gap: var(--space-5);
              max-width: 2400px; /* Increased max-width for 8 cards */
              position: relative;
              z-index: 2;
              transform: translate3d(0, 0, 0);
              backface-visibility: hidden;
              contain: layout;
              margin-left: auto;
              margin-right: auto;
          }
          
          /* Loading state - remove min-height to prevent excess space */
          .documents-grid.loading {
              min-height: auto; /* Let content determine height */
              height: auto; /* Auto height based on content */
          }
          
          /* Loading cards - always maintain their position */
          .document-card.loading-card {
              /* Standard grid item - no special positioning */
              position: relative;
              opacity: 1;
              visibility: visible;
              transition: opacity 0.3s ease;
          }
          
          /* When in no-results state, completely remove loading cards from layout */
          .documents-grid.no-results-state .document-card.loading-card {
              display: none !important; /* Completely remove from layout */
              opacity: 0 !important; /* Force invisible */
              visibility: hidden !important; /* Hide but keep space */
              pointer-events: none;
              z-index: 1; /* Behind overlay */
              /* Override any animations or transitions */
              animation: none !important;
              transition: none !important;
          }
          
          /* No-results overlay - positioned to take full available space without constraints */
          .documents-grid .no-results {
              display: none; /* Hidden by default */
              position: relative; /* Changed from absolute to avoid parent constraints */
              width: 100%;
              max-width: 100%;
              z-index: 100; /* High z-index to ensure it appears above everything */
              
              /* Flexbox centering for proper text display */
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              
              /* Reduced padding, especially top padding to bring icon closer */
              padding: var(--space-6) var(--space-6) var(--space-10) var(--space-6);
              
              /* Allow content to expand freely */
              min-height: 350px;
              height: auto;
              
              /* Ensure proper spacing for text content */
              box-sizing: border-box;
          }
          
          /* Ensure proper height and layout for no-results state */
          .documents-grid.no-results-state {
              min-height: 400px; /* Reduced height for better proportions */
              grid-template-columns: 1fr; /* Single column to prevent grid constraints */
              display: flex; /* Change to flex for better centering */
              justify-content: center;
              align-items: center;
          }
          
          /* CRITICAL: Force hide ALL loading cards in no-results state with maximum specificity */
          .documents-grid.no-results-state .document-card.loading-card,
          .documents-grid.no-results-state .document-card.loading,
          .documents-grid.no-results-state .loading-card {
              display: none !important;
              opacity: 0 !important;
              visibility: hidden !important;
              pointer-events: none !important;
              position: absolute !important;
              left: -9999px !important;
              top: -9999px !important;
              height: 0 !important;
              width: 0 !important;
              min-height: 0 !important;
              max-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              overflow: hidden !important;
          }
          
          /* Show no-results overlay when in no-results state */
          .documents-grid.no-results-state .no-results {
              display: flex;
              /* Make it visible and properly sized */
              opacity: 1;
              visibility: visible;
              transform: scale(1);
              pointer-events: auto;
          }
          
          /* No-results content styling */
          .no-results .material-symbols-outlined {
              font-size: 4rem;
              color: var(--text-muted);
              margin-bottom: var(--space-4);
          }
          
          .no-results h3 {
              color: var(--text-primary);
              margin-bottom: var(--space-3);
              font-size: 1.5rem;
              font-weight: 600;
          }
          
          .no-results p {
              color: var(--text-secondary);
              max-width: 600px; /* Allow more space for text */
              line-height: 1.6;
              margin: 0 auto;
              padding: 0 var(--space-2); /* Reduce horizontal padding */
              box-sizing: border-box;
              /* Allow text to wrap naturally without constraints */
              word-wrap: break-word;
              hyphens: auto;
          }
          
          /* Search section adjustments - keep minimal */
          .search-section.no-results-state {
              /* Don't change layout - just maintain current state */
          }
          
          /* Loading state specific adjustments */
          .documents-grid.loading {
              /* Same as base - no changes needed */
          }
          
          /* Remove old problematic selectors */
          .loading-placeholder {
              display: none; /* Not needed with new approach */
          }
          
          /* Ensure smooth transitions */
          .documents-grid {
              transition: all 0.3s ease;
          }
          
          .documents-grid .no-results {
              transition: opacity 0.3s ease, backdrop-filter 0.3s ease;
          }
          
          /* Removed pseudo-elements for cleaner design */
          
          .no-results .material-symbols-outlined {
              font-size: 80px;
              background: linear-gradient(135deg, var(--blue-500), var(--purple-500));
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin-bottom: var(--space-4); /* Reduced spacing from space-8 to space-4 */
              position: relative;
              z-index: 2;
              filter: drop-shadow(0 4px 8px rgba(14, 165, 233, 0.2));
              animation: float 3s ease-in-out infinite;
              width: 100%;
              text-align: center;
          }
          
          @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-8px); }
          }
          
          .no-results h3 {
              font-size: 32px;
              font-weight: 700;
              background: linear-gradient(135deg, var(--gray-800), var(--gray-700));
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin-bottom: var(--space-4); /* Reduced from space-6 to space-4 */
              font-family: 'Inter', sans-serif;
              letter-spacing: -0.02em;
              position: relative;
              z-index: 2;
              width: 100%;
              text-align: center;
              max-width: 100%;
              margin-left: auto;
              margin-right: auto;
              padding: 0;
              box-sizing: border-box;
          }
          
          .no-results p {
              font-size: 18px;
              color: var(--gray-600);
              line-height: 1.8; /* Increased line height for better readability */
              font-family: 'Inter', sans-serif;
              font-weight: 400;
              max-width: 800px; /* Reduced from 800px for more restricted space on normal screens */
              margin: 0 auto;
              position: relative;
              z-index: 2;
              width: auto; /* Let content determine width up to max-width */
              text-align: center;
              padding: 0; /* Remove padding to maximize text space */
              box-sizing: border-box;
              /* Improved text wrapping and spacing */
              word-wrap: break-word;
              hyphens: auto;
              white-space: normal; /* Ensure text wraps normally */
          }
          
          
          
          @keyframes pulse {
              0%, 100% { 
                  transform: scale(1);
                  opacity: 0.3;
              }
              50% { 
                  transform: scale(1.2);
                  opacity: 0.6;
              }
          }
          
          /* Loading state placeholders to maintain correct positioning */
          .loading-placeholder {
              height: 0;
              margin: 0;
              padding: 0;
              visibility: hidden;
              pointer-events: none;
              grid-column: 1 / -1;
              width: 100%;
          }
          
          /* Layout debugging removed - issue fixed */
          
          /* Keep loading cards visible in no-results-state to show loading animation */
          .documents-grid.no-results-state .document-card.loading {
              display: none !important; /* Completely remove from layout */
              visibility: hidden;
              pointer-events: none;
              opacity: 0; /* Completely invisible */
          }
          
          /* Debug boundaries removed - issue fixed */
          
          /* Debug indicators removed - issue fixed */
          
          /* Debug dimensions removed - issue fixed */
          
          /* Debug layout info removed - issue fixed */
          
          .loading-placeholder.document-count {
              height: 60px; /* Approximate height of document count container */
              margin-bottom: var(--space-4);
              margin-top: calc(-1 * var(--space-2)); /* Move up a bit */
          }
          
          .loading-placeholder.active-filters {
              height: 40px; /* Approximate height of active filters display */
              margin-bottom: var(--space-4);
              margin-top: calc(-1 * var(--space-1)); /* Move up a bit */
          }
          
          /* When loading, change grid to flexbox to stack placeholders above cards */
          .documents-grid.loading {
              /* Keep the grid layout during loading */
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: var(--space-5);
          }
          
          .documents-grid.loading .document-card {
              /* Ensure cards maintain proper grid sizing */
              width: 100%;
              min-width: 300px;
          }
          
          /* Responsive adjustments for empty state */
          @media (max-width: 768px) {
              .no-results {
                  padding: var(--space-4) var(--space-3) var(--space-6) var(--space-3); /* Further reduced padding */
                  margin: 0 auto;
                  max-width: 100%;
                  width: 100%;
                  min-height: 300px; /* Smaller min-height for mobile */
                  height: auto;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center; /* Center alignment for proper text display */
              }
              
              .documents-grid.no-results-state {
                  min-height: 350px; /* Adjust container height for mobile */
              }
          }
              
              .documents-grid.no-results-state .no-results {
                  display: flex;
              }
              
              .no-results .material-symbols-outlined {
                  font-size: clamp(48px, 8vw, 64px);
                  margin-bottom: var(--space-3); /* Reduced spacing */
                  width: 100%;
                  text-align: center;
              }
              
              .no-results h3 {
                  font-size: clamp(20px, 5vw, 28px);
                  margin-bottom: var(--space-3);
                  width: 100%;
                  text-align: center;
                  max-width: 100%;
                  margin-left: auto;
                  margin-right: auto;
                  padding: 0 var(--space-3);
                  box-sizing: border-box;
              }
              
              .no-results p {
                  font-size: clamp(14px, 3.5vw, 16px);
                  max-width: 95%; /* Allow even more space on mobile */
                  width: auto; /* Let content determine width */
                  text-align: center;
                  line-height: 1.7; /* Improved line height for mobile */
                  padding: 0; /* Remove all padding for maximum text space */
                  box-sizing: border-box;
                  /* Improved text wrapping and spacing */
                  word-wrap: break-word;
                  hyphens: auto;
                  white-space: normal;
              }
              
          
              
              .search-section.no-results-state {
                  padding-top: 0;
                  min-height: auto; /* Let natural height prevail */
              }
              
              /* Search title and subtitle styles removed for component version */
              
              .search-section.no-results-state .search-container {
                  margin-bottom: var(--space-4);
              }
          
          @media (max-width: 480px) {
              .no-results {
                  padding: var(--space-3) var(--space-2) var(--space-5) var(--space-2); /* Minimal padding for small screens */
                  margin: 0 auto;
                  border-radius: 0;
                  max-width: 100%;
                  width: 100%;
                  min-height: 250px; /* Even smaller for small screens */
                  height: auto;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center; /* Center alignment for proper text display */
              }
              
              .documents-grid.no-results-state {
                  min-height: 300px; /* Compact height for small screens */
              }
              
              .documents-grid.no-results-state .no-results {
                  display: flex;
              }
              
              .no-results .material-symbols-outlined {
                  font-size: clamp(40px, 10vw, 56px);
                  margin-bottom: var(--space-2); /* Even more reduced spacing for small screens */
                  width: 100%;
                  text-align: center;
              }
              
              .no-results h3 {
                  font-size: clamp(18px, 6vw, 24px);
                  margin-bottom: var(--space-2);
                  width: 100%;
                  text-align: center;
                  max-width: 100%;
                  margin-left: auto;
                  margin-right: auto;
                  padding: 0 var(--space-2);
                  box-sizing: border-box;
              }
              
              .no-results p {
                  font-size: clamp(13px, 4vw, 15px);
                  line-height: 1.6; /* Better line height for small screens */
                  max-width: 98%; /* Maximum available space on small screens */
                  width: auto; /* Let content determine width */
                  text-align: center;
                  padding: 0; /* Remove all padding for maximum text space */
                  box-sizing: border-box;
                  word-wrap: break-word;
                  hyphens: auto;
                  white-space: normal;
              }
              
          
              
              .search-section.no-results-state {
                  padding-top: 0;
                  min-height: auto; /* Let natural height prevail */
              }
          }
          
          /* Search title and subtitle removed for component version */
          
          .search-container-wrapper {
              /* The wrapper is now back inside search-section. */
              width: fit-content;
              margin-top: 0px auto; /* Restore the original spacing between subtitle and search bar. */
          
              position: sticky;
              top: 16px; /* Fixed absolute value - 16px from top of viewport */
              z-index: 9997; /* Lower z-index to not block sort button */
          
              /* The background and padding are only applied when it's stuck. */
              transition: all 0.3s ease-in-out;
              pointer-events: none; /* Make wrapper non-clickable */
              
              /* Ensure sticky positioning works properly */
              /* transform: translateZ(0); - Removed as it can interfere with sticky positioning */
          }
          
          /* Re-enable pointer events for interactive elements within search wrapper */
          .search-container-wrapper .search-container,
          .search-container-wrapper .search-bar,
          .search-container-wrapper .search-input,
          .search-container-wrapper .filters-btn,
          .search-container-wrapper .toggle-label {
              pointer-events: auto;
          }
          
          /* Search Container - Compact for Header */
          .search-container {
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: row;
              gap: var(--space-3);
              width: 100%;
              max-width: 600px;
              margin: 0 auto;
              flex-wrap: nowrap;
              z-index: 9997; /* High z-index for search container */
          }
          
          /* Animated Border Search Bar Container */
          .search-bar-container {
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 60px;
              max-width: 410px;
              height: 100%;
              width: 100%;
              overflow: hidden;
              border-radius: 12px;
          }
          
          /* Border Animation Layers */
          .search-bar-container .glow,
          .search-bar-container .darkBorderBg,
          .search-bar-container .white,
          .search-bar-container .border {
              min-height: 60px;
              max-width: 410px;
              height: 100%;
              width: 100%;
              position: absolute;
              overflow: hidden;
              z-index: -1;
              border-radius: 12px;
              top: 0;
              left: 0;
          }
          
          /* White border layer */
          .search-bar-container .white {
              min-height: 53px;
              max-width: 417px;
              border-radius: 10px;
              filter: blur(1px);
          }
          
          .search-bar-container .white::before {
              content: "";
              z-index: -2;
              text-align: center;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(83deg);
              position: absolute;
              width: 423px;
              height: 67px;
              background-repeat: no-repeat;
              background-position: 0 0;
              filter: brightness(1.4);
              background-image: conic-gradient(
                  transparent 0%,
                  #a099d8,
                  transparent 8%,
                  transparent 50%,
                  #dfa2da,
                  transparent 58%
              );
              transition: all 2s;
          }
          
          /* Main border layer */
          .search-bar-container .border {
              min-height: 67px;
              min-width: 423px;
              border-radius: 11px;
              filter: blur(0.3px);
          }
          
          .search-bar-container .border::before {
              content: "";
              z-index: -2;
              text-align: center;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(70deg);
              position: absolute;
              width: 600px;
              height: 600px;
              filter: brightness(1.3);
              background-repeat: no-repeat;
              background-position: 0 0;
              background-image: conic-gradient(
                  transparent,
                  #402fb5 5%,
                  transparent 14%,
                  transparent 50%,
                  #cf30aa 60%,
                  transparent 64%
              );
              transition: all 2s;
          }
          
          /* Dark border background layer */
          .search-bar-container .darkBorderBg {
              min-height: 55px;
              max-width: 422px;
          }
          
          .search-bar-container .darkBorderBg::before {
              content: "";
              z-index: -2;
              text-align: center;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(82deg);
              position: absolute;
              width: 600px;
              height: 600px;
              background-repeat: no-repeat;
              background-position: 0 0;
              background-image: conic-gradient(
                  transparent,
                  #18116a,
                  transparent 10%,
                  transparent 50%,
                  #6e1b60,
                  transparent 60%
              );
              transition: all 2s;
          }
          
          /* Glow layer */
          .search-bar-container .glow {
              overflow: visible;
              will-change: filter;
              filter: blur(20px);
              opacity: 0.6;
              min-height: 120px;
              max-width: 464px;
              /* Safari-specific fixes for glow rendering */
              -webkit-transform: translate3d(0, 0, 0);
              transform: translate3d(0, 0, 0);
              -webkit-backface-visibility: hidden;
              backface-visibility: hidden;
          }
          
          /* Safari-specific CSS-only fix: Ensure glow renders immediately on page load */
          @supports (-webkit-appearance: none) {
              .search-bar-container .glow {
                  /* Force Safari to render the glow effect immediately */
                  -webkit-transform: translate3d(0, 0, 0) !important;
                  transform: translate3d(0, 0, 0) !important;
                  -webkit-backface-visibility: hidden !important;
                  backface-visibility: hidden !important;
                  will-change: filter, transform !important;
              }
              
              .search-bar-container .glow:before {
                  /* Ensure pseudo-element renders with proper properties in Safari */
                  -webkit-transform: translate(-50%, -50%) rotate(60deg) !important;
                  transform: translate(-50%, -50%) rotate(60deg) !important;
                  -webkit-backface-visibility: hidden !important;
                  backface-visibility: hidden !important;
                  will-change: transform !important;
                  opacity: 0.6 !important;
                  /* Force immediate rendering with a micro-animation */
                  -webkit-animation: safari-glow-force 0.01s ease-out;
                  animation: safari-glow-force 0.01s ease-out;
              }
          }
          
          @-webkit-keyframes safari-glow-force {
              0%, 100% { 
                  -webkit-transform: translate(-50%, -50%) rotate(60deg);
                  opacity: 0.6;
              }
          }
          
          @keyframes safari-glow-force {
              0%, 100% { 
                  transform: translate(-50%, -50%) rotate(60deg);
                  opacity: 0.6;
              }
          }
          
          .search-bar-container .glow:before {
              content: "";
              z-index: -2;
              text-align: center;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(60deg);
              position: absolute;
              width: 999px;
              height: 999px;
              background-repeat: no-repeat;
              background-position: 0 0;
              background-image: conic-gradient(
                  transparent,
                  #402fb5 5%,
                  transparent 38%,
                  transparent 50%,
                  #cf30aa 60%,
                  transparent 87%
              );
              transition: all 2s;
              /* Safari-specific fixes for pseudo-element rendering */
              -webkit-transform: translate(-50%, -50%) rotate(60deg);
              -webkit-backface-visibility: hidden;
              backface-visibility: hidden;
              will-change: transform;
          }
          
          /* Hover animations */
          .search-bar-container:hover > .darkBorderBg::before,
          .search-bar-container.safari-temp-hover > .darkBorderBg::before {
              -webkit-transform: translate(-50%, -50%) rotate(-98deg);
              transform: translate(-50%, -50%) rotate(-98deg);
          }
          
          .search-bar-container:hover > .glow::before,
          .search-bar-container.safari-temp-hover > .glow::before {
              -webkit-transform: translate(-50%, -50%) rotate(-120deg);
              transform: translate(-50%, -50%) rotate(-120deg);
          }
          
          .search-bar-container:hover > .white::before,
          .search-bar-container.safari-temp-hover > .white::before {
              -webkit-transform: translate(-50%, -50%) rotate(-97deg);
              transform: translate(-50%, -50%) rotate(-97deg);
          }
          
          .search-bar-container:hover > .border::before,
          .search-bar-container.safari-temp-hover > .border::before {
              -webkit-transform: translate(-50%, -50%) rotate(-110deg);
              transform: translate(-50%, -50%) rotate(-110deg);
          }
          
          /* Focus animations */
          .search-bar-container:focus-within > .darkBorderBg::before {
              transform: translate(-50%, -50%) rotate(442deg);
              transition: all 4s;
          }
          
          .search-bar-container:focus-within > .glow::before {
              transform: translate(-50%, -50%) rotate(420deg);
              transition: all 4s;
          }
          
          .search-bar-container:focus-within > .white::before {
              transform: translate(-50%, -50%) rotate(443deg);
              transition: all 4s;
          }
          
          .search-bar-container:focus-within > .border::before {
              transform: translate(-50%, -50%) rotate(430deg);
              transition: all 4s;
          }
          
          /* Search Bar - Updated for animated border */
          .search-bar {
              position: relative;
              display: flex;
              align-items: center;
              width: 400px;
              max-width: 400px;
              height: 44px;
              background: var(--white);
              border: none;
              border-radius: 20px;
              padding: 0 var(--space-4);
              transition: all 0.25s var(--ease-2);
              margin-top: 0;
              z-index: 9999; /* High z-index for search bar */
              backdrop-filter: none;
              -webkit-backdrop-filter: none;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          
          /* Animation keyframes for border rotation */
          @keyframes rotate {
              100% {
                  transform: translate(-50%, -50%) rotate(450deg);
              }
          }
          
          .search-bar::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, 
                  rgba(255, 255, 255, 0.8) 0%, 
                  rgba(244, 246, 248, 0.4) 100%);
              opacity: 0;
              transition: opacity 0.3s var(--ease-2);
              pointer-events: none;
              z-index: -1;
          }
          
          .search-bar:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          }
          
          .search-bar:hover::before {
              opacity: 0;
          }
          
          .search-bar:has(.search-input:focus) {
              transform: translateY(-2px);
              outline: none;
              box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          }
          
          .search-input {
              flex: 1;
              border: none;
              outline: none;
              font-size: 16px;
              font-weight: 400;
              color: var(--gray-900);
              background: transparent;
              letter-spacing: -0.011em;
              line-height: 1.5;
              position: relative;
              z-index: 30;
              padding-right: 50px; /* Space for toggle button without reducing input width */
          }
          
          .search-input:focus {
              outline: none;
          }
          
          .search-input::placeholder {
              color: var(--gray-500);
              font-weight: 400;
          }
          
          .search-btn {
              background: transparent;
              border: none;
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: var(--gray-500);
              cursor: pointer;
              border-radius: var(--radius-md);
              transition: all 0.2s var(--ease-2);
              margin-left: var(--space-2);
              position: relative;
              z-index: 1001;
          }
          
          .search-btn:hover {
              background: var(--gray-100);
              color: var(--gray-700);
              transform: scale(1.05);
          }
          
          .filters-btn {
              /* Consistent border styling */
              border: 1px solid var(--gray-200);
              border-radius: var(--radius-2xl);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: var(--space-2);
              padding: var(--space-2) var(--space-3);
              background: var(--white);
              font-family: 'Inter', sans-serif;
              font-size: 13px;
              font-weight: 600;
              color: var(--gray-700);
              cursor: pointer;
              transition: all 0.25s var(--ease-2);
              box-shadow: var(--shadow-lg);
              height: 44px;
              min-width: 85px;
              white-space: nowrap;
              position: relative;
              overflow: visible;
              margin-top: 0;
              opacity: 1;
              visibility: visible;
              z-index: 1001;
              margin-left: 8px;
          }
          
          .filters-btn::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, var(--white) 0%, var(--white) 100%);
              opacity: 0;
              transition: opacity 0.3s var(--ease-2);
              z-index: -1;
              border-radius: var(--radius-2xl);
          }
          
          .filters-btn:hover {
              border-color: var(--gray-300);
              transform: translateY(-2px);
              box-shadow: var(--shadow-xl);
          }
          
          .filters-btn:hover::before {
              opacity: 0;
          }
          
          .filters-btn .material-symbols-outlined {
              position: relative;
              z-index: 2;
              font-size: 18px;
              color: var(--gray-700);
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              width: auto;
              height: auto;
              margin: 0;
              padding: 0;
          }
          
          .filters-text {
              display: inline;
              font-size: 13px;
              font-weight: 600;
              color: var(--gray-700);
              margin-left: 0;
          }
          
          /* Order Dropdown Styles */
          .order-dropdown-container {
              position: relative;
              display: inline-block;
              z-index: 100000;
          }
          
          .order-btn {
              border: 1px solid var(--gray-200);
              border-radius: var(--radius-lg);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: var(--space-1);
              padding: var(--space-1) var(--space-2);
              background: var(--white);
              font-family: 'Inter', sans-serif;
              font-size: 12px;
              font-weight: 500;
              color: var(--gray-600);
              cursor: pointer;
              transition: all 0.2s var(--ease-2);
              box-shadow: var(--shadow-sm);
              height: 28px;
              min-width: 70px;
              white-space: nowrap;
              position: relative;
              overflow: hidden;
          }
          
          .order-btn:hover {
              border-color: var(--gray-300);
              transform: translateY(-1px);
              box-shadow: var(--shadow-md);
              color: var(--gray-700);
          }
          
          .order-btn .material-symbols-outlined {
              font-size: 14px;
              color: var(--gray-600);
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              width: auto;
              height: auto;
              margin: 0;
              padding: 0;
          }
          
          .order-btn .order-icon {
              width: 14px;
              height: 14px;
              color: var(--gray-600);
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
              padding: 0;
          }
          
          .sort-icon {
              width: 15px;
              height: 15px;
              color: var(--gray-600);
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 0px;
              transition: color 0.2s ease;
          }
          
          .order-btn:hover .sort-icon {
              color: var(--gray-700);
          }
          
          /* Dropdown arrow removed - no longer needed */
          
          .order-text {
              display: inline;
              font-size: 12px;
              font-weight: 500;
              color: var(--gray-600);
              margin-left: 0;
          }
          
          .order-dropdown-content {
              position: absolute;
              top: calc(100% + var(--space-2));
              right: 0;
              left: auto;
              background: var(--white);
              border: 1px solid var(--gray-200);
              border-radius: var(--radius-lg);
              box-shadow: var(--shadow-xl);
              min-width: 200px;
              z-index: 100001;
              opacity: 0;
              visibility: hidden;
              transform: translateY(-8px);
              transition: all 0.25s var(--ease-2);
              overflow: hidden;
          }
          
          .order-dropdown-content.open-upwards {
              /* No longer used: always open downwards */
          }
          
          .order-dropdown-container.open .order-dropdown-content,
          .order-dropdown-content.show {
              opacity: 1;
              visibility: visible;
              transform: translateY(0);
          }
          
          .order-option {
              display: flex;
              align-items: center;
              gap: var(--space-2);
              padding: var(--space-3) var(--space-4);
              font-size: 14px;
              color: var(--gray-700);
              cursor: pointer;
              transition: all 0.2s var(--ease-2);
              border-bottom: 1px solid var(--gray-100);
          }
          
          .order-option:last-child {
              border-bottom: none;
          }
          
          .order-option:hover {
              background: var(--gray-50);
              color: var(--gray-900);
          }
          
          .order-option.active {
              background: var(--primary);
              color: var(--gray-700);
          }
          
          .order-option .material-symbols-outlined {
              font-size: 18px;
              flex-shrink: 0;
          }
          
          .order-option .az-text {
              font-size: 14px;
              font-weight: 700;
              color: var(--gray-600);
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 18px;
              height: 18px;
              margin: 0;
              padding: 0;
              font-family: 'Inter', sans-serif;
              letter-spacing: -0.5px;
          }
          
          .order-option span {
              font-weight: 500;
          }
          
          
          
          .filter-count {
              position: absolute;
              top: -8px;
              right: -8px;
              z-index: 10;
              background: var(--gradient-primary);
              color: var(--white);
              font-size: 12px;
              font-weight: 700;
              padding: 3px 7px;
              border-radius: 12px;
              min-width: 20px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              transform: scale(0);
              transition: all 0.3s var(--ease-bounce);
              box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
              /* Ensure it's not clipped by button overflow */
              pointer-events: none;
              /* Make sure it's visible when active */
              opacity: 0;
              visibility: hidden;
          }
          
          .filter-count.active {
              transform: scale(1);
              opacity: 1;
              visibility: visible;
              animation: filterCountPop 0.4s var(--ease-bounce);
          }
          
          @keyframes filterCountPop {
              0% { transform: scale(0); }
              50% { transform: scale(1.2); }
              100% { transform: scale(1); }
          }
          
          /* Document Grid - STANDARDIZED LAYOUT - 4 COLUMNS */
          /* Document Count and Filters Display */
          .document-count-container {
              margin-top: calc(var(--space-8) + 40px - var(--space-2)); /* Compensate for loading placeholder negative margin */
              margin-left: 0;
              margin-bottom: var(--space-4);
              position: relative;
              z-index: 999; /* Higher than search wrapper to ensure clickability */
              width: 100%;
              max-width: none;
              text-align: left !important;
              padding-left: 0;
          }
          
          /* When filters overlay is active, reduce z-index so it appears below the overlay */
          .filters-overlay.active ~ .main-content .document-count-container,
          body.filters-open .document-count-container {
              z-index: 999
              ;
          }
          
          .document-count-and-filters {
              display: flex;
              align-items: center;
              gap: var(--space-4);
              flex-wrap: wrap;
              width: 100%;
              position: relative;
          }
          
          .document-count {
              flex: 1;
              min-width: 0;
          }
          
          .order-dropdown-container {
              margin-left: auto;
              flex-shrink: 0;
          }
          
          .active-filters-display {
              display: flex;
              flex-wrap: nowrap;
              overflow-x: auto;
              overflow-y: hidden;
              scroll-behavior: smooth;
              gap: var(--space-2);
              opacity: 0;
              transform: translateX(-8px);
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              flex: 0 0 auto;
              min-width: 0;
              width: 100%;
              box-sizing: border-box;
              margin-top: 8px;
              margin-bottom: -30px;
              white-space: nowrap;
              scrollbar-width: none; /* Firefox */
              /* Removed scroll-padding-left and scroll-snap-type for free scrolling */
          }
          
          .active-filters-display::-webkit-scrollbar {
              display: none;
          }
          
          .active-filters-display.visible {
              opacity: 1;
              transform: translateX(0);
          }
          
          .filter-pill {
              display: inline-flex;
              align-items: center;
              gap: var(--space-2);
              padding: 6px 12px;
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border: 1px solid #e2e8f0;
              border-radius: 20px;
              font-size: 0.75rem;
              font-weight: 500;
              color: #475569;
              cursor: pointer;
              transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
              position: relative;
              overflow: hidden;
              backdrop-filter: blur(8px);
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
              animation: filterPillSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              /* Scrolling properties */
              flex: 0 0 auto;
              min-width: max-content;
              white-space: nowrap;
              scroll-snap-align: start;
          }
          
          .filter-pill::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
              opacity: 0;
              transition: opacity 0.25s ease;
          }
          
          .filter-pill:hover {
              transform: translateY(-1px);
              border-color: #cbd5e1;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          }
          
          .filter-pill:hover::before {
              opacity: 1;
          }
          
          .filter-pill:active {
              transform: translateY(0);
              transition: transform 0.1s ease;
          }
          
          .filter-pill-label {
              font-weight: 600;
              color: #334155;
              position: relative;
              z-index: 1;
          }
          
          .filter-pill-value {
              font-weight: 500;
              color: #64748b;
              position: relative;
              z-index: 1;
          }
          
          .filter-pill-remove {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 14px;
              height: 14px;
              color: #dc2626;
              font-size: 12px;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s ease;
              position: relative;
              z-index: 1;
              margin-left: 4px;
              border-radius: 2px;
          }
          
          .filter-pill-remove:hover {
              color: #b91c1c;
              background: rgba(239, 68, 68, 0.1);
              transform: scale(1.1);
          }
          
          .filter-pill-remove::before {
              content: '×';
              font-size: 14px;
              line-height: 1;
              font-weight: 700;
          }
          
          /* Clear All Filters Button */
          .clear-all-filters-btn {
              display: inline-flex;
              align-items: center;
              gap: var(--space-2);
              padding: 8px 16px;
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border: 1px solid #e2e8f0;
              border-radius: 22px;
              font-size: 0.75rem;
              font-weight: 600;
              color: #64748b;
              cursor: pointer;
              transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
              position: relative;
              overflow: hidden;
              backdrop-filter: blur(8px);
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
              opacity: 0;
              transform: translateX(-12px);
              animation: clearAllSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards;
              /* Prevent squishing */
              flex: 0 0 auto;
              min-width: max-content;
              white-space: nowrap;
          }
          
          .clear-all-filters-btn::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, rgba(100, 116, 139, 0.1) 0%, rgba(71, 85, 105, 0.1) 100%);
              opacity: 0;
              transition: opacity 0.25s ease;
          }
          
          .clear-all-filters-btn:hover {
              transform: translateY(-1px);
              border-color: #cbd5e1;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
              color: #475569;
          }
          
          .clear-all-filters-btn:hover::before {
              opacity: 1;
          }
          
          .clear-all-filters-btn:active {
              transform: translateY(0);
              transition: transform 0.1s ease;
          }
          
          .clear-all-filters-btn .material-symbols-outlined {
              font-size: 14px;
              position: relative;
              z-index: 1;
          }
          
          .clear-all-filters-btn-text {
              position: relative;
              z-index: 1;
              text-transform: uppercase;
              letter-spacing: 0.025em;
          }
          
          /* Animations */
          @keyframes filterPillSlideIn {
              0% {
                  opacity: 0;
                  transform: translateY(-12px) scale(0.95);
              }
              100% {
                  opacity: 1;
                  transform: translateY(0) scale(1);
              }
          }
          
          @keyframes clearAllSlideIn {
              0% {
                  opacity: 0;
                  transform: translateX(-16px) scale(0.9);
              }
              100% {
                  opacity: 1;
                  transform: translateX(0) scale(1);
              }
          }
          
          @keyframes filterPillRemove {
              0% {
                  opacity: 1;
                  transform: scale(1);
              }
              50% {
                  transform: scale(1.05);
              }
              100% {
                  opacity: 0;
                  transform: scale(0.8) translateY(-8px);
              }
          }
          
          /* Responsive behavior */
          @media (max-width: 768px) {
              .document-count-and-filters {
                  gap: var(--space-3);
                  flex-direction: row;
                  align-items: center;
                  flex-wrap: wrap;
              }
              
              .document-count-section {
                  display: flex;
                  align-items: center;
                  gap: var(--space-3);
                  flex-shrink: 0;
              }
              
              .document-count {
                  font-size: 0.9rem;
              }
              
              .order-label {
                  font-size: 0.85rem !important;
                  margin-right: 4px;
              }
              
              .active-filters-display {
                  width: 100%;
                  justify-content: flex-start;
                  order: 3;
              }
              
              .filter-pill {
                  padding: 5px 10px;
                  font-size: 0.7rem;
              }
              
              .clear-all-filters-btn {
                  padding: 6px 12px;
                  font-size: 0.7rem;
              }
              
              .order-btn {
                  height: 26px;
                  min-width: 65px;
                  font-size: 11px;
                  flex-shrink: 0;
              }
              
              .order-btn .material-symbols-outlined {
                  font-size: 13px;
              }
              
              /* Dropdown arrow removed - no longer needed */
          }
          
          @media (max-width: 480px) {
              .document-count-and-filters {
                  gap: var(--space-2);
                  flex-direction: row;
                  align-items: center;
                  justify-content: space-between;
              }
              
              .document-count {
                  font-size: 0.8rem;
                  margin-bottom: 0;
              }
              
              .order-label {
                  font-size: 0.75rem !important;
                  margin-right: 2px;
              }
              
              .order-dropdown-container {
                  margin-left: auto;
                  align-self: flex-end;
              }
              
              .filter-pill {
                  padding: 4px 8px;
                  font-size: 0.65rem;
                  gap: var(--space-1);
              }
              
              .filter-pill-remove {
                  width: 14px;
                  height: 14px;
                  font-size: 9px;
              }
              
              .clear-all-filters-btn {
                  padding: 5px 10px;
                  font-size: 0.65rem;
                  gap: var(--space-1);
              }
          }
          
          .documents-grid {
              margin-top: var(--space-2);
              margin-bottom: 40px;
              display: grid;
              grid-template-columns: repeat(8, minmax(0, 1fr));
              gap: var(--space-5);
              max-width: 2400px; /* Increased max-width for 8 cards */
              position: relative;
              z-index: 2;
              transform: translate3d(0, 0, 0);
              backface-visibility: hidden;
              contain: layout;
              margin-left: auto;
              margin-right: auto;
          }
          
          .documents-grid.filters-open {
              /* No changes - documents stay exactly as they are */
          }
          
          /* Document Cards - IMPROVED LAYOUT WITH FLEXIBLE HEIGHT */
          .document-card {
              position: relative;
              background: var(--white);
              border: 1px solid var(--gray-200);
              border-radius: var(--radius-3xl);
              overflow: hidden;
              cursor: pointer;
              transition: transform 0.2s ease-out, 
                          box-shadow 0.2s ease-out,
                          border-color 0.2s ease-out;
              box-shadow: var(--shadow-md);
              transform: translate3d(0, 0, 0);
              transform-origin: center center;
              will-change: transform;
              backface-visibility: hidden;
              height: 560px;
              display: flex;
              flex-direction: column;
              contain: layout style paint;
              isolation: isolate;
              min-width: 0;
              width: 100%;
          }
          
          .document-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, 
                  rgba(255, 255, 255, 0.8) 0%, 
                  rgba(248, 250, 252, 0.6) 100%);
              opacity: 0;
              transition: opacity 0.2s ease-out;
              z-index: 1;
              border-radius: var(--radius-3xl);
              pointer-events: none;
              will-change: opacity;
          }
          
          .document-card:hover {
              transform: translate3d(0, -2px, 0) scale(1.002);
              border-color: var(--gray-300);
              box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.1);
          }
          
          .document-card:hover::before {
              opacity: 0.5;
          }
          
          /* Document Preview - STANDARDIZED ASPECT RATIO */
          .document-preview {
              position: relative;
              height: 240px;
              min-height: 240px;
              max-height: 240px;
              overflow: hidden;
              background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
              border-bottom: 1px solid var(--gray-200);
              z-index: 2;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
          }
          
          .document-preview img {
              max-width: 100%;
              max-height: 100%;
              width: auto;
              height: auto;
              object-fit: contain;
              object-position: center;
              transition: transform 0.2s ease-out;
              filter: contrast(1.02) saturate(0.98) brightness(1.02);
              will-change: transform;
              backface-visibility: hidden;
              transform: translate3d(0, 0, 0) scale(1);
              min-width: 0;
              min-height: 0;
          }
          
          .document-card:hover .document-preview img {
              transform: translate3d(0, 0, 0) scale(1.01);
              filter: contrast(1.03) saturate(1.01) brightness(1.03);
          }
          
          /* Preview Loading and Fallback States */
          .preview-loading,
          .preview-fallback {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, 
                  rgba(30, 41, 59, 0.9) 0%, 
                  rgba(51, 65, 85, 0.8) 100%);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: white;
              opacity: 1;
              font-size: 14px;
              font-weight: 500;
              text-align: center;
              padding: var(--space-4);
          }
          
          .preview-overlay {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, 
                  rgba(30, 41, 59, 0.9) 0%, 
                  rgba(51, 65, 85, 0.8) 100%);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: white;
              opacity: 1;
          }
          
          /* Preview Icon Styling */
          .preview-icon {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100%;
              color: var(--gray-600);
              transition: all 0.3s ease;
          }
          
          .document-card:hover .preview-icon {
              color: var(--gray-700);
              transform: translateY(-2px);
          }
          
          .document-icon {
              font-size: 56px;
              margin-bottom: var(--space-3);
              opacity: 0.9;
              transition: all 0.3s ease;
          }
          
          .document-card:hover .document-icon {
              font-size: 60px;
              opacity: 1;
          }
          
          .file-extension {
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
              opacity: 0.7;
              font-family: 'Inter', sans-serif;
              color: var(--gray-500);
          }
          
          .document-type {
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 2px;
              opacity: 0.8;
              font-family: 'Inter', sans-serif;
          }
          
          /* Professional Favorite Button */
          .favorite-button {
              position: absolute;
              top: var(--space-4);
              left: var(--space-4);
              background: transparent;
              border: none;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: transform 0.25s var(--ease-3);
              z-index: 10;
              opacity: 1;
              transform: scale(1);
              padding: 0;
              will-change: transform;
          }
          
          .favorite-button:hover {
              transform: scale(1.1);
          }
          
          .favorite-button .material-symbols-outlined {
              font-size: 28px;
              color: rgba(0, 0, 0, 0.4);
              font-variation-settings: 'FILL' 1, 'wght' 400;
              -webkit-text-stroke: 2px rgba(255, 255, 255, 1);
              text-stroke: 2px rgba(255, 255, 255, 1);
              filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.3));
              will-change: transform, color;
          }
          
          .favorite-button.active .material-symbols-outlined {
              color: var(--red-500);
              font-variation-settings: 'FILL' 1, 'wght' 600;
              -webkit-text-stroke: 2px rgba(255, 255, 255, 1);
              text-stroke: 2px rgba(255, 255, 255, 1);
              filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.3));
          }
          
          .favorite-button.active:hover {
              transform: scale(1.15);
          }
          
          /* Document Type Badge */
          .document-type-badges {
              position: absolute;
              bottom: var(--space-4);
              left: var(--space-4);
              display: flex;
              gap: var(--space-2);
              z-index: 10;
              flex-wrap: wrap;
              align-items: center;
          }
          
          .document-type-badge {
              display: inline-flex;
              align-items: center;
              font-size: 10px;
              font-weight: 600;
              color: var(--white);
              background: linear-gradient(135deg, var(--blue-600) 0%, var(--blue-500) 100%);
              padding: var(--space-1) var(--space-2);
              border-radius: var(--radius-md);
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border: 1px solid var(--blue-700);
              box-shadow: 0 3px 12px rgba(14, 165, 233, 0.3);
              backdrop-filter: blur(15px);
              transition: all 0.3s var(--ease-bounce);
              height: 24px;
              white-space: nowrap;
          }
          
          .document-type-badge.more-types {
              background: linear-gradient(135deg, var(--blue-600) 0%, var(--blue-500) 100%);
              border: 1px solid var(--blue-700);
              box-shadow: 0 3px 12px rgba(14, 165, 233, 0.3);
              font-size: 10px;
              font-weight: 600;
              color: var(--white);
              padding: var(--space-1) var(--space-2);
              border-radius: var(--radius-md);
              text-transform: uppercase;
              letter-spacing: 0.5px;
              height: 24px;
              white-space: nowrap;
              margin-left: 0;
          }
          
          /* Style for the bullet points between document types */
          .document-type-badge span + span::before {
              content: '•';
              margin: 0 4px;
              color: var(--white);
              opacity: 0.7;
          }
          
          /* Style for the +N indicator */
          .document-type-badge span:last-child:not(:first-child) {
              opacity: 0.8;
              background: rgba(255, 255, 255, 0.1);
              padding: 2px 6px;
              border-radius: var(--radius-md);
              margin-left: 2px;
          }
          
          /* Rating Badge */
          .rating-badge {
              position: absolute;
              bottom: var(--space-4);
              right: var(--space-4);
              display: flex;
              align-items: center;
              gap: var(--space-2);
              padding: var(--space-2) var(--space-3);
              background: rgba(255, 255, 255, 0.95);
              color: #f59e0b;
              border-radius: var(--radius-lg);
              font-size: 12px;
              font-weight: 700;
              flex-shrink: 0;
              box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
              letter-spacing: -0.01em;
              border: 1px solid rgba(245, 158, 11, 0.2);
              z-index: 10;
              backdrop-filter: blur(15px);
              opacity: 1;
              transform: scale(1);
              transition: all 0.3s var(--ease-bounce);
              min-width: 60px;
              height: 32px;
          }
          
          .rating-badge[data-action="open-reviews"]:hover {
              background: rgba(255, 255, 255, 1);
              box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
              transform: scale(1.05) translateY(-2px);
              color: #f59e0b;
              cursor: pointer;
          }
          
          .rating-stars {
              display: flex;
              align-items: center;
              gap: 2px;
          }
          
          .rating-star {
              font-size: 14px;
              color: #fbbf24;
          }
          
          .rating-star.filled {
              color: #fbbf24;
          }
          
          .rating-count {
              color: var(--gray-700);
              font-size: 10px;
              margin-left: var(--space-1);
              font-weight: 600;
           }
           
           /* Preview Available Badge */
          .preview-available-badge {
              position: absolute;
              top: var(--space-4);
              left: var(--space-4);
              background: linear-gradient(135deg, #3b82f6, #8b5cf6);
              color: white;
              border-radius: var(--radius-lg);
              padding: var(--space-2) var(--space-3);
              font-size: 10px;
              font-weight: 700;
              display: flex;
              align-items: center;
              gap: var(--space-1);
              box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
              animation: pulseGlow 2s infinite;
              z-index: 15;
              letter-spacing: -0.01em;
              min-width: 70px;
              height: 28px;
              backdrop-filter: blur(10px);
          }
          
          
          
          /* Minimal Bundle Preview */
          .bundle-preview {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
          }
          
          /* Professional File Stack Effect for Multi-File Vetrina */
          .preview-icon.file-stack {
              position: relative;
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              padding-top: 25px;
              padding-left: 10px;
          }
          
          .file-stack-container {
              position: relative;
              width: 160px;
              height: 180px;
              transition: all 0.2s var(--ease-3);
              z-index: 10;
          }
          
          .stack-layer {
              position: absolute;
              width: 120px;
              height: 160px;
              background: var(--white);
              border: 1px solid var(--gray-200);
              border-radius: var(--radius-xl);
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
              transition: all 0.2s var(--ease-3);
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
              overflow: hidden;
          }
          
          /* 2-file stack positioning */
          .preview-icon[data-file-count="2"] .stack-back {
              transform: translate(-3px, -3px) rotate(-3deg);
              z-index: 1;
              background: linear-gradient(135deg, var(--gray-50), var(--white));
              border-color: var(--gray-200);
          }
          
          .preview-icon[data-file-count="2"] .stack-front {
              transform: translate(1.5px, 1.5px) rotate(2deg);
              z-index: 2;
              background: var(--white);
              border-color: var(--gray-200);
              box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);
          }
          
          /* 3+ file stack positioning */
          .preview-icon[data-file-count]:not([data-file-count="2"]) .stack-back {
              transform: translate(-5px, -5px) rotate(-3deg);
              z-index: 1;
              background: linear-gradient(135deg, var(--gray-50), var(--white));
              border-color: var(--gray-200);
          }
          
          .preview-icon[data-file-count]:not([data-file-count="2"]) .stack-middle {
              transform: translate(-2.5px, -2.5px) rotate(-1.5deg);
              z-index: 2;
              background: linear-gradient(135deg, var(--gray-50), var(--white));
              border-color: var(--gray-200);
          }
          
          .preview-icon[data-file-count]:not([data-file-count="2"]) .stack-front {
              transform: translate(0, 0) rotate(0deg);
              z-index: 3;
              background: var(--white);
              border: 1px solid var(--gray-200);
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          }
          
          /* Enhanced File Icons in Stack */
          .stack-layer .document-icon {
              font-size: 40px;
              margin-bottom: 8px;
              opacity: 0.9;
              transition: all 0.15s var(--ease-2);
              color: var(--blue-600);
          }
          
          .stack-layer .file-extension {
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              opacity: 0.8;
              transition: all 0.15s var(--ease-2);
              color: var(--gray-600);
          }
          
          
          /* Modern File Count Badge */
          .file-count-badge {
              position: absolute;
              top: -15px;
              right: 20px;
              background: linear-gradient(135deg, var(--blue-600), var(--indigo-600));
              color: var(--white);
              font-size: 14px;
              font-weight: 800;
              border-radius: 50%;
              z-index: 15;
              box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
              transition: all 0.2s ease-out;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid var(--white);
          }
          
          .document-card:hover .file-count-badge {
              transform: scale(1.05);
              box-shadow: 0 8px 20px rgba(59, 130, 246, 0.5);
          }
          
          /* Document Content - IMPROVED FLEXIBLE LAYOUT */
           .document-content {
              position: relative;
              padding: var(--space-5);
              background: var(--white);
              z-index: 2;
              
              height: 320px;
              display: flex;
              flex-direction: column;
              min-height: 0;
              overflow: hidden;
           }
           
           .document-header {
              height: 80px;
              margin-bottom: var(--space-3);
              flex-shrink: 0;
              overflow: hidden;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
           }
           
           .document-title-section {
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              flex: 1;
              gap: 4px; /* Add gap between title and description */
           }
           
           /* Document Title - IMPROVED HEIGHT MANAGEMENT */
           .document-title {
              font-size: 15px;
              font-weight: 700;
              color: var(--gray-900);
              line-height: 1.3;
              letter-spacing: -0.025em;
              margin-bottom: 0;
              font-family: 'Inter', sans-serif;
              
              min-height: 20px; /* Minimum height for single line */
              max-height: 40px; /* Maximum height for 2 lines */
              display: -webkit-box;
              -webkit-line-clamp: 2;
              line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              text-overflow: ellipsis;
              flex-shrink: 0; /* Prevent shrinking */
           }
           
           .document-subtitle {
              font-size: 13px;
              font-weight: 500;
              color: var(--blue-600);
              margin-bottom: 1px;
              letter-spacing: -0.01em;
           }
           
           /* Document Description - IMPROVED HEIGHT MANAGEMENT */
           .document-description {
              font-size: 12px;
              line-height: 1.4;
              color: var(--gray-600);
              font-weight: 400;
              font-family: 'Inter', sans-serif;
              
              min-height: 17px; /* Minimum height for single line */
              max-height: 34px; /* Maximum height for 2 lines */
              display: -webkit-box;
              -webkit-line-clamp: 2;
              line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              text-overflow: ellipsis;
              flex-shrink: 0; /* Prevent shrinking */
           }
          
           /* Document Tag Badge */
           .document-tag-badge {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              background: linear-gradient(135deg, rgba(73, 197, 235, 0.1) 0%, rgba(73, 197, 235, 0.05) 100%);
              color: var(--blue-700);
              font-size: 11px;
              font-weight: 600;
              padding: 3px 8px;
              border-radius: 12px;
              border: 1px solid rgba(73, 197, 235, 0.2);
              margin-top: 6px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              box-shadow: 0 1px 3px rgba(73, 197, 235, 0.1);
              transition: all 0.2s ease;
              font-family: 'Inter', sans-serif;
           }
          
           .document-tag-badge:hover {
              background: linear-gradient(135deg, rgba(73, 197, 235, 0.15) 0%, rgba(73, 197, 235, 0.08) 100%);
              border-color: rgba(73, 197, 235, 0.3);
              transform: translateY(-1px);
              box-shadow: 0 2px 6px rgba(73, 197, 235, 0.15);
           }
          
           .tag-icon {
              font-size: 12px;
              filter: brightness(1.1);
           }
          
           .tag-text {
              font-weight: 700;
              color: var(--blue-800);
           }
           
           /* Document Info - PROFESSIONAL LAYOUT WITH PROPER SPACING */
          .document-info {
             position: absolute;
             top: 100px;
             left: var(--space-5);
             right: var(--space-5);
             min-height: 140px;
             max-height: 160px;
             
             display: flex;
             flex-direction: column;
             gap: var(--space-2); /* Reduced gap to fit more items */
             padding: var(--space-3) var(--space-4); /* Reduced padding */
             
             background: rgba(255, 255, 255, 0.6); /* Semi-transparent white for glassmorphism */
             backdrop-filter: blur(12px) saturate(180%); /* Frosted glass effect */
             -webkit-backdrop-filter: blur(12px) saturate(180%);
             
             border-radius: var(--radius-2xl); /* Larger, more modern radius */
             border: 1px solid rgba(255, 255, 255, 0.8); /* Subtle border */
             
             box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); /* Soft shadow for depth */
             
             overflow: hidden;
          }
           
           .document-info-item {
             display: flex;
             align-items: center;
             gap: var(--space-2); /* Reduced gap */
             font-size: 11px; /* Slightly smaller font */
             color: var(--gray-800); /* Darker color for better contrast */
             font-weight: 500;
             line-height: 1.3; /* Tighter line height */
             
             height: auto; /* Allow flexible height */
             min-height: 16px;
             max-height: 20px; /* Prevent items from being too tall */
             
             overflow: hidden;
             text-overflow: ellipsis;
             white-space: nowrap;
             
             text-align: left; /* Explicitly align text to the left */
             flex-shrink: 0; /* Prevent shrinking */
          }
           
           .info-icon {
             font-size: 14px; /* Smaller icon */
             width: 16px;
             height: 16px;
             display: flex;
             align-items: center;
             justify-content: center;
             flex-shrink: 0;
             color: var(--black);
             opacity: 0.9;
             font-family: 'Material Symbols Outlined'; /* Ensure icon font is used */
          }
           
           .info-text {
             color: var(--gray-900); /* Main text color */
             font-weight: 600; /* Bolder text */
             flex: 1;
             min-width: 0;
             white-space: nowrap;
             overflow: hidden;
             text-overflow: ellipsis;
             letter-spacing: -0.01em;
             text-align: left; /* Explicitly align text to the left */
             font-size: 11px; /* Ensure consistent font size */
             line-height: 1.3; /* Match parent line height */
          }
           
          t /* Vetrina Owner Avatar - IMPROVED POSITIONING AND STYLING */
           .owner-avatar, .author-avatar {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: 700;
              line-height: 1;
              flex-shrink: 0;
              cursor: pointer;
              transition: transform 0.2s ease, box-shadow 0.2s ease;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
              border: 1.5px solid var(--white);
           }
           
           .owner-avatar:hover, .author-avatar:hover {
              transform: scale(1.05);
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
           }
           
          
           
          
           
           /* Document Footer - PROFESSIONAL LAYOUT WITH PROPER SPACING */
           .document-footer {
              position: absolute;
              bottom: var(--space-5);
              left: var(--space-5);
              right: var(--space-5);
              
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-top: var(--space-3);
              border-top: 1px solid var(--gray-200);
              
              height: 50px;
              background: var(--white);
              gap: var(--space-3);
           }
           
           .document-footer::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 1px;
              background: linear-gradient(90deg, 
                  transparent 0%, 
                  var(--gray-300) 20%, 
                  var(--gray-300) 80%, 
                  transparent 100%);
           }
           
           /* Left section with avatar and file size */
           .document-footer-left {
              display: flex;
              align-items: center;
              gap: var(--space-3);
              flex: 1;
              min-width: 0;
           }
           
           .document-meta {
              font-size: 10px;
              font-weight: 600;
              color: var(--gray-500);
              letter-spacing: 0.5px;
              font-family: 'Inter', sans-serif;
              text-transform: uppercase;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
           }
           
           .document-price {
              font-family: 'Inter', sans-serif;
              font-size: 16px;
              font-weight: 800;
              display: flex;
              align-items: center;
              letter-spacing: -0.02em;
              transition: all 0.2s var(--ease-2);
              background: transparent;
              border: none;
              padding: 0;
              min-width: 80px;
              justify-content: flex-end;
              text-align: right;
           }
           
           .document-price.free {
              color: var(--green-500);
              font-size: 14px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
           }
           
           .document-price.paid {
              color: var(--black);
              font-size: 16px;
              font-weight: 800;
           }
           
           /* Document Footer Right Section */
           .document-footer-right {
              display: flex;
              align-items: center;
              flex-shrink: 0;
           }
           
           /* Price and Cart Container - Professional Integration */
           .price-cart-container {
              display: flex;
              align-items: center;
              background: var(--white);
              border: 1px solid var(--gray-200);
              border-radius: var(--radius-xl);
              padding: var(--space-1);
              box-shadow: var(--shadow-sm);
              transition: all 0.2s var(--ease-2);
              gap: var(--space-1);
           }
           
           .price-cart-container:hover {
              border-color: var(--blue-300);
              box-shadow: var(--shadow-md);
              transform: translateY(-1px);
           }
           
           /* Integrated Price Styling */
           .price-cart-container .document-price {
              padding: var(--space-2) var(--space-3);
              margin: 0;
              border-radius: var(--radius-lg);
              background: var(--gray-50);
              border: none;
              font-weight: 700;
              color: var(--gray-900);
              min-width: auto;
              justify-content: center;
              text-align: center;
              transition: all 0.2s var(--ease-2);
           }
           
           .price-cart-container:hover .document-price {
              background: var(--blue-50);
              color: var(--blue-700);
           }
           
           /* Professional Add to Cart Button */
           .add-to-cart-btn {
              background: var(--blue-600);
              color: var(--white);
              border: none;
              border-radius: var(--radius-lg);
              padding: var(--space-2) var(--space-3);
              font-size: 14px;
              font-weight: 600;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.2s var(--ease-2);
              box-shadow: none;
              min-width: 36px;
              height: 36px;
              gap: var(--space-1);
           }
           
           .add-to-cart-btn:hover {
              background: var(--blue-700);
              transform: none;
              box-shadow: var(--shadow-sm);
           }
           
           .add-to-cart-btn:active {
              transform: scale(0.95);
              box-shadow: var(--shadow-xs);
           }
           
           .add-to-cart-btn .material-symbols-outlined {
              font-size: 16px;
              font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 16;
           }
           
           /* Add to Cart Button States */
           .add-to-cart-btn.adding {
              background: var(--gray-500);
              cursor: not-allowed;
              transform: none;
           }
           
           .add-to-cart-btn.added {
              background: var(--green-500);
              transform: scale(1.05);
           }
           
           .add-to-cart-btn.error {
              background: var(--red-500);
              animation: shake 0.5s ease-in-out;
           }
           
           /* Enhanced Cart Success Animation */
           .price-cart-container.cart-success {
              border-color: var(--green-400);
              background: var(--green-50);
              animation: cartSuccessPulse 0.6s ease-out;
              box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
           }
           
           .price-cart-container.cart-success .document-price {
              background: var(--green-100);
              color: var(--green-700);
           }
           
           .price-cart-container.cart-success .add-to-cart-btn {
              background: var(--green-500);
              animation: cartButtonSuccess 0.6s ease-out;
           }
           
           @keyframes cartSuccessPulse {
              0% {
                  transform: scale(1);
                  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.1);
              }
              50% {
                  transform: scale(1.02);
                  box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.1);
              }
              100% {
                  transform: scale(1);
                  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
              }
           }
           
           @keyframes cartButtonSuccess {
              0% {
                  transform: scale(1);
              }
              50% {
                  transform: scale(1.1);
              }
              100% {
                  transform: scale(1.05);
              }
           }
           
           @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-2px); }
              75% { transform: translateX(2px); }
           }
           
           /* ===========================
             ADVANCED FILTERS PANEL
             =========================== */
           
           /* Filter Panel Overlay */
           .filters-overlay {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: 100% !important;
              background: rgba(0, 0, 0, 0.4) !important;
              opacity: 0;
              visibility: hidden;
              transition: all 0.4s var(--ease-3);
              z-index: 9998 !important;
              display: block !important;
           }
           
           .filters-overlay.active {
              opacity: 1 !important;
              visibility: visible !important;
           }
           
           /* Main Filter Panel */
           .filters-panel {
              position: fixed !important;
              top: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              width: 520px !important;
              height: 100vh !important;
              max-height: 100vh !important;
              min-height: 100vh !important;
              background: rgba(255, 255, 255, 0.95) !important;
              backdrop-filter: blur(40px) saturate(180%) brightness(105%) !important;
              border-left: 1px solid rgba(233, 236, 239, 0.8) !important;
              box-shadow: var(--shadow-luxury) !important;
              transform: translateX(100%) !important;
              transition: all 0.5s var(--ease-4) !important;
              z-index: 9999 !important;
              overflow-x: hidden !important;
              overflow-y: auto !important;
              display: flex !important;
              flex-direction: column !important;
              margin: 0 !important;
              padding: 0 !important;
          }
           
           .filters-panel.active {
              transform: translateX(0) !important;
              right: 0 !important;
              display: flex !important;
              visibility: visible !important;
              opacity: 1 !important;
           }
          
           /* Extra robust positioning for edge cases */
           .filters-panel[style*="transform"] {
              position: fixed !important;
              top: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              z-index: 9999 !important;
              height: 100vh !important;
           }
           
           /* Ultimate bulletproof positioning - highest specificity */
           body .filters-panel,
           body .filters-panel.active {
              position: fixed !important;
              top: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              height: 100vh !important;
              z-index: 9999 !important;
              width: 380px !important;
              max-width: 380px !important;
              margin: 0 !important;
              padding: 0 !important;
              transform: translateX(100%) !important;
              transition: transform 0.5s var(--ease-4) !important;
           }
           
           body .filters-panel.active {
              transform: translateX(0) !important;
           }
           
           .filters-content {
              height: 100%;
              display: flex;
              flex-direction: column;
              position: relative;
              overflow: visible;
          }
          
          /* Ensure filters-bottom-actions always stays at the bottom */
          .filters-bottom-actions {
              padding: 16px 0 !important;
              background: #f8fafc !important;
              border: 2px solid #e5e7eb !important;
          }
          
          .bottom-clear-container {
              margin: 0 !important;
          }
           
           /* Filter Header */
           .filters-header {
              display: flex;
              flex-direction: column;
              gap: 0.25rem;
          }
          
          .filters-header-top {
              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
              gap: var(--space-4);
          }
          
          .filters-header-bottom {
              width: 100%;
              margin-top: 2px;
          }
          
          .filters-subtitle {
              font-size: 1rem;
              color: var(--gray-600);
              margin-left: 2px;
              margin-top: 0;
              margin-bottom: 0;
              line-height: 1.3;
          }
          
          .filters-title {
              flex: 1 1 0;
              min-width: 0;
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              justify-content: center;
              gap: 2px;
          }
          
          .filters-title h2 {
              margin-bottom: 0;
              margin-top: 0;
              line-height: 1.2;
          }
          
          .filters-actions {
              display: flex;
              align-items: center;
              gap: var(--space-2);
              height: 44px;
          }
          
          .filter-clear-btn {
              display: flex;
              align-items: center;
              gap: var(--space-2);
              padding: var(--space-2) var(--space-4);
              background: var(--gray-100);
              border: 1px solid var(--gray-200);
              border-radius: var(--radius-lg);
              font-size: 13px;
              font-weight: 600;
              color: var(--gray-700);
              cursor: pointer;
              transition: all 0.25s var(--ease-2);
              height: 36px;
              margin-right: 4px;
           }
           
           .filters-close {
              width: 44px;
              height: 44px;
              background: #f3f4f6;
              border: 1.5px solid #e5e7eb;
              border-radius: 50%;
              color: #374151;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: background 0.2s, color 0.2s, border 0.2s, box-shadow 0.2s, transform 0.2s;
              box-shadow: 0 2px 8px rgba(31, 41, 55, 0.06);
              outline: none;
              position: relative;
          }
          
          .filters-close .material-symbols-outlined {
              font-size: 20px;
              pointer-events: none;
              color: #374151;
          }
          
          .filters-close:hover, .filters-close:focus {
              background: #ef4444;
              color: #374151;
              border-color: #ef4444;
              box-shadow: 0 4px 16px rgba(239, 68, 68, 0.18);
              transform: scale(1.08);
          }
          
          .filters-close:focus-visible {
              outline: 2px solid #2563eb;
              outline-offset: 2px;
          }
           
           .filters-grid {
              flex: 1;
              padding: var(--space-6) var(--space-8) var(--space-8) var(--space-8);
              overflow-y: auto;
              overflow-x: visible;
              scrollbar-width: thin;
              scrollbar-color: var(--gray-300) transparent;
              position: relative;
              max-height: calc(100vh - 200px);
              min-height: 0;
          }
           
           .filters-grid::-webkit-scrollbar {
              width: 6px;
           }
           
           .filters-grid::-webkit-scrollbar-track {
              background: transparent;
           }
           
           .filters-grid::-webkit-scrollbar-thumb {
              background: var(--gray-300);
              border-radius: 3px;
           }
           
           .filters-grid::-webkit-scrollbar-thumb:hover {
              background: var(--gray-400);
           }
           
           /* Filter Sections */
          .filter-section {
             margin-bottom: var(--space-8);
             opacity: 0;
             transform: translate3d(0, 10px, 0);
             animation: filterSectionSlideIn 0.25s var(--ease-2) forwards;
             position: relative;
             z-index: 1;
             will-change: transform, opacity;
             backface-visibility: hidden;
             overflow: visible;
          }
          
          /* Academic Course Info section (with dropdowns) should be above other sections */
          .filter-section:nth-child(1) { 
             animation-delay: 0.01s; 
             z-index: 100;
          }
          .filter-section:nth-child(2) { 
             animation-delay: 0.02s; 
             z-index: 50;
          }
          .filter-section:nth-child(3) { 
             animation-delay: 0.03s; 
             z-index: 40;
          }
          .filter-section:nth-child(5) { 
             animation-delay: 0.05s; 
             z-index: 1;
          }
          .filter-section:nth-child(6) { 
             animation-delay: 0.06s; 
             z-index: 1;
          }
           
           @keyframes filterSectionSlideIn {
              to {
                  opacity: 1;
                  transform: translate3d(0, 0, 0);
              }
           }
           
           .filter-section-title {
              display: flex;
              align-items: center;
              gap: var(--space-3);
              font-size: 16px;
              font-weight: 700;
              color: var(--gray-900);
              margin-bottom: var(--space-5);
              padding-bottom: var(--space-3);
              border-bottom: 2px solid var(--gray-200);
              font-family: 'Space Grotesk', sans-serif;
              letter-spacing: -0.02em;
           }
           
           .filter-section-title .material-symbols-outlined {
              font-size: 20px;
              color: var(--blue-600);
           }
           
           .filter-group {
              display: grid;
              gap: var(--space-5);
           }
           
           .filter-item {
              position: relative;
           }
           
           .filter-label {
              display: block;
              font-size: 13px;
              font-weight: 600;
              color: var(--gray-700);
              margin-bottom: var(--space-2);
              letter-spacing: -0.01em;
           }
           
           /* Custom Select Styles */
           .custom-select {
              position: relative;
              display: flex;
              align-items: center;
           }
           
           .filter-select {
              width: 100%;
              height: 44px;
              padding: 0 var(--space-4) 0 var(--space-4);
              background: var(--white);
              border: 2px solid var(--gray-200);
              border-radius: var(--radius-lg);
              font-size: 14px;
              font-weight: 500;
              color: var(--gray-900);
              cursor: pointer;
              transition: all 0.25s var(--ease-2);
              appearance: none;
              -webkit-appearance: none;
              -moz-appearance: none;
              padding-right: 40px;
           }
           
           .filter-select:hover {
              border-color: var(--gray-300);
              box-shadow: var(--shadow-sm);
              transform: translateY(-1px);
           }
           
           .filter-select:focus {
              outline: none;
              border-color: var(--blue-500);
              box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
              transform: translateY(-1px);
           }
           
           .select-arrow {
              position: absolute;
              right: var(--space-3);
              font-size: 20px;
              color: var(--gray-500);
              pointer-events: none;
              transition: all 0.25s var(--ease-2);
           }
           
           .filter-select:focus + .select-arrow {
              color: var(--blue-500);
              transform: rotate(180deg);
           }
           
           /* Rating Filter */
           .rating-filter {
              display: flex;
              align-items: center;
              gap: var(--space-4);
           }
           
           .rating-stars-filter {
              display: flex;
              align-items: center;
              gap: var(--space-1);
           }
           
           .rating-star-filter {
              font-size: 24px;
              color: var(--gray-300);
              cursor: pointer;
              transition: all 0.2s var(--ease-2);
              user-select: none;
           }
           
           .rating-star-filter:hover,
           .rating-star-filter.active {
              color: #fbbf24;
              transform: scale(1.1);
           }
           
           .rating-text {
              font-size: 13px;
              font-weight: 600;
              color: var(--gray-600);
              min-width: 120px;
           }
           
           /* Dual Range Slider */
           .dual-range-container {
              position: relative;
              height: 40px;
              margin: var(--space-4) 0;
           }
           
           .range-track {
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              width: 100%;
              height: 6px;
              background: var(--gray-200);
              border-radius: 3px;
              z-index: 1;
           }
           
           .range-fill {
              position: absolute;
              top: 0;
              height: 100%;
              background: var(--gradient-primary);
              border-radius: 3px;
           }
           
           .range-slider {
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              width: 100%;
              height: 6px;
              background: transparent;
              border: none;
              outline: none;
              appearance: none;
              -webkit-appearance: none;
              cursor: pointer;
              pointer-events: none;
           }
           
           .range-slider::-webkit-slider-thumb {
              appearance: none;
              -webkit-appearance: none;
              width: 20px;
              height: 20px;
              background: var(--gradient-primary);
              border-radius: 50%;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
              border: 2px solid var(--white);
              pointer-events: all;
           }
           
           .range-slider::-webkit-slider-thumb:hover {
              transform: scale(1.1);
              box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
           }
           
           .range-slider::-moz-range-thumb {
              width: 20px;
              height: 20px;
              background: var(--gradient-primary);
              border-radius: 50%;
              cursor: pointer;
              border: 2px solid var(--white);
              box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
              pointer-events: all;
           }
           
           .range-slider-min {
              z-index: 2;
           }
           
           .range-slider-max {
              z-index: 3;
           }
           
           .price-values {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: var(--space-2);
              font-size: 12px;
              font-weight: 600;
              color: var(--blue-600);
              padding: 4px 0;
              background: rgba(59, 130, 246, 0.02);
              border-radius: var(--radius-xs);
              position: relative;
           }
          
           .price-values::before {
              content: "Clicca sui prezzi per modificarli";
              position: absolute;
              top: -20px;
              left: 0;
              right: 0;
              font-size: 11px;
              color: var(--gray-500);
              text-align: center;
              opacity: 0;
              transition: opacity 0.2s ease;
              pointer-events: none;
          }
          
          .price-values:hover::before {
              opacity: 1;
          }
          
          /* Pages Range Filter */
          .pages-range-filter {
              margin-top: 8px;
              margin-bottom: 8px;
          }
          
          .pages-range-filter .dual-range-container {
              position: relative;
              width: 100%;
              height: 32px;
              display: flex;
              align-items: center;
          }
          
          .pages-range-filter .range-track {
              position: absolute;
              height: 4px;
              background: var(--gray-300);
              width: 100%;
              border-radius: 2px;
              z-index: 1;
          }
          
          .pages-range-filter .range-fill {
              position: absolute;
              height: 4px;
              background: var(--primary-500);
              border-radius: 2px;
              z-index: 2;
          }
          
          .pages-range-filter .range-slider {
              position: absolute;
              width: 100%;
              height: 32px;
              background: none;
              pointer-events: all;
              z-index: 3;
              -webkit-appearance: none;
              appearance: none;
          }
          
          .pages-range-filter .range-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: var(--primary-500);
              border: 2px solid var(--white);
              box-shadow: 0 1px 4px rgba(0,0,0,0.08);
              cursor: pointer;
              transition: background 0.2s;
          }
          
          .pages-range-filter .range-slider:focus::-webkit-slider-thumb {
              outline: 2px solid var(--primary-700);
          }
          
          .pages-range-filter .range-slider::-moz-range-thumb {
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: var(--primary-500);
              border: 2px solid var(--white);
              box-shadow: 0 1px 4px rgba(0,0,0,0.08);
              cursor: pointer;
              transition: background 0.2s;
          }
          
          .pages-range-filter .range-slider:focus::-moz-range-thumb {
              outline: 2px solid var(--primary-700);
          }
          
          .pages-range-filter .range-slider::-ms-thumb {
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: var(--primary-500);
              border: 2px solid var(--white);
              box-shadow: 0 1px 4px rgba(0,0,0,0.08);
              cursor: pointer;
              transition: background 0.2s;
          }
          
          .pages-range-filter .range-values {
              margin-top: 4px;
              font-size: 0.95em;
              color: var(--gray-700);
              text-align: left;
          }
          
          /* Editable Values */
          .editable-value {
              cursor: pointer;
              padding: 4px 8px;
              border-radius: var(--radius-xs);
              transition: all 0.2s var(--ease-2);
              user-select: none;
              position: relative;
              background-color: rgba(59, 130, 246, 0.05);
              border: 1px solid rgba(59, 130, 246, 0.15);
              font-weight: 600;
              color: var(--blue-700);
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          }
          
          .editable-value::after {
              content: '';
              font-size: 10px;
              margin-left: 4px;
              opacity: 0.6;
              transition: opacity 0.2s ease;
          }
          
          .editable-value:hover {
              background-color: rgba(59, 130, 246, 0.1);
              border-color: rgba(59, 130, 246, 0.3);
              color: var(--blue-800);
              transform: translateY(-1px);
              box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);
          }
          
          .editable-value:hover::after {
              opacity: 1;
          }
          
          .editable-value:active {
              background-color: rgba(59, 130, 246, 0.15);
              transform: translateY(0) scale(0.98);
          }
          
          .editable-value.editing {
              background-color: var(--white);
              border: 2px solid var(--blue-500);
              box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
              padding: 3px 7px;
              min-width: 50px;
              display: inline-block;
              color: var(--blue-900);
          }
          
          .editable-value.editing::after {
              display: none;
          }
          
          .editable-value input {
              background: transparent;
              border: none;
              outline: none;
              font-size: inherit;
              font-weight: inherit;
              color: inherit;
              width: 100%;
              text-align: center;
              font-family: inherit;
          }
          
          .editable-value input::-webkit-outer-spin-button,
          .editable-value input::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
          }
          
          .editable-value input[type=number] {
              -moz-appearance: textfield;
          }
          
          /* Mobile responsive adjustments */
          @media (max-width: 768px) {
              .editable-value {
                  padding: 4px 6px;
                  font-size: 0.85em;
              }
              
              .editable-value::after {
                  font-size: 9px;
                  margin-left: 3px;
              }
              
              .editable-value.editing {
                  padding: 3px 5px;
                  min-width: 40px;
              }
          }
           
           /* Toggle Groups */
           .price-toggle-group,
          .size-toggle-group,
          .time-toggle-group,
          .vetrina-toggle-group {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
              gap: var(--space-2);
          }
           
           .price-toggle,
          .size-toggle,
          .time-toggle,
          .vetrina-toggle {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: var(--space-1);
              padding: var(--space-3) var(--space-2);
              background: var(--white);
              border: 2px solid var(--gray-200);
              border-radius: var(--radius-lg);
              font-size: 11px;
              font-weight: 600;
              color: var(--gray-700);
              cursor: pointer;
              transition: all 0.25s var(--ease-2);
              text-align: center;
              line-height: 1.2;
              min-height: 60px;
          }
           
           .price-toggle .material-symbols-outlined,
          .size-toggle .material-symbols-outlined,
          .time-toggle .material-symbols-outlined,
          .vetrina-toggle .material-symbols-outlined {
              font-size: 18px;
              margin-bottom: var(--space-1);
          }
           
           .price-toggle:hover,
          .size-toggle:hover,
          .time-toggle:hover,
          .vetrina-toggle:hover {
              border-color: var(--gray-300);
              transform: translateY(-2px);
              box-shadow: var(--shadow-md);
          }
           
           .price-toggle.active,
          .size-toggle.active,
          .time-toggle.active,
          .vetrina-toggle.active {
              background: var(--gradient-primary);
              border-color: var(--blue-600);
              color: var(--white);
              transform: translateY(-2px);
              box-shadow: var(--shadow-glow);
          }
           
           /* ===========================
             PROFESSIONAL ACTIVE FILTERS DISPLAY
             =========================== */
           
          .filter-tag {
              display: inline-flex;
              align-items: center;
              gap: var(--space-1);
              padding: var(--space-1) var(--space-2);
              background: linear-gradient(135deg, var(--blue-50) 0%, rgba(240, 249, 255, 0.8) 100%);
              border: 1px solid var(--blue-200);
              border-radius: var(--radius-lg);
              font-size: 11px;
              font-weight: 600;
              color: var(--blue-700);
              cursor: pointer;
              transition: all 0.3s var(--ease-3);
              white-space: nowrap;
              user-select: none;
              position: relative;
              overflow: hidden;
              animation: filterTagSlideIn 0.3s var(--ease-bounce);
              box-shadow: 0 2px 4px rgba(2, 132, 199, 0.08);
          }
           
           .filter-tag::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, var(--blue-100) 0%, var(--blue-50) 100%);
              opacity: 0;
              transition: opacity 0.3s var(--ease-2);
              border-radius: var(--radius-xl);
           }
           
           .filter-tag:hover {
              background: linear-gradient(135deg, var(--blue-100) 0%, rgba(240, 249, 255, 0.9) 100%);
              border-color: var(--blue-300);
              color: var(--blue-800);
              box-shadow: 0 4px 12px rgba(2, 132, 199, 0.15);
              transform: translateY(-1px);
           }
           
           .filter-tag:hover::before {
              opacity: 1;
           }
           
           .filter-tag:active {
              transform: translateY(0);
              box-shadow: 0 2px 4px rgba(2, 132, 199, 0.1);
           }
           
          .filter-tag .material-symbols-outlined {
              font-size: 14px;
              color: inherit;
              transition: all 0.2s var(--ease-2);
              flex-shrink: 0;
              position: relative;
              z-index: 1;
          }
           
           .filter-tag span {
              color: inherit;
              font-weight: inherit;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              position: relative;
              z-index: 1;
           }
           
           /* Clear All Filter Tag */
           .filter-tag.clear-all-tag {
              background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
              border: 1px solid var(--purple-200);
              order: -1;
              font-weight: 700;
              box-shadow: 0 2px 4px rgba(124, 58, 237, 0.08);
          }
           
          .filter-tag.clear-all-tag::before {
              background: linear-gradient(135deg, var(--purple-50) 0%, var(--purple-100) 100%);
          }
          
          .filter-tag.clear-all-tag:hover {
              background: linear-gradient(135deg, var(--purple-50) 0%, var(--purple-100) 100%);
              border-color: var(--purple-300);
              color: var(--purple-700);
              box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
          }
           
          .filter-tag.clear-all-tag::after {
              content: '×';
              font-size: 14px;
              margin-left: 3px;
              font-weight: bold;
              position: relative;
              z-index: 1;
          }
           
           @keyframes filterTagSlideIn {
              0% {
                  opacity: 0;
                  transform: translateY(10px) scale(0.8);
              }
              100% {
                  opacity: 1;
                  transform: translateY(0) scale(1);
              }
           }
          
           
           .bottom-clear-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
           }
           
           .bottom-clear-all-btn {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 10px 20px;
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              color: white;
              border: none;
              border-radius: 10px;
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
              box-shadow: 0 3px 8px rgba(239, 68, 68, 0.2);
              min-width: 160px;
              justify-content: center;
              font-family: inherit;
              position: relative;
              overflow: hidden;
           }
           
           .bottom-clear-all-btn::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
              transition: left 0.6s cubic-bezier(0.23, 1, 0.32, 1);
           }
           
           .bottom-clear-all-btn:hover {
              background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
              transform: translateY(-2px);
              box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3);
           }
           
           .bottom-clear-all-btn:hover::before {
              left: 100%;
           }
           
           .bottom-clear-all-btn:active {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
           }
           
           .bottom-clear-all-btn.disabled {
              background: #9ca3af;
              color: #6b7280;
              cursor: not-allowed;
              transform: none;
              box-shadow: 0 2px 4px rgba(156, 163, 175, 0.2);
           }
           
           .bottom-clear-all-btn.disabled:hover {
              background: #9ca3af;
              transform: none;
              box-shadow: 0 2px 4px rgba(156, 163, 175, 0.2);
           }
           
           .bottom-clear-all-btn i {
              font-size: 18px;
              transition: transform 0.3s ease;
           }
           
           .bottom-clear-all-btn:hover:not(.disabled) i {
              transform: rotate(180deg);
           }
           
           .bottom-clear-info {
              text-align: center;
              color: #6b7280;
              font-size: 13px;
              font-weight: 500;
              opacity: 0.8;
           }
          
          /* Mobile responsive styles for filters overlay footer */
          @media (max-width: 768px) {
              .filters-bottom-actions {
                  margin-top: 0px;
                  padding: 12px 0;
              }
              
              .bottom-clear-container {
                  gap: 4px;
              }
              
              .bottom-clear-all-btn {
                  padding: 8px 16px;
                  min-width: 140px;
                  font-size: 12px;
              }
              
              .bottom-clear-all-btn i {
                  font-size: 16px;
              }
              
              .bottom-clear-info {
                  font-size: 11px;
              }
          }
          
          @media (max-width: 480px) {
              .filters-bottom-actions {
                  margin-top: 0px;
                  padding: 12px 0;
              }
              
              .bottom-clear-container {
                  gap: 3px;
              }
              
              .bottom-clear-all-btn {
                  padding: 6px 12px;
                  min-width: 120px;
                  font-size: 11px;
              }
              
              .bottom-clear-all-btn i {
                  font-size: 14px;
              }
              
              .bottom-clear-info {
                  font-size: 10px;
              }
          }
           
           /* Status Messages */
           .status-message {
              position: fixed;
              top: var(--space-8);
              right: var(--space-8);
              padding: var(--space-4) var(--space-6);
              border-radius: var(--radius-xl);
              font-weight: 500;
              font-size: 14px;
              z-index: 10000;
              backdrop-filter: blur(40px) saturate(180%);
              border: 1px solid rgba(255, 255, 255, 0.3);
              box-shadow: var(--shadow-luxury);
              transform: translateX(120%);
              transition: all 0.5s var(--ease-4);
              min-width: 300px;
              max-width: 400px;
           }
           
           .status-message.show {
              transform: translateX(0);
           }
           
           .status-message.success {
              background: rgba(255, 255, 255, 0.95);
              color: var(--green-500);
              border-color: rgba(16, 185, 129, 0.2);
           }
          
          .status-message.error {
             background: rgba(255, 255, 255, 0.95);
             color: var(--red-500);
             border-color: rgba(239, 68, 68, 0.2);
          }
          
          /* Empty State */
          .empty-state {
             grid-column: 1 / -1;
             text-align: center;
             padding: var(--space-20) var(--space-10);
             color: var(--gray-500);
          }
          
          .empty-state-icon {
             font-size: 80px;
             margin-bottom: var(--space-8);
             opacity: 0.25;
          }
          
          .empty-state h2 {
             font-size: 32px;
             font-weight: 300;
             margin-bottom: var(--space-4);
             color: var(--gray-900);
             letter-spacing: -0.02em;
          }
          
          .empty-state p {
             font-size: 16px;
             max-width: 500px;
             margin: 0 auto;
             line-height: 1.6;
             font-weight: 400;
          }
          
          /* Preview Modal */
          .preview-modal {
             position: fixed;
             top: 0;
             left: 0;
             width: 100%;
             height: 100%;
             background: rgba(0, 0, 0, 0.4);
             backdrop-filter: blur(20px) saturate(150%);
             display: none;
             align-items: center;
             justify-content: center;
             z-index: 10000;
             padding: var(--space-10);
             opacity: 0;
             transition: all 0.4s var(--ease-3);
          }
          
          .preview-modal.active {
             display: flex;
             opacity: 1;
          }
          
          .preview-content {
             background: var(--white);
             border-radius: var(--radius-3xl);
             padding: var(--space-12);
             max-width: 1000px;
             width: 100%;
             max-height: 90vh;
             overflow: auto;
             box-shadow: var(--shadow-2xl);
             border: 1px solid var(--gray-200);
             transform: scale(0.9);
             transition: all 0.4s var(--ease-3);
             position: relative;
          }
          
          .preview-content::before {
             content: '';
             position: absolute;
             top: 0;
             left: 0;
             right: 0;
             bottom: 0;
             background: linear-gradient(135deg, 
                 rgba(255, 255, 255, 0.8) 0%, 
                 rgba(244, 246, 248, 0.4) 100%);
             border-radius: var(--radius-3xl);
             opacity: 0.5;
             pointer-events: none;
          }
          
          .preview-modal.active .preview-content {
             transform: scale(1);
          }
          
          .preview-header {
             display: flex;
             justify-content: space-between;
             align-items: center;
             margin-bottom: var(--space-10);
             padding-bottom: var(--space-6);
             border-bottom: 1px solid var(--gray-200);
             position: relative;
             z-index: 1;
          }
          
          .preview-title {
             font-size: 28px;
             font-weight: 600;
             color: var(--gray-900);
             letter-spacing: -0.025em;
          }
          
          .preview-close {
             width: 44px;
             height: 44px;
             background: var(--gray-100);
             color: var(--gray-600);
             border: none;
             border-radius: 50%;
             font-size: 20px;
             cursor: pointer;
             display: flex;
             align-items: center;
             justify-content: center;
             transition: all 0.25s var(--ease-2);
          }
          
          .preview-close:hover {
             background: var(--red-500);
             color: var(--white);
             transform: scale(1.1);
          }
          
          .preview-body {
             line-height: 1.7;
             color: var(--gray-700);
             font-size: 15px;
             position: relative;
             z-index: 1;
          }
          
          .document-overview {
             background: var(--gray-50);
             padding: var(--space-8);
             border-radius: var(--radius-2xl);
             margin-bottom: var(--space-8);
             border: 1px solid var(--gray-200);
          }
          
          .document-overview h3 {
             color: var(--gray-900);
             margin-bottom: var(--space-5);
             font-size: 20px;
             font-weight: 600;
          }
          
          .overview-grid {
             display: grid;
             grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
             gap: var(--space-5);
          }
          
          .document-preview-section {
             background: var(--white);
             padding: var(--space-8);
             border-radius: var(--radius-2xl);
             border: 1px solid var(--gray-200);
          }
          
          .document-preview-section h3 {
             color: var(--gray-900);
             margin-bottom: var(--space-6);
             font-weight: 600;
          }
          
          .preview-container {
             text-align: center;
             margin-bottom: var(--space-6);
          }
          
          .full-preview {
             max-width: 100%;
             max-height: 500px;
             border-radius: var(--radius-xl);
             box-shadow: var(--shadow-xl);
             border: 1px solid var(--gray-200);
             object-fit: contain;
          }
          
          .preview-error {
             color: var(--gray-500);
             font-style: italic;
             padding: var(--space-12);
             background: var(--gray-50);
             border-radius: var(--radius-xl);
             text-align: center;
          }
          
          .preview-note {
             text-align: center;
             font-weight: 500;
             color: var(--gray-700);
             padding: var(--space-5);
             background: var(--gray-50);
             border-radius: var(--radius-xl);
             border: 1px solid var(--gray-200);
          }
          
          .preview-actions {
             margin-top: var(--space-10);
             padding-top: var(--space-8);
             border-top: 1px solid var(--gray-200);
             display: flex;
             gap: var(--space-4);
             justify-content: center;
             position: relative;
             z-index: 1;
          }
          
          .btn {
             padding: var(--space-4) var(--space-8);
             border: none;
             border-radius: var(--radius-xl);
             font-size: 14px;
             font-weight: 600;
             cursor: pointer;
             transition: all 0.3s var(--ease-3);
             letter-spacing: -0.01em;
             position: relative;
             overflow: hidden;
          }
          
          .btn::before {
             content: '';
             position: absolute;
             top: 0;
             left: 0;
             right: 0;
             bottom: 0;
             background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
             opacity: 0;
             transition: opacity 0.3s var(--ease-2);
          }
          
          .btn:not(.secondary) {
             background: linear-gradient(135deg, var(--gray-900) 0%, var(--gray-800) 100%);
             color: var(--white);
             box-shadow: var(--shadow-md);
          }
          
          .btn:not(.secondary):hover {
             background: linear-gradient(135deg, var(--gray-800) 0%, var(--gray-700) 100%);
             transform: translateY(-3px);
             box-shadow: var(--shadow-xl);
          }
          
          .btn:not(.secondary):hover::before {
             opacity: 1;
          }
          
          .btn.secondary {
             background: var(--gray-100);
             color: var(--gray-700);
             border: 1px solid var(--gray-200);
          }
          
          .btn.secondary:hover {
             background: var(--gray-50);
             border-color: var(--gray-300);
             transform: translateY(-2px);
             box-shadow: var(--shadow-lg);
          }
          
          /* ===========================
            PROFESSIONAL RESPONSIVE DESIGN
            =========================== */
          
          @media (max-width: 2500px) {
              :root {
                  --bg-offset-top: -900px; /* Adjust for this screen size layout */
              }
             .filters-panel {
                 max-width: 540px;
             }
             
             .documents-grid {
                 grid-template-columns: repeat(7, minmax(0, 1fr));
                 gap: var(--space-4);
             }
             
             .documents-grid.no-results-state {
                 grid-template-columns: repeat(7, minmax(0, 1fr));
                 gap: var(--space-4);
             }
          }
          
          @media (max-width: 2300px) {
              :root {
                  --bg-offset-top: -950px; /* Adjust for this screen size layout */
              }
             .filters-panel {
                 max-width: 520px;
             }
             
             .documents-grid {
                 grid-template-columns: repeat(6, minmax(0, 1fr));
                 gap: var(--space-4);
             }
             
             .documents-grid.no-results-state {
                 grid-template-columns: repeat(6, minmax(0, 1fr));
                 gap: var(--space-4);
             }
          }
          
          @media (max-width: 1800px) {
              :root {
                  --bg-offset-top: -1000px; /* Adjust for this screen size layout */
              }
             .filters-panel {
                 max-width: 500px;
             }
             
             .documents-grid {
                 grid-template-columns: repeat(5, minmax(0, 1fr));
                 gap: var(--space-4);
             }
             
             .documents-grid.no-results-state {
                 grid-template-columns: repeat(5, minmax(0, 1fr));
                 gap: var(--space-4);
             }
             
             .documents-grid.filters-open {
                 /* No changes - documents stay exactly as they are */
             }
             
             .document-card {
                 height: 520px;
             }
             
             .document-preview {
                 height: 200px;
                 min-height: 200px;
                 max-height: 200px;
             }
             
             .document-content {
                 height: 320px;
             }
             
             .document-info {
                 top: 110px;
                 min-height: 120px;
                 max-height: 140px;
                 gap: var(--space-2);
                 padding: var(--space-3) var(--space-4);
             }
             
             .document-title {
                 font-size: 14px;
             }
             
             .document-description {
                 font-size: 11px;
             }
          }
          
          @media (max-width: 1400px) {
              :root {
                  --bg-offset-top: -1050px; /* Adjust for this screen size layout */
              }
             .filters-panel {
                 max-width: 440px;
             }
             
             .documents-grid {
                 grid-template-columns: repeat(3, minmax(0, 1fr));
                 gap: var(--space-4);
             }
             
             .documents-grid.no-results-state {
                 grid-template-columns: repeat(3, minmax(0, 1fr));
                 gap: var(--space-4);
             }
             
             .documents-grid.filters-open {
                 /* No changes - documents stay exactly as they are */
             }
             
             .document-card {
                 height: 500px;
             }
             
             .document-preview {
                 height: 180px;
                 min-height: 180px;
                 max-height: 180px;
             }
             
             .document-content {
                 height: 320px;
             }
             
             .document-info {
                 top: 120px;
                 min-height: 110px;
                 max-height: 130px;
                 gap: var(--space-2);
                 padding: var(--space-3) var(--space-4);
             }
          }
          
          @media (max-width: 1200px) {
             :root {
                 --bg-offset-top: -1020px; /* Adjust for this screen size layout */
             }
          
             .filters-panel {
                 max-width: 400px;
             }
             
             .results-section {
                 padding: var(--space-4) var(--space-8) var(--space-16) var(--space-8);
             }
             
             .documents-grid {
                 grid-template-columns: repeat(3, minmax(0, 1fr));
                 gap: var(--space-4);
             }
             
             .documents-grid.no-results-state {
                 grid-template-columns: repeat(3, minmax(0, 1fr));
                 gap: var(--space-4);
             }
             
             .documents-grid.filters-open {
                 /* No changes - documents stay exactly as they are */
             }
             
             /* Header styles removed for component version */
             
             .search-container {
                 max-width: 550px;
                 gap: var(--space-3);
             }
             
             .search-bar {
                 width: 350px;
                 max-width: 350px;
                 height: 42px;
                 border-radius: var(--radius-2xl);
             }
             
             /* Search bar maintains default size at 1200px */
             
             /* Search title and subtitle styles removed for component version */
             
             .document-card {
                 height: 480px;
             }
             
             .document-preview {
                 height: 160px;
                 min-height: 160px;
                 max-height: 160px;
             }
             
             .document-content {
                 height: 320px;
             }
             
             .document-info {
                 top: 115px;
                 min-height: 100px;
                 max-height: 120px;
                 gap: var(--space-2);
                 padding: var(--space-3) var(--space-4);
             }
          }
          
          @media (max-width: 900px) {
             :root {
                 --bg-offset-top: -1235px; /* Adjust for mobile layout changes */
             }
          
             /* Ensure filters panel stays fixed on mobile too */
             body .filters-panel,
             body .filters-panel.active {
                 width: 90% !important;
                 max-width: 350px !important;
                 position: fixed !important;
                 top: 0 !important;
                 right: 0 !important;
                 bottom: 0 !important;
                 height: 100vh !important;
                 z-index: 9999 !important;
                 margin: 0 !important;
                 padding: 0 !important;
                 transform: translateX(100%) !important;
                 transition: transform 0.5s var(--ease-4) !important;
             }
             
             body .filters-panel.active {
                 transform: translateX(0) !important;
             }
             
             .documents-grid.filters-open {
                 /* No changes - documents stay exactly as they are */
             }
             
             /* Professional Mobile Header styles removed for component version */
             
             /* Professional Mobile Search Section */
             .search-section {
                 padding: var(--space-8) var(--space-5) var(--space-10) var(--space-5);
                 min-height: auto; /* Let content determine height */
                 display: flex;
                 flex-direction: column;
                 justify-content: center;
             }
             
             /* Adjust background positioning line for mobile */
             .search-section::after {
                 transform: translateY(15px); /* Adjust for mobile layout */
             }
             
             /* Search title and subtitle styles removed for component version */
             
             .search-container {
                 max-width: 500px;
                 flex-direction: row;
                 gap: var(--space-2);
                 width: 100%;
                 flex-wrap: nowrap;
             }
             
             .search-bar {
                 width: 300px;
                 max-width: 300px;
                 height: 40px;
                 border-radius: 20px;
             }
             
             .search-bar-container {
                 max-width: 310px;
                 min-height: 60px;
             }
             
             .search-bar-container .glow,
             .search-bar-container .darkBorderBg,
             .search-bar-container .white,
             .search-bar-container .border {
                 max-width: 310px;
                 min-height: 60px;
             }
             
             .filters-btn {
                 border-left: 1px solid var(--gray-200);
                 border-radius: var(--radius-2xl);
                 height: 40px;
                 width: 70px;
                 min-width: 70px;
                 font-size: 11px;
             }
             
             /* Search bar maintains default size at 900px */
             
             .search-input {
                 font-size: 17px;
                 font-weight: 400;
             }
             
             .search-btn {
                 width: 40px;
                 height: 40px;
                 border-radius: var(--radius-md);
                 background: transparent;
                 color: var(--gray-500);
                 margin-right: var(--space-2);
             }
             
             .search-btn:hover {
                 background: var(--gray-100);
                 color: var(--gray-700);
                 transform: scale(1.05);
             }
             
             .filters-btn {
                 height: 44px;
                 width: 44px;
                 min-width: 44px;
                 margin: 0;
                 border-radius: var(--radius-2xl);
                 font-size: 13px;
                 font-weight: 600;
                 gap: 0;
                 box-shadow: var(--shadow-lg);
                 border-left: 1px solid var(--gray-200);
                 padding: var(--space-2);
                 justify-content: center;
             }
             
             .filters-text {
                 display: none;
             }
             
             .compact-search-container {
                 flex-direction: column;
                 gap: var(--space-3);
             }
             
             .compact-search-bar {
                 max-width: none;
             }
             
             .compact-filters-btn {
                 width: 100%;
                 max-width: 200px;
                 margin: 0 auto;
                 justify-content: center;
             }
             
             .compact-filters-text {
                 display: block;
             }
             
             /* Professional Mobile Document Grid */
             .documents-grid {
                 grid-template-columns: repeat(2, minmax(0, 1fr));
                 gap: var(--space-4);
                 margin-top: var(--space-6);
                 padding: 0 var(--space-1);
                 /* Ensure proper grid layout to prevent overlapping */
                 align-items: start;
                 justify-items: center;
             }
             
             .documents-grid.no-results-state {
                 grid-template-columns: repeat(2, minmax(0, 1fr));
                 gap: var(--space-4);
                 margin-top: var(--space-6);
                 padding: 0 var(--space-1);
                 /* Ensure proper grid layout to prevent overlapping */
                 align-items: start;
                 justify-items: center;
             }
             
             .documents-grid.no-results-state {
                 grid-template-columns: repeat(2, minmax(0, 1fr));
                 gap: var(--space-4);
                 margin-top: var(--space-6);
                 padding: 0 var(--space-1);
                 /* Ensure proper grid layout to prevent overlapping */
                 align-items: start;
                 justify-items: center;
             }
             
             .documents-grid:has(.no-results) {
                 /* Remove min-height override - let natural height prevail */
             }
             
             .no-results {
                 /* Remove fixed height - let natural height prevail */
             }
             
             .documents-grid:has(.no-results) .no-results {
                 /* Remove height override - let natural height prevail */
             }
             
          
             
          
             
          
             
             .preview-modal {
                 padding: var(--space-4);
             }
             
             .preview-content {
                 padding: var(--space-6);
                 max-height: 95vh;
             }
             
             .preview-title {
                 font-size: 20px;
             }
             
             .preview-actions {
                 flex-direction: column;
                 gap: var(--space-3);
             }
             
             .btn {
                 width: 100%;
                 justify-content: center;
             }
          }
          
          /* Search bar responsive sizing - Only when screen is smaller than search bar */
          @media (max-width: 520px) {
             .search-container {
                 max-width: 400px;
                 gap: 0;
                 flex-wrap: nowrap;
             }
             
             .search-bar {
                 width: 250px;
                 max-width: 250px;
                 height: 38px;
                 border-radius: 20px;
                 padding: 0 var(--space-3);
             }
             
             .search-bar-container {
                 max-width: 260px;
                 min-height: 60px;
             }
             
             .search-bar-container .glow,
             .search-bar-container .white,
             .search-bar-container .border {
                 max-width: 260px;
                 min-height: 60px;
             }
             
             .search-input {
                 font-size: 14px; /* Prevents zoom on iOS */
             }
             
             .filters-btn {
                 border-left: 1px solid var(--gray-200);
                 border-radius: var(--radius-2xl);
                 width: 60px;
                 min-width: 60px;
                 height: 38px;
                 font-size: 10px;
             }
          }
          
          /* Extra Professional Mobile Design - Small Screens */
          @media (max-width: 600px) {
             :root {
                 --bg-offset-top: -2470px; /* Adjust for small mobile layout */
             }
          
             /* Header styles removed for component version */
             
             .search-section {
                 padding: var(--space-6) var(--space-4) var(--space-8) var(--space-4);
                 min-height: auto; /* Let content determine height */
             }
             
             /* Adjust background positioning line for small screens */
             .search-section::after {
                 transform: translateY(10px); /* Adjust for smallest screens */
             }
             
             .results-section {
                 padding: var(--space-4) var(--space-4) var(--space-16) var(--space-4);
             }
             
             /* Search title and subtitle styles removed for component version */
             
             .search-container {
                 max-width: 350px;
                 gap: 0;
                 flex-wrap: nowrap;
             }
             
             .search-bar {
                 width: 200px;
                 max-width: 200px;
                 height: 36px;
                 border-radius: 20px;
             }
             
             .search-bar-container {
                 max-width: 210px;
                 min-height: 60px;
             }
             
             .search-bar-container .glow,
             .search-bar-container .darkBorderBg,
             .search-bar-container .white,
             .search-bar-container .border {
                 max-width: 210px;
                 min-height: 60px;
             }
             
             .filters-btn {
                 border-left: 1px solid var(--gray-200);
                 border-radius: var(--radius-2xl);
                 height: 36px;
                 width: 55px;
                 min-width: 55px;
                 font-size: 9px;
                 margin-left: 8px;
                 padding: 0;
                 gap: 0;
                 justify-content: center;
                 align-items: center;
             }
             
             .filters-btn .filters-text {
                 display: none !important;
                 width: 0;
                 height: 0;
                 overflow: hidden;
                 position: absolute;
                 opacity: 0;
             }
             
             .filters-btn .material-symbols-outlined {
                 font-size: 16px;
                 margin: 0;
                 padding: 0;
                 display: flex;
                 align-items: center;
                 justify-content: center;
                 width: 100%;
                 height: 100%;
             }
             
             /* Search bar size handled by 520px media query when needed */
             
             .search-input,
             .compact-search-input {
                 font-size: 16px; /* iOS optimization - prevents zoom */
             }
             
             .search-btn {
                 width: 40px;
                 height: 40px;
                 border-radius: var(--radius-md);
                 background: transparent;
                 color: var(--gray-500);
             }
             
             .search-btn:hover {
                 background: var(--gray-100);
                 color: var(--gray-700);
                 transform: scale(1.05);
             }
             
             /* Filters button size handled by 520px media query when needed */
             
             /* Single Column Layout for Small Screens */
             .documents-grid {
                 grid-template-columns: minmax(0, 1fr);
                 gap: var(--space-5);
                 padding: 0 var(--space-2);
                 /* Ensure proper grid layout to prevent overlapping */
                 align-items: start;
                 justify-items: center;
             }
             
             .documents-grid:has(.no-results) {
                 /* Remove min-height override - let natural height prevail */
             }
             
             .no-results {
                 /* Remove fixed height - let natural height prevail */
             }
             
             .documents-grid:has(.no-results) .no-results {
                 /* Remove height override - let natural height prevail */
             }
             
             .document-card {
                 height: 420px;
                 max-width: 100%;
                 border-radius: var(--radius-3xl);
                 box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
             }
             
             .document-preview {
                 height: 160px;
                 min-height: 160px;
                 max-height: 160px;
                 border-radius: var(--radius-3xl) var(--radius-3xl) 0 0;
             }
             
             .document-content {
                 height: 260px;
                 padding: var(--space-4);
             }
             
             .document-title {
                 font-size: 15px;
                 font-weight: 800;
                 line-height: 1.25;
                 -webkit-line-clamp: 2;
             }
             
             .document-description {
                 font-size: 12px;
                 line-height: 1.4;
                 -webkit-line-clamp: 3;
             }
             
             .document-info {
                 position: absolute;
                 top: 70px;
                 left: var(--space-5);
                 right: var(--space-5);
                 min-height: 90px;
                 max-height: 110px;
                 
                 display: flex;
                 flex-direction: column;
                 gap: var(--space-2);
                 padding: var(--space-3) var(--space-3);
                 
                 background: rgba(255, 255, 255, 0.85); /* Even more opaque for small screens */
                 backdrop-filter: blur(12px) saturate(180%);
                 -webkit-backdrop-filter: blur(12px) saturate(180%);
                 
                 border-radius: var(--radius-2xl);
                 border: 1px solid rgba(255, 255, 255, 0.95);
                 
                 box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                 
                 overflow: hidden;
                 z-index: 1; /* Same z-index as other content */
             }
             
             .document-info-item {
                 display: flex;
                 align-items: center;
                 gap: var(--space-2);
                 font-size: 10px;
                 color: var(--gray-800);
                 font-weight: 500;
                 line-height: 1.3;
                 
                 height: auto;
                 min-height: 14px;
                 max-height: 18px;
                 
                 overflow: hidden;
                 text-overflow: ellipsis;
                 white-space: nowrap;
                 
                 text-align: left;
                 flex-shrink: 0;
             }
             
             .document-price {
                 font-size: 16px;
                 font-weight: 900;
             }
             
             /* Mobile owner avatar adjustments */
             .owner-avatar, .author-avatar {
                 width: 20px;
                 height: 20px;
                 font-size: 10px;
                 border-radius: 50%;
                 padding: 0;
                 line-height: 1;
             }
             
             /* Mobile cart button adjustments */
             .document-footer-right {
                 gap: var(--space-1);
             }
             
             .price-cart-container {
                 padding: var(--space-1);
                 gap: var(--space-1);
             }
             
             .price-cart-container .document-price {
                 padding: var(--space-1) var(--space-2);
                 font-size: 14px;
             }
             
             .add-to-cart-btn {
                 min-width: 32px;
                 height: 32px;
                 padding: var(--space-1) var(--space-2);
             }
             
             .add-to-cart-btn .material-symbols-outlined {
                 font-size: 14px;
             }
             
          
             
             /* Professional Mobile Filter Panel */
             .filters-header {
                 padding: var(--space-5) var(--space-4) var(--space-3) var(--space-4);
                 border-bottom: 1px solid rgba(0, 0, 0, 0.06);
             }
             
             .filters-title h2 {
                 font-size: 18px;
                 font-weight: 800;
                 margin-bottom: var(--space-1);
             }
             
             .filters-subtitle {
                 font-size: 13px;
                 color: rgba(77, 77, 77, 0.7);
                 font-weight: 500;
             }
             
             .filters-close {
                 width: 40px;
                 height: 40px;
                 border-radius: var(--radius-xl);
                 background: rgba(0, 0, 0, 0.04);
             }
             
             .filters-close:hover {
                 background: rgba(0, 0, 0, 0.08);
             }
             
             .filters-grid {
                 padding: var(--space-4);
                 gap: var(--space-5);
                 overflow-y: auto;
                 max-height: calc(70vh - 120px);
             }
             
             .filter-section {
                 padding: var(--space-4);
                 border-radius: var(--radius-2xl);
                 background: rgba(255, 255, 255, 0.6);
                 border: 1px solid rgba(0, 0, 0, 0.04);
             }
             
             .filter-section-title {
                 font-size: 15px;
                 font-weight: 700;
                 margin-bottom: var(--space-3);
                 color: var(--gray-800);
             }
             
             .price-toggle-group,
             .size-toggle-group,
             .time-toggle-group {
                 grid-template-columns: repeat(2, 1fr);
                 gap: var(--space-2);
             }
             
             .price-toggle,
             .size-toggle,
             .time-toggle {
                 font-size: 12px;
                 font-weight: 600;
                 min-height: 48px;
                 padding: var(--space-2);
                 border-radius: var(--radius-xl);
                 transition: all 0.2s ease;
             }
             
             .price-toggle:active,
             .size-toggle:active,
             .time-toggle:active {
                 transform: scale(0.95);
             }
             
             /* Mobile Filter Tags */
             .active-filters {
                 gap: var(--space-2);
                 padding: var(--space-4);
                 background: rgba(255, 255, 255, 0.8);
                 border-radius: var(--radius-2xl);
                 margin: var(--space-4);
             }
          
             .filter-tag {
                 padding: var(--space-2) var(--space-3);
                 font-size: 11px;
                 font-weight: 600;
                 gap: var(--space-1);
                 border-radius: var(--radius-xl);
                 min-height: 36px;
                 border: 1px solid rgba(0, 0, 0, 0.08);
             }
          
             .filter-tag .material-symbols-outlined {
                 font-size: 14px;
             }
             
             .filter-tag.clear-all-tag {
                 /* Remove order property to respect DOM order */
                 width: 100%;
                 justify-content: center;
                 margin-bottom: var(--space-2);
                 background: rgba(239, 68, 68, 0.1);
                 color: #dc2626;
                 border-color: rgba(239, 68, 68, 0.2);
             }
             
             .filter-tag.clear-all-tag::after {
                 font-size: 14px;
                 margin-left: var(--space-1);
             }
          }
          
          /* Professional Tablet Design */
          /* Medium screens: 600-900px range - smaller search bar */
          @media (max-width: 900px) and (min-width: 601px) {
             .search-container {
                 max-width: 600px;
             }
             
             .search-bar {
                 height: 44px;
                 max-width: 400px;
                 width: 100%;
             }
             
             .filters-btn {
                 border-left: 1px solid var(--gray-200);
                 border-radius: var(--radius-2xl);
                 height: 44px;
                 width: 44px;
                 min-width: 44px;
                 gap: 0;
                 padding: var(--space-2);
                 justify-content: center;
             }
             
             .search-btn {
                 width: 40px;
                 height: 40px;
                 border-radius: var(--radius-md);
                 background: transparent;
                 color: var(--gray-500);
             }
             
             .search-btn:hover {
                 background: var(--gray-100);
                 color: var(--gray-700);
                 transform: scale(1.05);
             }
             
             /* Adjust background positioning line for medium screens */
             .search-section::after {
                 transform: translateY(18px);
             }
          }
          
          @media (max-width: 768px) and (min-width: 601px) {
             :root {
                 --bg-offset-top: -1300px; /* Adjust for tablet layout */
             }
          
             /* Search title and subtitle styles removed for component version */
             
             .documents-grid {
                 grid-template-columns: repeat(2, minmax(0, 1fr));
                 gap: var(--space-4);
             }
             
             .document-card {
                 height: 400px;
                 border-radius: var(--radius-2xl);
             }
             
             .document-preview {
                 height: 140px;
                 min-height: 140px;
                 max-height: 140px;
             }
             
             .document-content {
                 height: 260px;
                 padding: var(--space-4);
             }
             
             .document-title {
                 font-size: 14px;
                 font-weight: 700;
             }
             
             .document-description {
                 font-size: 12px;
             }
             
             /* Tablet filters panel already handled by main definition */
          }
          
          /* Enhanced Touch Interactions */
          @media (hover: none) and (pointer: coarse) {
             .search-btn:active {
                 transform: scale(0.95);
             }
             
             .filters-btn:active,
             .compact-filters-btn:active {
                 transform: scale(0.98);
             }
             
             .document-card:active {
                 transform: scale(0.98);
             }
             
             .filter-tag:active {
                 transform: scale(0.95);
             }
             
             /* Header-related styles removed for component version */
          }
          
          /* Utility Classes */
          ::-webkit-scrollbar {
             width: 8px;
          }
          
          ::-webkit-scrollbar-track {
             background: transparent;
          }
          
          ::-webkit-scrollbar-thumb {
             background: linear-gradient(180deg, var(--gray-300) 0%, var(--gray-400) 100%);
             border-radius: 4px;
             border: 1px solid var(--gray-200);
          }
          
          ::-webkit-scrollbar-thumb:hover {
             background: linear-gradient(180deg, var(--gray-400) 0%, var(--gray-500) 100%);
          }
          
          /* Touch device optimizations */
          @media (hover: none) and (pointer: coarse) {
             .document-card:hover {
                 transform: none;
                 box-shadow: var(--shadow-md);
             }
             
             .document-card:hover::before {
                 opacity: 0;
             }
             
             .document-card:hover .document-preview img {
                 transform: none;
                 filter: contrast(1.02) saturate(0.98) brightness(1.02);
             }
             
             .filters-btn:hover,
             .search-bar:hover,
             .compact-filters-btn:hover,
             .compact-search-bar:hover {
                 transform: none;
                 box-shadow: var(--shadow-sm);
             }
          }
          
          /* High contrast mode support */
          @media (prefers-contrast: high) {
             :root {
                 --gray-200: #d0d0d0;
                 --gray-300: #b0b0b0;
                 --gray-400: #909090;
                 --gray-500: #707070;
             }
             
             .document-card {
                 border-width: 2px;
             }
             
             .filters-btn,
             .search-bar,
             .compact-filters-btn,
             .compact-search-bar {
                 border-width: 2px;
             }
          }
          
          /* Reduced motion support */
          @media (prefers-reduced-motion: reduce) {
             *,
             *::before,
             *::after {
                 animation-duration: 0.01ms !important;
                 animation-iteration-count: 1 !important;
                 transition-duration: 0.01ms !important;
                 scroll-behavior: auto !important;
             }
             
             .document-card:hover {
                 transform: none;
             }
             
             .filters-btn:hover,
             .search-bar:hover,
             .compact-filters-btn:hover,
             .compact-search-bar:hover {
                 transform: none;
             }
          }
          
          /* Dark mode support (if needed) */
          @media (prefers-color-scheme: dark) {
             /* Can be implemented later if needed */
          }
          
          /* Print styles */
          @media print {
             /* Header styles removed for component version */
             .filters-panel,
             .filters-overlay,
             .preview-modal {
                 display: none !important;
             }
             
             .main-content {
                 margin: 0 !important;
                 transform: none !important;
             }
             
             .document-card {
                 break-inside: avoid;
                 box-shadow: none;
                 border: 1px solid #000;
             }
          }
          
          /* Autocomplete Filter Styles */
          
          
          /* Professional Dropdown Styles */
          .dropdown-container {
              position: relative;
              z-index: 1;
          }
          
          .dropdown-container.open {
              z-index: 10001;
          }
          
          .dropdown-input-wrapper {
              position: relative;
              display: flex;
              align-items: center;
              cursor: pointer;
          }
          
          .dropdown-input {
              width: 100%;
              padding: var(--space-3) var(--space-4);
              padding-right: 40px;
              border: 2px solid var(--gray-200);
              border-radius: var(--radius-md);
              font-size: 14px;
              font-weight: 400;
              color: var(--gray-800);
              background: var(--white);
              transition: all 0.15s var(--ease-1);
              outline: none;
              font-family: inherit;
              cursor: text;
          }
          
          .dropdown-input[readonly] {
              cursor: pointer;
          }
          
          .dropdown-input:hover {
              border-color: var(--blue-500);
          }
          
          .dropdown-input:focus,
          .dropdown-container.open .dropdown-input {
              border-color: var(--blue-600);
              box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
          }
          
          .dropdown-input::placeholder {
              color: var(--gray-500);
              font-style: italic;
          }
          
          /* Special styling for Tipologia Documento section dropdowns */
          .filter-section:nth-child(2) .dropdown-input::placeholder {
              color: var(--gray-800);
              font-style: normal;
          }
          
          .dropdown-arrow {
              position: absolute;
              right: 12px;
              color: var(--gray-500);
              font-size: 20px;
              pointer-events: auto;
              transition: transform 0.15s var(--ease-1);
              cursor: pointer;
              z-index: 10;
          }
          
          .dropdown-container.open .dropdown-arrow {
              transform: rotate(180deg);
              color: var(--blue-600);
          }
          
          .dropdown-arrow:hover {
              color: var(--blue-600);
              transform: scale(1.1);
          }
          
          .dropdown-container.open .dropdown-arrow:hover {
              color: var(--blue-700);
              transform: rotate(180deg) scale(1.1);
          }
          
          .dropdown-content {
              position: absolute;
              top: 100%;
              left: 0;
              right: 0;
              background: var(--white);
              border: 2px solid var(--blue-300);
              border-top: none;
              border-radius: 0 0 var(--radius-md) var(--radius-md);
              z-index: 9999;
              display: none;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
              backdrop-filter: blur(20px);
              overflow: hidden;
              max-height: 250px;
              width: 100%;
              margin: 0;
          }
          
          .dropdown-container.open .dropdown-content {
              display: block !important;
              z-index: 10000;
          }
          
          .dropdown-options {
              max-height: 200px;
              overflow-y: auto;
          }
          
          .dropdown-option {
              padding: var(--space-3) var(--space-4);
              cursor: pointer;
              border-bottom: 1px solid var(--gray-100);
              transition: all 0.2s var(--ease-2);
              font-size: 14px;
              color: var(--gray-700);
              display: flex;
              align-items: center;
              justify-content: space-between;
          }
          
          .dropdown-option:hover {
              background: var(--blue-50);
              color: var(--blue-700);
          }
          
          .dropdown-option:last-child {
              border-bottom: none;
          }
          
          .dropdown-option.selected {
              background: var(--blue-100);
              color: var(--blue-800);
              font-weight: 500;
          }
          
          .dropdown-option.selected.has-active-filter {
              background: var(--blue-100);
              color: var(--blue-800);
              font-weight: 600;
              position: relative;
          }
          
          .dropdown-option.selected.has-active-filter .dropdown-option-check {
              color: var(--blue-600);
              opacity: 1;
          }
          
          .dropdown-option.has-active-filter:not(.selected) {
              background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
              color: #374151;
              position: relative;
              border-left: 3px solid #3b82f6;
          }
          
          .dropdown-option.has-active-filter:not(.selected)::after {
              content: '○';
              position: absolute;
              right: 16px;
              top: 50%;
              transform: translateY(-50%);
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #3b82f6;
              font-size: 8px;
              color: #3b82f6;
          }
          
          .dropdown-option.has-active-filter:not(.selected):hover {
              background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
              border-left-color: #ef4444;
          }
          
          .dropdown-option.has-active-filter:not(.selected):hover::after {
              content: '×';
              background: transparent;
              color: #ef4444;
              font-size: 14px;
              font-weight: 700;
              width: auto;
              height: auto;
          }
          
          .dropdown-option.highlighted {
              background: var(--blue-100);
              color: var(--blue-800);
          }
          
          .dropdown-option-check {
              font-size: 16px;
              color: var(--blue-600);
              opacity: 0;
              transition: opacity 0.2s var(--ease-2);
          }
          
          .dropdown-option.selected .dropdown-option-check {
              opacity: 1;
          }
          
          .dropdown-option-remove {
              font-size: 16px;
              color: var(--red-500);
              opacity: 1;
              transition: all 0.2s var(--ease-2);
              cursor: pointer;
          }
          
          .dropdown-option.has-active-filter:hover .dropdown-option-remove {
              color: var(--red-600);
              transform: scale(1.1);
          }
          
          .dropdown-option.has-active-filter {
              background: var(--blue-50);
              border-left: 3px solid var(--blue-500);
              color: var(--blue-800);
              font-weight: 600;
          }
          
          /* Scrollbar styling for dropdown */
          .dropdown-options::-webkit-scrollbar {
              width: 6px;
          }
          
          .dropdown-options::-webkit-scrollbar-track {
              background: var(--gray-100);
          }
          
          .dropdown-options::-webkit-scrollbar-thumb {
              background: var(--gray-400);
              border-radius: 3px;
          }
          
          .dropdown-options::-webkit-scrollbar-thumb:hover {
              background: var(--gray-500);
          }
          
          /* Dropdown Separator for Multi-Select */
          .dropdown-separator {
              height: 1px;
              background: linear-gradient(90deg, transparent 0%, var(--gray-300) 20%, var(--gray-300) 80%, transparent 100%);
              margin: var(--space-2) var(--space-3);
              position: relative;
          }
          
          .dropdown-separator::after {
              content: '';
              position: absolute;
              top: -1px;
              left: 50%;
              transform: translateX(-50%);
              width: 40px;
              height: 3px;
              background: var(--white);
              border-radius: 2px;
          }
          
          /* Enhanced Multi-Select Dropdown Options */
          .dropdown-option.selected.has-active-filter {
              background: linear-gradient(135deg, var(--blue-50) 0%, var(--blue-100) 100%);
              border: 1px solid var(--blue-200);
              border-radius: var(--radius-md);
              margin: 2px var(--space-2);
              padding: var(--space-3) var(--space-4);
              color: var(--blue-800);
              font-weight: 600;
              box-shadow: 0 2px 4px rgba(14, 165, 233, 0.1);
              transition: all 0.2s var(--ease-2);
          }
          
          .dropdown-option.selected.has-active-filter:hover {
              background: linear-gradient(135deg, var(--red-50) 0%, var(--red-100) 100%);
              border-color: var(--red-300);
              color: var(--red-800);
              box-shadow: 0 4px 8px rgba(239, 68, 68, 0.15);
          }
          
          .dropdown-option.selected.has-active-filter .dropdown-option-remove {
              color: var(--blue-600);
              font-size: 16px;
              font-weight: 600;
              transition: all 0.2s var(--ease-2);
          }
          
          .dropdown-option.selected.has-active-filter:hover .dropdown-option-remove {
              color: var(--red-600);
              transform: scale(1.1);
          }
          
          /* Multi-Select Input Styling */
          .dropdown-input[data-multi-selected] {
              font-weight: 600;
              color: var(--blue-700);
              background: linear-gradient(135deg, var(--blue-50) 0%, var(--white) 100%);
          }
          
          /* Multi-Select Count Badge in Input */
          .dropdown-input.has-multiple::after {
              content: attr(data-count);
              position: absolute;
              right: 35px;
              top: 50%;
              transform: translateY(-50%);
              background: var(--blue-600);
              color: var(--white);
              font-size: 10px;
              font-weight: 700;
              padding: 2px 6px;
              border-radius: 10px;
              min-width: 16px;
              height: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              pointer-events: none;
          }
          
          /* View Files Button */
          .view-files-button {
              position: absolute;
              top: 8px;
              right: 8px;
              background-color: rgba(0, 0, 0, 0.6);
              color: white;
              border: none;
              border-radius: var(--radius-md);
              padding: 4px 8px;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 4px;
              opacity: 0;
              transform: translateY(5px);
              transition: all 0.2s ease-in-out;
              backdrop-filter: blur(5px);
          }
          
          .document-card:hover .view-files-button {
              opacity: 1;
              transform: translateY(0);
          }
          
          .view-files-button:hover {
              background-color: rgba(0, 0, 0, 0.8);
          }
          
          .view-files-button .material-symbols-outlined {
              font-size: 14px;
          }
          
          
          /* Quick Look Modal */
          .quick-look-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0, 0, 0, 0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 99999;
              opacity: 0;
              transition: opacity 0.3s ease-in-out;
              backdrop-filter: blur(8px);
          }
          
          .quick-look-overlay.visible {
              opacity: 1;
          }
          
          .quick-look-modal {
              background-color: var(--gray-100);
              width: 90%;
              max-width: 1000px;
              height: 80vh;
              border-radius: var(--radius-xl);
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
              display: flex;
              flex-direction: column;
              overflow: hidden;
              transform: scale(0.95);
              transition: transform 0.3s ease-in-out;
          }
          
          .quick-look-overlay.visible .quick-look-modal {
              transform: scale(1);
          }
          
          .quick-look-close-button {
              position: absolute;
              top: 12px;
              right: 12px;
              background: rgba(0,0,0,0.2);
              color: white;
              border: none;
              border-radius: 50%;
              width: 30px;
              height: 30px;
              font-size: 20px;
              cursor: pointer;
              z-index: 10;
              display: flex;
              align-items: center;
              justify-content: center;
          }
          
          .quick-look-header {
              padding: 20px 24px;
              background-color: var(--gray-800);
              color: white;
              border-bottom: 1px solid var(--gray-700);
              flex-shrink: 0;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 20px;
          }
          
          .quick-look-header-content {
              flex-grow: 1;
          }
          
          .quick-look-title {
              font-size: 20px;
              margin: 0 0 8px 0;
              font-weight: 600;
          }
          
          .quick-look-description {
              font-size: 14px;
              opacity: 0.8;
              margin: 0 0 12px 0;
              line-height: 1.4;
          }
          
          .quick-look-meta {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 13px;
              opacity: 0.7;
          }
          
          .quick-look-separator {
              opacity: 0.5;
          }
          
          .quick-look-actions {
              flex-shrink: 0;
          }
          
          .quick-look-view-full-btn {
              background: rgba(255, 255, 255, 0.1);
              color: white;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: var(--radius-md);
              padding: 8px 16px;
              font-size: 13px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 6px;
              transition: all 0.2s ease;
          }
          
          .quick-look-view-full-btn:hover {
              background: rgba(255, 255, 255, 0.2);
              border-color: rgba(255, 255, 255, 0.3);
          }
          
          .quick-look-view-full-btn .material-symbols-outlined {
              font-size: 16px;
          }
          
          .quick-look-body {
              display: flex;
              flex-grow: 1;
              min-height: 0;
          }
          
          .quick-look-main-preview {
              flex-grow: 1;
              padding: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: var(--gray-200);
          }
          
          .preview-placeholder, .preview-content-area {
              text-align: center;
              color: var(--gray-500);
              max-width: 500px;
              margin: 0 auto;
          }
          
          .preview-placeholder .material-symbols-outlined {
              font-size: 80px;
              color: var(--gray-400);
              margin-bottom: 16px;
          }
          
          .preview-placeholder p {
              font-size: 16px;
              margin: 0;
          }
          
          .preview-icon-large {
              font-size: 120px;
              color: var(--blue-500);
              margin-bottom: 20px;
          }
          
          .preview-filename {
              font-size: 18px;
              font-weight: 600;
              color: var(--gray-800);
              margin: 0 0 12px 0;
              word-break: break-word;
              line-height: 1.3;
          }
          
          .preview-file-details {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              font-size: 14px;
              color: var(--gray-600);
              margin-bottom: 16px;
          }
          
          .preview-file-type {
              font-weight: 500;
              color: var(--blue-600);
          }
          
          .preview-file-separator {
              opacity: 0.5;
          }
          
          .preview-file-size {
              color: var(--gray-500);
          }
          
          .preview-file-info {
              text-align: left;
              background-color: var(--gray-50);
              border-radius: var(--radius-md);
              padding: 16px;
              border: 1px solid var(--gray-200);
          }
          
          .preview-file-description {
              font-size: 14px;
              line-height: 1.5;
              color: var(--gray-700);
              margin: 0;
          }
          
          .quick-look-sidebar {
              width: 320px;
              border-left: 1px solid var(--gray-300);
              background-color: var(--white);
              overflow-y: auto;
              flex-shrink: 0;
              display: flex;
              flex-direction: column;
          }
          
          .quick-look-sidebar-header {
              padding: 16px 20px;
              border-bottom: 1px solid var(--gray-200);
              background-color: var(--gray-50);
              flex-shrink: 0;
          }
          
          .quick-look-sidebar-header h3 {
              margin: 0;
              font-size: 14px;
              font-weight: 600;
              color: var(--gray-700);
          }
          
          .quick-look-file-list {
              list-style: none;
              padding: 0;
              margin: 0;
              flex-grow: 1;
          }
          
          .quick-look-file-item {
              display: flex;
              align-items: center;
              padding: 12px 16px;
              border-bottom: 1px solid var(--gray-200);
              cursor: pointer;
              transition: all 0.2s ease;
              gap: 12px;
          }
          
          .quick-look-file-item:hover {
              background-color: var(--blue-50);
          }
          
          .quick-look-file-item.active {
              background-color: var(--blue-100);
              border-left: 4px solid var(--blue-500);
              padding-left: 12px;
          }
          
          .file-item-icon {
              font-size: 24px;
              color: var(--gray-600);
              flex-shrink: 0;
          }
          
          .quick-look-file-item.active .file-item-icon {
              color: var(--blue-600);
          }
          
          .file-item-content {
              flex-grow: 1;
              min-width: 0;
          }
          
          .file-item-name {
              font-size: 13px;
              font-weight: 500;
              color: var(--gray-800);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-bottom: 2px;
          }
          
          .file-item-details {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 11px;
              color: var(--gray-500);
          }
          
          .file-item-type {
              font-weight: 500;
          }
          
          .file-item-separator {
              opacity: 0.5;
          }
          
          .file-item-size {
              font-size: 11px;
              color: var(--gray-500);
          }
          
          .document-preview:hover .file-stack-container .stack-layer {
              border-color: var(--gray-300);
              transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          
          .document-preview:hover .stack-front {
              transform: translate(2px, -2px) rotate(2deg) scale(1.01);
              transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          
          .document-preview:hover .stack-middle {
              transform: translate(0px, -1px) rotate(0deg) scale(1.005);
              transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          
          .document-preview:hover .stack-back {
              transform: translate(-2px, -2px) rotate(-2deg) scale(1.01);
              transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          
          /* ===========================
            PROFESSIONAL LOADING ANIMATIONS
            =========================== */
          
          /* Base Shimmer Animation */
          @keyframes shimmer {
              0% {
                  transform: translateX(-100%);
              }
              100% {
                  transform: translateX(100%);
              }
          }
          
          @keyframes professionalShine {
              0% {
                  left: -100%;
                  opacity: 0;
              }
              10% {
                  opacity: 1;
              }
              90% {
                  opacity: 1;
              }
              100% {
                  left: 100%;
                  opacity: 0;
              }
          }
          
          @keyframes shimmerWave {
              0% {
                  background-position: -200% 0;
              }
              100% {
                  background-position: 200% 0;
              }
          }
          
          @keyframes skeletonWave {
              0% {
                  background-position: -200% 0;
              }
              100% {
                  background-position: 200% 0;
              }
          }
          
          /* Loading Card Container */
          .document-card.loading,
          .loading-card {
              position: relative;
              background: linear-gradient(135deg, 
                  var(--white) 0%, 
                  #fefefe 50%, 
                  var(--white) 100%);
              border: 1px solid var(--gray-200);
              box-shadow: 
                  var(--shadow-md),
                  0 0 20px rgba(255, 255, 255, 0.1),
                  inset 0 1px 0 rgba(255, 255, 255, 0.8);
              overflow: hidden;
              animation: shimmerWave 3.2s ease-in-out infinite;
              background-size: 400% 100%;
              will-change: background-position;
              /* Fixed dimensions to prevent size animation */
              height: 560px;
              min-height: 560px;
              max-height: 560px;
              display: flex;
              flex-direction: column;
              min-width: 0;
              width: 100%;
              max-width: 100%;
              /* Prevent any size transitions */
              transition: none;
              transform: none;
          }
          
          .document-card.loading:hover,
          .loading-card:hover {
              /* Disable hover effects for loading cards */
              transform: none;
              box-shadow: 
                  var(--shadow-md),
                  0 0 20px rgba(255, 255, 255, 0.1),
                  inset 0 1px 0 rgba(255, 255, 255, 0.8);
          }
          
          /* Professional shine overlay effect */
          .document-card.loading::before,
          .loading-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(
                  110deg,
                  transparent 0%,
                  transparent 35%,
                  rgba(255, 255, 255, 0.8) 45%,
                  rgba(255, 255, 255, 1) 50%,
                  rgba(255, 255, 255, 0.8) 55%,
                  transparent 65%,
                  transparent 100%
              );
              animation: professionalShine 3.4s ease-in-out infinite;
              z-index: 10;
              pointer-events: none;
              will-change: transform;
              border-radius: var(--radius-3xl);
          }
          
          /* Disable interactions for loading cards */
          .document-card.loading .favorite-button,
          .loading-card .favorite-button {
              pointer-events: none;
              opacity: 0.3;
          }
          
          .document-card.loading .favorite-button:hover,
          .loading-card .favorite-button:hover {
              background: rgba(255, 255, 255, 0.05);
          }
          
          /* Enhanced preview area shimmer */
          .document-card.loading .document-preview,
          .loading-card .document-preview,
          .document-card.loading .loading-preview,
          .loading-card .loading-preview {
              background: linear-gradient(110deg, 
                  var(--gray-100) 25%, 
                  var(--gray-50) 45%, 
                  var(--white) 50%, 
                  var(--gray-50) 55%, 
                  var(--gray-100) 75%);
              background-size: 400% 100%;
              animation: shimmerWave 2.8s ease-in-out infinite;
              position: relative;
              overflow: hidden;
              will-change: background-position;
              /* Fixed preview sizing to prevent animation */
              height: 240px;
              min-height: 240px;
              max-height: 240px;
              border-bottom: 1px solid var(--gray-200);
              flex-shrink: 0;
          }
          
          /* Make loading cards invisible but keep their space when no results */
          .documents-grid:not(.loading):not(.no-results-state) .document-card.loading,
          .documents-grid:not(.loading):not(.no-results-state) .loading-card {
              opacity: 0;
              visibility: hidden;
              /* Keep the space occupied */
              position: relative;
              /* Maintain dimensions */
              width: 100%;
              height: 100%;
              min-height: 560px;
              /* Ensure no interactions */
              pointer-events: none;
              /* Keep animations disabled */
              animation: none;
          }
          
          /* Ensure loading cards are visible when grid has loading class */
          .documents-grid.loading .document-card.loading,
          .documents-grid.loading .loading-card {
              opacity: 1;
              visibility: visible;
              pointer-events: auto;
          }
          
          /* FIXED: Remove loading cards from layout in no-results state */
          .documents-grid.no-results-state .document-card.loading,
          .documents-grid.no-results-state .loading-card {
              display: none !important; /* Completely remove from layout */
              opacity: 0; /* Completely invisible */
              visibility: hidden; /* Remove from layout flow */
              pointer-events: none;
          }
          
          /* Responsive loading cards - match normal card grid behavior */
          @media (max-width: 1600px) {
              .documents-grid:not(.loading):not(.no-results-state) .document-card.loading,
              .documents-grid:not(.loading):not(.no-results-state) .loading-card {
                  min-height: 520px;
              }
              
              .document-card.loading,
              .loading-card {
                  height: 520px;
                  min-height: 520px;
                  max-height: 520px;
                  max-width: 100%;
              }
              
              /* Ensure loading cards are hidden in no-results state at all screen sizes */
              .documents-grid.no-results-state .document-card.loading,
              .documents-grid.no-results-state .loading-card,
              .documents-grid.no-results-state .document-card.loading-card {
                  display: none !important;
                  opacity: 0 !important;
                  visibility: hidden !important;
              }
          }
          
          @media (max-width: 1400px) {
              .documents-grid:not(.loading):not(.no-results-state) .document-card.loading,
              .documents-grid:not(.loading):not(.no-results-state) .loading-card {
                  min-height: 500px;
              }
              
              .document-card.loading,
              .loading-card {
                  height: 500px;
                  min-height: 500px;
                  max-height: 500px;
                  max-width: 100%;
              }
              
              /* Ensure loading cards are hidden in no-results state */
              .documents-grid.no-results-state .document-card.loading,
              .documents-grid.no-results-state .loading-card,
              .documents-grid.no-results-state .document-card.loading-card {
                  display: none !important;
                  opacity: 0 !important;
                  visibility: hidden !important;
              }
          }
          
          @media (max-width: 1200px) {
              .documents-grid:not(.loading):not(.no-results-state) .document-card.loading,
              .documents-grid:not(.loading):not(.no-results-state) .loading-card {
                  min-height: 480px;
              }
              
              .document-card.loading,
              .loading-card {
                  height: 480px;
                  min-height: 480px;
                  max-height: 480px;
                  max-width: 100%;
              }
              
              /* Ensure loading cards are hidden in no-results state */
              .documents-grid.no-results-state .document-card.loading,
              .documents-grid.no-results-state .loading-card,
              .documents-grid.no-results-state .document-card.loading-card {
                  display: none !important;
                  opacity: 0 !important;
                  visibility: hidden !important;
              }
          }
          
          @media (max-width: 900px) {
              .documents-grid:not(.loading):not(.no-results-state) .document-card.loading,
              .documents-grid:not(.loading):not(.no-results-state) .loading-card {
                  min-height: 380px;
              }
              
              .document-card.loading,
              .loading-card {
                  height: 380px;
                  min-height: 380px;
                  max-height: 380px;
                  max-width: 100%;
              }
              
              /* Fixed preview sizing for mobile */
              .document-card.loading .document-preview,
              .loading-card .document-preview,
              .document-card.loading .loading-preview,
              .loading-card .loading-preview {
                  height: 120px;
                  min-height: 120px;
                  max-height: 120px;
              }
          }
          
          @media (max-width: 600px) {
              .documents-grid:not(.loading):not(.no-results-state) .document-card.loading,
              .documents-grid:not(.loading):not(.no-results-state) .loading-card {
                  min-height: 320px;
              }
              
              .document-card.loading,
              .loading-card {
                  height: 320px;
                  min-height: 320px;
                  max-height: 320px;
                  max-width: 100%;
              }
              
              /* Fixed preview sizing for small mobile */
              .document-card.loading .document-preview,
              .loading-card .document-preview,
              .document-card.loading .loading-preview,
              .loading-card .loading-preview {
                  height: 100px;
                  min-height: 100px;
                  max-height: 100px;
              }
          }
          
          /* Loading cards grid behavior - match normal cards */
          .documents-grid.loading {
              grid-template-columns: repeat(8, minmax(0, 1fr));
          }
          
          @media (max-width: 2500px) {
              .documents-grid.loading {
                  grid-template-columns: repeat(7, minmax(0, 1fr));
              }
              
              /* Fixed loading card dimensions for 7-column layout */
              .document-card.loading,
              .loading-card {
                  height: 540px;
                  min-height: 540px;
                  max-height: 540px;
              }
              
              .document-card.loading .document-preview,
              .loading-card .document-preview,
              .document-card.loading .loading-preview,
              .loading-card .loading-preview {
                  height: 220px;
                  min-height: 220px;
                  max-height: 220px;
              }
          }
          
          @media (max-width: 2300px) {
              .documents-grid.loading {
                  grid-template-columns: repeat(6, minmax(0, 1fr));
              }
          }
          
          @media (max-width: 1800px) {
              .documents-grid.loading {
                  grid-template-columns: repeat(5, minmax(0, 1fr));
              }
          }
          
          @media (max-width: 1600px) {
              .documents-grid.loading {
                  grid-template-columns: repeat(4, minmax(0, 1fr));
              }
          }
          
          @media (max-width: 1400px) {
              .documents-grid.loading {
                  grid-template-columns: repeat(3, minmax(0, 1fr));
              }
          }
          
          @media (max-width: 1200px) {
              .documents-grid.loading {
                  grid-template-columns: repeat(3, minmax(0, 1fr));
              }
          }
          
          @media (max-width: 900px) {
              .documents-grid.loading {
                  grid-template-columns: repeat(2, minmax(0, 1fr));
              }
          }
          
          @media (max-width: 600px) {
              .documents-grid.loading {
                  grid-template-columns: minmax(0, 1fr);
              }
          }
          
          /* Content area specialized shimmer */
          .document-card.loading .document-content,
          .loading-card .document-content {
              background: var(--white);
              flex: 1;
              display: flex;
              flex-direction: column;
              padding: var(--space-6);
              position: relative;
              overflow: hidden;
          }
          
          .document-card.loading .document-content::after,
          .loading-card .document-content::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(
                  90deg,
                  transparent 20%,
                  rgba(255, 255, 255, 0.08) 50%,
                  transparent 80%
              );
              animation: professionalShine 2.6s ease-in-out infinite;
              pointer-events: none;
              will-change: transform;
          }
          
          /* Professional Skeleton System - Matching Real Card Structure */
          
          /* Preview Area Skeletons - Match real document-preview */
          /* Circle Skeleton - Top left of preview */
          .skeleton-preview-circle {
              position: absolute;
              top: 16px;
              left: 16px;
              width: 32px;
              height: 32px;
              background: linear-gradient(90deg,
                  var(--gray-400) 25%,
                  var(--gray-150) 50%,
                  var(--gray-400) 75%);
              background-size: 400% 100%;
              animation: skeletonWave 2.6s ease-in-out infinite;
              border-radius: 50%;
              animation-delay: 0.3s;
              will-change: background-position;
          }
          
          /* Rating Badge Skeleton - Bottom left of preview */
          .skeleton-rating-badge {
              position: absolute;
              bottom: 16px;
              left: 16px;
              width: 80px;
              height: 20px;
              background: linear-gradient(90deg,
                  var(--gray-300) 25%,
                  var(--gray-150) 50%,
                  var(--gray-300) 75%);
              background-size: 400% 100%;
              animation: skeletonWave 2.4s ease-in-out infinite;
              border-radius: 10px;
              animation-delay: 0.4s;
              will-change: background-position;
          }
          
          /* Horizontal Bar Skeleton - Bottom right of preview */
          .skeleton-preview-bar {
              position: absolute;
              bottom: 16px;
              right: 16px;
              width: 60px;
              height: 16px;
              background: linear-gradient(90deg,
                  var(--gray-300) 25%,
                  var(--gray-200) 50%,
                  var(--gray-300) 75%);
              background-size: 400% 100%;
              animation: skeletonWave 2.5s ease-in-out infinite;
              border-radius: 8px;
              animation-delay: 0.5s;
              will-change: background-position;
          }
          
          /* Favorite Button Skeleton - Top right corner */
          .skeleton-favorite-button {
              position: absolute;
              top: 16px;
              right: 16px;
              width: 40px;
              height: 40px;
              background: linear-gradient(90deg,
                  var(--gray-300) 25%,
                  var(--gray-200) 50%,
                  var(--gray-300) 75%);
              background-size: 400% 100%;
              animation: skeletonWave 2.8s ease-in-out infinite;
              border-radius: 50%;
              animation-delay: 0.2s;
              will-change: background-position;
          }
          
          /* Content Structure - Match real document-content layout */
          .loading-card .document-content {
              position: relative;
              padding: var(--space-5);
              background: var(--white);
              z-index: 2;
              height: 320px;
              display: flex;
              flex-direction: column;
              min-height: 0;
              overflow: hidden;
          }
          
          /* Header Section - Match real document-header */
          .loading-card .document-header {
              height: 80px;
              margin-bottom: var(--space-3);
              flex-shrink: 0;
              overflow: hidden;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
          }
          
          /* Title Skeleton - Match document-title dimensions */
          .skeleton-title {
              height: 30px;
              width: 85%;
              background: linear-gradient(90deg,
                  var(--gray-300) 25%,
                  var(--gray-200) 50%,
                  var(--gray-300) 75%);
              background-size: 400% 100%;
              animation: skeletonWave 2.4s ease-in-out infinite;
              border-radius: 6px;
              margin-bottom: 8px;
              animation-delay: 0.1s;
              will-change: background-position;
          }
          
          /* Description Skeleton - Match document-description dimensions */
          .skeleton-author {
              height: 32px;
              width: 90%;
              background: linear-gradient(90deg,
                  var(--gray-300) 25%,
                  var(--gray-150) 50%,
                  var(--gray-300) 75%);
              background-size: 400% 100%;
              animation: skeletonWave 2.3s ease-in-out infinite;
              border-radius: 4px;
              animation-delay: 0.2s;
              will-change: background-position;
          }
          
          /* Document Info Section - Match real document-info */
          .loading-card .document-info {
              display: flex;
              flex-direction: column;
              gap: 8px;
              margin-bottom: var(--space-4);
          }
          
          .skeleton-course {
              margin-bottom: var(--space-3);
              display: flex;
              flex-direction: column;
              gap: 8px;
          }
          
          .skeleton-description {
              display: flex;
              flex-direction: column;
              gap: 8px;
              margin-bottom: var(--space-4);
          }
          
          /* Info Item Skeletons - Match document-info-item layout */
          .skeleton-line {
              height: 16px;
              width: 100%;
              background: linear-gradient(90deg,
                  var(--gray-300) 25%,
                  var(--gray-150) 50%,
                  var(--gray-300) 75%);
              background-size: 400% 100%;
              animation: skeletonWave 2.1s ease-in-out infinite;
              border-radius: 4px;
              display: flex;
              align-items: center;
              gap: 8px;
              will-change: background-position;
          }
          
          .skeleton-line:nth-child(1) { animation-delay: 0.3s; width: 85%; }
          .skeleton-line:nth-child(2) { animation-delay: 0.4s; width: 78%; }
          
          /* Additional info items as skeleton lines */
          .skeleton-line.info-item {
              height: 18px;
              margin-bottom: 6px;
              background: linear-gradient(90deg,
                  var(--gray-400) 25%,
                  var(--gray-200) 50%,
                  var(--gray-400) 75%);
              background-size: 400% 100%;
              animation: skeletonWave 2.1s ease-in-out infinite;
              border-radius: 4px;
          }
          
          .skeleton-line.info-item:nth-child(1) { width: 92%; animation-delay: 0.5s; }
          .skeleton-line.info-item:nth-child(2) { width: 88%; animation-delay: 0.6s; }
          .skeleton-line.info-item:nth-child(3) { width: 85%; animation-delay: 0.7s; }
          .skeleton-line.info-item:nth-child(4) { width: 90%; animation-delay: 0.8s; }
          
          /* Footer Section - Match real document-footer */
          .loading-card .document-footer {
              margin-top: auto;
              padding-top: 0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              height: auto;
          }
          
          .loading-card .document-footer .skeleton-footer-left {
              display: flex;
              align-items: center;
              gap: 12px;
          }
          
          .skeleton-avatar {
              width: 32px;
              height: 32px;
              background: linear-gradient(90deg,
                  var(--gray-400) 25%,
                  var(--gray-300) 50%,
                  var(--gray-400) 75%);
              background-size: 400% 100%;
              animation: skeletonWave 2.7s ease-in-out infinite;
              border-radius: 50%;
              flex-shrink: 0;
              animation-delay: 0.9s;
              will-change: background-position;
          }
          
          .skeleton-meta {
              height: 14px;
              width: 60px;
              background: linear-gradient(90deg,
                  var(--gray-300) 25%,
                  var(--gray-150) 50%,
                  var(--gray-300) 75%);
              background-size: 400% 100%;
              animation: skeletonWave 2.0s ease-in-out infinite;
              border-radius: 4px;
              animation-delay: 1.0s;
              will-change: background-position;
          }
          
          .skeleton-price {
              height: 24px;
              width: 50px;
              background: linear-gradient(90deg,
                  var(--gray-400) 25%,
                  var(--gray-200) 50%,
                  var(--gray-400) 75%);
              background-size: 400% 100%;
              animation: skeletonWave 2.3s ease-in-out infinite;
              border-radius: 6px;
              animation-delay: 1.1s;
              will-change: background-position;
          }
          
          /* Enhanced Professional Shine Effect */
          .document-card.loading::before,
          .loading-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(
                  110deg,
                  transparent 0%,
                  transparent 35%,
                  rgba(255, 255, 255, 0.6) 40%,
                  rgba(255, 255, 255, 0.9) 50%,
                  rgba(255, 255, 255, 0.6) 60%,
                  transparent 65%,
                  transparent 100%
              );
              animation: professionalShine 3.0s ease-in-out infinite;
              z-index: 15;
              pointer-events: none;
              will-change: transform;
              border-radius: var(--radius-3xl);
              transform: skewX(-25deg);
          }
          
          /* Staggered Shine Animation Delays */
          .loading-card:nth-child(1)::before { animation-delay: 0.0s; }
          .loading-card:nth-child(2)::before { animation-delay: 0.2s; }
          .loading-card:nth-child(3)::before { animation-delay: 0.4s; }
          .loading-card:nth-child(4)::before { animation-delay: 0.6s; }
          .loading-card:nth-child(5)::before { animation-delay: 0.8s; }
          .loading-card:nth-child(6)::before { animation-delay: 1.0s; }
          .loading-card:nth-child(7)::before { animation-delay: 1.2s; }
          .loading-card:nth-child(8)::before { animation-delay: 1.4s; }
          
          /* Layout Structure */
          .document-card.loading .document-header,
          .loading-card .document-header {
              margin-bottom: 16px;
          }
          
          .document-card.loading .document-content,
          .loading-card .document-content {
              display: flex;
              flex-direction: column;
              justify-content: space-between;
          }
          
          /* Responsive Skeleton Adjustments */
          @media (max-width: 1200px) {
              .skeleton-title {
                  height: 22px;
                  width: 80%;
              }
              
              .skeleton-author {
                  height: 15px;
                  width: 55%;
              }
              
              .skeleton-course {
                  height: 16px;
                  width: 70%;
              }
          }
          
          @media (max-width: 768px) {
              .skeleton-title {
                  height: 20px;
                  width: 75%;
              }
              
              .skeleton-author {
                  height: 14px;
                  width: 50%;
              }
              
              .skeleton-course {
                  height: 15px;
                  width: 65%;
              }
              
              .skeleton-preview-icon {
                  width: 40px;
                  height: 40px;
              }
              
              .skeleton-avatar {
                  width: 28px;
                  height: 28px;
              }
          }
          
          /* Performance Optimizations */
          .skeleton-preview-icon,
          .skeleton-preview-badge,
          .skeleton-title,
          .skeleton-author,
          .skeleton-course,
          .skeleton-line,
          .skeleton-avatar,
          .skeleton-meta,
          .skeleton-price {
              transform: translateZ(0);
              backface-visibility: hidden;
          }
          
          .document-card.loading .document-info::after,
          .loading-card .document-info::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(
                  110deg,
                  transparent 30%,
                  rgba(255, 255, 255, 0.1) 50%,
                  transparent 70%
              );
              animation: professionalShine 2.2s ease-in-out infinite;
              pointer-events: none;
              border-radius: inherit;
              will-change: transform;
          }
          
          /* Staggered animation delays for wave effect */
          .document-card.loading:nth-child(1)::before,
          .loading-card:nth-child(1)::before { animation-delay: 0.1s; }
          .document-card.loading:nth-child(2)::before,
          .loading-card:nth-child(2)::before { animation-delay: 0.3s; }
          .document-card.loading:nth-child(3)::before,
          .loading-card:nth-child(3)::before { animation-delay: 0.5s; }
          .document-card.loading:nth-child(4)::before,
          .loading-card:nth-child(4)::before { animation-delay: 0.7s; }
          .document-card.loading:nth-child(5)::before,
          .loading-card:nth-child(5)::before { animation-delay: 0.9s; }
          .document-card.loading:nth-child(6)::before,
          .loading-card:nth-child(6)::before { animation-delay: 1.1s; }
          .document-card.loading:nth-child(7)::before,
          .loading-card:nth-child(7)::before { animation-delay: 1.3s; }
          .document-card.loading:nth-child(8)::before,
          .loading-card:nth-child(8)::before { animation-delay: 1.5s; }
          
          /* Additional cards for larger screens */
          .document-card.loading:nth-child(9)::before,
          .loading-card:nth-child(9)::before { animation-delay: 0.4s; }
          .document-card.loading:nth-child(10)::before,
          .loading-card:nth-child(10)::before { animation-delay: 0.7s; }
          .document-card.loading:nth-child(11)::before,
          .loading-card:nth-child(11)::before { animation-delay: 1.0s; }
          .document-card.loading:nth-child(12)::before,
          .loading-card:nth-child(12)::before { animation-delay: 1.3s; }
          
          /* Progressive card appearance delays */
          @media (min-width: 1400px) {
              .document-card.loading,
              .loading-card {
                  animation-delay: 0.1s;
              }
              .document-card.loading .loading-preview,
              .loading-card .loading-preview {
                  animation-delay: 0.2s;
              }
              .document-card.loading .document-content,
              .loading-card .document-content {
                  animation-delay: 0.3s;
              }
          }
          
          @media (min-width: 1200px) and (max-width: 1399px) {
              .document-card.loading,
              .loading-card {
                  animation-delay: 0.15s;
              }
              .document-card.loading .loading-preview,
              .loading-card .loading-preview {
                  animation-delay: 0.25s;
              }
              .document-card.loading .document-content,
              .loading-card .document-content {
                  animation-delay: 0.35s;
              }
          }
          
          @media (min-width: 768px) and (max-width: 1199px) {
              .document-card.loading,
              .loading-card {
                  animation-delay: 0.2s;
              }
              .document-card.loading .loading-preview,
              .loading-card .loading-preview {
                  animation-delay: 0.3s;
              }
              .document-card.loading .document-content,
              .loading-card .document-content {
                  animation-delay: 0.4s;
              }
          }
          
          @media (max-width: 767px) {
              .document-card.loading,
              .loading-card {
                  animation-delay: 0.25s;
              }
              .document-card.loading .loading-preview,
              .loading-card .loading-preview {
                  animation-delay: 0.35s;
              }
              .document-card.loading .document-content,
              .loading-card .document-content {
                  animation-delay: 0.45s;
              }
          }
          
          /* Enhanced performance optimizations */
          .document-card.loading::before,
          .loading-card::before {
              will-change: transform;
              transform: translateZ(0);
          }
          
          .document-card.loading *,
          .loading-card * {
              will-change: background-position;
              transform: translateZ(0);
          }
          
          /* ===========================
            PROFESSIONAL SCROLL TO TOP BUTTON
            =========================== */
          
          .scroll-to-top-btn {
              position: fixed;
              top: 100px;
              right: 24px;
              width: 48px;
              height: 48px;
              background: linear-gradient(135deg, var(--blue-600) 0%, var(--purple-600) 100%);
              border: none;
              border-radius: 50%;
              color: var(--white);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: var(--shadow-xl);
              z-index: 1000;
              opacity: 0;
              visibility: hidden;
              transform: translateY(20px) scale(0.8);
              transition: all 0.4s var(--ease-3);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.2);
              overflow: hidden;
          }
          
          .scroll-to-top-btn::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
              opacity: 0;
              transition: opacity 0.3s var(--ease-2);
              border-radius: 50%;
          }
          
          .scroll-to-top-btn:hover {
              transform: translateY(-2px) scale(1.05);
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 4px rgba(255, 255, 255, 0.2);
              background: linear-gradient(135deg, var(--blue-600) 0%, var(--purple-600) 100%);
              border-color: rgba(255, 255, 255, 0.4);
          }
          
          .scroll-to-top-btn:hover::before {
              opacity: 0.2;
          }
          
          .scroll-to-top-btn:active {
              transform: translateY(0) scale(0.98);
              transition: transform 0.1s ease;
          }
          
          .scroll-to-top-btn.visible {
              opacity: 1;
              visibility: visible;
              transform: translateY(0) scale(1);
          }
          
          .scroll-to-top-btn .material-symbols-outlined {
              font-size: 24px;
              font-weight: 600;
              transition: transform 0.3s var(--ease-2);
              position: relative;
              z-index: 1;
          }
          
          .scroll-to-top-btn:hover .material-symbols-outlined {
              transform: translateY(-1px);
              filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
              color: var(--white);
          }
          
          /* Pulse animation for attention */
          @keyframes scrollToTopPulse {
              0% {
                  box-shadow: var(--shadow-xl);
              }
              50% {
                  box-shadow: 0 0 0 8px rgba(99, 102, 241, 0.2), var(--shadow-xl);
              }
              100% {
                  box-shadow: var(--shadow-xl);
              }
          }
          
          .scroll-to-top-btn.pulse {
              animation: scrollToTopPulse 2s var(--ease-2) infinite;
          }
          
          /* Responsive adjustments */
          @media (max-width: 768px) {
              .scroll-to-top-btn {
                  top: 90px;
                  right: 16px;
                  width: 44px;
                  height: 44px;
              }
              
              .scroll-to-top-btn .material-symbols-outlined {
                  font-size: 22px;
              }
          }
          
          @media (max-width: 480px) {
              .scroll-to-top-btn {
                  top: 80px;
                  right: 12px;
                  width: 40px;
                  height: 40px;
              }
              
              .scroll-to-top-btn .material-symbols-outlined {
                  font-size: 20px;
              }
          }
          
          /* Accessibility improvements */
          @media (prefers-reduced-motion: reduce) {
              .scroll-to-top-btn {
                  transition: opacity 0.2s ease, visibility 0.2s ease;
              }
              
              .scroll-to-top-btn:hover {
                  transform: none;
              }
              
              .scroll-to-top-btn.pulse {
                  animation: none;
              }
          }
          
          /* High contrast mode support */
          @media (prefers-contrast: high) {
              .scroll-to-top-btn {
                  border: 2px solid var(--white);
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
              }
          }
          
          /* Quick Look Responsive Styles */
          @media (max-width: 768px) {
              .quick-look-modal {
                  width: 95%;
                  height: 90vh;
              }
              
              .quick-look-header {
                  flex-direction: column;
                  gap: 12px;
              }
              
              .quick-look-actions {
                  align-self: stretch;
              }
              
              .quick-look-view-full-btn {
                  justify-content: center;
                  width: 100%;
              }
              
              .quick-look-body {
                  flex-direction: column;
              }
              
              .quick-look-sidebar {
                  width: 100%;
                  height: 200px;
                  border-left: none;
                  border-top: 1px solid var(--gray-300);
              }
              
              .quick-look-main-preview {
                  padding: 16px;
              }
              
              .preview-icon-large {
                  font-size: 80px;
              }
              
              .preview-filename {
                  font-size: 16px;
              }
              
              .preview-file-details {
                  flex-direction: column;
                  gap: 4px;
              }
              
              .quick-look-file-item {
                  padding: 10px 12px;
              }
              
              .file-item-icon {
                  font-size: 20px;
              }
              
              .file-item-name {
                  font-size: 12px;
              }
              
              .file-item-details {
                  font-size: 10px;
              }
          }
          
          /* User dropdown and user info styles removed for component version */
          
          /* Force circular shape in document cards */
          .document-footer-left .owner-avatar {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              flex-shrink: 0;
              color: white !important;
          }
          
          /* Reviews Overlay System */
          .reviews-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: rgba(18, 24, 38, 0.6);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              z-index: 10000;
              display: flex;
              align-items: center;
              justify-content: center;
              opacity: 0;
              visibility: hidden;
              transition: opacity 0.35s var(--ease-2), visibility 0s 0.35s;
          }
          
          .reviews-overlay.active {
              opacity: 1;
              visibility: visible;
              transition: opacity 0.35s var(--ease-2), visibility 0s 0s;
          }
          
          .reviews-overlay-content {
              background: var(--white);
              border-radius: var(--radius-2xl);
              box-shadow: var(--shadow-2xl);
              width: 95%;
              max-width: 680px;
              height: 90vh;
              max-height: 800px;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              transform: scale(0.9) translateY(20px);
              transition: transform 0.35s var(--ease-spring);
          }
          
          .reviews-overlay.active .reviews-overlay-content {
              transform: scale(1) translateY(0);
          }
          
          .reviews-overlay-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: var(--space-4) var(--space-6);
              border-bottom: 1px solid var(--gray-200);
              background: var(--white);
              flex-shrink: 0;
          }
          
          .reviews-overlay-header h2 {
              display: flex;
              align-items: center;
              gap: var(--space-3);
              font-size: var(--space-5);
              font-weight: 700;
              color: var(--gray-900);
              margin: 0;
          }
          
          .close-overlay-btn {
              background: none;
              border: none;
              cursor: pointer;
              padding: var(--space-2);
              border-radius: var(--radius-full);
              transition: all 0.2s ease;
              color: var(--gray-500);
              display: flex;
              align-items: center;
              justify-content: center;
          }
          
          .close-overlay-btn:hover {
              background: var(--gray-200);
              color: var(--gray-800);
          }
          
          .reviews-overlay-body {
              padding: 0 var(--space-2) 0 var(--space-6);
              overflow-y: auto;
              flex-grow: 1;
              position: relative;
          }
          
          /* Custom scrollbar for overlay body */
          .reviews-overlay-body::-webkit-scrollbar {
              width: 12px;
          }
          
          .reviews-overlay-body::-webkit-scrollbar-track {
              background: var(--gray-100);
              border-radius: 10px;
          }
          
          .reviews-overlay-body::-webkit-scrollbar-thumb {
              background-color: var(--gray-300);
              border-radius: 10px;
              border: 3px solid var(--gray-100);
          }
          
          .reviews-overlay-body::-webkit-scrollbar-thumb:hover {
              background-color: var(--gray-400);
          }
          
          .reviews-summary {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin: var(--space-6) 0;
              padding-right: var(--space-4);
          }
          
          .overall-rating {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
          }
          
          .rating-display {
              display: flex;
              align-items: center;
              gap: var(--space-3);
          }
          
          .big-stars {
              font-size: 28px;
              position: relative;
              display: inline-block;
          }
          
          .stars-outer {
              position: relative;
              display: inline-block;
          }
          
          .stars-inner {
              position: absolute;
              top: 0;
              left: 0;
              white-space: nowrap;
              overflow: hidden;
              width: 0;
          }
          
          .stars-outer::before {
              content: "★★★★★";
              color: var(--gray-300);
          }
          
          .stars-inner::before {
              content: "★★★★★";
              color: #fbbf24;
          }
          
          .big-rating-score {
              font-size: 2.5rem;
              font-weight: 800;
              color: var(--gray-900);
              line-height: 1;
          }
          
          .total-reviews {
              font-size: 0.875rem;
              color: var(--gray-600);
              margin-top: var(--space-1);
          }
          
          .add-review-btn {
              background: var(--blue-600);
              color: var(--white);
              border: none;
              border-radius: var(--radius-lg);
              padding: var(--space-3) var(--space-5);
              font-size: 1rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s var(--ease-2);
              display: flex;
              align-items: center;
              gap: var(--space-2);
          }
          
          .add-review-btn:hover {
              background: var(--blue-700);
              transform: translateY(-2px);
              box-shadow: var(--shadow-lg);
          }
          
          .reviews-list {
              display: flex;
              flex-direction: column;
              gap: var(--space-5);
              padding-right: var(--space-4);
              padding-bottom: var(--space-8);
          }
          
          .no-reviews-message {
              text-align: center;
              padding: var(--space-12) var(--space-6);
              color: var(--gray-600);
          }
          
          .no-reviews-message .material-symbols-outlined {
              font-size: 56px;
              color: var(--gray-400);
              margin-bottom: var(--space-4);
          }
          
          .review-item-overlay {
              background: var(--white);
              border-radius: var(--radius-xl);
              padding: var(--space-5);
              border: 1px solid var(--gray-200);
              box-shadow: var(--shadow-sm);
              position: relative;
          }
          
          .review-header-overlay {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: var(--space-3);
          }
          
          .reviewer-info-overlay {
              display: flex;
              align-items: flex-start;
              gap: var(--space-3);
          }
          
          .reviewer-avatar-overlay {
              width: 44px;
              height: 44px;
              border-radius: var(--radius-full);
              border: 2px solid var(--white);
              box-shadow: 0 0 0 2px var(--blue-500);
              overflow: hidden;
          }
          
          .reviewer-name-overlay {
              font-weight: 600;
              color: var(--gray-900);
              font-size: 1rem;
              margin-bottom: 1px;
          }
          
          .review-rating-overlay {
              display: flex;
              gap: 1px;
              margin-top: 0;
              margin-left: -2px;
          }
          
          .review-rating-overlay .star {
              font-size: 16px;
              color: #fbbf24;
          }
          
          .review-rating-overlay .rating-star.filled {
              color: #fbbf24;
          }
          
          .review-rating-overlay .rating-star:not(.filled) {
              color: #d1d5db;
          }
          
          .review-date-overlay {
              font-size: 0.875rem;
              color: var(--gray-500);
              flex-shrink: 0;
          }
          
          .review-text-overlay {
              color: var(--gray-700);
              line-height: 1.65;
              font-size: 1rem;
              padding-left: calc(44px + var(--space-3)); /* Align with name */
          }
          
          .review-date-actions {
              display: flex;
              align-items: center;
              gap: var(--space-2);
          }
          
          .review-subject-overlay {
              font-size: 0.875rem;
              color: var(--blue-500);
              font-weight: 600;
              margin-bottom: var(--space-1);
              display: block;
          }
          
          .delete-review-btn {
              background: none;
              border: none;
              color: var(--gray-400);
              cursor: pointer;
              padding: var(--space-1);
              border-radius: var(--radius-md);
              opacity: 0;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              position: absolute;
              bottom: var(--space-2);
              right: var(--space-2);
              z-index: 10;
          }
          
          .review-item-overlay:hover .delete-review-btn {
              opacity: 1;
          }
          
          .delete-review-btn:hover {
              background: var(--error-50);
              color: var(--error-600);
              transform: scale(1.1);
          }
          
          .delete-review-btn .material-symbols-outlined {
              font-size: 16px;
          }
          
          /* Add Review Form */
          .add-review-form {
              background: var(--white);
              border-radius: var(--radius-xl);
              padding: var(--space-6);
              border: 1px solid var(--gray-200);
              margin-right: var(--space-4);
              margin-bottom: var(--space-8);
              /* Center the form vertically in the overlay */
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: calc(100% - var(--space-8));
              max-width: 600px;
          }
          
          .add-review-form h3 {
              margin: 0 0 var(--space-5) 0;
              font-size: 1.5rem;
              font-weight: 700;
              color: var(--gray-900);
          }
          
          .rating-input {
              margin-bottom: var(--space-5);
          }
          
          .rating-input label {
              display: block;
              margin-bottom: var(--space-3);
              font-weight: 600;
              color: var(--gray-700);
              font-size: 1.125rem;
          }
          
          .star-rating {
              display: flex;
              gap: var(--space-3);
          }
          
          .star-input {
              font-size: 32px;
              color: var(--gray-300);
              cursor: pointer;
              transition: all 0.2s ease;
              user-select: none;
          }
          
          .star-input:hover,
          .star-input.hover {
              color: #fbbf24;
              transform: scale(1.15);
          }
          
          .star-input.active {
              color: #fbbf24;
              text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
          }
          
          .review-text-input {
              margin-bottom: var(--space-6);
          }
          
          .review-text-input label {
              display: block;
              margin-bottom: var(--space-3);
              font-weight: 600;
              color: var(--gray-700);
              font-size: 1.125rem;
          }
          
          .review-text-input textarea {
              width: 100%;
              padding: var(--space-4);
              border: 1px solid var(--gray-300);
              border-radius: var(--radius-lg);
              font-size: 1rem;
              line-height: 1.6;
              resize: vertical;
              min-height: 120px;
              transition: all 0.2s ease;
          }
          
          .review-text-input textarea:focus {
              outline: none;
              border-color: var(--blue-500);
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
              background: var(--white);
          }
          
          .review-form-actions {
              display: flex;
              gap: var(--space-3);
              justify-content: flex-end;
          }
          
          .cancel-review-btn {
              background: transparent;
              color: var(--gray-700);
              border: 1px solid transparent;
              border-radius: var(--radius-lg);
              padding: var(--space-3) var(--space-5);
              font-size: 1rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
          }
          
          .cancel-review-btn:hover {
              background: var(--gray-100);
              border-color: var(--gray-200);
              color: var(--gray-900);
          }
          
          .submit-review-btn {
              background: var(--blue-600);
              color: var(--white);
              border: none;
              border-radius: var(--radius-lg);
              padding: var(--space-3) var(--space-5);
              font-size: 1rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s ease;
          }
          
          .submit-review-btn:hover {
              background: var(--blue-700);
              transform: translateY(-2px);
              box-shadow: var(--shadow-lg);
          }
          
          /* Loading States for Reviews */
          .loading-stars {
              color: var(--gray-300);
              font-size: 2rem;
              animation: pulse 1.5s ease-in-out infinite;
          }
          
          .reviews-loading {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: var(--space-8);
              text-align: center;
              color: var(--gray-600);
          }
          
          .reviews-loading .loading-spinner {
              width: 40px;
              height: 40px;
              border: 3px solid var(--gray-200);
              border-radius: 50%;
              border-top-color: var(--blue-500);
              animation: spin 1s linear infinite;
              margin-bottom: var(--space-4);
          }
          
          .reviews-loading p {
              font-size: 1rem;
              font-weight: 500;
              margin: 0;
          }
          
          @keyframes spin {
              to {
                  transform: rotate(360deg);
              }
          }
          
          @keyframes pulse {
              0%, 100% {
                  opacity: 0.6;
              }
              50% {
                  opacity: 1;
              }
          }
          
          /* Responsive Design for Reviews Overlay */
          @media (max-width: 768px) {
              .reviews-overlay-content {
                  width: 100%;
                  height: 100%;
                  max-height: 100%;
                  border-radius: 0;
              }
              
              .reviews-overlay-header {
                  padding: var(--space-3) var(--space-4);
              }
              
              .reviews-overlay-body {
                  padding: 0 var(--space-1) 0 var(--space-4);
              }
              
              .reviews-summary {
                  flex-direction: column;
                  gap: var(--space-4);
                  align-items: stretch;
                  margin: var(--space-4) 0;
                  padding-right: var(--space-3);
              }
              
              .add-review-btn {
                  width: 100%;
                  justify-content: center;
                  padding: var(--space-4);
              }
              
              .review-form-actions {
                  flex-direction: column;
                  gap: var(--space-2);
              }
              
              .cancel-review-btn,
              .submit-review-btn {
                  width: 100%;
                  padding: var(--space-4);
              }
          }
          
          /* === SPARKLE TOGGLE BUTTON STYLES === */
          .toggle-input {
            display: none;
          }
          
          .toggle-label {
            --primary: #5457fc;
            --light: #d9d9d9;
            --dark: #121212;
            --gray: #414344;
            --gap: 2.5px;
            --width: 25px;
          
            cursor: pointer;
            position: relative;
            display: inline-block;
            z-index: 10;
          
            padding: 0.25rem;
            width: calc((var(--width) + var(--gap)) * 2);
            height: 25px;
            background-color: var(--dark); /* Dark background when turned off */
          
            border: 0.5px solid #cccccc;
            border-bottom: 0;
          
            border-radius: 9999px;
            box-sizing: content-box;
            transition: all 0.3s ease-in-out;
          }
          
          .toggle-label::after {
            content: "";
          
            position: absolute;
            z-index: -10;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          
            width: 100%;
            height: 100%;
            background-color: var(--dark); /* Set dark background color instead of none */
            transition: all 0.3s ease-in-out; /* ADDED: Smooth transition */
          
            border-radius: 9999px;
          }
          
          .toggle-label .cont-icon {
            position: relative;
          
            display: flex;
            justify-content: center;
            align-items: center;
          
            position: relative;
            width: var(--width);
            height: 25px;
            background-image: radial-gradient(
              circle at 50% 0%,
              #c0c0c0 0%,
              #909090 50%,
              #606060 100%
            );
          
            border: 0.5px solid #aaaaaa;
            border-bottom: 0;
            border-radius: 9999px;
            box-shadow:
              inset 0 -0.075rem 0.075rem var(--primary),
              inset 0 0 0.25rem 0.375rem var(--second);
          
            transition: transform 0.3s ease-in-out;
            transform-origin: center center;
          }
          
          .cont-icon {
            overflow: clip;
            position: relative;
          }
          
          .cont-icon .sparkle {
            position: absolute;
            top: 50%;
            left: 50%;
          
            display: block;
          
            width: calc(var(--width) * 0.5px);
            aspect-ratio: 1;
            background-color: var(--light);
          
            border-radius: 50%;
            transform-origin: 50% 50%;
            rotate: calc(1deg * var(--deg));
            transform: translate(-50%, -50%);
            animation: sparkle calc(100s / var(--duration)) linear
              calc(0s / var(--duration)) infinite;
          }
          
          @keyframes sparkle {
            to {
              width: calc(var(--width) * 0.25px);
              transform: translate(2000%, -50%);
            }
          }
          
          .cont-icon .icon {
            width: 0.55rem;
            fill: var(--light);
          }
          
          .toggle-input:checked + .toggle-label {
            background-color: var(--dark); /* Keep solid dark background when checked */
            border: 1px solid #3d6970;
            border-bottom: 0;
          }
          
          .toggle-input:checked + .toggle-label::before {
            box-shadow: 0 0.5rem 1.25rem -1rem #0080ff;
          }
          
          .toggle-input:checked + .toggle-label::after {
            background-image: radial-gradient(
              circle at 50% -100%,
              rgb(58, 155, 252) 0%,
              rgba(12, 12, 12, 1) 80%
            ); /* ADDED: Dark gradient only when checked */
            background-color: var(--dark); /* Keep solid background during transition */
          }
          
          .toggle-input:checked + .toggle-label .cont-icon {
            overflow: visible;
            background-image: radial-gradient(
              circle at 50% 0%,
              #a855f7 0%,
              #9333ea 30%,
              #7c3aed 60%,
              #6366f1 100%
            );
            border: 1px solid var(--primary);
            border-bottom: 0;
            transform-origin: center center;
            transform: translate(calc((var(--gap) * 2) + 100%), 0) rotate(-225deg);
          }
          
          .toggle-input:checked + .toggle-label .cont-icon .sparkle {
            z-index: -10;
            width: calc(var(--width) * 0.75px);
            background-color: #acacac;
            animation: sparkle calc(100s / var(--duration)) linear
              calc(10s / var(--duration)) infinite;
          }
          
          /* Position the toggle in the search bar - perfectly centered */
          .search-bar .toggle-label {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%); /* Perfect vertical centering for all screen sizes */
            z-index: 35;
            cursor: pointer;
            /* Using transform for perfect centering that works across all screen sizes */
          }
          
          /* Prevent toggle from moving in any state - lock it in position */
          .toggle-label,
          .toggle-label:hover,
          .toggle-label:focus,
          .toggle-label:active,
          .search-bar .toggle-label,
          .search-bar .toggle-label:hover,
          .search-bar .toggle-label:focus,
          .search-bar .toggle-label:active {
            transform: translateY(-50%) !important;
            transition: none !important;
          }
          
          
          
          
          /* Ensure the search input doesn't overlap with the toggle */
          .search-bar .search-input {
            padding-right: 55px; /* Increased padding to accommodate toggle with proper spacing */
          }
          
          /* Search bar wrapper for proper layering */
          .search-bar-wrapper {
              position: relative;
              display: inline-block;
              border-radius: 20px;
          }
          
          /* Invisible element that matches search bar position */
          @property --expand-progress{
              syntax: "<number>";
              inherits: false;
              initial-value: 0;
          }
          .search-bar-background, .search-bar-background::before {
              position: absolute;
              top: -2px; /* Move up to create space */
              left: -2px; /* Move left to create space */
              width: calc(100% + 4px); /* Increase width to account for padding */
              height: calc(100% + 4px); /* Increase height to account for padding */
              border: none;
              border-radius: 20px; /* Slightly larger radius */
              z-index: 0;
              pointer-events: none;
              filter: brightness(1.3) contrast(1.05);
              /* Safari-specific fixes */
              -webkit-transform: translate3d(0, 0, 0);
              transform: translate3d(0, 0, 0);
              -webkit-backface-visibility: hidden;
              backface-visibility: hidden;
              will-change: transform, filter;
              overflow: visible;
              transition: filter 0.3s ease-out;
          }
          .search-bar-background::before {
              content: '';
              position: absolute;
              top: -2.5px;
              left: -2.5px;
              width: 100%;
              height: 100%;
              filter: blur(25px) brightness(1.1);
              opacity: 0.9;
              border-radius: 2px;
              will-change: filter, opacity;
              z-index: 1002;
              overflow: visible;
              transform: translateZ(0);
              transition: filter 0.3s ease-out, opacity 0.3s ease-out;
          }
          
          
          /* Move with search bar hover/focus animation */
          .search-bar-wrapper:hover .search-bar-background,
          .search-bar-wrapper:has(.search-bar:hover) .search-bar-background,
          .search-bar-wrapper:has(.search-input:focus) .search-bar-background {
              transform: translateY(-2px);
          }
          
          @keyframes moveToLeft {
              0% {
                  --expand-progress: 100;
              }
              100% {
                  --expand-progress: 0;
              }
          }
          
          @keyframes moveToRight {
              0% {
                  --expand-progress: 0;
              }
              100% {
                  --expand-progress: 135;
              }
          }
          
          /* Animation for toggle OFF (pink left, purple right - moves LEFT) - smooth professional gradient */
          .search-bar-wrapper:not(:has(.toggle-input:checked)) .search-bar-background,
          .search-bar-wrapper:not(:has(.toggle-input:checked)) .search-bar-background::before {
              background-image: linear-gradient(120deg, 
                  transparent 0%, 
                  transparent calc(var(--expand-progress) * 1% - 8%), 
                  #cf30aa calc(var(--expand-progress) * 1% - 2%), 
                  #d848b0 calc(var(--expand-progress) * 1% + 8%), 
                  #e060b6 calc(var(--expand-progress) * 1% + 18%), 
                  #ba70c8 calc(var(--expand-progress) * 1% + 28%), 
                  #8a5fd4 calc(var(--expand-progress) * 1% + 38%), 
                  #7a56da calc(var(--expand-progress) * 1% + 48%), 
                  #6a3ce0 calc(var(--expand-progress) * 1% + 58%), 
                  #5a4ee0 calc(var(--expand-progress) * 1% + 68%), 
                  #402fb5 calc(var(--expand-progress) * 1% + 78%), 
                  #402fb5 calc(var(--expand-progress) * 1% + 135%), 
                  transparent calc(var(--expand-progress) * 1% + 130%)
              );
              animation: moveToRight 1s ease-out forwards;
          }
          
          /* Animation for toggle ON (pink left, purple right - moves RIGHT) - smooth professional gradient */
          .search-bar-wrapper:has(.toggle-input:checked) .search-bar-background,
          .search-bar-wrapper:has(.toggle-input:checked) .search-bar-background::before {
              background-image: linear-gradient(120deg, 
                  transparent 0%, 
                  transparent calc(var(--expand-progress) * 1% - 8%), 
                  #cf30aa calc(var(--expand-progress) * 1% - 2%), 
                  #d848b0 calc(var(--expand-progress) * 1% + 8%), 
                  #e060b6 calc(var(--expand-progress) * 1% + 18%), 
                  #ba70c8 calc(var(--expand-progress) * 1% + 28%), 
                  #8a5fd4 calc(var(--expand-progress) * 1% + 38%), 
                  #7a56da calc(var(--expand-progress) * 1% + 48%), 
                  #6a3ce0 calc(var(--expand-progress) * 1% + 58%), 
                  #5a4ee0 calc(var(--expand-progress) * 1% + 68%), 
                  #402fb5 calc(var(--expand-progress) * 1% + 78%), 
                  #402fb5 calc(var(--expand-progress) * 1% + 135%), 
                  transparent calc(var(--expand-progress) * 1% + 130%)
              );
              animation: moveToLeft 1s ease-out forwards;
          }
          
          /* Responsive adjustments for the toggle */
          @media (max-width: 768px) {
            .toggle-label {
              height: 20px;
              --width: 20px;
            }
            
            .toggle-label .cont-icon {
              height: 20px;
            }
            
            /* Ensure toggle stays perfectly centered on mobile */
            .search-bar .toggle-label {
              right: 10px;
              transform: translateY(-50%); /* Perfect vertical centering for mobile */
            }
            
            .search-bar .search-input {
              padding-right: 50px;
            }
          }
          
          @media (max-width: 480px) {
            .toggle-label {
              height: 17.5px;
              --width: 17.5px;
            }
            
            .toggle-label .cont-icon {
              height: 17.5px;
            }
            
            /* Ensure toggle stays perfectly centered on small mobile */
            .search-bar .toggle-label {
              right: 8px;
              transform: translateY(-50%); /* Perfect vertical centering for small mobile */
            }
            
            .search-bar .search-input {
              padding-right: 45px;
            }
          }
          
          @media (max-width: 768px) {
            .filters-panel,
            .filters-content {
              height: 100vh !important;
              min-height: 0 !important;
              display: flex;
              flex-direction: column;
            }
            .filters-grid {
              flex: 1 1 auto;
              min-height: 0;
              max-height: none;
              overflow-y: auto;
            }
            .filters-bottom-actions {
              flex-shrink: 0;
              position: relative;
              margin-top: 0;
              margin-bottom: 0;
              padding: 0;
            }
          }
          
          @media (max-width: 600px) {
            .filters-header {
              flex-direction: column;
              align-items: stretch;
              gap: 8px;
            }
            .filters-header-top {
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
              width: 100%;
              gap: 8px;
            }
            .filters-title {
              width: auto;
              flex: 1 1 auto;
              min-width: 0;
            }
            .filters-actions {
              width: auto;
              flex-shrink: 0;
              justify-content: flex-end;
              gap: 8px;
              display: flex;
              align-items: center;
            }
            .filter-clear-btn,
            .filters-close {
              display: flex !important;
              align-items: center;
              justify-content: center;
              min-width: 36px;
              min-height: 36px;
              max-width: 100%;
              max-height: 100%;
              font-size: 15px;
              padding: 0 10px;
            }
            .filters-subtitle {
              white-space: normal;
              word-break: break-word;
              width: 100%;
            }
          }
          
          /* Pages Range Filter - Use same styles as price slider */
          .pages-range-filter {
              margin: var(--space-4) 0;
          }
          .pages-range-filter .dual-range-container {
              position: relative;
              height: 40px;
              margin: 0;
          }
          .pages-range-filter .range-track {
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              width: 100%;
              height: 6px;
              background: var(--gray-200);
              border-radius: 3px;
              z-index: 1;
          }
          .pages-range-filter .range-fill {
              position: absolute;
              top: 0;
              height: 100%;
              background: var(--gradient-primary);
              border-radius: 3px;
          }
          .pages-range-filter .range-slider {
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              width: 100%;
              height: 6px;
              background: transparent;
              border: none;
              outline: none;
              appearance: none;
              -webkit-appearance: none;
              cursor: pointer;
              pointer-events: none;
          }
          .pages-range-filter .range-slider::-webkit-slider-thumb {
              appearance: none;
              -webkit-appearance: none;
              width: 20px;
              height: 20px;
              background: var(--gradient-primary);
              border-radius: 50%;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
              border: 2px solid var(--white);
              pointer-events: all;
          }
          .pages-range-filter .range-slider::-webkit-slider-thumb:hover {
              transform: scale(1.1);
              box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          }
          .pages-range-filter .range-slider::-moz-range-thumb {
              width: 20px;
              height: 20px;
              background: var(--gradient-primary);
              border-radius: 50%;
              cursor: pointer;
              border: 2px solid var(--white);
              box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
              pointer-events: all;
          }
          .pages-range-filter .range-slider-min {
              z-index: 2;
          }
          .pages-range-filter .range-slider-max {
              z-index: 3;
          }
          .pages-range-filter .range-values {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: var(--space-2);
              font-size: 12px;
              font-weight: 600;
              color: var(--blue-600);
              padding: 4px 0;
              background: rgba(59, 130, 246, 0.02);
              border-radius: var(--radius-xs);
              position: relative;
          }
          
          .pages-range-filter .range-values::before {
              content: "Clicca sui numeri per modificarli";
              position: absolute;
              top: -20px;
              left: 0;
              right: 0;
              font-size: 11px;
              color: var(--gray-500);
              text-align: center;
              opacity: 0;
              transition: opacity 0.2s ease;
              pointer-events: none;
          }
          
          .pages-range-filter .range-values:hover::before {
              opacity: 1;
          }
          
          .sticky-left {
              position: sticky;
              left: 0;
              z-index: 2;
              background: linear-gradient(90deg, #f8fafc 90%, rgba(248,250,252,0));
              margin-right: 8px;
          }
          
          /* ===========================
             CHUNKS BUTTON STYLES
             =========================== */
          
          .chunks-button {
              position: absolute;
              top: 8px;
              right: 8px;
              display: flex;
              align-items: center;
              gap: 4px;
              background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
              color: white;
              border: none;
              border-radius: 12px;
              padding: 6px 10px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              z-index: 10;
              backdrop-filter: blur(8px);
          }
          
          .chunks-button:hover {
              transform: translateY(-1px) scale(1.02);
              box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
              background: linear-gradient(135deg, #5b5fb1 0%, #7c3aed 100%);
          }
          
          .chunks-button:active {
              transform: translateY(0) scale(0.98);
              box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
          }
          
          .chunks-button .material-symbols-outlined {
              font-size: 16px;
              font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20;
          }
          
          .chunks-button .chunks-count {
              background: rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              padding: 2px 6px;
              font-size: 11px;
              font-weight: 700;
              min-width: 18px;
              text-align: center;
          }
          
          /* ===========================
             CHUNKS OVERLAY STYLES
             =========================== */
          
          .chunks-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.8);
              backdrop-filter: blur(8px);
              z-index: 9998;
              display: flex;
              align-items: center;
              justify-content: center;
              opacity: 0;
              visibility: hidden;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .chunks-overlay.visible {
              opacity: 1;
              visibility: visible;
          }
          
          .chunks-modal {
              background: white;
              border-radius: 16px;
              width: 90%;
              max-width: 700px;
              max-height: 85vh;
              overflow: hidden;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
              transform: translateY(20px) scale(0.95);
              transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              position: relative;
              display: flex;
              flex-direction: column;
          }
          
          .chunks-overlay.visible .chunks-modal {
              transform: translateY(0) scale(1);
          }
          
          .chunks-close-button {
              position: absolute;
              top: 16px;
              right: 16px;
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: var(--gray-500);
              z-index: 10;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              transition: all 0.2s ease;
          }
          
          .chunks-close-button:hover {
              background: var(--gray-100);
              color: var(--gray-700);
          }
          
          .chunks-header {
              padding: 24px;
              border-bottom: 1px solid var(--gray-200);
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          }
          
          .chunks-title {
              font-size: 24px;
              font-weight: 700;
              color: var(--gray-900);
              margin-bottom: 8px;
          }
          
          .chunks-description {
              font-size: 16px;
              color: var(--gray-600);
              margin-bottom: 12px;
          }
          
          .chunks-meta {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              color: var(--gray-500);
          }
          
          .chunks-meta .material-symbols-outlined {
              font-size: 18px;
              color: var(--blue-500);
          }
          
          .chunks-body {
              overflow: visible;
              flex: 1;
              min-height: 0;
              position: relative;
          }
          
          
          
          .chunks-horizontal-scroll {
              display: flex;
              gap: 20px;
              overflow-x: auto;
              overflow-y: hidden;
              padding: 8px 4px 16px 4px;
              scroll-behavior: smooth;
              -webkit-overflow-scrolling: touch;
          }
          
          .chunks-horizontal-scroll::-webkit-scrollbar {
              height: 12px;
          }
          
          .chunks-horizontal-scroll::-webkit-scrollbar-track {
              background: var(--gray-100);
              border-radius: 6px;
              margin: 0 4px;
          }
          
          .chunks-horizontal-scroll::-webkit-scrollbar-thumb {
              background: var(--gray-400);
              border-radius: 6px;
              border: 2px solid var(--gray-100);
          }
          
          .chunks-horizontal-scroll::-webkit-scrollbar-thumb:hover {
              background: var(--gray-500);
          }
          
          .chunk-preview-card {
              flex: 0 0 240px;
              background: white;
              border-radius: 12px;
              border: 1px solid var(--gray-200);
              overflow: hidden;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          
          .chunk-preview-card:hover {
              transform: translateY(-4px);
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
              border-color: var(--blue-200);
          }
          
          .chunk-preview-image {
              height: 180px;
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              overflow: hidden;
          }
          
          .page-preview-placeholder {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 12px;
              color: var(--gray-500);
          }
          
          .page-preview-placeholder .material-symbols-outlined {
              font-size: 48px;
              color: var(--gray-400);
          }
          
          .page-number {
              font-size: 16px;
              font-weight: 600;
              color: var(--gray-600);
          }
          
          .chunk-preview-content {
              padding: 16px;
          }
          
          .chunk-preview-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;
              flex-wrap: wrap;
              gap: 8px;
          }
          
          .chunk-page-info {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 14px;
              font-weight: 600;
              color: var(--blue-600);
          }
          
          .chunk-page-info .material-symbols-outlined {
              font-size: 18px;
          }
          
          
          
          .chunk-preview-description {
              font-size: 14px;
              line-height: 1.5;
              color: var(--gray-700);
              margin-bottom: 8px;
              display: -webkit-box;
              -webkit-line-clamp: 3;
              -webkit-box-orient: vertical;
              overflow: hidden;
          }
          
          .chunk-preview-context {
              font-size: 12px;
              color: var(--gray-600);
              background: var(--gray-50);
              padding: 8px;
              border-radius: 6px;
              border-left: 2px solid var(--blue-200);
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
          }
          
          .chunks-footer {
              padding: 20px 24px;
              border-top: 1px solid var(--gray-200);
              background: var(--gray-50);
              display: flex;
              justify-content: center;
              flex-shrink: 0;
              position: relative;
              z-index: 5;
          }
          
          .chunks-view-full-btn {
              display: flex;
              align-items: center;
              gap: 8px;
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              color: white;
              border: none;
              border-radius: 12px;
              padding: 12px 20px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
          }
          
          .chunks-view-full-btn:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
              background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          }
          
          .chunks-view-full-btn:active {
              transform: translateY(0);
              box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
          }
          
          .chunks-view-full-btn .material-symbols-outlined {
              font-size: 18px;
          }
          
          /* Responsive Design */
          @media (max-width: 768px) {
              .chunks-modal {
                  width: 95%;
                  max-height: 90vh;
                  margin: 20px;
                  display: flex;
                  flex-direction: column;
              }
              
              .chunks-header {
                  padding: 20px;
                  flex-shrink: 0;
              }
              
              .chunks-title {
                  font-size: 20px;
              }
              
              .chunks-body {
                  padding: 16px;
                  flex: 1;
                  min-height: 0;
                  overflow: visible;
              }
              
              .chunks-horizontal-scroll {
                  gap: 16px;
                  padding: 4px 2px 12px 2px;
              }
              
              .chunk-preview-card {
                  flex: 0 0 220px;
              }
              
              .chunk-preview-image {
                  height: 140px;
              }
              
              .chunk-preview-content {
                  padding: 12px;
              }
              
              .chunk-preview-header {
                  flex-direction: column;
                  align-items: flex-start;
                  gap: 6px;
              }
              
              .chunks-footer {
                  padding: 16px 20px;
                  flex-shrink: 0;
                  position: relative;
                  z-index: 5;
              }
          }
          
          @media (max-width: 480px) {
              .chunks-modal {
                  width: 98%;
                  margin: 10px;
              }
              
              .chunks-header {
                  padding: 16px;
              }
              
              .chunks-title {
                  font-size: 18px;
              }
              
              .chunks-description {
                  font-size: 14px;
              }
              
              .chunks-body {
                  padding: 12px;
                  overflow: visible;
              }
              
              .chunks-horizontal-scroll {
                  gap: 12px;
                  padding: 4px 2px 10px 2px;
              }
              
              .chunk-preview-card {
                  flex: 0 0 200px;
              }
              
              .chunk-preview-image {
                  height: 120px;
              }
              
              .page-preview-placeholder .material-symbols-outlined {
                  font-size: 36px;
              }
              
              .page-number {
                  font-size: 14px;
              }
              
              .chunk-preview-content {
                  padding: 10px;
              }
              
              .chunk-preview-description {
                  font-size: 13px;
                  -webkit-line-clamp: 2;
              }
              
              .chunk-preview-context {
                  font-size: 11px;
                  -webkit-line-clamp: 1;
              }
          }
        </style>
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Uniclarity - File Sharing Platform</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            
            <!-- Preload critical assets -->
            <link rel="preload" href="../../images/Logo.png" as="image" type="image/png">
            
            <!-- Load fonts with display=swap for better performance -->
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" />
            <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons&display=swap">
            
            <!-- Favicon -->
            <link rel="icon" href="../../images/favicon.png" type="image/png">
        </head>
        <body data-page="search">
            <!-- Main Content - Centered Search Interface -->
            <main class="main-content" id="mainContent">
                <!-- Search Section with integrated cards -->
                <div class="search-section has-results" id="searchSection">
                    <div class="search-container-wrapper">
                        <div class="search-container">
                            <div class="search-bar-wrapper">
                                <div class="search-bar-background" id="searchBarBackground"></div>
                                <div class="search-bar">
                                    <input type="text" class="search-input" id="${getUniqueId('searchInput')}" placeholder="Cerca una dispensa...">
                                    <input class="toggle-input" id="toggle" name="toggle" type="checkbox" />
                                    <label class="toggle-label" for="toggle" id="aiSearchToggle">
                                      <div class="cont-icon">
                                        <span
                                          style="--width: 2; --deg: 25; --duration: 11"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 1; --deg: 100; --duration: 18"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 1; --deg: 280; --duration: 5"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 2; --deg: 200; --duration: 3"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 2; --deg: 30; --duration: 20"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 2; --deg: 300; --duration: 9"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 1; --deg: 250; --duration: 4"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 2; --deg: 210; --duration: 8"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 2; --deg: 100; --duration: 9"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 1; --deg: 15; --duration: 13"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 1; --deg: 75; --duration: 18"
                                          class="sparkle"
                                        ></span>
                                        <span style="--width: 2; --deg: 65; --duration: 6" class="sparkle"></span>
                                        <span style="--width: 2; --deg: 50; --duration: 7" class="sparkle"></span>
                                        <span
                                          style="--width: 1; --deg: 320; --duration: 5"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 1; --deg: 220; --duration: 5"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 1; --deg: 215; --duration: 2"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 2; --deg: 135; --duration: 9"
                                          class="sparkle"
                                        ></span>
                                        <span style="--width: 2; --deg: 45; --duration: 4" class="sparkle"></span>
                                        <span
                                          style="--width: 1; --deg: 78; --duration: 16"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 1; --deg: 89; --duration: 19"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 2; --deg: 65; --duration: 14"
                                          class="sparkle"
                                        ></span>
                                        <span style="--width: 2; --deg: 97; --duration: 1" class="sparkle"></span>
                                        <span
                                          style="--width: 1; --deg: 174; --duration: 10"
                                          class="sparkle"
                                        ></span>
                                        <span
                                          style="--width: 1; --deg: 236; --duration: 5"
                                          class="sparkle"
                                        ></span>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          fill="none"
                                          viewBox="0 0 30 30"
                                          class="icon"
                                        >
                                          <path
                                            d="M0.96233 28.61C1.36043 29.0081 1.96007 29.1255 2.47555 28.8971L10.4256 25.3552C13.2236 24.11 16.4254 24.1425 19.2107 25.4401L27.4152 29.2747C27.476 29.3044 27.5418 29.3023 27.6047 29.32C27.6563 29.3348 27.7079 29.3497 27.761 29.3574C27.843 29.3687 27.9194 29.3758 28 29.3688C28.1273 29.3617 28.2531 29.3405 28.3726 29.2945C28.4447 29.262 28.5162 29.2287 28.5749 29.1842C28.6399 29.1446 28.6993 29.0994 28.7509 29.0477L28.9008 28.8582C28.9468 28.7995 28.9793 28.7274 29.0112 28.656C29.0599 28.5322 29.0811 28.4036 29.0882 28.2734C29.0939 28.1957 29.0868 28.1207 29.0769 28.0415C29.0705 27.9955 29.0585 27.9524 29.0472 27.9072C29.0295 27.8343 29.0302 27.7601 28.9984 27.6901L25.1638 19.4855C23.8592 16.7073 23.8273 13.5048 25.0726 10.7068L28.6145 2.75679C28.8429 2.24131 28.7318 1.63531 28.3337 1.2372C27.9165 0.820011 27.271 0.721743 26.7491 0.9961L19.8357 4.59596C16.8418 6.15442 13.2879 6.18696 10.2615 4.70062L1.80308 0.520214C1.7055 0.474959 1.60722 0.441742 1.50964 0.421943C1.44459 0.409215 1.37882 0.395769 1.3074 0.402133C1.14406 0.395769 0.981436 0.428275 0.818095 0.499692C0.77284 0.519491 0.719805 0.545671 0.67455 0.578198C0.596061 0.617088 0.524653 0.675786 0.4596 0.74084C0.394546 0.805894 0.335843 0.877306 0.296245 0.956502C0.263718 1.00176 0.237561 1.05477 0.217762 1.10003C0.152708 1.24286 0.126545 1.40058 0.120181 1.54978C0.120181 1.61483 0.126527 1.6735 0.132891 1.73219C0.15269 1.85664 0.178881 1.97332 0.237571 2.08434L4.41798 10.5427C5.91139 13.5621 5.8725 17.1238 4.3204 20.1099L0.720514 27.0233C0.440499 27.5536 0.545137 28.1928 0.96233 28.61Z"
                                          ></path>
                                        </svg>
                                  </div>
                                    </label>
                              </div>
                              </div>
                            <button class="filters-btn" id="${getUniqueId('filtersBtn')}">
                                <i class="material-symbols-outlined">tune</i>
                                <span class="filters-text">Filtri</span>
                                <span class="filter-count" id="${getUniqueId('filterCount')}">0</span>
                            </button>
        
                          </div>
                    </div>
                    
                    <!-- Document Count and Active Filters Display -->
                    <div id="${getUniqueId('documentCountContainer')}" class="document-count-container" style="display: block;">
                        <div class="document-count-and-filters">
                            <span id="${getUniqueId('documentCount')}" class="document-count">Caricamento...</span>
                            
                            <!-- Order Dropdown Button -->
                            <span class="order-label" style="font-weight: 500; color: #64748b; font-size: 0.95em;">Ordina per:</span>
                            <div class="order-dropdown-container">
                                <button class="order-btn" id="orderBtn">
                                    <svg class="sort-icon" width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                                        <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none">
                                            <path d="M1982 4688 c-24 -4 -56 -15 -70 -25 -52 -35 -1340 -1338 -1358 -1373 -27 -55 -23 -137 10 -194 39 -66 93 -99 170 -104 49 -3 71 0 102 16 23 12 234 216 504 486 l465 466 5 -1693 5 -1694 30 -48 c40 -65 97 -95 179 -95 104 1 182 53 206 138 7 25 10 680 10 2000 0 2134 3 2000 -53 2060 -46 49 -129 74 -205 60z"/>
                                            <path d="M2995 4671 c-50 -22 -91 -69 -105 -119 -7 -25 -10 -680 -10 -2000 0 -1749 2 -1967 15 -2000 35 -83 103 -123 207 -123 50 0 77 5 96 18 51 35 1350 1348 1368 1383 10 21 17 57 17 91 0 109 -81 198 -187 207 -105 9 -90 20 -608 -496 l-478 -476 -2 1695 -3 1696 -30 48 c-40 65 -97 95 -179 95 -37 0 -77 -8 -101 -19z"/>
                                        </g>
                                    </svg>
                                    <span class="order-text">Rilevanza</span>
                          </div>
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
                        <div id="activeFiltersDisplay" class="active-filters-display" style="padding-bottom: 10px;">
                            <!-- Active filter pills will be dynamically added here -->
                        </div>
        
                                      </div>
        
                    <!-- Documents Grid - Will be populated dynamically -->
                    <div class="documents-grid" id="${getUniqueId('documentsGrid')}">
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
            <div class="filters-panel" id="filtersPanel">
                <div class="filters-content">
                    <div class="filters-header">
                        <div class="filters-header-top">
                        <div class="filters-title">
                            <h2>🎯 Filtri</h2>
                        </div>
                        <div class="filters-actions">
                            <button class="filter-clear-btn" id="clearAllFilters">
                                <i class="material-symbols-outlined">clear_all</i>
                                Reset
                            </button>
                            <button class="filters-close" id="filtersClose">
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
                                    <label for="facultyFilter" class="filter-label">Facoltà</label>
                                    <div class="dropdown-container" data-dropdown="faculty">
                                        <div class="dropdown-input-wrapper">
                                            <input type="text" id="facultyFilter" class="dropdown-input" placeholder="Scrivi o scegli una facoltà...">
                                            <i class="material-symbols-outlined dropdown-arrow">expand_more</i>
                          </div>
                                        <div class="dropdown-content" id="facultyDropdown">
                                            <div class="dropdown-options" id="facultyOptions"></div>
                          </div>
                                    </div>
                                </div>
                                <div class="filter-item">
                                    <label for="courseFilter" class="filter-label">Corso</label>
                                    <div class="dropdown-container" data-dropdown="course">
                                        <div class="dropdown-input-wrapper">
                                            <input type="text" id="courseFilter" class="dropdown-input" placeholder="Scrivi o scegli un corso...">
                                            <i class="material-symbols-outlined dropdown-arrow">expand_more</i>
                                        </div>
                                        <div class="dropdown-content" id="courseDropdown">
                                            <div class="dropdown-options" id="courseOptions"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="filter-item">
                                    <label for="canaleFilter" class="filter-label">Canale</label>
                                    <div class="dropdown-container" data-dropdown="canale">
                                        <div class="dropdown-input-wrapper">
                                            <input type="text" id="canaleFilter" class="dropdown-input" placeholder="Scrivi o scegli un canale...">
                                            <i class="material-symbols-outlined dropdown-arrow">expand_more</i>
                                        </div>
                                        <div class="dropdown-content" id="canaleDropdown">
                                            <div class="dropdown-options" id="canaleOptions"></div>
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
                                    <label for="tagFilter" class="filter-label">Tipo Documento</label>
                                    <div class="dropdown-container" data-dropdown="tag">
                                        <div class="dropdown-input-wrapper">
                                            <input type="text" id="tagFilter" class="dropdown-input" placeholder="Tutti i tipi" readonly>
                                            <i class="material-symbols-outlined dropdown-arrow">expand_more</i>
                                        </div>
                                        <div class="dropdown-content" id="tagDropdown">
                                            <div class="dropdown-options" id="tagOptions"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="filter-item">
                                    <label for="documentTypeFilter" class="filter-label">Formato file</label>
                                    <div class="dropdown-container" data-dropdown="documentType">
                                        <div class="dropdown-input-wrapper">
                                            <input type="text" id="documentTypeFilter" class="dropdown-input" placeholder="Tutti i formati" readonly>
                                            <i class="material-symbols-outlined dropdown-arrow">expand_more</i>
                                        </div>
                                        <div class="dropdown-content" id="documentTypeDropdown">
                                            <div class="dropdown-options" id="documentTypeOptions"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="filter-item">
                                    <label for="languageFilter" class="filter-label">Lingua</label>
                                    <div class="dropdown-container" data-dropdown="language">
                                        <div class="dropdown-input-wrapper">
                                            <input type="text" id="languageFilter" class="dropdown-input" placeholder="Tutte le lingue" readonly>
                                            <i class="material-symbols-outlined dropdown-arrow">expand_more</i>
                                        </div>
                                        <div class="dropdown-content" id="languageDropdown">
                                            <div class="dropdown-options" id="languageOptions"></div>
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
                                <div class="filter-item" id="pagesRangeContainer">
                                    <label class="filter-label">Numero di Pagine</label>
                                    <div class="pages-range-filter">
                                        <div class="dual-range-container">
                                            <div class="range-track">
                                                <div class="range-fill" id="pagesRangeFill"></div>
                                            </div>
                                            <input type="range" id="minPagesRange" class="range-slider range-slider-min" min="1" max="1000" value="1" step="1">
                                            <input type="range" id="maxPagesRange" class="range-slider range-slider-max" min="1" max="1000" value="1000" step="1">
                                        </div>
                                        <div class="range-values">
                                            <span id="minPagesValue" class="editable-value" data-type="pages" data-position="min" data-tooltip="Clicca per modificare">1</span><span id="maxPagesValue" class="editable-value" data-type="pages" data-position="max" data-tooltip="Clicca per modificare">1000</span>
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
                                    <label for="academicYearFilter" class="filter-label">Anno Accademico</label>
                                    <div class="dropdown-container" data-dropdown="academicYear">
                                        <div class="dropdown-input-wrapper">
                                            <input type="text" id="academicYearFilter" class="dropdown-input" placeholder="Tutti gli anni" readonly>
                                            <i class="material-symbols-outlined dropdown-arrow">expand_more</i>
                                        </div>
                                        <div class="dropdown-content" id="academicYearDropdown">
                                            <div class="dropdown-options" id="academicYearOptions"></div>
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
                                        <div class="rating-stars-filter" id="ratingFilter">
                                            <span class="rating-star-filter" data-rating="1">★</span>
                                            <span class="rating-star-filter" data-rating="2">★</span>
                                            <span class="rating-star-filter" data-rating="3">★</span>
                                            <span class="rating-star-filter" data-rating="4">★</span>
                                            <span class="rating-star-filter" data-rating="5">★</span>
                                        </div>
                                        <span class="rating-text" id="ratingText">Qualsiasi rating</span>
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
                                <div class="filter-item" id="priceRangeContainer">
                                    <label class="filter-label">Range di Prezzo (€)</label>
                                    <div class="price-range-filter">
                                        <div class="dual-range-container">
                                            <div class="range-track">
                                                <div class="range-fill" id="rangeFill"></div>
                                            </div>
                                            <input type="range" id="minPriceRange" class="range-slider range-slider-min" min="0" max="100" value="0" step="0.5">
                                            <input type="range" id="maxPriceRange" class="range-slider range-slider-max" min="0" max="100" value="100" step="0.5">
                                        </div>
                                        <div class="price-values">
                                            <span id="minPriceValue" class="editable-value" data-type="price" data-position="min" data-tooltip="Clicca per modificare">€0</span>
                                            <span id="maxPriceValue" class="editable-value" data-type="price" data-position="max" data-tooltip="Clicca per modificare">€100</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
        
        
                    </div>
                </div>
            </div>
        
            <!-- Filters Overlay -->
            <div class="filters-overlay" id="filtersOverlay"></div>
        
            <!-- Preview Modal -->
            <div id="previewModal" class="preview-modal">
                <div class="preview-content">
                    <div class="preview-header">
                        <h2 class="preview-title" id="previewTitle">Document Preview</h2>
                        <button class="preview-close" id="previewCloseBtn">×</button>
                    </div>
                    <div id="previewBody" class="preview-body">
                        <!-- Preview content will be loaded here -->
                    </div>
                    <div id="previewActions" class="preview-actions">
                        <!-- Action buttons will be added here -->
                    </div>
                </div>
            </div>
        
            <!-- Scroll to Top Button -->
            <button class="scroll-to-top-btn" id="scrollToTopBtn" aria-label="Scroll to top of page">
                <i class="material-symbols-outlined">keyboard_arrow_up</i>
            </button>
        
            <!-- Reviews Overlay -->
            <div class="reviews-overlay" id="reviewsOverlay">
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
                        
                        <div class="reviews-list" id="reviewsList">
                            <!-- Reviews will be populated here -->
                        </div>
                        
                        <div class="add-review-form" id="addReviewForm" style="display: none;">
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
                                <label for="reviewComment">Commento:</label>
                                <textarea id="reviewComment" placeholder="Condividi la tua esperienza con questo documento..." rows="4"></textarea>
                            </div>
                            <div class="review-form-actions">
                                <button class="cancel-review-btn" data-action="hide-review-form">Annulla</button>
                                <button class="submit-review-btn" data-action="submit-review">Invia Recensione</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        
            <!-- Professional Performance & Caching System -->
            <!-- External scripts removed for web component compatibility -->
            
        </body>
        </html>
      `;
  
      this.shadowRoot.innerHTML = template;
    }
  
    get apiBase() {
      return this.getAttribute('api-base');
    }
  
    set apiBase(value) {
      this.setAttribute('api-base', value);
    }
  
    get authToken() {
      return this.getAttribute('auth-token');
    }
  
    set authToken(value) {
      this.setAttribute('auth-token', value);
    }
  
    get placeholderText() {
      return this.getAttribute('placeholder-text');
    }
  
    set placeholderText(value) {
      this.setAttribute('placeholder-text', value);
    }
  
    get buttonText() {
      return this.getAttribute('button-text');
    }
  
    set buttonText(value) {
      this.setAttribute('button-text', value);
    }
  
  }
  
  // Register the custom element
  customElements.define('search-section-component', SearchSectionComponent);
  
  // Usage example:
  // <search-section-component api-base="value" auth-token="value" placeholder-text="value" button-text="value"></search-section-component>