import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/build/pdf.mjs';

// Set the worker script path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/build/pdf.worker.mjs`;

// ============================================
// WORLD-CLASS DYNAMIC DOCUMENT PREVIEW SYSTEM
// ============================================

const API_BASE = window.APP_CONFIG?.API_BASE || 'https://symbia.it:5000';
let authToken = localStorage.getItem('authToken');

// Document State Management
let currentDocument = null;
let currentVetrina = null;
let currentVetrinaFiles = []; // Store vetrina files for bundle operations
let currentUser = null; // Store current user data for review comparisons
let currentPage = 1;
let totalPages = 1;

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
        
        if (e.target.closest('[data-action="download-single"]')) {
            const element = e.target.closest('[data-action="download-single"]');
            const fileId = element.getAttribute('data-file-id');
            if (fileId) {
                e.stopPropagation();
                downloadSingleDocument(fileId);
            }
        }
        
        // Reviews overlay actions are now handled by the new system in initializeReviewsOverlay()
        
        if (e.target.closest('[data-action="add-to-cart"]')) {
            const element = e.target.closest('[data-action="add-to-cart"]');
            const docId = element.getAttribute('data-doc-id');
            if (docId) {
                addRelatedToCart(docId, e);
            }
        }
        
        // Handle download all button
        if (e.target.closest('#downloadAllBtn')) {
            e.preventDefault();
            e.stopPropagation();
            const vetrinaId = currentVetrina?.id || currentVetrina?.vetrina_id;
            if (vetrinaId && currentVetrinaFiles) {
                downloadAllVetrinaFiles(vetrinaId, currentVetrinaFiles);
            }
        }
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
        
        // Convert to base64 data URL for CSP compliance
        const uint8Array = new Uint8Array(pdfData);
        const base64 = btoa(String.fromCharCode.apply(null, uint8Array));
        const dataUrl = `data:application/pdf;base64,${base64}`;
        
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.borderRadius = '8px';
        container.style.overflow = 'hidden';
        container.style.backgroundColor = '#525659';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        
        // --- Professional Toolbar ---
        const toolbar = document.createElement('div');
        toolbar.style.padding = '8px 16px';
        toolbar.style.backgroundColor = '#3c3f41';
        toolbar.style.borderBottom = '1px solid #2a2c2e';
        toolbar.style.display = 'flex';
        toolbar.style.alignItems = 'center';
        toolbar.style.justifyContent = 'space-between';
        toolbar.style.flexShrink = '0';

        const applyModernButtonStyles = (button) => {
            button.style.backgroundColor = 'transparent';
            button.style.border = 'none';
            button.style.color = 'white';
            button.style.cursor = 'pointer';
            button.style.padding = '6px';
            button.style.borderRadius = '50%';
            button.style.display = 'flex';
            button.style.alignItems = 'center';
            button.style.justifyContent = 'center';
            button.style.transition = 'background-color 0.2s ease-in-out';
            button.onmouseenter = () => button.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            button.onmouseleave = () => button.style.backgroundColor = 'transparent';
        };

        // Left Controls (Download)
        const leftControls = document.createElement('div');
        const downloadBtn = document.createElement('button');
        applyModernButtonStyles(downloadBtn);
        downloadBtn.title = 'Download';
        downloadBtn.innerHTML = '<span class="material-symbols-outlined">download</span>';
        downloadBtn.onclick = () => downloadRedactedDocument(fileId);
        leftControls.appendChild(downloadBtn);

        // Right Controls (Zoom, Fullscreen)
        const rightControls = document.createElement('div');
        rightControls.style.display = 'flex';
        rightControls.style.alignItems = 'center';
        rightControls.style.gap = '8px';

        const zoomOutBtn = document.createElement('button');
        applyModernButtonStyles(zoomOutBtn);
        zoomOutBtn.title = 'Zoom Out';
        zoomOutBtn.innerHTML = '<span class="material-symbols-outlined">zoom_out</span>';
        
        const zoomInfo = document.createElement('span');
        zoomInfo.style.color = 'white';
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
        container.appendChild(viewerArea);
        
        viewerElement.appendChild(container);
        
        const loadingTask = pdfjsLib.getDocument({ url: dataUrl });
        const pdfDocument = await loadingTask.promise;
        
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
                renderAllPages();
            }
        });
        
        zoomInBtn.addEventListener('click', () => {
            if (currentScale < 3.0) {
                currentScale += 0.25;
                renderAllPages();
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

function updateHeaderUserInfo(user) {
    const userAvatar = document.getElementById('userAvatar');
    const dropdownAvatar = document.getElementById('dropdownAvatar');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');
    
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
        if(userAvatar) {
            const gradientAvatar = createGradientAvatar(fullName, user.username);
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
        
        // Toggle dropdown
        const userInfo = document.querySelector('.user-info');
        if(userAvatar) {
            userAvatar.addEventListener('click', (event) => {
                event.stopPropagation();
                userInfo.classList.toggle('open');
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if(logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }

    } else {
        // Handle case where user is not logged in - show login button
        if(userAvatar) {
            userAvatar.innerHTML = `
                <button class="login-btn" onclick="window.location.href='index.html'">
                    <span class="login-btn-text">Accedi</span>
                </button>
            `;
        }
        
        // Remove dropdown functionality for non-authenticated users
        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            userInfo.classList.remove('open');
        }
    }
}

document.addEventListener('click', () => {
    const userInfo = document.querySelector('.user-info');
    if (userInfo && userInfo.classList.contains('open')) {
        userInfo.classList.remove('open');
    }
});

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    // Refresh the page to show login button
    window.location.reload();
}

// URL Parameter Handler
function getFileIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Document Data Fetcher - Enhanced to get complete information
async function fetchDocumentData(vetrinaId) {
    try {
        // The ID from the URL is a vetrinaId.

        // 1. Fetch all files for this vetrina.
        const vetrinaFilesResponse = await makeRequest(`${API_BASE}/vetrine/${vetrinaId}/files`);
        const vetrinaFiles = (vetrinaFilesResponse && vetrinaFilesResponse.files) ? vetrinaFilesResponse.files : [];

        // 2. Fetch the details for this specific vetrina.
        // The backend doesn't have /vetrine/<id>, so we must fetch all and filter.
                const allVetrineResponse = await makeRequest(`${API_BASE}/vetrine`);
        if (!allVetrineResponse || !allVetrineResponse.vetrine) {
            throw new Error('Could not fetch vetrine list.');
        }
        const vetrinaData = allVetrineResponse.vetrine.find(v => v.id == vetrinaId || v.vetrina_id == vetrinaId);
                    
                    if (!vetrinaData) {
            throw new Error(`Vetrina with ID ${vetrinaId} not found.`);
        }

        // 3. The rest of the page logic needs a "primary document" object for context.
        // If the vetrina has files, we use the first one.
        // If not, we create a fallback object from the vetrina data itself.
        let primaryDocument;
        if (vetrinaFiles.length > 0) {
            // Use the first file as the primary document context
            primaryDocument = vetrinaFiles[0];
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

        // 4. Fetch reviews for the vetrina.
                const reviewsResponse = await makeRequest(`${API_BASE}/vetrine/${vetrinaId}/reviews`);
        const reviewsData = (reviewsResponse && reviewsResponse.reviews) ? reviewsResponse.reviews : [];

        // 5. Assemble the final data structure that the rest of the page expects.
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
    
    // Update document title - use VETRINA name, not individual file name
    const title = vetrinaData?.name || 'Vetrina Senza Nome';
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
    
    // Update document type tag - use the generateVetrinaDocumentTags function
    const docTypeTag = document.querySelector('.doc-type-tag');
    if (docTypeTag) {
        // For multi-file vetrine, we'll let the generateVetrinaDocumentTags handle it
        // For single-file vetrine, use the actual tag from the file
        const fileCount = vetrinaFiles?.length || 1;
        if (fileCount === 1) {
            const fileTag = fileData.tag;
            const displayTag = fileTag ? getDocumentTypeFromTag(fileTag) : 'Documento';
            docTypeTag.textContent = displayTag;
        }
        // For multi-file vetrine, the tags will be handled by generateVetrinaDocumentTags in the list view
    }
    
    // Update all details with VETRINA-level information in the specified order
    updateDetailValue('Facoltà', courseInfo.faculty_name || 'Non specificata');
    updateDetailValue('Corso', courseInfo.course_name || 'Non specificato');
    updateDetailValue('Lingua', courseInfo.language || 'Non specificata');
    
    // Handle canale display - show "Unico" if canale is "0"
    const canaleValue = courseInfo.canale === "0" ? "Unico" : (courseInfo.canale || 'Non specificato');
    updateDetailValue('Canale', canaleValue);
    
    updateDetailValue('Anno Accademico', getAcademicYear(courseInfo));
    
    // For single-file vetrine, add "Pagine" field after "Anno Accademico"
    if (fileCount === 1) {
        // Use the num_pages field from the backend
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
        `<span class="star ${i < rating ? 'filled' : ''}">★</span>`
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

    // Purchase/Download button logic for VETRINA
    if (isFree) {
        // For free vetrine: show primary button as download bundle, hide secondary download
        if (purchaseBtn) {
            purchaseBtn.innerHTML = `
                <span class="material-symbols-outlined">download</span>
                Download
            `;
            purchaseBtn.onclick = () => downloadVetrinaBundle(vetrinaData.vetrina_id || vetrinaData.id);
        }
        // Hide secondary download button for free vetrine
        if (downloadBtn) {
            downloadBtn.style.display = 'none';
        }
    } else {
        // For paid vetrine: show primary as purchase bundle, show secondary download
        if (purchaseBtn) {
            purchaseBtn.innerHTML = `Acquista Bundle`;
            purchaseBtn.onclick = () => handleVetrinaPurchase(vetrinaData.vetrina_id || vetrinaData.id, totalPrice);
        }
        // Show secondary download button for paid vetrine (after purchase)
        if (downloadBtn) {
            downloadBtn.style.display = 'flex';
            downloadBtn.onclick = () => downloadVetrinaBundle(vetrinaData.vetrina_id || vetrinaData.id);
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
        showNotification('Errore: ID vetrina non trovato', 'error');
        return;
    }
    
    const purchaseBtn = document.getElementById('purchaseBtn');
    
    if (totalPrice === 0) {
        // Free vetrina - direct download
        downloadVetrinaBundle(vetrinaId);
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
            showNotification('Acquisto vetrina completato con successo!', 'success');
            
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

// Download vetrina bundle
async function downloadVetrinaBundle(vetrinaId) {
    if (!vetrinaId) {
        showNotification('Errore: ID vetrina non trovato', 'error');
        return;
    }

    showNotification('Inizio del download del bundle...', 'info');

    try {
        // In a real implementation, this would call the vetrina download endpoint
        // For now, we'll simulate the download
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate download delay
        
        showNotification('Download del bundle completato!', 'success');
        
        // In a real implementation, this would trigger the actual download
        // const url = `${API_BASE}/vetrine/${vetrinaId}/download`;
        // window.open(url, '_blank');
        
    } catch (error) {
        console.error('Download vetrina bundle error:', error);
        showNotification('Errore nel download del bundle', 'error');
    }
}



// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

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
        updateHeaderUserInfo(user);
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
        updateHeaderUserInfo(userData);

        if (!docData) {
            throw new Error('Impossibile caricare i dati del documento.');
        }

        currentDocument = docData.document;
        currentVetrina = docData.vetrina;
        currentVetrinaFiles = docData.vetrinaFiles || [];
        documentData = docData; // Store for toggling

        // Debug logging removed

        // Check if this vetrina has multiple files
        const hasMultipleFiles = currentVetrinaFiles.length > 1;
        
        if (hasMultipleFiles) {
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
        
        return `
            <div class="document-list-item" data-file-id="${file.file_id}" data-action="open-viewer">
                <div class="document-list-preview">
                    <div class="document-list-icon">
                        <span class="document-icon">${documentIcon}</span>
                        <div class="file-extension-badge">${fileExtension}</div>
                    </div>
                </div>
                <div class="document-list-content">
                    <div class="document-list-header">
                        <h3 class="document-list-title">${displayFilename}</h3>
                        <div class="document-list-type">${fileType}</div>
                    </div>
                    <div class="document-list-meta">
                        ${file.num_pages && file.num_pages > 0 && file.extension === 'pdf' ? `
                            <span class="document-list-pages">${file.num_pages} pagine</span>
                        ` : ''}
                        ${file.price && file.price > 0 ? `
                            <span class="document-list-separator">•</span>
                            <span class="document-list-price">€${file.price.toFixed(2)}</span>
                        ` : ''}
                    </div>
                    <div class="document-list-actions">
                        <button class="document-list-btn primary" data-action="open-viewer" data-file-id="${file.file_id}">
                            <span class="material-symbols-outlined">visibility</span>
                            Visualizza
                        </button>
                        <button class="document-list-btn secondary" data-action="download-single" data-file-id="${file.file_id}">
                            <span class="material-symbols-outlined">download</span>
                            Download
                        </button>
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
                    <button class="document-list-header-btn primary" id="downloadAllBtn" title="Download tutti i file">
                        <span class="material-symbols-outlined">download</span>
                        Download Bundle
                    </button>
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

                <!-- Premium Action Buttons -->
                <div class="doc-actions">
                    <button class="action-btn cart" id="addToCartBtn">
                        Aggiungi al Carrello
                    </button>
                    <button class="action-btn primary" id="purchaseBtn">
                        Acquista Bundle
                    </button>
                    <!-- Hidden download button (controlled by JS) -->
                    <button class="action-btn secondary" id="downloadBtn" style="display: none;">
                        <span class="material-symbols-outlined">download</span>
                        <span>Download</span>
                    </button>
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
}

// New function to handle normal single-file viewer mode
function renderDocumentViewerMode(docData) {
    const mainContainer = document.querySelector('.preview-main');
        const vetrinaFiles = docData.vetrinaFiles || [];
    const currentDocument = docData.document;

    const viewerLeftControlsHTML = renderViewerLeftControls(vetrinaFiles, currentDocument.file_id);
        
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
            
            <div class="document-info-sidebar">
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

                    <!-- Premium Action Buttons -->
                    <div class="doc-actions">
                        <button class="action-btn cart" id="addToCartBtn">
                            Aggiungi al Carrello
                        </button>
                        <button class="action-btn primary" id="purchaseBtn">
                            Acquista Ora
                        </button>
                        <!-- Hidden download button (controlled by JS) -->
                        <button class="action-btn secondary" id="downloadBtn" style="display: none;">
                            <span class="material-symbols-outlined">download</span>
                            <span>Download</span>
                        </button>
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
            console.error('No file_id found in currentDocument:', currentDocument);
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

// Function to download a single document
async function downloadSingleDocument(fileId) {
    try {
        const response = await fetch(`${API_BASE}/files/${fileId}/download`, {
            headers: {
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            }
        });
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        // Create a temporary form to handle the download (CSP compliant)
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
        filenameInput.value = `document_${fileId}`;
        form.appendChild(filenameInput);
        
        // Submit the form
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        
        showNotification('Download avviato con successo!', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Errore durante il download', 'error');
    }
}

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
                            ${createGradientAvatar(
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
    if (!currentVetrinaForReviews || selectedRating === 0) {
        showNotification('Seleziona una valutazione prima di inviare la recensione.', 'error');
        return;
    }
    
    const comment = document.getElementById('reviewComment').value.trim();
    if (!comment) {
        showNotification('Inserisci un commento per la tua recensione.', 'error');
        return;
    }
    
    try {
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            showNotification('Sessione scaduta. Effettua nuovamente l\'accesso.', 'error');
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
            showNotification(message, 'success');
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
            
            // Update currentReviews immediately with the new review
            if (data.msg === 'Review updated') {
                // Update existing review
                const existingIndex = currentReviews.findIndex(review => 
                    review.user?.user_id === currentUser.user_id
                );
                if (existingIndex !== -1) {
                    currentReviews[existingIndex] = newReview;
                }
            } else {
                // Add new review
                currentReviews.push(newReview);
            }
            
            // Update currentUserReview
            currentUserReview = newReview;
            
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
            showNotification('Sessione scaduta. Effettua nuovamente l\'accesso.', 'error');
            return;
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Errore nell\'invio della recensione.', 'error');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showNotification('Errore di connessione. Riprova più tardi.', 'error');
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
        showNotification('Sessione scaduta. Effettua nuovamente l\'accesso.', 'error');
        return;
    }
    
    if (!confirm('Sei sicuro di voler eliminare la tua recensione?')) {
        return;
    }
    
    try {
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            showNotification('Sessione scaduta. Effettua nuovamente l\'accesso.', 'error');
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
            showNotification('Recensione eliminata con successo!', 'success');
            
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
            showNotification('Sessione scaduta. Effettua nuovamente l\'accesso.', 'error');
            return;
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Errore nell\'eliminazione della recensione.', 'error');
        }
    } catch (error) {
        console.error('Error deleting review:', error);
        showNotification('Errore di connessione. Riprova più tardi.', 'error');
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
        showNotification('Errore: ID file non trovato', 'error');
        return;
    }

    const favoriteBtn = document.getElementById('favoriteBtn');
    if (!favoriteBtn) {
        showNotification('Errore: Pulsante preferiti non trovato', 'error');
        return;
    }
    
    if (!currentVetrina) {
        console.error('❌ Current vetrina is missing:', currentVetrina);
        showNotification('Errore: Dati vetrina non disponibili. Ricarica la pagina.', 'error');
        return;
    }
    
    // Get the vetrina ID from either id or vetrina_id field
    const vetrinaId = currentVetrina.id || currentVetrina.vetrina_id;
    if (!vetrinaId) {
        console.error('❌ Current vetrina has no ID field:', currentVetrina);
        showNotification('Errore: ID vetrina non trovato. Ricarica la pagina.', 'error');
        return;
    }

    // Optimistically update UI
    const isActive = favoriteBtn.classList.toggle('active');
    favoriteBtn.setAttribute('title', isActive ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti');

    // Set a flag to notify the search page
    sessionStorage.setItem('favoritesChanged', 'true');

    try {
        const response = await makeRequest(`${API_BASE}/user/favorites/vetrine/${vetrinaId}`, {
            method: isActive ? 'POST' : 'DELETE'
            });

        if (response) {
            // Update the favorite state in the UI based on the action
            if (isActive) {
                // We just added a favorite, so keep button active
                favoriteBtn.classList.add('active');
                favoriteBtn.title = 'Rimuovi dai Preferiti';
                showNotification('Aggiunto ai preferiti! ❤️', 'success');
            } else {
                // We just removed a favorite, so keep button inactive
                favoriteBtn.classList.remove('active');
                favoriteBtn.title = 'Aggiungi ai Preferiti';
                showNotification('Rimosso dai preferiti 💔', 'success');
            }
            
            // Update the current document's favorite status
            currentDocument.favorite = isActive; // isActive is the new state
            
            // Mark that favorites have been changed so search page knows to refresh
            sessionStorage.setItem('favoritesChanged', 'true');
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        
        // Revert the optimistic UI update
        favoriteBtn.classList.toggle('active'); // Toggle back to original state
        favoriteBtn.setAttribute('title', isActive ? 'Aggiungi ai preferiti' : 'Rimuovi dai preferiti');
        
        // Show specific error message based on error type
        if (error.message.includes('Load failed') || error.message.includes('Failed to fetch')) {
            showNotification('Errore di connessione al server. Verifica la tua connessione e riprova.', 'error');
        } else if (error.message.includes('500')) {
            showNotification('Errore del server. Il servizio preferiti è temporaneamente non disponibile. Riprova più tardi.', 'error');
        } else {
        showNotification('Errore durante l\'aggiornamento dei preferiti. Riprova più tardi.', 'error');
    }
    }
}

async function handleAddToCart() {
    if (!currentVetrina || !(currentVetrina.vetrina_id || currentVetrina.id)) {
        showNotification('Errore: ID vetrina non trovato', 'error');
        return;
    }

    const addToCartBtn = document.getElementById('addToCartBtn');
    if (!addToCartBtn) {
        showNotification('Errore: Pulsante carrello non trovato', 'error');
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
        
        showNotification('Bundle aggiunto al carrello!', 'success');
        
        // Update cart count in header (if cart indicator exists)
        updateCartCount();
        
    } catch (error) {
        console.error('Add to cart error:', error);
        
        // Revert UI on error
        addToCartBtn.classList.remove('added');
        addToCartBtn.innerHTML = `Aggiungi al Carrello`;
        addToCartBtn.disabled = false;
        
        showNotification('Errore nell\'aggiunta del bundle al carrello. Riprova.', 'error');
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
            showNotification('Link copiato negli appunti!', 'success');
        });
    }
}

async function downloadRedactedDocument(fileId) {
    if (!fileId) {
        showNotification('Nessun file disponibile per il download', 'error');
        return;
    }

    showNotification('Inizio del download del documento redatto...', 'info');

    try {
        const url = `${API_BASE}/files/${fileId}/download/redacted`;
        const response = await fetch(url, {
            headers: {
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `redacted-document-${fileId}.pdf`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch && filenameMatch.length > 1) {
                filename = filenameMatch[1];
            }
        }
        
        // Create a temporary form to handle the download (CSP compliant)
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
        filenameInput.value = filename;
        form.appendChild(filenameInput);
        
        // Submit the form
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);

        showNotification('Download completato!', 'success');
    } catch (error) {
        console.error('Download redacted error:', error);
        showNotification('Errore nel download del documento redatto', 'error');
    }
}

async function downloadDocument(fileId) {
    if (!fileId) {
        showNotification('Nessun file disponibile per il download', 'error');
        return;
    }
    
    try {
        const response = await makeRequest(`${API_BASE}/files/${fileId}/download`, {
            method: 'GET'
        });
        
        if (response.download_url) {
            window.open(response.download_url, '_blank');
            showNotification('Download avviato', 'success');
        } else {
            showNotification('Download avviato', 'success');
        }
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Errore nel download del documento', 'error');
    }
}

// Download all files in the vetrina
async function downloadAllVetrinaFiles(vetrinaId, vetrinaFiles) {
    if (!vetrinaId || !vetrinaFiles || vetrinaFiles.length === 0) {
        showNotification('Nessun file disponibile per il download', 'error');
        return;
    }

    showNotification('Inizio del download del bundle...', 'info');

    try {
        // Check if the vetrina is free (all files have price 0)
        const isFree = vetrinaFiles.every(file => (file.price || 0) === 0);
        
        // Download each file individually
        for (let i = 0; i < vetrinaFiles.length; i++) {
            const file = vetrinaFiles[i];
            const fileName = extractOriginalFilename(file.filename);
            
            try {
                if (isFree) {
                    // For free vetrine, download the original file
                    await downloadSingleFile(file.file_id, fileName, false);
                } else {
                    // For paid vetrine, download the redacted version
                    await downloadSingleFile(file.file_id, fileName, true);
                }
                
                // Add a small delay between downloads to avoid overwhelming the server
                if (i < vetrinaFiles.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error(`Error downloading file ${fileName}:`, error);
                showNotification(`Errore nel download di ${fileName}`, 'error');
            }
        }
        
        showNotification('Download del bundle completato!', 'success');
    } catch (error) {
        console.error('Download bundle error:', error);
        showNotification('Errore nel download del bundle', 'error');
    }
}

// Helper function to download a single file
async function downloadSingleFile(fileId, fileName, isRedacted = false) {
    const endpoint = isRedacted ? 'download/redacted' : 'download';
    const url = `${API_BASE}/files/${fileId}/${endpoint}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Get the blob from the response
        const blob = await response.blob();
        
        // Create a download link
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        
        // Trigger the download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        window.URL.revokeObjectURL(downloadUrl);
        
    } catch (error) {
        console.error(`Error downloading file ${fileName}:`, error);
        throw error;
    }
}

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
        showNotification('Documento aggiunto al carrello! 🛒', 'success');
        
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
        showNotification('Errore nell\'aggiunta al carrello. Riprova.', 'error');
        
        // Reset button after 2 seconds
        setTimeout(() => {
            button.classList.remove('error');
            btnText.textContent = 'Aggiungi';
            icon.textContent = 'add_shopping_cart';
        }, 2000);
    }
}

// Reading Position Management
// Reading Position Management
