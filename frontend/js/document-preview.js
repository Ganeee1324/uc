// ============================================
// WORLD-CLASS DYNAMIC DOCUMENT PREVIEW SYSTEM
// ============================================

const API_BASE = 'http://146.59.236.26:5000';
let authToken = localStorage.getItem('authToken');

// Document State Management
let currentDocument = null;
let currentVetrina = null;
let currentVetrinaFiles = []; // Store vetrina files for bundle operations
let currentUser = null; // Store current user data for review comparisons
let currentPage = 1;
let totalPages = 1;
let currentZoom = 100;
let documentPages = [];
let isLoading = false;
let documentData = null; // Store document data
let bottomOverlayTimeout = null;

// Configuration
const ZOOM_CONFIG = {
    min: 50,
    max: 200,
    step: 25
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
                ${actionCallback ? `<button class="retry-btn" onclick="(${actionCallback})()">
                    <span class="material-symbols-outlined">refresh</span>
                    ${actionText}
                </button>` : ''}
            </div>
        `;
    }
}

// Professional API Request Handler
async function makeRequest(url, options = {}) {
    try {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (!response.ok) {
            if (response.status === 401) {
                handleAuthError();
                return null;
            }
            
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

// Zoom System
function initializeZoom() {
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            adjustZoom(ZOOM_CONFIG.step);
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            adjustZoom(-ZOOM_CONFIG.step);
        });
    }
    
    updateZoomDisplay();
}

function adjustZoom(delta) {
    const viewerElement = document.getElementById('documentViewer');
    if (!viewerElement) return;
    
    // Calculate new zoom level
    const newZoom = Math.max(ZOOM_CONFIG.min, Math.min(ZOOM_CONFIG.max, currentZoom + delta));
    
    if (newZoom !== currentZoom) {
        currentZoom = newZoom;
        
        // Apply zoom to the PDF zoom container
        const zoomContainer = viewerElement.querySelector('.pdf-zoom-container');
        if (zoomContainer) {
            const scale = currentZoom / 100;
            
            // Apply zoom transformation to the container
            zoomContainer.style.transform = `scale(${scale})`;
            zoomContainer.style.transformOrigin = 'center top';
            
            // Calculate the scaled dimensions
            const originalHeight = 800; // Original PDF height
            const scaledHeight = originalHeight * scale;
            
            // Set the container height to accommodate the scaled content
            zoomContainer.style.height = `${scaledHeight}px`;
            zoomContainer.style.minHeight = `${scaledHeight}px`;
            
            // Ensure the container takes full width and centers content
            zoomContainer.style.width = '100%';
            zoomContainer.style.display = 'flex';
            zoomContainer.style.justifyContent = 'center';
            zoomContainer.style.alignItems = 'flex-start';
        }
        
        // Update zoom level display and button states
        updateZoomDisplay();
        
        // Save zoom level to localStorage
        if (currentDocument && currentDocument.file_id) {
            localStorage.setItem(`file-${currentDocument.file_id}-zoom`, currentZoom);
        }
    }
}

// Update zoom level and apply transformations
function updateZoomDisplay() {
    const zoomLevelText = document.querySelector('.zoom-level');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');

    if (zoomLevelText) {
        zoomLevelText.textContent = `${currentZoom}%`;
    }
    
    // Update zoom button states
    if (zoomInBtn) {
        zoomInBtn.disabled = currentZoom >= ZOOM_CONFIG.max;
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.disabled = currentZoom <= ZOOM_CONFIG.min;
    }
}

// Fullscreen System
function initializeFullscreen() {
    // Add a small delay to ensure DOM is ready
    setTimeout(() => {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        console.log('Initializing fullscreen button:', fullscreenBtn);
        
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', (e) => {
                console.log('Fullscreen button clicked!');
                e.preventDefault();
                e.stopPropagation();
                
                const documentViewer = document.querySelector('.document-viewer-section');
                
                if (!document.fullscreenElement) {
                    // Enter fullscreen with animation
                    if (documentViewer.requestFullscreen) {
                        documentViewer.requestFullscreen();
                    } else if (documentViewer.webkitRequestFullscreen) {
                        documentViewer.webkitRequestFullscreen();
                    } else if (documentViewer.msRequestFullscreen) {
                        documentViewer.msRequestFullscreen();
                    }
                    
                    // Add smooth transition class
                    setTimeout(() => {
                        documentViewer.classList.add('fullscreen-active');
                    }, 100);
                    
                    fullscreenBtn.innerHTML = '<span class="material-symbols-outlined">fullscreen_exit</span>';
                } else {
                    // Exit fullscreen
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    }
                    
                    // Remove smooth transition class
                    documentViewer.classList.remove('fullscreen-active');
                    
                    fullscreenBtn.innerHTML = '<span class="material-symbols-outlined">fullscreen</span>';
                }
            });
        }
    }, 100);
}

// Load redacted PDF with authentication
async function loadRedactedPdf(fileId, viewerElementId) {
    const viewerElement = document.getElementById(viewerElementId);
    if (!viewerElement) {
        console.error('PDF viewer element not found:', viewerElementId);
        return;
    }
    
    try {
        console.log('🔒 Fetching redacted PDF for file ID:', fileId);
        
        // Fetch PDF with authentication
        const response = await fetch(getRedactedPdfUrl(fileId), {
            headers: {
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Create blob from response
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        console.log('✅ PDF loaded successfully, creating viewer');
        
        // Replace loading content with PDF viewer
        viewerElement.innerHTML = `
            <div class="pdf-zoom-container">
                <embed src="${objectUrl}" type="application/pdf" width="100%" height="800px">
            </div>
            <div class="pdf-fallback">
                <p>Il tuo browser non supporta la visualizzazione PDF.</p>
                <a href="${objectUrl}" target="_blank" class="pdf-download-btn">
                    <span class="material-symbols-outlined">download</span>
                    Scarica PDF
                </a>
            </div>
        `;
        
        // Clean up object URL after some time to prevent memory leaks
        setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
        }, 60000); // Clean up after 1 minute
        
    } catch (error) {
        console.error('❌ Failed to load redacted PDF:', error);
        
        // Show error message
        viewerElement.innerHTML = `
            <div class="pdf-error">
                <div class="error-icon">📄</div>
                <h3>Errore nel caricamento</h3>
                <p>Non è stato possibile caricare il documento redatto.</p>
                <p class="error-details">${error.message}</p>
                <button class="retry-btn" onclick="loadRedactedPdf(${fileId}, '${viewerElementId}')">
                    <span class="material-symbols-outlined">refresh</span>
                    Riprova
                </button>
            </div>
        `;
    }
}

// Authentication Handler
function handleAuthError() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// User Data Management
async function fetchCurrentUserData() {
    const cachedUser = localStorage.getItem('currentUser');
    if (cachedUser) {
        return JSON.parse(cachedUser);
    }

    // If cache is empty, handle as an auth error because user should be logged in
    handleAuthError();
    return null;
}

function updateHeaderUserInfo(user) {
    if (!user) return;

    const userNameElem = document.querySelector('.user-name');
    const userAvatarElem = document.querySelector('#userAvatar');

    if (userNameElem) {
        userNameElem.textContent = user.username || 'User';
    }

    if (userAvatarElem) {
        // Check if there's already an SVG inside the avatar element
        const existingSvg = userAvatarElem.querySelector('svg');
        if (!existingSvg) {
            // Only set the initial if there's no SVG inside
            const initial = user.username ? user.username.charAt(0).toUpperCase() : 'U';
            userAvatarElem.textContent = initial;
        }
        // If SVG exists, leave it as is - don't modify the content
    }

    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleAuthError);
    }
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
    
    // Calculate total price for the vetrina (sum of all files)
    const totalPrice = vetrinaFiles?.reduce((sum, file) => sum + (file.price || 0), 0) || 0;

    const starsContainer = document.querySelector('.rating-stars');
    if(starsContainer) starsContainer.innerHTML = generateFractionalStars(rating);
    
    const ratingScore = document.querySelector('.rating-score');
    if(ratingScore) ratingScore.textContent = rating.toFixed(1);

    const ratingCount = document.querySelector('.rating-count');
    if(ratingCount) ratingCount.textContent = `(${reviewCount})`;

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
        // For single files, we need to determine page count
        // Since we're using redacted PDFs, we'll show a placeholder or estimate
        const pageCount = fileData.pages || 'N/A';
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

// Reading Position Management
function saveReadingPosition() {
    if (currentDocument) {
        const fileId = currentDocument.file_id;
        localStorage.setItem(`file-${fileId}-zoom`, currentZoom);
    }
}

function loadReadingPosition() {
    if (currentDocument) {
        const fileId = currentDocument.file_id;
        const savedZoom = localStorage.getItem(`file-${fileId}-zoom`);
        
        if (savedZoom) {
            currentZoom = parseInt(savedZoom);
            adjustZoom(0); // Apply zoom
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

    // Calculate total price for the vetrina using vetrinaFiles from docData
    const totalPrice = currentVetrinaFiles?.reduce((sum, file) => sum + (file.price || 0), 0) || 0;
    const isFree = totalPrice === 0;

    // Purchase/Download button logic for VETRINA
    if (isFree) {
        // For free vetrine: show primary button as download bundle, hide secondary download
        if (purchaseBtn) {
            purchaseBtn.innerHTML = `
                <span class="material-symbols-outlined">download</span>
                Download Bundle
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
            <button class="action-btn-icon" id="overlayDownloadBtn" title="Download Document" onclick="downloadRedactedDocument(${currentFileId})">
                <span class="material-symbols-outlined">download</span>
            </button>
        </div>
    `;
}

// Main Initialization
async function initializeDocumentPreview() {
    if (!authToken) {
        handleAuthError();
        return;
    }

    const fileId = getFileIdFromUrl();
    if (!fileId) return;

    const mainContainer = document.querySelector('.preview-main');
    const existingLoader = mainContainer.querySelector('.document-preview-loader');

    try {
        // Fetch user and document data in parallel for faster loading
        const [userData, docData] = await Promise.all([
            fetchCurrentUserData(),
            fetchDocumentData(fileId)
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

        // Debug logging
        console.log('🔍 Document data loaded:', {
            documentId: currentDocument?.file_id,
            vetrinaId: currentVetrina?.vetrina_id,
            vetrinaIdField: currentVetrina?.id,
            vetrinaData: currentVetrina,
            vetrinaKeys: currentVetrina ? Object.keys(currentVetrina) : 'null',
            fileCount: currentVetrinaFiles.length
        });

        // Check if this vetrina has multiple files
        const hasMultipleFiles = currentVetrinaFiles.length > 1;
        
        if (hasMultipleFiles) {
            console.log('📚 Multiple files detected, showing document list view');
            // Show document list instead of viewer for multiple files
            renderDocumentListView(docData);
        } else {
            console.log('📄 Single file detected, showing document viewer');
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
                    <p>Il documento richiesto (ID: ${fileId}) non è più disponibile.</p>
                    <p>Probabilmente è stato aggiornato o rimosso dal database.</p>
                    <div class="error-actions">
                        <button class="retry-btn primary" onclick="window.location.href='document-preview.html?id=117'">
                            <span class="material-symbols-outlined">visibility</span>
                            Visualizza un documento di esempio
                        </button>
                        <button class="retry-btn secondary" onclick="window.location.href='search.html'">
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
        const fileType = getDocumentTypeFromFilename(file.filename);
        const fileExtension = getFileExtension(file.filename);
        const fileSize = formatFileSize(file.size || 0);
        const documentIcon = getDocumentPreviewIcon(file.filename);
        
        return `
            <div class="document-list-item" data-file-id="${file.file_id}" onclick="openDocumentViewer('${file.file_id}')">
                <div class="document-list-preview">
                    <div class="document-list-icon">
                        <span class="document-icon">${documentIcon}</span>
                        <div class="file-extension-badge">${fileExtension}</div>
                    </div>
                </div>
                <div class="document-list-content">
                    <div class="document-list-header">
                        <h3 class="document-list-title">${file.original_filename || file.filename}</h3>
                        <div class="document-list-type">${fileType}</div>
                    </div>
                    <div class="document-list-meta">
                        <span class="document-list-size">${fileSize}</span>
                        <span class="document-list-separator">•</span>
                        <span class="document-list-downloads">${file.download_count || 0} download</span>
                        ${file.price && file.price > 0 ? `
                            <span class="document-list-separator">•</span>
                            <span class="document-list-price">€${file.price.toFixed(2)}</span>
                        ` : ''}
                    </div>
                    <div class="document-list-actions">
                        <button class="document-list-btn primary" onclick="event.stopPropagation(); openDocumentViewer('${file.file_id}')">
                            <span class="material-symbols-outlined">visibility</span>
                            Visualizza
                        </button>
                        <button class="document-list-btn secondary" onclick="event.stopPropagation(); downloadSingleDocument('${file.file_id}')">
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
                        <div class="doc-rating-display" onclick="openReviewsOverlay()" title="Mostra recensioni">
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
                    <button class="close-overlay-btn" onclick="closeReviewsOverlay()">
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
                        <button class="add-review-btn" onclick="showAddReviewForm()">
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
                            <button class="cancel-review-btn" onclick="hideAddReviewForm()">Annulla</button>
                            <button class="submit-review-btn" onclick="submitReview()">Invia Recensione</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Now render the content into the newly created structure
    renderDocumentInfo(docData);
    
    // Initialize reviews overlay with real data
    initializeReviewsOverlay(docData.reviews || []);
    
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
                
                <!-- Viewer Controls Overlay -->
                <div class="viewer-overlay-controls">
                    ${viewerLeftControlsHTML}
                    <div class="viewer-controls-overlay">
                        <button class="zoom-btn" id="zoomOut" title="Zoom Out">
                            <span class="material-symbols-outlined">zoom_out</span>
                        </button>
                        <span class="zoom-level" id="zoomLevel">100%</span>
                        <button class="zoom-btn" id="zoomIn" title="Zoom In">
                            <span class="material-symbols-outlined">zoom_in</span>
                        </button>
                        <button class="fullscreen-btn" id="fullscreenBtn" title="Fullscreen">
                            <span class="material-symbols-outlined">fullscreen</span>
                        </button>
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
                            <div class="doc-rating-display" onclick="openReviewsOverlay()" title="Mostra recensioni">
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
                        <button class="close-overlay-btn" onclick="closeReviewsOverlay()">
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
                            <button class="add-review-btn" onclick="showAddReviewForm()">
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
                                <button class="cancel-review-btn" onclick="hideAddReviewForm()">Annulla</button>
                                <button class="submit-review-btn" onclick="submitReview()">Invia Recensione</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Now render the content into the newly created structure
        renderDocumentInfo(docData);
        
        // Load the redacted PDF for the current document
        if (currentDocument && currentDocument.file_id) {
            loadRedactedPdf(currentDocument.file_id, 'documentViewer');
        }

        // Populate file format badge
        const fileFormatBadge = document.getElementById('fileFormatBadge');
        if (fileFormatBadge && currentDocument) {
            const fileExtension = getFileExtension(currentDocument.original_filename || currentDocument.filename);
            fileFormatBadge.textContent = fileExtension;
        }

        showAndFadeBottomOverlay(); // show on load

        // Initialize controls
        initializeZoom();
        initializeFullscreen();
        
        const fileSwitcher = document.getElementById('file-switcher');
        if (fileSwitcher) {
            fileSwitcher.addEventListener('change', (event) => {
                const newFileId = event.target.value;
                if (newFileId) {
                    window.location.href = `document-preview.html?id=${newFileId}`;
                }
            });
        }
        
        // Initialize other systems
        initializeKeyboardNavigation();
        initializeTouchNavigation();
        
        // Load reading position
        loadReadingPosition();
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
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document_${fileId}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
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

console.log('Document Preview System - World Class Edition - Loaded Successfully');

// Reviews Overlay System
let currentUserRating = 0;
let reviewsData = [];

function initializeReviewsOverlay(reviews = []) {
    // Use real reviews data
    reviewsData = reviews;
    
    // Initialize star rating input
    initializeStarRating();
    
    // Close overlay when clicking outside
    const reviewsOverlay = document.getElementById('reviewsOverlay');
    if (reviewsOverlay) {
        reviewsOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'reviewsOverlay') {
                closeReviewsOverlay();
            }
        });
    }
}

// Review generation function removed - now using real backend data

function openReviewsOverlay() {
    const overlay = document.getElementById('reviewsOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Update overlay content
    updateReviewsOverlay();
}

function closeReviewsOverlay() {
    const overlay = document.getElementById('reviewsOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    
    // Hide add review form if open
    hideAddReviewForm();
}

function updateReviewsOverlay() {
    const totalReviews = reviewsData.length;
    const averageRating = totalReviews > 0 
        ? (reviewsData.reduce((sum, review) => sum + review.rating, 0) / totalReviews)
        : 0.0;
    
    // Update summary
    document.querySelector('.big-stars').innerHTML = generateFractionalStars(averageRating);
    document.querySelector('.big-rating-score').textContent = averageRating.toFixed(1);
    document.querySelector('.total-reviews').textContent = `Basato su ${totalReviews} recensioni`;
    
    // Update reviews list
    const reviewsList = document.getElementById('reviewsList');
    if (totalReviews === 0) {
        reviewsList.innerHTML = `
            <div class="no-reviews-message">
                <span class="material-symbols-outlined">rate_review</span>
                <p>Nessuna recensione disponibile per questo documento.</p>
                <p>Sii il primo a lasciare una recensione!</p>
            </div>
        `;
    } else {
        const reviewsHTML = reviewsData.map(review => {
            // Handle different data structures from backend
            const userName = review.user ? 
                `${review.user.first_name || review.user.username || 'Utente'} ${review.user.last_name || ''}`.trim() :
                'Utente Anonimo';
            const userInitial = userName.charAt(0).toUpperCase();
            const reviewText = review.review_text || review.comment || 'Nessun commento.';
            const reviewDate = review.review_date || review.created_at;
            const reviewSubject = review.review_subject;
            
            // Check if this is the current user's review (you could implement user comparison logic here)
            const isCurrentUserReview = review.user && currentUser && 
                (review.user.user_id === currentUser.user_id || review.user.username === currentUser.username);
            
            return `
                <div class="review-item-overlay" data-review-id="${review.id || ''}">
                    <div class="review-header-overlay">
                        <div class="reviewer-info-overlay">
                            <div class="reviewer-avatar-overlay">${userInitial}</div>
                            <div class="reviewer-details-overlay">
                                <span class="reviewer-name-overlay">${userName}</span>
                                ${reviewSubject ? `<span class="review-subject-overlay">${reviewSubject}</span>` : ''}
                                <div class="review-rating-overlay">
                                    ${generateStars(review.rating)}
                                </div>
                            </div>
                        </div>
                        <div class="review-date-actions">
                            <span class="review-date-overlay">${formatDate(reviewDate)}</span>
                            ${isCurrentUserReview ? `
                                <button class="delete-review-btn" onclick="deleteUserReview()" title="Elimina la tua recensione">
                                    <span class="material-symbols-outlined">delete</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <p class="review-text-overlay">${reviewText}</p>
                </div>
            `;
        }).join('');
        
        reviewsList.innerHTML = reviewsHTML;
    }
}

function showAddReviewForm() {
    document.getElementById('addReviewForm').style.display = 'block';
    document.getElementById('reviewsList').style.display = 'none';
    document.querySelector('.reviews-summary').style.display = 'none';
}

function hideAddReviewForm() {
    document.getElementById('addReviewForm').style.display = 'none';
    document.getElementById('reviewsList').style.display = 'block';
    document.querySelector('.reviews-summary').style.display = 'flex';
    
    // Reset form
    currentUserRating = 0;
    document.getElementById('reviewComment').value = '';
    updateStarRatingDisplay();
}

function initializeStarRating() {
    const starInputs = document.querySelectorAll('.star-input');
    starInputs.forEach(star => {
        star.addEventListener('click', () => {
            currentUserRating = parseInt(star.dataset.rating);
            updateStarRatingDisplay();
        });
        
        star.addEventListener('mouseenter', () => {
            const rating = parseInt(star.dataset.rating);
            highlightStars(rating);
        });
        
        star.addEventListener('mouseleave', () => {
            updateStarRatingDisplay();
        });
    });
}

function updateStarRatingDisplay() {
    const starInputs = document.querySelectorAll('.star-input');
    starInputs.forEach((star, index) => {
        if (index < currentUserRating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function highlightStars(rating) {
    const starInputs = document.querySelectorAll('.star-input');
    starInputs.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('hover');
        } else {
            star.classList.remove('hover');
        }
    });
}

async function submitReview() {
    const comment = document.getElementById('reviewComment').value.trim();
    
    if (currentUserRating === 0) {
        showNotification('Seleziona una valutazione', 'error');
        return;
    }
    
    if (comment.length < 10) {
        showNotification('Il commento deve contenere almeno 10 caratteri', 'error');
        return;
    }
    
    if (!currentVetrina || (!currentVetrina.vetrina_id && !currentVetrina.id)) {
        showNotification('Errore: impossibile identificare la vetrina', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('.submit-review-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Invio in corso...';
    }
    
    try {
        const vetrinaId = currentVetrina.vetrina_id || currentVetrina.id;
        
        // Call the backend API to submit review
        const response = await makeRequest(`${API_BASE}/vetrine/${vetrinaId}/reviews`, {
            method: 'POST',
            body: JSON.stringify({
                rating: currentUserRating,
                review_text: comment,
                review_subject: null // Could add subject field later
            })
        });
        
        if (response && response.review) {
            // Add the new review to the beginning of the list
            reviewsData.unshift(response.review);
            
            // Update the main page rating
            updateMainPageRating();
            
            // Hide form and show reviews
            hideAddReviewForm();
            
            // Show success message
            showNotification('Recensione inviata con successo!', 'success');
            
            // Update overlay
            updateReviewsOverlay();
            
            console.log('✅ Review submitted successfully:', response.review);
        }
        
    } catch (error) {
        console.error('❌ Error submitting review:', error);
        
        let errorMessage = 'Errore durante l\'invio della recensione.';
        
        if (error.message.includes('409')) {
            errorMessage = 'Hai già recensito questo documento.';
        } else if (error.message.includes('404')) {
            errorMessage = 'Documento non trovato.';
        } else if (error.message.includes('400')) {
            errorMessage = 'Dati della recensione non validi.';
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        // Reset submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Invia Recensione';
        }
    }
}

async function deleteUserReview() {
    if (!currentVetrina || (!currentVetrina.vetrina_id && !currentVetrina.id)) {
        showNotification('Errore: impossibile identificare la vetrina', 'error');
        return;
    }
    
    if (!confirm('Sei sicuro di voler eliminare la tua recensione?')) {
        return;
    }
    
    try {
        const vetrinaId = currentVetrina.vetrina_id || currentVetrina.id;
        
        // Call the backend API to delete review
        const response = await makeRequest(`${API_BASE}/vetrine/${vetrinaId}/reviews`, {
            method: 'DELETE'
        });
        
        if (response) {
            // Remove the user's review from the local data
            // Note: Backend deletes by user ID, so we need to find and remove the current user's review
            const currentUserData = await fetchCurrentUserData();
            if (currentUserData) {
                reviewsData = reviewsData.filter(review => 
                    !(review.user && (
                        review.user.user_id === currentUserData.user_id || 
                        review.user.username === currentUserData.username
                    ))
                );
            }
            
            // Update the main page rating
            updateMainPageRating();
            
            // Show success message
            showNotification('Recensione eliminata con successo!', 'success');
            
            // Update overlay
            updateReviewsOverlay();
            
            console.log('✅ Review deleted successfully');
        }
        
    } catch (error) {
        console.error('❌ Error deleting review:', error);
        
        let errorMessage = 'Errore durante l\'eliminazione della recensione.';
        
        if (error.message.includes('404')) {
            errorMessage = 'Recensione non trovata o non hai i permessi per eliminarla.';
        }
        
        showNotification(errorMessage, 'error');
    }
}

function updateMainPageRating() {
    const totalReviews = reviewsData.length;
    const averageRating = totalReviews > 0 
        ? (reviewsData.reduce((sum, review) => sum + review.rating, 0) / totalReviews)
        : 0.0;
    
    // Update main page elements
    const starsContainer = document.querySelector('.rating-stars');
    const ratingScore = document.querySelector('.rating-score');
    const ratingCount = document.querySelector('.rating-count');
    
    if (starsContainer) starsContainer.innerHTML = generateFractionalStars(averageRating);
    if (ratingScore) ratingScore.textContent = averageRating.toFixed(1);
    if (ratingCount) ratingCount.textContent = `(${totalReviews} ${totalReviews === 1 ? 'recensione' : 'recensioni'})`;
}

// Refresh reviews from backend
async function refreshReviews() {
    if (!currentVetrina || (!currentVetrina.vetrina_id && !currentVetrina.id)) {
        return;
    }
    
    try {
        const vetrinaId = currentVetrina.vetrina_id || currentVetrina.id;
        const reviewsResponse = await makeRequest(`${API_BASE}/vetrine/${vetrinaId}/reviews`);
        
        if (reviewsResponse && reviewsResponse.reviews) {
            reviewsData = reviewsResponse.reviews;
            updateMainPageRating();
            updateReviewsOverlay();
            console.log(`🔄 Refreshed ${reviewsData.length} reviews for vetrina ${vetrinaId}`);
        }
    } catch (error) {
        console.warn('Could not refresh reviews:', error);
    }
}

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
        console.log(`Attempting to ${isActive ? 'add' : 'remove'} favorite for vetrina: ${vetrinaId}`);
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
    console.log('🛒 Cart updated - document added');
    
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

        const blob = await response.blob();
        
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `redacted-document-${fileId}.pdf`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch && filenameMatch.length > 1) {
                filename = filenameMatch[1];
            }
        }
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

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
            <div class="related-doc-preview" onclick="window.location.href='document-preview.html?id=${doc.id}'">
                <div class="doc-preview-icon">
                    <span class="material-symbols-outlined">${doc.icon}</span>
                </div>
                <div class="doc-preview-overlay">
                    <span class="preview-price">€${doc.price}</span>
                </div>
            </div>
            <div class="related-doc-info">
                <div class="doc-content" onclick="window.location.href='document-preview.html?id=${doc.id}'">
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
                    <button class="related-cart-btn" onclick="addRelatedToCart(${doc.id}, event)">
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