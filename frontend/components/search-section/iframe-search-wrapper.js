/**
 * IframeSearchWrapper - Component for embedding multiple independent search sections
 * Allows each search section to have its own isolated JavaScript context and state
 */
class IframeSearchWrapper {
    constructor(containerId, config = {}) {
        this.containerId = containerId;
        this.config = config;
        this.iframe = null;
        this.isLoaded = false;
        this.isLoading = false;
        this.messageHandlers = new Map();
        this.retryCount = 0;
        this.maxRetries = 2;
        
        // Check if this is the main search container (should load immediately)
        const isMainSearch = containerId === 'main-search-container';
        
        if (isMainSearch) {
            // Load main search iframe immediately
            this.init();
        } else {
            // Lazy load other iframes when they come into view
            this.initLazyLoading();
        }
    }

    /**
     * Initialize lazy loading for the iframe
     */
    initLazyLoading() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container with ID "${this.containerId}" not found`);
            return;
        }

        // Add loading state to container
        container.classList.add('loading');
        
        // Use Intersection Observer for lazy loading
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.isLoading && !this.isLoaded) {
                        this.init();
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px' // Start loading 50px before the element comes into view
            });
            
            observer.observe(container);
        } else {
            // Fallback for browsers without Intersection Observer
            this.init();
        }
    }

    /**
     * Initialize the iframe wrapper
     */
    init() {
        if (this.isLoading || this.isLoaded) {
            return; // Prevent multiple initializations
        }
        
        this.isLoading = true;
        
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container with ID "${this.containerId}" not found`);
            return;
        }

        // Create iframe element
        this.iframe = document.createElement('iframe');
        this.iframe.src = 'components/search-section/search-section.html';
        
        // Set iframe attributes to completely disable scrolling
        this.iframe.setAttribute('scrolling', 'no');
        this.iframe.setAttribute('frameborder', '0');
        this.iframe.setAttribute('allowtransparency', 'true');
        this.iframe.setAttribute('seamless', 'seamless');
        
        // Comprehensive styling to eliminate scroll bars and ensure integration
        this.iframe.style.cssText = `
            width: 100% !important;
            max-width: 100vw !important;
            min-height: ${this.config.height || '600px'} !important;
            height: auto !important;
            border: none !important;
            border-radius: 12px !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
            background-color: transparent !important;
            box-sizing: border-box !important;
            display: block !important;
            overflow: hidden !important;
            overflow-x: hidden !important;
            overflow-y: hidden !important;
            resize: none !important;
            margin: 0 !important;
            padding: 0 !important;
            position: relative !important;
            z-index: 1 !important;
            vertical-align: top !important;
            -webkit-overflow-scrolling: auto !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
        `;

        // Add iframe to container
        container.appendChild(this.iframe);

        // Set up load timeout
        const isMainSearch = this.containerId === 'main-search-container';
        const timeoutDuration = isMainSearch ? 5000 : 10000; // 5s for main, 10s for others
        
        const loadTimeout = setTimeout(() => {
            if (!this.isLoaded) {
                console.warn(`Iframe load timeout for container "${this.containerId}" (${timeoutDuration}ms)`);
                this.handleLoadError(container);
            }
        }, timeoutDuration);

        // Wait for iframe to load, then pass configuration
        this.iframe.onload = () => {
            clearTimeout(loadTimeout);
            this.isLoaded = true;
            this.isLoading = false;
            container.classList.remove('loading');
            this.iframe.classList.add('loaded'); // Add loaded class for smooth transition
            
            // Inject CSS to remove scroll bars from iframe content
            this.injectNoScrollCSS();
            
            this.passConfiguration();
            this.setupMessageHandling();
            
            // Adjust height to content after a short delay to ensure content is fully loaded
            setTimeout(() => {
                this.adjustHeightToContent();
            }, 100);
            
            // Set up a ResizeObserver to automatically adjust height when content changes
            this.setupHeightObserver();
            
            // Set up periodic check to ensure no scroll bars appear
            this.setupScrollBarMonitor();
            
            console.log(`Iframe ${this.containerId} is ready`);
        };

        // Handle iframe load errors
        this.iframe.onerror = () => {
            clearTimeout(loadTimeout);
            this.handleLoadError(container);
        };
    }

    /**
     * Pass configuration to the iframe
     */
    passConfiguration() {
        if (!this.isLoaded || !this.iframe || !this.iframe.contentWindow) {
            console.warn('Iframe not ready for configuration');
            return;
        }

        // Send configuration to iframe
        this.iframe.contentWindow.postMessage({
            type: 'CONFIG',
            config: this.config,
            instanceId: this.containerId
        }, '*');
    }

    /**
     * Setup message handling between parent and iframe
     */
    setupMessageHandling() {
        // Listen for messages from iframe
        window.addEventListener('message', (event) => {
            // Verify message is from our iframe
            if (event.source !== this.iframe.contentWindow) {
                return;
            }

            const { type, data, instanceId } = event.data;

            // Only handle messages for this instance
            if (instanceId !== this.containerId) {
                return;
            }

            // Handle different message types
            switch (type) {
                case 'SEARCH_RESULTS':
                    this.handleSearchResults(data);
                    // Adjust height after search results are loaded
                    setTimeout(() => this.adjustHeightToContent(), 200);
                    break;
                case 'FILTER_CHANGED':
                    this.handleFilterChanged(data);
                    // Adjust height after filters are applied
                    setTimeout(() => this.adjustHeightToContent(), 200);
                    break;
                case 'DOCUMENT_CLICKED':
                    this.handleDocumentClicked(data);
                    break;
                case 'ERROR':
                    this.handleError(data);
                    break;
                case 'LOADING_STATE':
                    this.handleLoadingState(data);
                    break;
                case 'READY':
                    this.handleReady();
                    // Adjust height when iframe is ready
                    setTimeout(() => this.adjustHeightToContent(), 100);
                    break;
                case 'API_REQUEST':
                    this.handleApiRequest(data);
                    break;
                case 'CONTENT_CHANGED':
                    // Handle explicit content change notifications
                    setTimeout(() => this.adjustHeightToContent(), 100);
                    break;
                default:
                    // Check if there's a custom handler for this message type
                    if (this.messageHandlers.has(type)) {
                        this.messageHandlers.get(type)(data);
                    }
            }
        });
    }

    /**
     * Send message to iframe
     */
    sendMessage(message) {
        if (!this.isLoaded || !this.iframe || !this.iframe.contentWindow) {
            console.warn('Iframe not ready for messaging');
            return false;
        }

        // Add instance ID to message
        const messageWithId = {
            ...message,
            instanceId: this.containerId
        };

        this.iframe.contentWindow.postMessage(messageWithId, '*');
        return true;
    }

    /**
     * Set custom message handler
     */
    onMessage(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.passConfiguration();
    }

    /**
     * Set iframe height
     */
    setHeight(height) {
        if (this.iframe) {
            this.iframe.style.minHeight = height;
            // Keep height auto to allow natural expansion
        }
    }

    /**
     * Adjust iframe height to content
     */
    adjustHeightToContent() {
        if (!this.iframe || !this.isLoaded) {
            return;
        }

        try {
            const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;
            const iframeBody = iframeDoc.body;
            const iframeHtml = iframeDoc.documentElement;
            
            // Force iframe content to have no scroll
            iframeBody.style.overflow = 'hidden';
            iframeBody.style.overflowX = 'hidden';
            iframeBody.style.overflowY = 'hidden';
            iframeHtml.style.overflow = 'hidden';
            iframeHtml.style.overflowX = 'hidden';
            iframeHtml.style.overflowY = 'hidden';
            
            // Get the actual content height
            const contentHeight = Math.max(
                iframeBody.scrollHeight,
                iframeBody.offsetHeight,
                iframeHtml.clientHeight,
                iframeHtml.scrollHeight,
                iframeHtml.offsetHeight
            );
            
            // Add some padding to ensure no scroll bars appear
            const adjustedHeight = contentHeight + 20;
            
            // Set the iframe height to match content
            this.iframe.style.height = `${adjustedHeight}px`;
            this.iframe.style.minHeight = `${adjustedHeight}px`;
            this.iframe.style.maxHeight = `${adjustedHeight}px`;
            
            // Force iframe to have no scroll
            this.iframe.style.overflow = 'hidden';
            this.iframe.style.overflowX = 'hidden';
            this.iframe.style.overflowY = 'hidden';
            
            console.log(`Iframe height adjusted to ${adjustedHeight}px`);
        } catch (error) {
            console.warn('Could not adjust iframe height:', error);
        }
    }

    /**
     * Inject CSS to remove scroll bars from iframe content
     */
    injectNoScrollCSS() {
        if (!this.iframe || !this.isLoaded) {
            return;
        }

        try {
            const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;
            const iframeHead = iframeDoc.head;
            
            // Create style element with comprehensive no-scroll CSS
            const style = iframeDoc.createElement('style');
            style.textContent = `
                /* Completely remove scroll bars from iframe content */
                html, body {
                    overflow: hidden !important;
                    overflow-x: hidden !important;
                    overflow-y: hidden !important;
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                    -webkit-overflow-scrolling: auto !important;
                    height: auto !important;
                    min-height: auto !important;
                    max-height: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                /* Hide scrollbars for webkit browsers */
                html::-webkit-scrollbar,
                body::-webkit-scrollbar,
                *::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                
                /* Ensure all elements don't create scroll */
                * {
                    box-sizing: border-box !important;
                }
                
                /* Main content should flow naturally */
                .main-content {
                    overflow: visible !important;
                    overflow-x: hidden !important;
                    overflow-y: visible !important;
                    height: auto !important;
                    min-height: auto !important;
                    max-height: none !important;
                }
                
                /* Search section should flow naturally */
                .search-section {
                    overflow: visible !important;
                    overflow-x: hidden !important;
                    overflow-y: visible !important;
                    height: auto !important;
                    min-height: auto !important;
                    max-height: none !important;
                }
                
                /* Documents grid should flow naturally */
                .documents-grid {
                    overflow: visible !important;
                    overflow-x: hidden !important;
                    overflow-y: visible !important;
                }
                
                /* Force remove any scroll containers */
                .scroll-container,
                [class*="scroll"],
                [id*="scroll"] {
                    overflow: visible !important;
                    overflow-x: hidden !important;
                    overflow-y: visible !important;
                }
            `;
            
            // Inject the style into iframe head
            iframeHead.appendChild(style);
            
            console.log('No-scroll CSS injected into iframe');
        } catch (error) {
            console.warn('Could not inject no-scroll CSS:', error);
        }
    }

    /**
     * Setup ResizeObserver to automatically adjust iframe height
     */
    setupHeightObserver() {
        if (!this.iframe || !this.isLoaded || !window.ResizeObserver) {
            return;
        }

        try {
            const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;
            const iframeBody = iframeDoc.body;
            
            // Create a ResizeObserver to watch for content changes
            this.resizeObserver = new ResizeObserver((entries) => {
                // Debounce the height adjustment
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => {
                    this.adjustHeightToContent();
                }, 100);
            });
            
            // Observe the iframe body for size changes
            this.resizeObserver.observe(iframeBody);
            
            console.log('Height observer set up for iframe');
        } catch (error) {
            console.warn('Could not set up height observer:', error);
        }
    }

    /**
     * Setup periodic monitoring to ensure no scroll bars appear
     */
    setupScrollBarMonitor() {
        if (!this.iframe || !this.isLoaded) {
            return;
        }

        // Check every 500ms to ensure no scroll bars appear
        this.scrollBarInterval = setInterval(() => {
            this.forceRemoveScrollBars();
        }, 500);
    }

    /**
     * Force remove any scroll bars that might appear
     */
    forceRemoveScrollBars() {
        if (!this.iframe || !this.isLoaded) {
            return;
        }

        try {
            const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;
            const iframeBody = iframeDoc.body;
            const iframeHtml = iframeDoc.documentElement;
            
            // Force remove scroll from iframe itself
            this.iframe.style.overflow = 'hidden';
            this.iframe.style.overflowX = 'hidden';
            this.iframe.style.overflowY = 'hidden';
            
            // Force remove scroll from iframe content
            iframeBody.style.overflow = 'hidden';
            iframeBody.style.overflowX = 'hidden';
            iframeBody.style.overflowY = 'hidden';
            iframeHtml.style.overflow = 'hidden';
            iframeHtml.style.overflowX = 'hidden';
            iframeHtml.style.overflowY = 'hidden';
            
            // Force remove scroll from all elements in iframe
            const allElements = iframeDoc.querySelectorAll('*');
            allElements.forEach(element => {
                element.style.overflow = 'visible';
                element.style.overflowX = 'hidden';
                element.style.overflowY = 'visible';
            });
            
        } catch (error) {
            console.warn('Could not force remove scroll bars:', error);
        }
    }

    /**
     * Set iframe width
     */
    setWidth(width) {
        if (this.iframe) {
            this.iframe.style.width = width;
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.sendMessage({
            type: 'SHOW_LOADING'
        });
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.sendMessage({
            type: 'HIDE_LOADING'
        });
    }

    /**
     * Perform search
     */
    search(query) {
        this.sendMessage({
            type: 'SEARCH',
            query: query
        });
    }

    /**
     * Apply filters
     */
    applyFilters(filters) {
        this.sendMessage({
            type: 'APPLY_FILTERS',
            filters: filters
        });
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.sendMessage({
            type: 'CLEAR_FILTERS'
        });
    }

    /**
     * Refresh data
     */
    refresh() {
        this.sendMessage({
            type: 'REFRESH'
        });
    }

    /**
     * Destroy the iframe wrapper
     */
    destroy() {
        // Clean up resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        // Clear resize timeout
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = null;
        }
        
        // Clear scroll bar monitor
        if (this.scrollBarInterval) {
            clearInterval(this.scrollBarInterval);
            this.scrollBarInterval = null;
        }
        
        if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
        }
        this.iframe = null;
        this.isLoaded = false;
        this.messageHandlers.clear();
    }

    /**
     * Get iframe element
     */
    getIframe() {
        return this.iframe;
    }

    /**
     * Check if iframe is loaded
     */
    isIframeLoaded() {
        return this.isLoaded;
    }

    // Event handlers (can be overridden)
    handleSearchResults(data) {
        // Default handler - can be overridden
        console.log(`Search results for ${this.containerId}:`, data);
    }

    handleFilterChanged(data) {
        // Default handler - can be overridden
        console.log(`Filter changed for ${this.containerId}:`, data);
    }

    handleDocumentClicked(data) {
        // Default handler - can be overridden
        console.log(`Document clicked for ${this.containerId}:`, data);
    }

    handleError(data) {
        // Default handler - can be overridden
        console.error(`Error in ${this.containerId}:`, data);
    }

    handleLoadingState(data) {
        // Default handler - can be overridden
        console.log(`Loading state for ${this.containerId}:`, data);
    }

    handleReady() {
        // Default handler - can be overridden
        console.log(`Iframe ${this.containerId} is ready`);
    }

    /**
     * Handle API requests from iframe and proxy them through parent
     */
    async handleApiRequest(data) {
        const { url, options, requestId } = data;
        
        try {
            // Get auth token from parent window
            const authToken = localStorage.getItem('authToken');
            
            // Prepare request options
            const requestOptions = {
                method: options?.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers
                },
                ...options
            };
            
            // Add auth token if available
            if (authToken) {
                requestOptions.headers['Authorization'] = `Bearer ${authToken}`;
            }
            
            // Make the request from parent window
            const response = await fetch(url, requestOptions);
            const responseData = await response.json();
            
            // Send response back to iframe
            this.sendMessage({
                type: 'API_RESPONSE',
                requestId: requestId,
                success: true,
                data: responseData,
                status: response.status
            });
            
        } catch (error) {
            console.error('API request failed:', error);
            
            // Send error response back to iframe
            this.sendMessage({
                type: 'API_RESPONSE',
                requestId: requestId,
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Show error message if iframe fails to load
     */
    showErrorMessage(container) {
        container.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 200px;
                background: #f8f9fa;
                border: 2px dashed #dee2e6;
                border-radius: 12px;
                color: #6c757d;
                font-family: 'Inter', sans-serif;
            ">
                <div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">
                        Failed to load search section
                    </div>
                    <div style="font-size: 14px; color: #868e96;">
                        Please check the file path and try again
                    </div>
                </div>
            </div>
        `;
    }
}

// Make it globally available
window.IframeSearchWrapper = IframeSearchWrapper;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IframeSearchWrapper;
} 