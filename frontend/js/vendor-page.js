// Vendor Page JavaScript - Complete functionality
const API_BASE = 'http://146.59.236.26:5000';
let authToken = localStorage.getItem('authToken');

// Check authentication
function checkAuthentication() {
    if (!authToken) {
        console.log('No auth token found, redirecting to login');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Get URL parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

const vendorUsername = getQueryParam('user');

if (!vendorUsername) {
    alert('Vendor username not specified in URL.');
    window.location.href = 'search.html';
}

// Global variables
let currentVetrine = [];
let originalVetrine = [];
let activeFilters = {};
let currentUser = null;

// Initialize the page
window.onload = async function() {
    console.log('🚀 Vendor page loading started...');
    
    // Check authentication
    if (!checkAuthentication()) {
        return;
    }
    
    console.log('✅ Authentication passed, initializing vendor page...');
    
    // Initialize user info
    await initializeUserInfo();
    
    // Initialize components
    initializeSearch();
    initializeFilters();
    initializeScrollToTop();
    
    // Load vendor data
    await loadVendorData();
    
    // Load vendor vetrine
    await loadVendorVetrine();
    
    console.log('✅ Vendor page initialization complete!');
};

// Initialize user info
async function initializeUserInfo() {
    try {
        const cachedUser = localStorage.getItem('currentUser');
        if (cachedUser) {
            currentUser = JSON.parse(cachedUser);
        } else {
            const response = await makeAuthenticatedRequest('/me');
            if (response && response.user) {
                currentUser = response.user;
                localStorage.setItem('currentUser', JSON.stringify(response.user));
            }
        }
        
        if (currentUser) {
            updateHeaderUserInfo(currentUser);
        }
    } catch (error) {
        console.error('Failed to initialize user info:', error);
        logout();
    }
}

// Update header user info
function updateHeaderUserInfo(user) {
    const userAvatar = document.getElementById('userAvatar');
    const dropdownAvatar = document.getElementById('dropdownAvatar');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');
    
    if (userAvatar) {
        userAvatar.innerHTML = user.username ? user.username.charAt(0).toUpperCase() : 'U';
        userAvatar.className = `user-avatar ${getAvatarVariant(user.username)}`;
    }
    
    if (dropdownAvatar) {
        dropdownAvatar.innerHTML = user.username ? user.username.charAt(0).toUpperCase() : 'U';
        dropdownAvatar.className = `dropdown-avatar ${getAvatarVariant(user.username)}`;
    }
    
    if (dropdownUserName) {
        dropdownUserName.textContent = user.username || 'User';
    }
    
    if (dropdownUserEmail) {
        dropdownUserEmail.textContent = user.email || 'user@example.com';
    }
}

// Get avatar variant
function getAvatarVariant(username) {
    if (!username) return 'variant-1';
    const hash = username.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    return `variant-${Math.abs(hash) % 12 + 1}`;
}

// Load vendor data
async function loadVendorData() {
    try {
        console.log(`📊 Loading vendor data for: ${vendorUsername}`);
        
        // For now, we'll create a basic vendor object since the backend might not have a specific endpoint
        const vendor = {
            username: vendorUsername,
            name: vendorUsername,
            vetrina_count: 0,
            review_count: 0
        };
        
        updateVendorBanner(vendor);
        
    } catch (error) {
        console.error('Error loading vendor data:', error);
        showError('Errore nel caricamento dei dati del venditore');
    }
}

// Update vendor banner
function updateVendorBanner(vendor) {
    const vendorName = document.getElementById('vendorName');
    const vendorStats = document.getElementById('vendorStats');
    const vendorAvatar = document.getElementById('vendorAvatar');
    
    if (vendorName) {
        vendorName.textContent = vendor.username || vendor.name || 'Vendor';
    }
    
    if (vendorStats) {
        vendorStats.textContent = `${vendor.vetrina_count || 0} documenti • ${vendor.review_count || 0} recensioni`;
    }
    
    if (vendorAvatar) {
        vendorAvatar.innerHTML = vendor.username ? vendor.username.charAt(0).toUpperCase() : '<span class="material-symbols-outlined">person</span>';
        vendorAvatar.className = `vendor-avatar ${getAvatarVariant(vendor.username)}`;
    }
}

// Load vendor vetrine
async function loadVendorVetrine() {
    try {
        console.log(`📚 Loading vetrine for vendor: ${vendorUsername}`);
        
        // Show loading state
        showLoadingCards();
        
        // Fetch vetrine by author
        const response = await makeAuthenticatedRequest(`/vetrine?author=${encodeURIComponent(vendorUsername)}`);
        
        if (response && response.vetrine) {
            originalVetrine = response.vetrine;
            currentVetrine = [...originalVetrine];
            
            // Update vendor stats
            const vendor = {
                username: vendorUsername,
                name: vendorUsername,
                vetrina_count: originalVetrine.length,
                review_count: originalVetrine.reduce((sum, v) => sum + (v.review_count || 0), 0)
            };
            updateVendorBanner(vendor);
            
            // Render documents
            renderDocuments(currentVetrine);
            
            // Update document count
            updateDocumentCount(currentVetrine.length);
            
            console.log(`✅ Loaded ${originalVetrine.length} vetrine for vendor`);
        } else {
            originalVetrine = [];
            currentVetrine = [];
            renderDocuments([]);
            updateDocumentCount(0);
            console.log('No vetrine found for vendor');
        }
        
    } catch (error) {
        console.error('Error loading vendor vetrine:', error);
        showError('Errore nel caricamento dei documenti del venditore');
        renderDocuments([]);
        updateDocumentCount(0);
    }
}

// Show loading cards
function showLoadingCards() {
    const grid = document.getElementById('documentsGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="document-card loading-card">
                <div class="document-preview">
                    <div class="loading-preview"></div>
                </div>
                <div class="document-content">
                    <div class="document-header">
                        <div class="skeleton-title"></div>
                    </div>
                    <div class="document-info">
                        <div class="skeleton-info"></div>
                        <div class="skeleton-info"></div>
                        <div class="skeleton-info"></div>
                    </div>
                    <div class="document-footer">
                        <div class="skeleton-avatar"></div>
                        <div class="skeleton-price"></div>
                    </div>
                </div>
            </div>
        `.repeat(8);
    }
}

// Render documents
function renderDocuments(vetrine) {
    console.log('🎨 Rendering documents:', vetrine.length);
    const grid = document.getElementById('documentsGrid');
    if (!grid) {
        console.error('Documents grid not found');
        return;
    }
    
    // Remove loading class
    grid.classList.remove('loading');
    
    // Update document count
    updateDocumentCount(vetrine.length);
    
    grid.innerHTML = '';
    
    if (!vetrine || vetrine.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <span class="material-symbols-outlined">search_off</span>
                <h3>Nessun documento trovato</h3>
                <p>Questo venditore non ha ancora caricato documenti.</p>
            </div>
        `;
        return;
    }

    vetrine.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.dataset.id = item.id;
        card.style.animationDelay = `${index * 0.1}s`;
        
        // Make the entire card clickable
        card.style.cursor = 'pointer';
        card.onclick = async (e) => {
            // Don't trigger if clicking on interactive elements
            if (e.target.closest('.favorite-button') || e.target.closest('.view-files-button')) {
                return;
            }
            
            // Navigate to document preview page
            window.location.href = `document-preview.html?id=${item.id}`;
        };

        const documentTitle = item.title || 'Documento Senza Titolo';
        const rating = parseFloat(item.rating) || 0;
        const reviewCount = parseInt(item.review_count) || 0;
        const description = item.description || 'Nessuna descrizione disponibile';
        const price = parseFloat(item.price) || 0;
        
        const stars = generateStars(Math.floor(rating));
        
        // Generate preview content
        const previewContent = `
            <div class="preview-icon">
                <span class="document-icon">📁</span>
                <div class="file-extension">VETRINA</div>
            </div>
        `;
        
        // Add a view files button for vetrine
        const viewFilesButton = `<button class="view-files-button"><span class="material-symbols-outlined">fullscreen</span>Visualizza</button>`;

        // Update the favorite button to include the initial state from the API
        const isFavorited = item.favorite === true;
        
        card.innerHTML = `
            <div class="document-preview">
                ${previewContent}
                ${viewFilesButton}
                <div class="document-type-badges">
                    ${(() => {
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
                <div class="rating-badge">
                    <div class="rating-stars">${stars}</div>
                    <span class="rating-count">(${reviewCount})</span>
                </div>
            </div>
            
            <button class="favorite-button ${isFavorited ? 'active' : ''}" 
                    onclick="toggleFavorite(this, event)" 
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
                <div class="document-footer">
                    <div class="document-footer-left">
                        <div class="owner-avatar ${getAvatarVariant(item.author_username)}" title="Caricato da ${item.author_username || 'Unknown'}">
                            ${item.author_username ? item.author_username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div class="document-meta">
                            ${formatFileSize(item.size || 0)}
                        </div>
                    </div>
                    <div class="document-price ${price === 0 ? 'free' : 'paid'}" title="${price === 0 ? 'Documento gratuito' : `Prezzo: ${formatPrice(price)}`}">
                        ${formatPrice(price)}
                    </div>
                </div>
            </div>
        `;
        
        // Add view files button functionality
        card.querySelector('.view-files-button').addEventListener('click', async (e) => {
            e.stopPropagation();
            
            try {
                const button = e.target.closest('.view-files-button');
                const originalContent = button.innerHTML;
                button.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span>Caricamento...';
                button.disabled = true;
                
                const filesResponse = await makeAuthenticatedRequest(`/vetrine/${item.id}/files`);
                
                if (!filesResponse || !filesResponse.files || filesResponse.files.length === 0) {
                    showError('Nessun file trovato in questa vetrina');
                    return;
                }
                
                const vetrinaWithFiles = {
                    ...item,
                    files: filesResponse.files
                };
                
                // For now, just navigate to document preview
                window.location.href = `document-preview.html?id=${item.id}`;
                
            } catch (error) {
                console.error('Error loading vetrina files:', error);
                showError('Errore nel caricamento dei file. Riprova più tardi.');
            } finally {
                const button = e.target.closest('.view-files-button');
                if (button) {
                    button.innerHTML = originalContent;
                    button.disabled = false;
                }
            }
        });

        grid.appendChild(card);
    });

    // Animate document cards into view
    setTimeout(() => {
        const cards = document.querySelectorAll('.document-card');
        cards.forEach((card, index) => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    }, 100);
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const clearSearch = document.getElementById('clearSearch');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query) {
                clearSearch.style.display = 'block';
                performSearch(query);
            } else {
                clearSearch.style.display = 'none';
                // Reset to original vetrine
                currentVetrine = [...originalVetrine];
                renderDocuments(currentVetrine);
            }
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) {
                    performSearch(query);
                }
            }
        });
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                performSearch(query);
            }
        });
    }
    
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            clearSearch.style.display = 'none';
            currentVetrine = [...originalVetrine];
            renderDocuments(currentVetrine);
        });
    }
}

// Perform search
function performSearch(query) {
    console.log('🔍 Performing search:', query);
    
    if (!query.trim()) {
        currentVetrine = [...originalVetrine];
        renderDocuments(currentVetrine);
        return;
    }
    
    const searchTerm = query.toLowerCase();
    const filteredVetrine = originalVetrine.filter(item => {
        const title = (item.title || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        const faculty = (item.faculty_name || '').toLowerCase();
        const course = (item.course_name || '').toLowerCase();
        const language = (item.language || '').toLowerCase();
        
        return title.includes(searchTerm) ||
               description.includes(searchTerm) ||
               faculty.includes(searchTerm) ||
               course.includes(searchTerm) ||
               language.includes(searchTerm);
    });
    
    currentVetrine = filteredVetrine;
    renderDocuments(currentVetrine);
}

// Initialize filters
function initializeFilters() {
    // For now, we'll implement basic filter functionality
    // This can be expanded later to match the search page filters
    
    const clearAllFilters = document.getElementById('clearAllFilters');
    const clearAllFiltersBottom = document.getElementById('clearAllFiltersBottom');
    
    if (clearAllFilters) {
        clearAllFilters.addEventListener('click', clearAllFiltersAction);
    }
    
    if (clearAllFiltersBottom) {
        clearAllFiltersBottom.addEventListener('click', clearAllFiltersAction);
    }
}

// Clear all filters
function clearAllFiltersAction() {
    console.log('🧹 Clearing all filters');
    activeFilters = {};
    currentVetrine = [...originalVetrine];
    renderDocuments(currentVetrine);
    updateActiveFiltersDisplay();
}

// Initialize scroll to top
function initializeScrollToTop() {
    const scrollToTopBtn = document.getElementById('scrollToTop');
    if (!scrollToTopBtn) return;
    
    const scrollThreshold = 300;
    
    function handleScroll() {
        if (window.scrollY > scrollThreshold) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    }
    
    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
    
    window.addEventListener('scroll', handleScroll);
    scrollToTopBtn.addEventListener('click', scrollToTop);
}

// Update document count
function updateDocumentCount(count) {
    const documentCountContainer = document.getElementById('documentCountContainer');
    const documentCount = document.getElementById('documentCount');
    
    if (documentCountContainer && documentCount) {
        const documentText = count === 1 ? 'DOCUMENTO TROVATO' : 'DOCUMENTI TROVATI';
        documentCount.textContent = `${count} ${documentText}`;
        documentCountContainer.style.display = 'block';
    }
}

// Update active filters display
function updateActiveFiltersDisplay() {
    const activeFiltersElement = document.getElementById('activeFilters');
    const activeFiltersList = document.getElementById('activeFiltersList');
    
    if (!activeFiltersElement || !activeFiltersList) return;
    
    const filterCount = Object.keys(activeFilters).length;
    
    if (filterCount > 0) {
        activeFiltersElement.style.display = 'block';
        // Render filter tags here if needed
    } else {
        activeFiltersElement.style.display = 'none';
    }
}

// Utility functions
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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatPrice(price) {
    if (price === 0) return 'Gratis';
    const formattedPrice = parseFloat(price).toFixed(2);
    const cleanPrice = formattedPrice.replace(/\.?0+$/, '');
    return `€${cleanPrice}`;
}

function formatCanaleDisplay(canale) {
    if (canale === null || canale === undefined) return '';
    return canale.toString();
}

function getTagDisplayName(tag) {
    const tagMap = {
        'esame': 'Esame',
        'appunti': 'Appunti',
        'dispensa': 'Dispensa',
        'progetto': 'Progetto',
        'tesi': 'Tesi',
        'altro': 'Altro'
    };
    return tagMap[tag.toLowerCase()] || tag;
}

// API functions
async function makeAuthenticatedRequest(url) {
    try {
        const response = await fetch(`${API_BASE}${url}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Toggle favorite
async function toggleFavorite(button, event) {
    event.stopPropagation();
    
    try {
        const card = button.closest('.document-card');
        const vetrinaId = card.dataset.id;
        
        const isFavorited = button.classList.contains('active');
        const endpoint = isFavorited ? `/vetrine/${vetrinaId}/unfavorite` : `/vetrine/${vetrinaId}/favorite`;
        
        const response = await makeAuthenticatedRequest(endpoint);
        
        if (response && response.success) {
            button.classList.toggle('active');
            const title = button.classList.contains('active') ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti';
            button.title = title;
            
            // Update the item in our arrays
            const item = originalVetrine.find(v => v.id == vetrinaId);
            if (item) {
                item.favorite = !isFavorited;
            }
            
            const currentItem = currentVetrine.find(v => v.id == vetrinaId);
            if (currentItem) {
                currentItem.favorite = !isFavorited;
            }
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showError('Errore nell\'aggiornamento dei preferiti');
    }
}

// Show error message
function showError(message) {
    console.error('Error:', message);
    // You can implement a proper error notification system here
    alert(message);
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Add logout button functionality
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}); 