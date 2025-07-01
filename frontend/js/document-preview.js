// ============================================
// WORLD-CLASS DYNAMIC DOCUMENT PREVIEW SYSTEM
// ============================================

const API_BASE = 'http://localhost:5000';

// Remove localStorage auth completely - now using secure HTTP-only cookies
// let authToken = localStorage.getItem('authToken'); // REMOVED - SECURITY VULNERABILITY

// Document State Management
let currentDocument = null;
let currentPage = 1;
let totalPages = 1;
let currentZoom = 100;
let documentPages = [];
let isLoading = false;
let csrfToken = null;

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

// CSRF Token Management
async function getCSRFToken() {
    if (!csrfToken) {
        try {
            const response = await fetch(`${API_BASE}/csrf-token`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                csrfToken = data.csrf_token;
            }
        } catch (error) {
            console.warn('Could not fetch CSRF token:', error);
        }
    }
    return csrfToken;
}

// Professional API Request Handler with Secure Authentication
async function makeRequest(url, options = {}) {
    try {
        const token = await getCSRFToken();
        
        const defaultOptions = {
            credentials: 'include', // Sends HTTP-only cookies automatically
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'X-CSRF-Token': token }) // CSRF protection
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (!response.ok) {
            if (response.status === 401) {
                handleAuthError();
                return null;
            }
            if (response.status === 403) {
                // Likely CSRF token expired, refresh and retry once
                csrfToken = null;
                const newToken = await getCSRFToken();
                if (newToken && options.retryCount !== 1) {
                    const retryOptions = {
                        ...options,
                        retryCount: 1,
                        headers: {
                            ...options.headers,
                            'X-CSRF-Token': newToken
                        }
                    };
                    return makeRequest(url, retryOptions);
                }
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// Authentication Handler - Secure logout
function handleAuthError() {
    // Clear any local session data (not auth tokens - those are HTTP-only)
    localStorage.removeItem('preferences');
    localStorage.removeItem('readingPositions');
    
    // Perform server-side logout to clear HTTP-only cookies
    fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include'
    }).finally(() => {
        window.location.href = 'login.html';
    });
}

// User Data Management - Always fetch fresh from server
async function fetchCurrentUserData() {
    try {
        // Always fetch fresh user data from server - no caching
        const userData = await makeRequest(`${API_BASE}/me`);
        return userData;
    } catch (error) {
        console.error('Failed to fetch user data:', error);
        handleAuthError();
        return null;
    }
}

// Session Validation
async function validateSession() {
    try {
        const user = await fetchCurrentUserData();
        if (!user) {
            throw new Error('Invalid session');
        }
        return user;
    } catch (error) {
        console.error('Session validation failed:', error);
        handleAuthError();
        return null;
    }
}

function updateHeaderUserInfo(user) {
    if (!user) return;

    const userNameElem = document.querySelector('.user-name');
    const userAvatarElem = document.querySelector('.user-avatar');

    if (userNameElem) {
        userNameElem.textContent = user.username || 'User';
    }

    if (userAvatarElem) {
        const initial = user.username ? user.username.charAt(0).toUpperCase() : 'U';
        userAvatarElem.textContent = initial;
    }

    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleSecureLogout);
    }
}

// Secure Logout Handler
function handleSecureLogout() {
    if (confirm('Sei sicuro di voler effettuare il logout?')) {
        fetch(`${API_BASE}/logout`, {
            method: 'POST',
            credentials: 'include'
        }).then(() => {
            // Clear local preferences (not auth data)
            localStorage.removeItem('preferences');
            localStorage.removeItem('readingPositions');
            window.location.href = 'login.html';
        }).catch(() => {
            // Even if logout fails, redirect to login
            window.location.href = 'login.html';
        });
    }
}

// URL Parameter Handler
function getFileIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('id');
    
    if (!fileId) {
        window.location.href = 'search.html';
        return null;
    }
    
    return parseInt(fileId);
}

// Document Data Fetcher - Enhanced to get complete information
async function fetchDocumentData(fileId) {
    try {
        // Fetch file data using the correct backend endpoint
        const fileResponse = await makeRequest(`${API_BASE}/files/${fileId}`);
        
        if (!fileResponse) {
            throw new Error('File not found');
        }

        // Fetch vetrina data to get course information
        let vetrinaData = null;
        if (fileResponse.vetrina_id) {
            try {
                vetrinaData = await makeRequest(`${API_BASE}/vetrine/${fileResponse.vetrina_id}`);
            } catch (error) {
                console.warn('Could not fetch vetrina data:', error);
            }
        }

        // For now, we'll use mock data for reviews and related since endpoints don't exist
        const mockReviews = [];
        const mockRelated = [];

        return {
            document: fileResponse,
            vetrina: vetrinaData,
            reviews: mockReviews,
            related: mockRelated
        };
    } catch (error) {
        console.error('Failed to fetch document data:', error);
        throw error;
    }
}

// Premium Document Renderer - Enhanced with complete information
function renderDocumentInfo(docData) {
    const { document: fileData, vetrina: vetrinaData } = docData;
    
    // Extract course information from vetrina if available
    const courseInfo = vetrinaData?.course_instance || {};
    
    // Update document title
    const title = vetrinaData?.name || fileData.filename || 'Documento Senza Titolo';
    const titleElement = document.querySelector('.doc-title');
    if (titleElement) titleElement.textContent = title;
    document.title = `${title} - StudyHub`;

    // Determine document type from filename
    const documentType = getDocumentTypeFromFilename(fileData.filename);
    
    // Update rating and price (mock data for now since no rating system exists yet)
    const rating = 4.2; // Mock rating
    const reviewCount = 127; // Mock review count
    const price = fileData.price || 0;

    const starsContainer = document.querySelector('.stars');
    if(starsContainer) starsContainer.innerHTML = generateStars(Math.floor(rating));
    
    const ratingScore = document.querySelector('.rating-score');
    if(ratingScore) ratingScore.textContent = rating.toFixed(1);

    const ratingCount = document.querySelector('.rating-count');
    if(ratingCount) ratingCount.textContent = `(${reviewCount} recensioni)`;

    const priceElement = document.querySelector('.price-value');
    if (priceElement) {
        if (price === 0) {
            priceElement.textContent = 'Gratuito';
            priceElement.classList.remove('paid');
        } else {
            priceElement.textContent = `€${price.toFixed(2)}`;
            priceElement.classList.add('paid');
        }
    }
    
    // Update all details (no longer expandable - all visible)
    updateDetailValue('Facoltà', courseInfo.faculty_name || 'Non specificata');
    updateDetailValue('Corso', courseInfo.course_name || 'Non specificato');
    updateDetailValue('Canale', courseInfo.canale || 'Non specificato');
    updateDetailValue('Tipo Documento', documentType);
    updateDetailValue('Anno Accademico', getAcademicYear(courseInfo));
    updateDetailValue('Autore', vetrinaData?.author?.username || 'Non specificato');
    updateDetailValue('Lingua', courseInfo.language || 'Non specificata');
    updateDetailValue('Semestre', courseInfo.course_semester || 'Non specificato');
    updateDetailValue('Pagine', `${totalPages} pagine`);
    updateDetailValue('Formato', getFileExtension(fileData.filename));
    updateDetailValue('Dimensione', formatFileSize(fileData.size || 0));
    updateDetailValue('Download', `${fileData.download_count || 0} volte`);
    updateDetailValue('Data Pubblicazione', formatDate(fileData.created_at));

    // Update description
    const description = vetrinaData?.description || 'Nessuna descrizione disponibile per questo documento.';
    const descriptionContainer = document.querySelector('.doc-description');
    if(descriptionContainer) {
        descriptionContainer.innerHTML = `<p>${description}</p>`;
    }
    
    // Set up action buttons with proper data
    setupActionButtons(fileData);
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

// Dynamic Document Pages Generator
function generateDocumentPages(docData) {
    // For now, we'll generate placeholder pages based on document type
    // In a real implementation, this would extract actual pages from the PDF/document
    
    const { document: fileData, vetrina: vetrinaData } = docData;
    const courseInfo = vetrinaData?.course_instance || {};
    
    const documentType = getFileExtension(fileData.filename);
    const courseDetails = {
        title: vetrinaData?.name || fileData.filename || 'Documento',
        course: courseInfo.course_name || 'Corso',
        professor: courseInfo.professors || 'Professore', 
        university: courseInfo.faculty_name || 'Università'
    };
    
    // Generate realistic content based on document type and course
    const pages = generateRealisticContent(courseDetails, documentType);
    totalPages = pages.length;
    
    return pages;
}

// Realistic Content Generator
function generateRealisticContent(courseInfo, documentType) {
    // For now, we'll use the academic content generator for all document types
    // This provides a consistent, professional document structure
    return generateAcademicContent(courseInfo);
}

// Academic Content Generator
function generateAcademicContent(courseInfo) {
    return [
        // Title Page
        {
            type: 'title',
            content: `
                <div class="page-header">
                    <h1>${courseInfo.title}</h1>
                    <h2>Appunti del Corso</h2>
                    <p class="page-subtitle">${courseInfo.professor} - ${courseInfo.university}</p>
                    <p class="page-subtitle">Corso: ${courseInfo.course}</p>
                </div>
                <div class="page-text">
                    <div class="intro-section">
                        <h3>Introduzione al Corso</h3>
                        <p>Questo documento contiene gli appunti completi del corso di <strong>${courseInfo.course}</strong>, 
                        tenuto dal <strong>${courseInfo.professor}</strong> presso ${courseInfo.university}.</p>
                        
                        <p>Gli appunti sono organizzati in modo sistematico per facilitare lo studio e la comprensione 
                        dei concetti fondamentali della materia.</p>
                        
                        <div class="course-info-box">
                            <h4>Informazioni sul Corso</h4>
                            <ul>
                                <li><strong>Denominazione:</strong> ${courseInfo.course}</li>
                                <li><strong>Docente:</strong> ${courseInfo.professor}</li>
                                <li><strong>Università:</strong> ${courseInfo.university}</li>
                                <li><strong>Tipologia:</strong> Appunti di lezione</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `
        },
        // Content Pages
        ...generateContentPages(courseInfo),
        // Summary Page
        {
            type: 'summary',
            content: `
                <div class="page-text">
                    <h3>Riepilogo e Conclusioni</h3>
                    <p>Questi appunti forniscono una panoramica completa degli argomenti trattati durante il corso di ${courseInfo.course}.</p>
                    
                    <h4>Punti Chiave</h4>
                    <ul>
                        <li>Concetti fondamentali della materia</li>
                        <li>Esempi pratici e applicazioni</li>
                        <li>Metodologie di studio consigliate</li>
                        <li>Bibliografia e risorse aggiuntive</li>
                    </ul>
                    
                    <div class="formula-box">
                        <p><strong>Nota:</strong> Questi appunti sono stati redatti con cura durante le lezioni, 
                        ma si consiglia sempre di integrare con il materiale ufficiale del corso e i testi di riferimento.</p>
                    </div>
                    
                    <p class="conclusion-text">Buono studio!</p>
                </div>
            `
        }
    ];
}

// Content Pages Generator
function generateContentPages(courseInfo) {
    const chapters = [
        {
            title: "Concetti Fondamentali",
            content: `
                <p>In questo capitolo vengono introdotti i concetti base necessari per la comprensione della materia.</p>
                
                <h4>Definizioni Principali</h4>
                <p>I termini e le definizioni che costituiscono il vocabolario essenziale del corso.</p>
                
                <div class="formula-box">
                    <p><strong>Definizione 1.1:</strong> Concetto fondamentale della disciplina che stabilisce le basi teoriche per lo sviluppo successivo.</p>
                </div>
                
                <h4>Principi Teorici</h4>
                <p>I principi teorici che governano la materia e le loro applicazioni pratiche nel contesto accademico e professionale.</p>
                
                <ul>
                    <li>Primo principio teorico e sue implicazioni</li>
                    <li>Secondo principio e relazioni con il precedente</li>
                    <li>Applicazioni pratiche dei principi studiati</li>
                </ul>
            `
        },
        {
            title: "Metodologie e Tecniche",
            content: `
                <p>Questo capitolo si concentra sulle metodologie operative e le tecniche pratiche utilizzate nella disciplina.</p>
                
                <h4>Approccio Metodologico</h4>
                <p>L'approccio sistematico allo studio e all'applicazione dei concetti teorici precedentemente illustrati.</p>
                
                <div class="formula-box">
                    <p><strong>Metodologia A:</strong> Procedimento strutturato per l'analisi e la risoluzione di problemi specifici del settore.</p>
                </div>
                
                <h4>Tecniche Operative</h4>
                <p>Le tecniche concrete per l'implementazione pratica delle metodologie studiate.</p>
                
                <ol>
                    <li>Prima fase: analisi preliminare del problema</li>
                    <li>Seconda fase: applicazione del framework teorico</li>
                    <li>Terza fase: verifica e validazione dei risultati</li>
                </ol>
                
                <p>Ogni tecnica deve essere applicata con rigore metodologico per garantire risultati affidabili e riproducibili.</p>
            `
        },
        {
            title: "Casi di Studio e Applicazioni",
            content: `
                <p>L'analisi di casi di studio reali permette di comprendere l'applicazione pratica dei concetti teorici.</p>
                
                <h4>Caso di Studio 1</h4>
                <p>Analisi dettagliata di un esempio concreto che illustra l'applicazione dei principi studiati in un contesto reale.</p>
                
                <div class="formula-box">
                    <p><strong>Scenario:</strong> Situazione pratica che richiede l'applicazione integrata delle metodologie e tecniche studiate.</p>
                    <p><strong>Soluzione:</strong> Approccio sistematico alla risoluzione del problema presentato.</p>
                </div>
                
                <h4>Lesson Learned</h4>
                <p>Le principali lezioni apprese dall'analisi dei casi di studio:</p>
                
                <ul>
                    <li>Importanza dell'approccio sistematico</li>
                    <li>Necessità di adattare le metodologie al contesto</li>
                    <li>Valore dell'esperienza pratica nell'apprendimento</li>
                    <li>Integrazione tra teoria e pratica</li>
                </ul>
                
                <p>Questi esempi dimostrano come i concetti teorici possano essere efficacemente applicati nella pratica professionale.</p>
            `
        }
    ];
    
    return chapters.map((chapter, index) => ({
        type: 'content',
        content: `
            <div class="page-text">
                <h3>${index + 2}. ${chapter.title}</h3>
                ${chapter.content}
            </div>
        `
    }));
}

// Document Pages Renderer - Fixed
function renderDocumentPages(pages) {
    const viewerContainer = document.querySelector('.viewer-container');
    if (!viewerContainer) return;
    
    viewerContainer.innerHTML = ''; // Clear previous content
    
    pages.forEach((page, index) => {
        const pageElement = document.createElement('div');
        pageElement.className = 'document-page';
        pageElement.setAttribute('data-page', index + 1);
        
        const pageContent = document.createElement('div');
        pageContent.className = 'page-content';
        
        // Handle both object format (with content property) and string format
        const content = typeof page === 'object' ? page.content : page;
        pageContent.innerHTML = content;
        
        pageElement.appendChild(pageContent);
        viewerContainer.appendChild(pageElement);
    });
    
    totalPages = pages.length;
}

// Reviews Renderer
function renderReviews(reviews) {
    const reviewsContainer = document.querySelector('.reviews-section');
    
    if (!reviews || reviews.length === 0) {
        reviewsContainer.innerHTML = `
            <h3>Recensioni</h3>
            <div class="no-reviews">
                <p>Nessuna recensione disponibile per questo documento.</p>
                <p>Sii il primo a lasciare una recensione!</p>
            </div>
        `;
        return;
    }
    
    const reviewsHTML = reviews.slice(0, 3).map(review => `
        <div class="review-item">
            <div class="review-header">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">${(review.author_name || 'U').charAt(0).toUpperCase()}</div>
                    <div class="reviewer-details">
                        <span class="reviewer-name">${review.author_name || 'Utente Anonimo'}</span>
                        <div class="review-rating">
                            ${generateStars(Math.floor(review.rating || 0))}
                        </div>
                    </div>
                </div>
                <span class="review-date">${formatDate(review.created_at)}</span>
            </div>
            <p class="review-text">${review.comment || 'Recensione senza commento.'}</p>
        </div>
    `).join('');
    
    reviewsContainer.innerHTML = `
        <h3>Recensioni Recenti</h3>
        ${reviewsHTML}
        ${reviews.length > 3 ? `
            <button class="show-more-reviews" onclick="showAllReviews()">
                Mostra tutte le recensioni (${reviews.length})
                <span class="material-symbols-outlined">expand_more</span>
            </button>
        ` : ''}
    `;
}

// Related Documents Renderer
function renderRelatedDocuments(relatedDocs) {
    const relatedContainer = document.querySelector('.related-docs');
    
    if (!relatedDocs || relatedDocs.length === 0) {
        relatedContainer.innerHTML = `
            <h3>Documenti Correlati</h3>
            <div class="no-related">
                <p>Nessun documento correlato trovato.</p>
            </div>
        `;
        return;
    }
    
    const relatedHTML = relatedDocs.slice(0, 3).map(doc => `
        <div class="related-doc-item" onclick="window.location.href='document-preview.html?id=${doc.id}'">
            <div class="related-doc-preview"></div>
            <div class="related-doc-info">
                <h4>${doc.name || doc.title || 'Documento Senza Titolo'}</h4>
                <p>${doc.owner_username || doc.author_username || 'Autore Sconosciuto'} • €${(doc.price || 0).toFixed(2)}</p>
                <div class="related-doc-rating">
                    <span class="stars">${generateStars(Math.floor(doc.rating || 0))}</span>
                    <span>${(doc.rating || 0).toFixed(1)}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    relatedContainer.innerHTML = `
        <h3>Documenti Correlati</h3>
        ${relatedHTML}
    `;
}

// Navigation System
function updateNavigationElements() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentPageSpan = document.querySelector('.current-page');
    const totalPagesSpan = document.querySelector('.total-pages');
    
    if (prevBtn) prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
    
    updatePageDisplay();
}

function goToPage(pageNumber) {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage) {
        currentPage = pageNumber;
        updatePageDisplay();
        
        // Smooth scroll to top
        const documentViewer = document.getElementById('documentViewer');
        if (documentViewer) {
            documentViewer.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        // Save reading position
        saveReadingPosition();
    }
}

function updatePageDisplay() {
    // Hide all pages
    document.querySelectorAll('.document-page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show current page
    const currentPageElement = document.querySelector(`[data-page="${currentPage}"]`);
    if (currentPageElement) {
        currentPageElement.classList.add('active');
    }
    
    // Update navigation
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentPageSpan = document.querySelector('.current-page');
    
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    if (currentPageSpan) currentPageSpan.textContent = currentPage;
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
    const newZoom = Math.max(ZOOM_CONFIG.min, Math.min(ZOOM_CONFIG.max, currentZoom + delta));
    if (newZoom !== currentZoom) {
        currentZoom = newZoom;
        updateZoomDisplay();
        saveReadingPosition();
    }
}

function updateZoomDisplay() {
    const zoomLevelSpan = document.querySelector('.zoom-level');
    const viewerContainer = document.querySelector('.viewer-container');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    
    if (zoomLevelSpan) {
        zoomLevelSpan.textContent = `${currentZoom}%`;
    }
    
    if (viewerContainer) {
        viewerContainer.style.transform = `scale(${currentZoom / 100})`;
        viewerContainer.style.transformOrigin = 'top center';
        viewerContainer.style.transition = 'transform 0.3s ease-out';
    }
    
    if (zoomInBtn) {
        zoomInBtn.disabled = currentZoom >= ZOOM_CONFIG.max;
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.disabled = currentZoom <= ZOOM_CONFIG.min;
    }
}

// Initialize Back Button
function initializeBackButton() {
    const backBtn = document.getElementById('backBtn');
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // Try to go back in history, fallback to search page
            if (document.referrer && document.referrer.includes('search.html')) {
                window.history.back();
            } else {
                window.location.href = 'search.html';
            }
        });
    }
}

// Enhanced Fullscreen with smooth transitions
function initializeFullscreen() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
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
                // Exit fullscreen with animation
                documentViewer.classList.remove('fullscreen-active');
                
                setTimeout(() => {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    }
                }, 200);
                
                fullscreenBtn.innerHTML = '<span class="material-symbols-outlined">fullscreen</span>';
            }
        });
        
        // Listen for fullscreen changes with smooth transitions
        const handleFullscreenChange = () => {
            const fullscreenBtn = document.getElementById('fullscreenBtn');
            const documentViewer = document.querySelector('.document-viewer-section');
            
            if (fullscreenBtn && documentViewer) {
                if (document.fullscreenElement) {
                    fullscreenBtn.innerHTML = '<span class="material-symbols-outlined">fullscreen_exit</span>';
                    documentViewer.classList.add('fullscreen-active');
                } else {
                    fullscreenBtn.innerHTML = '<span class="material-symbols-outlined">fullscreen</span>';
                    documentViewer.classList.remove('fullscreen-active');
                }
            }
        };
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    }
}

// Utility Functions
function generateStars(rating) {
    return Array.from({ length: 5 }, (_, i) => 
        `<span class="star ${i < rating ? 'filled' : ''}">★</span>`
    ).join('');
}

function generateDocumentTags(docData) {
    const tags = [];
    
    // Add course-based tags from vetrina data
    const courseName = (docData.course_name || docData.name || '').toLowerCase();
    if (courseName) {
        if (courseName.includes('matematica')) tags.push('Matematica');
        if (courseName.includes('fisica')) tags.push('Fisica');
        if (courseName.includes('informatica')) tags.push('Informatica');
        if (courseName.includes('economia')) tags.push('Economia');
        if (courseName.includes('diritto')) tags.push('Diritto');
        if (courseName.includes('medicina')) tags.push('Medicina');
        if (courseName.includes('ingegneria')) tags.push('Ingegneria');
        if (courseName.includes('letteratura')) tags.push('Letteratura');
        if (courseName.includes('storia')) tags.push('Storia');
        if (courseName.includes('filosofia')) tags.push('Filosofia');
    }
    
    // Add type-based tags from files
    const docType = docData.files && docData.files[0] ? getFileExtension(docData.files[0].filename) : 'PDF';
    tags.push(docType.toUpperCase());
    
    // Add university tag
    if (docData.faculty || docData.faculty_name) {
        tags.push('Università');
    }
    
    // Add generic tags
    tags.push('Appunti', 'Studio');
    
    return [...new Set(tags)].slice(0, 8); // Remove duplicates and limit
}

function getFileExtension(filename) {
    if (!filename) return 'DOC';
    const extension = filename.split('.').pop();
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

// Secure Reading Position Management (only UI preferences, no auth data)
function saveReadingPosition() {
    if (currentDocument) {
        const fileId = currentDocument.id;
        const scrollable = document.querySelector('.document-viewer-section');
        
        // Get existing reading positions or create new object
        const readingPositions = JSON.parse(localStorage.getItem('readingPositions') || '{}');
        
        // Update position for this file
        readingPositions[fileId] = {
            scroll: scrollable ? scrollable.scrollTop : 0,
            zoom: currentZoom,
            page: currentPage,
            timestamp: new Date().toISOString()
        };
        
        // Clean old positions (keep only last 10 files to prevent storage bloat)
        const positions = Object.entries(readingPositions)
            .sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp))
            .slice(0, 10);
        
        localStorage.setItem('readingPositions', JSON.stringify(Object.fromEntries(positions)));
    }
}

function loadReadingPosition() {
    if (currentDocument) {
        const fileId = currentDocument.id;
        const readingPositions = JSON.parse(localStorage.getItem('readingPositions') || '{}');
        const position = readingPositions[fileId];
        
        if (position) {
            // Restore zoom
            if (position.zoom && position.zoom !== currentZoom) {
                currentZoom = parseInt(position.zoom);
                adjustZoom(0); // Apply zoom
            }
            
            // Restore page
            if (position.page && position.page !== currentPage) {
                currentPage = parseInt(position.page);
                updatePageDisplay();
            }

            // Restore scroll position
            if (position.scroll) {
                const scrollable = document.querySelector('.document-viewer-section');
                if (scrollable) {
                    // Use a timeout to ensure content is rendered before scrolling
                    setTimeout(() => {
                        scrollable.scrollTop = parseInt(position.scroll);
                    }, 100);
                }
            }
        }
    }
}

// Enhanced Action Buttons Setup with proper file handling
function setupActionButtons(fileData) {
    const purchaseBtn = document.getElementById('purchaseBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const shareBtn = document.getElementById('shareBtn');

    if (!fileData) return;

    const isFree = (parseFloat(fileData.price) || 0) === 0;

    // Purchase/Download button logic - Simplified text
    if (isFree) {
        // For free documents: show primary button as download, hide secondary download
        if (purchaseBtn) {
            purchaseBtn.innerHTML = `
                <span class="material-symbols-outlined">download</span>
                Download
            `;
            purchaseBtn.onclick = () => downloadDocument(fileData.id);
        }
        // Hide secondary download button for free documents
        if (downloadBtn) {
            downloadBtn.style.display = 'none';
        }
    } else {
        // For paid documents: show primary as purchase, show secondary download
        if (purchaseBtn) {
            purchaseBtn.innerHTML = `
                <span class="material-symbols-outlined">shopping_cart</span>
                Acquista
            `;
            purchaseBtn.onclick = () => handlePurchase(fileData.id);
        }
        // Show secondary download button for paid documents (after purchase)
        if (downloadBtn) {
            downloadBtn.style.display = 'flex';
            downloadBtn.onclick = () => downloadDocument(fileData.id);
        }
    }

    // Setup other action buttons
    if (favoriteBtn) {
        favoriteBtn.onclick = handleFavorite;
        
        // Initialize favorite button state based on file data
        if (fileData.favorite) {
            favoriteBtn.classList.add('active');
            const icon = favoriteBtn.querySelector('.material-symbols-outlined');
            const text = favoriteBtn.querySelector('span:last-child');
            if (icon) icon.textContent = 'favorite';
            if (text) text.textContent = 'Rimosso dai Preferiti';
            favoriteBtn.style.background = 'var(--danger-50)';
            favoriteBtn.style.borderColor = 'var(--danger-200)';
            favoriteBtn.style.color = 'var(--danger-700)';
        }
    }
    if (shareBtn) shareBtn.onclick = handleShare;
}

// Enhanced Purchase Handler
function handlePurchase(fileId) {
    if (!fileId) {
        showNotification('Errore: ID file non trovato', 'error');
        return;
    }
    
    const currentData = currentDocument || { id: fileId };
    
    if (currentData.price === 0) {
        // Free document - direct download
        downloadDocument(fileId);
    } else {
        // Paid document - show purchase confirmation
        const price = currentData.price?.toFixed(2) || 'N/A';
        if (confirm(`Confermi l'acquisto di questo documento per €${price}?`)) {
            // In a real implementation, this would redirect to payment processor
            showNotification('Funzionalità di pagamento non ancora implementata', 'info');
            // window.location.href = `payment.html?file=${fileId}&price=${currentData.price}`;
        }
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
            case 'ArrowLeft':
                e.preventDefault();
                goToPage(currentPage - 1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                goToPage(currentPage + 1);
                break;
            case 'Home':
                e.preventDefault();
                goToPage(1);
                break;
            case 'End':
                e.preventDefault();
                goToPage(totalPages);
                break;
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
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                goToPage(currentPage + 1); // Swipe left - next page
            } else {
                goToPage(currentPage - 1); // Swipe right - previous page
            }
        }
    }
}

// Automatic Session Refresh (every 15 minutes)
function initializeSessionRefresh() {
    setInterval(async () => {
        try {
            await fetch(`${API_BASE}/refresh-session`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.warn('Session refresh failed:', error);
        }
    }, 15 * 60 * 1000); // 15 minutes
}

// Main Initialization
async function initializeDocumentPreview() {
    // Validate session first
    const user = await validateSession();
    if (!user) {
        return; // validateSession handles redirect
    }

    const fileId = getFileIdFromUrl();
    if (!fileId) return;

    const viewerContainer = document.querySelector('.viewer-container');
    const loader = LoadingManager.show(viewerContainer, 'Caricamento anteprima...');

    try {
        // Fetch user and document data in parallel for faster loading
        const [userData, docData] = await Promise.all([
            fetchCurrentUserData(),
            fetchDocumentData(fileId)
        ]);

        updateHeaderUserInfo(userData);

        if (!docData) {
            throw new Error('Impossibile caricare i dati del documento.');
        }

        currentDocument = docData.document;

        // Hide loader
        LoadingManager.hide(loader);

        // Generate and render document pages
        const pages = generateDocumentPages(docData);
        renderDocumentPages(pages);
        
        // Render document information
        renderDocumentInfo(docData);

        // Initialize controls
        initializeZoom();
        initializeBackButton();
        initializeFullscreen();
        
        // Initialize other systems
        initializeKeyboardNavigation();
        initializeTouchNavigation();
        initializeSessionRefresh(); // Start automatic session refresh
        
        // Load reading position
        loadReadingPosition();

    } catch (error) {
        console.error('Error loading document:', error);
        LoadingManager.hide(loader);
        LoadingManager.showError(
            viewerContainer,
            'Impossibile caricare il documento. Verifica la tua connessione e riprova.',
            'Riprova',
            'initializeDocumentPreview'
        );
    }
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

// Action Handlers
async function handleFavorite() {
    if (!currentDocument) {
        showNotification('Errore: documento non trovato', 'error');
        return;
    }

    const btn = document.getElementById('favoriteBtn');
    const icon = btn.querySelector('.material-symbols-outlined');
    const text = btn.querySelector('span:last-child');
    
    // Determine if it's currently favorited (using same logic as search page)
    const isFavorited = btn.classList.contains('active');
    
    try {
        // Call the favorites API endpoint (same as search page)
        const response = await makeRequest(`/user/favorites/files/${currentDocument.id}`, {
            method: isFavorited ? 'DELETE' : 'POST'
        });

        // Toggle the favorite state in the UI (same as search page)
        if (isFavorited) {
            btn.classList.remove('active');
            icon.textContent = 'favorite_border';
            text.textContent = 'Salva nei Preferiti';
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
            showNotification('Rimosso dai preferiti 💔', 'success');
        } else {
            btn.classList.add('active');
            icon.textContent = 'favorite';
            text.textContent = 'Rimosso dai Preferiti';
            btn.style.background = 'var(--danger-50)';
            btn.style.borderColor = 'var(--danger-200)';
            btn.style.color = 'var(--danger-700)';
            showNotification('Aggiunto ai preferiti! ❤️', 'success');
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showNotification('Errore durante l\'aggiornamento dei preferiti', 'error');
    }
}

function handleShare() {
    if (navigator.share) {
        navigator.share({
            title: currentDocument?.title || 'Documento StudyHub',
            text: 'Guarda questo documento su StudyHub',
            url: window.location.href
        });
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            showNotification('Link copiato negli appunti!', 'success');
        });
    }
}

async function downloadDocument(fileId) {
    if (!fileId) {
        showNotification('Nessun file disponibile per il download', 'error');
        return;
    }
    
    try {
        showNotification('Download in corso... 📥', 'info');
        
        // Call the download endpoint which should add file to owned files
        const response = await makeRequest(`/files/${fileId}/download`, {
            method: 'GET'
        });
        
        if (response && response.download_url) {
            // If response includes download URL, use it
            window.open(response.download_url, '_blank');
            showNotification('Download completato! File aggiunto ai tuoi documenti 🎉', 'success');
        } else {
            // Handle direct file download response
            const downloadResponse = await fetch(`${API_BASE}/files/${fileId}/download`, {
                credentials: 'include',
                headers: {
                    'X-CSRF-Token': await getCSRFToken()
                }
            });
            
            if (downloadResponse.ok) {
                const blob = await downloadResponse.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = currentDocument?.filename || 'documento';
                a.click();
                window.URL.revokeObjectURL(url);
                showNotification('Download completato! File aggiunto ai tuoi documenti 🎉', 'success');
            } else {
                throw new Error(`HTTP ${downloadResponse.status}: ${downloadResponse.statusText}`);
            }
        }
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Errore nel download del documento', 'error');
    }
} 