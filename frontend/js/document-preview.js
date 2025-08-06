import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/build/pdf.mjs';

// Set the worker script path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/build/pdf.worker.mjs`;

// ============================================
// WORLD-CLASS DYNAMIC DOCUMENT PREVIEW SYSTEM
// ============================================

// API Configuration - use existing API_BASE if defined, otherwise define it
if (typeof API_BASE === 'undefined') {
    var API_BASE = window.APP_CONFIG?.API_BASE || 'https://symbia.it';
}
let authToken = localStorage.getItem('authToken');

// Document State Management
let currentDocument = null;
let currentVetrina = null;
let currentVetrinaFiles = []; // Store vetrina files for bundle operations
let currentUser = null; // Store current user data for review comparisons
let currentPage = 1;
let totalPages = 1;

// File Review State Management
let currentFileForReviews = null; // Store current file ID for reviews
let currentFileReviews = []; // Store file reviews data

// PDF.js state
let pdfDoc = null; 
let pdfPageNum = 1;
let pdfTotalPages = 1;
let pdfZoom = 1.0; // Default zoom scale for PDF.js
let isPdfLoading = false;

let documentPages = [];
let isLoading = false;
let documentData = null; // Store document data
let bottomOverlayTimeout = null;

// Configuration
const ZOOM_CONFIG = {
    min: 0.5,
    max: 3.0,
    step: 0.25 // Step for PDF.js scale
};





// Professional Loading States
class LoadingManager {
    static show(container, message = 'Caricamento...') {
        const loader = document.createElement('div');
        loader.className = 'premium-loader';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <p class="loader-text">${message}</p>
            </div>
        `;
        container.appendChild(loader);
        return loader;
    }

    static showDocumentPreview(container) {
        const loader = document.createElement('div');
        loader.className = 'document-preview-loader';
        loader.innerHTML = `
            <div class="preview-loader-content">
                <!-- Document Viewer Skeleton -->
                <div class="preview-viewer-skeleton">
                    <div class="viewer-header-skeleton">
                        <div class="skeleton-title-large"></div>
                        <div class="skeleton-subtitle"></div>
                    </div>
                    <div class="viewer-pages-skeleton">
                        <div class="skeleton-page"></div>
                        <div class="skeleton-page"></div>
                        <div class="skeleton-page"></div>
                    </div>
                </div>
                
                <!-- Sidebar Skeleton -->
                <div class="preview-sidebar-skeleton">
                    <div class="sidebar-header-skeleton">
                        <div class="skeleton-doc-title"></div>
                        <div class="skeleton-doc-meta">
                            <div class="skeleton-rating"></div>
                            <div class="skeleton-price"></div>
                        </div>
                    </div>
                    
                    <div class="sidebar-details-skeleton">
                        <div class="skeleton-detail-item"></div>
                        <div class="skeleton-detail-item"></div>
                        <div class="skeleton-detail-item"></div>
                        <div class="skeleton-detail-item"></div>
                        <div class="skeleton-detail-item"></div>
                        <div class="skeleton-detail-item"></div>
                    </div>
                    
                    <div class="sidebar-actions-skeleton">
                        <div class="skeleton-action-btn primary"></div>
                        <div class="skeleton-action-buttons">
                            <div class="skeleton-action-btn secondary"></div>
                            <div class="skeleton-action-btn secondary"></div>
                        </div>
                    </div>
                    
                    <div class="sidebar-sections-skeleton">
                        <div class="skeleton-section">
                            <div class="skeleton-section-title"></div>
                            <div class="skeleton-section-content"></div>
                        </div>
                        <div class="skeleton-section">
                            <div class="skeleton-section-title"></div>
                            <div class="skeleton-section-content"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(loader);
        return loader;
    }

    static hide(loader) {
        if (loader && loader.parentNode) {
            loader.style.opacity = '0';
            setTimeout(() => {
                if (loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }
            }, 300);
        }
    }

    static showError(container, message, actionText = 'Riprova', actionCallback = null) {
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">📄</div>
                <h2>Ops! Qualcosa è andato storto</h2>
                <p>${message}</p>
                ${actionCallback ? `<button class="retry-btn" data-action-callback="${actionCallback}">
                    <span class="material-symbols-outlined">refresh</span>
                    ${actionText}
                </button>` : ''}
            </div>
        `;
    }
}

// Handle action callback buttons for CSP compliance
function handleActionCallbackButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.retry-btn[data-action-callback]')) {
            const button = e.target.closest('.retry-btn[data-action-callback]');
            const callback = button.getAttribute('data-action-callback');
            if (callback && typeof window[callback] === 'function') {
                window[callback]();
            }
        }
        
        if (e.target.closest('.retry-btn[data-action="navigate"]')) {
            const button = e.target.closest('.retry-btn[data-action="navigate"]');
            const url = button.getAttribute('data-url');
            if (url) {
                window.location.href = url;
            }
        }
        
        if (e.target.closest('[data-action="open-viewer"]')) {
            const element = e.target.closest('[data-action="open-viewer"]');
            const fileId = element.getAttribute('data-file-id');
            if (fileId) {
                e.stopPropagation();
                openDocumentViewer(fileId);
            }
        }
        
        // Download functionality removed
        
        // Reviews overlay actions are now handled by the new system in initializeReviewsOverlay()
        
        if (e.target.closest('[data-action="add-to-cart"]')) {
            const element = e.target.closest('[data-action="add-to-cart"]');
            const docId = element.getAttribute('data-doc-id');
            if (docId) {
                addRelatedToCart(docId, e);
            }
        }
        
        // Download functionality removed
    });
}

// Professional API Request Handler
async function makeRequest(url, options = {}) {
    try {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (!response.ok) {
            // Handle CORS preflight failures more gracefully
            if (response.status === 405 && response.statusText === 'METHOD NOT ALLOWED') {
                console.warn('CORS preflight failed for:', url);
                console.warn('This is likely due to the server not handling OPTIONS requests properly');
                throw new Error(`CORS Error: Server does not support preflight requests for ${url}`);
            }
            
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// Fetch redacted PDF URL
function getRedactedPdfUrl(fileId) {
    return `${API_BASE}/files/${fileId}/download/redacted`;
}

// Check if file is a PDF
function isPdfFile(filename) {
    return filename && filename.toLowerCase().endsWith('.pdf');
}

// PDF.js Viewer Implementation
async function loadPdfWithPdfJs(fileId, viewerElementId) {
    const viewerElement = document.getElementById(viewerElementId);
    if (!viewerElement) return;

    viewerElement.innerHTML = '';
    const loader = LoadingManager.show(viewerElement, 'Caricamento anteprima...');

    try {
        const url = getRedactedPdfUrl(fileId);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);

        const pdfData = await response.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        pdfDoc = await loadingTask.promise;
        pdfTotalPages = pdfDoc.numPages;
        
        LoadingManager.hide(loader);
        
        pdfPageNum = 1;
        await renderPdfPage(viewerElement, pdfPageNum);
        updatePageIndicator();
    } catch (error) {
        console.error('Error loading PDF with PDF.js:', error);
        LoadingManager.hide(loader);
        LoadingManager.showError(viewerElement, 'Impossibile caricare l\'anteprima del documento.');
    }
}

async function renderPdfPage(container, pageNum) {
    if (!pdfDoc) return;

    isPdfLoading = true;
    const page = await pdfDoc.getPage(pageNum);

    // Calculate the scale to fit the page width to the container width
    const containerWidth = container.clientWidth;
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const baseScale = containerWidth / unscaledViewport.width;
    
    const displayScale = baseScale * pdfZoom;
    const viewport = page.getViewport({ scale: displayScale });
    
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    container.appendChild(canvas);

    const renderContext = { canvasContext: context, viewport: viewport };
    await page.render(renderContext).promise;
    isPdfLoading = false;
}

// Zoom System
function initializeZoom() {
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => adjustZoom(ZOOM_CONFIG.step));
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => adjustZoom(-ZOOM_CONFIG.step));
    }
    
    updateZoomDisplay();
}

function adjustZoom(delta) {
    if (!pdfDoc) return;
    
    const newZoom = Math.max(ZOOM_CONFIG.min, Math.min(ZOOM_CONFIG.max, pdfZoom + delta));
    
    if (newZoom !== pdfZoom) {
        pdfZoom = newZoom;
        const viewerElement = document.getElementById('documentViewer');
        if (viewerElement) {
             renderPdfPage(viewerElement, pdfPageNum);
        }
        updateZoomDisplay();
    }
}

function updateZoomDisplay() {
    const zoomLevelText = document.querySelector('.zoom-level');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');

    if (zoomLevelText) {
        zoomLevelText.textContent = `${Math.round(pdfZoom * 100)}%`;
    }
    
    if (zoomInBtn) {
        zoomInBtn.disabled = pdfZoom >= ZOOM_CONFIG.max;
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.disabled = pdfZoom <= ZOOM_CONFIG.min;
    }
}

// Page Navigation
function initializePageNavigation() {
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');

    if(prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (pdfPageNum > 1 && !isPdfLoading) {
                pdfPageNum--;
                const viewerElement = document.getElementById('documentViewer');
                if (viewerElement) renderPdfPage(viewerElement, pdfPageNum);
                updatePageIndicator();
            }
        });
    }

    if(nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (pdfPageNum < pdfTotalPages && !isPdfLoading) {
                pdfPageNum++;
                const viewerElement = document.getElementById('documentViewer');
                if (viewerElement) renderPdfPage(viewerElement, pdfPageNum);
                updatePageIndicator();
            }
        });
    }

    updatePageIndicator();
}

function updatePageIndicator() {
    const pageIndicator = document.getElementById('pageIndicator');
    if (pageIndicator) pageIndicator.textContent = `Pagina ${pdfPageNum} di ${pdfTotalPages}`;
    
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    if(prevPageBtn) prevPageBtn.disabled = pdfPageNum <= 1;
    if(nextPageBtn) nextPageBtn.disabled = pdfPageNum >= pdfTotalPages;
}

// Fullscreen System
function initializeFullscreen() {
    // Add a small delay to ensure DOM is ready
        setTimeout(() => {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const documentViewer = document.querySelector('.document-viewer-container');

        if (fullscreenBtn && documentViewer) {
            fullscreenBtn.addEventListener('click', () => {
                toggleFullscreen(documentViewer);
            });

            document.addEventListener('fullscreenchange', () => {
                if (!document.fullscreenElement) {
                    fullscreenBtn.innerHTML = '<span class="material-symbols-outlined">fullscreen</span>';
                    fullscreenBtn.title = 'Schermo intero';
                } else {
                    fullscreenBtn.innerHTML = '<span class="material-symbols-outlined">fullscreen_exit</span>';
                    fullscreenBtn.title = 'Esci da schermo intero';
                }
            });
        }
    }, 500);
}

function toggleFullscreen(element) {
    if (!document.fullscreenElement) {
        try {
            element.requestFullscreen();
        } catch (err) {
            console.error('Fullscreen request failed:', err);
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Load redacted PDF from a given file ID
async function loadRedactedPdf(fileId, viewerElementId) {
    console.log('Loading redacted PDF for fileId:', fileId, 'viewerElementId:', viewerElementId);
    console.log('Current document:', currentDocument);
    
    const viewerElement = document.getElementById(viewerElementId);
    if (!viewerElement) {
        console.error(`Viewer element '${viewerElementId}' not found.`);
        return;
    }

    if (!fileId) {
        console.error('No fileId provided for PDF loading');
        viewerElement.innerHTML = `
            <div class="unsupported-preview">
                <span class="material-symbols-outlined">error</span>
                <p>Errore: ID file non valido</p>
            </div>
        `;
        return;
    }

    // For redacted PDFs, we assume they are PDFs since they're generated from the original
    // Let's proceed with loading the PDF directly
    await loadEmbeddedPdfViewer(fileId, viewerElementId);
}

async function loadEmbeddedPdfViewer(fileId, viewerElementId) {
    const viewerElement = document.getElementById(viewerElementId);
    if (!viewerElement) {
        console.error(`Viewer element '${viewerElementId}' not found.`);
        return;
    }

    viewerElement.innerHTML = ''; // Clear previous content
    const loader = LoadingManager.show(viewerElement, 'Caricamento anteprima...');

    try {
        // 1. Fetch the PDF data as an ArrayBuffer
        const pdfUrl = getRedactedPdfUrl(fileId);
        console.log('Fetching PDF from URL:', pdfUrl);
        console.log('Auth token available:', !!authToken);
        
        const response = await fetch(pdfUrl, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        console.log('PDF fetch response status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Impossibile scaricare il PDF: ${response.status} ${response.statusText}`);
        }

        const pdfData = await response.arrayBuffer();
        
        // Security: Check file size to prevent memory issues
        const maxFileSize = 50 * 1024 * 1024; // 50MB limit
        if (pdfData.byteLength > maxFileSize) {
            throw new Error('Il file PDF è troppo grande. Dimensione massima: 50MB');
        }
        
        // Convert to base64 data URL for CSP compliance
        const uint8Array = new Uint8Array(pdfData);
        
        // Use a more robust method to convert Uint8Array to base64
        // This avoids stack overflow by using a different approach
        let binaryString = '';
        const chunkSize = 1024; // Smaller chunks for better compatibility

        for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
            // Use a loop instead of apply or spread to avoid stack overflow
            for (let j = 0; j < chunk.length; j++) {
                binaryString += String.fromCharCode(chunk[j]);
            }
        }

        const base64 = btoa(binaryString);
        const dataUrl = `data:application/pdf;base64,${base64}`;
        
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.borderRadius = '8px';
        container.style.overflow = 'hidden';
        container.style.backgroundColor = '#ffffff';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        
        // --- Professional Toolbar ---
        const toolbar = document.createElement('div');
        toolbar.style.padding = '8px 16px';
        toolbar.style.backgroundColor = '#ffffff';
        toolbar.style.borderBottom = '1px solid #e5e7eb';
        toolbar.style.display = 'flex';
        toolbar.style.alignItems = 'center';
        toolbar.style.justifyContent = 'space-between';
        toolbar.style.flexShrink = '0';

        const applyModernButtonStyles = (button) => {
            button.style.backgroundColor = 'transparent';
            button.style.border = 'none';
            button.style.color = '#000000';
            button.style.cursor = 'pointer';
            button.style.padding = '6px';
            button.style.borderRadius = '50%';
            button.style.display = 'flex';
            button.style.alignItems = 'center';
            button.style.justifyContent = 'center';
            button.style.transition = 'background-color 0.2s ease-in-out';
            button.onmouseenter = () => button.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
            button.onmouseleave = () => button.style.backgroundColor = 'transparent';
        };

        // Left Controls (Bundle Navigation) - only in single document view
        const leftControls = document.createElement('div');
        leftControls.style.display = 'flex';
        leftControls.style.alignItems = 'center';
        leftControls.style.gap = '12px';
        
        // Check if we're in single document view and add bundle navigation
        if (isSingleDocumentView() && currentVetrinaFiles.length > 1) {
            // Return to bundle button
            const returnBtn = document.createElement('button');
            returnBtn.style.display = 'flex';
            returnBtn.style.alignItems = 'center';
            returnBtn.style.gap = '6px';
            returnBtn.style.padding = '6px 12px';
            returnBtn.style.backgroundColor = '#f3f4f6';
            returnBtn.style.border = '1px solid #d1d5db';
            returnBtn.style.borderRadius = '6px';
            returnBtn.style.color = '#374151';
            returnBtn.style.fontSize = '13px';
            returnBtn.style.fontWeight = '500';
            returnBtn.style.cursor = 'pointer';
            returnBtn.style.transition = 'all 0.2s ease';
            returnBtn.title = 'Torna alla vetrina';
            returnBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">arrow_back</span>Torna alla vetrina';
            returnBtn.onmouseenter = () => {
                returnBtn.style.backgroundColor = '#e5e7eb';
                returnBtn.style.borderColor = '#9ca3af';
            };
            returnBtn.onmouseleave = () => {
                returnBtn.style.backgroundColor = '#f3f4f6';
                returnBtn.style.borderColor = '#d1d5db';
            };
            returnBtn.onclick = returnToBundle;
            
            // Bundle dropdown container
            const dropdownContainer = document.createElement('div');
            dropdownContainer.style.position = 'relative';
            dropdownContainer.id = 'bundleDropdownContainer';
            
            // Bundle dropdown trigger
            const dropdownTrigger = document.createElement('button');
            dropdownTrigger.style.display = 'flex';
            dropdownTrigger.style.alignItems = 'center';
            dropdownTrigger.style.gap = '8px';
            dropdownTrigger.style.padding = '6px 12px';
            dropdownTrigger.style.backgroundColor = '#eff6ff';
            dropdownTrigger.style.border = '1px solid #bfdbfe';
            dropdownTrigger.style.borderRadius = '6px';
            dropdownTrigger.style.color = '#1d4ed8';
            dropdownTrigger.style.fontSize = '13px';
            dropdownTrigger.style.fontWeight = '500';
            dropdownTrigger.style.cursor = 'pointer';
            dropdownTrigger.style.transition = 'all 0.2s ease';
            dropdownTrigger.style.minWidth = '180px';
            dropdownTrigger.style.maxWidth = '220px';
            dropdownTrigger.id = 'bundleDropdownTrigger';
            
            const currentFile = currentVetrinaFiles.find(f => f.file_id == getSpecificFileIdFromUrl());
            const currentFileName = currentFile ? extractOriginalFilename(currentFile.filename) : 'Documento corrente';
            
            dropdownTrigger.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 16px; flex-shrink: 0;">description</span>
                <span style="flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${currentFileName}</span>
                <div style="display: flex; align-items: center; padding: 2px 4px; background: rgba(29, 78, 216, 0.1); border-radius: 3px; margin-left: 6px;">
                    <span class="material-symbols-outlined dropdown-arrow" style="font-size: 14px; transition: transform 0.2s ease; color: #1d4ed8;">expand_more</span>
                </div>
            `;
            
            dropdownTrigger.onmouseenter = () => {
                dropdownTrigger.style.backgroundColor = '#dbeafe';
                dropdownTrigger.style.borderColor = '#93c5fd';
            };
            dropdownTrigger.onmouseleave = () => {
                dropdownTrigger.style.backgroundColor = '#eff6ff';
                dropdownTrigger.style.borderColor = '#bfdbfe';
            };
            
            // Bundle dropdown menu
            const dropdownMenu = document.createElement('div');
            dropdownMenu.style.position = 'absolute';
            dropdownMenu.style.top = '100%';
            dropdownMenu.style.left = '0';
            dropdownMenu.style.minWidth = '300px';
            dropdownMenu.style.maxWidth = '380px';
            dropdownMenu.style.backgroundColor = '#ffffff';
            dropdownMenu.style.border = '1px solid #e5e7eb';
            dropdownMenu.style.borderRadius = '8px';
            dropdownMenu.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
            dropdownMenu.style.opacity = '0';
            dropdownMenu.style.visibility = 'hidden';
            dropdownMenu.style.transform = 'translateY(-10px)';
            dropdownMenu.style.transition = 'all 0.2s ease';
            dropdownMenu.style.zIndex = '1000';
            dropdownMenu.style.marginTop = '4px';
            dropdownMenu.id = 'bundleDropdownMenu';
            
            // Dropdown header - clickable to go to bundle
            const dropdownHeader = document.createElement('div');
            dropdownHeader.style.display = 'flex';
            dropdownHeader.style.alignItems = 'center';
            dropdownHeader.style.gap = '8px';
            dropdownHeader.style.padding = '12px 16px';
            dropdownHeader.style.backgroundColor = '#f9fafb';
            dropdownHeader.style.borderBottom = '1px solid #e5e7eb';
            dropdownHeader.style.borderRadius = '8px 8px 0 0';
            dropdownHeader.style.color = '#374151';
            dropdownHeader.style.fontSize = '13px';
            dropdownHeader.style.fontWeight = '600';
            dropdownHeader.style.cursor = 'pointer';
            dropdownHeader.style.transition = 'background-color 0.15s ease';
            dropdownHeader.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 16px; color: #3b82f6;">folder</span>
                <span style="flex: 1;">${currentVetrina?.name || 'Bundle documenti'} (${currentVetrinaFiles.length} documenti)</span>
                <span class="material-symbols-outlined" style="font-size: 14px; color: #6b7280;">open_in_new</span>
            `;
            
            dropdownHeader.onmouseenter = () => {
                dropdownHeader.style.backgroundColor = '#eff6ff';
                dropdownHeader.style.color = '#1d4ed8';
            };
            dropdownHeader.onmouseleave = () => {
                dropdownHeader.style.backgroundColor = '#f9fafb';
                dropdownHeader.style.color = '#374151';
            };
            dropdownHeader.onclick = () => {
                returnToBundle();
            };
            
            // Dropdown items container with scrolling
            const dropdownItems = document.createElement('div');
            dropdownItems.style.maxHeight = '240px'; // Max height for about 6 items
            dropdownItems.style.overflowY = 'auto';
            dropdownItems.style.overflowX = 'hidden';
            dropdownItems.style.borderRadius = '0 0 8px 8px';
            
            // Custom scrollbar styling for webkit browsers
            dropdownItems.style.cssText += `
                scrollbar-width: thin;
                scrollbar-color: #d1d5db #f3f4f6;
            `;
            
            // Add webkit scrollbar styles
            const scrollbarStyle = document.createElement('style');
            scrollbarStyle.textContent = `
                #bundleDropdownMenu div::-webkit-scrollbar {
                    width: 6px;
                }
                #bundleDropdownMenu div::-webkit-scrollbar-track {
                    background: #f3f4f6;
                }
                #bundleDropdownMenu div::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 3px;
                }
                #bundleDropdownMenu div::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }
            `;
            document.head.appendChild(scrollbarStyle);
            
            currentVetrinaFiles.forEach((file, index) => {
                const fileName = extractOriginalFilename(file.filename);
                const isActive = file.file_id == getSpecificFileIdFromUrl();
                
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.alignItems = 'center';
                item.style.gap = '12px';
                item.style.padding = '10px 16px';
                item.style.color = isActive ? '#1d4ed8' : '#374151';
                item.style.fontSize = '13px';
                item.style.cursor = 'pointer';
                item.style.transition = 'all 0.15s ease';
                item.style.borderBottom = index < currentVetrinaFiles.length - 1 ? '1px solid #f3f4f6' : 'none';
                item.style.backgroundColor = isActive ? '#eff6ff' : 'transparent';
                item.style.fontWeight = isActive ? '500' : '400';
                
                item.innerHTML = `
                    <span class="material-symbols-outlined" style="font-size: 16px; color: ${isActive ? '#3b82f6' : '#6b7280'}; flex-shrink: 0;">description</span>
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${fileName}">${fileName}</span>
                    ${isActive ? '<span style="color: #3b82f6; font-weight: 600; font-size: 14px;">✓</span>' : ''}
                `;
                
                item.onmouseenter = () => {
                    if (!isActive) {
                        item.style.backgroundColor = '#f8faff';
                        item.style.color = '#1d4ed8';
                    }
                };
                item.onmouseleave = () => {
                    if (!isActive) {
                        item.style.backgroundColor = 'transparent';
                        item.style.color = '#374151';
                    }
                };
                
                item.onclick = () => navigateToDocument(file.file_id);
                
                dropdownItems.appendChild(item);
            });
            
            dropdownMenu.appendChild(dropdownHeader);
            dropdownMenu.appendChild(dropdownItems);
            dropdownContainer.appendChild(dropdownTrigger);
            dropdownContainer.appendChild(dropdownMenu);
            
            // Add dropdown functionality
            dropdownTrigger.onclick = (e) => {
                e.stopPropagation();
                const isActive = dropdownMenu.style.opacity === '1';
                if (isActive) {
                    dropdownMenu.style.opacity = '0';
                    dropdownMenu.style.visibility = 'hidden';
                    dropdownMenu.style.transform = 'translateY(-10px)';
                    dropdownTrigger.querySelector('.dropdown-arrow').style.transform = 'rotate(0deg)';
                } else {
                    dropdownMenu.style.opacity = '1';
                    dropdownMenu.style.visibility = 'visible';
                    dropdownMenu.style.transform = 'translateY(0)';
                    dropdownTrigger.querySelector('.dropdown-arrow').style.transform = 'rotate(180deg)';
                }
            };
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!dropdownContainer.contains(e.target)) {
                    dropdownMenu.style.opacity = '0';
                    dropdownMenu.style.visibility = 'hidden';
                    dropdownMenu.style.transform = 'translateY(-10px)';
                    dropdownTrigger.querySelector('.dropdown-arrow').style.transform = 'rotate(0deg)';
                }
            });
            
            leftControls.appendChild(returnBtn);
            leftControls.appendChild(dropdownContainer);
        }

        // Right Controls (Zoom, Fullscreen) - positioned on the right
        const rightControls = document.createElement('div');
        rightControls.style.display = 'flex';
        rightControls.style.alignItems = 'center';
        rightControls.style.gap = '8px';
        rightControls.style.marginLeft = 'auto'; // Push to the right

        const zoomOutBtn = document.createElement('button');
        applyModernButtonStyles(zoomOutBtn);
        zoomOutBtn.title = 'Zoom Out';
        zoomOutBtn.innerHTML = '<span class="material-symbols-outlined">zoom_out</span>';
        
        const zoomInfo = document.createElement('span');
        zoomInfo.style.color = '#000000';
        zoomInfo.style.fontSize = '14px';
        zoomInfo.style.minWidth = '45px';
        zoomInfo.style.textAlign = 'center';
        
        const zoomInBtn = document.createElement('button');
        applyModernButtonStyles(zoomInBtn);
        zoomInBtn.title = 'Zoom In';
        zoomInBtn.innerHTML = '<span class="material-symbols-outlined">zoom_in</span>';

        const fullscreenBtn = document.createElement('button');
        applyModernButtonStyles(fullscreenBtn);
        fullscreenBtn.title = 'Fullscreen';
        fullscreenBtn.innerHTML = '<span class="material-symbols-outlined">fullscreen</span>';
        
        rightControls.appendChild(zoomOutBtn);
        rightControls.appendChild(zoomInfo);
        rightControls.appendChild(zoomInBtn);
        rightControls.appendChild(document.createElement('div')).style.width = '16px'; // separator
        rightControls.appendChild(fullscreenBtn);
        
        toolbar.appendChild(leftControls);
        toolbar.appendChild(rightControls);
        container.appendChild(toolbar);
        
        const viewerArea = document.createElement('div');
        viewerArea.style.flex = '1';
        viewerArea.style.overflow = 'auto';
        viewerArea.style.paddingTop = '20px';
        viewerArea.style.textAlign = 'center';
        viewerArea.style.backgroundColor = '#ffffff';
        container.appendChild(viewerArea);
        
        viewerElement.appendChild(container);
        
        const loadingTask = pdfjsLib.getDocument({ url: dataUrl });
        
        // Add timeout for PDF loading
        const pdfLoadPromise = loadingTask.promise;
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout nel caricamento del PDF')), 30000); // 30 second timeout
        });

        const pdfDocument = await Promise.race([pdfLoadPromise, timeoutPromise]);
        
        let currentScale = 1.0;
        const totalPages = pdfDocument.numPages;
        
        function updateZoomInfo() {
            zoomInfo.textContent = `${Math.round(currentScale * 100)}%`;
        }
        
        async function renderAllPages() {
            viewerArea.innerHTML = '';
            
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                const page = await pdfDocument.getPage(pageNum);
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                
                const viewport = page.getViewport({ scale: currentScale });
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.style.display = 'block';
                canvas.style.marginLeft = 'auto';
                canvas.style.marginRight = 'auto';
                canvas.style.marginBottom = '20px';
                canvas.style.backgroundColor = 'white';
                canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                
                viewerArea.appendChild(canvas);
                
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                
                await page.render(renderContext).promise;
            }
            updateZoomInfo();
        }
        
        zoomOutBtn.addEventListener('click', () => {
            if (currentScale > 0.5) {
                currentScale -= 0.25;
                // Add debouncing to prevent rapid re-rendering
                clearTimeout(window.zoomTimeout);
                window.zoomTimeout = setTimeout(() => {
                    renderAllPages();
                }, 100);
            }
        });
        
        zoomInBtn.addEventListener('click', () => {
            if (currentScale < 3.0) {
                currentScale += 0.25;
                // Add debouncing to prevent rapid re-rendering
                clearTimeout(window.zoomTimeout);
                window.zoomTimeout = setTimeout(() => {
                    renderAllPages();
                }, 100);
            }
        });
        
        fullscreenBtn.addEventListener('click', () => toggleFullscreen(container));
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                fullscreenBtn.innerHTML = '<span class="material-symbols-outlined">fullscreen_exit</span>';
                fullscreenBtn.title = 'Exit Fullscreen';
            } else {
                fullscreenBtn.innerHTML = '<span class="material-symbols-outlined">fullscreen</span>';
                fullscreenBtn.title = 'Fullscreen';
            }
        });
        
        await renderAllPages();
        LoadingManager.hide(loader);
        
        const cleanup = () => {
            // Cleanup zoom timeout
            if (window.zoomTimeout) {
                clearTimeout(window.zoomTimeout);
            }
            // No cleanup needed for data URLs
        };
        window.addEventListener('beforeunload', cleanup);
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.removedNodes.forEach((node) => {
                    if (node === viewerElement) {
                        cleanup();
                        observer.disconnect();
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });

    } catch (error) {
        console.error('Errore durante il caricamento del PDF:', error);
        LoadingManager.hide(loader);
        LoadingManager.showError(viewerElement, `Impossibile caricare il PDF: ${error.message}`);
    }
}

// Auth & User
function handleAuthError() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    // Don't redirect, just clear the data
}

// User Data Management
async function fetchCurrentUserData() {
    const cachedUser = localStorage.getItem('currentUser');
    if (cachedUser) {
        currentUser = JSON.parse(cachedUser);
        return currentUser;
    }
    // If cache is empty, return null (user is not authenticated)
    return null;
}



// URL Parameter Handler
function getFileIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Get specific file ID from URL (for single document view)
function getSpecificFileIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('file');
}

// Check if this is a single document view (without descrizione)
function isSingleDocumentView() {
    const params = new URLSearchParams(window.location.search);
    return params.get('single') === 'true';
}

// Document Data Fetcher - Enhanced to get complete information
async function fetchDocumentData(vetrinaId) {
    try {
        // Use the single comprehensive endpoint that returns vetrina, files, and reviews
        const vetrinaResponse = await makeRequest(`${API_BASE}/vetrine/${vetrinaId}`);
        console.log(`[DEBUG] /vetrine/${vetrinaId} returned:`, JSON.stringify(vetrinaResponse, null, 2));
        
        if (!vetrinaResponse) {
            throw new Error('Could not fetch vetrina data.');
        }

        const vetrinaData = vetrinaResponse.vetrina;
        const vetrinaFiles = vetrinaResponse.files || [];
        const reviewsData = vetrinaResponse.reviews || [];

        // Console log the vetrina_id object and related files for debugging
        console.log('🔍 Vetrina ID Object:', vetrinaData);
        console.log('📁 Related Files Found:', vetrinaFiles);
        console.log('📊 Number of files:', vetrinaFiles.length);

        if (!vetrinaData) {
            throw new Error(`Vetrina with ID ${vetrinaId} not found.`);
        }

        // The rest of the page logic needs a "primary document" object for context.
        // Determine which file to use based on URL parameters or default to first file.
        let primaryDocument;
        if (vetrinaFiles.length > 0) {
            // Check if a specific file is requested via URL parameter
            const specificFileId = getSpecificFileIdFromUrl();
            if (specificFileId) {
                // Find the specific file by ID
                const specificFile = vetrinaFiles.find(file => file.file_id == specificFileId);
                if (specificFile) {
                    primaryDocument = specificFile;
                } else {
                    console.warn(`Requested file ID ${specificFileId} not found in vetrina files, using first file`);
                    primaryDocument = vetrinaFiles[0];
                }
            } else {
                // Use the first file as the primary document context
                primaryDocument = vetrinaFiles[0];
            }
        } else {
            // Create a fallback "document" from vetrina data if no files exist
            primaryDocument = {
                ...vetrinaData,
                id: vetrinaData.id,
                file_id: null,
                original_filename: vetrinaData.name || 'Vetrina',
                vetrina_id: vetrinaData.id
            };
        }

        // Assemble the final data structure that the rest of the page expects.
        return {
            document: primaryDocument,
            vetrina: vetrinaData,
            reviews: reviewsData,
            related: [], // Related documents are not implemented
            vetrinaFiles: vetrinaFiles
        };

    } catch (error) {
        console.error('Failed to fetch vetrina data:', error);
        LoadingManager.showError(document.querySelector('.preview-main'), `Impossibile caricare i dati della vetrina. ${error.message}`);
        throw error;
    }
}

// Premium Document Renderer - Enhanced with VETRINA-level information
function renderDocumentInfo(docData) {
    const { document: fileData, vetrina: vetrinaData, vetrinaFiles } = docData;
    
    // Extract course information from vetrina if available
    const courseInfo = vetrinaData?.course_instance || {};
    
    // Update document title - use individual file name in single document view, otherwise vetrina name
    const isSingleView = isSingleDocumentView();
    let title;
    
    if (isSingleView && fileData) {
        // In single document view, use the document's filename
        title = extractOriginalFilename(fileData.filename) || fileData.filename || 'Documento';
    } else {
        // In normal view, use vetrina name
        title = vetrinaData?.name || 'Vetrina Senza Nome';
    }
    
    const titleElement = document.querySelector('.doc-title');
    if (titleElement) titleElement.textContent = title;
    document.title = `${title} - StudyHub`;

    // Get file count for conditional logic
    const fileCount = vetrinaFiles?.length || 1;
    
    // Get reviews data from docData (reviews are at vetrina level)
    const reviews = docData.reviews || [];
    
    // Initialize reviews overlay with real data
    initializeReviewsOverlay(reviews);
    
    // Update rating and price (use real reviews data for vetrina)
    const totalReviews = reviews.length;
    const rating = totalReviews > 0 
        ? parseFloat((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1))
        : 0.0;
    const reviewCount = totalReviews;
    
    // Use the vetrina's own price instead of calculating from files
    const totalPrice = vetrinaData?.price || 0;

    const starsContainer = document.querySelector('.rating-stars');
    if(starsContainer) starsContainer.innerHTML = generateFractionalStars(rating);
    
    const ratingScore = document.querySelector('.rating-score');
    if(ratingScore) ratingScore.textContent = rating.toFixed(1);

    const ratingCount = document.querySelector('.rating-count');
    if(ratingCount) ratingCount.textContent = `(${reviewCount})`;
    
    // Update the rating badge data attributes for the reviews system
    const ratingBadge = document.querySelector('.doc-rating-display[data-action="open-reviews"]');
    if (ratingBadge) {
        ratingBadge.setAttribute('data-rating', rating.toString());
        ratingBadge.setAttribute('data-review-count', reviewCount.toString());
        
        // Ensure stars are visible in the rating badge
        const badgeStarsContainer = ratingBadge.querySelector('.rating-stars');
        if (badgeStarsContainer) {
            badgeStarsContainer.innerHTML = generateFractionalStars(rating);
        }
        
        console.log('Updated rating badge data attributes:', {
            rating: rating,
            reviewCount: reviewCount,
            vetrinaId: ratingBadge.getAttribute('data-vetrina-id')
        });
    }

    const priceElement = document.querySelector('.price-value');
    if (priceElement) {
        if (totalPrice === 0) {
            priceElement.textContent = 'Gratuito';
            priceElement.classList.remove('paid');
        } else {
            priceElement.textContent = `€${totalPrice.toFixed(2)}`;
            priceElement.classList.add('paid');
        }
    }
    
    // Update document type tag - use individual document tag in single view
    const docTypeTag = document.querySelector('.doc-type-tag');
    if (docTypeTag) {
        if (isSingleView && fileData) {
            // In single document view, use the individual document's tag
            const fileTag = fileData.tag;
            const displayTag = fileTag ? getDocumentTypeFromTag(fileTag) : 'Documento';
            docTypeTag.textContent = displayTag;
        } else {
            // For multi-file vetrine or normal view, use existing logic
            const fileCount = vetrinaFiles?.length || 1;
            if (fileCount === 1) {
                const fileTag = fileData.tag;
                const displayTag = fileTag ? getDocumentTypeFromTag(fileTag) : 'Documento';
                docTypeTag.textContent = displayTag;
            }
            // For multi-file vetrine, the tags will be handled by generateVetrinaDocumentTags in the list view
        }
    }
    
    // Update all details with VETRINA-level information in the specified order
    updateDetailValue('Facoltà', courseInfo.faculty_name || 'Non specificata');
    updateDetailValue('Corso', courseInfo.course_name || 'Non specificato');
    updateDetailValue('Lingua', courseInfo.language || 'Non specificata');
    
    // Handle canale display - show "Unico" if canale is "0"
    const canaleValue = courseInfo.canale === "0" ? "Unico" : (courseInfo.canale || 'Non specificato');
    updateDetailValue('Canale', canaleValue);
    
    updateDetailValue('Anno Accademico', getAcademicYear(courseInfo));
    
    // Add "Pagine" field for single document view or single-file vetrine
    if (isSingleView && fileData) {
        // In single document view, use the individual document's page count
        const pageCount = fileData.num_pages && fileData.num_pages > 0 ? fileData.num_pages : 'N/A';
        updateDetailValue('Pagine', pageCount);
    } else if (fileCount === 1) {
        // For single-file vetrine, use the file's page count
        const pageCount = fileData.num_pages && fileData.num_pages > 0 ? fileData.num_pages : 'N/A';
        updateDetailValue('Pagine', pageCount);
    }
    // For multi-file vetrine, we don't show any additional fields (no "File" count)

    // Update description - use vetrina description
    let description = vetrinaData?.description;
    if (!description) {
        const courseName = courseInfo.course_name || 'questo corso';
        description = `Raccolta di materiali didattici per ${courseName}. ${fileCount} ${fileCount === 1 ? 'file' : 'file'} inclusi.`;
    }
    
    const descriptionContainer = document.querySelector('.doc-description');
    if(descriptionContainer) {
        descriptionContainer.innerHTML = `<p>${description}</p>`;
    }
    
    // Set up action buttons with vetrina data
    setupActionButtons(fileData, vetrinaData);
    
    // Render related documents with professional placeholders
    renderRelatedDocuments(docData.related);
}

// Helper function to update detail values
function updateDetailValue(label, value) {
    const detailItems = document.querySelectorAll('.doc-details .detail-item-vertical');
    detailItems.forEach(item => {
        const labelElement = item.querySelector('.detail-label');
        if (labelElement && labelElement.textContent === label) {
            const valueElement = item.querySelector('.detail-value');
            if (valueElement) {
                valueElement.textContent = value;
            }
        }
    });
}

// Extract original filename from UUID-based filename
function extractOriginalFilename(uuidFilename) {
    if (!uuidFilename) return '';
    
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 characters with 4 dashes)
    // Full format: {uuid}-{user_id}-{original_filename}
    // So we need to find the pattern: 36 chars + dash + user_id + dash + original_filename
    
    // Find the UUID pattern (8-4-4-4-12 format)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = uuidFilename.match(uuidPattern);
    
    if (match) {
        // Remove the UUID part and the first dash
        const afterUuid = uuidFilename.substring(match[0].length + 1);
        // Find the next dash (user_id separator)
        const userDashIndex = afterUuid.indexOf('-');
        if (userDashIndex !== -1) {
            // Return everything after the user_id
            return afterUuid.substring(userDashIndex + 1);
        }
    }
    
    // Fallback: return the original filename if it doesn't match the expected pattern
    return uuidFilename;
}

// Get document type from tag
function getDocumentTypeFromTag(tag) {
    const tagMap = {
        'dispense': 'Dispense',
        'appunti': 'Appunti',
        'esercizi': 'Esercizi',
        'formulario': 'Formulario',
        'progetto': 'Progetto'
    };
    return tagMap[tag] || 'Documento';
}

// Get document type from filename
function getDocumentTypeFromFilename(filename) {
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('appunti') || lowerFilename.includes('notes')) {
        return 'Appunti';
    } else if (lowerFilename.includes('esercizi') || lowerFilename.includes('exercise')) {
        return 'Esercizi';
    } else if (lowerFilename.includes('slides') || lowerFilename.includes('presentazione')) {
        return 'Slides';
    } else if (lowerFilename.includes('libro') || lowerFilename.includes('book')) {
        return 'Libro';
    } else if (lowerFilename.includes('riassunto') || lowerFilename.includes('summary')) {
        return 'Riassunto';
    } else if (lowerFilename.includes('formula') || lowerFilename.includes('cheat')) {
        return 'Formulario';
    } else if (lowerFilename.includes('esame') || lowerFilename.includes('exam')) {
        return 'Esame';
    } else {
        return 'Documento';
    }
}

// Get academic year from course info
function getAcademicYear(courseInfo) {
    if (courseInfo.date_year) {
        const year = courseInfo.date_year;
        return `${year}/${year + 1}`;
    }
    return 'Non specificato';
}

// Generate multiple document type tags from vetrina files
function generateVetrinaDocumentTags(vetrinaFiles) {
    if (!vetrinaFiles || vetrinaFiles.length === 0) {
        return '<div class="doc-type-tag">Documento</div>';
    }
    
    // Extract unique document types from all files using the actual tag field
    const documentTypes = new Set();
    vetrinaFiles.forEach(file => {
        // Use the actual tag field from the backend, fallback to filename analysis if not available
        if (file.tag) {
            const displayTag = getDocumentTypeFromTag(file.tag);
            documentTypes.add(displayTag);
        } else {
            // Fallback to filename analysis only if tag is not available
            const fileType = getDocumentTypeFromFilename(file.filename || file.original_filename);
            documentTypes.add(fileType);
        }
    });
    
    // Convert to array and sort for consistent display
    const uniqueTypes = Array.from(documentTypes).sort();
    
    // Generate HTML for multiple tags
    if (uniqueTypes.length === 1) {
        return `<div class="doc-type-tag">${uniqueTypes[0]}</div>`;
                } else {
        // Wrap multiple tags in a container to group them together
        const tagsHTML = uniqueTypes.map(type => `<div class="doc-type-tag">${type}</div>`).join('');
        return `<div class="doc-type-tags-container">${tagsHTML}</div>`;
    }
}

function getFileExtension(filename) {
    if (!filename || !filename.includes('.')) return 'DOC';
    const parts = filename.split('.');
    if (parts.length === 1) return 'DOC';
    const extension = parts.pop();
    return extension ? extension.toUpperCase() : 'DOC';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatRelativeDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays} giorni fa`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} mesi fa`;
    return `${Math.floor(diffDays / 365)} anni fa`;
}

function formatDate(dateString) {
    if (!dateString) return 'Data non disponibile';
    return new Date(dateString).toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
    });
}

// Utility Functions
function generateStars(rating) {
    return Array.from({ length: 5 }, (_, i) => 
        `<span class="star ${i < Math.round(rating) ? 'filled' : ''}">★</span>`
    ).join('');
}

function generateFractionalStars(rating) {
    const ratingPercentage = (rating / 5) * 100;
    return `
        <div class="stars-outer">
            <div class="stars-inner" style="width: ${ratingPercentage}%"></div>
        </div>
    `;
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

// Reading Position Management
function saveReadingPosition() {
    if (currentDocument) {
        const fileId = currentDocument.file_id;
        localStorage.setItem(`file-${fileId}-zoom`, pdfZoom);
    }
}

function loadReadingPosition() {
    if (currentDocument) {
        const fileId = currentDocument.file_id;
        const savedZoom = localStorage.getItem(`file-${fileId}-zoom`);
        
        if (savedZoom) {
            const zoomValue = parseFloat(savedZoom);
            if (!isNaN(zoomValue)) {
                pdfZoom = zoomValue;
                updateZoomDisplay();
            }
        }
    }
}

// Enhanced Action Buttons Setup with VETRINA-level handling
function setupActionButtons(fileData, vetrinaData = null) {
    const purchaseBtn = document.getElementById('purchaseBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const shareBtn = document.getElementById('shareBtn');

    if (!vetrinaData) return;

    // Use the vetrina's own price instead of calculating from files
    const totalPrice = vetrinaData?.price || 0;
    const isFree = totalPrice === 0;

    // Purchase button logic for VETRINA (download functionality removed)
    if (isFree) {
        // For free vetrine: show primary button as view bundle
        if (purchaseBtn) {
            purchaseBtn.innerHTML = `
                <span class="material-symbols-outlined">visibility</span>
                Visualizza
            `;
            purchaseBtn.onclick = () => console.log('Funzionalità di visualizzazione bundle in sviluppo', 'info');
        }
        // Hide secondary download button for free vetrine
        if (downloadBtn) {
            downloadBtn.style.display = 'none';
        }
    } else {
        // For paid vetrine: show primary as purchase bundle
        if (purchaseBtn) {
            purchaseBtn.innerHTML = `Acquista Ora`;
            purchaseBtn.onclick = () => handleVetrinaPurchase(vetrinaData.vetrina_id || vetrinaData.id, totalPrice);
        }
        // Hide secondary download button (download functionality removed)
        if (downloadBtn) {
            downloadBtn.style.display = 'none';
        }
    }

    // Setup favorite button with vetrina-level state
    if (favoriteBtn) {
        const isVetrinaFavorited = vetrinaData.favorite === true;
        
        if (isVetrinaFavorited) {
            favoriteBtn.classList.add('active');
            favoriteBtn.title = 'Rimuovi dai Preferiti';
        } else {
            favoriteBtn.classList.remove('active');
            favoriteBtn.title = 'Aggiungi ai Preferiti';
        }
        favoriteBtn.onclick = handleFavorite;
    }

    // Setup share button for vetrina
    if (shareBtn) shareBtn.onclick = handleShare;
    
    // Setup cart button for vetrina
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.onclick = handleAddToCart;
        // Hide cart button for free vetrine
        if (isFree) {
            addToCartBtn.style.display = 'none';
        }
    }
}

// Enhanced Vetrina Purchase Handler
function handleVetrinaPurchase(vetrinaId, totalPrice) {
    if (!vetrinaId) {
        console.log('Errore: ID vetrina non trovato', 'error');
        return;
    }
    
    const purchaseBtn = document.getElementById('purchaseBtn');
    
    if (totalPrice === 0) {
        // Free vetrina - show view notification (download functionality removed)
        console.log('Funzionalità di visualizzazione bundle in sviluppo', 'info');
    } else {
        // Paid vetrina - show purchase confirmation
        if (confirm(`Confermi l'acquisto di questa vetrina per €${totalPrice?.toFixed(2) || 'N/A'}?`)) {
            // Optimistically update UI
            if (purchaseBtn) {
                purchaseBtn.classList.add('purchased');
                purchaseBtn.innerHTML = 'Acquisto Completato';
                purchaseBtn.disabled = true;
            }
            
            // Show success notification
            console.log('Acquisto vetrina completato con successo!', 'success');
            
            // In a real implementation, this would redirect to payment processor
            // window.location.href = `payment.html?vetrina=${vetrinaId}&price=${totalPrice}`;
            
            // Reset button after animation (in real app, this would happen after payment confirmation)
            setTimeout(() => {
                if (purchaseBtn) {
                    purchaseBtn.classList.remove('purchased');
                    purchaseBtn.innerHTML = 'Acquista Bundle';
                    purchaseBtn.disabled = false;
                }
            }, 3000);
        }
    }
}

// Download functionality removed - Bundles are view-only




// Keyboard Navigation
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.key) {
            case '+':
            case '=':
                e.preventDefault();
                adjustZoom(ZOOM_CONFIG.step);
                break;
            case '-':
                e.preventDefault();
                adjustZoom(-ZOOM_CONFIG.step);
                break;
        }
    });
}

// Touch/Swipe Navigation
function initializeTouchNavigation() {
    let touchStartX = 0;
    let touchEndX = 0;
    
    const documentViewer = document.getElementById('documentViewer');
    if (!documentViewer) return;
    
    documentViewer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    documentViewer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        // Swipe navigation removed for PDF viewer - PDF has its own navigation
    }
}

// Professional File Switcher Dropdown and controls
function renderViewerLeftControls(files, currentFileId) {
    let fileSwitcherHtml = '';
    if (files && files.length > 1) {
        const options = files.map(file => {
            const selected = file.file_id === currentFileId ? 'selected' : '';
            const fileName = file.original_filename || file.filename || `File ${file.file_id}`;
            return `<option value="${file.file_id}" ${selected}>${fileName}</option>`;
        }).join('');

        fileSwitcherHtml = `
            <div class="custom-select-wrapper">
                <select id="file-switcher" class="file-switcher-select" title="Switch between files in this collection">
                    ${options}
                </select>
                <span class="material-symbols-outlined select-arrow">unfold_more</span>
            </div>
        `;
    }

    return `
        <div class="viewer-left-controls">
            ${fileSwitcherHtml}
        </div>
    `;
}

// Main Initialization
async function initializeDocumentPreview() {
    // Initialize CSP-compliant event handlers
    handleActionCallbackButtons();

    const user = await fetchCurrentUserData();
    if(user) {
        // Initialize header component with user data
        if (typeof initializeUserInfo === 'function') {
            initializeUserInfo();
        }
    }
    
    const vetrinaId = getFileIdFromUrl();
    if (!vetrinaId) return;

    const mainContainer = document.querySelector('.preview-main');
    const existingLoader = mainContainer.querySelector('.document-preview-loader');

    try {
        // Fetch user and document data in parallel for faster loading
        const [userData, docData] = await Promise.all([
            fetchCurrentUserData(),
            fetchDocumentData(vetrinaId)
        ]);

        currentUser = userData; // Store for review comparisons
        // Initialize header component with user data
        if (typeof initializeUserInfo === 'function') {
            initializeUserInfo();
        }

        if (!docData) {
            throw new Error('Impossibile caricare i dati del documento.');
        }

        currentDocument = docData.document;
        currentVetrina = docData.vetrina;
        currentVetrinaFiles = docData.vetrinaFiles || [];
        documentData = docData; // Store for toggling

        // Debug logging removed

        // Check viewing mode and file count
        const hasMultipleFiles = currentVetrinaFiles.length > 1;
        const isSingleView = isSingleDocumentView();
        const specificFileId = getSpecificFileIdFromUrl();
        
        if (isSingleView && specificFileId) {
            // Show single document viewer without descrizione section
            renderSingleDocumentView(docData, specificFileId);
        } else if (hasMultipleFiles) {
            // Show document list instead of viewer for multiple files
            renderDocumentListView(docData);
        } else {
            // Show normal document viewer for single files
            renderDocumentViewerMode(docData);
        }

    } catch (error) {
        console.error('Error loading document:', error);
        
        // Check if it's a 404 error (file not found)
        if (error.message.includes('404') || error.message.includes('not found')) {
            mainContainer.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">📄</div>
                    <h2>Documento non trovato</h2>
                    <p>Il documento richiesto (ID: ${vetrinaId}) non è più disponibile.</p>
                    <p>Probabilmente è stato aggiornato o rimosso dal database.</p>
                    <div class="error-actions">
                        <button class="retry-btn primary" data-action="navigate" data-url="document-preview.html?id=117">
                            <span class="material-symbols-outlined">visibility</span>
                            Visualizza un documento di esempio
                        </button>
                        <button class="retry-btn secondary" data-action="navigate" data-url="search.html">
                            <span class="material-symbols-outlined">search</span>
                            Torna alla ricerca
                        </button>
                    </div>
                </div>
            `;
        } else {
            LoadingManager.showError(
                mainContainer,
                'Impossibile caricare il documento. Verifica la tua connessione e riprova.',
                'Riprova',
                'initializeDocumentPreview'
            );
        }
    }
}

// New function to render document list view for multiple files
function renderDocumentListView(docData) {
    const mainContainer = document.querySelector('.preview-main');
    const { vetrinaFiles } = docData;
    
    // Generate documents list HTML
    const documentsListHTML = vetrinaFiles.map((file, index) => {
        // Extract the original filename from the UUID-based filename
        const displayFilename = extractOriginalFilename(file.filename);
        const fileType = file.tag ? getDocumentTypeFromTag(file.tag) : getDocumentTypeFromFilename(displayFilename);
        const fileExtension = getFileExtension(displayFilename);
        const documentIcon = getDocumentPreviewIcon(displayFilename);
        const fileSize = file.size ? formatFileSize(file.size) : null;
        const uploadDate = file.created_at ? formatRelativeDate(file.created_at) : null;
        
        // Generate star rating for file reviews
        const rating = file.average_rating || 0;
        const reviewCount = file.reviews_count || 0;
        const stars = generateFractionalStars(rating);
        
        return `
            <div class="document-list-item" data-file-id="${file.file_id}" data-action="view-single-document" data-action-file-id="${file.file_id}">
                <div class="document-list-preview">
                    <div class="document-list-thumbnail">
                        <div class="document-thumbnail-icon">
                            <span class="document-icon">${documentIcon}</span>
                        </div>
                        <div class="preview-overlay-hint">
                            <span class="material-symbols-outlined">visibility</span>
                            <span class="preview-text">Anteprima</span>
                        </div>
                        <div class="document-format-indicator">${fileExtension.toUpperCase()}</div>
                    </div>
                </div>
                <div class="document-list-content">
                    <div class="document-content-header">
                        <div class="document-type-badge-search-style">${fileType}</div>
                        <div class="document-title-section">
                            <h3 class="document-list-title">${file.display_name || displayFilename}</h3>
                            <div class="document-list-description">${file.description || 'Nessuna descrizione disponibile'}</div>
                        </div>
                    </div>
                    
                    <!-- Reviews Button and Document Stats -->
                    <div class="document-list-reviews-and-stats">
                        <div class="document-list-reviews-button">
                            <div class="doc-rating-display" 
                                 data-action="open-file-reviews" 
                                 data-file-id="${file.file_id}" 
                                 data-rating="${rating}" 
                                 data-review-count="${reviewCount}" 
                                 title="Mostra recensioni documento">
                                <div class="rating-stars">${stars}</div>
                                <div class="rating-details">
                                    <span class="rating-score">${rating.toFixed(1)}</span>
                                    <span class="rating-count">(${reviewCount})</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="document-stats">
                            ${file.num_pages > 0 ? `
                            <div class="stat-item">
                                <span class="material-symbols-outlined">description</span>
                                <span class="stat-value">${file.num_pages} ${file.num_pages === 1 ? 'pagina' : 'pagine'}</span>
                            </div>
                            ` : ''}
                            ${fileSize ? `
                            <div class="stat-item">
                                <span class="material-symbols-outlined">storage</span>
                                <span class="stat-value">${fileSize}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Replace the entire main container content with the document list structure
    mainContainer.innerHTML = `
        <div class="document-list-section">
            <div class="document-list-header-section">
                <div class="document-list-title-container">
                    <h1 class="document-list-main-title">${currentVetrina?.name || 'Vetrina Documenti'}</h1>
                    <div class="document-list-meta-info">
                        <span class="document-list-count">${vetrinaFiles.length} documenti</span>
                        <span class="document-list-separator">•</span>
                        <span class="document-list-total-size">${formatFileSize(vetrinaFiles.reduce((sum, f) => sum + (f.size || 0), 0))}</span>
                    </div>
                </div>
                <div class="document-list-header-actions">
                    <!-- Download functionality removed -->
                </div>
            </div>
            
            <div class="document-list-container">
                ${documentsListHTML}
            </div>
        </div>
        
        <div class="document-info-sidebar">
            <div class="doc-info-content">
                <!-- Main Info & CTA -->
                <div class="doc-main-info">
                    <div class="doc-header-actions">
                        ${generateVetrinaDocumentTags(vetrinaFiles)}
                        <div class="doc-header-buttons">
                            <button class="action-btn secondary" id="favoriteBtn" title="Aggiungi ai Preferiti">
                                <span class="material-symbols-outlined">favorite</span>
                            </button>
                            <button class="action-btn secondary" id="shareBtn" title="Condividi">
                                <span class="material-symbols-outlined">share</span>
                            </button>
                        </div>
                    </div>
                    <div class="doc-title-container">
                        <h1 class="doc-title">${currentVetrina?.name || 'Vetrina Documenti'}</h1>
                    </div>
                                            <div class="doc-meta-header">
                            <div class="doc-rating-display" data-action="open-reviews" data-vetrina-id="${currentVetrina?.id || currentVetrina?.vetrina_id}" title="Mostra recensioni">
                                <div class="rating-stars"></div>
                                <div class="rating-details">
                                    <span class="rating-score">0.0</span>
                                    <span class="rating-count">(0)</span>
                                </div>
                            </div>
                            <div class="doc-price">
                                <span class="price-value">€0.00</span>
                            </div>
                        </div>
                    </div>

                    <!-- Author Profile Section -->
                    ${generateAuthorProfile(currentVetrina)}

                    <!-- Premium Action Buttons -->
                    <div class="doc-actions">
                        <button class="action-btn cart" id="addToCartBtn">
                            Aggiungi al Carrello
                        </button>
                        <button class="action-btn primary" id="purchaseBtn">
                            Acquista Bundle
                        </button>
                        <!-- Download functionality removed -->
                    </div>

                    <!-- Document Description Section -->
                    <div class="doc-description-section">
                        <h3>
                            <span class="material-symbols-outlined">description</span>
                            Descrizione
                        </h3>
                        <div class="doc-description">
                            <p>${currentVetrina?.description || 'Raccolta di documenti di studio.'}</p>
                        </div>
                    </div>

                    <!-- Document Details Section -->
                    <div class="doc-details-section">
                        <h3>
                            <span class="material-symbols-outlined">info</span>
                            Dettagli Bundle
                        </h3>
                        <div class="doc-details">
                            <div class="detail-item-vertical">
                                <span class="detail-label">Facoltà</span>
                                <span class="detail-value">${currentVetrina?.course_instance?.faculty_name || 'Non specificata'}</span>
                            </div>
                            <div class="detail-item-vertical">
                                <span class="detail-label">Corso</span>
                                <span class="detail-value">${currentVetrina?.course_instance?.course_name || 'Non specificato'}</span>
                            </div>
                            <div class="detail-item-vertical">
                                <span class="detail-label">Lingua</span>
                                <span class="detail-value">${currentVetrina?.course_instance?.language || 'Non specificata'}</span>
                            </div>
                            <div class="detail-item-vertical">
                                <span class="detail-label">Canale</span>
                                <span class="detail-value">${currentVetrina?.course_instance?.canale === "0" ? "Unico" : (currentVetrina?.course_instance?.canale || 'Non specificato')}</span>
                            </div>
                            <div class="detail-item-vertical">
                                <span class="detail-label">Anno Accademico</span>
                                <span class="detail-value">${currentVetrina?.course_instance?.date_year ? `${currentVetrina.course_instance.date_year}/${currentVetrina.course_instance.date_year + 1}` : 'Non specificato'}</span>
                            </div>
                        </div>
                    </div>

                <!-- Related Documents Section -->
                <div class="related-docs-section">
                    <div class="related-docs">
                        <!-- Content will be populated by renderRelatedDocuments -->
                    </div>
                </div>
            </div>
        </div>
        
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
                        <button class="add-review-btn" data-action="show-review-form" style="display: none;">
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
    `;
    
    // Now render the content into the newly created structure
    renderDocumentInfo(docData);
    
    // Setup action buttons for the vetrina
    setupActionButtons(currentDocument, currentVetrina);
    
    // Setup document preview functionality
    setupDocumentPreview();
}

// New function to render single document view without descrizione section
function renderSingleDocumentView(docData, fileId) {
    const mainContainer = document.querySelector('.preview-main');
    const vetrinaFiles = docData.vetrinaFiles || [];
    
    // Find the specific file
    const specificFile = vetrinaFiles.find(f => f.file_id == fileId);
    if (!specificFile) {
        console.error(`File with ID ${fileId} not found in vetrina files`);
        return;
    }
    
    // Store current document for bundle navigation
    currentDocument = specificFile;
    currentVetrinaFiles = vetrinaFiles;
    
    // Create a modified docData with the specific file as current document
    const singleDocData = {
        ...docData,
        document: specificFile
    };
    
    const viewerLeftControlsHTML = renderViewerLeftControls(vetrinaFiles, fileId);
        
    // Replace the entire main container content with single document viewer (no descrizione)
    mainContainer.innerHTML = `
        <div class="document-viewer-section">
            <div class="document-viewer" id="documentViewer">
            <div class="pdf-loading">
                <div class="loader-spinner"></div>
                <p>Caricamento documento...</p>
                </div>
            </div>

            <!-- New Bottom Elements -->
            <div class="viewer-bottom-overlay">
                <span class="bottom-page-indicator" id="bottomPageIndicator"></span>
                <div class="file-format-badge" id="fileFormatBadge"></div>
            </div>
        </div>
        
        <div class="document-info-sidebar" style="margin-left: 32px;">
            <div class="doc-info-content">
                <!-- Main Info & CTA -->
                <div class="doc-main-info">
                    <div class="doc-header-actions">
                        <div class="doc-type-tag">Caricamento...</div>
                        <div class="doc-header-buttons">
                        <button class="action-btn secondary" id="favoriteBtn" title="Aggiungi ai Preferiti">
                            <span class="material-symbols-outlined">favorite</span>
                        </button>
                        <button class="action-btn secondary" id="shareBtn" title="Condividi">
                            <span class="material-symbols-outlined">share</span>
                        </button>
                        </div>
                    </div>
                    <div class="doc-title-container">
                        <h1 class="doc-title">Caricamento...</h1>
                    </div>
                    <div class="doc-meta-header">
                        <div class="doc-rating-display" data-action="open-reviews" data-vetrina-id="${currentVetrina?.id || currentVetrina?.vetrina_id}" title="Mostra recensioni">
                            <div class="rating-stars"></div>
                            <div class="rating-details">
                                <span class="rating-score">0.0</span>
                                <span class="rating-count">(0)</span>
                            </div>
                        </div>
                        <div class="doc-price">
                            <span class="price-value">€0.00</span>
                        </div>
                    </div>
                </div>

                <!-- Author Profile Section -->
                ${generateAuthorProfile(currentVetrina)}

                <!-- Premium Action Buttons -->
                <div class="doc-actions">
                    <button class="action-btn cart" id="addToCartBtn">
                        Aggiungi al Carrello
                    </button>
                    <button class="action-btn primary" id="purchaseBtn">
                        Acquista Ora
                    </button>
                    <!-- Download functionality removed -->
                </div>

                <!-- Document Details Section (no descrizione) -->
                <div class="doc-details-section">
                    <h3>
                        <span class="material-symbols-outlined">info</span>
                        Dettagli Documento
                    </h3>
                    <div class="doc-details">
                        <div class="detail-item-vertical">
                            <span class="detail-label">Facoltà</span>
                            <span class="detail-value">Caricamento...</span>
                        </div>
                        <div class="detail-item-vertical">
                            <span class="detail-label">Corso</span>
                            <span class="detail-value">Caricamento...</span>
                        </div>
                        <div class="detail-item-vertical">
                            <span class="detail-label">Lingua</span>
                            <span class="detail-value">Caricamento...</span>
                        </div>
                        <div class="detail-item-vertical">
                            <span class="detail-label">Canale</span>
                            <span class="detail-value">Caricamento...</span>
                        </div>
                        <div class="detail-item-vertical">
                            <span class="detail-label">Anno Accademico</span>
                            <span class="detail-value">Caricamento...</span>
                        </div>
                        <div class="detail-item-vertical">
                            <span class="detail-label">Pagine</span>
                            <span class="detail-value">Caricamento...</span>
                        </div>
                    </div>
                </div>

                <!-- Related Documents Section -->
                <div class="related-docs-section">
                    <div class="related-docs">
                        <!-- Content will be populated by renderRelatedDocuments -->
                    </div>
                </div>
            </div>
        </div>
        
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
                                <div class="rating-stars" id="overlayRatingStars"></div>
                                <div class="rating-number" id="overlayRatingNumber">0.0</div>
                            </div>
                            <div class="rating-breakdown" id="ratingBreakdown">
                                <!-- Populated by renderRatingBreakdown -->
                            </div>
                        </div>
                    </div>
                    
                    <div class="add-review-section" id="addReviewSection">
                        <!-- Populated by renderAddReviewSection -->
                    </div>
                    
                    <div class="reviews-list" id="reviewsList">
                        <!-- Populated by renderReviewsList -->
                    </div>
                </div>
            </div>
        </div>
        
    `;

    // Initialize document data with the specific file
    currentDocument = specificFile;
    
    // Now render the content into the newly created structure
    renderDocumentInfo(singleDocData);
    
    // Load the redacted PDF for the current document
    console.log('About to load PDF for currentDocument:', currentDocument);
    if (currentDocument && currentDocument.file_id) {
        console.log('Loading PDF with file_id:', currentDocument.file_id);
        loadRedactedPdf(currentDocument.file_id, 'documentViewer');
    } else {
        console.log('No file_id found in currentDocument (vetrina has no files):', currentDocument);
        // Show message that this vetrina has no associated files
        const documentViewer = document.getElementById('documentViewer');
        if (documentViewer) {
            documentViewer.innerHTML = `
                <div class="no-files-message">
                    <p>Questa vetrina non contiene file visualizzabili.</p>
                </div>
            `;
        }
    }
}


// Function to return to bundle view
function returnToBundle() {
    const vetrinaId = currentVetrina?.id || currentVetrina?.vetrina_id;
    if (vetrinaId) {
        window.location.href = `document-preview.html?id=${vetrinaId}`;
    }
}

// Function to navigate to a specific document in the bundle
function navigateToDocument(fileId) {
    const vetrinaId = currentVetrina?.id || currentVetrina?.vetrina_id;
    if (vetrinaId && fileId) {
        const params = new URLSearchParams({
            id: vetrinaId,
            file: fileId,
            single: 'true'
        });
        window.location.href = `document-preview.html?${params.toString()}`;
    }
}


// New function to handle normal single-file viewer mode
function renderDocumentViewerMode(docData) {
    const mainContainer = document.querySelector('.preview-main');
        const vetrinaFiles = docData.vetrinaFiles || [];
    const currentDocument = docData.document;

    const viewerLeftControlsHTML = renderViewerLeftControls(vetrinaFiles, currentDocument.file_id || null);
        
        // Replace the entire main container content with the document viewer structure
        mainContainer.innerHTML = `
            <div class="document-viewer-section">
                <div class="document-viewer" id="documentViewer">
                <div class="pdf-loading">
                    <div class="loader-spinner"></div>
                    <p>Caricamento documento...</p>
                    </div>
                </div>

                <!-- New Bottom Elements -->
                <div class="viewer-bottom-overlay">
                    <span class="bottom-page-indicator" id="bottomPageIndicator"></span>
                    <div class="file-format-badge" id="fileFormatBadge"></div>
                </div>
            </div>
            
            <div class="document-info-sidebar" style="margin-left: 32px;">
                <div class="doc-info-content">
                    <!-- Main Info & CTA -->
                    <div class="doc-main-info">
                        <div class="doc-header-actions">
                            <div class="doc-type-tag">Caricamento...</div>
                            <div class="doc-header-buttons">
                            <button class="action-btn secondary" id="favoriteBtn" title="Aggiungi ai Preferiti">
                                <span class="material-symbols-outlined">favorite</span>
                            </button>
                            <button class="action-btn secondary" id="shareBtn" title="Condividi">
                                <span class="material-symbols-outlined">share</span>
                            </button>
                            </div>
                        </div>
                        <div class="doc-title-container">
                            <h1 class="doc-title">Caricamento...</h1>
                        </div>
                        <div class="doc-meta-header">
                            <div class="doc-rating-display" data-action="open-reviews" data-vetrina-id="${currentVetrina?.id || currentVetrina?.vetrina_id}" title="Mostra recensioni">
                                <div class="rating-stars"></div>
                                <div class="rating-details">
                                    <span class="rating-score">0.0</span>
                                    <span class="rating-count">(0)</span>
                                </div>
                            </div>
                            <div class="doc-price">
                                <span class="price-value">€0.00</span>
                            </div>
                        </div>
                    </div>

                    <!-- Author Profile Section -->
                    ${generateAuthorProfile(currentVetrina)}

                    <!-- Premium Action Buttons -->
                    <div class="doc-actions">
                        <button class="action-btn cart" id="addToCartBtn">
                            Aggiungi al Carrello
                        </button>
                        <button class="action-btn primary" id="purchaseBtn">
                            Acquista Ora
                        </button>
                        <!-- Download functionality removed -->
                    </div>

                    <!-- Document Description Section -->
                    <div class="doc-description-section">
                        <h3>
                            <span class="material-symbols-outlined">description</span>
                            Descrizione
                        </h3>
                        <div class="doc-description">
                            <p>Caricamento descrizione...</p>
                        </div>
                    </div>

                    <!-- Document Details Section -->
                    <div class="doc-details-section">
                        <h3>
                            <span class="material-symbols-outlined">info</span>
                            Dettagli Documento
                        </h3>
                        <div class="doc-details">
                            <div class="detail-item-vertical">
                                <span class="detail-label">Facoltà</span>
                                <span class="detail-value">Caricamento...</span>
                            </div>
                            <div class="detail-item-vertical">
                                <span class="detail-label">Corso</span>
                                <span class="detail-value">Caricamento...</span>
                            </div>
                            <div class="detail-item-vertical">
                                <span class="detail-label">Lingua</span>
                                <span class="detail-value">Caricamento...</span>
                            </div>
                            <div class="detail-item-vertical">
                                <span class="detail-label">Canale</span>
                                <span class="detail-value">Caricamento...</span>
                            </div>
                            <div class="detail-item-vertical">
                                <span class="detail-label">Anno Accademico</span>
                                <span class="detail-value">Caricamento...</span>
                            </div>
                            <div class="detail-item-vertical">
                                <span class="detail-label">Pagine</span>
                                <span class="detail-value">Caricamento...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Related Documents Section -->
                    <div class="related-docs-section">
                        <div class="related-docs">
                            <!-- Content will be populated by renderRelatedDocuments -->
                        </div>
                    </div>
                </div>
            </div>
            
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
                            <button class="add-review-btn" data-action="show-review-form" style="display: none;">
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
        `;
        
        // Now render the content into the newly created structure
        renderDocumentInfo(docData);
        
        // Load the redacted PDF for the current document
        console.log('About to load PDF for currentDocument:', currentDocument);
        if (currentDocument && currentDocument.file_id) {
            console.log('Loading PDF with file_id:', currentDocument.file_id);
            loadRedactedPdf(currentDocument.file_id, 'documentViewer');
        } else {
            console.log('No file_id found in currentDocument (vetrina has no files):', currentDocument);
            // Show message that this vetrina has no associated files
            const documentViewer = document.getElementById('documentViewer');
            if (documentViewer) {
                documentViewer.innerHTML = '<div class="no-files-message">Questa vetrina non ha file associati.</div>';
            }
        }

        // Populate file format badge
        const fileFormatBadge = document.getElementById('fileFormatBadge');
        if (fileFormatBadge && currentDocument) {
            const fileExtension = getFileExtension(currentDocument.original_filename || currentDocument.filename);
            fileFormatBadge.textContent = fileExtension;
        }

        showAndFadeBottomOverlay(); // show on load

        // Initialize controls
        initializeFullscreen();
}

// Function to open a specific document in viewer mode
function openDocumentViewer(fileId) {
    window.location.href = `document-preview.html?id=${fileId}`;
}

// Download functionality removed - Files are view-only

// Helper function to get document preview icon
function getDocumentPreviewIcon(filename) {
    const extension = getFileExtension(filename).toLowerCase();
    const iconMap = {
        pdf: '📄',
        doc: '📝',
        docx: '📝',
        txt: '📄',
        rtf: '📄',
        xls: '📊',
        xlsx: '📊',
        ppt: '📊',
        pptx: '📊',
        jpg: '🖼️',
        jpeg: '🖼️',
        png: '🖼️',
        gif: '🖼️',
        zip: '📦',
        rar: '📦',
        default: '📄'
    };
    return iconMap[extension] || iconMap.default;
}

// Initialize when the page loads
window.onload = initializeDocumentPreview;

function initializeTabs() {
    const tabNav = document.querySelector('.tab-nav');
    if (!tabNav) return;

    const tabLinks = tabNav.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabNav.addEventListener('click', (e) => {
        const targetLink = e.target.closest('.tab-link');
        if (!targetLink) return;

        e.preventDefault();
        const tabId = targetLink.dataset.tab;

        tabLinks.forEach(link => {
            link.classList.toggle('active', link === targetLink);
        });

        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });
    });
}

// Save state when leaving page
window.addEventListener('beforeunload', saveReadingPosition);

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        saveReadingPosition();
    }
});


// ===========================
// REVIEWS OVERLAY FUNCTIONALITY
// ===========================

let currentVetrinaForReviews = null;
let currentReviews = [];
let selectedRating = 0;
let currentUserReview = null;

// Initialize reviews overlay functionality
function initializeReviewsOverlay(reviews = []) {
    // Use provided reviews data if available
    if (reviews && reviews.length > 0) {
        currentReviews = reviews;
    }
    
    const reviewsOverlay = document.getElementById('reviewsOverlay');
    if (reviewsOverlay) {
        reviewsOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'reviewsOverlay') {
                closeReviewsOverlay();
            }
        });
    }

    // Add event listeners for reviews overlay actions
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="open-reviews"]')) {
            const element = e.target.closest('[data-action="open-reviews"]');
            const vetrinaId = element.getAttribute('data-vetrina-id');
            if (vetrinaId) {
                openReviewsOverlay(vetrinaId);
            }
        }
        
        // Preload reviews on hover
        if (e.target.closest('[data-action="open-reviews"]')) {
            const element = e.target.closest('[data-action="open-reviews"]');
            const vetrinaId = element.getAttribute('data-vetrina-id');
            if (vetrinaId) {
                preloadReviewsData(vetrinaId);
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
        
        if (e.target.closest('[data-action="delete-file-review"]')) {
            const fileId = e.target.closest('[data-action="delete-file-review"]').getAttribute('data-file-id');
            deleteFileReview(fileId);
        }
    });

    // Initialize star rating functionality
    initializeStarRating();
}

// Preload reviews data on hover
function preloadReviewsData(vetrinaId) {
    // Only preload if not already cached
    const cacheKey = `${vetrinaId}_${localStorage.getItem('authToken') || 'guest'}`;
    const cachedData = reviewsCache.get(cacheKey);
    
    if (!cachedData || (Date.now() - cachedData.timestamp) >= CACHE_DURATION) {
        // Start loading in background
        loadReviewsForVetrina(vetrinaId).catch(error => {
            console.error('Error preloading reviews:', error);
        });
    }
}

// Open reviews overlay for a specific vetrina
async function openReviewsOverlay(vetrinaId) {
    currentVetrinaForReviews = vetrinaId;
    const overlay = document.getElementById('reviewsOverlay');
    
    if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
        // Clear cache to ensure fresh data
        const cacheKey = `reviews_${vetrinaId}_${localStorage.getItem('authToken') || 'guest'}`;
        reviewsCache.delete(cacheKey);
        console.log('Cleared cache for vetrina:', vetrinaId, 'cacheKey:', cacheKey);
        
        // Show initial rating data instantly from search results
        showInitialRatingData(vetrinaId);
        
        // Load detailed reviews data in background (non-blocking)
        loadReviewsForVetrina(vetrinaId).then(() => {
    updateReviewsOverlay();
        }).catch(error => {
            console.error('Error loading reviews:', error);
            // Keep showing the initial data if API fails
        });
    }
}

// Show initial rating data from search results
function showInitialRatingData(vetrinaId) {
    const reviewsList = document.getElementById('reviewsList');
    const bigRatingScore = document.querySelector('.big-rating-score');
    const totalReviews = document.querySelector('.total-reviews');
    const bigStars = document.querySelector('.big-stars');
    const addReviewBtn = document.querySelector('[data-action="show-review-form"]');

    if (!reviewsList || !bigRatingScore || !totalReviews || !bigStars || !addReviewBtn) return;

    // Find the vetrina data from search results
    const ratingBadge = document.querySelector(`[data-vetrina-id="${vetrinaId}"][data-action="open-reviews"]`);
    if (ratingBadge) {
        // Get rating and review count from dataset attributes
        const rating = parseFloat(ratingBadge.dataset.rating) || 0;
        const reviewCount = parseInt(ratingBadge.dataset.reviewCount) || 0;
            
        // Show initial data instantly
        bigRatingScore.textContent = rating.toFixed(1);
        totalReviews.textContent = `Basato su ${reviewCount} recensioni`;
        bigStars.innerHTML = generateFractionalStars(rating);
        
        // Show a more professional loading state with instant feedback
        reviewsList.innerHTML = `
            <div class="reviews-loading">
                <div class="loading-spinner"></div>
                <p>Aggiornamento recensioni...</p>
            </div>
        `;
        
        // Hide add review button by default - it will be shown later if conditions are met
        addReviewBtn.style.display = 'none';
        return;
    }
    
    // Fallback to loading state if we can't find the data
    showReviewsLoadingState();
}

// Show loading state for reviews
function showReviewsLoadingState() {
    const reviewsList = document.getElementById('reviewsList');
    const bigRatingScore = document.querySelector('.big-rating-score');
    const totalReviews = document.querySelector('.total-reviews');
    const bigStars = document.querySelector('.big-stars');
    const addReviewBtn = document.querySelector('[data-action="show-review-form"]');

    if (!reviewsList || !bigRatingScore || !totalReviews || !bigStars || !addReviewBtn) return;

    // Show loading state
    bigRatingScore.textContent = '...';
    totalReviews.textContent = 'Caricamento...';
    bigStars.innerHTML = '<div class="loading-stars">★★★★★</div>';
    // Keep add review button hidden during loading
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
    const overlay = document.getElementById('reviewsOverlay');
    if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    
        // Reset form
    hideAddReviewForm();
        selectedRating = 0;
        currentUserReview = null;
    }
}

// Cache for reviews data to avoid repeated API calls
const reviewsCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const pendingRequests = new Map(); // Prevent duplicate requests

// Load reviews for a specific vetrina
async function loadReviewsForVetrina(vetrinaId) {
    try {
        // Check cache first
        const cacheKey = `reviews_${vetrinaId}_${localStorage.getItem('authToken') || 'guest'}`;
        const cachedData = reviewsCache.get(cacheKey);
        
        if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
            // Use cached data
            currentReviews = cachedData.reviews || [];
            currentUserReview = cachedData.userReview || null;
            return;
        }
        
        // Check if request is already pending
        if (pendingRequests.has(cacheKey)) {
            // Wait for the pending request to complete
            await pendingRequests.get(cacheKey);
            return;
        }
        
        // Early return if we know there are no reviews (only if we're certain)
        const ratingBadge = document.querySelector(`[data-vetrina-id="${vetrinaId}"][data-action="open-reviews"]`);
        if (ratingBadge) {
            const reviewCount = parseInt(ratingBadge.dataset.reviewCount) || 0;
            const rating = parseFloat(ratingBadge.dataset.rating) || 0;
            
            console.log('DOM data for vetrina:', vetrinaId, 'reviewCount:', reviewCount, 'rating:', rating);
            
            // Only skip API call if both review count AND rating are 0
            if (reviewCount === 0 && rating === 0) {
                // No reviews, set empty data and return early
                currentReviews = [];
                currentUserReview = null;
                reviewsCache.set(cacheKey, {
                    reviews: [],
                    userReview: null,
                    timestamp: Date.now()
                });
                // Update the UI to show empty state
                updateReviewsOverlay();
                return;
            }
        }
        
        const token = localStorage.getItem('authToken');
        
        // Get current user info for debugging
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        
        // Prepare headers - only include what's necessary
        const headers = {};
        
        // Add Authorization header only if token exists
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        // Create promise for this request
        const requestPromise = fetch(`${API_BASE}/vetrine/${vetrinaId}/reviews`, {
            method: 'GET',
            headers: headers,
            signal: controller.signal,
            keepalive: true,
            priority: 'high'
        }).finally(() => {
            // Clean up pending request
            pendingRequests.delete(cacheKey);
            clearTimeout(timeoutId);
        });
        
        // Store the promise to prevent duplicate requests
        pendingRequests.set(cacheKey, requestPromise);
        
        const response = await requestPromise;

        if (response.ok) {
            const data = await response.json();
            currentReviews = data.reviews || [];
            currentUserReview = data.user_review || null;
            
            console.log('Reviews loaded successfully:', {
                vetrinaId,
                reviewsCount: currentReviews.length,
                reviews: currentReviews,
                userReview: currentUserReview
            });
            
            // Cache the successful response
            reviewsCache.set(cacheKey, {
                reviews: currentReviews,
                userReview: currentUserReview,
                timestamp: Date.now()
            });
            
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
        
        if (error.name === 'AbortError') {
            console.error('Request timed out');
        }
        
        currentReviews = [];
        currentUserReview = null;
    }
}

// Update the reviews overlay content
function updateReviewsOverlay() {
    console.log('updateReviewsOverlay called with currentReviews:', currentReviews);
    
    const reviewsList = document.getElementById('reviewsList');
    const bigRatingScore = document.querySelector('.big-rating-score');
    const totalReviews = document.querySelector('.total-reviews');
    const bigStars = document.querySelector('.big-stars');
    const addReviewBtn = document.querySelector('[data-action="show-review-form"]');

    if (!reviewsList || !bigRatingScore || !totalReviews || !bigStars || !addReviewBtn) {
        console.error('Required elements not found for updateReviewsOverlay');
        return;
    }

    // Calculate average rating
    const totalRating = currentReviews.reduce((sum, review) => {
        console.log('Review rating:', review.rating, 'type:', typeof review.rating);
        return sum + (parseInt(review.rating) || 0);
    }, 0);
    const averageRating = currentReviews.length > 0 ? (totalRating / currentReviews.length).toFixed(1) : '0.0';
    
    console.log('Rating calculation:', {
        totalRating: totalRating,
        reviewCount: currentReviews.length,
        averageRating: averageRating
    });
    
    // Update summary
    bigRatingScore.textContent = averageRating;
    totalReviews.textContent = `Basato su ${currentReviews.length} recensioni`;
    
    // Update stars
    bigStars.innerHTML = generateFractionalStars(parseFloat(averageRating));
    
    // Show add review button only if user is authenticated AND hasn't already reviewed
    const token = localStorage.getItem('authToken');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (token && currentUser) {
        // Check if user has already reviewed using frontend comparison
        const hasUserReviewed = currentReviews.some(review => 
            review.user?.user_id === currentUser.user_id
        );
        
        if (!hasUserReviewed) {
            // User authenticated and hasn't reviewed - show add review button
            addReviewBtn.style.display = 'flex';
        } else {
            // User already reviewed - keep button hidden
            addReviewBtn.style.display = 'none';
        }
    } else {
        // User not authenticated - keep button hidden
        addReviewBtn.style.display = 'none';
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
                            ${createGradientAvatarLocal(
                                review.user?.username || 'User',
                                review.user?.username || 'User'
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
    const form = document.getElementById('addReviewForm');
    const reviewsList = document.getElementById('reviewsList');
    const reviewsSummary = document.querySelector('.reviews-summary');
    
    if (form && reviewsList) {
        form.style.display = 'block';
        reviewsList.style.display = 'none';
        if (reviewsSummary) reviewsSummary.style.display = 'none';
        
        // Reset form
        document.getElementById('reviewComment').value = '';
        selectedRating = 0;
        updateStarRatingDisplay();
    }
}

// Hide add review form
function hideAddReviewForm() {
    const form = document.getElementById('addReviewForm');
    const reviewsList = document.getElementById('reviewsList');
    const reviewsSummary = document.querySelector('.reviews-summary');
    
    if (form && reviewsList) {
        form.style.display = 'none';
        reviewsList.style.display = 'block';
        if (reviewsSummary) reviewsSummary.style.display = 'flex';
    
    // Reset form
    document.getElementById('reviewComment').value = '';
        selectedRating = 0;
    updateStarRatingDisplay();
    }
}

// Initialize star rating functionality
function initializeStarRating() {
    const starInputs = document.querySelectorAll('.star-input');
    
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
    const starInputs = document.querySelectorAll('.star-input');
    
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
    const starInputs = document.querySelectorAll('.star-input');
    
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
    // Check if we're reviewing a file or a vetrina
    const isFileReview = currentFileForReviews !== null;
    const reviewTarget = isFileReview ? currentFileForReviews : currentVetrinaForReviews;
    
    if (!reviewTarget || selectedRating === 0) {
        console.log('Seleziona una valutazione prima di inviare la recensione.', 'error');
        return;
    }
    
    const comment = document.getElementById('reviewComment').value.trim();
    if (!comment) {
        console.log('Inserisci un commento per la tua recensione.', 'error');
        return;
    }
    
    try {
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            console.log('Sessione scaduta. Effettua nuovamente l\'accesso.', 'error');
        return;
    }
    
        // Determine API endpoint based on review type
        const endpoint = isFileReview 
            ? `${API_BASE}/files/${currentFileForReviews}/reviews`
            : `${API_BASE}/vetrine/${currentVetrinaForReviews}/reviews`;
            
        const response = await fetch(endpoint, {
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
            console.log(message, 'success');
            hideAddReviewForm();
            
            // Use the actual response data from the backend for immediate UI update
            // The backend response should contain the complete review data
            console.log('Backend response data:', data);
            
            // Get current user info
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            
            // Create a proper review object using backend response data
            const newReview = {
                rating: parseInt(selectedRating),
                review_text: comment,
                review_date: new Date().toISOString(),
                user: currentUser,
                // Add any additional fields that might be expected by the UI
                review_id: data.review_id || Date.now(), // Use backend ID or fallback
                review_subject: data.review_subject || null
            };
            
            console.log('Created new review object:', newReview);
            
            // Update reviews array based on review type
            const reviewsArray = isFileReview ? currentFileReviews : currentReviews;
            const updateFunction = isFileReview ? updateFileReviewsOverlay : updateReviewsOverlay;
            
            if (data.msg === 'Review updated') {
                // Update existing review
                const existingIndex = reviewsArray.findIndex(review => 
                    review.user?.user_id === currentUser.user_id
                );
                if (existingIndex !== -1) {
                    reviewsArray[existingIndex] = newReview;
                }
            } else {
                // Add new review
                reviewsArray.push(newReview);
            }
            
            // Update currentUserReview based on review type
            if (isFileReview) {
                // For file reviews, we might not have a global currentUserReview
                // Instead, update the file's rating data in the currentVetrinaFiles array
                const fileIndex = currentVetrinaFiles.findIndex(f => f.file_id == currentFileForReviews);
                if (fileIndex !== -1) {
                    currentVetrinaFiles[fileIndex].reviews_count = reviewsArray.length;
                    const avgRating = reviewsArray.reduce((sum, r) => sum + r.rating, 0) / reviewsArray.length;
                    currentVetrinaFiles[fileIndex].average_rating = avgRating;
                }
            } else {
                currentUserReview = newReview;
            }
            
            // Update the UI immediately
            updateFunction();
            
            // Update the rating display immediately
            if (isFileReview) {
                // Update file rating badge in the document list
                updateFileRatingBadge(currentFileForReviews);
            } else {
                updateVetrinaRatingInSearch(currentVetrinaForReviews);
            }
            
            // Clear cache and reload in background to ensure data consistency
            const cacheKey = `reviews_${currentVetrinaForReviews}_${localStorage.getItem('authToken') || 'guest'}`;
            reviewsCache.delete(cacheKey);
            loadReviewsForVetrina(currentVetrinaForReviews).then(() => {
                // Update UI again with any corrections from backend
                updateReviewsOverlay();
                updateVetrinaRatingInSearch(currentVetrinaForReviews);
            }).catch(error => {
                console.error('Background review reload failed:', error);
            });
        } else if (response.status === 401) {
            console.error('Authentication failed');
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            console.log('Sessione scaduta. Effettua nuovamente l\'accesso.', 'error');
            return;
        } else {
            const errorData = await response.json();
            console.log(errorData.message || 'Errore nell\'invio della recensione.', 'error');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        console.log('Errore di connessione. Riprova più tardi.', 'error');
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
        console.log('Sessione scaduta. Effettua nuovamente l\'accesso.', 'error');
        return;
    }
    
    if (!confirm('Sei sicuro di voler eliminare la tua recensione?')) {
        return;
    }
    
    try {
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            console.log('Sessione scaduta. Effettua nuovamente l\'accesso.', 'error');
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
            console.log('Recensione eliminata con successo!', 'success');
            
            // Get current user info
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            
            // Remove the user's review from currentReviews immediately
            const reviewIndex = currentReviews.findIndex(review => 
                review.user?.user_id === currentUser.user_id
            );
            if (reviewIndex !== -1) {
                currentReviews.splice(reviewIndex, 1);
            }
            
            // Clear currentUserReview
            currentUserReview = null;
            
            // Update the UI immediately
            updateReviewsOverlay();
            
            // Update the rating display immediately
            updateVetrinaRatingInSearch(currentVetrinaForReviews);
            
            // Clear cache and reload in background to ensure data consistency
            const cacheKey = `reviews_${currentVetrinaForReviews}_${localStorage.getItem('authToken') || 'guest'}`;
            reviewsCache.delete(cacheKey);
            loadReviewsForVetrina(currentVetrinaForReviews).then(() => {
                // Update UI again with any corrections from backend
                updateReviewsOverlay();
                updateVetrinaRatingInSearch(currentVetrinaForReviews);
            }).catch(error => {
                console.error('Background review reload failed:', error);
            });
        } else if (response.status === 401) {
            console.error('Authentication failed');
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            console.log('Sessione scaduta. Effettua nuovamente l\'accesso.', 'error');
            return;
        } else {
            const errorData = await response.json();
            console.log(errorData.message || 'Errore nell\'eliminazione della recensione.', 'error');
        }
    } catch (error) {
        console.error('Error deleting review:', error);
        console.log('Errore di connessione. Riprova più tardi.', 'error');
    }
}

// Update vetrina rating in search results and document preview
function updateVetrinaRatingInSearch(vetrinaId) {
    // Update search results (if we're on search page)
    const ratingElements = document.querySelectorAll(`[data-vetrina-id="${vetrinaId}"] .rating-badge`);
    
    ratingElements.forEach(element => {
        // For search page, we would need currentVetrine array, but in document preview we don't have it
        // So we'll skip updating search results from document preview page
        // The search page will update its own data when it loads
    });
    
    // Update document preview page rating badge data attributes
    const docRatingBadge = document.querySelector('.doc-rating-display[data-vetrina-id="' + vetrinaId + '"]');
    if (docRatingBadge) {
        // Use currentVetrina (singular) which is available in document preview page
        if (currentVetrina && (currentVetrina.id === vetrinaId || currentVetrina.vetrina_id === vetrinaId)) {
            // Calculate new rating from current reviews
            const totalRating = currentReviews.reduce((sum, review) => sum + review.rating, 0);
            const newRating = currentReviews.length > 0 ? (totalRating / currentReviews.length) : 0;
            const newReviewCount = currentReviews.length;
            
            docRatingBadge.setAttribute('data-rating', newRating.toString());
            docRatingBadge.setAttribute('data-review-count', newReviewCount.toString());
            
            // Also update the visible rating display
            const ratingScore = docRatingBadge.querySelector('.rating-score');
            const ratingStars = docRatingBadge.querySelector('.rating-stars');
            const ratingCount = docRatingBadge.querySelector('.rating-count');
            
            if (ratingScore) ratingScore.textContent = newRating.toFixed(1);
            if (ratingStars) ratingStars.innerHTML = generateFractionalStars(newRating);
            if (ratingCount) ratingCount.textContent = `(${newReviewCount})`;
            
            console.log('Updated document preview rating badge:', {
                vetrinaId: vetrinaId,
                rating: newRating,
                reviewCount: newReviewCount
            });
        }
    }
}

// These functions have been replaced by the new reviews overlay system
// The new system uses currentReviews, currentVetrinaForReviews, and the new updateReviewsOverlay() function

// Action Handlers
async function handleFavorite() {
    if (!currentDocument || !currentDocument.file_id) {
        console.log('Errore: ID file non trovato', 'error');
        return;
    }

    const favoriteBtn = document.getElementById('favoriteBtn');
    if (!favoriteBtn) {
        console.log('Errore: Pulsante preferiti non trovato', 'error');
        return;
    }
    
    if (!currentVetrina) {
        console.error('❌ Current vetrina is missing:', currentVetrina);
        console.log('Errore: Dati vetrina non disponibili. Ricarica la pagina.', 'error');
        return;
    }
    
    // Get the vetrina ID from either id or vetrina_id field
    const vetrinaId = currentVetrina.id || currentVetrina.vetrina_id;
    if (!vetrinaId) {
        console.error('❌ Current vetrina has no ID field:', currentVetrina);
        console.log('Errore: ID vetrina non trovato. Ricarica la pagina.', 'error');
        return;
    }

    // Toggle the favorite state locally since it's already provided in the vetrina data
    const isActive = favoriteBtn.classList.toggle('active');
    favoriteBtn.setAttribute('title', isActive ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti');

    // Update the vetrina's favorite status locally
    currentVetrina.favorite = isActive;
    
    // Update the current document's favorite status for consistency
    currentDocument.favorite = isActive;
    
    // Show appropriate notification
    if (isActive) {
        favoriteBtn.classList.add('active');
        favoriteBtn.title = 'Rimuovi dai Preferiti';
        console.log('Aggiunto ai preferiti! ❤️', 'success');
    } else {
        favoriteBtn.classList.remove('active');
        favoriteBtn.title = 'Aggiungi ai Preferiti';
        console.log('Rimosso dai preferiti 💔', 'success');
    }
    
    // Mark that favorites have been changed so search page knows to refresh
    sessionStorage.setItem('favoritesChanged', 'true');
}

async function handleAddToCart() {
    if (!currentVetrina || !(currentVetrina.vetrina_id || currentVetrina.id)) {
        console.log('Errore: ID vetrina non trovato', 'error');
        return;
    }

    const addToCartBtn = document.getElementById('addToCartBtn');
    if (!addToCartBtn) {
        console.log('Errore: Pulsante carrello non trovato', 'error');
        return;
    }

    // Optimistically update UI
    addToCartBtn.classList.add('added');
    addToCartBtn.innerHTML = `Bundle Aggiunto al Carrello`;
    addToCartBtn.disabled = true;

    try {
        // In a real implementation, this would call the cart API for vetrine
        // For now, we'll simulate the API call
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
        
        console.log('Bundle aggiunto al carrello!', 'success');
        
        // Update cart count in header (if cart indicator exists)
        updateCartCount();
        
    } catch (error) {
        console.error('Add to cart error:', error);
        
        // Revert UI on error
        addToCartBtn.classList.remove('added');
        addToCartBtn.innerHTML = `Aggiungi al Carrello`;
        addToCartBtn.disabled = false;
        
        console.log('Errore nell\'aggiunta del bundle al carrello. Riprova.', 'error');
    }
}

function updateCartCount() {
    // In a real implementation, this would update a cart counter in the header
    // For now, we'll just log the action
    
    // You could add a cart indicator to the header like this:
    // const cartIndicator = document.querySelector('.cart-indicator');
    // if (cartIndicator) {
    //     const currentCount = parseInt(cartIndicator.textContent) || 0;
    //     cartIndicator.textContent = currentCount + 1;
    // }
}

function handleShare() {
    if (navigator.share) {
        navigator.share({
            title: currentVetrina?.name || 'Vetrina StudyHub',
            text: 'Guarda questa vetrina su StudyHub',
            url: window.location.href
        });
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            console.log('Link copiato negli appunti!', 'success');
        });
    }
}

// Download functionality removed - PDFs are view-only

// Download functionality removed - Files are view-only

// Download functionality removed - Files are view-only

// Download functionality removed - Files are view-only

// Show and fade out bottom overlay elements
function showAndFadeBottomOverlay() {
    const bottomOverlay = document.querySelector('.viewer-bottom-overlay');
    if (!bottomOverlay) return;

    bottomOverlay.classList.add('visible');

    if (bottomOverlayTimeout) {
        clearTimeout(bottomOverlayTimeout);
    }

    bottomOverlayTimeout = setTimeout(() => {
        bottomOverlay.classList.remove('visible');
    }, 2000); // Hide after 2 seconds
} 

// Related Documents Renderer - Professional Placeholder Implementation
function renderRelatedDocuments(relatedDocs) {
    const relatedContainer = document.querySelector('.related-docs');
    
    if (!relatedContainer) return;
    
    // Generate professional placeholder documents
    const placeholderDocs = generatePlaceholderDocuments();
    
    const relatedHTML = placeholderDocs.map(doc => `
        <div class="related-doc-item">
            <div class="related-doc-preview" data-action="navigate" data-url="document-preview.html?id=${doc.id}">
                <div class="doc-preview-icon">
                    <span class="material-symbols-outlined">${doc.icon}</span>
                </div>
                <div class="doc-preview-overlay">
                    <span class="preview-price">€${doc.price}</span>
                </div>
            </div>
            <div class="related-doc-info">
                <div class="doc-content" data-action="navigate" data-url="document-preview.html?id=${doc.id}">
                    <h4 class="doc-title" data-full-title="${doc.title}">${doc.title}</h4>
                    <p class="doc-description">${doc.description}</p>
                    <p class="doc-author">${doc.author}</p>
                    <div class="doc-meta">
                        <div class="doc-rating">
                            <span class="stars">${generateStars(doc.rating)}</span>
                            <span class="rating-score">${doc.rating.toFixed(1)}</span>
                        </div>
                        <div class="doc-type">
                            <span class="type-badge">${doc.type}</span>
                        </div>
                    </div>
                </div>
                <div class="doc-actions">
                    <button class="related-cart-btn" data-action="add-to-cart" data-doc-id="${doc.id}">
                        <span class="material-symbols-outlined">add_shopping_cart</span>
                        <span class="btn-text">Aggiungi</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    relatedContainer.innerHTML = `
        <h3>
            <span class="material-symbols-outlined">library_books</span>
            Documenti Correlati
        </h3>
        <div class="related-docs-grid">
            ${relatedHTML}
        </div>
    `;
}

// Generate Professional Placeholder Documents
function generatePlaceholderDocuments() {
    const documentTypes = [
        { type: 'Appunti', icon: 'edit_note', courses: ['Microeconomia', 'Macroeconomia', 'Statistica', 'Matematica Finanziaria'] },
        { type: 'Esame', icon: 'quiz', courses: ['Economia Aziendale', 'Diritto Commerciale', 'Marketing', 'Contabilità'] },
        { type: 'Progetto', icon: 'assignment', courses: ['Analisi dei Dati', 'Econometria', 'Finanza', 'Management'] },
        { type: 'Tesi', icon: 'school', courses: ['Economia Politica', 'Storia Economica', 'Politica Economica', 'Sviluppo Economico'] },
        { type: 'Slide', icon: 'slideshow', courses: ['Economia Internazionale', 'Commercio Estero', 'Economia Monetaria', 'Banca e Finanza'] },
        { type: 'Esercizi', icon: 'calculate', courses: ['Matematica', 'Statistica Applicata', 'Economia Matematica', 'Ricerca Operativa'] },
        { type: 'Riassunto', icon: 'summarize', courses: ['Teoria dei Giochi', 'Organizzazione Aziendale', 'Economia del Lavoro', 'Economia Pubblica'] },
        { type: 'Laboratorio', icon: 'science', courses: ['Econometria Applicata', 'Analisi Statistica', 'Modelli Econometrici', 'Data Science'] }
    ];
    
    const authors = [
        'Rossi M.',
        'Bianchi A.',
        'Verdi L.',
        'Neri S.',
        'Gialli P.',
        'Marroni E.',
        'Azzurri R.',
        'Viola M.'
    ];
    
    const documents = [];
    
    for (let i = 0; i < 8; i++) {
        const docType = documentTypes[i % documentTypes.length];
        const course = docType.courses[i % docType.courses.length];
        const author = authors[i % authors.length];
        
        documents.push({
            id: 200 + i,
            title: `${docType.type} - ${course}`,
            description: generateDocumentDescription(docType.type, course),
            author: author,
            type: docType.type,
            icon: docType.icon,
            price: (Math.random() * 15 + 5).toFixed(2),
            rating: Math.random() * 2 + 3, // 3.0 to 5.0
            course: course
        });
    }
    
    return documents;
}

// Generate Document Description
function generateDocumentDescription(docType, course) {
    const descriptions = {
        'Appunti': `Appunti completi e dettagliati per ${course}. Include tutti gli argomenti principali trattati durante il corso.`,
        'Esame': `Raccolta di esami precedenti per ${course}. Include soluzioni dettagliate e spiegazioni.`,
        'Progetto': `Progetto completo per ${course}. Include documentazione, codice e presentazione finale.`,
        'Tesi': `Tesi di laurea su ${course}. Ricerca approfondita con analisi dettagliate.`,
        'Slide': `Presentazioni complete per ${course}. Materiale didattico ben strutturato.`,
        'Esercizi': `Esercizi pratici per ${course}. Include soluzioni e metodi di risoluzione.`,
        'Riassunto': `Riassunto completo di ${course}. Concetti chiave e formule principali.`,
        'Laboratorio': `Guide di laboratorio per ${course}. Procedure sperimentali dettagliate.`
    };
    
    return descriptions[docType] || `Materiale didattico per ${course}.`;
}

// Add Related Document to Cart
async function addRelatedToCart(docId, event) {
    event.stopPropagation(); // Prevent card click
    
    const button = event.currentTarget;
    const btnText = button.querySelector('.btn-text');
    const icon = button.querySelector('.material-symbols-outlined');
    
    // Optimistic UI update
    button.classList.add('adding');
    btnText.textContent = 'Aggiungendo...';
    icon.textContent = 'hourglass_empty';
    
    try {
        // Simulate API call (replace with actual cart API)
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Success state
        button.classList.remove('adding');
        button.classList.add('added');
        btnText.textContent = 'Aggiunto!';
        icon.textContent = 'check_circle';
        
        // Update cart count
        updateCartCount();
        
        // Show success notification
        console.log('Documento aggiunto al carrello! 🛒', 'success');
        
        // Reset button after 2 seconds
        setTimeout(() => {
            button.classList.remove('added');
            btnText.textContent = 'Aggiungi';
            icon.textContent = 'add_shopping_cart';
        }, 2000);
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        
        // Error state
        button.classList.remove('adding');
        button.classList.add('error');
        btnText.textContent = 'Errore';
        icon.textContent = 'error';
        
        // Show error notification
        console.log('Errore nell\'aggiunta al carrello. Riprova.', 'error');
        
        // Reset button after 2 seconds
        setTimeout(() => {
            button.classList.remove('error');
            btnText.textContent = 'Aggiungi';
            icon.textContent = 'add_shopping_cart';
        }, 2000);
    }
}

// ============================================
// DOCUMENT PREVIEW OVERLAY FUNCTIONALITY
// ============================================

// Setup document preview functionality
function setupDocumentPreview() {
    // Add event listeners for preview actions
    document.addEventListener('click', handlePreviewActions);
}

// Handle all preview-related actions
function handlePreviewActions(e) {
    const action = e.target.closest('[data-action]')?.getAttribute('data-action');
    
    switch (action) {
        case 'preview-document':
            e.preventDefault();
            e.stopPropagation();
            const fileId = e.target.closest('[data-file-id]')?.getAttribute('data-file-id');
            if (fileId) {
                openDocumentPreview(fileId);
            }
            break;
        case 'view-single-document':
            e.preventDefault();
            e.stopPropagation();
            const singleDocFileId = e.target.closest('[data-file-id]')?.getAttribute('data-file-id');
            if (singleDocFileId) {
                viewSingleDocument(singleDocFileId);
            }
            break;
        case 'open-file-reviews':
            e.preventDefault();
            e.stopPropagation();
            const reviewFileId = e.target.closest('[data-file-id]')?.getAttribute('data-file-id');
            if (reviewFileId) {
                openFileReviewsOverlay(reviewFileId);
            }
            break;
        case 'close-preview':
            closeDocumentPreview();
            break;
        case 'open-full-viewer':
            const fullViewerFileId = document.getElementById('openFullViewerBtn')?.getAttribute('data-file-id');
            if (fullViewerFileId) {
                // Close preview and open full viewer
                closeDocumentPreview();
                // Trigger the existing viewer functionality
                setTimeout(() => {
                    const viewerAction = document.querySelector(`[data-action="open-viewer"][data-file-id="${fullViewerFileId}"]`);
                    if (viewerAction) {
                        viewerAction.click();
                    }
                }, 300);
            }
            break;
    }
}

// Open document preview overlay
async function openDocumentPreview(fileId) {
    const overlay = document.getElementById('documentPreviewOverlay');
    const loader = document.getElementById('previewLoader');
    const content = document.getElementById('previewContent');
    const title = document.getElementById('previewDocumentTitle');
    const openFullBtn = document.getElementById('openFullViewerBtn');
    
    if (!overlay || !loader || !content || !title) return;
    
    // Find the file data
    const file = currentVetrinaFiles.find(f => f.file_id == fileId);
    if (!file) return;
    
    // Set title and file reference
    const displayFilename = extractOriginalFilename(file.filename);
    title.textContent = file.display_name || displayFilename;
    openFullBtn.setAttribute('data-file-id', fileId);
    
    // Show overlay
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Show loader
    loader.style.display = 'flex';
    content.classList.remove('loaded');
    
    try {
        // Create redacted preview
        await loadRedactedPreview(file, content);
        
        // Hide loader and show content
        loader.style.display = 'none';
        content.classList.add('loaded');
        
    } catch (error) {
        console.error('Failed to load document preview:', error);
        
        // Show error state
        loader.style.display = 'none';
        content.innerHTML = `
            <div class="preview-error">
                <div class="error-icon">
                    <span class="material-symbols-outlined">error</span>
                </div>
                <h4>Anteprima non disponibile</h4>
                <p>Non è possibile caricare l'anteprima di questo documento.</p>
                <button class="preview-action-btn primary" onclick="closeDocumentPreview()">
                    Chiudi
                </button>
            </div>
        `;
        content.classList.add('loaded');
    }
}

// Close document preview overlay
function closeDocumentPreview() {
    const overlay = document.getElementById('documentPreviewOverlay');
    const content = document.getElementById('previewContent');
    
    if (!overlay) return;
    
    // Hide overlay
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    
    // Clear content after animation
    setTimeout(() => {
        if (content) {
            content.innerHTML = '';
            content.classList.remove('loaded');
        }
    }, 300);
}

// View single document (without descrizione section)
function viewSingleDocument(fileId) {
    const file = currentVetrinaFiles.find(f => f.file_id == fileId);
    if (!file) return;
    
    // Construct URL for single document view
    const params = new URLSearchParams({
        id: currentVetrina?.id || currentVetrina?.vetrina_id,
        file: fileId,
        single: 'true' // Flag to indicate single document view
    });
    
    // Navigate to single document view
    window.location.href = `document-preview.html?${params.toString()}`;
}

// Open file reviews overlay
async function openFileReviewsOverlay(fileId) {
    const file = currentVetrinaFiles.find(f => f.file_id == fileId);
    if (!file) return;
    
    // Store current file for reviews
    currentFileForReviews = fileId;
    
    const overlay = document.getElementById('reviewsOverlay');
    if (overlay) {
        // Update overlay title to show it's for a specific file
        const overlayTitle = overlay.querySelector('h2');
        if (overlayTitle) {
            const displayFilename = extractOriginalFilename(file.filename);
            overlayTitle.innerHTML = `
                <span class="material-symbols-outlined">rate_review</span>
                Recensioni - ${file.display_name || displayFilename}
            `;
        }
        
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Show initial rating data from file object
        showInitialFileRatingData(file);
        
        // Load detailed reviews data in background
        await loadReviewsForFile(fileId);
        updateFileReviewsOverlay();
    }
}

// Show initial file rating data
function showInitialFileRatingData(file) {
    const rating = file.average_rating || 0;
    const reviewCount = file.reviews_count || 0;
    
    // Update big stars display
    const bigStars = document.querySelector('.big-stars');
    if (bigStars) {
        bigStars.innerHTML = generateStars(rating);
    }
    
    // Update big rating score
    const bigRatingScore = document.querySelector('.big-rating-score');
    if (bigRatingScore) {
        bigRatingScore.textContent = rating.toFixed(1);
    }
    
    // Update total reviews text
    const totalReviews = document.querySelector('.total-reviews');
    if (totalReviews) {
        totalReviews.textContent = `Basato su ${reviewCount} ${reviewCount === 1 ? 'recensione' : 'recensioni'}`;
    }
}

// Load reviews for specific file
async function loadReviewsForFile(fileId) {
    try {
        const response = await makeRequest(`${API_BASE}/files/${fileId}/reviews`);
        if (response && response.reviews) {
            currentFileReviews = response.reviews;
        } else {
            currentFileReviews = [];
        }
    } catch (error) {
        console.error('Error loading file reviews:', error);
        currentFileReviews = [];
    }
}

// Update file reviews overlay
function updateFileReviewsOverlay() {
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;
    
    if (!currentFileReviews || currentFileReviews.length === 0) {
        reviewsList.innerHTML = `
            <div class="no-reviews-message">
                <span class="material-symbols-outlined">rate_review</span>
                <p>Nessuna recensione ancora</p>
                <span>Sii il primo a recensire questo documento!</span>
            </div>
        `;
        return;
    }
    
    // Sort reviews by date (newest first)
    const sortedReviews = [...currentFileReviews].sort((a, b) => 
        new Date(b.review_date) - new Date(a.review_date)
    );
    
    reviewsList.innerHTML = sortedReviews.map(review => {
        const reviewDate = new Date(review.review_date);
        const formattedDate = reviewDate.toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const isOwnReview = currentUser && review.user && 
            (review.user.user_id === currentUser.user_id || 
             review.user.username === currentUser.username);
        
        return `
            <div class="review-item ${isOwnReview ? 'own-review' : ''}">
                <div class="review-header">
                    <div class="review-author">
                        <div class="review-avatar">
                            ${createGradientAvatarLocal(review.user.full_name, review.user.username)}
                        </div>
                        <div class="review-author-info">
                            <span class="review-author-name">${review.user.full_name || review.user.username}</span>
                            <span class="review-date">${formattedDate}</span>
                        </div>
                    </div>
                    <div class="review-rating">
                        <div class="review-stars">${generateStars(review.rating)}</div>
                        ${isOwnReview ? `
                        <button class="delete-review-btn" data-action="delete-file-review" data-file-id="${currentFileForReviews}" title="Elimina recensione">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                        ` : ''}
                    </div>
                </div>
                <div class="review-content">
                    <p>${review.review_text}</p>
                </div>
            </div>
        `;
    }).join('');
}

// Delete file review
async function deleteFileReview(fileId) {
    if (!fileId) return;
    
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('Sessione scaduta. Effettua nuovamente l\'accesso.', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE}/files/${fileId}/reviews`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('Recensione eliminata con successo!', 'success');
            
            // Remove from currentFileReviews array
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (currentUser && currentFileReviews) {
                currentFileReviews = currentFileReviews.filter(review => 
                    review.user?.user_id !== currentUser.user_id
                );
            }
            
            // Update file rating data
            const fileIndex = currentVetrinaFiles.findIndex(f => f.file_id == fileId);
            if (fileIndex !== -1) {
                currentVetrinaFiles[fileIndex].reviews_count = currentFileReviews.length;
                if (currentFileReviews.length > 0) {
                    const avgRating = currentFileReviews.reduce((sum, r) => sum + r.rating, 0) / currentFileReviews.length;
                    currentVetrinaFiles[fileIndex].average_rating = avgRating;
                } else {
                    currentVetrinaFiles[fileIndex].average_rating = 0;
                }
            }
            
            // Update UI
            updateFileReviewsOverlay();
            updateFileRatingBadge(fileId);
            
        } else {
            const errorData = await response.json();
            console.log(errorData.message || 'Errore durante l\'eliminazione della recensione.', 'error');
        }
    } catch (error) {
        console.error('Error deleting file review:', error);
        console.log('Errore durante l\'eliminazione della recensione.', 'error');
    }
}

// Update file rating badge in document list
function updateFileRatingBadge(fileId) {
    const fileCard = document.querySelector(`[data-file-id="${fileId}"]`);
    if (!fileCard) return;
    
    const ratingBadge = fileCard.querySelector('.file-rating-badge');
    if (!ratingBadge) return;
    
    const file = currentVetrinaFiles.find(f => f.file_id == fileId);
    if (!file) return;
    
    const rating = file.average_rating || 0;
    const reviewCount = file.reviews_count || 0;
    
    if (rating > 0 || reviewCount > 0) {
        const stars = generateFractionalStars(rating);
        ratingBadge.className = 'file-rating-badge';
        ratingBadge.innerHTML = `
            <div class="rating-stars">${stars}</div>
            <span class="rating-count">(${reviewCount})</span>
        `;
    } else {
        ratingBadge.className = 'file-rating-badge no-reviews';
        ratingBadge.innerHTML = `
            <span class="material-symbols-outlined">rate_review</span>
        `;
    }
    
    // Update data attributes
    ratingBadge.setAttribute('data-rating', rating);
    ratingBadge.setAttribute('data-review-count', reviewCount);
}

// Load redacted preview for document
async function loadRedactedPreview(file, contentContainer) {
    const fileExtension = getFileExtension(file.filename).toLowerCase();
    
    // Create redacted preview based on file type
    if (fileExtension === 'pdf') {
        await loadRedactedPdfPreview(file, contentContainer);
    } else {
        // For non-PDF files, show a redacted placeholder
        loadRedactedPlaceholder(file, contentContainer);
    }
}

// Load redacted PDF preview
async function loadRedactedPdfPreview(file, contentContainer) {
    // Create iframe for PDF preview using the redacted endpoint
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '500px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = 'var(--radius-lg)';
    iframe.style.background = 'var(--neutral-25)';
    
    // Use the redacted PDF URL
    const redactedUrl = getRedactedPdfUrl(file.file_id);
    iframe.src = redactedUrl;
    
    contentContainer.appendChild(iframe);
}

// Load redacted placeholder for non-PDF files
function loadRedactedPlaceholder(file, contentContainer) {
    const fileExtension = getFileExtension(file.filename).toLowerCase();
    const documentIcon = getDocumentPreviewIcon(file.filename);
    
    const placeholder = document.createElement('div');
    placeholder.className = 'redacted-placeholder';
    placeholder.innerHTML = `
        <div class="redacted-preview-container">
            <div class="redacted-document-icon">
                <span class="document-icon">${documentIcon}</span>
                <div class="file-type-badge">${fileExtension.toUpperCase()}</div>
            </div>
            <h3>Anteprima Non Disponibile</h3>
            <p>L'anteprima redatta non è disponibile per questo tipo di file (${fileExtension.toUpperCase()}).</p>
            <div class="redacted-badge">Contenuto Protetto</div>
        </div>
    `;
    
    // Add styles for the placeholder
    const style = document.createElement('style');
    style.textContent = `
        .redacted-placeholder {
            height: 500px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .redacted-preview-container {
            text-align: center;
            max-width: 400px;
            padding: 2rem;
        }
        .redacted-document-icon {
            position: relative;
            width: 100px;
            height: 120px;
            background: linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%);
            border-radius: var(--radius-lg);
            margin: 0 auto 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid var(--primary-200);
        }
        .redacted-document-icon .document-icon {
            font-size: 3rem;
            color: var(--primary-600);
        }
        .file-type-badge {
            position: absolute;
            bottom: -8px;
            right: -8px;
            background: var(--primary-600);
            color: white;
            font-size: 0.75rem;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 4px;
            border: 2px solid white;
        }
        .redacted-preview-container h3 {
            margin: 0 0 0.5rem 0;
            color: var(--neutral-900);
            font-size: 1.25rem;
        }
        .redacted-preview-container p {
            margin: 0 0 1.5rem 0;
            color: var(--neutral-600);
            font-size: 0.875rem;
        }
        .redacted-badge {
            background: #fee2e2;
            color: #dc2626;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: inline-block;
        }
    `;
    
    contentContainer.appendChild(style);
    contentContainer.appendChild(placeholder);
}

// ============================================
// AUTHOR PROFILE FUNCTIONALITY
// ============================================

// Local helper functions for non-header avatar generation
function getInitialsLocal(fullName) {
    if (!fullName) return 'U';
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    } else if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
    }
    return 'U';
}

function getConsistentGradientLocal(username) {
    // Simple gradient colors for non-header use
    const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
    ];
    
    if (!username) return gradients[0];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
}

function createGradientAvatarLocal(fullName, username) {
    const gradient = getConsistentGradientLocal(username);
    const initials = getInitialsLocal(fullName);
    
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

// Generate author profile HTML - compact version matching search page integration
function generateAuthorProfile(vetrinaData) {
    if (!vetrinaData) return '';
    
    // Extract author information from vetrina data
    const authorName = vetrinaData.user_name || vetrinaData.author_name || vetrinaData.author?.username || 'Autore Sconosciuto';
    const authorId = vetrinaData.user_id || vetrinaData.author_id || vetrinaData.author?.user_id;
    const authorUsername = vetrinaData.author?.username || authorName;
    
    // Generate author initials for avatar using local function
    const initials = getInitialsLocal(authorName);
    
    // Get consistent gradient using local function
    const gradientStyle = getConsistentGradientLocal(authorUsername);
    
    // Mock statistics (in real app, these would come from API)
    const authorStats = {
        documents: vetrinaData.document_count || Math.floor(Math.random() * 50) + 5,
        rating: vetrinaData.author_rating || (4.0 + Math.random() * 1.0),
        reviews: vetrinaData.review_count || Math.floor(Math.random() * 100) + 10
    };
    
    return `
        <div class="author-profile-compact" data-action="navigate-to-vendor" data-vendor-username="${authorUsername || ''}" tabindex="0" role="button" aria-label="Visualizza profilo di ${authorName}">
            <div class="author-profile-compact-header">
                <div class="author-avatar-compact" style="background: ${gradientStyle}; color: white;">
                    ${initials}
                </div>
                <div class="author-info-compact">
                    <div class="author-name-compact">${authorName}</div>
                    <div class="author-stats-compact">
                        <span class="author-doc-count">${authorStats.documents} documenti</span>
                        <span class="author-separator">•</span>
                        <span class="author-rating-compact">${authorStats.rating.toFixed(1)} ★ (${authorStats.reviews})</span>
                    </div>
                </div>
                <div class="author-profile-arrow">
                    <span class="material-symbols-outlined">arrow_forward</span>
                </div>
            </div>
        </div>
    `;
}

// Handle author profile click
function handleAuthorProfileClick(e) {
    const element = e.target.closest('[data-action="navigate-to-vendor"]');
    if (!element) return;
    
    e.preventDefault();
    const vendorUsername = element.getAttribute('data-vendor-username');
    
    if (vendorUsername) {
        // Navigate to vendor page using username parameter (matching search page pattern)
        window.location.href = `vendor-page.html?user=${encodeURIComponent(vendorUsername)}`;
    } else {
        console.warn('No vendor username found for author profile');
        console.log('Profilo autore temporaneamente non disponibile', 'info');
    }
}

// Add author profile click handlers
document.addEventListener('click', handleAuthorProfileClick);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        handleAuthorProfileClick(e);
    }
});

// Reading Position Management
// Reading Position Management
