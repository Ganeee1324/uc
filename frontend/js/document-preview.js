// ============================================
// WORLD-CLASS DYNAMIC DOCUMENT PREVIEW SYSTEM
// ============================================

const API_BASE = 'http://localhost:5000';
let authToken = localStorage.getItem('authToken');

// Document State Management
let currentDocument = null;
let currentPage = 1;
let totalPages = 1;
let currentZoom = 100;
let documentPages = [];
let isLoading = false;

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
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// Authentication Handler
function handleAuthError() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// URL Parameter Handler
function getVetrinaIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const vetrinaId = urlParams.get('id');
    
    if (!vetrinaId) {
        window.location.href = 'search.html';
        return null;
    }
    
    return parseInt(vetrinaId);
}

// Document Data Fetcher
async function fetchDocumentData(vetrinaId) {
    try {
        // Fetch vetrina data using the correct backend endpoint
        const vetrinaResponse = await makeRequest(`${API_BASE}/vetrine/${vetrinaId}`);
        
        // Fetch files for this vetrina
        const filesResponse = await makeRequest(`${API_BASE}/vetrine/${vetrinaId}/files`);
        
        // For now, we'll use mock data for reviews and related since endpoints don't exist
        // In a real scenario, you'd add these endpoints to your backend
        const mockReviews = [];
        const mockRelated = [];

        return {
            document: {
                ...vetrinaResponse,
                files: filesResponse || []
            },
            reviews: mockReviews,
            related: mockRelated
        };
    } catch (error) {
        console.error('Failed to fetch document data:', error);
        throw error;
    }
}

// Premium Document Renderer
function renderDocumentInfo(docData) {
    // Update document title - mapping backend vetrina fields
    const title = docData.name || docData.title || docData.course_name || 'Documento Senza Titolo';
    document.querySelector('.doc-title').textContent = title;
    
    // Update document metadata
    const rating = parseFloat(docData.rating) || 0;
    const reviewCount = parseInt(docData.review_count) || 0;
    const price = parseFloat(docData.price) || 0;
    
    // Render stars
    const starsContainer = document.querySelector('.stars');
    starsContainer.innerHTML = generateStars(Math.floor(rating));
    
    // Update rating info
    document.querySelector('.rating-score').textContent = rating.toFixed(1);
    document.querySelector('.rating-count').textContent = `(${reviewCount} recensioni)`;
    
    // Update price
    const priceElement = document.querySelector('.price-value');
    if (price === 0) {
        priceElement.textContent = 'Gratuito';
        priceElement.style.color = 'var(--success-500)';
    } else {
        priceElement.textContent = `€${price.toFixed(2)}`;
    }
    
    // Update document details - mapping backend vetrina structure
    const details = {
        'Autore': docData.owner_username || docData.author_username || 'Non specificato',
        'Università': docData.faculty || docData.faculty_name || 'Non specificata',
        'Corso': docData.course_name || docData.name || 'Non specificato',
        'Professore': docData.professor || docData.main_professor || 'Non specificato',
        'Anno Accademico': docData.academic_year || '2024/2025',
        'Pagine': `${totalPages} pagine`,
        'Formato': docData.files && docData.files[0] ? getFileExtension(docData.files[0].filename) : 'PDF',
        'Lingua': docData.language || 'Italiano',
        'Dimensione': docData.files && docData.files[0] ? formatFileSize(docData.files[0].size || 0) : 'Non disponibile',
        'Data Pubblicazione': formatDate(docData.created_at)
    };
    
    const detailsContainer = document.querySelector('.doc-details');
    const detailsHTML = Object.entries(details).map(([label, value]) => `
        <div class="detail-item">
            <span class="detail-label">${label}:</span>
            <span class="detail-value">${value}</span>
        </div>
    `).join('');
    
    detailsContainer.innerHTML = `
        <h3>Dettagli Documento</h3>
        ${detailsHTML}
    `;
    
    // Update description - mapping backend vetrina fields
    const description = docData.description || 'Nessuna descrizione disponibile per questo documento.';
    const descriptionContainer = document.querySelector('.doc-description');
    descriptionContainer.innerHTML = `
        <h3>Descrizione</h3>
        <p>${description}</p>
        ${docData.tags ? `
            <div class="description-tags">
                <h4>Argomenti trattati:</h4>
                <ul>
                    ${docData.tags.split(',').map(tag => `<li>${tag.trim()}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    `;
    
    // Generate and update tags
    const tags = generateDocumentTags(docData);
    const tagsContainer = document.querySelector('.tags-container');
    tagsContainer.innerHTML = tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    
    // Update page title and meta tags
    document.title = `${title} - StudyHub`;
    
    // Update meta description for SEO
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
        metaDescription.content = description.slice(0, 160) + (description.length > 160 ? '...' : '');
    } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = description.slice(0, 160) + (description.length > 160 ? '...' : '');
        document.head.appendChild(meta);
    }
    
    // Update Open Graph tags for social sharing
    const updateOrCreateMetaTag = (property, content) => {
        let tag = document.querySelector(`meta[property="${property}"]`);
        if (!tag) {
            tag = document.createElement('meta');
            tag.property = property;
            document.head.appendChild(tag);
        }
        tag.content = content;
    };
    
    updateOrCreateMetaTag('og:title', `${title} - StudyHub`);
    updateOrCreateMetaTag('og:description', description.slice(0, 160) + (description.length > 160 ? '...' : ''));
    updateOrCreateMetaTag('og:url', window.location.href);
    updateOrCreateMetaTag('og:type', 'article');
}

// Dynamic Document Pages Generator
function generateDocumentPages(docData) {
    // For now, we'll generate placeholder pages based on document type
    // In a real implementation, this would extract actual pages from the PDF/document
    
    const documentType = docData.files && docData.files[0] ? getFileExtension(docData.files[0].filename) : 'PDF';
    const courseInfo = {
        title: docData.name || docData.title || docData.course_name || 'Documento',
        course: docData.course_name || docData.name || 'Corso',
        professor: docData.main_professor || docData.professor || 'Professore',
        university: docData.faculty || docData.faculty_name || 'Università'
    };
    
    // Generate realistic content based on document type and course
    const pages = generateRealisticContent(courseInfo, documentType);
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

// Document Pages Renderer
function renderDocumentPages(pages) {
    const viewerContainer = document.querySelector('.viewer-container');
    
    viewerContainer.innerHTML = `
        ${pages.map((page, index) => `
            <div class="document-page ${index === 0 ? 'active' : ''}" data-page="${index + 1}">
                <div class="page-content">
                    ${page.content}
                </div>
            </div>
        `).join('')}
        
        <div class="page-navigation">
            <button class="nav-btn prev-btn" id="prevBtn" ${pages.length <= 1 ? 'disabled' : ''}>
                <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <div class="page-indicator">
                <span class="current-page">1</span> / <span class="total-pages">${pages.length}</span>
            </div>
            <button class="nav-btn next-btn" id="nextBtn" ${pages.length <= 1 ? 'disabled' : ''}>
                <span class="material-symbols-outlined">chevron_right</span>
            </button>
        </div>
    `;
    
    // Update navigation references
    updateNavigationElements();
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
    const zoomLevelSpan = document.querySelector('.zoom-level');
    
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => adjustZoom(ZOOM_CONFIG.step));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => adjustZoom(-ZOOM_CONFIG.step));
    
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
    
    if (zoomLevelSpan) zoomLevelSpan.textContent = `${currentZoom}%`;
    if (viewerContainer) {
        viewerContainer.style.transform = `scale(${currentZoom / 100})`;
        viewerContainer.style.transformOrigin = 'top center';
    }
    
    if (zoomInBtn) zoomInBtn.disabled = currentZoom >= ZOOM_CONFIG.max;
    if (zoomOutBtn) zoomOutBtn.disabled = currentZoom <= ZOOM_CONFIG.min;
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

// Reading Position Management
function saveReadingPosition() {
    if (currentDocument) {
        const vetrinaId = currentDocument.id;
        localStorage.setItem(`vetrina-${vetrinaId}-page`, currentPage);
        localStorage.setItem(`vetrina-${vetrinaId}-zoom`, currentZoom);
    }
}

function loadReadingPosition() {
    if (currentDocument) {
        const vetrinaId = currentDocument.id;
        const savedPage = localStorage.getItem(`vetrina-${vetrinaId}-page`);
        const savedZoom = localStorage.getItem(`vetrina-${vetrinaId}-zoom`);
        
        if (savedPage) {
            const page = parseInt(savedPage);
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
            }
        }
        
        if (savedZoom) {
            const zoom = parseInt(savedZoom);
            if (zoom >= ZOOM_CONFIG.min && zoom <= ZOOM_CONFIG.max) {
                currentZoom = zoom;
            }
        }
    }
}

// Action Handlers
function handlePurchase() {
    if (!currentDocument) return;
    
    if (currentDocument.price === 0) {
        // Free document - direct download
        downloadDocument();
    } else {
        // Paid document - payment flow
        window.location.href = `payment.html?vetrina=${currentDocument.id}&price=${currentDocument.price}`;
    }
}

function handleFavorite() {
    // Toggle favorite status
    const btn = document.querySelector('.action-btn:nth-child(2)');
    const icon = btn.querySelector('.material-symbols-outlined');
    const text = btn.querySelector('span:last-child');
    
    if (icon.textContent === 'favorite_border') {
        icon.textContent = 'favorite';
        text.textContent = 'Rimosso dai Preferiti';
        btn.style.background = 'var(--danger-50)';
        btn.style.borderColor = 'var(--danger-200)';
        btn.style.color = 'var(--danger-700)';
    } else {
        icon.textContent = 'favorite_border';
        text.textContent = 'Salva nei Preferiti';
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
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

async function downloadDocument() {
    if (!currentDocument || !currentDocument.files || currentDocument.files.length === 0) {
        showNotification('Nessun file disponibile per il download', 'error');
        return;
    }
    
    try {
        // Get the first file from the vetrina (or you could let user choose)
        const firstFile = currentDocument.files[0];
        const response = await makeRequest(`${API_BASE}/files/${firstFile.id}/download`, {
            method: 'GET'
        });
        
        if (response.download_url) {
            window.open(response.download_url, '_blank');
        } else {
            // If no download_url, the response might be the file itself
            showNotification('Download avviato', 'success');
        }
    } catch (error) {
        showNotification('Errore nel download del documento', 'error');
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

// Main Initialization
async function initializeDocumentPreview() {
    try {
        // Check authentication
        if (!authToken) {
            window.location.href = 'login.html';
            return;
        }
        
        // Get vetrina ID from URL
        const vetrinaId = getVetrinaIdFromUrl();
        if (!vetrinaId) return;
        
        // Show loading state
        const mainContent = document.querySelector('.preview-main');
        const loader = LoadingManager.show(mainContent, 'Caricamento documento...');
        
        // Fetch document data
        const { document: docData, reviews, related } = await fetchDocumentData(vetrinaId);
        currentDocument = docData;
        
        // Generate document pages
        const pages = generateDocumentPages(docData);
        documentPages = pages;
        
        // Load reading position
        loadReadingPosition();
        
        // Hide loader
        LoadingManager.hide(loader);
        
        // Render everything
        renderDocumentInfo(docData);
        renderDocumentPages(pages);
        renderReviews(reviews);
        renderRelatedDocuments(related);
        
        // Initialize systems
        initializeZoom();
        initializeKeyboardNavigation();
        initializeTouchNavigation();
        
        // Setup action buttons
        setupActionButtons();
        
        // Auto-save position
        setInterval(saveReadingPosition, 30000); // Every 30 seconds
        
        console.log('Document preview initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize document preview:', error);
        
        const mainContent = document.querySelector('.preview-main');
        LoadingManager.showError(
            mainContent,
            'Impossibile caricare il documento. Verifica la connessione e riprova.',
            'Torna alla ricerca',
            () => window.location.href = 'search.html'
        );
    }
}

// Action Buttons Setup
function setupActionButtons() {
    const actionButtons = document.querySelectorAll('.action-btn');
    
    actionButtons.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            switch(index) {
                case 0: // Purchase/Download
                    handlePurchase();
                    break;
                case 1: // Favorite
                    handleFavorite();
                    break;
                case 2: // Share
                    handleShare();
                    break;
            }
        });
    });
}

// Initialize on DOM Content Loaded
document.addEventListener('DOMContentLoaded', initializeDocumentPreview);

// Save state when leaving page
window.addEventListener('beforeunload', saveReadingPosition);

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        saveReadingPosition();
    }
});

console.log('Document Preview System - World Class Edition - Loaded Successfully'); 