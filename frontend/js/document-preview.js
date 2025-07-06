// ============================================
// WORLD-CLASS DYNAMIC DOCUMENT PREVIEW SYSTEM
// ============================================

const API_BASE = 'http://146.59.236.26:5000';
let authToken = localStorage.getItem('authToken');

// Document State Management
let currentDocument = null;
let currentVetrina = null;
let currentPage = 1;
let totalPages = 1;
let currentZoom = 100;
let documentPages = [];
let isLoading = false;
let documentData = null; // Store document data

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
            <embed src="${objectUrl}" type="application/pdf" width="100%" height="800px">
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
        let fileWithUserContext = null;
        
        if (fileResponse.vetrina_id) {
            try {
                // Get all vetrine and find the one we need since individual vetrina endpoint doesn't exist
                const allVetrineResponse = await makeRequest(`${API_BASE}/vetrine`);
                if (allVetrineResponse && allVetrineResponse.vetrine) {
                    // Try to find the vetrina by different possible ID fields
                    vetrinaData = allVetrineResponse.vetrine.find(v => 
                        v.vetrina_id === fileResponse.vetrina_id || 
                        v.id === fileResponse.vetrina_id ||
                        v.vetrina_id === fileResponse.vetrina_id
                    );
                    
                    if (!vetrinaData) {
                        console.warn(`❌ Vetrina with ID ${fileResponse.vetrina_id} not found in the list. Available vetrine:`, 
                            allVetrineResponse.vetrine.map(v => ({ id: v.id, vetrina_id: v.vetrina_id })));
                    } else {
                        console.log('✅ Found vetrina data:', vetrinaData);
                    }
                }
                
                // Get file with user context (including favorite status) from the vetrina's files
                const vetrinaFilesResponse = await makeRequest(`${API_BASE}/vetrine/${fileResponse.vetrina_id}/files`);
                if (vetrinaFilesResponse && vetrinaFilesResponse.files) {
                    fileWithUserContext = vetrinaFilesResponse.files.find(f => f.file_id === parseInt(fileId));
                    if (fileWithUserContext) {
                        // Merge the user context data with the original file data
                        Object.assign(fileResponse, {
                            favorite: fileWithUserContext.favorite,
                            owned: fileWithUserContext.owned
                        });
                    }
                }
            } catch (error) {
                console.warn('Could not fetch vetrina data:', error);
                if (error.message.includes('CORS Error')) {
                    console.warn('This is a CORS configuration issue on the server side');
                }
            }
        }

        // For now, we'll use mock data for reviews and related since endpoints don't exist
        const mockReviews = [];
        const mockRelated = [];

        // Ensure we have vetrina data for favorite functionality
        if (!vetrinaData && fileResponse.vetrina_id) {
            // Create a minimal vetrina object with the ID for favorite functionality
            vetrinaData = {
                vetrina_id: fileResponse.vetrina_id,
                id: fileResponse.vetrina_id,
                name: fileResponse.original_filename || fileResponse.filename || 'Documento',
                description: 'Documento caricato'
            };
            console.log('🔄 Created fallback vetrina data for favorite functionality:', vetrinaData);
        }

        return {
            document: fileResponse,
            vetrina: vetrinaData,
            reviews: mockReviews,
            related: mockRelated
        };
    } catch (error) {
        console.error('Failed to fetch document data:', error);
        
        // If file not found, try to redirect to a valid file
        if (error.message.includes('404') || error.message.includes('not found')) {
            console.log('File not found, attempting to redirect to a valid file...');
            // Redirect to a known valid file (teoria_insiemi.pdf - ID 117)
            window.location.href = 'document-preview.html?id=117';
            return null;
        }
        
        throw error;
    }
}

// Premium Document Renderer - Enhanced with complete information
function renderDocumentInfo(docData) {
    const { document: fileData, vetrina: vetrinaData } = docData;
    
    // Extract course information from vetrina if available
    const courseInfo = vetrinaData?.course_instance || {};
    
    // Update document title - use original filename if available, otherwise use vetrina name
    const title = fileData.original_filename || vetrinaData?.name || fileData.filename || 'Documento Senza Titolo';
    const titleElement = document.querySelector('.doc-title');
    if (titleElement) titleElement.textContent = title;
    document.title = `${title} - StudyHub`;

    // Determine document type from filename or tag
    const documentType = fileData.tag ? getDocumentTypeFromTag(fileData.tag) : getDocumentTypeFromFilename(fileData.original_filename || fileData.filename);
    
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
    
    // Update document type tag
    const docTypeTag = document.querySelector('.doc-type-tag');
    if (docTypeTag) docTypeTag.textContent = documentType;
    
    // Update all details (reordered to match new HTML structure)
    updateDetailValue('Facoltà', courseInfo.faculty_name || 'Non specificata');
    updateDetailValue('Corso', courseInfo.course_name || 'Non specificato');
    updateDetailValue('Lingua', courseInfo.language || 'Non specificata');
    
    // Handle canale display - show "Unico" if canale is "0"
    const canaleValue = courseInfo.canale === "0" ? "Unico" : (courseInfo.canale || 'Non specificato');
    updateDetailValue('Canale', canaleValue);
    
    updateDetailValue('Anno Accademico', getAcademicYear(courseInfo));

    // Update description - use vetrina description or generate one based on document type
    let description = vetrinaData?.description;
    if (!description) {
        const docType = fileData.tag ? getDocumentTypeFromTag(fileData.tag) : 'Documento';
        const courseName = courseInfo.course_name || 'questo corso';
        description = `${docType} per ${courseName}. Materiale didattico completo e aggiornato.`;
    }
    
    const descriptionContainer = document.querySelector('.doc-description');
    if(descriptionContainer) {
        descriptionContainer.innerHTML = `<p>${description}</p>`;
    }
    
    // Set up action buttons with proper data
    setupActionButtons(fileData, vetrinaData);
    
    // Render related documents with professional placeholders
    renderRelatedDocuments();
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

// Dynamic Document Pages Generator
function generateDocumentPages(docData) {
    const { document: fileData, vetrina: vetrinaData } = docData;
    
    // Always show redacted content for PDFs (marketplace business logic)
    if (isPdfFile(fileData.original_filename || fileData.filename)) {
        console.log('📄 Using redacted PDF (marketplace mode) for:', fileData.original_filename || fileData.filename);
        return generateRedactedPdfPages(fileData);
    }
    
    // For non-PDF files, generate placeholder content
    const courseInfo = vetrinaData?.course_instance || {};
    
    const documentType = getFileExtension(fileData.original_filename || fileData.filename);
    const courseDetails = {
        title: fileData.original_filename || vetrinaData?.name || fileData.filename || 'Documento',
        course: courseInfo.course_name || 'Corso',
        professor: Array.isArray(courseInfo.professors) ? courseInfo.professors.join(', ') : courseInfo.professors || 'Professore', 
        university: courseInfo.faculty_name || 'Università'
    };
    
    // Generate realistic content based on document type and course
    const pages = generateRealisticContent(courseDetails, documentType);
    totalPages = pages.length;
    
    return pages;
}

// Generate redacted PDF pages for marketplace preview
function generateRedactedPdfPages(fileData) {
    const fileId = fileData.file_id || fileData.id;
    if (!fileId) {
        console.error('No file ID available for redacted PDF');
        return generateFallbackContent(fileData);
    }
    
    console.log('🔒 Creating marketplace redacted PDF preview for file ID:', fileId);
    
    // Return a single page with PDF fetching functionality
    totalPages = 1;
    return [{
        type: 'pdf',
        content: fileId, // Pass file ID instead of URL
        title: 'Anteprima Documento',
        description: 'Anteprima con contenuti protetti. Acquista per accesso completo.'
    }];
}

// Generate fallback content if redacted PDF fails
function generateFallbackContent(fileData) {
    console.log('⚠️ Generating fallback content for:', fileData.filename || fileData.original_filename);
    
    totalPages = 1;
    return [{
        type: 'fallback',
        content: `
            <div class="pdf-fallback">
                <div class="fallback-icon">📄</div>
                <h3>Documento non disponibile</h3>
                <p>Il documento redatto non può essere visualizzato al momento.</p>
                <p><strong>Nome file:</strong> ${fileData.filename || fileData.original_filename || 'Sconosciuto'}</p>
                <p><strong>Tipo:</strong> ${fileData.tag || 'Documento'}</p>
                <div class="fallback-actions">
                    <button class="retry-btn" onclick="location.reload()">
                        <span class="material-symbols-outlined">refresh</span>
                        Riprova
                    </button>
                </div>
            </div>
        `,
        title: 'Documento Non Disponibile'
    }];
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
    const documentViewer = document.querySelector('.document-viewer');
    if (!documentViewer) return;

    // Create a wrapper for zoom scaling and the main container for pages
    const zoomWrapper = document.createElement('div');
    zoomWrapper.className = 'zoom-wrapper';

    const viewerContainer = document.createElement('div');
    viewerContainer.className = 'viewer-container';
    
    // Clear previous content and append the new structure
    documentViewer.innerHTML = '';
    zoomWrapper.appendChild(viewerContainer);
    documentViewer.appendChild(zoomWrapper);

    if (pages.length === 0) {
        viewerContainer.innerHTML = '<p class="no-content">Il contenuto del documento non è disponibile.</p>';
        return;
    }

    // Clear the documentPages array
    documentPages = [];
    
    pages.forEach((pageData, index) => {
        const pageElement = document.createElement('div');
        pageElement.className = 'document-page';
        pageElement.setAttribute('data-page', index + 1);

        const pageContent = document.createElement('div');
        pageContent.className = 'page-content';
        
        // Handle different content types
        if (pageData.type === 'pdf') {
            // Render PDF content with authentication
            pageContent.innerHTML = `
                <div class="pdf-container">
                    <div class="pdf-header">
                        <h3>${pageData.title}</h3>
                        <p>${pageData.description}</p>
                    </div>
                    <div class="pdf-viewer" id="pdfViewer-${pageData.content}">
                        <div class="pdf-loading">
                            <div class="loader-spinner"></div>
                            <p>Caricamento documento redatto...</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Load PDF with authentication
            loadRedactedPdf(pageData.content, `pdfViewer-${pageData.content}`);
        } else if (pageData.type === 'fallback') {
            // Render fallback content
            pageContent.innerHTML = pageData.content;
        } else {
            // Render regular content
            pageContent.innerHTML = pageData.content;
        }
        
        pageElement.appendChild(pageContent);
        viewerContainer.appendChild(pageElement);
        
        // Add to documentPages array for navigation
        documentPages.push(pageElement);
    });

    totalPages = pages.length;
    
    // Initialize page display
    if (totalPages > 0) {
        currentPage = 1; // Reset to first page
        updatePageDisplay();
    }
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

// Related Documents Renderer - Professional Placeholder Implementation
function renderRelatedDocuments(relatedDocs) {
    const relatedContainer = document.querySelector('.related-docs');
    
    // Generate professional placeholder documents
    const placeholderDocs = generatePlaceholderDocuments();
    
    const relatedHTML = placeholderDocs.map(doc => `
        <div class="related-doc-item" onclick="window.location.href='document-preview.html?id=${doc.id}'">
            <div class="related-doc-preview">
                <div class="doc-preview-icon">
                    <span class="material-symbols-outlined">${doc.icon}</span>
                </div>
                <div class="doc-preview-overlay">
                    <span class="preview-price">€${doc.price}</span>
                </div>
            </div>
            <div class="related-doc-info">
                <h4 class="doc-title">${doc.title}</h4>
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
        'Prof. Rossi M.',
        'Prof.ssa Bianchi A.',
        'Prof. Verdi L.',
        'Prof.ssa Neri S.',
        'Prof. Gialli P.',
        'Prof.ssa Marroni E.',
        'Prof. Azzurri R.',
        'Prof.ssa Viola M.'
    ];
    
    const documents = [];
    
    for (let i = 0; i < 8; i++) {
        const docType = documentTypes[i % documentTypes.length];
        const course = docType.courses[i % docType.courses.length];
        const author = authors[i % authors.length];
        
        documents.push({
            id: 200 + i,
            title: `${docType.type} - ${course}`,
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

// Navigation System
function initializeNavigationElements() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn && !prevBtn.hasAttribute('data-initialized')) {
        prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
        prevBtn.setAttribute('data-initialized', 'true');
    }
    if (nextBtn && !nextBtn.hasAttribute('data-initialized')) {
        nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
        nextBtn.setAttribute('data-initialized', 'true');
    }
}

function updateNavigationElements() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentPageSpan = document.querySelector('.current-page');
    const totalPagesSpan = document.querySelector('.total-pages');
    
    // Update navigation button states
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    
    // Update page indicators
    if (currentPageSpan) currentPageSpan.textContent = currentPage;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPages;
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
    // Hide all pages first
    documentPages.forEach(page => {
        page.style.display = 'none';
    });

    // Show current page
    if (documentPages[currentPage - 1]) {
        documentPages[currentPage - 1].style.display = 'block';
    }

    // Update navigation elements
    updateNavigationElements();
    
    // Update page indicator
    updatePageIndicator();
    
    // Save reading position
    saveReadingPosition();
}

// Update Page Indicator - Professional Display
function updatePageIndicator() {
    const pageIndicator = document.getElementById('pageIndicator');
    if (pageIndicator) {
        pageIndicator.textContent = `${currentPage} di ${totalPages}`;
    }
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
    currentZoom = Math.max(ZOOM_CONFIG.min, Math.min(ZOOM_CONFIG.max, currentZoom + delta));
    updateZoomDisplay();
}

// Update zoom level and apply transformations
function updateZoomDisplay() {
    const zoomWrapper = document.querySelector('.zoom-wrapper');
    const viewerContainer = document.querySelector('.viewer-container');
    const zoomLevelText = document.querySelector('.zoom-level');

    if (!zoomWrapper || !viewerContainer || !zoomLevelText) return;

    const scale = currentZoom / 100;
    
    // Apply scale transform to the content container
    viewerContainer.style.transform = `scale(${scale})`;
    
    // Get the natural height of the content and apply scaled height to the wrapper
    const contentHeight = viewerContainer.scrollHeight;
    zoomWrapper.style.height = `${contentHeight * scale}px`;

    zoomLevelText.textContent = `${currentZoom}%`;
    
    // Update zoom button states using correct selectors
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    
    if (zoomInBtn) {
        zoomInBtn.disabled = currentZoom >= ZOOM_CONFIG.max;
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.disabled = currentZoom <= ZOOM_CONFIG.min;
    }
}

// Initialize Back Button
function initializeBackButton() {
    // Add a small delay to ensure DOM is ready
    setTimeout(() => {
        const backBtn = document.getElementById('backBtn');
        console.log('Initializing back button:', backBtn);
        
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                console.log('Back button clicked!');
                e.preventDefault();
                e.stopPropagation();
                
                // Try to go back in history, fallback to search page
                if (document.referrer && document.referrer.includes('search.html')) {
                    window.history.back();
                } else {
                    window.location.href = 'search.html';
                }
            });
            console.log('Back button event listener added successfully');
        } else {
            console.error('Back button not found in DOM');
        }
    }, 100);
}

// Enhanced Fullscreen with smooth transitions
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
            
            console.log('Fullscreen button event listener added successfully');
            
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
        } else {
            console.error('Fullscreen button not found in DOM');
        }
    }, 100);
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
        const fileId = currentDocument.file_id;
        const scrollable = document.querySelector('.document-viewer-section');
        if (scrollable) {
            localStorage.setItem(`file-${fileId}-scroll`, scrollable.scrollTop);
        }
        localStorage.setItem(`file-${fileId}-zoom`, currentZoom);
    }
}

function loadReadingPosition() {
    if (currentDocument) {
        const fileId = currentDocument.file_id;
        const savedScroll = localStorage.getItem(`file-${fileId}-scroll`);
        const savedZoom = localStorage.getItem(`file-${fileId}-zoom`);
        
        if (savedZoom) {
            currentZoom = parseInt(savedZoom);
            adjustZoom(0); // Apply zoom
        }

        if (savedScroll) {
            const scrollable = document.querySelector('.document-viewer-section');
            if (scrollable) {
                // Use a timeout to ensure content is rendered before scrolling
                setTimeout(() => {
                    scrollable.scrollTop = parseInt(savedScroll);
                }, 100);
            }
        }
    }
}

// Enhanced Action Buttons Setup with proper file handling
function setupActionButtons(fileData, vetrinaData = null) {
    const purchaseBtn = document.getElementById('purchaseBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const shareBtn = document.getElementById('shareBtn');

    if (!fileData) return;

    const isFree = (parseFloat(fileData.price) || 0) === 0;

    // Purchase/Download button logic - Fix duplicate download buttons
    if (isFree) {
        // For free documents: show primary button as download, hide secondary download
        if (purchaseBtn) {
            purchaseBtn.innerHTML = `
                <span class="material-symbols-outlined">download</span>
                Download
            `;
            purchaseBtn.onclick = () => downloadDocument(fileData.file_id);
        }
        // Hide secondary download button for free documents
        if (downloadBtn) {
            downloadBtn.style.display = 'none';
        }
    } else {
        // For paid documents: show primary as purchase, show secondary download
        if (purchaseBtn) {
            purchaseBtn.innerHTML = `Acquista`;
            purchaseBtn.onclick = () => handlePurchase(fileData.file_id);
        }
        // Show secondary download button for paid documents (after purchase)
        if (downloadBtn) {
            downloadBtn.style.display = 'flex';
            downloadBtn.onclick = () => downloadDocument(fileData.file_id);
        }
    }

    // Setup favorite button with proper initial state
    if (favoriteBtn) {
        // Check both file and vetrina favorite status
        const isFileFavorited = fileData.favorite === true;
        const isVetrinaFavorited = vetrinaData && vetrinaData.favorite === true;
        const isFavorited = isFileFavorited || isVetrinaFavorited;
        
        if (isFavorited) {
            favoriteBtn.classList.add('active');
            favoriteBtn.title = 'Rimuovi dai Preferiti';
        } else {
            favoriteBtn.classList.remove('active');
            favoriteBtn.title = 'Aggiungi ai Preferiti';
        }
        favoriteBtn.onclick = handleFavorite;
    }

    // Setup share button
    if (shareBtn) shareBtn.onclick = handleShare;
    
    // Setup cart button
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.onclick = handleAddToCart;
        // Hide cart button for free documents
        if (isFree) {
            addToCartBtn.style.display = 'none';
        }
    }
}

// Enhanced Purchase Handler
function handlePurchase(fileId) {
    if (!fileId) {
        showNotification('Errore: ID file non trovato', 'error');
        return;
    }
    
    const currentData = currentDocument || { file_id: fileId };
    const purchaseBtn = document.getElementById('purchaseBtn');
    
    if (currentData.price === 0) {
        // Free document - direct download
        downloadDocument(fileId);
    } else {
        // Paid document - show purchase confirmation
        if (confirm(`Confermi l'acquisto di questo documento per €${currentData.price?.toFixed(2) || 'N/A'}?`)) {
            // Optimistically update UI
            if (purchaseBtn) {
                purchaseBtn.classList.add('purchased');
                purchaseBtn.innerHTML = 'Acquisto Completato';
                purchaseBtn.disabled = true;
            }
            
            // Show success notification
            showNotification('Acquisto completato con successo!', 'success');
            
            // In a real implementation, this would redirect to payment processor
            // window.location.href = `payment.html?file=${fileId}&price=${currentData.price}`;
            
            // Reset button after animation (in real app, this would happen after payment confirmation)
            setTimeout(() => {
                if (purchaseBtn) {
                    purchaseBtn.classList.remove('purchased');
                    purchaseBtn.innerHTML = 'Acquista';
                    purchaseBtn.disabled = false;
                }
            }, 3000);
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

        updateHeaderUserInfo(userData);

        if (!docData) {
            throw new Error('Impossibile caricare i dati del documento.');
        }

        currentDocument = docData.document;
        currentVetrina = docData.vetrina;
        documentData = docData; // Store for toggling

        // Debug logging
        console.log('🔍 Document data loaded:', {
            documentId: currentDocument?.file_id,
            vetrinaId: currentVetrina?.vetrina_id,
            vetrinaIdField: currentVetrina?.id,
            vetrinaData: currentVetrina,
            vetrinaKeys: currentVetrina ? Object.keys(currentVetrina) : 'null'
        });

        // Generate document pages
        const pages = generateDocumentPages(docData);
        
        // Replace the entire main container content with the document viewer structure
        mainContainer.innerHTML = `
            <div class="document-viewer-section">
                <div class="document-viewer" id="documentViewer">
                    <!-- Document pages will be rendered here -->
                </div>
                
                <!-- Viewer Controls Overlay -->
                <div class="viewer-overlay-controls">
                    <button class="back-btn-overlay" onclick="window.location.href='search.html'">
                        <span class="material-symbols-outlined">arrow_back</span>
                        Torna alla ricerca
                    </button>
                    
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
            </div>
            
            <div class="document-info-sidebar">
                <div class="doc-info-content">
                    <!-- Main Info & CTA -->
                    <div class="doc-main-info">
                        <div class="doc-header-actions">
                            <div class="doc-type-tag">Caricamento...</div>
                            <button class="action-btn secondary" id="favoriteBtn" title="Aggiungi ai Preferiti">
                                <span class="material-symbols-outlined">favorite</span>
                            </button>
                            <button class="action-btn secondary" id="shareBtn" title="Condividi">
                                <span class="material-symbols-outlined">share</span>
                            </button>
                        </div>
                        <div class="doc-title-container">
                            <h1 class="doc-title">Caricamento...</h1>
                        </div>
                        <div class="doc-meta-header">
                            <div class="doc-rating">
                                <div class="stars"></div>
                                <span class="rating-score">0.0</span>
                                <span class="rating-count">(0 recensioni)</span>
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
        `;
        
        // Now render the content into the newly created structure
        renderDocumentPages(pages);
        renderDocumentInfo(docData);

        // Initialize controls
        initializeZoom();
        initializeBackButton();
        initializeFullscreen();
        initializeNavigationElements();
        
        // Initialize other systems
        initializeKeyboardNavigation();
        initializeTouchNavigation();
        
        // Load reading position
        loadReadingPosition();

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
    if (!currentDocument || !currentDocument.file_id) {
        showNotification('Errore: ID file non trovato', 'error');
        return;
    }

    const addToCartBtn = document.getElementById('addToCartBtn');
    if (!addToCartBtn) {
        showNotification('Errore: Pulsante carrello non trovato', 'error');
        return;
    }

    // Optimistically update UI
    addToCartBtn.classList.add('added');
    addToCartBtn.innerHTML = `Aggiunto al Carrello`;
    addToCartBtn.disabled = true;

    try {
        // In a real implementation, this would call the cart API
        // For now, we'll simulate the API call
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
        
        showNotification('Documento aggiunto al carrello!', 'success');
        
        // Update cart count in header (if cart indicator exists)
        updateCartCount();
        
    } catch (error) {
        console.error('Add to cart error:', error);
        
        // Revert UI on error
        addToCartBtn.classList.remove('added');
        addToCartBtn.innerHTML = `Aggiungi al Carrello`;
        addToCartBtn.disabled = false;
        
        showNotification('Errore nell\'aggiunta al carrello. Riprova.', 'error');
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
            title: currentDocument?.original_filename || currentDocument?.filename || 'Documento StudyHub',
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