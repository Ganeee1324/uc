// API Configuration
const API_BASE = window.APP_CONFIG?.API_BASE || 'https://symbia.it:5000';

// Global variables for chart functionality
let currentChartType = 'revenue'; // Track current chart type
let mainChartTimePeriod = '7d'; // Track main chart time period
let histogramTimePeriod = '7d'; // Track histogram time period
let chartTooltip = null; // Global tooltip element

// Dynamic chart data - placeholder for backend integration
const chartData = {
    '7d': {
        revenue: [
            { day: 'Lun', value: 1250, label: 'Lunedì' },
            { day: 'Mar', value: 1580, label: 'Martedì' },
            { day: 'Mer', value: 1920, label: 'Mercoledì' },
            { day: 'Gio', value: 2340, label: 'Giovedì' },
            { day: 'Ven', value: 2680, label: 'Venerdì' },
            { day: 'Sab', value: 2890, label: 'Sabato' },
            { day: 'Dom', value: 3100, label: 'Domenica' }
        ],
        sales: [
            { day: 'Lun', value: 28, label: 'Lunedì' },
            { day: 'Mar', value: 35, label: 'Martedì' },
            { day: 'Mer', value: 42, label: 'Mercoledì' },
            { day: 'Gio', value: 51, label: 'Giovedì' },
            { day: 'Ven', value: 58, label: 'Venerdì' },
            { day: 'Sab', value: 63, label: 'Sabato' },
            { day: 'Dom', value: 67, label: 'Domenica' }
        ],
        downloads: [
            { day: 'Lun', value: 156, label: 'Lunedì' },
            { day: 'Mar', value: 203, label: 'Martedì' },
            { day: 'Mer', value: 267, label: 'Mercoledì' },
            { day: 'Gio', value: 321, label: 'Giovedì' },
            { day: 'Ven', value: 389, label: 'Venerdì' },
            { day: 'Sab', value: 445, label: 'Sabato' },
            { day: 'Dom', value: 512, label: 'Domenica' }
        ],
        views: [
            { day: 'Lun', value: 890, label: 'Lunedì' },
            { day: 'Mar', value: 1240, label: 'Martedì' },
            { day: 'Mer', value: 1456, label: 'Mercoledì' },
            { day: 'Gio', value: 1789, label: 'Giovedì' },
            { day: 'Ven', value: 2103, label: 'Venerdì' },
            { day: 'Sab', value: 2456, label: 'Sabato' },
            { day: 'Dom', value: 2789, label: 'Domenica' }
        ],
        conversion: [
            { day: 'Lun', value: 3.1, label: 'Lunedì' },
            { day: 'Mar', value: 2.8, label: 'Martedì' },
            { day: 'Mer', value: 2.9, label: 'Mercoledì' },
            { day: 'Gio', value: 2.9, label: 'Giovedì' },
            { day: 'Ven', value: 2.8, label: 'Venerdì' },
            { day: 'Sab', value: 2.6, label: 'Sabato' },
            { day: 'Dom', value: 2.4, label: 'Domenica' }
        ]
    },
    '30d': {
        revenue: [
            { day: 'Sett 1', value: 8500, label: 'Settimana 1' },
            { day: 'Sett 2', value: 9200, label: 'Settimana 2' },
            { day: 'Sett 3', value: 11400, label: 'Settimana 3' },
            { day: 'Sett 4', value: 13200, label: 'Settimana 4' }
        ],
        sales: [
            { day: 'Sett 1', value: 185, label: 'Settimana 1' },
            { day: 'Sett 2', value: 221, label: 'Settimana 2' },
            { day: 'Sett 3', value: 267, label: 'Settimana 3' },
            { day: 'Sett 4', value: 298, label: 'Settimana 4' }
        ],
        downloads: [
            { day: 'Sett 1', value: 1250, label: 'Settimana 1' },
            { day: 'Sett 2', value: 1456, label: 'Settimana 2' },
            { day: 'Sett 3', value: 1789, label: 'Settimana 3' },
            { day: 'Sett 4', value: 2103, label: 'Settimana 4' }
        ],
        views: [
            { day: 'Sett 1', value: 6200, label: 'Settimana 1' },
            { day: 'Sett 2', value: 7350, label: 'Settimana 2' },
            { day: 'Sett 3', value: 8900, label: 'Settimana 3' },
            { day: 'Sett 4', value: 10200, label: 'Settimana 4' }
        ],
        conversion: [
            { day: 'Sett 1', value: 2.98, label: 'Settimana 1' },
            { day: 'Sett 2', value: 3.01, label: 'Settimana 2' },
            { day: 'Sett 3', value: 3.00, label: 'Settimana 3' },
            { day: 'Sett 4', value: 2.92, label: 'Settimana 4' }
        ]
    },
    '90d': {
        revenue: [
            { day: 'Gen', value: 25000, label: 'Gennaio' },
            { day: 'Feb', value: 28500, label: 'Febbraio' },
            { day: 'Mar', value: 31200, label: 'Marzo' }
        ],
        sales: [
            { day: 'Gen', value: 650, label: 'Gennaio' },
            { day: 'Feb', value: 720, label: 'Febbraio' },
            { day: 'Mar', value: 890, label: 'Marzo' }
        ],
        downloads: [
            { day: 'Gen', value: 4200, label: 'Gennaio' },
            { day: 'Feb', value: 4850, label: 'Febbraio' },
            { day: 'Mar', value: 5600, label: 'Marzo' }
        ],
        views: [
            { day: 'Gen', value: 18500, label: 'Gennaio' },
            { day: 'Feb', value: 21200, label: 'Febbraio' },
            { day: 'Mar', value: 24800, label: 'Marzo' }
        ],
        conversion: [
            { day: 'Gen', value: 3.51, label: 'Gennaio' },
            { day: 'Feb', value: 3.40, label: 'Febbraio' },
            { day: 'Mar', value: 3.59, label: 'Marzo' }
        ]
    },
    '1y': {
        revenue: [
            { day: 'Q1', value: 84700, label: '1° Trimestre' },
            { day: 'Q2', value: 92400, label: '2° Trimestre' },
            { day: 'Q3', value: 98600, label: '3° Trimestre' },
            { day: 'Q4', value: 105200, label: '4° Trimestre' }
        ],
        sales: [
            { day: 'Q1', value: 2260, label: '1° Trimestre' },
            { day: 'Q2', value: 2485, label: '2° Trimestre' },
            { day: 'Q3', value: 2690, label: '3° Trimestre' },
            { day: 'Q4', value: 2890, label: '4° Trimestre' }
        ],
        downloads: [
            { day: 'Q1', value: 14650, label: '1° Trimestre' },
            { day: 'Q2', value: 16200, label: '2° Trimestre' },
            { day: 'Q3', value: 17850, label: '3° Trimestre' },
            { day: 'Q4', value: 19500, label: '4° Trimestre' }
        ],
        views: [
            { day: 'Q1', value: 64500, label: '1° Trimestre' },
            { day: 'Q2', value: 71200, label: '2° Trimestre' },
            { day: 'Q3', value: 78900, label: '3° Trimestre' },
            { day: 'Q4', value: 85600, label: '4° Trimestre' }
        ],
        conversion: [
            { day: 'Q1', value: 3.50, label: '1° Trimestre' },
            { day: 'Q2', value: 3.49, label: '2° Trimestre' },
            { day: 'Q3', value: 3.41, label: '3° Trimestre' },
            { day: 'Q4', value: 3.38, label: '4° Trimestre' }
        ]
    }
};

// Histogram data - placeholder for backend integration
const histogramData = {
    '7d': [
        { type: 'Appunti', count: 15, revenue: 450 },
        { type: 'Esami', count: 45, revenue: 1350 },
        { type: 'Libri', count: 8, revenue: 240 },
        { type: 'Progetti', count: 25, revenue: 750 },
        { type: 'Tesi', count: 5, revenue: 150 },
        { type: 'Altri', count: 12, revenue: 360 }
    ],
    '30d': [
        { type: 'Appunti', count: 85, revenue: 2550 },
        { type: 'Esami', count: 120, revenue: 3600 },
        { type: 'Libri', count: 45, revenue: 1350 },
        { type: 'Progetti', count: 95, revenue: 2850 },
        { type: 'Tesi', count: 25, revenue: 750 },
        { type: 'Altri', count: 35, revenue: 1050 }
    ],
    '90d': [
        { type: 'Appunti', count: 180, revenue: 5400 },
        { type: 'Esami', count: 320, revenue: 9600 },
        { type: 'Libri', count: 95, revenue: 2850 },
        { type: 'Progetti', count: 220, revenue: 6600 },
        { type: 'Tesi', count: 65, revenue: 1950 },
        { type: 'Altri', count: 85, revenue: 2550 }
    ],
    '1y': [
        { type: 'Appunti', count: 450, revenue: 13500 },
        { type: 'Esami', count: 680, revenue: 20400 },
        { type: 'Libri', count: 220, revenue: 6600 },
        { type: 'Progetti', count: 520, revenue: 15600 },
        { type: 'Tesi', count: 180, revenue: 5400 },
        { type: 'Altri', count: 250, revenue: 7500 }
    ]
};

// Mobile Menu Toggle Logic
let isMobileMenuOpen = false;

function toggleMobileMenu() {
    console.log('toggleMobileMenu called, current state:', isMobileMenuOpen);
    isMobileMenuOpen = !isMobileMenuOpen;
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mainContent = document.querySelector('.main-content');
    const hamburgerInput = document.querySelector('#mobileMenuToggle input[type="checkbox"]');
    
    console.log('New state:', isMobileMenuOpen);
    console.log('Elements found:', { sidebar, sidebarOverlay, hamburgerInput });
    
    if (isMobileMenuOpen) {
        console.log('Opening mobile menu...');
        sidebar.classList.add('open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
        if (mainContent) mainContent.classList.add('sidebar-open');
        document.body.classList.add('sidebar-open');
        hamburgerInput.checked = true;
        document.body.style.overflow = 'hidden';
    } else {
        console.log('Closing mobile menu...');
        sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        if (mainContent) mainContent.classList.remove('sidebar-open');
        document.body.classList.remove('sidebar-open');
        hamburgerInput.checked = false;
        document.body.style.overflow = '';
    }
}

function initializeMobileMenu() {
    const hamburger = document.getElementById('mobileMenuToggle');
    const hamburgerInput = document.querySelector('#mobileMenuToggle input[type="checkbox"]');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    console.log('Initializing mobile menu...');
    console.log('Hamburger:', hamburger);
    console.log('Hamburger input:', hamburgerInput);
    console.log('Sidebar:', sidebar);
    console.log('Sidebar overlay:', sidebarOverlay);
    
    if (hamburger && sidebar) {
        console.log('Adding click event listener to hamburger');
        hamburger.addEventListener('click', function(e) {
            console.log('Hamburger clicked!');
            e.preventDefault();
            e.stopPropagation();
            toggleMobileMenu();
        });
        
        // Also listen for checkbox changes
        hamburgerInput.addEventListener('change', function(e) {
            console.log('Hamburger input changed:', e.target.checked);
            if (e.target.checked !== isMobileMenuOpen) {
                toggleMobileMenu();
            }
        });
        
        // Close menu when clicking on overlay
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function() {
                if (isMobileMenuOpen) {
                    toggleMobileMenu();
                }
            });
        }
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (isMobileMenuOpen && !sidebar.contains(e.target) && !hamburger.contains(e.target)) {
                toggleMobileMenu();
            }
        });
        
        // Close menu on window resize if switching to desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768 && isMobileMenuOpen) {
                toggleMobileMenu();
            }
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isMobileMenuOpen) {
                toggleMobileMenu();
            }
        });
    }
}

// ===========================
// TAB SWITCHING FUNCTIONALITY
// ===========================

let currentTab = 'profile'; // Default tab

window.switchTab = async function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Reset reviews initialization when switching away from stats
    if (tabName !== 'stats' && reviewsInitialized) {
        console.log('Resetting reviews initialization for tab switch');
        reviewsInitialized = false;
    }
    
    // Hide all content sections
    const profileSection = document.querySelector('.profile-section');
    const dashboardRow = document.querySelector('.dashboard-row');
    const statsDashboard = document.getElementById('statsDashboard');
    const documentsDashboard = document.getElementById('documentsDashboard');
    const favoritesDashboard = document.getElementById('favoritesDashboard');
    const settingsDashboard = document.getElementById('settingsDashboard');
    const mainSearchContainer = document.getElementById('searchSectionContainer');
    const documentsSearchContainer = document.getElementById('documentsSearchSectionContainer');
    const favoritesSearchContainer = document.getElementById('favoritesSearchSectionContainer');
    
    if (tabName === 'stats') {
        // Show stats dashboard, hide others
        if (profileSection) profileSection.style.display = 'none';
        if (dashboardRow) dashboardRow.style.display = 'none';
        if (statsDashboard) statsDashboard.style.display = 'block';
        if (documentsDashboard) documentsDashboard.style.display = 'none';
        if (favoritesDashboard) favoritesDashboard.style.display = 'none';
        if (settingsDashboard) settingsDashboard.style.display = 'none';
        if (mainSearchContainer) mainSearchContainer.style.display = 'none';
        if (documentsSearchContainer) {
            documentsSearchContainer.style.display = 'none';
            // Don't clear innerHTML to preserve search components
        }
        if (favoritesSearchContainer) {
            favoritesSearchContainer.style.display = 'none';
            // Don't clear innerHTML to preserve search components
        }
        
        currentTab = 'stats';
        
        // DIRECT REVIEWS INITIALIZATION - Fallback method
        console.log('🎯 Stats tab shown - attempting direct reviews initialization...');
        setTimeout(() => {
            console.log('🔄 Direct reviews initialization timeout reached');
            if (typeof initializeReviewsSection === 'function') {
                console.log('✅ Calling initializeReviewsSection directly from stats tab switch');
                initializeReviewsSection();
                
                // Force reviews to show if they're not visible after 2 seconds
                setTimeout(() => {
                    const reviewsList = document.getElementById('reviewsList');
                    if (reviewsList && reviewsList.children.length === 0) {
                        console.log('🔧 Reviews not visible, forcing re-initialization...');
                        reviewsInitialized = false; // Reset the flag
                        initializeReviewsSection();
                    }
                }, 2000);
            } else {
                console.error('❌ initializeReviewsSection not available in direct call');
            }
            
            // Also reinitialize the documents period filter when stats tab is shown
            console.log('🔄 Reinitializing documents period filter for stats tab');
            initializeDocumentsPeriodFilter();
        }, 1000); // Wait 1 second after tab switch
        
        // Initialize charts when stats tab is shown
        setTimeout(() => {
            console.log('Initializing charts for stats tab...');
            initializeDynamicCharts();
        }, 100);
    } else if (tabName === 'documents') {
        // Show documents dashboard, hide others
        if (profileSection) profileSection.style.display = 'none';
        if (dashboardRow) dashboardRow.style.display = 'none';
        if (statsDashboard) statsDashboard.style.display = 'none';
        if (favoritesDashboard) favoritesDashboard.style.display = 'none';
        if (settingsDashboard) settingsDashboard.style.display = 'none';
        if (mainSearchContainer) mainSearchContainer.style.display = 'none';
        if (favoritesSearchContainer) {
            favoritesSearchContainer.style.display = 'none';
            // Don't clear innerHTML to preserve search components
        }
        
        // Show documents dashboard
        if (documentsDashboard) documentsDashboard.style.display = 'block';
        if (documentsSearchContainer) documentsSearchContainer.style.display = 'block';
        
        currentTab = 'documents';
        
        // Documents search component is now handled via HTML Web Component - will auto-initialize
        console.log('Documents dashboard activated - search-section web component will handle itself');
        
        // Ensure search components are properly initialized when container becomes visible
        setTimeout(() => {
            const searchComponents = documentsSearchContainer.querySelectorAll('search-section-component');
            searchComponents.forEach(component => {
                if (!component.isInitialized) {
                    console.log('🔄 Initializing documents search component');
                    // Reset the component state to ensure clean initialization
                    component.isInitialized = false;
                    component.connectedCallback();
                } else {
                    console.log('✅ Documents search component already initialized');
                }
            });
        }, 100);
    } else if (tabName === 'favorites') {
        // Show favorites dashboard, hide others
        if (profileSection) profileSection.style.display = 'none';
        if (dashboardRow) dashboardRow.style.display = 'none';
        if (statsDashboard) statsDashboard.style.display = 'none';
        if (documentsDashboard) documentsDashboard.style.display = 'none';
        if (settingsDashboard) settingsDashboard.style.display = 'none';
        if (mainSearchContainer) mainSearchContainer.style.display = 'none';
        if (documentsSearchContainer) {
            documentsSearchContainer.style.display = 'none';
            // Don't clear innerHTML to preserve search components
        }
        
        // Show favorites dashboard
        if (favoritesDashboard) favoritesDashboard.style.display = 'block';
        if (favoritesSearchContainer) favoritesSearchContainer.style.display = 'block';
        
        currentTab = 'favorites';
        
        // Load favorites users first
        await loadFavoritesUsers();
        
        // Favorites search component is now handled via HTML Web Component - will auto-initialize
        console.log('Favorites dashboard activated - search-section web component will handle itself');
        
        // Ensure search components are properly initialized when container becomes visible
        setTimeout(() => {
            const searchComponents = favoritesSearchContainer.querySelectorAll('search-section-component');
            searchComponents.forEach(component => {
                if (!component.isInitialized) {
                    console.log('🔄 Initializing favorites search component');
                    // Reset the component state to ensure clean initialization
                    component.isInitialized = false;
                    component.connectedCallback();
                } else {
                    console.log('✅ Favorites search component already initialized');
                }
            });
        }, 100);
    } else if (tabName === 'settings') {
        // Show settings dashboard, hide others
        if (profileSection) profileSection.style.display = 'none';
        if (dashboardRow) dashboardRow.style.display = 'none';
        if (statsDashboard) statsDashboard.style.display = 'none';
        if (documentsDashboard) documentsDashboard.style.display = 'none';
        if (favoritesDashboard) favoritesDashboard.style.display = 'none';
        if (settingsDashboard) settingsDashboard.style.display = 'block';
        if (mainSearchContainer) mainSearchContainer.style.display = 'none';
        if (documentsSearchContainer) {
            documentsSearchContainer.style.display = 'none';
        }
        if (favoritesSearchContainer) {
            favoritesSearchContainer.style.display = 'none';
        }
        
        currentTab = 'settings';
        
        // Initialize settings functionality
        setTimeout(() => {
            initializeSettings();
        }, 100);
    } else {
        // Show profile/dashboard content, hide stats, documents, and favorites
        if (profileSection) profileSection.style.display = 'block';
        if (dashboardRow) dashboardRow.style.display = 'flex';
        if (statsDashboard) statsDashboard.style.display = 'none';
        if (documentsDashboard) documentsDashboard.style.display = 'none';
        if (favoritesDashboard) favoritesDashboard.style.display = 'none';
        if (settingsDashboard) settingsDashboard.style.display = 'none';
        if (mainSearchContainer) {
            mainSearchContainer.style.display = 'block';
            console.log('Setting main search container to display: block');
        }
        if (documentsSearchContainer) {
            documentsSearchContainer.style.display = 'none';
            // Don't clear innerHTML to preserve search components
        }
        if (favoritesSearchContainer) {
            favoritesSearchContainer.style.display = 'none';
            // Don't clear innerHTML to preserve search components
        }
        
        // Main search component is now handled via HTML Web Component - will auto-initialize
        console.log('Profile tab switched - search-section web component will handle itself');
        
        // Ensure search components are properly initialized when container becomes visible
        setTimeout(() => {
            const searchComponents = mainSearchContainer.querySelectorAll('search-section-component');
            searchComponents.forEach(component => {
                if (!component.isInitialized) {
                    console.log('🔄 Initializing main search component');
                    // Reset the component state to ensure clean initialization
                    component.isInitialized = false;
                    component.connectedCallback();
                } else {
                    console.log('✅ Main search component already initialized');
                }
            });
        }, 100);
        
        currentTab = 'profile';
    }
}

function initializeTabSwitching() {
    // Get menu items
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach((item) => {
        item.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const menuText = item.querySelector('.menu-text');
            if (menuText) {
                const text = menuText.textContent.trim();
                console.log('Menu item clicked:', text);
                
                // Remove active class from all menu items first
                menuItems.forEach(menuItem => {
                    menuItem.classList.remove('active');
                    console.log('Removed active class from:', menuItem.querySelector('.menu-text')?.textContent.trim());
                });
                
                // Add active class to clicked item
                item.classList.add('active');
                console.log('Added active class to:', text);
                
                // Handle specific tab switching
                if (text === 'Vendite') {
                    console.log('Switching to Vendite tab');
                    await switchTab('stats');
                } else if (text === 'Profilo') {
                    console.log('Switching to Profilo tab');
                    await switchTab('profile');
                } else if (text === 'I Miei Documenti') {
                    console.log('Switching to I Miei Documenti tab');
                    await switchTab('documents');
                } else if (text === 'Preferiti') {
                    console.log('Switching to Preferiti tab');
                    await switchTab('favorites');
                } else if (text === 'Impostazioni') {
                    console.log('Switching to Impostazioni tab');
                    await switchTab('settings');
                } else {
                    // For other menu items, just switch back to profile view
                    console.log('Switching to profile view for:', text);
                    await switchTab('profile');
                }
            }
        });
    });
}

// ===========================
// FAVORITES DASHBOARD FUNCTIONALITY
// ===========================

async function loadFavoritesUsers() {
    const favoritesUsersContainer = document.getElementById('favoritesUsersContainer');
    if (!favoritesUsersContainer) {
        console.error('Favorites users container not found');
        return;
    }
    
    try {
        // Show loading state
        favoritesUsersContainer.innerHTML = '<div class="loading-state">Caricamento...</div>';
        
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.error('No auth token found');
            showFavoritesUsersEmpty(favoritesUsersContainer);
            return;
        }
        
        const response = await fetch(`${API_BASE}/user/favorites`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Favorites data loaded:', data);
        
        // Extract unique users from favorites
        const uniqueUsers = new Map();
        
        if (data.vetrine && Array.isArray(data.vetrine)) {
            data.vetrine.forEach(vetrina => {
                if (vetrina.author) {
                    const userId = vetrina.author.user_id;
                    if (!uniqueUsers.has(userId)) {
                        uniqueUsers.set(userId, {
                            user_id: userId,
                            username: vetrina.author.username,
                            first_name: vetrina.author.first_name,
                            last_name: vetrina.author.last_name,
                            email: vetrina.author.email,
                            uploaded_documents_count: vetrina.author.uploaded_documents_count || 0,
                            favorite_vetrine_count: 1
                        });
                    } else {
                        // Increment favorite vetrine count for this user
                        uniqueUsers.get(userId).favorite_vetrine_count++;
                    }
                }
            });
        }
        
        const usersArray = Array.from(uniqueUsers.values());
        
        // Add placeholder users for testing
        const placeholderUsers = generatePlaceholderUsers();
        const allUsers = [...usersArray, ...placeholderUsers];
        
        if (allUsers.length === 0) {
            showFavoritesUsersEmpty(favoritesUsersContainer);
        } else {
            renderFavoritesUsers(favoritesUsersContainer, allUsers);
        }
        
    } catch (error) {
        console.error('Error loading favorites users:', error);
        showFavoritesUsersEmpty(favoritesUsersContainer, true);
    }
}

function showFavoritesUsersEmpty(container, isError = false) {
    const message = isError 
        ? 'Errore nel caricamento dei preferiti'
        : 'Non hai ancora aggiunto utenti ai preferiti';
    const subMessage = isError
        ? 'Riprova più tardi'
        : 'Inizia ad aggiungere documenti ai preferiti per vedere gli autori qui';
        
    container.innerHTML = `
        <div class="favorites-users-empty">
            <span class="material-symbols-outlined">${isError ? 'error' : 'favorite_border'}</span>
            <h3>${message}</h3>
            <p>${subMessage}</p>
        </div>
    `;
}

function renderFavoritesUsers(container, users) {
    const usersHtml = users.map(user => {
        const initials = getInitials(user.first_name, user.last_name, user.username);
        const fullName = getFullName(user.first_name, user.last_name, user.username);
        const statsText = `${user.favorite_vetrine_count} preferit${user.favorite_vetrine_count === 1 ? 'o' : 'i'} • ${user.uploaded_documents_count} document${user.uploaded_documents_count === 1 ? 'o' : 'i'}`;
        
        return `
            <div class="favorite-user-card" onclick="goToUserProfile(${user.user_id})">
                <div class="favorite-user-avatar">${initials}</div>
                <div class="favorite-user-name">${fullName}</div>
                <div class="favorite-user-email">${user.email}</div>
                <div class="favorite-user-stats">${statsText}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = usersHtml;
}

function getInitials(firstName, lastName, username) {
    if (firstName && lastName) {
        return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    } else if (firstName) {
        return firstName.charAt(0).toUpperCase();
    } else if (username) {
        return username.charAt(0).toUpperCase();
    }
    return '?';
}

function getFullName(firstName, lastName, username) {
    if (firstName && lastName) {
        return `${firstName} ${lastName}`;
    } else if (firstName) {
        return firstName;
    } else if (username) {
        return username;
    }
    return 'Utente';
}

function goToUserProfile(userId) {
    // Navigate to user profile page - using the same pattern as other parts of the app
    window.location.href = `vendor-page.html?userId=${userId}`;
}

function generatePlaceholderUsers() {
    const names = [
        { first: 'Marco', last: 'Rossi', email: 'marco.rossi@email.com' },
        { first: 'Giulia', last: 'Bianchi', email: 'giulia.bianchi@email.com' },
        { first: 'Alessandro', last: 'Verdi', email: 'a.verdi@email.com' },
        { first: 'Francesca', last: 'Neri', email: 'f.neri@email.com' },
        { first: 'Lorenzo', last: 'Gialli', email: 'lorenzo.g@email.com' },
        { first: 'Sofia', last: 'Blu', email: 'sofia.blu@email.com' },
        { first: 'Matteo', last: 'Viola', email: 'm.viola@email.com' },
        { first: 'Chiara', last: 'Rosa', email: 'chiara.rosa@email.com' },
        { first: 'Andrea', last: 'Marroni', email: 'andrea.m@email.com' },
        { first: 'Valentina', last: 'Grigi', email: 'v.grigi@email.com' },
        { first: 'Davide', last: 'Arancioni', email: 'd.arancioni@email.com' },
        { first: 'Elena', last: 'Azzurri', email: 'elena.a@email.com' },
        { first: 'Simone', last: 'Fucsia', email: 's.fucsia@email.com' },
        { first: 'Martina', last: 'Oro', email: 'martina.oro@email.com' },
        { first: 'Federico', last: 'Argento', email: 'f.argento@email.com' },
        { first: 'Camilla', last: 'Bronzo', email: 'camilla.b@email.com' },
        { first: 'Riccardo', last: 'Rame', email: 'riccardo.r@email.com' },
        { first: 'Giorgia', last: 'Platino', email: 'giorgia.p@email.com' },
        { first: 'Luca', last: 'Ferro', email: 'luca.ferro@email.com' },
        { first: 'Alice', last: 'Acciaio', email: 'alice.acciaio@email.com' },
        { first: 'Tommaso', last: 'Bruno', email: 'tommaso.bruno@email.com' },
        { first: 'Beatrice', last: 'Celeste', email: 'beatrice.celeste@email.com' },
        { first: 'Gabriele', last: 'Dorato', email: 'gabriele.dorato@email.com' },
        { first: 'Lucia', last: 'Emeraldo', email: 'lucia.emeraldo@email.com' },
        { first: 'Daniele', last: 'Fucsia', email: 'daniele.fucsia@email.com' },
        { first: 'Alessia', last: 'Granato', email: 'alessia.granato@email.com' },
        { first: 'Filippo', last: 'Indaco', email: 'filippo.indaco@email.com' },
        { first: 'Elisa', last: 'Jade', email: 'elisa.jade@email.com' },
        { first: 'Giovanni', last: 'Kaki', email: 'giovanni.kaki@email.com' },
        { first: 'Marta', last: 'Lavanda', email: 'marta.lavanda@email.com' },
        { first: 'Nicola', last: 'Magenta', email: 'nicola.magenta@email.com' },
        { first: 'Roberta', last: 'Nero', email: 'roberta.nero@email.com' },
        { first: 'Paolo', last: 'Ocra', email: 'paolo.ocra@email.com' },
        { first: 'Silvia', last: 'Pesca', email: 'silvia.pesca@email.com' },
        { first: 'Roberto', last: 'Quarzo', email: 'roberto.quarzo@email.com' },
        { first: 'Teresa', last: 'Rubino', email: 'teresa.rubino@email.com' },
        { first: 'Stefano', last: 'Smeraldo', email: 'stefano.smeraldo@email.com' },
        { first: 'Veronica', last: 'Topazio', email: 'veronica.topazio@email.com' },
        { first: 'Umberto', last: 'Ultrar', email: 'umberto.ultrar@email.com' },
        { first: 'Wanda', last: 'Viola', email: 'wanda.viola@email.com' },
        { first: 'Xavier', last: 'Xantico', email: 'xavier.xantico@email.com' },
        { first: 'Ylenia', last: 'Yellow', email: 'ylenia.yellow@email.com' },
        { first: 'Zeno', last: 'Zaffiro', email: 'zeno.zaffiro@email.com' }
    ];
    
    return names.map((name, index) => ({
        user_id: 1000 + index,
        username: `${name.first.toLowerCase()}_${name.last.toLowerCase()}`,
        first_name: name.first,
        last_name: name.last,
        email: name.email,
        uploaded_documents_count: Math.floor(Math.random() * 50) + 1,
        favorite_vetrine_count: Math.floor(Math.random() * 10) + 1
    }));
}

// ===========================
// DOCUMENTS DASHBOARD FUNCTIONALITY
// ===========================
// Note: I Miei Documenti section now uses only the search-section component
// No custom logic needed - the search-section handles everything automatically

// ===========================
// STATS DASHBOARD FUNCTIONALITY
// ===========================

function initializeStatsDropdown() {
    const dropdownBtn = document.getElementById('chartDropdownBtn');
    const dropdownMenu = document.getElementById('chartDropdownMenu');
    const dropdownOptions = document.querySelectorAll('.chart-dropdown-option');
    
    if (!dropdownBtn || !dropdownMenu) {
        console.log('Dropdown elements not found');
        return;
    }
    
    console.log('Initializing stats dropdown...');
    
    // Toggle dropdown on button click
    dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
        
        // Rotate arrow icon
        const arrow = dropdownBtn.querySelector('.material-symbols-outlined');
        if (arrow) {
            arrow.style.transform = dropdownMenu.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    });
    
    // Handle dropdown option selection
    dropdownOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Remove active class from all options
            dropdownOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to selected option
            option.classList.add('active');
            
            // Update button text
            const optionText = option.querySelector('span:last-child').textContent;
            const dropdownText = dropdownBtn.querySelector('.dropdown-text');
            if (dropdownText) {
                dropdownText.textContent = optionText;
            }
            
            // Get chart type and update chart
            const chartType = option.getAttribute('data-chart');
            updateChart(chartType);
            updateChartType(chartType);
            
            // Close dropdown
            dropdownMenu.classList.remove('show');
            const arrow = dropdownBtn.querySelector('.material-symbols-outlined');
            if (arrow) {
                arrow.style.transform = 'rotate(0deg)';
            }
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
            const arrow = dropdownBtn.querySelector('.material-symbols-outlined');
            if (arrow) {
                arrow.style.transform = 'rotate(0deg)';
            }
        }
    });
}

function initializeTimeFilters() {
    const timeFilterBtns = document.querySelectorAll('.time-filter-btn');
    
    console.log('Initializing time filters, found:', timeFilterBtns.length, 'buttons');
    
    timeFilterBtns.forEach((btn, index) => {
        console.log(`Adding event listener to button ${index}:`, btn.textContent);
        
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Time filter button clicked:', btn.textContent);
            
            // Remove active class from all buttons
            timeFilterBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Get period and update chart
            const period = btn.getAttribute('data-period');
            console.log('Updating chart period to:', period);
            updateChartPeriod(period);
        });
    });
}

function initializeDocumentsPeriodFilter(retryCount = 0) {
    console.log('[DOCUMENTS] Attempting to initialize period filter... (retry:', retryCount, ')');
    
    const periodBtn = document.getElementById('documentsPeriodBtn');
    const periodDropdown = document.getElementById('documentsPeriodDropdown');
    const periodOptions = document.querySelectorAll('.period-option');
    
    console.log('[DOCUMENTS] Elements found:', {
        periodBtn: !!periodBtn,
        periodDropdown: !!periodDropdown,
        periodOptionsCount: periodOptions.length
    });
    
    if (!periodBtn || !periodDropdown) {
        if (retryCount < 5) {
            console.log('[DOCUMENTS] Period filter elements not found - will retry');
            // Retry after a short delay
            setTimeout(() => {
                console.log('[DOCUMENTS] Retrying period filter initialization...');
                initializeDocumentsPeriodFilter(retryCount + 1);
            }, 500);
        } else {
            console.error('[DOCUMENTS] Period filter elements not found after 5 retries - giving up');
        }
        return;
    }
    
    // Prevent duplicate event listeners
    if (periodBtn.hasAttribute('data-initialized')) {
        console.log('[DOCUMENTS] Period filter already initialized');
        return;
    }
    
    console.log('[DOCUMENTS] Initializing period filter dropdown');
    
    // Toggle dropdown on button click
    periodBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[DOCUMENTS] Period button clicked');
        
        const isOpen = periodDropdown.classList.contains('show');
        
        if (isOpen) {
            closeDocumentsPeriodDropdown();
        } else {
            openDocumentsPeriodDropdown();
        }
    });
    
    // Handle period option selection
    periodOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Remove active class from all options
            periodOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to selected option
            option.classList.add('active');
            
            // Update button text
            const optionText = option.textContent;
            const periodText = periodBtn.querySelector('.period-text');
            if (periodText) {
                periodText.textContent = optionText;
            }
            
            // Get period and update documents table
            const period = option.getAttribute('data-period');
            updateDocumentsPeriod(period);
            
            // Close dropdown
            closeDocumentsPeriodDropdown();
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!periodBtn.contains(e.target) && !periodDropdown.contains(e.target)) {
            closeDocumentsPeriodDropdown();
        }
    });
    
    // Close dropdown on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDocumentsPeriodDropdown();
        }
    });
    
    // Mark as initialized
    periodBtn.setAttribute('data-initialized', 'true');
    console.log('[DOCUMENTS] Period filter dropdown initialized successfully');
}

function openDocumentsPeriodDropdown() {
    const periodBtn = document.getElementById('documentsPeriodBtn');
    const periodDropdown = document.getElementById('documentsPeriodDropdown');
    
    console.log('[DOCUMENTS] Opening period dropdown');
    
    if (periodBtn && periodDropdown) {
        periodBtn.classList.add('active');
        periodDropdown.classList.add('show');
        console.log('[DOCUMENTS] Period dropdown opened successfully');
    } else {
        console.log('[DOCUMENTS] Failed to open dropdown - elements not found');
    }
}

function closeDocumentsPeriodDropdown() {
    const periodBtn = document.getElementById('documentsPeriodBtn');
    const periodDropdown = document.getElementById('documentsPeriodDropdown');
    
    console.log('[DOCUMENTS] Closing period dropdown');
    
    if (periodBtn && periodDropdown) {
        periodBtn.classList.remove('active');
        periodDropdown.classList.remove('show');
        console.log('[DOCUMENTS] Period dropdown closed successfully');
    } else {
        console.log('[DOCUMENTS] Failed to close dropdown - elements not found');
    }
}

function updateDocumentsPeriod(period) {
    console.log('Updating documents period to:', period);
    
    // Here you would typically fetch new data based on the period
    // For now, we'll just add a subtle animation to indicate data change
    const tableBody = document.querySelector('.performance-table-body');
    if (tableBody) {
        tableBody.style.opacity = '0.7';
        setTimeout(() => {
            tableBody.style.opacity = '1';
        }, 300);
    }
    
    // You could also update the document data here
    // For example: fetchDocumentsData(period);
}

// Dynamic chart generation functions
function generateChart(chartType, timePeriod) {
    console.log('Generating chart:', chartType, timePeriod);
    
    const chartContainer = document.getElementById('mainChart');
    console.log('Chart container found:', chartContainer);
    if (!chartContainer) {
        console.error('Chart container not found!');
        return;
    }
    
    const data = chartData[timePeriod]?.[chartType] || chartData['7d'][chartType];
    console.log('Chart data found:', data);
    const maxValue = Math.max(...data.map(d => d.value));
    console.log('Max value:', maxValue);
    
    // Chart configuration
    const chartConfig = {
        width: 800,
        height: 320,
        margin: { top: 40, right: 50, bottom: 80, left: 50 },
        chartArea: { width: 700, height: 200 }
    };
    
    const colors = {
        revenue: '#3b82f6',
        sales: '#10b981', 
        downloads: '#f59e0b',
        views: '#8b5cf6',
        conversion: '#ef4444'
    };
    
    const color = colors[chartType] || '#3b82f6';
    
    // Generate SVG
    let svg = `
        <svg viewBox="0 0 ${chartConfig.width} ${chartConfig.height}" class="chart-svg" style="height: 320px;">
            <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:${color};stop-opacity:0.3" />
                    <stop offset="100%" style="stop-color:${color};stop-opacity:0" />
                </linearGradient>
                <pattern id="grid" width="100" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 100 0 L 0 0 0 50" fill="none" stroke="rgba(226, 232, 240, 0.4)" stroke-width="0.5"/>
                </pattern>
            </defs>
            <rect width="700" height="200" x="50" y="40" fill="url(#grid)" opacity="0.5"/>
    `;
    
    // Generate chart path and area
    const pathPoints = data.map((d, i) => {
        const x = 50 + (i * (700 / (data.length - 1)));
        const y = 240 - (d.value / maxValue * 200);
        return `${x},${y}`;
    }).join(' L');
    
    const areaPath = `M50,240 L${pathPoints} L${50 + (data.length - 1) * (700 / (data.length - 1))},240 L50,240 Z`;
    const linePath = `M${pathPoints.replace(/ L/g, ' L')}`;
    
    svg += `
            <!-- Chart area with gradient -->
            <path d="${areaPath}" fill="url(#chartGradient)" class="chart-area"/>
            
            <!-- Main chart line -->
            <path d="${linePath}" stroke="${color}" stroke-width="3" fill="none" class="chart-line"/>
    `;
    
    // Generate data points
    data.forEach((d, i) => {
        const x = 50 + (i * (700 / (data.length - 1)));
        const y = 240 - (d.value / maxValue * 200);
        
        svg += `
            <circle cx="${x}" cy="${y}" r="5" fill="#ffffff" stroke="${color}" stroke-width="3" class="chart-point" 
                    data-day="${d.label}" data-${chartType}="${d.value}"
                    onmouseenter="showTooltip(event, this)" onmouseleave="hideTooltip()" onmousemove="moveTooltip(event)"/>
        `;
    });
    
    // Add axes
    svg += `
            <!-- Axis lines -->
            <line x1="50" y1="40" x2="50" y2="240" stroke="#94a3b8" stroke-width="2" class="chart-axis-line"/>
            <line x1="50" y1="240" x2="750" y2="240" stroke="#94a3b8" stroke-width="2" class="chart-axis-line"/>
    `;
    
    // Generate Y-axis labels with round values
    const ySteps = 6; // Number of Y-axis labels
    for (let i = 0; i <= ySteps; i++) {
        const rawValue = (maxValue / ySteps) * (ySteps - i);
        // Round to nearest nice number ending in 0
        const value = Math.round(rawValue / 10) * 10;
        const y = 40 + (i * (200 / ySteps)) + 5;
        const format = chartType === 'revenue' ? `€${value.toLocaleString()}` : value.toLocaleString();
        svg += `<text x="40" y="${y}" text-anchor="end" fill="#64748b" font-size="11" font-weight="500">${format}</text>`;
    }
    
    // Generate X-axis labels
    data.forEach((d, i) => {
        const x = 50 + (i * (700 / (data.length - 1)));
        svg += `<text x="${x}" y="260" text-anchor="middle" fill="#64748b" font-size="11" font-weight="500">${d.day}</text>`;
    });
    
    svg += '</svg>';
    
    console.log('Generated SVG length:', svg.length);
    chartContainer.innerHTML = svg;
    console.log('Chart container innerHTML set');
}

function generateHistogram(timePeriod) {
    console.log('Generating histogram:', timePeriod);
    
    const histogramContainer = document.getElementById('histogramChart');
    console.log('Histogram container found:', histogramContainer);
    if (!histogramContainer) {
        console.error('Histogram container not found!');
        return;
    }
    
    const data = histogramData[timePeriod] || histogramData['7d'];
    console.log('=== HISTOGRAM UPDATE ===');
    console.log('Time period:', timePeriod);
    console.log('Histogram data found:', data);
    const maxCount = Math.max(...data.map(d => d.count));
    console.log('Max count:', maxCount);
    console.log('Data range:', data.map(d => ({ type: d.type, count: d.count })));
    console.log('=======================');
    
    // Chart configuration
    const chartConfig = {
        width: 800,
        height: 320,
        margin: { top: 40, right: 50, bottom: 80, left: 50 },
        chartArea: { width: 700, height: 200 }
    };
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    
    let svg = `
        <svg viewBox="0 0 ${chartConfig.width} ${chartConfig.height}" class="chart-svg" style="height: 320px;">
            <defs>
    `;
    
    // Generate gradients for each bar
    colors.forEach((color, i) => {
        svg += `
                <linearGradient id="histogramGradient${i + 1}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:${color};stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:${color};stop-opacity:0.7" />
                </linearGradient>
        `;
    });
    
    svg += `
                <pattern id="histogramGrid" width="100" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 100 0 L 0 0 0 50" fill="none" stroke="rgba(226, 232, 240, 0.3)" stroke-width="0.5"/>
                </pattern>
            </defs>
            <rect width="700" height="200" x="50" y="40" fill="url(#histogramGrid)" opacity="0.4"/>
    `;
    
    // Generate histogram bars
    const barWidth = 80;
    const barSpacing = 700 / data.length;
    
    data.forEach((d, i) => {
        const x = 50 + (i * barSpacing) + (barSpacing - barWidth) / 2;
        const height = (d.count / maxCount) * 200;
        const y = 240 - height;
        const colorIndex = i % colors.length;
        
        console.log(`Bar ${i}: ${d.type} - count: ${d.count}, height: ${height.toFixed(1)}, y: ${y.toFixed(1)}, x: ${x.toFixed(1)}`);
        
        svg += `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" 
                  fill="url(#histogramGradient${colorIndex + 1})" rx="6" 
                  class="histogram-bar" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"
                  data-type="${d.type}" data-count="${d.count}" data-revenue="€${d.revenue.toLocaleString()}"
                  onmouseenter="showHistogramTooltip(event, this)" onmouseleave="hideTooltip()" onmousemove="moveTooltip(event)"/>
        `;
        
        // Add value label on top of bar
        const labelY = y - 10;
        svg += `
            <rect x="${x + barWidth/2 - 10}" y="${labelY - 8}" width="20" height="16" fill="rgba(255,255,255,0.9)" rx="3" opacity="0.8"/>
            <text x="${x + barWidth/2}" y="${labelY + 4}" text-anchor="middle" fill="#1e293b" font-size="12" font-weight="700">${d.count}</text>
        `;
    });
    
    // Add axes
    svg += `
            <!-- Professional axis lines -->
            <line x1="50" y1="40" x2="50" y2="240" stroke="#94a3b8" stroke-width="2" class="chart-axis-line"/>
            <line x1="50" y1="240" x2="750" y2="240" stroke="#94a3b8" stroke-width="2" class="chart-axis-line"/>
    `;
    
    // Generate Y-axis labels with round values
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
        const rawValue = (maxCount / ySteps) * (ySteps - i);
        // Round to nearest nice number ending in 0
        const value = Math.round(rawValue / 10) * 10;
        const y = 40 + (i * (200 / ySteps)) + 5;
        svg += `<text x="40" y="${y}" text-anchor="end" fill="#64748b" font-size="11" font-weight="500">${value.toLocaleString()}</text>`;
    }
    
    // Generate X-axis labels
    data.forEach((d, i) => {
        const x = 50 + (i * barSpacing) + barSpacing/2;
        svg += `<text x="${x}" y="260" text-anchor="middle" fill="#64748b" font-size="12" font-weight="600">${d.type}</text>`;
    });
    
    svg += '</svg>';
    
    console.log('Generated histogram SVG length:', svg.length);
    histogramContainer.innerHTML = svg;
    console.log('Histogram container innerHTML set');
}

function updateChart(chartType) {
    currentChartType = chartType;
    generateChart(chartType, mainChartTimePeriod);
    
    // Preserve chart type selection in dropdown
    const options = document.querySelectorAll('.chart-dropdown-option');
    options.forEach(opt => opt.classList.remove('active'));
    
    const selectedOption = document.querySelector(`[data-chart="${chartType}"]`);
    if (selectedOption) {
        selectedOption.classList.add('active');
    }
    
    // Update dropdown button text
    const dropdownBtn = document.getElementById('chartDropdownBtn');
    const dropdownText = dropdownBtn?.querySelector('.dropdown-text');
    if (dropdownText) {
        const labels = {
            'revenue': 'Ricavi',
            'sales': 'Vendite',
            'downloads': 'Download',
            'views': 'Visualizzazioni',
            'conversion': 'Tasso di Conversione'
        };
        dropdownText.textContent = labels[chartType] || 'Ricavi';
    }
}

function updateChartPeriod(period, chartType = 'main') {
    console.log('Updating chart period to:', period, 'for chart:', chartType);
    
    if (chartType === 'main') {
        mainChartTimePeriod = period;
        // Update main chart
        generateChart(currentChartType, period);
        
        // Update only main chart time filter buttons
        document.querySelectorAll('.left-chart .time-filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-period') === period) {
                btn.classList.add('active');
            }
        });
    } else if (chartType === 'histogram') {
        histogramTimePeriod = period;
        // Update histogram
        generateHistogram(period);
        
        // Update only histogram time filter buttons
        document.querySelectorAll('.right-chart .time-filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-period') === period) {
                btn.classList.add('active');
            }
        });
    }
    
    console.log('Updated periods - Main:', mainChartTimePeriod, 'Histogram:', histogramTimePeriod);
}

function initializeDonutChart() {
    const chartSegments = document.querySelectorAll('.chart-segment');
    const revenueItems = document.querySelectorAll('.revenue-item');
    
    // Color mapping for segments
    const segmentColors = {
        0: { // Premium
            normal: '18',
            hover: '20',
            shadow: 'drop-shadow(0 8px 25px rgba(59, 130, 246, 0.4))'
        },
        1: { // Standard
            normal: '18',
            hover: '20',
            shadow: 'drop-shadow(0 8px 25px rgba(16, 185, 129, 0.4))'
        },
        2: { // Subscription
            normal: '18',
            hover: '20',
            shadow: 'drop-shadow(0 8px 25px rgba(245, 158, 11, 0.4))'
        }
    };
    
    // Add hover effects to segments
    chartSegments.forEach((segment, index) => {
        segment.addEventListener('mouseenter', () => {
            // Reset all segments first
            chartSegments.forEach((seg, i) => {
                if (i !== index) {
                    seg.style.opacity = '0.6';
                }
            });
            
            // Highlight current segment
            segment.style.strokeWidth = segmentColors[index].hover;
            segment.style.filter = segmentColors[index].shadow;
            segment.style.opacity = '1';
            
            // Highlight corresponding revenue item
            if (revenueItems[index]) {
                revenueItems[index].style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
                revenueItems[index].style.transform = 'translateX(6px)';
                revenueItems[index].style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.15)';
            }
        });
        
        segment.addEventListener('mouseleave', () => {
            // Reset all segments
            chartSegments.forEach((seg) => {
                seg.style.strokeWidth = '16';
                seg.style.filter = '';
                seg.style.opacity = '1';
            });
            
            // Remove highlight from revenue item
            if (revenueItems[index]) {
                revenueItems[index].style.backgroundColor = '';
                revenueItems[index].style.transform = '';
                revenueItems[index].style.boxShadow = '';
            }
        });
    });
    
    // Add hover effects to revenue items
    revenueItems.forEach((item, index) => {
        item.addEventListener('mouseenter', () => {
            // Reset all segments first
            chartSegments.forEach((seg, i) => {
                if (i !== index) {
                    seg.style.opacity = '0.6';
                }
            });
            
            // Highlight corresponding chart segment
            if (chartSegments[index]) {
                chartSegments[index].style.strokeWidth = segmentColors[index].hover;
                chartSegments[index].style.filter = segmentColors[index].shadow;
                chartSegments[index].style.opacity = '1';
            }
            
            item.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
            item.style.transform = 'translateX(6px)';
            item.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.15)';
        });
        
        item.addEventListener('mouseleave', () => {
            // Reset all segments
            chartSegments.forEach((seg) => {
                seg.style.strokeWidth = '16';
                seg.style.filter = '';
                seg.style.opacity = '1';
            });
            
            // Remove highlight from chart segment
            if (chartSegments[index]) {
                chartSegments[index].style.strokeWidth = '16';
                chartSegments[index].style.filter = '';
            }
            
            item.style.backgroundColor = '';
            item.style.transform = '';
            item.style.boxShadow = '';
        });
    });
}

function initializeDocumentPerformanceItems() {
    const performanceRows = document.querySelectorAll('.performance-row');
    
    performanceRows.forEach((row) => {
        // Remove any existing click handlers to prevent duplication
        row.removeEventListener('click', handleDocumentRowClick);
        
        // Add click handler
        row.addEventListener('click', handleDocumentRowClick);
    });
}

function handleDocumentRowClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const row = event.currentTarget;
    const documentTitle = row.querySelector('.document-title').textContent;
    
    // Add a brief click animation
    row.style.transform = 'translateX(4px) scale(0.98)';
    row.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
    
    setTimeout(() => {
        row.style.transform = 'translateX(6px)';
        row.style.backgroundColor = '';
    }, 150);
    
    // Reset animation after a delay
    setTimeout(() => {
        row.style.transform = '';
    }, 300);
    
    // Here you could add functionality like opening a modal with document details
    console.log('Document row clicked:', documentTitle);
    
    // Tooltip disabled for cleaner user experience
    // showDocumentTooltip(row, documentTitle);
}

function showDocumentTooltip(row, documentTitle) {
    // Remove any existing tooltips
    const existingTooltip = document.querySelector('.document-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'document-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-content">
            <strong>${documentTitle}</strong>
            <p>Click to view detailed analytics</p>
        </div>
    `;
    
    // Position tooltip
    const rect = row.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    tooltip.style.top = (rect.top - 10) + 'px';
    tooltip.style.right = '20px';
    tooltip.style.zIndex = '10000';
    
    document.body.appendChild(tooltip);
    
    // Remove tooltip after 2 seconds
    setTimeout(() => {
        if (tooltip.parentNode) {
            tooltip.remove();
        }
    }, 2000);
}

function animateStatsCards() {
    const statsCards = document.querySelectorAll('.stats-card');
    
    statsCards.forEach((card, index) => {
        // Animate cards on load
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// ===========================
// INTERACTIVE CHARTS FUNCTIONALITY
// ===========================

function initializeInteractiveCharts() {
    console.log('Initializing interactive charts...');
    
    // Create tooltip element
    if (!chartTooltip) {
        chartTooltip = document.createElement('div');
        chartTooltip.className = 'chart-tooltip';
        document.body.appendChild(chartTooltip);
    }
    
    // Initialize line chart interactivity
    initializeLineChartInteractivity();
    
    // Initialize histogram interactivity
    initializeHistogramInteractivity();
}

function initializeLineChartInteractivity() {
    const chartPoints = document.querySelectorAll('#mainChart .chart-point');
    
    chartPoints.forEach(point => {
        point.addEventListener('mouseenter', (e) => {
            showChartTooltip(e, point, 'line');
        });
        
        point.addEventListener('mouseleave', () => {
            hideChartTooltip();
        });
        
        point.addEventListener('mousemove', (e) => {
            updateTooltipPosition(e);
        });
    });
}

function initializeHistogramInteractivity() {
    const histogramBars = document.querySelectorAll('#histogramChart .histogram-bar');
    
    histogramBars.forEach(bar => {
        bar.addEventListener('mouseenter', (e) => {
            showChartTooltip(e, bar, 'histogram');
        });
        
        bar.addEventListener('mouseleave', () => {
            hideChartTooltip();
        });
        
        bar.addEventListener('mousemove', (e) => {
            updateTooltipPosition(e);
        });
    });
}

function showChartTooltip(event, element, chartType) {
    if (!chartTooltip) return;
    
    let content = '';
    
    if (chartType === 'line') {
        const day = element.getAttribute('data-day');
        const revenue = element.getAttribute('data-revenue');
        const sales = element.getAttribute('data-sales');
        const downloads = element.getAttribute('data-downloads');
        const views = element.getAttribute('data-views');
        const conversion = element.getAttribute('data-conversion');
        
        // Show data based on current chart type
        switch (currentChartType) {
            case 'revenue':
                content = `<strong>${day}</strong><br>Ricavi: €${revenue}`;
                break;
            case 'sales':
                content = `<strong>${day}</strong><br>Vendite: ${sales}`;
                break;
            case 'downloads':
                content = `<strong>${day}</strong><br>Download: ${downloads}`;
                break;
            case 'views':
                content = `<strong>${day}</strong><br>Visualizzazioni: ${views}`;
                break;
            case 'conversion':
                content = `<strong>${day}</strong><br>Conversione: ${conversion}%`;
                break;
            default:
                content = `<strong>${day}</strong><br>Ricavi: €${revenue}`;
        }
    } else if (chartType === 'histogram') {
        const type = element.getAttribute('data-type');
        const count = element.getAttribute('data-count');
        const revenue = element.getAttribute('data-revenue');
        
        content = `<strong>${type}</strong><br>Venduti: ${count}<br>Ricavi: ${revenue}`;
    }
    
    chartTooltip.innerHTML = content;
    chartTooltip.classList.add('show');
    
    updateTooltipPosition(event);
}

function hideChartTooltip() {
    if (chartTooltip) {
        chartTooltip.classList.remove('show');
    }
}

function updateTooltipPosition(event, element = null) {
    if (!chartTooltip) return;
    
    const tooltip = chartTooltip;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    // Use the provided element or fall back to event.target
    const targetElement = element || event.target;
    
    // Get target element position
    const targetRect = targetElement.getBoundingClientRect();
    
    // Get tooltip dimensions
    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;
    
    let x, y;
    let arrowPosition = 'bottom'; // Default: tooltip above, arrow pointing down
    
    // Calculate center point of target element  
    const targetCenterX = targetRect.left + (targetRect.width / 2);
    const targetCenterY = targetRect.top + (targetRect.height / 2);
    
    // Try to position tooltip above the element, centered
    x = targetCenterX - (tooltipWidth / 2);
    y = targetRect.top - tooltipHeight - 12; // 12px gap for arrow
    
    const margin = 10;
    
    // Adjust if tooltip goes off screen
    if (y < margin) {
        // Not enough space above, try below
        y = targetRect.bottom + 12;
        arrowPosition = 'top';
        
        if (y + tooltipHeight > viewportHeight - margin) {
            // Not enough space below either, try to the right
            y = targetCenterY - (tooltipHeight / 2);
            x = targetRect.right + 12;
            arrowPosition = 'left';
            
            if (x + tooltipWidth > viewportWidth - margin) {
                // Not enough space on right, try left
                x = targetRect.left - tooltipWidth - 12;
                arrowPosition = 'right';
                
                if (x < margin) {
                    // Force it above and clamp horizontally
                    x = targetCenterX - (tooltipWidth / 2);
                    y = Math.max(margin, targetRect.top - tooltipHeight - 12);
                    arrowPosition = 'bottom';
                }
            }
        }
    }
    
    // Horizontal bounds checking for top/bottom positions
    if (arrowPosition === 'top' || arrowPosition === 'bottom') {
        if (x < margin) {
            x = margin;
        } else if (x + tooltipWidth > viewportWidth - margin) {
            x = viewportWidth - tooltipWidth - margin;
        }
    }
    
    // Vertical bounds checking for left/right positions  
    if (arrowPosition === 'left' || arrowPosition === 'right') {
        if (y < margin) {
            y = margin;
        } else if (y + tooltipHeight > viewportHeight - margin) {
            y = viewportHeight - tooltipHeight - margin;
        }
    }
    
    // Apply positioning with scroll offset
    tooltip.style.left = (x + scrollX) + 'px';
    tooltip.style.top = (y + scrollY) + 'px';
    
    // Update arrow position
    updateTooltipArrow(tooltip, arrowPosition, targetRect, x, y, tooltipWidth);
}

function updateTooltipArrow(tooltip, position, targetRect, tooltipX, tooltipY, tooltipWidth) {
    try {
        // Remove existing arrow positioning classes
        tooltip.classList.remove('arrow-top', 'arrow-bottom', 'arrow-left', 'arrow-right');
        
        // Calculate arrow offset for horizontal positioning
        let arrowOffset = '50%'; // Default center
        
        if ((position === 'top' || position === 'bottom') && tooltipWidth > 0) {
            const targetCenterX = targetRect.left + (targetRect.width / 2);
            const arrowX = targetCenterX - tooltipX;
            
            // Ensure arrow stays within reasonable bounds (8% to 92% of tooltip width)
            const minOffset = tooltipWidth * 0.08;
            const maxOffset = tooltipWidth * 0.92;
            const clampedArrowX = Math.max(minOffset, Math.min(maxOffset, arrowX));
            const arrowPercentage = (clampedArrowX / tooltipWidth) * 100;
            
            arrowOffset = Math.round(arrowPercentage * 10) / 10 + '%'; // Round to 1 decimal place
        }
        
        // Add appropriate arrow class and set position
        tooltip.classList.add('arrow-' + position);
        tooltip.style.setProperty('--arrow-offset', arrowOffset);
    } catch (error) {
        console.warn('Error updating tooltip arrow:', error);
        // Fallback to default positioning
        tooltip.classList.add('arrow-bottom');
        tooltip.style.setProperty('--arrow-offset', '50%');
    }
}

// Update chart type when dropdown changes
function updateChartType(newType) {
    currentChartType = newType;
    console.log('Chart type updated to:', newType);
}

// ===========================
// INLINE EVENT HANDLER FUNCTIONS FOR VENDOR DASHBOARD
// ===========================

// Initialize dynamic charts
function initializeDynamicCharts() {
    console.log('Initializing dynamic charts...');
    
    // Generate initial charts
    generateChart(currentChartType, mainChartTimePeriod);
    generateHistogram(histogramTimePeriod);
    
    // Update time filter buttons for each chart separately
    document.querySelectorAll('.left-chart .time-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const period = this.getAttribute('data-period');
            if (period) {
                updateChartPeriod(period, 'main');
            }
        });
    });
    
    document.querySelectorAll('.right-chart .time-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const period = this.getAttribute('data-period');
            if (period) {
                updateChartPeriod(period, 'histogram');
            }
        });
    });
    
    // Also handle the onclick attributes from HTML for left chart
    window.selectTimePeriod = function(button, period) {
        updateChartPeriod(period, 'main');
    };
    
    console.log('✅ Dynamic charts initialized successfully');
}

// Functions for tooltip functionality
window.showTooltip = function(event, element) {
    console.log('showTooltip called', element);
    
    // Create tooltip if it doesn't exist
    if (!chartTooltip) {
        chartTooltip = document.createElement('div');
        chartTooltip.className = 'chart-tooltip';
        chartTooltip.style.display = 'none';
        document.body.appendChild(chartTooltip);
    }
    
    const day = element.getAttribute('data-day');
    const value = element.getAttribute(`data-${currentChartType}`);
    
    let content = '';
    let format = '';
    
    switch (currentChartType) {
        case 'revenue':
            format = `€${parseInt(value).toLocaleString()}`;
            content = `<strong>${day}</strong><br>Ricavi: ${format}`;
            break;
        case 'sales':
            content = `<strong>${day}</strong><br>Vendite: ${value}`;
            break;
        case 'downloads':
            content = `<strong>${day}</strong><br>Download: ${value}`;
            break;
        case 'views':
            content = `<strong>${day}</strong><br>Visualizzazioni: ${parseInt(value).toLocaleString()}`;
            break;
        case 'conversion':
            content = `<strong>${day}</strong><br>Conversione: ${value}%`;
            break;
        default:
            format = `€${parseInt(value).toLocaleString()}`;
            content = `<strong>${day}</strong><br>Ricavi: ${format}`;
    }
    
    // Set content and basic styles
    chartTooltip.innerHTML = content;
    chartTooltip.style.pointerEvents = 'none';
    chartTooltip.style.position = 'absolute';
    chartTooltip.style.display = 'block';
    
    // Clear any existing arrow classes
    chartTooltip.classList.remove('arrow-top', 'arrow-bottom', 'arrow-left', 'arrow-right');
    
    // Position tooltip and then show it
    updateTooltipPosition(event, element);
    
    // Add show class last to trigger opacity transition
    setTimeout(() => {
        chartTooltip.classList.add('show');
    }, 10);
};

window.showHistogramTooltip = function(event, element) {
    console.log('showHistogramTooltip called', element);
    
    // Create tooltip if it doesn't exist
    if (!chartTooltip) {
        chartTooltip = document.createElement('div');
        chartTooltip.className = 'chart-tooltip';
        chartTooltip.style.display = 'none';
        document.body.appendChild(chartTooltip);
    }
    
    const type = element.getAttribute('data-type');
    const count = element.getAttribute('data-count');
    const revenue = element.getAttribute('data-revenue');
    
    const content = `<strong>${type}</strong><br>Venduti: ${count}<br>Ricavi: ${revenue}`;
    
    // Set content and basic styles
    chartTooltip.innerHTML = content;
    chartTooltip.style.pointerEvents = 'none';
    chartTooltip.style.position = 'absolute';
    chartTooltip.style.display = 'block';
    
    // Clear any existing arrow classes
    chartTooltip.classList.remove('arrow-top', 'arrow-bottom', 'arrow-left', 'arrow-right');
    
    // Position tooltip and then show it
    updateTooltipPosition(event, element);
    
    // Add show class last to trigger opacity transition
    setTimeout(() => {
        chartTooltip.classList.add('show');
    }, 10);
};

window.hideTooltip = function() {
    if (chartTooltip) {
        chartTooltip.classList.remove('show');
        // Hide after transition completes
        setTimeout(() => {
            if (chartTooltip && !chartTooltip.classList.contains('show')) {
                chartTooltip.style.display = 'none';
            }
        }, 200);
    }
};

// Debounce function for smooth tooltip movement
let tooltipMoveTimeout;
window.moveTooltip = function(event) {
    // Clear previous timeout
    if (tooltipMoveTimeout) {
        clearTimeout(tooltipMoveTimeout);
    }
    
    // Set new timeout for smoother performance
    tooltipMoveTimeout = setTimeout(() => {
        updateTooltipPosition(event);
    }, 10); // 10ms debounce for smooth movement
};

// Functions for time period selection
window.selectTimePeriod = function(button, period) {
    console.log('selectTimePeriod called', period);
    
    // Remove active class from all time period buttons
    const timeButtons = document.querySelectorAll('.time-filter-btn');
    timeButtons.forEach(btn => btn.classList.remove('active'));
    
    // Add active class to clicked button
    button.classList.add('active');
    
    // Update chart period
    updateChartPeriod(period);
};

// Functions for dropdown functionality
window.toggleDropdown = function() {
    console.log('toggleDropdown called');
    
    const dropdownMenu = document.getElementById('chartDropdownMenu');
    const dropdownBtn = document.getElementById('chartDropdownBtn');
    
    if (dropdownMenu && dropdownBtn) {
        const isOpen = dropdownMenu.classList.contains('show');
        
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }
};

function openDropdown() {
    const dropdownMenu = document.getElementById('chartDropdownMenu');
    const dropdownBtn = document.getElementById('chartDropdownBtn');
    
    if (dropdownMenu && dropdownBtn) {
        dropdownMenu.classList.add('show');
        const arrow = dropdownBtn.querySelector('.material-symbols-outlined');
        if (arrow) {
            arrow.style.transform = 'rotate(180deg)';
        }
    }
}

function closeDropdown() {
    const dropdownMenu = document.getElementById('chartDropdownMenu');
    const dropdownBtn = document.getElementById('chartDropdownBtn');
    
    if (dropdownMenu && dropdownBtn) {
        dropdownMenu.classList.remove('show');
        const arrow = dropdownBtn.querySelector('.material-symbols-outlined');
        if (arrow) {
            arrow.style.transform = 'rotate(0deg)';
        }
    }
}

// Add click outside listener to close dropdown
document.addEventListener('click', function(event) {
    const dropdownMenu = document.getElementById('chartDropdownMenu');
    const dropdownBtn = document.getElementById('chartDropdownBtn');
    
    if (dropdownMenu && dropdownBtn) {
        const isDropdownOpen = dropdownMenu.classList.contains('show');
        const clickedInsideDropdown = dropdownMenu.contains(event.target);
        const clickedOnButton = dropdownBtn.contains(event.target);
        
        if (isDropdownOpen && !clickedInsideDropdown && !clickedOnButton) {
            closeDropdown();
        }
    }
});

window.selectChartType = function(option, type, label) {
    console.log('selectChartType called', type, label);
    
    // Remove active class from all options
    const options = document.querySelectorAll('.chart-dropdown-option');
    options.forEach(opt => opt.classList.remove('active'));
    
    // Add active class to selected option
    option.classList.add('active');
    
    // Update button text
    const dropdownBtn = document.getElementById('chartDropdownBtn');
    const dropdownText = dropdownBtn.querySelector('.dropdown-text');
    if (dropdownText) {
        dropdownText.textContent = label;
    }
    
    // Update chart type and chart display
    updateChartType(type);
    updateChart(type);
    
    // Close dropdown
    closeDropdown();
};

// ===========================
// USER PERSONALIZATION FUNCTIONALITY
// ===========================

// Get current user data from localStorage
function getCurrentUser() {
    const cachedUser = localStorage.getItem('currentUser');
    if (cachedUser) {
        return JSON.parse(cachedUser);
    }
    return null;
}

// Create gradient avatar function (copied from search.js)
function getConsistentGradient(username) {
    if (!username) return 'linear-gradient(135deg, #49c5eb 0%, #3b82f6 100%)';
    
    // Simple hash function for consistent colors
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        const char = username.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use hash to generate consistent colors
    const hue1 = Math.abs(hash) % 360;
    const hue2 = (hue1 + 60) % 360;
    
    return `linear-gradient(135deg, hsl(${hue1}, 70%, 60%) 0%, hsl(${hue2}, 70%, 50%) 100%)`;
}

// Get user initials from username
function getInitials(username) {
    if (!username) return 'U';
    
    // For usernames, take the first character
    return username[0].toUpperCase();
}

// Personalize the dashboard with user information
function personalizeDashboard(user) {
    if (!user) return;
    
    // Update profile section
    const profileImage = document.querySelector('.user-avatar-gradient');
    const username = document.querySelector('.username');
    const userAvatarSmall = document.querySelector('.user-avatar-gradient-small');
    const userNameSmall = document.querySelector('.user-name-small');
    
    // Use username for avatar
    let fullName = user.username || 'User';
    
    // Update main profile avatar
    if (profileImage) {
        const gradient = getConsistentGradient(user.username);
        profileImage.style.background = gradient;
        profileImage.textContent = getInitials(fullName);
    }
    
    // Update username display
    if (username) {
        username.textContent = `@${user.username || 'username'}`;
    }
    
    // Update sidebar user info
    if (userAvatarSmall) {
        const gradient = getConsistentGradient(user.username);
        userAvatarSmall.style.background = gradient;
        userAvatarSmall.textContent = getInitials(fullName);
    }
    
    if (userNameSmall) {
        userNameSmall.textContent = user.username || 'Username';
    }
    
    // Update user details (faculty, canale, bio)
    updateUserDetails(user);
    
    // Update user statistics
    updateUserStatistics(user);
}

// Update user details in the profile section
function updateUserDetails(user) {
    const detailsElements = document.querySelectorAll('.details');
    
    detailsElements.forEach((element, index) => {
        switch(index) {
            case 0: // Faculty
                element.textContent = user.user_faculty || 'Facoltà non specificata';
                break;
            case 1: // Canale
                element.textContent = user.user_canale || 'Canale non specificato';
                break;
            case 2: // Bio
                const bio = user.bio || 'Bio non specificata';
                element.textContent = bio.length > 40 ? bio.substring(0, 37) + '...' : bio;
                break;
        }
    });
}

// Update user statistics in the dashboard cards
function updateUserStatistics(user) {
    // Update uploaded content count
    const uploadedContentElement = document.querySelector('.space-number-container.blue');
    if (uploadedContentElement) {
        uploadedContentElement.textContent = user.uploaded_documents_count || 0;
    }
    
    // Update ClaryCoin credits (placeholder for now)
    const claryCoinElement = document.querySelector('.space-number-container.yellow');
    if (claryCoinElement) {
        // This could be fetched from a separate endpoint in the future
        claryCoinElement.textContent = '300'; // Placeholder
    }
}

// Initialize user personalization
async function initializeUserPersonalization() {
    const user = getCurrentUser();
    if (user) {
        // Fetch complete user profile data
        const completeUserData = await fetchCompleteUserProfile(user.user_id);
        if (completeUserData) {
            personalizeDashboard(completeUserData);
        } else {
            // Fallback to cached user data
            personalizeDashboard(user);
        }
    } else {
        // If no user is logged in, just show default state without redirecting
        console.log('No user logged in, showing default dashboard state');
        // Don't redirect - let the page load normally for testing
    }
}

// Fetch complete user profile from backend
async function fetchCompleteUserProfile(userId) {
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) return null;
        
        // Since there's no specific current user endpoint, we'll use the user data from localStorage
        // In a real implementation, you would call an endpoint like /api/user/profile or /api/user/me
        const user = getCurrentUser();
        if (user) {
            // Return the cached user data which should include all the fields
            return user;
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

// ===========================
// LOGOUT FUNCTIONALITY
// ===========================

function initializeLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Show confirmation dialog
            if (confirm('Sei sicuro di voler disconnetterti?')) {
                try {
                    // Clear all stored data
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('userProfile');
                    
                    // Clear any other session data
                    sessionStorage.clear();
                    
                    // Redirect to login page
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error('Error during logout:', error);
                    // Even if there's an error, redirect to login page
                    window.location.href = 'index.html';
                }
            }
        });
    }
}

// ===========================
// SETTINGS DASHBOARD FUNCTIONALITY
// ===========================

function initializeSettings() {
    console.log('Initializing settings dashboard...');
    
    // Initialize settings navigation
    initializeSettingsNavigation();
    
    // Initialize all form interactions
    initializeSettingsForms();
    
    // Initialize toggle switches
    initializeSettingsToggles();
    
    // Initialize delete account functionality
    initializeDeleteAccount();
    
    // Initialize profile picture upload
    initializeProfilePictureUpload();
    
    // Load user data into forms
    loadUserDataIntoSettings();
    
    console.log('✅ Settings dashboard initialized successfully');
}

function initializeSettingsNavigation() {
    const settingsNavItems = document.querySelectorAll('.settings-nav-item');
    const settingsSections = document.querySelectorAll('.settings-section');
    
    settingsNavItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetSection = this.getAttribute('data-section');
            
            // Remove active class from all nav items
            settingsNavItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Hide all sections
            settingsSections.forEach(section => section.classList.remove('active'));
            
            // Show target section (fix: append 'Section' to match section IDs)
            const targetElement = document.getElementById(targetSection + 'Section');
            if (targetElement) {
                targetElement.classList.add('active');
            }
        });
    });
}

function initializeSettingsForms() {
    // Account settings form
    const accountForm = document.getElementById('accountForm');
    if (accountForm) {
        accountForm.addEventListener('submit', handleAccountFormSubmit);
    }
    
    // Privacy form
    const privacyForm = document.getElementById('privacyForm');
    if (privacyForm) {
        privacyForm.addEventListener('submit', handlePrivacyFormSubmit);
    }
    
    // Notifications form
    const notificationsForm = document.getElementById('notificationsForm');
    if (notificationsForm) {
        notificationsForm.addEventListener('submit', handleNotificationsFormSubmit);
    }
    
    // Preferences form
    const preferencesForm = document.getElementById('preferencesForm');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', handlePreferencesFormSubmit);
    }
    
    // Security form
    const securityForm = document.getElementById('securityForm');
    if (securityForm) {
        securityForm.addEventListener('submit', handleSecurityFormSubmit);
    }
}

function initializeSettingsToggles() {
    const toggles = document.querySelectorAll('.settings-toggle');
    
    toggles.forEach(toggle => {
        const input = toggle.querySelector('input[type="checkbox"]');
        if (input) {
            input.addEventListener('change', function() {
                // Add visual feedback
                const slider = toggle.querySelector('.toggle-slider');
                if (slider) {
                    if (this.checked) {
                        slider.style.backgroundColor = '#3b82f6';
                    } else {
                        slider.style.backgroundColor = '#e5e7eb';
                    }
                }
                
                // Handle the toggle change
                handleToggleChange(this);
            });
        }
    });
}

function initializeDeleteAccount() {
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', function() {
            showDeleteAccountModal();
        });
    }
}

function initializeProfilePictureUpload() {
    const profilePictureInput = document.getElementById('profilePictureInput');
    const uploadProfilePictureBtn = document.getElementById('uploadProfilePictureBtn');
    
    if (uploadProfilePictureBtn) {
        uploadProfilePictureBtn.addEventListener('click', function() {
            profilePictureInput?.click();
        });
    }
    
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', handleProfilePictureUpload);
    }
}

// Form submission handlers
async function handleAccountFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        showSettingsNotification('Aggiornamento account in corso...', 'info');
        
        // API call to update account
        const response = await updateAccountSettings(data);
        if (response.success) {
            showSettingsNotification('Account aggiornato con successo!', 'success');
        } else {
            throw new Error(response.message || 'Errore nell\'aggiornamento');
        }
    } catch (error) {
        console.error('Error updating account:', error);
        showSettingsNotification('Errore nell\'aggiornamento dell\'account', 'error');
    }
}

async function handlePrivacyFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        showSettingsNotification('Aggiornamento privacy in corso...', 'info');
        
        // API call to update privacy settings
        const response = await updatePrivacySettings(data);
        if (response.success) {
            showSettingsNotification('Impostazioni privacy aggiornate!', 'success');
        } else {
            throw new Error(response.message || 'Errore nell\'aggiornamento');
        }
    } catch (error) {
        console.error('Error updating privacy:', error);
        showSettingsNotification('Errore nell\'aggiornamento delle impostazioni privacy', 'error');
    }
}

async function handleNotificationsFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        showSettingsNotification('Aggiornamento notifiche in corso...', 'info');
        
        // API call to update notification settings
        const response = await updateNotificationSettings(data);
        if (response.success) {
            showSettingsNotification('Impostazioni notifiche aggiornate!', 'success');
        } else {
            throw new Error(response.message || 'Errore nell\'aggiornamento');
        }
    } catch (error) {
        console.error('Error updating notifications:', error);
        showSettingsNotification('Errore nell\'aggiornamento delle notifiche', 'error');
    }
}

async function handlePreferencesFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        showSettingsNotification('Aggiornamento preferenze in corso...', 'info');
        
        // API call to update preferences
        const response = await updatePreferences(data);
        if (response.success) {
            showSettingsNotification('Preferenze aggiornate!', 'success');
        } else {
            throw new Error(response.message || 'Errore nell\'aggiornamento');
        }
    } catch (error) {
        console.error('Error updating preferences:', error);
        showSettingsNotification('Errore nell\'aggiornamento delle preferenze', 'error');
    }
}

async function handleSecurityFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Validate password fields
    if (data.newPassword !== data.confirmPassword) {
        showSettingsNotification('Le password non corrispondono', 'error');
        return;
    }
    
    try {
        showSettingsNotification('Aggiornamento password in corso...', 'info');
        
        // API call to update password
        const response = await updatePassword(data);
        if (response.success) {
            showSettingsNotification('Password aggiornata con successo!', 'success');
            e.target.reset(); // Clear form
        } else {
            throw new Error(response.message || 'Errore nell\'aggiornamento');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        showSettingsNotification('Errore nell\'aggiornamento della password', 'error');
    }
}

// Toggle change handler
function handleToggleChange(toggle) {
    const toggleId = toggle.id;
    const isChecked = toggle.checked;
    
    console.log(`Toggle ${toggleId} changed to:`, isChecked);
    
    // Handle specific toggle changes
    switch (toggleId) {
        case 'profileVisibility':
            updateProfileVisibility(isChecked);
            break;
        case 'emailNotifications':
            updateEmailNotifications(isChecked);
            break;
        case 'pushNotifications':
            updatePushNotifications(isChecked);
            break;
        case 'marketingEmails':
            updateMarketingEmails(isChecked);
            break;
        case 'darkMode':
            updateDarkMode(isChecked);
            break;
        case 'autoSave':
            updateAutoSave(isChecked);
            break;
        case 'twoFactorAuth':
            handleTwoFactorToggle(isChecked);
            break;
        default:
            console.log('Unknown toggle:', toggleId);
    }
}

// Profile picture upload handler
function handleProfilePictureUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showSettingsNotification('Formato file non supportato. Usa JPG, PNG, GIF o WebP.', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        showSettingsNotification('File troppo grande. Dimensione massima: 5MB.', 'error');
        return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const profilePicturePreview = document.querySelector('.settings-profile-picture');
        if (profilePicturePreview) {
            profilePicturePreview.style.backgroundImage = `url(${e.target.result})`;
            profilePicturePreview.textContent = '';
        }
    };
    reader.readAsDataURL(file);
    
    // Upload file
    uploadProfilePicture(file);
}

// Settings notification system
function showSettingsNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.settings-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `settings-notification settings-notification-${type}`;
    notification.innerHTML = `
        <div class="settings-notification-content">
            <span class="material-symbols-outlined">
                ${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
            </span>
            <span>${message}</span>
        </div>
    `;
    
    // Add to DOM
    const settingsDashboard = document.getElementById('settingsDashboard');
    if (settingsDashboard) {
        settingsDashboard.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 4000);
    }
}

// Delete account modal
function showDeleteAccountModal() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'delete-account-modal-overlay';
    modalOverlay.innerHTML = `
        <div class="delete-account-modal">
            <div class="delete-account-modal-header">
                <h3>Elimina Account</h3>
                <button class="modal-close-btn" onclick="closeDeleteAccountModal()">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="delete-account-modal-content">
                <div class="delete-warning">
                    <span class="material-symbols-outlined">warning</span>
                    <h4>Attenzione! Questa azione è irreversibile</h4>
                </div>
                <p>Eliminando il tuo account:</p>
                <ul>
                    <li>Tutti i tuoi documenti verranno rimossi</li>
                    <li>Perderai l'accesso a tutti i tuoi dati</li>
                    <li>Non potrai recuperare il tuo account</li>
                    <li>Tutte le tue statistiche verranno cancellate</li>
                </ul>
                <div class="confirmation-input">
                    <label for="deleteConfirmation">Per confermare, digita "ELIMINA" nel campo sottostante:</label>
                    <input type="text" id="deleteConfirmation" placeholder="Digita ELIMINA per confermare">
                </div>
            </div>
            <div class="delete-account-modal-actions">
                <button class="btn-secondary" onclick="closeDeleteAccountModal()">Annulla</button>
                <button class="btn-danger" id="confirmDeleteBtn" disabled onclick="confirmDeleteAccount()">
                    Elimina Account
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalOverlay);
    
    // Show modal
    setTimeout(() => {
        modalOverlay.classList.add('show');
    }, 10);
    
    // Handle confirmation input
    const confirmationInput = document.getElementById('deleteConfirmation');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    confirmationInput.addEventListener('input', function() {
        if (this.value === 'ELIMINA') {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.classList.add('enabled');
        } else {
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.classList.remove('enabled');
        }
    });
}

function closeDeleteAccountModal() {
    const modalOverlay = document.querySelector('.delete-account-modal-overlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('show');
        setTimeout(() => {
            modalOverlay.remove();
        }, 300);
    }
}

async function confirmDeleteAccount() {
    try {
        showSettingsNotification('Eliminazione account in corso...', 'info');
        
        // API call to delete account
        const response = await deleteUserAccount();
        if (response.success) {
            showSettingsNotification('Account eliminato con successo', 'success');
            
            // Clear all data and redirect
            setTimeout(() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = 'index.html';
            }, 2000);
        } else {
            throw new Error(response.message || 'Errore nell\'eliminazione');
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        showSettingsNotification('Errore nell\'eliminazione dell\'account', 'error');
    }
    
    closeDeleteAccountModal();
}

// Load user data into settings forms
function loadUserDataIntoSettings() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Load account data
    const emailInput = document.getElementById('email');
    const usernameInput = document.getElementById('username');
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const bioInput = document.getElementById('bio');
    const facultyInput = document.getElementById('faculty');
    const canaleInput = document.getElementById('canale');
    
    if (emailInput) emailInput.value = user.email || '';
    if (usernameInput) usernameInput.value = user.username || '';
    if (firstNameInput) firstNameInput.value = user.first_name || '';
    if (lastNameInput) lastNameInput.value = user.last_name || '';
    if (bioInput) bioInput.value = user.bio || '';
    if (facultyInput) facultyInput.value = user.user_faculty || '';
    if (canaleInput) canaleInput.value = user.user_canale || '';
    
    // Update profile picture preview
    const profilePicturePreview = document.querySelector('.settings-profile-picture');
    if (profilePicturePreview && user.username) {
        const gradient = getConsistentGradient(user.username);
        profilePicturePreview.style.background = gradient;
        profilePicturePreview.textContent = getInitials(user.username);
    }
}

// API functions (placeholder implementations)
async function updateAccountSettings(data) {
    // Placeholder for API call
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ success: true });
        }, 1000);
    });
}

async function updatePrivacySettings(data) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ success: true });
        }, 1000);
    });
}

async function updateNotificationSettings(data) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ success: true });
        }, 1000);
    });
}

async function updatePreferences(data) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ success: true });
        }, 1000);
    });
}

async function updatePassword(data) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ success: true });
        }, 1000);
    });
}

async function uploadProfilePicture(file) {
    try {
        showSettingsNotification('Caricamento immagine in corso...', 'info');
        
        // Placeholder for API call
        setTimeout(() => {
            showSettingsNotification('Immagine caricata con successo!', 'success');
        }, 1500);
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        showSettingsNotification('Errore nel caricamento dell\'immagine', 'error');
    }
}

async function deleteUserAccount() {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ success: true });
        }, 2000);
    });
}

// Individual toggle update functions
function updateProfileVisibility(isVisible) {
    console.log('Profile visibility updated:', isVisible);
    showSettingsNotification(`Profilo ${isVisible ? 'pubblico' : 'privato'}`, 'success');
}

function updateEmailNotifications(enabled) {
    console.log('Email notifications updated:', enabled);
    showSettingsNotification(`Notifiche email ${enabled ? 'attivate' : 'disattivate'}`, 'success');
}

function updatePushNotifications(enabled) {
    console.log('Push notifications updated:', enabled);
    showSettingsNotification(`Notifiche push ${enabled ? 'attivate' : 'disattivate'}`, 'success');
}

function updateMarketingEmails(enabled) {
    console.log('Marketing emails updated:', enabled);
    showSettingsNotification(`Email marketing ${enabled ? 'attivate' : 'disattivate'}`, 'success');
}

function updateDarkMode(enabled) {
    console.log('Dark mode updated:', enabled);
    // Here you would implement dark mode toggle
    showSettingsNotification(`Modalità scura ${enabled ? 'attivata' : 'disattivata'}`, 'success');
}

function updateAutoSave(enabled) {
    console.log('Auto save updated:', enabled);
    showSettingsNotification(`Salvataggio automatico ${enabled ? 'attivato' : 'disattivato'}`, 'success');
}

function handleTwoFactorToggle(enabled) {
    console.log('Two factor auth updated:', enabled);
    if (enabled) {
        // Show 2FA setup modal or redirect to setup page
        showSettingsNotification('Autenticazione a due fattori in configurazione...', 'info');
    } else {
        showSettingsNotification('Autenticazione a due fattori disattivata', 'success');
    }
}

// ===========================
// MAIN INITIALIZATION
// ===========================

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize user personalization first
    await initializeUserPersonalization();
    
    // Ensure search components have time to initialize properly
    console.log('Profile page loaded - waiting for search components to initialize');
    
    // Wait for search components to be fully initialized
    await new Promise(resolve => {
        const checkComponents = () => {
            const components = document.querySelectorAll('search-section-component');
            if (components.length > 0 && components[0].shadowRoot) {
                console.log('✅ Search components initialized successfully');
                resolve();
            } else {
                setTimeout(checkComponents, 50);
            }
        };
        checkComponents();
    });
    
    // Ensure all search components are properly initialized regardless of tab state
    const allSearchContainers = [
        document.getElementById('searchSectionContainer'),
        document.getElementById('documentsSearchSectionContainer'),
        document.getElementById('favoritesSearchSectionContainer')
    ];
    
    allSearchContainers.forEach(container => {
        if (container) {
            const searchComponents = container.querySelectorAll('search-section-component');
            searchComponents.forEach(component => {
                if (!component.isInitialized) {
                    console.log('🔄 Initializing search component in container:', container.id);
                    // Ensure clean initialization state
                    component.isInitialized = false;
                    component.connectedCallback();
                } else {
                    console.log('✅ Search component already initialized in container:', container.id);
                }
            });
        }
    });
    
    // Initialize dashboard functionality
    initializeMobileMenu();
    initializeTabSwitching(); // Add tab switching functionality
    initializeStatsDropdown(); // Add stats dropdown functionality
    initializeTimeFilters(); // Add time filters functionality
    initializeDocumentsPeriodFilter(); // Add documents period filter functionality
    initializeDocumentPerformanceItems(); // Add document performance interactivity
    initializeLogout(); // Add logout functionality
    
    // Charts will be initialized when stats tab is shown
    
    // Set initial tab state to ensure proper display - start with profile tab as default
    await switchTab('profile');
    
    // FORCE REVIEWS INITIALIZATION - For debugging
    setTimeout(() => {
        console.log('🚀 FORCING reviews initialization for debugging...');
        if (typeof initializeReviewsSection === 'function') {
            console.log('✅ Force calling initializeReviewsSection');
            initializeReviewsSection();
        } else {
            console.error('❌ initializeReviewsSection not available for force call');
        }
    }, 2000); // Wait 2 seconds after page load
    
    // Initialize animations when switching to stats tab
    setTimeout(() => {
        console.log('Setting up reviews initialization override...');
        
        // More reliable selector - look for the Vendite menu item specifically
        const venditeMenuItem = document.querySelector('.menu-item[onclick*="switchTab(\'stats\')"]');
        console.log('Vendite menu item found:', !!venditeMenuItem);
        
        if (venditeMenuItem) {
            console.log('✅ Setting up switchTab override for reviews initialization');
            const originalSwitchTab = switchTab;
            window.switchTab = async function(tabName) {
                console.log('🔄 switchTab override called with:', tabName);
                await originalSwitchTab(tabName);
                if (tabName === 'stats') {
                    console.log('📊 Stats tab activated, initializing components...');
                    setTimeout(() => {
                        animateStatsCards();
                        // Re-initialize all stats dashboard components
                        initializeStatsDropdown();
                        initializeTimeFilters();
                        initializeDocumentsPeriodFilter();
                        setTimeout(() => {
                            console.log('=== Stats initialization timeout reached ===');
                            initializeDocumentPerformanceItems();
                            console.log('About to call initializeReviewsSection...');
                            console.log('initializeReviewsSection function:', typeof initializeReviewsSection);
                            if (typeof initializeReviewsSection === 'function') {
                                initializeReviewsSection();
                            } else {
                                console.error('initializeReviewsSection is not a function!', initializeReviewsSection);
                            }
                        }, 500);
                    }, 100);
                }
            };
        } else {
            console.error('❌ Vendite menu item not found! Reviews initialization will not work.');
            console.log('Available menu items:', document.querySelectorAll('.menu-item'));
        }
    }, 100);
});

// ========================================
// REVIEWS SECTION FUNCTIONALITY
// ========================================

// Global reviews variables  
let currentReviewsFilter = 'all';
let reviewsLoaded = 0;
let allReviewsLoaded = false;
let allReviews = [];
let reviewsStats = {
    total: 0,
    average: 0.0,
    recent30Days: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
};
let reviewsInitialized = false;

// Initialize Reviews Section
function initializeReviewsSection() {
    // Prevent duplicate initialization
    if (reviewsInitialized) {
        console.log('Reviews section already initialized, skipping...');
        return;
    }
    
    console.log('🎯 Initializing Reviews Section...');
    
    // Simple direct initialization without complex DOM checking
    reviewsInitialized = true;
    
    // Start loading reviews immediately
    console.log('📝 Starting to load user reviews...');
    loadUserReviews();
    
    // Initialize other components
    console.log('🔧 Initializing filters and infinite scroll...');
    initializeReviewsFilters();
    initializeInfiniteScroll();
    
    console.log('✅ Reviews section initialization completed');
}

// Load User's Reviews (Reviews received by the user)
async function loadUserReviews() {
    console.log('[REVIEWS] Loading user reviews...');
    
    const reviewsLoading = document.getElementById('reviewsLoading');
    const reviewsEmpty = document.getElementById('reviewsEmpty');
    
    // Show loading state
    if (reviewsLoading) {
        reviewsLoading.style.display = 'flex';
        console.log('[REVIEWS] Loading indicator shown');
    } else {
        console.error('[REVIEWS] reviewsLoading element not found!');
    }
    
    if (reviewsEmpty) {
        reviewsEmpty.style.display = 'none';
    }
    
    try {
        // Get current user info
        const currentUserId = await getCurrentUserId();
        
        if (!currentUserId) {
            console.error('No current user ID found');
            showReviewsEmpty(true);
            return;
        }
        
        // Fetch reviews for documents authored by this user
        const response = await fetch(`${API_BASE}/users/${currentUserId}/author-reviews`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch reviews');
        }
        
        const data = await response.json();
        allReviews = data.reviews || [];
        
        // If no reviews found, show empty state
        if (allReviews.length === 0) {
            showReviewsEmpty(true);
            return;
        }
        
        // Calculate statistics
        calculateReviewsStats();
        console.log('[REVIEWS] Stats calculated:', {
            total: reviewsStats.total,
            average: reviewsStats.average,
            recent: reviewsStats.recent30Days
        });
        
        // Update UI
        updateReviewsStats();
        updateRatingDistribution();
        displayReviews();
        
        console.log('[REVIEWS] ✅ Reviews loaded successfully!');
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        showReviewsEmpty(true);
    } finally {
        if (reviewsLoading) reviewsLoading.style.display = 'none';
    }
}

async function getCurrentUserId() {
    const token = localStorage.getItem('token');
    console.log('🔍 [AUTH] Token exists:', !!token);
    if (!token) return null;
    
    try {
        // Check if there's already user data available
        if (window.currentUser && window.currentUser.user_id) {
            console.log('✅ [AUTH] Using cached user ID:', window.currentUser.user_id);
            return window.currentUser.user_id;
        }
        
        console.log('🔄 [AUTH] Fetching user data from /auth/me...');
        // Make API call to get user info
        const response = await fetch(`${API_BASE}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 [AUTH] Response status:', response.status);
        
        if (response.ok) {
            const userData = await response.json();
            console.log('✅ [AUTH] User data received:', userData);
            window.currentUser = userData;
            return userData.user_id;
        } else {
            const errorText = await response.text();
            console.error('❌ [AUTH] Response not OK:', response.status, errorText);
        }
    } catch (error) {
        console.error('❌ [AUTH] Error getting current user ID:', error);
    }
    
    return null;
}

// Calculate Reviews Statistics
function calculateReviewsStats() {
    reviewsStats.total = allReviews.length;
    
    if (allReviews.length === 0) {
        reviewsStats.average = 0.0;
        reviewsStats.recent30Days = 0;
        reviewsStats.distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        return;
    }
    
    // Calculate average rating
    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
    reviewsStats.average = (totalRating / allReviews.length).toFixed(1);
    
    // Calculate recent reviews (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    reviewsStats.recent30Days = allReviews.filter(review => {
        const reviewDate = new Date(review.review_date);
        return reviewDate >= thirtyDaysAgo;
    }).length;
    
    // Calculate rating distribution
    reviewsStats.distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allReviews.forEach(review => {
        reviewsStats.distribution[review.rating]++;
    });
}

// Update Reviews Stats Display
function updateReviewsStats() {
    console.log('[REVIEWS] Updating stats display...');
    
    const totalReviewsEl = document.getElementById('totalReviews');
    const averageRatingEl = document.getElementById('averageRating');
    const recentReviewsEl = document.getElementById('recentReviews');
    
    if (totalReviewsEl) {
        totalReviewsEl.textContent = reviewsStats.total;
        console.log('[REVIEWS] ✅ Total reviews updated:', reviewsStats.total);
    } else {
        console.error('[REVIEWS] ❌ totalReviews element not found!');
    }
    
    if (averageRatingEl) {
        averageRatingEl.textContent = reviewsStats.average;
        console.log('[REVIEWS] ✅ Average rating updated:', reviewsStats.average);
    } else {
        console.error('[REVIEWS] ❌ averageRating element not found!');
    }
    
    if (recentReviewsEl) {
        recentReviewsEl.textContent = reviewsStats.recent30Days;
        console.log('[REVIEWS] ✅ Recent reviews updated:', reviewsStats.recent30Days);
    } else {
        console.error('[REVIEWS] ❌ recentReviews element not found!');
    }
}

// Update Rating Distribution Bars
function updateRatingDistribution() {
    const maxCount = Math.max(...Object.values(reviewsStats.distribution));
    
    for (let rating = 1; rating <= 5; rating++) {
        const count = reviewsStats.distribution[rating];
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
        
        const fillEl = document.getElementById(`ratingBar${rating}`);
        const countEl = document.getElementById(`ratingCount${rating}`);
        
        if (fillEl) {
            // Reset width first, then animate to target width
            fillEl.style.width = '0%';
            setTimeout(() => {
                fillEl.style.width = `${percentage}%`;
                fillEl.setAttribute('data-percentage', percentage);
            }, rating * 150); // Staggered animation for visual appeal
        }
        
        if (countEl) {
            countEl.textContent = count;
        }
    }
}

// Display Reviews List
function displayReviews() {
    console.log('[REVIEWS] Displaying reviews list...');
    
    
    const reviewsList = document.getElementById('reviewsList');
    const reviewsEmpty = document.getElementById('reviewsEmpty');
    const reviewsPagination = document.getElementById('reviewsPagination');
    const reviewsLoading = document.getElementById('reviewsLoading');
    
    // Debug: Check if reviewsList element exists
    if (!reviewsList) {
        console.error('[REVIEWS] ERROR: reviewsList element not found in DOM!');
        console.log('[REVIEWS] Available elements with "reviews" in ID:', 
            Array.from(document.querySelectorAll('[id*="reviews"]')).map(el => el.id));
        return;
    } else {
        console.log('[REVIEWS] ✅ reviewsList element found successfully');
    }
    
    // DOM STRUCTURE DEBUGGING
    console.log('[REVIEWS DEBUG] === DOM STRUCTURE ANALYSIS ===');
    console.log('[REVIEWS DEBUG] reviewsList element found:', reviewsList);
    console.log('[REVIEWS DEBUG] reviewsList.id:', reviewsList.id);
    console.log('[REVIEWS DEBUG] reviewsList.className:', reviewsList.className);
    console.log('[REVIEWS DEBUG] reviewsList.tagName:', reviewsList.tagName);
    console.log('[REVIEWS DEBUG] reviewsList.innerHTML length:', reviewsList.innerHTML.length);
    console.log('[REVIEWS DEBUG] reviewsList.outerHTML preview:', reviewsList.outerHTML.substring(0, 500) + '...');
    
    // Check parent hierarchy
    console.log('[REVIEWS DEBUG] Parent hierarchy:');
    let currentElement = reviewsList;
    let depth = 0;
    while (currentElement && depth < 8) {
        console.log(`[REVIEWS DEBUG] Level ${depth}: ${currentElement.tagName}${currentElement.id ? '#' + currentElement.id : ''}${currentElement.className ? '.' + currentElement.className.replace(/\s+/g, '.') : ''}`);
        currentElement = currentElement.parentElement;
        depth++;
    }
    
    // Check sibling elements
    console.log('[REVIEWS DEBUG] Sibling elements:');
    if (reviewsList.parentElement) {
        Array.from(reviewsList.parentElement.children).forEach((child, index) => {
            console.log(`[REVIEWS DEBUG] Sibling ${index}: ${child.tagName}${child.id ? '#' + child.id : ''}${child.className ? '.' + child.className.replace(/\s+/g, '.') : ''}`);
        });
    }
    console.log('[REVIEWS DEBUG] === END DOM STRUCTURE ===');
    
    // Hide loading indicator
    if (reviewsLoading) {
        reviewsLoading.style.display = 'none';
        console.log('[REVIEWS] Loading indicator hidden');
    }
    
    // Filter reviews
    let filteredReviews = allReviews;
    if (currentReviewsFilter !== 'all') {
        filteredReviews = allReviews.filter(review => review.rating == currentReviewsFilter);
    }
    
    // Sort by date (newest first)
    filteredReviews.sort((a, b) => new Date(b.review_date) - new Date(a.review_date));
    
    // Show all filtered reviews for infinite scroll
    const pageReviews = filteredReviews;
    
    console.log('[REVIEWS] Showing', pageReviews.length, 'reviews');
    
    // Clear existing reviews
    if (reviewsList) {
        const existingReviews = reviewsList.querySelectorAll('.review-item');
        existingReviews.forEach(review => review.remove());
    }
    
    if (pageReviews.length === 0) {
        console.log('[REVIEWS] No reviews to show, displaying empty state');
        showReviewsEmpty();
        return;
    }
    
    if (reviewsEmpty) {
        reviewsEmpty.style.display = 'none';
    }
    
    // Create review items
    console.log('[REVIEWS] Creating', pageReviews.length, 'review elements...');
    pageReviews.forEach((review, index) => {
        console.log(`[REVIEWS] Creating review ${index + 1}:`, review.user?.first_name, review.user?.last_name);
        const reviewElement = createReviewElement(review);
        if (reviewsList && reviewElement) {
            console.log(`[REVIEWS DEBUG] About to append review ${index + 1} to reviewsList`);
            console.log(`[REVIEWS DEBUG] reviewsList container:`, reviewsList);
            console.log(`[REVIEWS DEBUG] reviewsList display style:`, getComputedStyle(reviewsList).display);
            console.log(`[REVIEWS DEBUG] reviewsList visibility:`, getComputedStyle(reviewsList).visibility);
            console.log(`[REVIEWS DEBUG] reviewsList opacity:`, getComputedStyle(reviewsList).opacity);
            console.log(`[REVIEWS DEBUG] reviewsList clientHeight:`, reviewsList.clientHeight);
            console.log(`[REVIEWS DEBUG] reviewsList scrollHeight:`, reviewsList.scrollHeight);
            console.log(`[REVIEWS DEBUG] reviewsList children count before append:`, reviewsList.children.length);
            
            reviewsList.appendChild(reviewElement);
            
            console.log(`[REVIEWS DEBUG] After append - children count:`, reviewsList.children.length);
            console.log(`[REVIEWS DEBUG] Appended element parent:`, reviewElement.parentElement);
            console.log(`[REVIEWS DEBUG] Appended element clientHeight:`, reviewElement.clientHeight);
            console.log(`[REVIEWS DEBUG] Appended element scrollHeight:`, reviewElement.scrollHeight);
            console.log(`[REVIEWS DEBUG] Appended element computed display:`, getComputedStyle(reviewElement).display);
            console.log(`[REVIEWS DEBUG] Appended element computed visibility:`, getComputedStyle(reviewElement).visibility);
            console.log(`[REVIEWS DEBUG] Appended element computed opacity:`, getComputedStyle(reviewElement).opacity);
            console.log(`[REVIEWS] ✅ Review ${index + 1} added to DOM`);
        } else {
            console.error(`[REVIEWS] ❌ Failed to add review ${index + 1} to DOM:`, review.user?.first_name);
            console.error('[REVIEWS] reviewsList exists:', !!reviewsList);
            console.error('[REVIEWS] reviewElement exists:', !!reviewElement);
        }
    });
    
    console.log('[REVIEWS] Final reviewsList children count:', reviewsList.children.length);
    
    // Comprehensive CSS and visibility debugging
    console.log('[REVIEWS DEBUG] === CSS AND VISIBILITY ANALYSIS ===');
    console.log('[REVIEWS DEBUG] reviewsList container styles:');
    const reviewsListStyles = getComputedStyle(reviewsList);
    console.log('[REVIEWS DEBUG] - display:', reviewsListStyles.display);
    console.log('[REVIEWS DEBUG] - visibility:', reviewsListStyles.visibility);
    console.log('[REVIEWS DEBUG] - opacity:', reviewsListStyles.opacity);
    console.log('[REVIEWS DEBUG] - height:', reviewsListStyles.height);
    console.log('[REVIEWS DEBUG] - maxHeight:', reviewsListStyles.maxHeight);
    console.log('[REVIEWS DEBUG] - overflow:', reviewsListStyles.overflow);
    console.log('[REVIEWS DEBUG] - position:', reviewsListStyles.position);
    console.log('[REVIEWS DEBUG] - zIndex:', reviewsListStyles.zIndex);
    
    // Check parent containers
    let parent = reviewsList.parentElement;
    let level = 0;
    while (parent && level < 5) {
        console.log(`[REVIEWS DEBUG] Parent ${level} (${parent.tagName}.${parent.className}):`);
        const parentStyles = getComputedStyle(parent);
        console.log(`[REVIEWS DEBUG] - display: ${parentStyles.display}, visibility: ${parentStyles.visibility}, opacity: ${parentStyles.opacity}`);
        parent = parent.parentElement;
        level++;
    }
    
    // Check individual review items
    console.log('[REVIEWS DEBUG] === INDIVIDUAL REVIEW ITEMS ===');
    for (let i = 0; i < reviewsList.children.length; i++) {
        const child = reviewsList.children[i];
        const childStyles = getComputedStyle(child);
        console.log(`[REVIEWS DEBUG] Review ${i + 1} styles:`);
        console.log(`[REVIEWS DEBUG] - classList: ${child.classList.toString()}`);
        console.log(`[REVIEWS DEBUG] - display: ${childStyles.display}`);
        console.log(`[REVIEWS DEBUG] - visibility: ${childStyles.visibility}`);
        console.log(`[REVIEWS DEBUG] - opacity: ${childStyles.opacity}`);
        console.log(`[REVIEWS DEBUG] - height: ${childStyles.height}`);
        console.log(`[REVIEWS DEBUG] - clientHeight: ${child.clientHeight}`);
        console.log(`[REVIEWS DEBUG] - offsetHeight: ${child.offsetHeight}`);
        console.log(`[REVIEWS DEBUG] - scrollHeight: ${child.scrollHeight}`);
        console.log(`[REVIEWS DEBUG] - background: ${childStyles.background}`);
        console.log(`[REVIEWS DEBUG] - border: ${childStyles.border}`);
    }
    console.log('[REVIEWS DEBUG] === END CSS ANALYSIS ===');
    
    // Delayed visibility check (to catch any async CSS issues)
    setTimeout(() => {
        console.log('[REVIEWS DEBUG] === DELAYED VISIBILITY CHECK (1000ms) ===');
        console.log('[REVIEWS DEBUG] reviewsList final visibility check:');
        console.log('[REVIEWS DEBUG] - clientHeight:', reviewsList.clientHeight);
        console.log('[REVIEWS DEBUG] - offsetHeight:', reviewsList.offsetHeight);
        console.log('[REVIEWS DEBUG] - scrollHeight:', reviewsList.scrollHeight);
        console.log('[REVIEWS DEBUG] - getBoundingClientRect:', reviewsList.getBoundingClientRect());
        
        const finalStyles = getComputedStyle(reviewsList);
        console.log('[REVIEWS DEBUG] Final computed styles:');
        console.log('[REVIEWS DEBUG] - display:', finalStyles.display);
        console.log('[REVIEWS DEBUG] - visibility:', finalStyles.visibility);
        console.log('[REVIEWS DEBUG] - opacity:', finalStyles.opacity);
        console.log('[REVIEWS DEBUG] - height:', finalStyles.height);
        console.log('[REVIEWS DEBUG] - maxHeight:', finalStyles.maxHeight);
        
        // Check each review item visibility
        for (let i = 0; i < reviewsList.children.length; i++) {
            const item = reviewsList.children[i];
            const itemRect = item.getBoundingClientRect();
            console.log(`[REVIEWS DEBUG] Review ${i + 1} final check:`, {
                clientHeight: item.clientHeight,
                offsetHeight: item.offsetHeight,
                rect: itemRect,
                visible: itemRect.height > 0 && itemRect.width > 0
            });
        }
        console.log('[REVIEWS DEBUG] === END DELAYED CHECK ===');
    }, 1000);
    
    // Update scroll state
    reviewsLoaded = pageReviews.length;
    allReviewsLoaded = true;
    
    console.log('[REVIEWS] ✅ Reviews list displayed successfully!');
}

// Create Review Element
function createReviewElement(review) {
    console.log('[REVIEWS] Creating review element for:', review.user?.first_name, review.user?.last_name);
    console.log('[REVIEWS] Review data:', review);
    
    const reviewItem = document.createElement('div');
    reviewItem.className = 'review-item';
    console.log('[REVIEWS DEBUG] Created div element with className:', reviewItem.className);
    console.log('[REVIEWS DEBUG] Element classList:', reviewItem.classList.toString());
    
    if (review.placeholder) {
        reviewItem.classList.add('placeholder-review');
        console.log('[REVIEWS] Added placeholder-review class');
        console.log('[REVIEWS DEBUG] Final classList after placeholder:', reviewItem.classList.toString());
    }
    // Format date
    const reviewDate = new Date(review.review_date);
    const formattedDate = reviewDate.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    // Generate user initials
    const userInitials = generateUserInitials(review.user);
    // Generate stars
    const starsHTML = generateReviewStars(review.rating);
    // Document info
    const documentName = review.vetrina_name || review.file_name || 'Documento';
    const documentType = review.vetrina_id ? 'Vetrina' : 'File';
    reviewItem.innerHTML = `
        <div class="review-header">
            <div class="review-user-info">
                <div class="review-user-avatar">${userInitials}</div>
                <div class="review-user-details">
                    <div class="review-username">${getReviewUserName(review.user)}</div>
                    <div class="review-date">${formattedDate}</div>
                </div>
            </div>
            <div class="review-rating">
                <div class="review-stars">${starsHTML}</div>
            </div>
            ${review.placeholder ? '<div class="review-placeholder-badge">Demo</div>' : ''}
        </div>
        <div class="review-text">${review.review_text}</div>
        <div class="review-document-info">
            <div class="review-document-name">${documentName}</div>
            <div class="review-document-type">${documentType}</div>
        </div>
    `;
    
    // Comprehensive debugging for created element
    console.log('[REVIEWS DEBUG] Element innerHTML set, length:', reviewItem.innerHTML.length);
    console.log('[REVIEWS DEBUG] Element outerHTML preview:', reviewItem.outerHTML.substring(0, 200) + '...');
    console.log('[REVIEWS DEBUG] Element computed styles check:');
    
    // Add temporary style debugging
    reviewItem.style.border = '2px solid red';
    reviewItem.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
    reviewItem.style.minHeight = '100px';
    reviewItem.style.display = 'block';
    reviewItem.style.visibility = 'visible';
    reviewItem.style.opacity = '1';
    
    console.log('[REVIEWS DEBUG] Added temporary debug styles to make element visible');
    console.log('[REVIEWS DEBUG] Element style.display:', reviewItem.style.display);
    console.log('[REVIEWS DEBUG] Element style.visibility:', reviewItem.style.visibility);
    console.log('[REVIEWS DEBUG] Element style.opacity:', reviewItem.style.opacity);
    
    return reviewItem;
}

// Generate User Initials
function generateUserInitials(user) {
    if (user.first_name && user.last_name) {
        return (user.first_name.charAt(0) + user.last_name.charAt(0)).toUpperCase();
    } else if (user.username) {
        return user.username.charAt(0).toUpperCase();
    }
    return 'U';
}

// Get Review User Name
function getReviewUserName(user) {
    if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
    } else if (user.username) {
        return user.username;
    }
    return 'Utente';
}

// Generate Review Stars
function generateReviewStars(rating) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        const starClass = i <= rating ? 'review-star' : 'review-star empty';
        starsHTML += `<span class="${starClass}">★</span>`;
    }
    return starsHTML;
}

// Show Empty State
function showReviewsEmpty(isError = false) {
    const reviewsEmpty = document.getElementById('reviewsEmpty');
    const reviewsList = document.getElementById('reviewsList');
    
    if (reviewsEmpty) {
        reviewsEmpty.style.display = 'flex';
        
        if (isError) {
            const emptyIcon = reviewsEmpty.querySelector('.material-symbols-outlined');
            const emptyTitle = reviewsEmpty.querySelector('h3');
            const emptyText = reviewsEmpty.querySelector('p');
            
            if (emptyIcon) emptyIcon.textContent = 'error';
            if (emptyTitle) emptyTitle.textContent = 'Errore nel caricamento';
            if (emptyText) emptyText.textContent = 'Si è verificato un errore nel caricamento delle recensioni. Riprova più tardi.';
        }
    }
    
    // Hide existing review items
    if (reviewsList) {
        const existingReviews = reviewsList.querySelectorAll('.review-item');
        existingReviews.forEach(review => review.remove());
    }
}

// Initialize Reviews Filters
function initializeReviewsFilters() {
    const reviewsFilterBtn = document.getElementById('reviewsFilterBtn');
    const reviewsFilterDropdown = document.getElementById('reviewsFilterDropdown');
    const filterOptions = reviewsFilterDropdown?.querySelectorAll('.filter-option');
    
    if (reviewsFilterBtn && reviewsFilterDropdown) {
        // Toggle dropdown
        reviewsFilterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            reviewsFilterBtn.classList.toggle('active');
            reviewsFilterDropdown.classList.toggle('show');
        });
        
        // Handle option selection
        filterOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const value = e.target.dataset.value;
                const text = e.target.textContent;
                
                // Update active state
                filterOptions.forEach(opt => opt.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update button text
                const filterText = reviewsFilterBtn.querySelector('.filter-text');
                if (filterText) filterText.textContent = text;
                
                // Update filter and refresh reviews
                currentReviewsFilter = value;
                reviewsLoaded = 0;
                displayReviews();
                
                // Close dropdown
                reviewsFilterBtn.classList.remove('active');
                reviewsFilterDropdown.classList.remove('show');
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            reviewsFilterBtn.classList.remove('active');
            reviewsFilterDropdown.classList.remove('show');
        });
    }
}

// Initialize Infinite Scroll for Reviews
function initializeInfiniteScroll() {
    const reviewsList = document.getElementById('reviewsList');
    
    if (!reviewsList) {
        console.warn('[REVIEWS] Reviews list container not found for infinite scroll');
        return;
    }
    
    // Since we're showing all reviews at once, infinite scroll is automatically handled
    console.log('[REVIEWS] Infinite scroll initialized - all reviews will be shown');
}

// Generate Placeholder Reviews for Demonstration
// NOTE: This function provides sample data to showcase the reviews section
// Remove or modify this when real review data is available from the API
function generatePlaceholderReviews() {
    const placeholderReviews = [
        {
            user: {
                first_name: "Marco",
                last_name: "Rossi",
                username: "marco.rossi"
            },
            rating: 5,
            review_text: "Documento eccellente! Molto dettagliato e ben strutturato. Mi ha aiutato tantissimo per preparare l'esame di Analisi Matematica. Consiglio vivamente l'acquisto!",
            review_date: "2025-01-27T10:30:00Z",
            vetrina_id: 1,
            file_id: null,
            vetrina_name: "Analisi Matematica I - Completo",
            file_name: null,
            placeholder: true
        },
        {
            user: {
                first_name: "Giulia",
                last_name: "Bianchi",
                username: "giulia.bianchi"
            },
            rating: 4,
            review_text: "Buon materiale didattico, spiegazioni chiare e esempi pratici. Forse avrei gradito qualche esercizio in più, ma nel complesso sono soddisfatta dell'acquisto.",
            review_date: "2025-01-26T15:45:00Z",
            vetrina_id: null,
            file_id: 15,
            vetrina_name: null,
            file_name: "Fisica Generale - Meccanica.pdf",
            placeholder: true
        },
        {
            user: {
                first_name: "Alessandro",
                last_name: "Verdi",
                username: "ale_verdi"
            },
            rating: 5,
            review_text: "Perfetto! Esattamente quello che cercavo. Le formule sono spiegate benissimo e gli esempi sono molto utili. Grazie mille per aver condiviso questo materiale!",
            review_date: "2025-01-25T09:20:00Z",
            vetrina_id: 3,
            file_id: null,
            vetrina_name: "Chimica Organica - Base",
            file_name: null,
            placeholder: true
        },
        {
            user: {
                first_name: "Sofia",
                last_name: "Ferrari",
                username: "sofia_ferrari"
            },
            rating: 3,
            review_text: "Il documento è buono ma pensavo fosse più approfondito. Comunque utile per avere una panoramica generale dell'argomento. Prezzo giusto.",
            review_date: "2025-01-24T14:10:00Z",
            vetrina_id: null,
            file_id: 22,
            vetrina_name: null,
            file_name: "Storia Contemporanea - Riassunto.docx",
            placeholder: true
        },
        {
            user: {
                first_name: "Luca",
                last_name: "Marino",
                username: "luca.marino"
            },
            rating: 5,
            review_text: "Fantastico! Super completo e ben organizzato. Si vede che c'è tanto lavoro dietro. Consigliatissimo per chi studia informatica!",
            review_date: "2025-01-23T16:55:00Z",
            vetrina_id: 5,
            file_id: null,
            vetrina_name: "Algoritmi e Strutture Dati",
            file_name: null,
            placeholder: true
        },
        {
            user: {
                first_name: "Elena",
                last_name: "Romano",
                username: "elena_romano"
            },
            rating: 4,
            review_text: "Molto utile per la preparazione dell'esame. Spiegazioni chiare e schemi ben fatti. L'unica pecca è che mancano alcuni argomenti che erano nel programma.",
            review_date: "2025-01-22T11:30:00Z",
            vetrina_id: null,
            file_id: 8,
            vetrina_name: null,
            file_name: "Diritto Costituzionale - Appunti.pdf",
            placeholder: true
        },
        {
            user: {
                first_name: "Andrea",
                last_name: "Conti",
                username: "andrea.conti"
            },
            rating: 5,
            review_text: "Eccezionale lavoro! Molto professionale e accurato. Mi ha permesso di superare l'esame con un ottimo voto. Vale ogni centesimo speso!",
            review_date: "2025-01-21T08:45:00Z",
            vetrina_id: 2,
            file_id: null,
            vetrina_name: "Economia Aziendale - Avanzato",
            file_name: null,
            placeholder: true
        }
    ];
    return placeholderReviews;
} 