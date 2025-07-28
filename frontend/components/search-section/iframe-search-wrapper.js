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
        
        // Lazy load the iframe when it comes into view
        this.initLazyLoading();
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
        this.iframe.style.width = '100%';
        this.iframe.style.maxWidth = '100vw'; // Ensure it doesn't exceed viewport width
        this.iframe.style.height = this.config.height || '600px'; // Use config height or default
        this.iframe.style.border = 'none';
        this.iframe.style.overflow = 'hidden';
        this.iframe.style.borderRadius = '12px';
        this.iframe.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
        this.iframe.style.backgroundColor = 'transparent';
        this.iframe.style.boxSizing = 'border-box'; // Include padding and border in width calculation
        this.iframe.style.display = 'block'; // Ensure proper block display

        // Add iframe to container
        container.appendChild(this.iframe);

        // Set up load timeout
        const loadTimeout = setTimeout(() => {
            if (!this.isLoaded) {
                console.warn(`Iframe load timeout for container "${this.containerId}"`);
                this.handleLoadError(container);
            }
        }, 10000); // 10 second timeout

        // Wait for iframe to load, then pass configuration
        this.iframe.onload = () => {
            clearTimeout(loadTimeout);
            this.isLoaded = true;
            this.isLoading = false;
            container.classList.remove('loading');
            this.iframe.classList.add('loaded'); // Add loaded class for smooth transition
            this.passConfiguration();
            this.setupMessageHandling();
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
                    break;
                case 'FILTER_CHANGED':
                    this.handleFilterChanged(data);
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
                    break;
                case 'API_REQUEST':
                    this.handleApiRequest(data);
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
            this.iframe.style.height = height;
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