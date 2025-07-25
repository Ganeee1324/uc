// Add cache-busting timestamp to force browser refresh
const CACHE_BUSTER = Date.now();

const API_BASE = window.APP_CONFIG?.API_BASE || 'https://symbia.it:5000';
let authToken = localStorage.getItem('authToken');

// Hierarchy Cache Management
const HIERARCHY_CACHE_KEY = 'hierarchy_data_cache';
const HIERARCHY_CACHE_VERSION = '1.0';
const HIERARCHY_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Cache management functions
function getHierarchyCache() {
    try {
        const cached = localStorage.getItem(HIERARCHY_CACHE_KEY);
        if (!cached) return null;
        
        const cacheData = JSON.parse(cached);
        
        // Check cache version
        if (cacheData.version !== HIERARCHY_CACHE_VERSION) {
            clearHierarchyCache();
            return null;
        }
        
        // Check cache expiration
        const now = Date.now();
        if (now - cacheData.timestamp > HIERARCHY_CACHE_DURATION) {
            clearHierarchyCache();
            return null;
        }
        
        return cacheData.data;
    } catch (error) {
        console.warn('⚠️ Error reading hierarchy cache:', error);
        clearHierarchyCache();
        return null;
    }
}

function setHierarchyCache(data) {
    try {
        const cacheData = {
            version: HIERARCHY_CACHE_VERSION,
            timestamp: Date.now(),
            data: data
        };
        localStorage.setItem(HIERARCHY_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
        console.warn('⚠️ Error caching hierarchy data:', error);
        // Don't throw error - caching failure shouldn't break the app
    }
}

function clearHierarchyCache() {
    try {
        localStorage.removeItem(HIERARCHY_CACHE_KEY);
    } catch (error) {
        console.warn('⚠️ Error clearing hierarchy cache:', error);
    }
}

// Fallback function to get expired cache data
function getExpiredHierarchyCache() {
    try {
        const cached = localStorage.getItem(HIERARCHY_CACHE_KEY);
        if (!cached) return null;
        
        const cacheData = JSON.parse(cached);
        
        // Check cache version
        if (cacheData.version !== HIERARCHY_CACHE_VERSION) {
            return null;
        }
        
        // Return data even if expired
        return cacheData.data;
    } catch (error) {
        console.warn('⚠️ Error reading expired hierarchy cache:', error);
        return null;
    }
}

// Force refresh hierarchy data (for manual cache invalidation)
async function refreshHierarchyData() {
    clearHierarchyCache();
    window.facultyCoursesData = null;
    await loadHierarchyData();
}

// Handle CSP-compliant event handlers
function handleCSPEventHandlers() {
    document.addEventListener('click', function(e) {
        // Handle filter actions
        if (e.target.closest('[data-action="clear-all-filters"]')) {
            clearAllFiltersAction();
        }
        
        if (e.target.closest('[data-action="remove-filter"]')) {
            const element = e.target.closest('[data-action="remove-filter"]');
            const filterKey = element.getAttribute('data-filter-key');
            const specificValue = element.getAttribute('data-specific-value');
            if (filterKey) {
                removeActiveFilter(filterKey, e, specificValue);
            }
        }
        
        if (e.target.closest('[data-action="toggle-favorite"]')) {
            const element = e.target.closest('[data-action="toggle-favorite"]');
            toggleFavorite(element, e);
        }
        
        if (e.target.closest('[data-action="navigate"]')) {
            const element = e.target.closest('[data-action="navigate"]');
            const url = element.getAttribute('data-url');
            if (url) {
                window.location.href = url;
            }
        }
        
        if (e.target.closest('[data-action="download-document"]')) {
            const element = e.target.closest('[data-action="download-document"]');
            const fileId = element.getAttribute('data-file-id');
            if (fileId) {
                downloadDocument(fileId);
                closePreview();
            }
        }
        
        if (e.target.closest('[data-action="purchase-document"]')) {
            const element = e.target.closest('[data-action="purchase-document"]');
            const fileId = element.getAttribute('data-file-id');
            if (fileId) {
                purchaseDocument(fileId);
                closePreview();
            }
        }
        
        if (e.target.closest('[data-action="close-preview"]')) {
            closePreview();
        }
        
        if (e.target.closest('[data-action="view-full-document"]')) {
            const element = e.target.closest('[data-action="view-full-document"]');
            const docId = element.getAttribute('data-doc-id');
            if (docId) {
                window.location.href = `document-preview.html?id=${docId}`;
            }
        }
    });
}

// Check if user is authenticated, but don't redirect - just return status
function checkAuthentication() {
    if (!authToken) {
        return false;
    }
    return true;
}

let currentVetrine = [];
let currentFiles = [];
let originalFiles = []; // Keep original unfiltered data
let activeFilters = {};
let isFiltersOpen = false;

// File metadata caching removed - now using only vetrina-level data

    // Initialize the page
    window.onload = async function() {
        
        // Force clear any cached data that might be causing issues
        if (sessionStorage.getItem('lastCacheBuster') !== CACHE_BUSTER.toString()) {
            sessionStorage.clear();
            sessionStorage.setItem('lastCacheBuster', CACHE_BUSTER.toString());
        }
        
        // Loading state is already set in HTML for immediate display
        // This ensures layout stability even on first load with empty cache
        
        // Initialize user info (will show login button if not authenticated)
        initializeUserInfo();
        
        // Initialize CSP-compliant event handlers
        handleCSPEventHandlers();
        
        initializeAnimations();
        initializeFilters();
        initializeScrollToTop();
        
        // Load valid tags from backend first
        await loadValidTags();
        
        // Load files first, then restore filters
        await loadAllFiles();
        
        // Ensure documents are shown after loading
        if (originalFiles && originalFiles.length > 0) {
            renderDocuments(originalFiles);
            currentFiles = originalFiles;
            showStatus(`${originalFiles.length} documenti disponibili 📚`);
        }
        
        // Small delay to ensure DOM is fully ready, then clear filters (fresh start)
        setTimeout(() => {
            restoreFiltersFromStorage();
            
            // Additional check to ensure all UI elements are properly updated
            setTimeout(() => {
                updateActiveFilterIndicators();
                updateActiveFiltersDisplay();
                
                // Final safety check - if no documents are shown, show all documents
                setTimeout(() => {
                    const documentsGrid = document.getElementById('documentsGrid');
                    if (documentsGrid && documentsGrid.children.length === 0 && originalFiles && originalFiles.length > 0) {
                        renderDocuments(originalFiles);
                        currentFiles = originalFiles;
                        showStatus(`${originalFiles.length} documenti disponibili 📚`);
                    }
                }, 500);
            }, 50);
        }, 100);
        
        // Favorite status is already loaded from the backend in loadAllFiles()
        // No need to refresh on page load since the data is already correct
    
    // Add keyboard shortcut to test loading animation (Ctrl/Cmd + L)
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            
        }
        
        // Add keyboard shortcut to clear all filters (Ctrl/Cmd + Alt + C)
        if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'c') {
            e.preventDefault();
            clearAllFiltersAction();
        }
        
        // Add keyboard shortcut to debug filter state (Ctrl/Cmd + Alt + D)
        if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'd') {
            e.preventDefault();
        }
    });
    
    // Add a single, reliable event listener to refresh favorites when the page is shown.
    window.addEventListener('pageshow', (event) => {
        // This event fires on initial load and when navigating back to the page.
        const favoritesChanged = sessionStorage.getItem('favoritesChanged');
        
        if (favoritesChanged === 'true') {
            sessionStorage.removeItem('favoritesChanged'); // Clear the flag
            // Favorite status is already included in vetrine data, no need for separate refresh
        }
    });
    
    // Mark when we're leaving the page
    let isLeavingPage = false;
    window.addEventListener('beforeunload', () => {
        isLeavingPage = true;
    });
    
    // Check if we're returning to the page
    window.addEventListener('pageshow', async (event) => {
        if (isLeavingPage && currentFiles && currentFiles.length > 0) {
            isLeavingPage = false;
            // Favorite status is already included in vetrine data, no need for separate refresh
        }
    });
    
    // Handle browser back/forward navigation
    window.addEventListener('popstate', async (event) => {
        if (currentFiles && currentFiles.length > 0) {
            // Favorite status is already included in vetrine data, no need for separate refresh
        }
    });
    
};

async function initializeUserInfo() {
    const user = await fetchCurrentUserData();
    if (user) {
        updateHeaderUserInfo(user);
    }
}

async function fetchCurrentUserData() {
    const cachedUser = localStorage.getItem('currentUser');
    if (cachedUser) {
        return JSON.parse(cachedUser);
    }

    // If cache is empty, return null (user is not authenticated)
    return null;
}

function updateVendorBanner(vendorData) {
    const vendorAvatar = document.getElementById('vendorAvatar');
    const vendorName = document.getElementById('vendorName');
    const vendorFaculty = document.getElementById('vendorFaculty');
    const vendorChannel = document.getElementById('vendorChannel');
    const vendorRatingBtn = document.getElementById('vendorRatingBtn');
    
    if (vendorAvatar && vendorName && vendorFaculty && vendorChannel && vendorRatingBtn) {
        // Set vendor name - only use username to avoid duplication
        vendorName.textContent = vendorData.username;
        
        // Create avatar with consistent gradient
        const gradient = getConsistentGradient(vendorData.username);
        // Use username for initials to avoid duplication
        const initials = getInitials(vendorData.username);
        
        // Determine font size based on screen width
        let fontSize = '50px'; // Default for desktop
        if (window.innerWidth <= 480) {
            fontSize = '32px'; // Mobile
        } else if (window.innerWidth <= 768) {
            fontSize = '40px'; // Tablet
        }
        
        vendorAvatar.style.background = gradient;
        vendorAvatar.textContent = initials;
        vendorAvatar.style.color = 'white';
        vendorAvatar.style.fontWeight = '700';
        vendorAvatar.style.fontSize = fontSize;
        vendorAvatar.style.display = 'flex';
        vendorAvatar.style.alignItems = 'center';
        vendorAvatar.style.justifyContent = 'center';
        vendorAvatar.style.boxShadow = '0 25px 60px rgba(0, 0, 0, 0.4)';
        vendorAvatar.style.border = '6px solid rgba(255, 255, 255, 0.6)';
        
        // Update faculty and channel information
        if (vendorData.faculty) {
            vendorFaculty.textContent = vendorData.faculty;
        } else {
            vendorFaculty.textContent = 'Non specificato';
        }
        
        if (vendorData.canale) {
            vendorChannel.textContent = vendorData.canale;
        } else {
            vendorChannel.textContent = 'Non specificato';
        }
        
        // Update rating information
        if (vendorData.averageRating !== undefined && vendorData.reviewsCount !== undefined) {
            const ratingStars = vendorRatingBtn.querySelector('.vendor-banner-rating-stars');
            const ratingText = vendorRatingBtn.querySelector('.vendor-rating-text');
            
            if (ratingStars && ratingText) {
                // Generate stars based on rating with fractional support
                const stars = generateVendorBannerStars(vendorData.averageRating);
                ratingStars.innerHTML = stars;
                
                // Update rating text
                ratingText.textContent = `${vendorData.averageRating.toFixed(1)} (${vendorData.reviewsCount})`;
            }
        }
    }
}

function updateVendorStats(documentCount) {
    const vendorStats = document.getElementById('vendorStats');
    if (vendorStats) {
        vendorStats.textContent = `${documentCount} documenti • 0 recensioni`;
    }
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
        const gradientAvatar = createGradientAvatar(fullName, user.username);
        userAvatar.innerHTML = gradientAvatar;
        
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
        
        // Handle hover and click for user avatar
        const userInfo = document.querySelector('.user-info');
        let hoverTimeout;
        
        // Check if device supports hover
        const supportsHover = window.matchMedia('(hover: hover)').matches;
        
        if (supportsHover) {
            // Show dropdown on hover with delay to prevent accidental closing
            userAvatar.addEventListener('mouseenter', (event) => {
                event.stopPropagation();
                clearTimeout(hoverTimeout);
                userInfo.classList.add('open');
            });
            
            // Handle mouse enter on dropdown to keep it open
            const userDropdown = document.getElementById('userDropdown');
            if (userDropdown) {
                userDropdown.addEventListener('mouseenter', (event) => {
                    event.stopPropagation();
                    clearTimeout(hoverTimeout);
                    userInfo.classList.add('open');
                });
            }
            
            // Hide dropdown when mouse leaves the user info area with small delay
            userInfo.addEventListener('mouseleave', (event) => {
                event.stopPropagation();
                hoverTimeout = setTimeout(() => {
                    userInfo.classList.remove('open');
                }, 150); // Small delay to allow moving to dropdown
            });
            
            // Cancel timeout when re-entering the area
            userInfo.addEventListener('mouseenter', (event) => {
                event.stopPropagation();
                clearTimeout(hoverTimeout);
            });
        }
        
        // Handle click on avatar - redirect to v-dashboard
        userAvatar.addEventListener('click', (event) => {
            event.stopPropagation();
            // Redirect to v-dashboard with user info
            window.location.href = 'v-dashboard.html';
        });
        
        // Add dropdown toggle functionality with a small arrow
        const dropdownToggle = document.createElement('div');
        dropdownToggle.className = 'dropdown-toggle';
        dropdownToggle.innerHTML = '<span class="material-symbols-outlined">expand_more</span>';
        
        // Position the user-info container relatively to contain the toggle
        userInfo.style.position = 'relative';
        userInfo.appendChild(dropdownToggle);
        
        // Toggle dropdown when clicking the arrow
        dropdownToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            userInfo.classList.toggle('open');
        });

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
        userAvatar.innerHTML = `
            <button class="login-btn" onclick="window.location.href='index.html'">
                <span class="login-btn-text">Accedi</span>
            </button>
        `;
        
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

function initializeAnimations() {
    // Remove static cards initialization since we'll load dynamic data
    setTimeout(() => {
        const cards = document.querySelectorAll('.document-card');
        cards.forEach((card, index) => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    }, 500);
}

// ===========================
// ADVANCED FILTER SYSTEM - FULLY FUNCTIONAL
// ===========================

function initializeFilters() {
    const filtersBtn = document.getElementById('filtersBtn');
    const filtersPanel = document.getElementById('filtersPanel');
    const filtersOverlay = document.getElementById('filtersOverlay');
    const filtersClose = document.getElementById('filtersClose');
    const clearAllFilters = document.getElementById('clearAllFilters');

    // Filter panel toggle
    if (filtersBtn) filtersBtn.addEventListener('click', toggleFiltersPanel);
    if (filtersClose) filtersClose.addEventListener('click', closeFiltersPanel);
    if (filtersOverlay) filtersOverlay.addEventListener('click', closeFiltersPanel);

    // Filter actions
    if (clearAllFilters) clearAllFilters.addEventListener('click', clearAllFiltersAction);

    // Initialize all filter controls
    initializeFilterControls();

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isFiltersOpen) {
            closeFiltersPanel();
        }
    });
}

function initializeFilterControls() {

    
    // Professional dropdowns (includes all dropdown types now)
    setupDropdowns();

    // Rating filter
    initializeRatingFilter();
    
    // Toggle group filters
    initializeToggleFilters();
    
    // Price range filters
    initializePriceRangeFilter();
    
    // Order functionality
    initializeOrderDropdown();
}

function handleFilterChangeImmediate(e) {
    // This function is no longer needed since we're using professional dropdowns
    // All filter changes are now handled through the dropdown system
}





function initializeCourseFilter() {
    const courseInput = document.getElementById('courseFilter');
    const suggestionsContainer = document.getElementById('courseSuggestions');
    let courses = [];
    let selectedIndex = -1;
    
    if (!courseInput || !suggestionsContainer) return;
    
    // Extract courses from hierarchy data
    function updateCourses() {
        if (window.facultyCoursesData) {
            const selectedFaculty = activeFilters.faculty;
            if (selectedFaculty && window.facultyCoursesData[selectedFaculty]) {
                courses = window.facultyCoursesData[selectedFaculty].map(course => course[1]).sort();
            } else {
                // Show all courses if no faculty selected
                courses = [];
                Object.values(window.facultyCoursesData).forEach(facultyCourses => {
                    facultyCourses.forEach(course => {
                        courses.push(course[1]);
                    });
                });
                courses = [...new Set(courses)].sort();
            }
        }
    }
    
    courseInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        updateCourses();
        
        if (query.length === 0) {
            hideSuggestions();
            delete activeFilters.course;
            triggerFilterUpdate();
            return;
        }
        
        const filteredCourses = courses.filter(course => 
            course.toLowerCase().includes(query)
        );
        
        showSuggestions(filteredCourses);
        selectedIndex = -1;
    });
    
    courseInput.addEventListener('keydown', handleKeyNavigation());
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!courseInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            hideSuggestions();
        }
    });
    
    function showSuggestions(filteredCourses) {
        if (filteredCourses.length === 0) {
            hideSuggestions();
            return;
        }
        
        suggestionsContainer.innerHTML = filteredCourses
            .slice(0, 10)
            .map(course => 
                `<div class="autocomplete-suggestion" data-value="${course}">${course}</div>`
            ).join('');
        
        suggestionsContainer.classList.add('show');
        
        // Add click handlers
        suggestionsContainer.querySelectorAll('.autocomplete-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                selectCourse(suggestion.textContent);
            });
        });
    }
    
    function hideSuggestions() {
        suggestionsContainer.classList.remove('show');
        selectedIndex = -1;
    }
    
    function handleKeyNavigation() {
        return (e) => {
            const suggestions = suggestionsContainer.querySelectorAll('.autocomplete-suggestion');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
                updateSelection(suggestions);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection(suggestions);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    selectCourse(suggestions[selectedIndex].textContent);
                } else if (suggestions.length > 0) {
                    selectCourse(suggestions[0].textContent);
                }
            } else if (e.key === 'Escape') {
                hideSuggestions();
            }
        };
    }
    
    function updateSelection(suggestions) {
        suggestions.forEach((suggestion, index) => {
            suggestion.classList.toggle('highlighted', index === selectedIndex);
        });
    }
    
    function selectCourse(course) {
        courseInput.value = course;
        activeFilters.course = course;
        hideSuggestions();
        applyFiltersAndRender();
    }
    
    // Expose update function for faculty changes
    window.updateCoursesForCourse = updateCourses;
}

function initializeCanaleFilter() {
    const canaleInput = document.getElementById('canaleFilter');
    const suggestionsContainer = document.getElementById('canaleSuggestions');
    let canali = ['A', 'B', 'C', 'D', 'E', 'F', 'Canale Unico'];
    let selectedIndex = -1;
    
    if (!canaleInput || !suggestionsContainer) return;
    
    canaleInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length === 0) {
            hideSuggestions();
            delete activeFilters.canale;
            applyFiltersAndRender();
            return;
        }
        
        const filteredCanali = canali.filter(canale => 
            canale.toLowerCase().includes(query)
        );
        
        showSuggestions(filteredCanali);
        selectedIndex = -1;
    });
    
    canaleInput.addEventListener('keydown', handleKeyNavigation());
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!canaleInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            hideSuggestions();
        }
    });
    
    function showSuggestions(filteredCanali) {
        if (filteredCanali.length === 0) {
            hideSuggestions();
            return;
        }
        
        suggestionsContainer.innerHTML = filteredCanali
                    .map(canale =>
            `<div class="autocomplete-suggestion" data-value="${canale}">Canale ${formatCanaleDisplay(canale)}</div>`
        ).join('');
        
        suggestionsContainer.classList.add('show');
        
        // Add click handlers
        suggestionsContainer.querySelectorAll('.autocomplete-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                const canale = suggestion.getAttribute('data-value');
                selectCanale(canale);
            });
        });
    }
    
    function hideSuggestions() {
        suggestionsContainer.classList.remove('show');
        selectedIndex = -1;
    }
    
    function handleKeyNavigation() {
        return (e) => {
            const suggestions = suggestionsContainer.querySelectorAll('.autocomplete-suggestion');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
                updateSelection(suggestions);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection(suggestions);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    const canale = suggestions[selectedIndex].getAttribute('data-value');
                    selectCanale(canale);
                } else if (suggestions.length > 0) {
                    const canale = suggestions[0].getAttribute('data-value');
                    selectCanale(canale);
                }
            } else if (e.key === 'Escape') {
                hideSuggestions();
            }
        };
    }
    
    function updateSelection(suggestions) {
        suggestions.forEach((suggestion, index) => {
            suggestion.classList.toggle('highlighted', index === selectedIndex);
        });
    }
    
    function selectCanale(canale) {
        canaleInput.value = canale;
        activeFilters.canale = canale;
        hideSuggestions();
        applyFiltersAndRender();
    }
}

// Helper functions
function clearCourseFilter() {
    const courseInput = document.getElementById('courseFilter');
    if (courseInput) {
        courseInput.value = '';
        delete activeFilters.course;
    }
}

function updateCoursesForFaculty(faculty) {
    if (window.updateCoursesForCourse) {
        window.updateCoursesForCourse();
    }
}

// Professional Dropdown functionality
function setupDropdowns() {
    // Initialize hierarchy data first
    loadHierarchyData().then(() => {
        const searchableDropdowns = ['faculty', 'course', 'canale'];
        const staticDropdowns = ['documentType', 'language', 'academicYear', 'tag'];
        const allDropdowns = [...searchableDropdowns, ...staticDropdowns];
        
        // Setup searchable dropdowns (faculty, course, canale)
        searchableDropdowns.forEach(type => {
            const container = document.querySelector(`[data-dropdown="${type}"]`);
            const input = document.getElementById(`${type}Filter`);
            const options = document.getElementById(`${type}Options`);
            
            if (!container || !input || !options) return;
            
            // Handle filter label click - close dropdown if open, do nothing if closed
            const label = document.querySelector(`label[for="${type}Filter"]`);
            if (label) {
                label.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const isOpen = container.classList.contains('open');
                    if (isOpen) {
                        container.classList.remove('open');
                    }
                    // Do nothing if dropdown is closed
                });
            }
            
            // Handle input events (typing to search)
            input.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                
                // Clear filter if input is empty
                if (value === '') {
                    delete activeFilters[type];
                    if (type === 'faculty') {
                        const courseInput = document.getElementById('courseFilter');
                        courseInput.value = '';
                        delete activeFilters.course;
                    }
                    container.classList.remove('open');
                    applyFiltersAndRender();
                    return;
                }
                
                // Show dropdown and filter if not already open
                if (!container.classList.contains('open')) {
                    toggleDropdown(container, type);
                } else {
                    // Reset highlighted option to top when user types
                    resetDropdownHighlight(type);
                }
                filterDropdownOptions(type, value);
            });
            
            // Handle focus (show dropdown)
            input.addEventListener('focus', (e) => {
                if (!container.classList.contains('open')) {
                    toggleDropdown(container, type);
                }
            });
            
            // Handle input click specifically (not the wrapper)
            input.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!container.classList.contains('open')) {
                    toggleDropdown(container, type);
                }
            });
            
            // Handle dropdown input wrapper click (for better UX)
            const inputWrapper = container.querySelector('.dropdown-input-wrapper');
            if (inputWrapper) {
                inputWrapper.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!container.classList.contains('open')) {
                        toggleDropdown(container, type);
                    }
                });
            }
            
            // Handle arrow click - close dropdown if open, open if closed
            const arrow = container.querySelector('.dropdown-arrow');
            if (arrow) {
                arrow.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = container.classList.contains('open');
                    if (isOpen) {
                        // Close dropdown if already open
                        container.classList.remove('open');
                    } else {
                        // Open dropdown if closed
                        toggleDropdown(container, type);
                        input.focus();
                    }
                });
            }
            
            // Keyboard navigation
            input.addEventListener('keydown', (e) => {
                handleDropdownKeyboard(e, type);
            });
        });
        
        // Setup static dropdowns (documentType, language, academicYear, tag) - same logic as searchable but no text input
        staticDropdowns.forEach(type => {
            const container = document.querySelector(`[data-dropdown="${type}"]`);
            const input = document.getElementById(`${type}Filter`);
            const options = document.getElementById(`${type}Options`);
            
            if (!container || !input || !options) return;
            
            // Handle filter label click - close dropdown if open, do nothing if closed
            const label = document.querySelector(`label[for="${type}Filter"]`);
            if (label) {
                label.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const isOpen = container.classList.contains('open');
                    if (isOpen) {
                        container.classList.remove('open');
                    }
                    // Do nothing if dropdown is closed
                });
            }
            
            // Handle click to open dropdown (readonly inputs)
            input.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleDropdown(container, type);
            });
            
            // Handle dropdown input wrapper click (for better UX)
            const inputWrapper = container.querySelector('.dropdown-input-wrapper');
            if (inputWrapper) {
                inputWrapper.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleDropdown(container, type);
                });
            }
            
            // Handle arrow click - close dropdown if open, open if closed
            const arrow = container.querySelector('.dropdown-arrow');
            if (arrow) {
                arrow.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = container.classList.contains('open');
                    if (isOpen) {
                        // Close dropdown if already open
                        container.classList.remove('open');
                    } else {
                        // Open dropdown if closed
                        toggleDropdown(container, type);
                    }
                });
            }
            
            // Keyboard navigation
            input.addEventListener('keydown', (e) => {
                handleDropdownKeyboard(e, type);
            });
        });
        
        // Close dropdowns when clicking outside (unified for all dropdowns)
        document.addEventListener('click', (e) => {
            // Check if click is on dropdown input wrapper or dropdown content
            const clickedDropdownInputWrapper = e.target.closest('.dropdown-input-wrapper');
            const clickedDropdownContent = e.target.closest('.dropdown-content');
                    if (!clickedDropdownInputWrapper && !clickedDropdownContent) {
                // Click is outside all dropdown areas - close all dropdowns
                closeAllDropdowns();
                
                // Clear any invalid inputs consistently
                allDropdowns.forEach(type => {
                    const input = document.getElementById(`${type}Filter`);
                    if (input && !input.readOnly) {
                        const currentValue = input.value.trim();
                        
                        // For multi-select filters, don't validate against currentValue
                        const multiSelectFilters = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear', 'tag'];
                        const isMultiSelect = multiSelectFilters.includes(type);
                        
                        if (!isMultiSelect) {
                            const isValidSelection = activeFilters[type] === currentValue;
                            
                            if (!isValidSelection && currentValue !== '' && !currentValue.includes(' selected')) {
                                input.value = '';
                                delete activeFilters[type];
                                if (type === 'faculty') {
                                    const courseInput = document.getElementById('courseFilter');
                                    courseInput.value = '';
                                    delete activeFilters.course;
                                }
                                applyFiltersAndRender();
                            }
                        }
                    }
                });
            }
        });
        
        // Handle window resize and scroll to reposition dropdowns
        window.addEventListener('resize', () => {
            repositionOpenDropdowns();
        });
        
        window.addEventListener('scroll', () => {
            repositionOpenDropdowns();
        });
        
        // Initial population
        populateDropdownOptions();
    });
}

function toggleDropdown(container, type) {
    const isOpen = container.classList.contains('open');
    
    // Determine if this is a multi-select filter
    const multiSelectFilters = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear', 'tag'];
    const isMultiSelect = multiSelectFilters.includes(type);
    
    // Close all other dropdowns (except for multi-select if keeping open)
    if (!isMultiSelect || !isOpen) {
        closeAllDropdowns();
    }
    
    if (!isOpen) {
        container.classList.add('open');
        const input = document.getElementById(`${type}Filter`);
        
        // Update input styling for multi-select
        if (isMultiSelect && activeFilters[type] && Array.isArray(activeFilters[type]) && activeFilters[type].length > 0) {
            input.setAttribute('data-multi-selected', 'true');
            
            // Keep academic context filters searchable when reopening
            const academicContextFilters = ['faculty', 'course', 'canale'];
            if (academicContextFilters.includes(type) && activeFilters[type].length > 1) {
                input.value = '';
                input.setAttribute('placeholder', `${activeFilters[type].length} selezionati - scrivi per cercarne altri...`);
            }
        }
        
        filterDropdownOptions(type, input.value || '');
    }
}

function positionDropdown(input, dropdown) {
    if (!input || !dropdown) {
        return;
    }
    
    const rect = input.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 250; // approximate max height
    
    // Position below input by default
    let top = rect.bottom + 2;
    
    // If dropdown would go below viewport, position above input instead
    if (top + dropdownHeight > viewportHeight && rect.top > dropdownHeight) {
        top = rect.top - dropdownHeight - 2;
    }
    
    // Ensure minimum width
    const width = Math.max(rect.width, 200);
    
    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${width}px`;
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-container').forEach(container => {
        container.classList.remove('open');
    });
}

function repositionOpenDropdowns() {
    const allDropdowns = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear'];
    allDropdowns.forEach(type => {
        const container = document.querySelector(`[data-dropdown="${type}"]`);
        if (container && container.classList.contains('open')) {
            const input = document.getElementById(`${type}Filter`);
            const dropdown = document.getElementById(`${type}Dropdown`);
            if (input && dropdown) {
                positionDropdown(input, dropdown);
            }
        }
    });
}

function resetDropdownHighlight(type) {
    const options = document.getElementById(`${type}Options`);
    if (options) {
        // Remove all highlights
        options.querySelectorAll('.dropdown-option.highlighted').forEach(option => {
            option.classList.remove('highlighted');
        });
        // Scroll to top of options
        options.scrollTop = 0;
    }
}

// Enhanced hierarchy loading with caching
async function loadHierarchyData() {
    // First check if we already have data in memory
    if (window.facultyCoursesData) {
        return;
    }
    
    // Check cache first
    const cachedData = getHierarchyCache();
    if (cachedData) {
        window.facultyCoursesData = cachedData;
        return;
    }
    
    // If no cache, fetch from API
    try {
        const data = await makeSimpleRequest('/hierarchy');
        
        // Validate the data structure
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            window.facultyCoursesData = data;
            
            // Cache the data for future use
            setHierarchyCache(data);
        } else {
            console.warn('⚠️ Unexpected hierarchy data format:', data);
            window.facultyCoursesData = {};
        }
    } catch (error) {
        console.error('❌ Error loading hierarchy data:', error);
        window.facultyCoursesData = {};
        
        // If API fails, try to use any available cached data (even if expired)
        const expiredCache = getExpiredHierarchyCache();
        if (expiredCache) {
            window.facultyCoursesData = expiredCache;
        }
    }
}

function populateDropdownOptions() {
    if (!window.facultyCoursesData) return;
    
    // Faculty options
    const faculties = Object.keys(window.facultyCoursesData).sort();
    populateOptions('faculty', faculties);
    
    // Course options (initially all courses)
    const courses = [];
    Object.values(window.facultyCoursesData).forEach(facultyCourses => {
        facultyCourses.forEach(course => courses.push(course[1]));
    });
    const uniqueCourses = [...new Set(courses)].sort();
    populateOptions('course', uniqueCourses);
    
    // Canale options
    populateOptions('canale', ['A', 'B', 'C', 'D', 'E', 'F', 'Canale Unico']);
}

function populateOptions(type, items) {
    const options = document.getElementById(`${type}Options`);
    const currentValue = document.getElementById(`${type}Filter`).value;
    
    if (!options) {
        return;
    }
    
    // Language display text mapping
    const languageDisplayMap = {
        'Italian': 'Italiano',
        'English': 'Inglese'
    };
    
    // Tag display text mapping
    const tagDisplayMap = {
        'appunti': 'Appunti',
        'dispense': 'Dispense',
        'esercizi': 'Esercizi'
    };
    
    // Map dropdown types to filter keys
    const filterKeyMap = {
        'faculty': 'faculty',
        'course': 'course',
        'canale': 'canale',
        'documentType': 'documentType',
        'language': 'language',
        'academicYear': 'academicYear',
        'tag': 'tag'
    };
    
    const filterKey = filterKeyMap[type] || type;
    const activeFilterValues = activeFilters[filterKey];
    
    // Determine which filters support multi-selection
    const multiSelectFilters = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear', 'tag'];
    const isMultiSelect = multiSelectFilters.includes(type);
    
    let optionsHTML = '';
    
    // Show selected options at the top for multi-select filters
    if (isMultiSelect && activeFilterValues && Array.isArray(activeFilterValues) && activeFilterValues.length > 0) {
        const selectedOptionsHTML = activeFilterValues.map(value => {
            let displayText = value;
            if (type === 'language' && languageDisplayMap[value]) {
                displayText = languageDisplayMap[value];
            } else if (type === 'tag' && tagDisplayMap[value]) {
                displayText = tagDisplayMap[value];
            }
            
            return `
            <div class="dropdown-option selected has-active-filter" data-value="${value}">
                <span>${displayText}</span>
                <i class="material-symbols-outlined dropdown-option-remove">close</i>
            </div>
            `;
        }).join('');
        
        optionsHTML += selectedOptionsHTML;
        
        // Add separator if there are other options
        if (items.length > activeFilterValues.length) {
            optionsHTML += '<div class="dropdown-separator"></div>';
        }
        
        // Show ALL other options (not just unselected ones)
        const otherOptionsHTML = items.filter(item => !activeFilterValues.includes(item)).map(item => {
            let displayText = item;
            if (type === 'language' && languageDisplayMap[item]) {
                displayText = languageDisplayMap[item];
            } else if (type === 'tag' && tagDisplayMap[item]) {
                displayText = tagDisplayMap[item];
            }
            
            return `
            <div class="dropdown-option" data-value="${item}">
                <span>${displayText}</span>
                <i class="material-symbols-outlined dropdown-option-check">check</i>
            </div>
            `;
        }).join('');
        
        optionsHTML += otherOptionsHTML;
        
    } else if (!isMultiSelect && activeFilterValues && activeFilterValues !== '') {
        // Single-select behavior (for faculty, course, canale)
        let displayText = activeFilterValues;
        if (type === 'language' && languageDisplayMap[activeFilterValues]) {
            displayText = languageDisplayMap[activeFilterValues];
        } else if (type === 'tag' && tagDisplayMap[activeFilterValues]) {
            displayText = tagDisplayMap[activeFilterValues];
        }
        
        optionsHTML = `
        <div class="dropdown-option selected has-active-filter" data-value="${activeFilterValues}">
            <span>${displayText}</span>
            <i class="material-symbols-outlined dropdown-option-remove">close</i>
        </div>
        `;
        
    } else {
        // Show all options when no selection or for single-select without selection
        optionsHTML = items.map(item => {
            let displayText = item;
            if (type === 'language' && languageDisplayMap[item]) {
                displayText = languageDisplayMap[item];
            } else if (type === 'tag' && tagDisplayMap[item]) {
                displayText = tagDisplayMap[item];
            }
            
            const isSelected = item === currentValue;
            
            let classes = 'dropdown-option';
            if (isSelected) classes += ' selected';
            
            return `
            <div class="${classes}" data-value="${item}">
                <span>${displayText}</span>
                <i class="material-symbols-outlined dropdown-option-check">check</i>
            </div>
            `;
        }).join('');
    }
    
    options.innerHTML = optionsHTML;
    
    // Add click handlers
    options.querySelectorAll('.dropdown-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = option.dataset.value;
            const displayText = option.querySelector('span').textContent;
            
            if (option.classList.contains('has-active-filter')) {
                // Remove this filter value
                removeSpecificFilterValue(type, value);
            } else {
                // Add this filter value
                selectDropdownOption(type, value, displayText);
            }
        });
    });
}

function filterDropdownOptions(type, searchTerm) {
    let items = [];
    
    if (type === 'faculty') {
        items = Object.keys(window.facultyCoursesData || {}).sort();
    } else if (type === 'course') {
        const selectedFaculties = activeFilters.faculty;
        if (selectedFaculties && window.facultyCoursesData) {
            const courses = [];
            if (Array.isArray(selectedFaculties)) {
                // Multiple faculties selected - show courses from all selected faculties
                selectedFaculties.forEach(faculty => {
                    if (window.facultyCoursesData[faculty]) {
                        window.facultyCoursesData[faculty].forEach(course => courses.push(course[1]));
                    }
                });
            } else if (window.facultyCoursesData[selectedFaculties]) {
                // Single faculty selected
                window.facultyCoursesData[selectedFaculties].forEach(course => courses.push(course[1]));
            }
            items = [...new Set(courses)].sort();
        } else if (window.facultyCoursesData) {
            // No faculties selected - show all courses
            const courses = [];
            Object.values(window.facultyCoursesData).forEach(facultyCourses => {
                facultyCourses.forEach(course => courses.push(course[1]));
            });
            items = [...new Set(courses)].sort();
        }
    } else if (type === 'canale') {
        items = ['A', 'B', 'C', 'D', 'E', 'F', 'Canale Unico'];
    } else if (type === 'documentType') {
        // Static document types (popular ones first) plus dynamic ones from files
        const staticTypes = ['PDF', 'DOCX', 'PPTX', 'XLSX'];
        const dynamicTypes = window.allFileTypes || [];
        const allTypes = [...staticTypes];
        dynamicTypes.forEach(type => {
            if (!allTypes.includes(type)) {
                allTypes.push(type);
            }
        });
        items = allTypes;
    } else if (type === 'tag') {
        // Use backend tags
        items = window.allTags || ['appunti', 'dispense', 'esercizi'];
    } else if (type === 'language') {
        items = ['Italian', 'English'];
    } else if (type === 'academicYear') {
        items = ['2024/2025', '2023/2024', '2022/2023', '2021/2022'];
    }
    
    // For static dropdowns, show all items (same as searchable but no filtering)
    if (['documentType', 'language', 'academicYear', 'tag'].includes(type)) {
        populateOptions(type, items);
        return;
    }
    
    const filteredItems = items.filter(item => 
        item.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sort by similarity: items starting with search term first, then by alphabetical order
    const sortedItems = filteredItems.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        const aStartsWith = aLower.startsWith(searchLower);
        const bStartsWith = bLower.startsWith(searchLower);
        
        // If one starts with search term and other doesn't, prioritize the one that starts with it
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        // Special sorting for canale: "Canale Unico" should always be last
        if (type === 'canale') {
            if (a === 'Canale Unico') return 1;
            if (b === 'Canale Unico') return -1;
        }
        
        // If both start with search term or both don't, sort alphabetically
        return a.localeCompare(b);
    });
    
    populateOptions(type, sortedItems);
}

function selectDropdownOption(type, value, displayText = null) {
    const input = document.getElementById(`${type}Filter`);
    const container = document.querySelector(`[data-dropdown="${type}"]`);
    
    // Map dropdown types to filter keys
    const filterKeyMap = {
        'faculty': 'faculty',
        'course': 'course',
        'canale': 'canale',
        'documentType': 'documentType',
        'language': 'language',
        'academicYear': 'academicYear',
        'tag': 'tag'
    };
    
    const filterKey = filterKeyMap[type] || type;
    
    // Determine which filters support multi-selection
    const multiSelectFilters = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear', 'tag'];
    const isMultiSelect = multiSelectFilters.includes(type);
    
    if (isMultiSelect) {
        // Multi-select behavior
        if (!activeFilters[filterKey]) {
            activeFilters[filterKey] = [];
        }
        
        // Add value if not already present
        if (!activeFilters[filterKey].includes(value)) {
            activeFilters[filterKey].push(value);
        }
        
        // Update input display
        const selectedCount = activeFilters[filterKey].length;
        const academicContextFilters = ['faculty', 'course', 'canale'];
        
        if (academicContextFilters.includes(type)) {
            // Keep academic context filters searchable - don't show "N selected"
            if (selectedCount === 1) {
                input.value = displayText || value;
            } else {
                // Clear input to allow searching for more options
                input.value = '';
                input.setAttribute('placeholder', `${selectedCount} selezionati - scrivi per cercarne altri...`);
            }
        } else {
            // For other filters, show count when multiple selected
            if (selectedCount === 1) {
                input.value = displayText || value;
            } else {
                input.value = `${selectedCount} selected`;
            }
        }
        
        // Keep dropdown open for multi-select
        // Don't close the dropdown - let user continue selecting
        
        // Re-populate options to move selected item to top
        setTimeout(() => {
            filterDropdownOptions(type, '');
        }, 10);
        
    } else {
        // Single-select behavior (existing logic)
        input.value = displayText || value;
        container.classList.remove('open');
        
        // Update active filters
        if (value && value.trim()) {
            activeFilters[filterKey] = value.trim();
        } else {
            delete activeFilters[filterKey];
        }
        
        // Update dependent dropdowns
        if (type === 'faculty') {
            // Clear course filter since faculty selection changed
            const courseInput = document.getElementById('courseFilter');
            courseInput.value = '';
            delete activeFilters.course;
            // Update course dropdown options based on new faculty selection(s)
            filterDropdownOptions('course', '');
        }
    }
    
    // Refresh active filter indicators in all dropdowns
    updateActiveFilterIndicators();
    
    applyFiltersAndRender();
    saveFiltersToStorage();
}

function removeSpecificFilterValue(type, value) {
    // Map dropdown types to filter keys
    const filterKeyMap = {
        'faculty': 'faculty',
        'course': 'course',
        'canale': 'canale',
        'documentType': 'documentType',
        'language': 'language',
        'academicYear': 'academicYear',
        'tag': 'tag'
    };
    
    const filterKey = filterKeyMap[type] || type;
    const input = document.getElementById(`${type}Filter`);
    
    // Determine which filters support multi-selection
    const multiSelectFilters = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear', 'tag'];
    const isMultiSelect = multiSelectFilters.includes(type);
    
    if (isMultiSelect && activeFilters[filterKey] && Array.isArray(activeFilters[filterKey])) {
        // Remove specific value from array
        activeFilters[filterKey] = activeFilters[filterKey].filter(v => v !== value);
        
        // Update input display
        const academicContextFilters = ['faculty', 'course', 'canale'];
        
        if (activeFilters[filterKey].length === 0) {
            delete activeFilters[filterKey];
            input.value = '';
            // Reset placeholder to default
            if (academicContextFilters.includes(type)) {
                const defaultPlaceholders = {
                    'faculty': 'Scrivi o scegli una facoltà...',
                    'course': 'Scrivi o scegli un corso...',
                    'canale': 'Scrivi o scegli un canale...'
                };
                input.setAttribute('placeholder', defaultPlaceholders[type] || '');
            }
        } else if (activeFilters[filterKey].length === 1) {
            // Show the single remaining item
            const remainingValue = activeFilters[filterKey][0];
            let displayText = remainingValue;
            
            // Apply display mappings
            const languageDisplayMap = {
                'Italian': 'Italiano',
                'English': 'Inglese'
            };
            const tagDisplayMap = {
                'appunti': 'Appunti',
                'dispense': 'Dispense',
                'esercizi': 'Esercizi'
            };
            
            if (type === 'language' && languageDisplayMap[remainingValue]) {
                displayText = languageDisplayMap[remainingValue];
            } else if (type === 'tag' && tagDisplayMap[remainingValue]) {
                displayText = tagDisplayMap[remainingValue];
            }
            
            input.value = displayText;
            // Reset placeholder to default
            if (academicContextFilters.includes(type)) {
                const defaultPlaceholders = {
                    'faculty': 'Scrivi o scegli una facoltà...',
                    'course': 'Scrivi o scegli un corso...',
                    'canale': 'Scrivi o scegli un canale...'
                };
                input.setAttribute('placeholder', defaultPlaceholders[type] || '');
            }
        } else {
            // Multiple items remaining
            if (academicContextFilters.includes(type)) {
                // Keep academic context filters searchable
                input.value = '';
                input.setAttribute('placeholder', `${activeFilters[filterKey].length} selezionati - scrivi per cercarne altri...`);
            } else {
                // For other filters, show count
                input.value = `${activeFilters[filterKey].length} selected`;
            }
        }
        
        // Re-populate options to update the display
        setTimeout(() => {
            filterDropdownOptions(type, '');
        }, 10);
        
        // Handle dependent dropdowns for multi-select faculty changes
        if (type === 'faculty') {
            // Clear course filter since faculty selection changed
            const courseInput = document.getElementById('courseFilter');
            courseInput.value = '';
            delete activeFilters.course;
            // Update course dropdown options based on remaining faculty selection(s)
            setTimeout(() => {
                filterDropdownOptions('course', '');
            }, 15);
        }
        
    } else {
        // Single-select removal (existing logic)
        delete activeFilters[filterKey];
        input.value = '';
        
        // Handle dependent dropdowns
        if (type === 'faculty') {
            // Clear course filter since faculty selection changed
            const courseInput = document.getElementById('courseFilter');
            courseInput.value = '';
            delete activeFilters.course;
            // Update course dropdown options based on remaining faculty selection(s)
            filterDropdownOptions('course', '');
        }
    }
    
    // Refresh active filter indicators
    updateActiveFilterIndicators();
    
    applyFiltersAndRender();
    saveFiltersToStorage();
}

function updateActiveFilterIndicators() {
    
    // Update indicators for all dropdown types
    const dropdownTypes = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear', 'tag'];
    
    dropdownTypes.forEach(type => {
        const options = document.getElementById(`${type}Options`);
        if (!options) return;
        
        const filterKeyMap = {
            'faculty': 'faculty',
            'course': 'course',
            'canale': 'canale',
            'documentType': 'documentType',
            'language': 'language',
            'academicYear': 'academicYear',
            'tag': 'tag'
        };
        
        const filterKey = filterKeyMap[type] || type;
        const activeFilterValue = activeFilters[filterKey];
        
        
        options.querySelectorAll('.dropdown-option').forEach(option => {
            const hasActiveFilter = activeFilterValue === option.dataset.value;
            option.classList.toggle('has-active-filter', hasActiveFilter);
        });
    });
    
}

function removeFilterFromDropdown(type, filterKey) {
    
    const input = document.getElementById(`${type}Filter`);
    const container = document.querySelector(`[data-dropdown="${type}"]`);
    
    // Clear the input
    input.value = '';
    container.classList.remove('open');
    
    // Remove from active filters
    delete activeFilters[filterKey];
    
    
    // Update visual selection in dropdown
    const options = document.getElementById(`${type}Options`);
    if (options) {
        options.querySelectorAll('.dropdown-option').forEach(option => {
            option.classList.remove('selected');
        });
    }
    
    // Handle dependent dropdowns
    if (type === 'faculty') {
        const courseInput = document.getElementById('courseFilter');
        courseInput.value = '';
        delete activeFilters.course;
        filterDropdownOptions('course', '');
    }
    
    
    // Add a small delay to ensure activeFilters is properly updated
    setTimeout(() => {
        // Force a complete refresh of the dropdown by calling populateOptions directly
        // instead of going through filterDropdownOptions which might have timing issues
        if (['documentType', 'language', 'academicYear', 'tag'].includes(type)) {
            let items = [];
            if (type === 'tag') {
                items = ['appunti', 'dispense', 'esercizi'];
            } else if (type === 'language') {
                items = ['Italian', 'English'];
            } else if (type === 'academicYear') {
                items = ['2024/2025', '2023/2024', '2022/2023', '2021/2022'];
            } else if (type === 'documentType') {
                const staticTypes = ['PDF', 'DOCX', 'PPTX', 'XLSX'];
                const dynamicTypes = window.allFileTypes || [];
                const allTypes = [...staticTypes];
                dynamicTypes.forEach(type => {
                    if (!allTypes.includes(type)) {
                        allTypes.push(type);
                    }
                });
                items = allTypes;
            }
            
            // Call populateOptions directly with the items
            populateOptions(type, items);
        } else {
            // For dynamic dropdowns, refresh with current search term
            const searchTerm = input.value;
            filterDropdownOptions(type, searchTerm);
        }
        
        // Update active filter indicators in all dropdowns
        updateActiveFilterIndicators();
        
        
        applyFiltersAndRender();
        saveFiltersToStorage();
        
    }, 10);
}

function handleDropdownKeyboard(e, type) {
    const options = document.getElementById(`${type}Options`);
    const highlighted = options.querySelector('.dropdown-option.highlighted');
    const allOptions = options.querySelectorAll('.dropdown-option');
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            const nextOption = highlighted ? highlighted.nextElementSibling : allOptions[0];
            if (nextOption) {
                if (highlighted) highlighted.classList.remove('highlighted');
                nextOption.classList.add('highlighted');
                nextOption.scrollIntoView({ block: 'nearest' });
            }
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            const prevOption = highlighted ? highlighted.previousElementSibling : allOptions[allOptions.length - 1];
            if (prevOption) {
                if (highlighted) highlighted.classList.remove('highlighted');
                prevOption.classList.add('highlighted');
                prevOption.scrollIntoView({ block: 'nearest' });
            }
            break;
            
        case 'Enter':
            e.preventDefault();
            if (highlighted) {
                selectDropdownOption(type, highlighted.dataset.value);
            } else if (allOptions.length > 0) {
                selectDropdownOption(type, allOptions[0].dataset.value);
            }
            break;
            
        case 'Escape':
            e.preventDefault();
            closeAllDropdowns();
            break;
    }
}

function initializeRatingFilter() {
    const ratingStars = document.querySelectorAll('.rating-star-filter');
    const ratingText = document.getElementById('ratingText');
    
    if (!ratingStars.length || !ratingText) return;
    
    ratingStars.forEach((star, index) => {
        star.addEventListener('click', () => {
            const rating = index + 1;
            
            // Check if clicking the same rating to deactivate
            if (activeFilters.minRating === rating) {
                // Deactivate
                delete activeFilters.minRating;
                ratingStars.forEach(s => s.classList.remove('active'));
                ratingText.textContent = 'Qualsiasi rating';
            } else {
                // Activate up to clicked rating
                activeFilters.minRating = rating;
                ratingStars.forEach((s, i) => {
                    s.classList.toggle('active', i < rating);
                });
                ratingText.textContent = `${rating}+ stelle`;
            }
            
            // Apply filters immediately
            applyFiltersAndRender();
            saveFiltersToStorage();
        });
        
        star.addEventListener('mouseenter', () => {
            const rating = index + 1;
            ratingStars.forEach((s, i) => {
                s.style.color = i < rating ? '#fbbf24' : '#d1d5db';
            });
        });
        
        star.addEventListener('mouseleave', () => {
            ratingStars.forEach((s, i) => {
                const isActive = s.classList.contains('active');
                s.style.color = isActive ? '#fbbf24' : '#d1d5db';
            });
        });
    });
}

function initializeToggleFilters() {
    // Price toggles
    const priceToggles = document.querySelectorAll('.price-toggle');
    const priceRangeContainer = document.getElementById('priceRangeContainer');

    priceToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            priceToggles.forEach(t => t.classList.remove('active'));
            toggle.classList.add('active');
            
            const priceType = toggle.dataset.price;
            
            if (priceType === 'all') {
                // Show price slider for "All" to allow range filtering across all documents
                activeFilters.priceType = 'all';
                delete activeFilters.minPrice;
                delete activeFilters.maxPrice;
                if (priceRangeContainer) priceRangeContainer.style.display = 'block';
                
                // Reset price sliders to default when switching to "All"
                const minPriceRange = document.getElementById('minPriceRange');
                const maxPriceRange = document.getElementById('maxPriceRange');
                const minPriceValue = document.getElementById('minPriceValue');
                const maxPriceValue = document.getElementById('maxPriceValue');
                
                if (minPriceRange) minPriceRange.value = 0;
                if (maxPriceRange) maxPriceRange.value = 100;
                if (minPriceValue) minPriceValue.textContent = '€0';
                if (maxPriceValue) maxPriceValue.textContent = '€100';
                updatePriceSliderFill();
                
            } else if (priceType === 'free') {
                activeFilters.priceType = 'free';
                delete activeFilters.minPrice;
                delete activeFilters.maxPrice;
                if (priceRangeContainer) priceRangeContainer.style.display = 'none';
            } else if (priceType === 'paid') {
                activeFilters.priceType = 'paid';
                if (priceRangeContainer) priceRangeContainer.style.display = 'block';
                // Initialize price range values when showing the slider
                const minPriceRange = document.getElementById('minPriceRange');
                const maxPriceRange = document.getElementById('maxPriceRange');
                if (minPriceRange && maxPriceRange) {
                    const minVal = parseFloat(minPriceRange.value);
                    const maxVal = parseFloat(maxPriceRange.value);
                    if (minVal !== 0 || maxVal !== 100) {
                        activeFilters.minPrice = minVal;
                        activeFilters.maxPrice = maxVal;
                    }
                }
            }
            
            // Apply filters immediately
            applyFiltersAndRender();
            saveFiltersToStorage();
        });
    });



    // Vetrina toggles
    const vetrinaToggles = document.querySelectorAll('.vetrina-toggle');
    
    vetrinaToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            vetrinaToggles.forEach(t => t.classList.remove('active'));
            toggle.classList.add('active');
            
            const vetrinaType = toggle.dataset.vetrina;
            
            if (vetrinaType === 'all') {
                delete activeFilters.vetrinaType;
            } else {
                activeFilters.vetrinaType = vetrinaType;
            }
            
            // Apply filters immediately
            applyFiltersAndRender();
            saveFiltersToStorage();
        });
    });
}

function initializePriceRangeFilter() {
    const minPriceRange = document.getElementById('minPriceRange');
    const maxPriceRange = document.getElementById('maxPriceRange');
    const minPriceValue = document.getElementById('minPriceValue');
    const maxPriceValue = document.getElementById('maxPriceValue');
    const rangeFill = document.getElementById('rangeFill');
    
    if (minPriceRange && maxPriceRange) {
        // Initialize values but don't add to activeFilters yet
        if (minPriceValue) minPriceValue.textContent = '€0';
        if (maxPriceValue) maxPriceValue.textContent = '€100';
        updatePriceSliderFill();
        
        minPriceRange.addEventListener('input', handlePriceRangeChange);
        maxPriceRange.addEventListener('input', handlePriceRangeChange);
        minPriceRange.addEventListener('change', handlePriceRangeChange);
        maxPriceRange.addEventListener('change', handlePriceRangeChange);
    }
}

// Debounce function to delay filter application for smooth UX
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Create debounced version of applyFiltersAndRender
const debouncedApplyFilters = debounce(applyFiltersAndRender, 200);

function handlePriceRangeChange() {
    const minPriceRange = document.getElementById('minPriceRange');
    const maxPriceRange = document.getElementById('maxPriceRange');
    const minPriceValue = document.getElementById('minPriceValue');
    const maxPriceValue = document.getElementById('maxPriceValue');
    
    let minVal = parseFloat(minPriceRange.value);
    let maxVal = parseFloat(maxPriceRange.value);
    
    // Ensure min doesn't exceed max
    if (minVal > maxVal) {
        minVal = maxVal;
        minPriceRange.value = minVal;
    }
    
    // Ensure max doesn't go below min
    if (maxVal < minVal) {
        maxVal = minVal;
        maxPriceRange.value = maxVal;
    }
    
    // Apply price range filter for both 'paid' and 'all' price types
    if (activeFilters.priceType === 'paid' || activeFilters.priceType === 'all') {
        // Always set the price range when slider is moved, even if values are default
        activeFilters.minPrice = minVal;
        activeFilters.maxPrice = maxVal;
    }
    
    // Update display values
    if (minPriceValue) minPriceValue.textContent = `€${minVal}`;
    if (maxPriceValue) maxPriceValue.textContent = `€${maxVal}`;
    
    // Update the visual fill
        updatePriceSliderFill();
    
    // Update filter count immediately for responsive UI
    updateFilterCount();
    updateBottomFilterCount();
    updateActiveFiltersDisplay();
    
    // Apply filters with debounce to prevent too many renders
    debouncedApplyFilters();
}

function updatePriceSliderFill() {
    const minPriceRange = document.getElementById('minPriceRange');
    const maxPriceRange = document.getElementById('maxPriceRange');
    const rangeFill = document.getElementById('rangeFill');
    
    if (minPriceRange && maxPriceRange && rangeFill) {
        const min = parseFloat(minPriceRange.min);
        const max = parseFloat(minPriceRange.max);
        const minVal = parseFloat(minPriceRange.value);
        const maxVal = parseFloat(maxPriceRange.value);
        
        const minPercent = ((minVal - min) / (max - min)) * 100;
        const maxPercent = ((maxVal - min) / (max - min)) * 100;
        
        rangeFill.style.left = `${minPercent}%`;
        rangeFill.style.width = `${maxPercent - minPercent}%`;
    }
}

// Order functionality
let currentOrder = 'relevance';

// Initialize order button text on page load
document.addEventListener('DOMContentLoaded', function() {
    const orderBtn = document.getElementById('orderBtn');
    const orderText = orderBtn?.querySelector('.order-text');
    if (orderText) {
        orderText.textContent = 'Rilevanza';
    }
});

function initializeOrderDropdown() {
    const orderBtn = document.getElementById('orderBtn');
    const orderDropdown = document.querySelector('.order-dropdown-content');
    const orderOptions = document.querySelectorAll('.order-option');
    
    if (!orderBtn || !orderDropdown) return;
    
    // Toggle dropdown on button click
    orderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        orderDropdown.classList.toggle('show');
        
        // Close other dropdowns
        closeAllDropdowns();
    });
    
    // Handle order option selection
    orderOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const orderType = option.getAttribute('data-order');
            selectOrderOption(orderType);
            orderDropdown.classList.remove('show');
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!orderBtn.contains(e.target) && !orderDropdown.contains(e.target)) {
            orderDropdown.classList.remove('show');
        }
    });
    
    // Close dropdown on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            orderDropdown.classList.remove('show');
        }
    });
}

function selectOrderOption(orderType) {
    currentOrder = orderType;
    
    // Update button text based on selection
    const orderBtn = document.getElementById('orderBtn');
    const orderText = orderBtn.querySelector('.order-text');
    
    const orderLabels = {
        'relevance': 'Rilevanza',
        'reviews': 'Recensioni',
        'price-lowest': 'Prezzo crescente',
        'price-highest': 'Prezzo decrescente',
        'name-asc': 'Nome A-Z',
        'name-desc': 'Nome Z-A',
        'date-newest': 'Più recenti',
        'date-oldest': 'Meno recenti'
    };
    
    if (orderText) {
        orderText.textContent = orderLabels[orderType] || 'Ordina';
    }
    
    // Apply the order to current results
    applyOrderToResults();
}

function applyOrderToResults() {
    if (!originalFiles || originalFiles.length === 0) return;
    
    // Get current filtered results
    const currentResults = applyClientSideFilters(originalFiles);
    
    // Sort the results based on current order
    const sortedResults = sortDocuments(currentResults, currentOrder);
    
    // Re-render the documents with new order
    renderDocuments(sortedResults);
}

function sortDocuments(documents, orderType) {
    const sorted = [...documents];
    
    switch (orderType) {
        case 'relevance':
            // Keep original order (relevance from search)
            return sorted;
            
        case 'reviews':
            return sorted.sort((a, b) => {
                const ratingA = parseFloat(a.rating || 0);
                const ratingB = parseFloat(b.rating || 0);
                return ratingB - ratingA; // Higher ratings first
            });
            
        case 'name-asc':
            return sorted.sort((a, b) => {
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });
            
        case 'name-desc':
            return sorted.sort((a, b) => {
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                return titleB.localeCompare(titleA);
            });
            
        case 'date-newest':
            return sorted.sort((a, b) => {
                const dateA = new Date(a.upload_date || 0);
                const dateB = new Date(b.upload_date || 0);
                return dateB - dateA;
            });
            
        case 'date-oldest':
            return sorted.sort((a, b) => {
                const dateA = new Date(a.upload_date || 0);
                const dateB = new Date(b.upload_date || 0);
                return dateA - dateB;
            });
            
        case 'price-lowest':
            return sorted.sort((a, b) => {
                const priceA = parseFloat(a.price || 0);
                const priceB = parseFloat(b.price || 0);
                return priceA - priceB;
            });
            
        case 'price-highest':
            return sorted.sort((a, b) => {
                const priceA = parseFloat(a.price || 0);
                const priceB = parseFloat(b.price || 0);
                return priceB - priceA;
            });
            
        default:
            return sorted;
    }
}

async function applyFiltersAndRender() {
    // Check if we have data loaded
    if (!originalFiles || originalFiles.length === 0) {
        await loadAllFiles();
        return;
    }
    
    // Check if we have backend-searchable filters (course_name, faculty_name) 
    // or if there's an active search query
    const searchInput = document.getElementById('searchInput');
    const currentQuery = searchInput?.value?.trim() || '';
    
    const hasBackendFilters = activeFilters.course || activeFilters.faculty || activeFilters.canale || activeFilters.language || activeFilters.tag || activeFilters.documentType || activeFilters.academicYear || activeFilters.courseYear;
    
    if (hasBackendFilters || currentQuery) {
        // Use backend search with filters
        await performSearch(currentQuery);
    } else if (Object.keys(activeFilters).length === 0) {
        // No filters active, show all original files
        renderDocuments(originalFiles);
        currentFiles = originalFiles;
        updateActiveFiltersDisplay();
        updateFilterCount();
        updateBottomFilterCount();
        showStatus(`${originalFiles.length} documenti disponibili 📚`);
    } else {
        // Show loading cards for client-side filtering
        showLoadingCards(4);
        
        // Apply only client-side filters to original data
        const filteredFiles = applyFiltersToFiles(originalFiles);
        currentFiles = filteredFiles;
        renderDocuments(filteredFiles);
        updateActiveFiltersDisplay();
        updateFilterCount();
        updateBottomFilterCount();
        
        // Show filter status
        const filterCount = Object.keys(activeFilters).length;
        if (filterCount > 0) {
            if (filteredFiles.length > 0) {
                showStatus(`${filteredFiles.length} documenti trovati con ${filterCount} filtri attivi 🎯`);
            } else {
                showStatus(`Nessun documento trovato con i filtri applicati 🔍`);
            }
        }
    }
}

function toggleFiltersPanel() {
    isFiltersOpen = !isFiltersOpen;
    const filtersPanel = document.getElementById('filtersPanel');
    const filtersOverlay = document.getElementById('filtersOverlay');
    const mainContent = document.querySelector('.main-content');
    const documentsGrid = document.getElementById('documentsGrid');
    
    if (isFiltersOpen) {
        // Ensure robust positioning before showing
        if (filtersPanel) {
            filtersPanel.style.position = 'fixed';
            filtersPanel.style.top = '0';
            filtersPanel.style.right = '0';
            filtersPanel.style.bottom = '0';
            filtersPanel.style.height = '100vh';
            filtersPanel.style.zIndex = '9999';
            filtersPanel.style.width = window.innerWidth <= 900 ? '90%' : '380px';
            filtersPanel.style.maxWidth = window.innerWidth <= 900 ? '350px' : '380px';
            filtersPanel.style.margin = '0';
            filtersPanel.style.padding = '0';
            filtersPanel.classList.add('active');
        }
        if (filtersOverlay) filtersOverlay.classList.add('active');
        if (mainContent) mainContent.classList.add('filters-open');
        if (documentsGrid) documentsGrid.classList.add('filters-open');
        document.body.classList.add('filters-open');
        document.body.style.overflow = 'hidden';
        
        // Populate filter options when opening
        populateFilterOptions();
        
        // Add bottom clear all button if it doesn't exist
        addBottomClearAllButton();
        
        showStatus('Panel filtri aperto 🎯');
    } else {
        closeFiltersPanel();
    }
}

function addBottomClearAllButton() {
    const filtersContent = document.querySelector('.filters-content');
    if (!filtersContent) return;
    
    // Check if bottom clear button already exists
    if (document.getElementById('bottomClearAllButton')) return;
    
    // Create bottom clear all button section
    const bottomClearSection = document.createElement('div');
    bottomClearSection.className = 'filters-bottom-actions';
    bottomClearSection.innerHTML = `
        <div class="bottom-clear-container">
            <button class="bottom-clear-all-btn" id="bottomClearAllButton" data-action="clear-all-filters">
                <i class="material-symbols-outlined">clear_all</i>
                <span>Rimuovi tutti i filtri</span>
            </button>
            <div class="bottom-clear-info">
                <span id="bottomFilterCount">0 filtri attivi</span>
            </div>
        </div>
    `;
    
    // Add to the end of filters content
    filtersContent.appendChild(bottomClearSection);
    
    // Update the bottom filter count
    updateBottomFilterCount();
}

function updateBottomFilterCount() {
    const bottomFilterCountElement = document.getElementById('bottomFilterCount');
    if (!bottomFilterCountElement) return;
    
    // Count active filters properly
    let activeCount = 0;
    
    Object.entries(activeFilters).forEach(([key, value]) => {
        if (key === 'minPrice' || key === 'maxPrice') {
            // Price range counts as one filter - only count once
            if (key === 'minPrice' && activeFilters.priceType === 'paid' && 
                (activeFilters.minPrice !== 0 || activeFilters.maxPrice !== 100)) {
                activeCount++;
            }
        } else if (value !== null && value !== undefined && value !== 'all' && value !== '') {
            activeCount++;
        }
    });
    
    bottomFilterCountElement.textContent = activeCount === 0 ? 'Nessun filtro attivo' : 
        activeCount === 1 ? '1 filtro attivo' : `${activeCount} filtri attivi`;
}

function closeFiltersPanel() {
    isFiltersOpen = false;
    const filtersPanel = document.getElementById('filtersPanel');
    const filtersOverlay = document.getElementById('filtersOverlay');
    const mainContent = document.querySelector('.main-content');
    const documentsGrid = document.getElementById('documentsGrid');
    
    if (filtersPanel) filtersPanel.classList.remove('active');
    if (filtersOverlay) filtersOverlay.classList.remove('active');
    if (mainContent) mainContent.classList.remove('filters-open');
    if (documentsGrid) documentsGrid.classList.remove('filters-open');
    document.body.classList.remove('filters-open');
    document.body.style.overflow = '';
}

async function populateFilterOptions() {
    // Use cached hierarchy data instead of making API calls
    if (!window.facultyCoursesData) {
        await loadHierarchyData();
    }
    
    // If hierarchy data is still not available, fallback to extract from files
    if (!window.facultyCoursesData || Object.keys(window.facultyCoursesData).length === 0) {
        if (originalFiles.length) {
            const faculties = [...new Set(originalFiles.map(f => 
                f.faculty_name || f.vetrina_info?.faculty_name
            ).filter(Boolean))];
            
            const courses = [...new Set(originalFiles.map(f => 
                f.course_name || f.vetrina_info?.course_name
            ).filter(Boolean))];
            
            // Create a simple fallback hierarchy
            window.facultyCoursesData = {};
            faculties.forEach(faculty => {
                window.facultyCoursesData[faculty] = courses.map(course => ['', course]);
            });
        }
    }

    // Only populate document types from actual files (as these depend on what's uploaded)
    if (originalFiles.length) {
        const documentTypes = [...new Set(originalFiles.map(f => 
            f.document_type
        ).filter(Boolean))];
        
        const popularTypes = ['PDF', 'DOCX', 'PPTX', 'XLSX'];
        const sortedDocumentTypes = [
            ...popularTypes.filter(type => documentTypes.includes(type)),
            ...documentTypes.filter(type => !popularTypes.includes(type)).sort()
        ];

        // Update document type dropdown options
        populateDropdownFilter('documentType', sortedDocumentTypes);
        
        // Populate tag options from actual file tags
        const allTags = [];
        originalFiles.forEach(file => {
            if (file.tags && Array.isArray(file.tags)) {
                allTags.push(...file.tags);
            }
        });
        
        const uniqueTags = [...new Set(allTags)].sort();
        
        // Update tag dropdown options
        populateDropdownFilter('tag', uniqueTags);
    }
}



function populateDropdownFilter(type, options) {
    const optionsContainer = document.getElementById(`${type}Options`);
    if (!optionsContainer) return;

    // Save current selection and input value
    const input = document.getElementById(`${type}Filter`);
    const currentValue = activeFilters[type] || '';
    const currentInputValue = input ? input.value : '';

    // Clear existing options except the first one (default "All" option)
    const firstOption = optionsContainer.firstElementChild;
    optionsContainer.innerHTML = '';
    if (firstOption) optionsContainer.appendChild(firstOption);

    // Add new options
    options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'dropdown-option';
        optionDiv.dataset.value = option;
        optionDiv.innerHTML = `
            <span>${option}</span>
            <span class="dropdown-option-check">✓</span>
        `;
        optionDiv.addEventListener('click', () => {
            selectDropdownOption(type, option, option);
        });
        optionsContainer.appendChild(optionDiv);
    });
    
    // Update visual selection based on active filters
    optionsContainer.querySelectorAll('.dropdown-option').forEach(option => {
        const isSelected = Array.isArray(currentValue) 
            ? currentValue.includes(option.dataset.value)
            : option.dataset.value === currentValue;
        option.classList.toggle('selected', isSelected);
    });
    
    // Restore input value if it was set
    if (input && currentInputValue && currentInputValue !== '') {
        input.value = currentInputValue;
    }
}

function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Save current selection
    const currentValue = select.value;

    // Clear existing options except the first one
    const firstOption = select.firstElementChild;
    select.innerHTML = '';
    if (firstOption) select.appendChild(firstOption);

    // Add new options sorted alphabetically
    options.sort().forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
    
    // Restore selection if it still exists
    if (currentValue && options.includes(currentValue)) {
        select.value = currentValue;
    }
}

function updateFilterCount() {
    const filterCount = document.getElementById('filterCount');
    const filtersBtn = document.getElementById('filtersBtn');
    
    // Count active filters properly
    let activeCount = 0;
    
    Object.entries(activeFilters).forEach(([key, value]) => {
        if (key === 'minPrice' || key === 'maxPrice') {
            // Price range counts as one filter - only count once
            if (key === 'minPrice' && activeFilters.priceType === 'paid' && 
                (activeFilters.minPrice !== 0 || activeFilters.maxPrice !== 100)) {
                activeCount++;
            }
        } else if (value !== null && value !== undefined && value !== 'all' && value !== '') {
            activeCount++;
        }
    });
    
    if (filterCount) {
        filterCount.textContent = activeCount;
        filterCount.classList.toggle('active', activeCount > 0);
    }
    
    // Make button responsive based on filter count
    if (filtersBtn) {
        filtersBtn.classList.toggle('has-filters', activeCount > 0);
    }
}

function clearAllFiltersAction() {
    activeFilters = {};
    
    // Clear filters from localStorage
    try {
        localStorage.removeItem('searchFilters');
    } catch (e) {
        console.warn('Could not clear filters from localStorage:', e);
    }
    
    // Use the comprehensive updateFilterInputs function to ensure complete UI reset
    updateFilterInputs();
    
    // Update all filter indicators and displays
    updateActiveFilterIndicators();
    updateFilterCount();
    updateActiveFiltersDisplay();
    
    // Apply changes immediately
    applyFiltersAndRender();
    
    showStatus('Tutti i filtri sono stati rimossi 🧹');
}

function applyFiltersToFiles(files) {
    // If no filters are active, return all files
    if (!activeFilters || Object.keys(activeFilters).length === 0) {
        return files;
    }
    
    return files.filter(file => {
        // Faculty filter - case insensitive partial match (supports multiple)
        if (activeFilters.faculty) {
            const fileFaculty = file.faculty_name || file.vetrina_info?.faculty_name || '';
            if (Array.isArray(activeFilters.faculty)) {
                const hasMatchingFaculty = activeFilters.faculty.some(selectedFaculty => 
                    fileFaculty.toLowerCase().includes(selectedFaculty.toLowerCase())
                );
                if (!hasMatchingFaculty) {
                    return false;
                }
            } else {
                if (!fileFaculty.toLowerCase().includes(activeFilters.faculty.toLowerCase())) {
                    return false;
                }
            }
        }
        
        // Course filter - case insensitive partial match (supports multiple)
        if (activeFilters.course) {
            const fileCourse = file.course_name || file.vetrina_info?.course_name || '';
            if (Array.isArray(activeFilters.course)) {
                const hasMatchingCourse = activeFilters.course.some(selectedCourse => 
                    fileCourse.toLowerCase().includes(selectedCourse.toLowerCase())
                );
                if (!hasMatchingCourse) {
                    return false;
                }
            } else {
                if (!fileCourse.toLowerCase().includes(activeFilters.course.toLowerCase())) {
                    return false;
                }
            }
        }
        
        
        
        // Document type filter - exact match (supports multiple)
        if (activeFilters.documentType) {
            const fileType = file.document_type || '';
            if (Array.isArray(activeFilters.documentType)) {
                if (!activeFilters.documentType.includes(fileType)) {
                    return false;
                }
            } else {
                if (fileType !== activeFilters.documentType) {
                    return false;
                }
            }
        }
        
        // Language filter - exact match (supports multiple)
        if (activeFilters.language) {
            const fileLanguage = file.language || '';
            if (Array.isArray(activeFilters.language)) {
                if (!activeFilters.language.includes(fileLanguage)) {
                    return false;
                }
            } else {
                if (fileLanguage !== activeFilters.language) {
                    return false;
                }
            }
        }
        
        // Canale filter - exact match (supports multiple)
        if (activeFilters.canale) {
            const fileCanale = file.canale || file.vetrina_info?.canale || '';
            if (Array.isArray(activeFilters.canale)) {
                if (!activeFilters.canale.includes(fileCanale)) {
                    return false;
                }
            } else {
                if (fileCanale !== activeFilters.canale) {
                    return false;
                }
            }
        }
        
        // Academic year filter - exact match (supports multiple)
        if (activeFilters.academicYear) {
            const fileYear = file.academic_year || '';
            if (Array.isArray(activeFilters.academicYear)) {
                if (!activeFilters.academicYear.includes(fileYear)) {
                    return false;
                }
            } else {
                if (fileYear !== activeFilters.academicYear) {
                    return false;
                }
            }
        }
        
        // Tag filter - supports multiple tags
        if (activeFilters.tag) {
            const fileTags = file.tags || [];
            if (Array.isArray(activeFilters.tag)) {
                // File must have at least one of the selected tags
                const hasMatchingTag = activeFilters.tag.some(selectedTag => 
                    fileTags.includes(selectedTag)
                );
                if (!hasMatchingTag) {
                    return false;
                }
            } else {
                // Single tag filter (backward compatibility)
                if (!fileTags.includes(activeFilters.tag)) {
                    return false;
                }
            }
        }
        
        // Rating filter - minimum rating
        if (activeFilters.minRating) {
            const fileRating = parseFloat(file.rating) || 0;
            if (fileRating < activeFilters.minRating) {
                return false;
            }
        }
        
        // Price type filter
        if (activeFilters.priceType) {
            const filePrice = parseFloat(file.price) || 0;
            
            if (activeFilters.priceType === 'free' && filePrice > 0) {
                return false;
            }
            if (activeFilters.priceType === 'paid' && filePrice === 0) {
                return false;
            }
            // For 'all', we don't filter by price type, but we may filter by range below
        }
        
        // Price range filter - works for both 'paid' and 'all' price types
        if (activeFilters.minPrice !== undefined || activeFilters.maxPrice !== undefined) {
            const filePrice = parseFloat(file.price) || 0;
            
            // Apply minimum price filter
            if (activeFilters.minPrice !== undefined && filePrice < activeFilters.minPrice) {
                return false;
            }
            
            // Apply maximum price filter
            if (activeFilters.maxPrice !== undefined && filePrice > activeFilters.maxPrice) {
                return false;
            }
        }
        

        
        // Vetrina type filter - single vs multiple files
        if (activeFilters.vetrinaType && activeFilters.vetrinaType !== 'all') {
            const fileCount = file.fileCount || 1;
            
            switch (activeFilters.vetrinaType) {
                case 'single':
                    if (fileCount > 1) return false;
                    break;
                case 'multiple':
                    if (fileCount <= 1) return false;
                    break;
            }
        }
        
        return true;
    });
}

function updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('activeFiltersDisplay');
    if (!activeFiltersContainer) return;
    
    const filterEntries = Object.entries(activeFilters).filter(([key, value]) => {
        return value !== null && value !== undefined && value !== '' && value !== 'all';
    });
    
    if (filterEntries.length === 0) {
        activeFiltersContainer.classList.remove('visible');
        setTimeout(() => {
            activeFiltersContainer.innerHTML = '';
        }, 400);
        return;
    }
    
    const filterPills = [];
    
    filterEntries.forEach(([key, value]) => {
        let label = '';
        let displayValue = '';
        
        // Handle arrays for multi-select filters
        if (Array.isArray(value)) {
            value.forEach(item => {
                let itemLabel = '';
                let itemValue = '';
                
                switch (key) {
                    case 'faculty':
                        itemLabel = 'Facoltà';
                        itemValue = item;
                        break;
                    case 'course':
                        itemLabel = 'Corso';
                        itemValue = item;
                        break;
                            case 'canale':
            itemLabel = 'Canale';
            value = formatCanaleDisplay(value);
                        itemValue = item;
                        break;
                    case 'documentType':
                        itemLabel = 'Tipo';
                        itemValue = item;
                        break;
                    case 'language':
                        itemLabel = 'Lingua';
                        itemValue = item === 'Italian' ? 'Italiano' : item === 'English' ? 'Inglese' : item;
                        break;
                    case 'academicYear':
                        itemLabel = 'Anno';
                        itemValue = item;
                        break;
                    case 'tag':
                        itemLabel = 'Tag';
                        itemValue = getTagDisplayName(item);
                        break;
                }
                
                if (itemLabel && itemValue) {
                    filterPills.push(`
                        <div class="filter-pill" data-filter="${key}" data-value="${item}">
                            <span class="filter-pill-label">${itemLabel}:</span>
                            <span class="filter-pill-value">${itemValue}</span>
                            <span class="filter-pill-remove" data-action="remove-filter" data-filter-key="${key}" data-specific-value="${item}"></span>
                        </div>
                    `);
                }
            });
            return; // Skip the single-value processing below
        }
        
        // Handle single values (existing logic)
        switch (key) {
            case 'faculty':
                label = 'Facoltà';
                displayValue = value;
                break;
            case 'course':
                label = 'Corso';
                displayValue = value;
                break;

            case 'documentType':
                label = 'Tipo';
                displayValue = value;
                break;
            case 'language':
                label = 'Lingua';
                displayValue = value === 'Italian' ? 'Italiano' : value === 'English' ? 'Inglese' : value;
                break;
                    case 'canale':
            label = 'Canale';
            value = formatCanaleDisplay(value);
                displayValue = value;
                break;
            case 'academicYear':
                label = 'Anno';
                displayValue = value;
                break;
            case 'minRating':
                label = 'Rating';
                displayValue = `${value}+ ⭐`;
                break;
            case 'priceType':
                if (value === 'free') {
                    label = 'Prezzo';
                    displayValue = 'Gratis';
                } else if (value === 'paid') {
                    label = 'Prezzo';
                    displayValue = 'A pagamento';
                }
                break;

            case 'vetrinaType':
                const vetrinaLabels = {
                    'single': 'Singolo File',
                    'multiple': 'Pacchetti'
                };
                label = 'Tipo Vetrina';
                displayValue = vetrinaLabels[value];
                break;
            case 'tag':
                label = 'Tag';
                displayValue = getTagDisplayName(value);
                break;
        }
        
        if (label && displayValue) {
            filterPills.push(`
                <div class="filter-pill" data-filter-key="${key}" data-action="remove-filter">
                    <span class="filter-pill-label">${label}:</span>
                    <span class="filter-pill-value">${displayValue}</span>
                    <div class="filter-pill-remove"></div>
                </div>
            `);
        }
    });
    
    // Add price range pill if min/max are set and not default values
    if ((activeFilters.minPrice !== undefined || activeFilters.maxPrice !== undefined) &&
        (activeFilters.minPrice !== 0 || activeFilters.maxPrice !== 100)) {
        const minPrice = activeFilters.minPrice !== undefined ? activeFilters.minPrice : 0;
        const maxPrice = activeFilters.maxPrice !== undefined ? activeFilters.maxPrice : 100;
        filterPills.push(`
            <div class="filter-pill" data-filter-key="priceRange" data-action="remove-filter">
                <span class="filter-pill-label">Prezzo:</span>
                <span class="filter-pill-value">€${minPrice}-€${maxPrice}</span>
                <div class="filter-pill-remove"></div>
            </div>
        `);
    }
    
    // Add clear all button if there are filters
    if (filterPills.length > 0) {
        filterPills.push(`
            <button class="clear-all-filters-btn" data-action="clear-all-filters">
                <span class="material-symbols-outlined">clear_all</span>
                <span class="clear-all-filters-btn-text">Rimuovi tutti</span>
            </button>
        `);
    }
    
    activeFiltersContainer.innerHTML = filterPills.join('');
    
    // Trigger animation
    setTimeout(() => {
        activeFiltersContainer.classList.add('visible');
    }, 50);
}

// New function to handle individual filter removal with animation
function removeActiveFilter(filterKey, event, specificValue = null) {
    event?.stopPropagation();
    
    const pill = event?.target.closest('.filter-pill');
    if (pill) {
        pill.style.animation = 'filterPillRemove 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        setTimeout(() => {
            if (specificValue) {
                removeSpecificFilterValueFromPill(filterKey, specificValue);
            } else {
                removeFilter(filterKey);
            }
            applyFiltersAndRender();
        }, 250);
    } else {
        if (specificValue) {
            removeSpecificFilterValueFromPill(filterKey, specificValue);
        } else {
            removeFilter(filterKey);
        }
        applyFiltersAndRender();
    }
}

function removeSpecificFilterValueFromPill(filterKey, specificValue) {
    if (activeFilters[filterKey] && Array.isArray(activeFilters[filterKey])) {
        activeFilters[filterKey] = activeFilters[filterKey].filter(v => v !== specificValue);
        
        if (activeFilters[filterKey].length === 0) {
            delete activeFilters[filterKey];
        }
        
        // Update the input display
        const input = document.getElementById(`${filterKey}Filter`);
        if (input) {
            if (!activeFilters[filterKey] || activeFilters[filterKey].length === 0) {
                input.value = '';
            } else if (activeFilters[filterKey].length === 1) {
                // Apply display mappings for single remaining item
                const remainingValue = activeFilters[filterKey][0];
                let displayText = remainingValue;
                
                const languageDisplayMap = {
                    'Italian': 'Italiano',
                    'English': 'Inglese'
                };
                if (filterKey === 'language' && languageDisplayMap[remainingValue]) {
                    displayText = languageDisplayMap[remainingValue];
                } else if (filterKey === 'tag') {
                    displayText = getTagDisplayName(remainingValue);
                }
                
                input.value = displayText;
            } else {
                input.value = `${activeFilters[filterKey].length} selected`;
            }
        }
        
        saveFiltersToStorage();
        showStatus('Filtro rimosso 🗑️');
    }
}

// New function to handle clear all filters with animation
function clearAllActiveFilters(event) {
    event?.stopPropagation();
    
    const activeFiltersContainer = document.getElementById('activeFiltersDisplay');
    if (activeFiltersContainer) {
        // Animate all pills out
        const pills = activeFiltersContainer.querySelectorAll('.filter-pill, .clear-all-filters-btn');
        pills.forEach((pill, index) => {
            setTimeout(() => {
                pill.style.animation = 'filterPillRemove 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
            }, index * 50);
        });
        
        setTimeout(() => {
            clearAllFiltersAction();
        }, pills.length * 50 + 200);
    } else {
        clearAllFiltersAction();
    }
}

function removeFilter(filterKey) {
    if (filterKey === 'priceRange') {
        // Reset price range but keep priceType
        delete activeFilters.minPrice;
        delete activeFilters.maxPrice;
        
        const minPriceRange = document.getElementById('minPriceRange');
        const maxPriceRange = document.getElementById('maxPriceRange');
        const minPriceValue = document.getElementById('minPriceValue');
        const maxPriceValue = document.getElementById('maxPriceValue');
        
        if (minPriceRange) minPriceRange.value = 0;
        if (maxPriceRange) maxPriceRange.value = 100;
        if (minPriceValue) minPriceValue.textContent = '€0';
        if (maxPriceValue) maxPriceValue.textContent = '€100';
        updatePriceSliderFill();
        
    } else {
        delete activeFilters[filterKey];
        
        // Update UI elements
        const filterMap = {
            'faculty': 'facultyFilter',
            'course': 'courseFilter',
            'professor': 'professorFilter',
            'documentType': 'documentTypeFilter',
            'language': 'languageFilter',
            'canale': 'canaleFilter',
            'academicYear': 'academicYearFilter'
        };
        
        const selectId = filterMap[filterKey];
        if (selectId) {
            const select = document.getElementById(selectId);
            if (select) select.selectedIndex = 0;
        }
        
        // Handle special cases
        if (filterKey === 'minRating') {
            document.querySelectorAll('.rating-star-filter').forEach(star => {
                star.classList.remove('active');
                star.style.color = '#d1d5db';
            });
            const ratingText = document.getElementById('ratingText');
            if (ratingText) ratingText.textContent = 'Qualsiasi rating';
        }
        
        if (filterKey === 'priceType') {
            // Reset all price-related filters
            delete activeFilters.minPrice;
            delete activeFilters.maxPrice;
            
            document.querySelectorAll('.price-toggle').forEach(toggle => {
                toggle.classList.remove('active');
            });
            const allPriceToggle = document.querySelector('.price-toggle[data-price="all"]');
            if (allPriceToggle) allPriceToggle.classList.add('active');
            
            const priceRangeContainer = document.getElementById('priceRangeContainer');
            if (priceRangeContainer) priceRangeContainer.style.display = 'none';
            
            // Reset price range sliders
            const minPriceRange = document.getElementById('minPriceRange');
            const maxPriceRange = document.getElementById('maxPriceRange');
            const minPriceValue = document.getElementById('minPriceValue');
            const maxPriceValue = document.getElementById('maxPriceValue');
            
            if (minPriceRange) minPriceRange.value = 0;
            if (maxPriceRange) maxPriceRange.value = 100;
            if (minPriceValue) minPriceValue.textContent = '€0';
            if (maxPriceValue) maxPriceValue.textContent = '€100';
            updatePriceSliderFill();
        }
        

        
        if (filterKey === 'vetrinaType') {
            document.querySelectorAll('.vetrina-toggle').forEach(toggle => {
                toggle.classList.remove('active');
            });
            const allVetrinaToggle = document.querySelector('.vetrina-toggle[data-vetrina="all"]');
            if (allVetrinaToggle) allVetrinaToggle.classList.add('active');
        }
    }
    
    // Apply changes immediately
    applyFiltersAndRender();
    saveFiltersToStorage();
    showStatus('Filtro rimosso 🗑️');
}

// ===========================
// CORE FUNCTIONALITY
// ===========================

// Generate consistent color variant based on username
function getAvatarVariant(username) {
    if (!username) return 'variant-1';
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `variant-${Math.abs(hash % 8) + 1}`;
}

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
        // For single word usernames, show first letter
        return names[0].charAt(0).toUpperCase();
    }
    return 'U';
}

async function makeRequest(url, options = {}) {
    try {
        // Only add Content-Type for requests with body to avoid preflight
        const headers = {};
        
        // Only add Authorization if we have a token
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        // Only add Content-Type for POST/PUT/PATCH requests with body
        if (options.body && ['POST', 'PUT', 'PATCH'].includes(options.method?.toUpperCase())) {
            headers['Content-Type'] = 'application/json';
        }
        
        // Merge with any additional headers from options
        Object.assign(headers, options.headers || {});
        
        const response = await fetch(API_BASE + url, {
            ...options,
            headers
        });

        if (!response.ok) {
            // Handle authentication errors
            if (response.status === 401 || response.status === 422) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
                return;
            }
            const data = await response.json();
            throw new Error(data.msg || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}

// Simple GET request function that avoids preflight
async function makeSimpleRequest(url) {
    try {
        const response = await fetch(API_BASE + url);
        
        if (!response.ok) {
            // Enhanced error handling for different status codes
            if (response.status === 500) {
                throw new Error(`HTTP 500: INTERNAL SERVER ERROR - Server is experiencing issues`);
            } else if (response.status === 404) {
                throw new Error(`HTTP 404: NOT FOUND - Resource not available`);
            } else if (response.status === 503) {
                throw new Error(`HTTP 503: SERVICE UNAVAILABLE - Server is temporarily down`);
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }
        
        return await response.json();
    } catch (error) {
        console.error('Simple request failed:', error);
        
        // Add additional context for network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
        }
        
        throw error;
    }
}

// Special request function for authenticated endpoints that handles CORS properly
async function makeAuthenticatedRequest(url) {
    try {
        // For authenticated requests, we need to handle the preflight properly
        const response = await fetch(API_BASE + url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            // Handle authentication errors
            if (response.status === 401 || response.status === 422) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Authenticated request failed:', error);
        // If it's a CORS error, try to provide a better error message
        if (error.message.includes('Failed to fetch') || error.message.includes('Load failed')) {
            throw new Error('CORS error: The server does not allow cross-origin requests for this endpoint. Please contact the administrator.');
        }
        throw error;
    }
}

// Function to create and display loading cards
function showLoadingCards(count = 8) {
    const grid = document.getElementById('documentsGrid');
    if (!grid) {
        console.error('❌ Grid element not found!');
        return;
    }
    
    // Check if there are already loading cards from HTML - if so, just return
    const existingLoadingCards = grid.querySelectorAll('.loading-card');
    if (existingLoadingCards.length > 0) {
        return;
    }
    
    grid.innerHTML = '';
    
    // Add loading class to grid
    grid.classList.add('loading');
    
    // Don't add placeholder elements - they interfere with grid positioning
    
    // Add loading cards directly to the grid (no separate container)
    for (let i = 0; i < count; i++) {
        const loadingCard = document.createElement('div');
        loadingCard.className = 'document-card loading-card';
        loadingCard.style.animationDelay = `${i * 0.1}s`;
        
        loadingCard.innerHTML = `
            <div class="document-preview loading-preview">
                <div class="skeleton-preview-circle"></div>
                <div class="skeleton-rating-badge"></div>
                <div class="skeleton-preview-bar"></div>
            </div>
            <div class="skeleton-favorite-button"></div>
            <div class="document-content">
                <div class="document-header">
                    <div class="document-title-section">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-author"></div>
                    </div>
                </div>
                <div class="document-info">
                    <div class="skeleton-line info-item"></div>
                    <div class="skeleton-line info-item"></div>
                    <div class="skeleton-line info-item"></div>
                    <div class="skeleton-line info-item"></div>
                </div>
                <div class="document-footer">
                    <div class="skeleton-footer-left">
                        <div class="skeleton-avatar"></div>
                        <div class="skeleton-meta"></div>
                    </div>
                    <div class="skeleton-price"></div>
                </div>
            </div>
        `;
        
        grid.appendChild(loadingCard);
    }
    
}



async function loadAllFiles() {
    try {
        // Loading cards are already shown from HTML
        showStatus('Caricamento vetrine... 📚');
        
        // Get vendor username from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const vendorUsername = urlParams.get('user') || urlParams.get('username');
        
        if (!vendorUsername) {
            throw new Error('No vendor username provided in URL');
        }
        
        // Extract vendor information from vetrine data
        let vendorData = {
            username: vendorUsername,
            faculty: '',
            canale: '',
            averageRating: 0,
            reviewsCount: 0
        };
        
        // Get vetrine metadata to extract vendor information with enhanced error handling
        let vetrineResponse;
        try {
            vetrineResponse = await makeSimpleRequest('/vetrine');
        } catch (error) {
            console.warn('⚠️ Primary vetrine request failed, trying performance cache...', error);
            
            // Try to get data from performance cache as fallback
            if (window.cacheManager) {
                try {
                    vetrineResponse = await window.cacheManager.loadVetrine(true);
                    console.log('✅ Retrieved vetrine data from cache fallback');
                } catch (cacheError) {
                    console.error('❌ Cache fallback also failed:', cacheError);
                    throw new Error('Unable to load vendor data. Please try again later.');
                }
            } else {
                throw new Error('Unable to load vendor data. Please try again later.');
            }
        }
        
        if (vetrineResponse && vetrineResponse.vetrine) {
            const allVetrine = vetrineResponse.vetrine || [];
            
            // Filter vetrine by the specific vendor
            const vendorVetrine = allVetrine.filter(vetrina => {
                const username = vetrina.author?.username || vetrina.owner?.username;
                return username === vendorUsername;
            });
            
            if (vendorVetrine.length > 0) {
                // Extract vendor information from the first vetrina
                const firstVetrina = vendorVetrine[0];
                const author = firstVetrina.author || firstVetrina.owner;
                
                vendorData = {
                    username: vendorUsername,
                    faculty: firstVetrina.course_instance?.faculty_name || '',
                    canale: firstVetrina.course_instance?.canale || '',
                    averageRating: firstVetrina.average_rating || 0,
                    reviewsCount: firstVetrina.reviews_count || 0
                };
                
                // Store vendor vetrine for later use
                currentVetrine = vendorVetrine;
            }
        }
        
        // Check if we have fallback data
        if (vetrineResponse && vetrineResponse.fallback) {
            console.warn('⚠️ Using fallback data due to server issues');
            showStatus('⚠️ Dati temporanei - server in manutenzione', 'warning');
        }
        
        // Update vendor banner with extracted data
        updateVendorBanner(vendorData);
        
        // Add click handler for vendor rating button
        const vendorRatingBtn = document.getElementById('vendorRatingBtn');
        if (vendorRatingBtn) {
            vendorRatingBtn.addEventListener('click', () => {
                // Show reviews for the vendor's vetrina
                if (currentVetrine && currentVetrine.length > 0) {
                    const firstVetrinaId = currentVetrine[0].id || currentVetrine[0].vetrina_id;
                    openReviewsOverlay(firstVetrinaId);
                }
            });
        }
        
        // Use the vetrine data we already fetched above
        if (!currentVetrine || currentVetrine.length === 0) {
            // Show a more user-friendly message for empty vendor
            showStatus('Nessuna vetrina trovata per questo venditore', 'info');
            renderDocuments([]);
            updateVendorStats(0);
            return;
        }
        
        
        // 🚀 OPTIMIZED: Use only vetrina-level data - no file metadata needed!
        showStatus('Caricamento completato! ⚡');
        
        // The backend now provides all the data we need in the vetrina response:
        // - file_count: number of files
        // - price: total price
        // - tags: array of unique tags from all files
        // - average_rating: average rating of the vetrina
        // - reviews_count: number of reviews
        
        // Transform vetrine into card items using ONLY vetrina-level data
        const allFiles = currentVetrine.map(vetrina => {
            
            // Use ONLY vetrina-level data provided by backend
            const fileCount = vetrina.file_count || 0;
            const totalPrice = vetrina.price || 0;
            const actualTags = vetrina.tags || [];
            
            
            // Create a card item using ONLY vetrina-level data
            const vetrineCard = {
                id: vetrina.id || vetrina.vetrina_id,
                isVetrina: true,
                filesLoaded: false, // Mark as NOT loaded - actual files will be loaded on demand
                fileCount: fileCount, // Use backend-provided file_count
                files: [], // Empty array - actual files will be loaded on demand
                // Use vetrina info for the card
                filename: fileCount > 1 ? `${fileCount} files` : 'Documento',
                title: vetrina.name || 'Vetrina Senza Nome',
                description: vetrina.description || 'No description available',
                price: totalPrice, // Use backend-provided price
                created_at: vetrina.created_at,
                size: 0, // Will be calculated when files are loaded on-demand
                rating: vetrina.average_rating || 0, // Use backend rating data
                review_count: vetrina.reviews_count || 0, // Use backend review count
                course_name: vetrina.course_instance?.course_name || extractCourseFromVetrina(vetrina.name),
                faculty_name: vetrina.course_instance?.faculty_name || extractFacultyFromVetrina(vetrina.name),
                language: vetrina.course_instance?.language || 'Italiano',
                canale: vetrina.course_instance?.canale || 'A',
                course_semester: vetrina.course_instance?.course_semester || 'Primo Semestre',
                academic_year: `${vetrina.course_instance?.date_year || 2024}/${(vetrina.course_instance?.date_year || 2024) + 1}`,
                document_types: [], // Will be populated when files are loaded on-demand
                document_type: fileCount > 1 ? 'BUNDLE' : 'Documento',
                author_username: vetrina.author?.username || vetrina.owner?.username || 'Unknown',
                owned: false, // Will be determined when files are loaded on-demand
                favorite: vetrina.favorite === true,
                tags: actualTags, // Use backend-provided tags
                primary_tag: actualTags.length > 0 ? actualTags[0] : null,
                vetrina_info: {
                    id: vetrina.id || vetrina.vetrina_id,
                    name: vetrina.name,
                    description: vetrina.description,
                    course_instance_id: vetrina.course_instance?.instance_id,
                    owner_id: vetrina.author?.user_id || vetrina.owner?.id,
                    owner_username: vetrina.author?.username || vetrina.owner?.username || 'Unknown'
                }
            };
            
            return vetrineCard;
        });
        
        currentFiles = allFiles;
        originalFiles = [...allFiles]; // Keep original copy
        renderDocuments(currentFiles);
        populateFilterOptions();
        
        // Update vendor stats
        updateVendorStats(allFiles.length);
        
        // Show appropriate success message based on data source
        if (vetrineResponse && vetrineResponse.fallback) {
            showStatus(`${allFiles.length} vetrine caricate (dati temporanei) ⚠️`, 'warning');
        } else {
            showStatus(`${allFiles.length} vetrine caricate con successo! 🎉`);
        }
        
    } catch (error) {
        console.error('Error loading vetrine:', error);
        
        // Enhanced error messages based on error type
        let errorMessage = 'Errore nel caricamento dei documenti. Riprova più tardi.';
        
        if (error.message.includes('500') || error.message.includes('INTERNAL SERVER ERROR')) {
            errorMessage = 'Server temporaneamente non disponibile. Riprova tra qualche minuto. 🔧';
        } else if (error.message.includes('No vendor username')) {
            errorMessage = 'URL non valido. Torna alla pagina principale. 🔗';
        } else if (error.message.includes('Unable to load vendor data')) {
            errorMessage = 'Impossibile caricare i dati del venditore. Verifica la connessione. 🌐';
        }
        
        showError(errorMessage);
        
        // Show empty state with helpful message
        renderDocuments([]);
        updateVendorStats(0);
        
        // Add retry button for server errors
        if (error.message.includes('500') || error.message.includes('INTERNAL SERVER ERROR')) {
            addRetryButton();
        }
    }
}

// Helper function to extract course name from vetrina name
function extractCourseFromVetrina(vetrinaName) {
    const courseMap = {
        'Mathematics': 'Analisi Matematica I',
        'Computer Science': 'Algoritmi e Strutture Dati',
        'Physics': 'Fisica Generale I',
        'Chemistry': 'Chimica Organica',
        'Engineering': 'Progettazione Meccanica',
        'Business': 'Economia Aziendale'
    };
    
    for (const [key, course] of Object.entries(courseMap)) {
        if (vetrinaName.toLowerCase().includes(key.toLowerCase())) {
            return course;
        }
    }
    return 'Corso Generale';
}

// Helper function to extract faculty from vetrina name  
function extractFacultyFromVetrina(vetrinaName) {
    const facultyMap = {
        'Mathematics': 'Scienze Matematiche',
        'Computer Science': 'Ingegneria Informatica',
        'Physics': 'Scienze Fisiche',
        'Chemistry': 'Scienze Chimiche',
        'Engineering': 'Ingegneria Meccanica',
        'Business': 'Economia e Commercio'
    };
    
    for (const [key, faculty] of Object.entries(facultyMap)) {
        if (vetrinaName.toLowerCase().includes(key.toLowerCase())) {
            return faculty;
        }
    }
    return 'Facoltà Generale';
}

// Helper function to extract tags from vetrina metadata
function extractTagsFromVetrina(vetrina) {
    // If vetrina has tags from backend, use them; otherwise return empty array
    const tags = vetrina.tags || [];
    return tags;
}

// Helper function to extract primary tag from vetrina metadata
function extractPrimaryTagFromVetrina(vetrina) {
    const tags = extractTagsFromVetrina(vetrina);
    return tags.length > 0 ? tags[0] : null;
}

// Function to load valid tags from backend
async function loadValidTags() {
    try {
        const response = await makeSimpleRequest('/tags');
        if (response && response.tags) {
            window.allTags = response.tags;
        }
    } catch (error) {
        console.warn('⚠️ Could not load tags from backend, using defaults:', error);
        // Keep default tags: ['appunti', 'dispense', 'esercizi']
    }
}

// Function to update document card tags in the UI
function updateDocumentCardTags(vetrinaId, tags) {
    const card = document.querySelector(`[data-vetrina-id="${vetrinaId}"]`);
    if (!card) return;
    
    const badgesContainer = card.querySelector('.document-type-badges');
    if (!badgesContainer) return;
    
    // Update the badges with the new tags
    if (tags && tags.length > 0) {
        if (tags.length === 1) {
            badgesContainer.innerHTML = `<div class="document-type-badge">${getTagDisplayName(tags[0])}</div>`;
        } else {
            badgesContainer.innerHTML = `<div class="document-type-badge">${getTagDisplayName(tags[0])}</div><div class="document-type-badge more-types">+${tags.length - 1}</div>`;
        }
    } else {
        badgesContainer.innerHTML = '<div class="document-type-badge">Documento</div>';
    }
}

// Helper function to get file type from filename
function getFileTypeFromFilename(filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    const typeMap = {
        'pdf': 'PDF',
        'docx': 'DOCX', 
        'doc': 'DOC',
        'pptx': 'PPTX',
        'ppt': 'PPT',
        'xlsx': 'XLSX',
        'xls': 'XLS',
        'dwg': 'DWG',
        'txt': 'TXT'
    };
    return typeMap[extension] || 'FILE';
}

// Function to fetch files for a specific vetrina on demand
async function loadVetrinaFiles(vetrinaId) {
    try {
        
        // Always fetch fresh data from the redacted endpoint
        const filesResponse = await makeAuthenticatedRequest(`/vetrine/${vetrinaId}/files`);
        const realFiles = filesResponse?.files || [];
        
        if (realFiles.length === 0) {
            return null;
        }
        
        // Calculate totals for the vetrina using REAL data
        const totalSize = realFiles.reduce((sum, file) => sum + (file.size || 0), 0);
        const totalPrice = realFiles.reduce((sum, file) => sum + (file.price || 0), 0);
        
        // Get all unique tags from all files in the vetrina
        const fileTags = realFiles.map(file => file.tag).filter(tag => tag !== null);
        const allTags = Array.from(new Set([...fileTags]));
        
        
        // Return processed file data
        return {
            files: realFiles.map(file => ({
                id: file.file_id,
                filename: file.filename,
                title: file.original_filename || file.filename,
                size: file.size || 0,
                price: file.price || 0,
                document_type: getFileTypeFromFilename(file.filename),
                created_at: file.created_at,
                download_count: file.download_count || 0,
                owned: file.owned || false,
                tag: file.tag || null
            })),
            fileCount: realFiles.length,
            totalSize: totalSize,
            totalPrice: totalPrice,
            totalDownloads: realFiles.reduce((sum, file) => sum + (file.download_count || 0), 0),
            documentTypes: Array.from(new Set(realFiles.map(file => getFileTypeFromFilename(file.filename)))),
            tags: allTags,
            primaryTag: allTags.length > 0 ? allTags[0] : null,
            owned: realFiles.every(file => file.owned)
        };
        
    } catch (error) {
        console.error(`Error loading files for vetrina ${vetrinaId}:`, error);
        return null;
    }
}

function getDocumentPreviewIcon(filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    const iconMap = {
        'pdf': '📄',
        'docx': '📝', 
        'doc': '📝',
        'pptx': '📊',
        'ppt': '📊',
        'xlsx': '📊',
        'xls': '📊',
        'dwg': '📐',
        'txt': '📃',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'png': '🖼️',
        'gif': '🖼️'
    };
    return iconMap[extension] || '📄';
}

function getDocumentCategory(title, description) {
    const content = (title + ' ' + description).toLowerCase();
    
    // Define keywords for each document type
    const categories = {
        'Esercizi': ['esercizi', 'exercise', 'problema', 'problem', 'quiz', 'test', 'verifica', 'compito', 'prova'],
        'Appunti': ['appunti', 'notes', 'lezione', 'lecture', 'corso', 'class', 'note'],
        'Dispense': ['dispense', 'dispensa', 'handout', 'materiale', 'material', 'guida', 'guide'],
        'Formulari': ['formulario', 'formule', 'formula', 'riassunto', 'summary', 'cheat sheet'],
        'Progetti': ['progetto', 'project', 'tesi', 'thesis', 'elaborato', 'relazione', 'report'],
        'Slide': ['slide', 'slides', 'presentazione', 'presentation', 'powerpoint', 'ppt'],
        'Libro': ['libro', 'book', 'manuale', 'manual', 'testo', 'textbook'],
        'Laboratorio': ['laboratorio', 'lab', 'pratica', 'practice', 'esperimento', 'experiment']
    };
    
    // Check each category for keyword matches
    for (const [category, keywords] of Object.entries(categories)) {
        for (const keyword of keywords) {
            if (content.includes(keyword)) {
                return category;
            }
        }
    }
    
    // Default fallback
    return 'Documento';
}

// Helper function to get tag icon
function getTagIcon(tag) {
    const tagIcons = {
        'appunti': '📝',
        'dispense': '📄',
        'esercizi': '🎯'
    };
    return tagIcons[tag] || '🏷️';
}

// Helper function to get tag display name
function getTagDisplayName(tag) {
    const tagNames = {
        'appunti': 'Appunti',
        'dispense': 'Dispense',
        'esercizi': 'Esercizi'
    };
    return tagNames[tag] || tag;
}

// Helper function to format canale display
function formatCanaleDisplay(canale) {
    if (canale === "0" || canale === 0 || canale === "Canale Unico") {
        return "Unico";
    }
    return canale;
}

function renderDocuments(files) {
    const grid = document.getElementById('documentsGrid');
    if (!grid) {
        console.error('Documents grid not found');
        return;
    }
    
    // Remove loading class when rendering real content
    grid.classList.remove('loading');
    
    // Update search section layout based on results
    const searchSection = document.querySelector('.search-section');
    if (searchSection) {
        if (!files || files.length === 0) {
            searchSection.classList.remove('has-results');
        } else {
            searchSection.classList.add('has-results');
        }
    }
    
    // Update document count display
    const documentCountContainer = document.getElementById('documentCountContainer');
    const documentCount = document.getElementById('documentCount');
    
    if (documentCountContainer && documentCount) {
        const count = files ? files.length : 0;
        const documentText = count === 1 ? 'DOCUMENTO TROVATO' : 'DOCUMENTI TROVATI';
        documentCount.textContent = `${count} ${documentText}`;
        documentCountContainer.style.display = 'block';
        
        // Update active filters display
        updateActiveFiltersDisplay();
    }
    
    grid.innerHTML = '';
    
    if (!files || files.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <div class="decoration"></div>
                <div class="decoration"></div>
                <span class="material-symbols-outlined">search_off</span>
                <h3>Nessun risultato trovato</h3>
                <p>Non abbiamo trovato documenti che corrispondano ai tuoi criteri di ricerca. Prova a modificare i filtri o utilizzare termini di ricerca diversi.</p>
            </div>
        `;
        return;
    }

    files.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.dataset.id = item.id;
        // Always use the vetrina ID, whether it's a single file or a collection
        card.setAttribute('data-vetrina-id', item.vetrina_id || item.id);
        card.style.animationDelay = `${index * 0.1}s`;
        
        // Make the entire card clickable
        card.style.cursor = 'pointer';
        card.onclick = async (e) => {
            // Don't trigger if clicking on interactive elements
            if (e.target.closest('.favorite-button') || e.target.closest('.view-files-button') || e.target.closest('.owner-avatar') || e.target.closest('.rating-badge')) {
                return;
            }
            
            // Mark that we're navigating to another page
            sessionStorage.setItem('navigatingFromSearch', 'true');
            
            // Navigate to document preview page instead of opening overlay
            window.location.href = `document-preview.html?id=${item.id}`;
        };

        const documentType = item.document_type || 'Documento';
        const documentTitle = item.title || 'Documento Senza Titolo';
        const rating = parseFloat(item.rating) || 0;
        const reviewCount = parseInt(item.review_count) || 0;
        const description = item.description || 'Nessuna descrizione disponibile';
        const price = parseFloat(item.price) || 0;
        
        const stars = generateStars(Math.floor(rating));
        const documentCategory = getDocumentCategory(documentTitle, description);
        
        // Determine if this is a multi-file vetrina and if files have been loaded
        const isMultiFile = item.isVetrina && item.fileCount > 1;
        const filesLoaded = item.filesLoaded;
        const fileStackClass = isMultiFile ? 'file-stack' : '';
        const stackCountBadge = isMultiFile ? `<div class="file-count-badge">${item.fileCount}</div>` : '';
        
        // Generate preview based on whether files have been loaded
        let previewContent;
        if (item.isVetrina && !filesLoaded) {
            // Show placeholder for vetrina that hasn't been loaded yet
            previewContent = `
                <div class="preview-icon">
                    <span class="document-icon">📁</span>
                    <div class="file-extension">VETRINA</div>
                </div>
            `;
        } else if (isMultiFile && filesLoaded) {
            // Show professional file stack with uniform grid on hover
            const fileCount = item.fileCount;
            const files = item.files || [];
            
            // Safety check: ensure we have files to display
            if (files.length === 0) {
                previewContent = `
                    <div class="preview-icon">
                        <span class="document-icon">📁</span>
                        <div class="file-extension">VETRINA</div>
                    </div>
                `;
            } else {
                // Generate dynamic stack layers based on file count
                let stackLayers = '';
                if (fileCount === 2 && files.length >= 2) {
                    stackLayers = `
                        <div class="stack-layer stack-back">
                            <span class="document-icon">${getDocumentPreviewIcon(files[1].filename)}</span>
                            <div class="file-extension">${files[1].document_type}</div>
                        </div>
                        <div class="stack-layer stack-front">
                            <span class="document-icon">${getDocumentPreviewIcon(files[0].filename)}</span>
                            <div class="file-extension">${files[0].document_type}</div>
                        </div>
                    `;
            } else if (fileCount === 3) {
                stackLayers = `
                    <div class="stack-layer stack-back">
                        <span class="document-icon">${getDocumentPreviewIcon(files[2].filename)}</span>
                        <div class="file-extension">${files[2].document_type}</div>
                    </div>
                    <div class="stack-layer stack-middle">
                        <span class="document-icon">${getDocumentPreviewIcon(files[1].filename)}</span>
                        <div class="file-extension">${files[1].document_type}</div>
                    </div>
                    <div class="stack-layer stack-front">
                        <span class="document-icon">${getDocumentPreviewIcon(files[0].filename)}</span>
                        <div class="file-extension">${files[0].document_type}</div>
                    </div>
                `;
            } else {
                // For 4+ files, show first 3 files in stack
                const filesToShow = files.slice(0, 3);
                stackLayers = `
                    <div class="stack-layer stack-back">
                        <span class="document-icon">${getDocumentPreviewIcon(filesToShow[2].filename)}</span>
                        <div class="file-extension">${filesToShow[2].document_type}</div>
                    </div>
                    <div class="stack-layer stack-middle">
                        <span class="document-icon">${getDocumentPreviewIcon(filesToShow[1].filename)}</span>
                        <div class="file-extension">${filesToShow[1].document_type}</div>
                    </div>
                    <div class="stack-layer stack-front">
                        <span class="document-icon">${getDocumentPreviewIcon(filesToShow[0].filename)}</span>
                        <div class="file-extension">${filesToShow[0].document_type}</div>
                    </div>
                `;
            }
            
            previewContent = `
                <div class="preview-icon ${fileStackClass}" data-file-count="${fileCount}">
                    <div class="file-stack-container">
                        ${stackLayers}
                        ${stackCountBadge}
                    </div>
                </div>
            `;
            }
        } else {
            // Single file preview or loaded vetrina
            let filename;
            if (item.isVetrina && filesLoaded && item.files && item.files.length > 0) {
                filename = item.files[0].filename;
            } else {
                filename = item.filename;
            }
            previewContent = `
                <div class="preview-icon">
                    <span class="document-icon">${getDocumentPreviewIcon(filename)}</span>
                    <div class="file-extension">${documentType}</div>
                </div>
            `;
        }
        
        // Add a view files button for vetrine
        const viewFilesButton = item.isVetrina ? `<button class="view-files-button"><span class="material-symbols-outlined">fullscreen</span>Visualizza</button>` : '';

        // Update the favorite button to include the initial state from the API
        const isFavorited = item.favorite === true;
        card.innerHTML = `
            <div class="document-preview">
                ${previewContent}
                ${viewFilesButton}
                <div class="document-type-badges">
                    ${(() => {
                        // Use actual file tags (already fetched in loadAllFiles)
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
                <div class="rating-badge" data-action="open-reviews" data-vetrina-id="${item.vetrina_id || item.id}" data-rating="${rating}" data-review-count="${reviewCount}">
                    <div class="rating-stars">${generateFractionalStars(rating)}</div>
                    <span class="rating-count">(${reviewCount})</span>
                </div>
            </div>
            
            <button class="favorite-button ${isFavorited ? 'active' : ''}" 
                    data-action="toggle-favorite" 
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
                        <div class="owner-avatar" title="Caricato da ${item.author_username || 'Unknown'}" data-action="navigate" data-url="vendor-page.html?user=${encodeURIComponent(item.author_username || 'Unknown')}" style="
                            background: ${getConsistentGradient(item.author_username || 'Unknown')};
                            color: white;
                            font-weight: 700;
                            font-size: 12px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
                            border: 1.5px solid var(--white);
                        ">
                            ${getInitials(item.author_username || 'Unknown')}
                        </div>
                        <div class="document-meta">
                            ${item.isVetrina && !filesLoaded ? 'Click to view' : formatFileSize(item.size || 0)}
                        </div>
                    </div>
                    <div class="document-price ${price === 0 ? 'free' : 'paid'}" title="${price === 0 ? 'Documento gratuito' : `Prezzo: ${formatPrice(price)}`}">
                        ${formatPrice(price)}
                    </div>
                </div>
            </div>
        `;
        
        if (item.isVetrina) {
            card.querySelector('.view-files-button').addEventListener('click', async (e) => {
                e.stopPropagation();
                
                try {
                    // Show loading state
                    const button = e.target.closest('.view-files-button');
                    const originalContent = button.innerHTML;
                    button.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span>Caricamento...';
                    button.disabled = true;
                    
                    // Fetch files for this vetrina
                    const filesResponse = await makeAuthenticatedRequest(`/vetrine/${item.id}/files`);
                    
                    if (!filesResponse || !filesResponse.files || filesResponse.files.length === 0) {
                        showError('Nessun file trovato in questa vetrina');
                        return;
                    }
                    
                    // Create vetrina object with files for quick look
                    const vetrinaWithFiles = {
                        ...item,
                        files: filesResponse.files
                    };
                    
                    // Open quick look overlay
                    openQuickLook(vetrinaWithFiles);
                    
                } catch (error) {
                    console.error('Error loading vetrina files:', error);
                    showError('Errore nel caricamento dei file. Riprova più tardi.');
                } finally {
                    // Restore button state
                    const button = e.target.closest('.view-files-button');
                    if (button) {
                        button.innerHTML = originalContent;
                        button.disabled = false;
                    }
                }
            });
        }

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

function generateFractionalStars(rating) {
    const ratingPercentage = (rating / 5) * 100;
    return `
        <div class="stars-outer">
            <div class="stars-inner" style="width: ${ratingPercentage}%"></div>
        </div>
    `;
}

function generateVendorBannerStars(rating) {
    let stars = '';
    console.log('Generating stars for rating:', rating, 'Type:', typeof rating, 'IsNaN:', isNaN(rating));
    
    // Ensure rating is a valid number
    const numericRating = parseFloat(rating);
    if (isNaN(numericRating)) {
        console.error('Invalid rating value:', rating);
        rating = 0;
    } else {
        rating = numericRating;
    }
    
    console.log('Processed rating:', rating);
    
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            // Fully filled star
            stars += '<span class="vendor-banner-rating-star filled">★</span>';
            console.log(`Star ${i}: filled`);
        } else if (i - 1 < rating && rating < i) {
            // Partially filled star - calculate the fill percentage
            const fillPercentage = (rating - (i - 1)) * 100;
            stars += `<span class="vendor-banner-rating-star partial" style="--fill-percentage: ${fillPercentage}%">★</span>`;
            console.log(`Star ${i}: partial (${fillPercentage}%)`);
        } else {
            // Empty star
            stars += '<span class="vendor-banner-rating-star empty">★</span>';
            console.log(`Star ${i}: empty`);
        }
    }
    
    console.log('Generated stars HTML:', stars);
    return stars;
}

function getOriginalFilename(filename) {
    // Remove UUID prefix from filename (format: uuid-userid-originalname)
    const parts = filename.split('-');
    if (parts.length >= 3) {
        // Find the last part that looks like a filename (contains a dot)
        let filenameStart = -1;
        for (let i = parts.length - 1; i >= 0; i--) {
            if (parts[i].includes('.')) {
                // Work backwards to find where the actual filename starts
                if (i > 0 && parts[i-1].length <= 3 && /^\d+$/.test(parts[i-1])) {
                    filenameStart = i;
                    break;
                }
            }
        }
        
        if (filenameStart > 0) {
            return parts.slice(filenameStart).join('-');
        }
        
        // Fallback: assume last 2 parts form the filename
        return parts.slice(-2).join('-');
    }
    return filename;
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
    // Handle decimal prices properly (e.g., 10.50 -> €10.50, 10.00 -> €10)
    const formattedPrice = parseFloat(price).toFixed(2);
    // Remove trailing zeros after decimal point
    const cleanPrice = formattedPrice.replace(/\.?0+$/, '');
    return `€${cleanPrice}`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('it-IT');
}

function showStatus(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `status-message ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Different durations based on message type
    const duration = type === 'warning' ? 8000 : type === 'error' ? 10000 : 3000;
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, duration);
}

function showError(message) {
    showStatus(message, 'error');
}

// Function to add retry button for server errors
function addRetryButton() {
    const searchSection = document.querySelector('.search-section');
    if (!searchSection) return;
    
    // Remove existing retry button if any
    const existingRetry = searchSection.querySelector('.retry-button');
    if (existingRetry) {
        existingRetry.remove();
    }
    
    const retryButton = document.createElement('button');
    retryButton.className = 'retry-button';
    retryButton.innerHTML = `
        <span class="material-symbols-outlined">refresh</span>
        Riprova
    `;
    retryButton.addEventListener('click', async () => {
        retryButton.disabled = true;
        retryButton.innerHTML = `
            <span class="material-symbols-outlined rotating">refresh</span>
            Ricaricamento...
        `;
        
        try {
            // Clear any existing cache
            if (window.cacheManager) {
                window.cacheManager.delete('vetrine_list', 'vetrine_list');
            }
            
            // Reload the page data
            await loadAllFiles();
            
            // Remove retry button on success
            retryButton.remove();
        } catch (error) {
            console.error('Retry failed:', error);
            retryButton.disabled = false;
            retryButton.innerHTML = `
                <span class="material-symbols-outlined">refresh</span>
                Riprova
            `;
            showError('Riprova fallita. Riprova più tardi.');
        }
    });
    
    // Insert retry button at the top of search section
    searchSection.insertBefore(retryButton, searchSection.firstChild);
}

// Function to refresh favorite status when page becomes visible
// Favorite status is already included in vetrine data, no need for separate refresh

async function toggleFavorite(button, event) {
    if (event) {
        event.stopPropagation();
    }

    // Get the vetrina ID from the parent card
    const card = button.closest('.document-card');
    const vetrinaId = card.getAttribute('data-vetrina-id');
    
    if (!vetrinaId) {
        showError('Errore: ID vetrina non trovato');
        return;
    }

    // Optimistically update UI
    const isActive = button.classList.toggle('active');
    button.setAttribute('title', isActive ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti');

    // Set a flag to notify other pages
    sessionStorage.setItem('favoritesChanged', 'true');

    try {
        const response = await fetch(`${API_BASE}/user/favorites/vetrine/${vetrinaId}`, {
            method: isActive ? 'POST' : 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (response) {
            // Update the favorite state in the UI based on the action
            if (isActive) {
                // We just added a favorite, so keep button active
                button.classList.add('active');
                button.title = 'Rimuovi dai Preferiti';
                showStatus('Aggiunto ai preferiti! ❤️');
            } else {
                // We just removed a favorite, so keep button inactive
                button.classList.remove('active');
                button.title = 'Aggiungi ai Preferiti';
                showStatus('Rimosso dai preferiti 💔');
            }
            
            // Update the local data to keep it in sync
            const vetrinaIdInt = parseInt(vetrinaId);
            if (currentFiles) {
                const vetrinaIndex = currentFiles.findIndex(item => 
                    (item.vetrina_id || item.id) === vetrinaIdInt
                );
                if (vetrinaIndex !== -1) {
                    currentFiles[vetrinaIndex].favorite = isActive; // isActive is the new state
                }
            }
            if (originalFiles) {
                const vetrinaIndex = originalFiles.findIndex(item => 
                    (item.vetrina_id || item.id) === vetrinaIdInt
                );
                if (vetrinaIndex !== -1) {
                    originalFiles[vetrinaIndex].favorite = isActive; // isActive is the new state
                }
            }
            
            // Mark that favorites have been changed so other pages know to refresh
            sessionStorage.setItem('favoritesChanged', 'true');
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        
        // Revert the optimistic UI update
        button.classList.toggle('active'); // Toggle back to original state
        button.setAttribute('title', isActive ? 'Aggiungi ai preferiti' : 'Rimuovi dai preferiti');
        
        // Show specific error message based on error type
        if (error.message.includes('Load failed') || error.message.includes('Failed to fetch')) {
            showError('Errore di connessione al server. Verifica la tua connessione e riprova.');
        } else if (error.message.includes('500')) {
            showError('Errore del server. Il servizio preferiti è temporaneamente non disponibile. Riprova più tardi.');
        } else {
            showError('Errore durante l\'aggiornamento dei preferiti. Riprova più tardi.');
        }
    }
}

async function previewDocument(fileId) {
    const file = currentFiles.find(f => f.id === fileId);
    if (!file) return;

    // Always load files when preview is clicked (on-demand loading)
    try {
        showStatus('Caricamento dettagli documento... 📚');
        
        // Load files for this specific vetrina using the redacted endpoint
        const fileData = await loadVetrinaFiles(file.id);
        if (fileData && fileData.files.length > 0) {
            // Update the file object with loaded data
            file.fileCount = fileData.fileCount;
            file.files = fileData.files;
            file.size = fileData.totalSize;
            file.price = fileData.totalPrice;
            file.download_count = fileData.totalDownloads;
            file.document_types = fileData.documentTypes;
            file.document_type = fileData.fileCount > 1 ? 'BUNDLE' : fileData.documentTypes[0] || 'FILE';
            file.owned = fileData.owned;
            file.tags = fileData.tags;
            file.primary_tag = fileData.primaryTag;
            file.filesLoaded = true;
            
            // Update the filename to show actual file count
            file.filename = fileData.fileCount > 1 ? `${fileData.fileCount} files` : fileData.files[0].filename;
            
            // Update the UI to show the new tags
            updateDocumentCardTags(file.id, fileData.tags);
        } else {
            showError('Nessun file trovato per questa vetrina.');
            return;
        }
    } catch (error) {
        console.error(`Error loading files for vetrina ${file.id}:`, error);
        
        // Check if it's a CORS/preflight error
        if (error.message.includes('CORS error') || error.message.includes('Load failed') || error.message.includes('Failed to fetch')) {
            showError('Errore CORS: Il server non permette richieste cross-origin per questo endpoint. Contatta l\'amministratore.');
        } else {
            showError('Errore nel caricamento dei dettagli del documento.');
        }
        return;
    }

    // Use REAL database information for preview
    const documentTitle = file.title || 'Documento Senza Titolo';
    const documentType = file.document_type || 'Documento';
    const courseName = file.course_name || file.vetrina_info?.course_name || 'Corso';
    const faculty = file.faculty_name || file.vetrina_info?.faculty_name || 'Facoltà';
    const canale = formatCanaleDisplay(file.canale || file.vetrina_info?.canale || 'A');
    const academicYear = file.academic_year || '2024/2025';
    const language = file.language || 'English';
    const rating = parseFloat(file.rating) || 0;
    const reviewCount = parseInt(file.review_count) || 0;
    const price = parseFloat(file.price) || 0;
    const ownerUsername = file.vetrina_info?.owner_username || 'Unknown';
    
    const previewTitle = document.getElementById('previewTitle');
    if (previewTitle) previewTitle.textContent = documentTitle;
    
    const content = `
        <div class="document-overview">
            <h3>📚 Panoramica Documento</h3>
            <div class="overview-grid">
                <div><strong>📄 Tipo:</strong> ${documentType}</div>
                <div><strong>📊 Dimensione:</strong> ${formatFileSize(file.size)}</div>
                <div><strong>💰 Prezzo:</strong> ${price === 0 ? 'Gratuito' : '€' + price}</div>
                <div><strong>👤 Vetrina di:</strong> @${ownerUsername}</div>
                <div><strong>📚 Corso:</strong> ${courseName}</div>
                <div><strong>🏛️ Facoltà:</strong> ${faculty}</div>
                <div><strong>📝 Canale:</strong> ${canale}</div>
                <div><strong>🗓️ Anno Accademico:</strong> ${academicYear}</div>
                <div><strong>🌐 Lingua:</strong> ${language}</div>
                <div><strong>⭐ Rating:</strong> ${rating}/5 (${reviewCount} recensioni)</div>
                <div><strong>📅 Pubblicato:</strong> ${formatDate(file.created_at)}</div>
            </div>
        </div>
        
        <div class="document-preview-section">
            <h3>📖 Anteprima Documento</h3>
            <div class="preview-container">
                <img id="modalPreviewImg-${file.id}" 
                     alt="Anteprima documento" 
                     class="full-preview"
                     style="display: none;">
                <div id="modalPreviewLoading-${file.id}" class="preview-loading">Caricamento anteprima...</div>
            </div>
            <div class="preview-description">
                <h4>📝 Descrizione</h4>
                <p>${file.description || file.vetrina_info?.description || 'Nessuna descrizione disponibile per questo documento.'}</p>
            </div>
            <div class="preview-note">
                <p><strong>ℹ️ Informazioni:</strong> 
                ${file.owned ? 'Possiedi già questo documento. Puoi scaricarlo gratuitamente.' : 
                  price === 0 ? 'Questo documento è gratuito e può essere scaricato immediatamente.' : 
                  `Acquista questo documento per €${price} per accedere al contenuto completo.`}
                </p>
            </div>
        </div>
    `;
    
    const actions = file.owned ? 
        `<button class="btn primary" data-action="download-document" data-file-id="${file.id}">
            <i class="material-symbols-outlined">download</i>
            Scarica Documento
         </button>
         <button class="btn secondary" data-action="close-preview">
            <i class="material-symbols-outlined">close</i>
            Chiudi
         </button>` :
        price === 0 ?
        `<button class="btn primary" data-action="download-document" data-file-id="${file.id}">
            <i class="material-symbols-outlined">download</i>
            Scarica Gratis
         </button>
         <button class="btn secondary" data-action="close-preview">
            <i class="material-symbols-outlined">close</i>
            Chiudi
         </button>` :
        `<button class="btn primary" data-action="purchase-document" data-file-id="${file.id}">
            <i class="material-symbols-outlined">payment</i>
            Acquista per €${price}
         </button>
         <button class="btn secondary" data-action="close-preview">
            <i class="material-symbols-outlined">close</i>
            Chiudi
         </button>`;
    
    const previewBody = document.getElementById('previewBody');
    const previewActions = document.getElementById('previewActions');
    const previewModal = document.getElementById('previewModal');
    
    if (previewBody) previewBody.innerHTML = content;
    if (previewActions) previewActions.innerHTML = actions;
    if (previewModal) previewModal.classList.add('active');
    
    // Set the preview icon for the modal  
    const modalImg = document.getElementById(`modalPreviewImg-${file.id}`);
    const modalLoading = document.getElementById(`modalPreviewLoading-${file.id}`);
    
    if (modalLoading) {
        // Show loading state
        modalLoading.innerHTML = `
            <div class="preview-loading">
                <span class="material-symbols-outlined">hourglass_empty</span>
                <p>Caricamento anteprima...</p>
            </div>
        `;
        modalLoading.style.display = 'flex';
    }
    
    if (modalImg) {
        modalImg.style.display = 'none';
    }
    
    // Load redacted preview for the first file in the vetrina
    if (file.files && file.files.length > 0) {
        try {
            const firstFile = file.files[0];
            const previewResponse = await makeAuthenticatedRequest(`/files/${firstFile.id}/download/redacted`);
            
            if (previewResponse && previewResponse.preview_url) {
                // Show the redacted preview
                if (modalImg) {
                    modalImg.src = previewResponse.preview_url;
                    modalImg.style.display = 'block';
                    modalImg.onload = () => {
                        if (modalLoading) modalLoading.style.display = 'none';
                    };
                    modalImg.onerror = () => {
                        // Fallback to icon if image fails to load
                        if (modalLoading) {
                            modalLoading.innerHTML = `
                                <div class="preview-icon">
                                    <span class="document-icon">${getDocumentPreviewIcon(firstFile.filename)}</span>
                                    <div class="file-extension">${getFileTypeFromFilename(firstFile.filename)}</div>
                                </div>
                            `;
                        }
                    };
                }
            } else {
                // Fallback to icon if no preview available
                if (modalLoading) {
                    modalLoading.innerHTML = `
                        <div class="preview-icon">
                            <span class="document-icon">${getDocumentPreviewIcon(firstFile.filename)}</span>
                            <div class="file-extension">${getFileTypeFromFilename(firstFile.filename)}</div>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading redacted preview:', error);
            // Fallback to icon on error
            if (modalLoading) {
                modalLoading.innerHTML = `
                    <div class="preview-icon">
                        <span class="document-icon">${getDocumentPreviewIcon(file.filename)}</span>
                        <div class="file-extension">${file.document_type}</div>
                    </div>
                `;
            }
        }
    } else {
        // No files available, show generic icon
        if (modalLoading) {
            modalLoading.innerHTML = `
                <div class="preview-icon">
                    <span class="document-icon">${getDocumentPreviewIcon(file.filename)}</span>
                    <div class="file-extension">${file.document_type}</div>
                </div>
            `;
        }
    }
    
    showStatus('Anteprima caricata! 👁️');
}

function closePreview() {
    const previewModal = document.getElementById('previewModal');
    if (previewModal) previewModal.classList.remove('active');
}

async function downloadDocument(fileId) {
    try {
        showStatus('Download in corso... 📥');
        
        // Create a temporary form to handle the download
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
        filenameInput.value = getOriginalFilename(currentFiles.find(f => f.id === fileId)?.filename) || 'documento';
        form.appendChild(filenameInput);
        
        // Submit the form
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        
        showStatus('Download avviato! 🎉');
    } catch (error) {
        showError('Errore durante il download: ' + error.message);
    }
}

async function purchaseDocument(fileId) {
    try {
        showStatus('Elaborazione acquisto... 💳');
        await makeRequest(`/files/${fileId}/buy`, { method: 'POST' });
        showStatus('Acquisto completato! Documento sbloccato! 🎉');
        // Reload documents to update ownership status
        loadAllFiles();
    } catch (error) {
        showError('Acquisto fallito: ' + error.message);
    }
}

// Replace the performSearch function to use backend search instead of client-side
async function performSearch(query) {
    try {
        // Show loading cards immediately for search (show more cards for better UX)
        showLoadingCards(12);
        showStatus('Ricerca in corso... 🔍');
        
        // If no query, load all files with current filters
        if (!query || !query.trim()) {
            await loadAllFiles();
            return;
        }
        
        // Build search parameters
        const searchParams = new URLSearchParams();
        searchParams.append('text', query.trim());
        
        // Get vendor username from URL parameters to filter search results
        const urlParams = new URLSearchParams(window.location.search);
        const vendorUsername = urlParams.get('user') || urlParams.get('username');
        
        if (vendorUsername) {
            // Add vendor filter to search parameters
            searchParams.append('author', vendorUsername);
        }
        
        // Add any active filters to the search
        // Backend-supported filters: course_name, faculty, canale, language, tag, extension, date_year, course_year
        // Client-side only filters: vetrinaType, minRating, priceType
        if (activeFilters.course) {
            const courseValue = Array.isArray(activeFilters.course) ? activeFilters.course[0] : activeFilters.course;
            searchParams.append('course_name', courseValue);
        }
        if (activeFilters.faculty) {
            const facultyValue = Array.isArray(activeFilters.faculty) ? activeFilters.faculty[0] : activeFilters.faculty;
            searchParams.append('faculty', facultyValue);
        }
        if (activeFilters.canale) {
            // Handle "Canale Unico" mapping to "0" for backend
            const canaleValue = Array.isArray(activeFilters.canale) ? activeFilters.canale[0] : activeFilters.canale;
            const backendCanaleValue = canaleValue === 'Canale Unico' ? '0' : canaleValue;
            searchParams.append('canale', backendCanaleValue);
        }
        if (activeFilters.language) {
            const languageValue = Array.isArray(activeFilters.language) ? activeFilters.language[0] : activeFilters.language;
            searchParams.append('language', languageValue);
        }
        if (activeFilters.tag) {
            const tagValue = Array.isArray(activeFilters.tag) ? activeFilters.tag[0] : activeFilters.tag;
            searchParams.append('tag', tagValue);
        }
        if (activeFilters.documentType) {
            const docTypeValue = Array.isArray(activeFilters.documentType) ? activeFilters.documentType[0] : activeFilters.documentType;
            searchParams.append('extension', docTypeValue);
        }
        // Note: file_count parameter not supported by backend yet, keeping vetrinaType as client-side filter
        if (activeFilters.academicYear) {
            // Extract year from academic year format (e.g., "2024/2025" -> 2024)
            const yearValue = Array.isArray(activeFilters.academicYear) ? activeFilters.academicYear[0] : activeFilters.academicYear;
            const year = yearValue.split('/')[0];
            searchParams.append('date_year', year);
        }
        if (activeFilters.courseYear) {
            // Add course year filter (e.g., 1, 2, 3 for first, second, third year)
            const courseYearValue = Array.isArray(activeFilters.courseYear) ? activeFilters.courseYear[0] : activeFilters.courseYear;
            searchParams.append('course_year', courseYearValue);
        }
        
        // Make backend search request with fallback
        let response;
        try {
            // Use authenticated request for GET search to include favorite status
            response = await makeAuthenticatedRequest(`/vetrine?${searchParams.toString()}`);
        } catch (error) {
            console.warn('⚠️ Backend search failed:', error);
            showStatus('Ricerca backend non disponibile. Riprova più tardi.');
            // Show empty state if backend fails
            currentFiles = [];
            renderDocuments([]);
            return;
        }
    
        if (!response) {
            console.warn('Empty response from backend, showing empty state');
            currentFiles = [];
            renderDocuments([]);
            showStatus('Nessun risultato trovato');
            return;
        }
        
        const searchResults = response.vetrine || [];
        const totalCount = response.count || searchResults.length;
        
        // If backend search returns 0 results, show empty state
        if (searchResults.length === 0) {
            currentFiles = [];
            renderDocuments([]);
            showStatus(`Nessun risultato trovato per "${query}" 🔍`);
            return;
        }
        
        // Transform backend vetrine results using ONLY vetrina-level data (no file metadata needed!)
        const transformedResults = searchResults.map(vetrina => {
            // Use vetrina-level information provided by backend
            const vetrineCard = {
                id: vetrina.vetrina_id,
                isVetrina: true,
                filesLoaded: false, // Mark as not loaded - will load on-demand when needed
                fileCount: vetrina.file_count || 0,
                // files: [] - will be loaded on-demand when user clicks preview/quick look
                filename: vetrina.file_count > 1 ? `${vetrina.file_count} files` : 'Documento',
                title: vetrina.name || 'Vetrina Senza Nome',
                description: vetrina.description || 'No description available',
                size: 0, // Will be calculated when files are loaded on-demand
                price: vetrina.price || 0, // Use backend-provided price
                created_at: vetrina.created_at || new Date().toISOString(),
                rating: vetrina.average_rating || 0, // Use backend-provided rating
                review_count: vetrina.reviews_count || 0, // Use backend-provided review count
                course_name: vetrina.course_instance?.course_name || extractCourseFromVetrina(vetrina.name),
                faculty_name: vetrina.course_instance?.faculty_name || extractFacultyFromVetrina(vetrina.name),
                language: vetrina.course_instance?.language || 'Italiano',
                canale: vetrina.course_instance?.canale || 'A',
                course_semester: vetrina.course_instance?.course_semester || 'Primo Semestre',
                academic_year: `${vetrina.course_instance?.date_year || 2024}/${(vetrina.course_instance?.date_year || 2024) + 1}`,
                document_types: [], // Will be populated when files are loaded on-demand
                document_type: 'BUNDLE', // Default to bundle, will be updated when files are loaded
                author_username: vetrina.author?.username || 'Unknown',
                owned: false, // Will be determined when files are loaded on-demand
                favorite: vetrina.favorite === true,
                tags: vetrina.tags || [], // Use backend-provided tags
                primary_tag: vetrina.tags && vetrina.tags.length > 0 ? vetrina.tags[0] : null,
                vetrina_info: {
                    id: vetrina.vetrina_id,
                    name: vetrina.name,
                    description: vetrina.description,
                    course_instance_id: vetrina.course_instance?.course_instance_id,
                    owner_id: vetrina.author?.user_id,
                    owner_username: vetrina.author?.username || 'Unknown'
                }
            };
            return vetrineCard;
        });
        
        // Apply any remaining client-side filters (except backend-handled ones)
        const filteredResults = applyClientSideFilters(transformedResults);
        
        // Update current files and render
        currentFiles = filteredResults;
        renderDocuments(filteredResults);
        
        // Show enhanced search results status
        const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
        const searchSummary = searchTerms.length > 1 
            ? `"${searchTerms.join('" + "')}"` 
            : `"${query}"`;
        
        // Enhanced status message with backend count information
        if (totalCount > filteredResults.length) {
            showStatus(`Trovati ${filteredResults.length} di ${totalCount} documenti per ${searchSummary} 🎯`);
        } else {
            showStatus(`Trovati ${filteredResults.length} documenti per ${searchSummary} 🎉`);
        }
        
    } catch (error) {
        console.error('Search error:', error);
        showError('Errore durante la ricerca. Riprova più tardi.');
        // Fallback to current files if search fails
        renderDocuments(currentFiles);
    }
}



// New function to apply remaining client-side filters (excluding course/faculty which backend handles)
function applyClientSideFilters(files) {
    let filtered = [...files];
    
    // Apply filters that aren't handled by backend
    Object.entries(activeFilters).forEach(([key, value]) => {
        if (!value || key === 'course' || key === 'faculty' || key === 'canale' || key === 'language' || key === 'tag' || key === 'documentType' || key === 'academicYear' || key === 'courseYear') return; // Skip backend-handled filters
        
        filtered = filtered.filter(file => {
            switch (key) {

                case 'language':
                    return file.language && file.language.toLowerCase() === value.toLowerCase();
                case 'canale':
                    return file.canale && file.canale.toLowerCase() === value.toLowerCase();
                case 'document_type':
                    return file.document_type && file.document_type.toLowerCase() === value.toLowerCase();
                case 'tag':
                    return file.tag && file.tag.toLowerCase() === value.toLowerCase();
                case 'rating_min':
                    return file.rating >= parseInt(value);
                case 'price_min':
                    return file.price >= parseInt(value);
                case 'price_max':
                    return file.price <= parseInt(value);
                case 'owned':
                    return value === 'true' ? file.owned : !file.owned;
                case 'free':
                    return value === 'true' ? file.price === 0 : file.price > 0;
                default:
                    return true;
            }
        });
    });
    
    return filtered;
}

// Wrapper function to safely call async applyFiltersAndRender from non-async contexts
function triggerFilterUpdate() {
    applyFiltersAndRender().catch(error => {
        console.error('Filter update error:', error);
        showError('Errore nell\'aggiornamento dei filtri');
    });
    saveFiltersToStorage();
}

function saveFiltersToStorage() {
    try {
        localStorage.setItem('searchFilters', JSON.stringify(activeFilters));
    } catch (e) {
        console.warn('Could not save filters to localStorage:', e);
    }
}

function restoreFiltersFromStorage() {
    
    // Clear all filters on page refresh - treat it like a fresh visit
    activeFilters = {};
    
    // Clear filters from localStorage
    try {
        localStorage.removeItem('searchFilters');
    } catch (e) {
        console.warn('Could not clear filters from localStorage:', e);
    }
    
    // Reset UI to clean state
    updateFilterInputs();
    updateActiveFilterIndicators();
    updateFilterCount();
    updateActiveFiltersDisplay();
    
    // Show all documents
    setTimeout(() => {
        if (originalFiles && originalFiles.length > 0) {
            renderDocuments(originalFiles);
            currentFiles = originalFiles;
            showStatus(`${originalFiles.length} documenti disponibili 📚`);
        }
    }, 300);
    
    // Force a re-render of dropdown options to ensure clean visual states
    setTimeout(() => {
        
        // First populate dropdown options
        if (window.facultyCoursesData) {
            populateDropdownOptions();
        }
        
        // Then update all UI elements with clean filter states
        updateFilterInputs();
        updateActiveFilterIndicators();
        updateFilterCount();
        updateActiveFiltersDisplay();
        
        // Force update of all filter-related UI elements
        const filterCount = document.getElementById('filterCount');
        if (filterCount) {
            filterCount.textContent = '0';
            filterCount.classList.remove('active');
        }
        
        // Force update of filters button state
        const filtersBtn = document.getElementById('filtersBtn');
        if (filtersBtn) {
            filtersBtn.classList.remove('has-filters');
        }
        
        // Final check to ensure everything is properly updated
        setTimeout(() => {
            updateFilterCount();
            updateActiveFilterIndicators();
            updateActiveFiltersDisplay();
            
            // Ensure filter pills are hidden
            const activeFiltersContainer = document.getElementById('activeFiltersDisplay');
            if (activeFiltersContainer) {
                activeFiltersContainer.classList.remove('visible');
            }
            
        }, 100);
    }, 200);
}

function updateFilterInputs() {
    // Language display text mapping
    const languageDisplayMap = {
        'Italian': 'Italiano',
        'English': 'Inglese'
    };
    
    // Tag display text mapping - now using getTagDisplayName function
    
    // Clear all inputs first to ensure clean state
    const allInputs = ['facultyFilter', 'courseFilter', 'canaleFilter', 'documentTypeFilter', 'languageFilter', 'academicYearFilter', 'tagFilter'];
    allInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = '';
        }
    });
    
    // Reset all dropdown placeholders
    const dropdownDefaults = {
        'documentTypeFilter': 'Tutti i tipi',
        'languageFilter': 'Tutte le lingue',
        'academicYearFilter': 'Tutti gli anni',
        'tagFilter': 'Tutti i tipi'
    };
    
    Object.entries(dropdownDefaults).forEach(([id, defaultValue]) => {
        const input = document.getElementById(id);
        if (input) {
            input.value = defaultValue;
        }
    });
    

    
    // Update dropdown inputs
    const dropdownTypes = ['faculty', 'course', 'canale', 'documentType', 'language', 'academicYear', 'tag'];
    dropdownTypes.forEach(type => {
        const input = document.getElementById(`${type}Filter`);
        const filterKey = type;
        if (input && activeFilters[filterKey]) {
            let displayValue = activeFilters[filterKey];
            
            // Use display text mapping for language and tag
            if (type === 'language' && languageDisplayMap[activeFilters[filterKey]]) {
                displayValue = languageDisplayMap[activeFilters[filterKey]];
            } else if (type === 'tag') {
                displayValue = getTagDisplayName(activeFilters[filterKey]);
            }
            
            input.value = displayValue;
        }
    });
    
    // Reset all toggle states first
    const toggleTypes = ['priceType', 'vetrinaType'];
    toggleTypes.forEach(type => {
        const toggleClass = type.replace('Type', '-toggle');
        document.querySelectorAll(`.${toggleClass}`).forEach(toggle => {
            toggle.classList.remove('active');
        });
    });
    
    // Update toggle states - if no filter is set, default to "all"
    toggleTypes.forEach(type => {
        const toggleClass = type.replace('Type', '-toggle');
        const dataAttr = type.replace('Type', '');
        
        if (activeFilters[type] && activeFilters[type] !== 'all') {
            // Add active class to the correct toggle
            const activeToggle = document.querySelector(`[data-${dataAttr}="${activeFilters[type]}"]`);
            if (activeToggle) {
                activeToggle.classList.add('active');
            }
        } else {
            // Default to "all" toggle if no filter is set
            const allToggle = document.querySelector(`[data-${dataAttr}="all"]`);
            if (allToggle) {
                allToggle.classList.add('active');
            }
        }
    });
    
    // Restore price range values
    const minPriceRange = document.getElementById('minPriceRange');
    const maxPriceRange = document.getElementById('maxPriceRange');
    const minPriceValue = document.getElementById('minPriceValue');
    const maxPriceValue = document.getElementById('maxPriceValue');
    const priceRangeContainer = document.getElementById('priceRangeContainer');
    
    if (activeFilters.minPrice !== undefined && activeFilters.maxPrice !== undefined) {
        if (minPriceRange) minPriceRange.value = activeFilters.minPrice;
        if (maxPriceRange) maxPriceRange.value = activeFilters.maxPrice;
        if (minPriceValue) minPriceValue.textContent = `€${activeFilters.minPrice}`;
        if (maxPriceValue) maxPriceValue.textContent = `€${activeFilters.maxPrice}`;
    } else {
        // Default values
        if (minPriceRange) minPriceRange.value = 0;
        if (maxPriceRange) maxPriceRange.value = 100;
        if (minPriceValue) minPriceValue.textContent = '€0';
        if (maxPriceValue) maxPriceValue.textContent = '€100';
    }
    
    // Update price slider fill
    updatePriceSliderFill();
    
    // Show/hide price range container based on price type
    if (priceRangeContainer) {
        if (activeFilters.priceType === 'paid') {
            priceRangeContainer.style.display = 'block';
        } else {
            priceRangeContainer.style.display = 'none';
        }
    }
    
    // Restore rating filter
    const ratingText = document.getElementById('ratingText');
    const ratingStars = document.querySelectorAll('.rating-star-filter');
    
    // Reset all stars first
    ratingStars.forEach(star => {
        star.classList.remove('active');
        star.style.color = '#d1d5db';
    });
    
    if (activeFilters.rating) {
        const rating = parseInt(activeFilters.rating);
        for (let i = 0; i < rating; i++) {
            if (ratingStars[i]) {
                ratingStars[i].classList.add('active');
                ratingStars[i].style.color = '#fbbf24';
            }
        }
        if (ratingText) {
            ratingText.textContent = `${rating} stelle`;
        }
    } else {
        if (ratingText) {
            ratingText.textContent = 'Qualsiasi rating';
        }
    }
    
    // Update dropdown option visual states
    dropdownTypes.forEach(type => {
        const optionsContainer = document.getElementById(`${type}Options`);
        if (optionsContainer) {
            const options = optionsContainer.querySelectorAll('.dropdown-option');
            options.forEach(option => {
                option.classList.remove('selected');
            });
            
            if (activeFilters[type]) {
                const selectedOptions = Array.isArray(activeFilters[type]) ? activeFilters[type] : [activeFilters[type]];
                selectedOptions.forEach(selectedValue => {
                    const selectedOption = optionsContainer.querySelector(`[data-value="${selectedValue}"]`);
                    if (selectedOption) {
                        selectedOption.classList.add('selected');
                    }
                });
            }
        }
    });
    
    // Close all dropdowns and suggestion containers
    closeAllDropdowns();
    document.querySelectorAll('.author-suggestions, .autocomplete-suggestions').forEach(suggestions => {
        suggestions.classList.remove('show');
    });
    document.querySelectorAll('.author-container').forEach(container => {
        container.classList.remove('open');
    });
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showStatus('Logout effettuato con successo');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// ===========================
// EVENT LISTENERS
// ===========================

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const userIcon = document.getElementById('userIcon');

    if (searchBtn) {
        searchBtn.addEventListener('click', async function() {
            await performSearch(searchInput.value);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', async function(e) {
            if (e.key === 'Enter') {
                await performSearch(searchInput.value);
            }
        });

        // Real-time search with debounce
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                if (!this.value.trim()) {
                    // If search is cleared, apply current filters or show all
                    if (Object.keys(activeFilters).length > 0) {
                        await applyFiltersAndRender();
                } else {
                        await loadAllFiles();
                    }
                } else if (this.value.length >= 2) {
                    // Only search when at least 2 characters
                    await performSearch(this.value);
                }
            }, 300);
        });
    }

    if (uploadBtn) {
        uploadBtn.addEventListener('click', function() {
            showStatus('Reindirizzamento alla pagina di upload... 📤');
            setTimeout(() => {
                window.location.href = 'upload.html';
            }, 1000);
        });
    }

    if (userIcon) {
        userIcon.addEventListener('click', function() {
            if (confirm('Sei sicuro di voler effettuare il logout?')) {
                logout();
            }
        });
    }

    // Close modal when clicking outside
    const previewModal = document.getElementById('previewModal');
    if (previewModal) {
        previewModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closePreview();
            }
        });
    }

    // Smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();
});

function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + F to focus search (prevent default browser search)
        if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !e.shiftKey) {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Ctrl/Cmd + Shift + F to open filters
        if ((e.ctrlKey || e.metaKey) && e.key === 'F' && e.shiftKey) {
            e.preventDefault();
            toggleFiltersPanel();
        }
        
        // Ctrl/Cmd + Alt + C to clear all filters
        if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'c') {
            e.preventDefault();
            clearAllFiltersAction();
        }
        
        // Escape to close filters or preview
        if (e.key === 'Escape') {
            e.preventDefault();
            if (isFiltersOpen) {
                closeFiltersPanel();
            } else {
                const previewModal = document.getElementById('previewModal');
                if (previewModal && previewModal.classList.contains('active')) {
                    closePreview();
                }
            }
        }
    });
}

        // ===========================
// GLOBAL UTILITIES
        // ===========================

// Make functions globally available for onclick handlers
window.previewDocument = previewDocument;
window.closePreview = closePreview;
window.downloadDocument = downloadDocument;
window.purchaseDocument = purchaseDocument;
window.toggleFavorite = toggleFavorite;
window.removeFilter = removeFilter;
window.clearAllFiltersAction = clearAllFiltersAction;
window.clearAllFiltersAction = clearAllFiltersAction;

async function openQuickLook(vetrina) {
    // Prevent multiple modals
    if (document.getElementById('quick-look-overlay')) return;

    const modalHTML = `
        <div id="quick-look-overlay" class="quick-look-overlay">
            <div class="quick-look-modal">
                <button class="quick-look-close-button">&times;</button>
                <div class="quick-look-header">
                    <div class="quick-look-header-content">
                        <h2 class="quick-look-title">${vetrina.title || vetrina.name}</h2>
                        <p class="quick-look-description">${vetrina.description || ''}</p>
                        <div class="quick-look-meta">
                            <span class="quick-look-file-count">Caricamento...</span>
                            <span class="quick-look-separator">•</span>
                            <span class="quick-look-author">Caricato da ${vetrina.author_username || 'Unknown'}</span>
                        </div>
                    </div>
                    <div class="quick-look-actions">
                        <button class="quick-look-view-full-btn" data-action="view-full-document" data-doc-id="${vetrina.id}">
                            <span class="material-symbols-outlined">open_in_new</span>
                            Visualizza Pagina Completa
                        </button>
                    </div>
                </div>
                <div class="quick-look-body">
                    <div class="quick-look-main-preview">
                        <div class="preview-placeholder">
                            <span class="material-symbols-outlined">visibility</span>
                            <p>Caricamento file...</p>
                        </div>
                    </div>
                    <div class="quick-look-sidebar">
                        <div class="quick-look-sidebar-header">
                            <h3>File nella Vetrina</h3>
                        </div>
                        <ul class="quick-look-file-list">
                            <li class="quick-look-loading">
                                <div class="loading-spinner"></div>
                                <span>Caricamento file...</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const overlay = document.getElementById('quick-look-overlay');
    const modal = overlay.querySelector('.quick-look-modal');
    const closeButton = overlay.querySelector('.quick-look-close-button');
    const fileList = overlay.querySelector('.quick-look-file-list');

    // Load files if not already loaded
    if (!vetrina.filesLoaded) {
        try {
            const fileData = await loadVetrinaFiles(vetrina.id);
            if (fileData && fileData.files.length > 0) {
                // Update the vetrina object with loaded data
                vetrina.files = fileData.files;
                vetrina.fileCount = fileData.fileCount;
                vetrina.size = fileData.totalSize;
                vetrina.price = fileData.totalPrice;
                vetrina.download_count = fileData.totalDownloads;
                vetrina.document_types = fileData.documentTypes;
                vetrina.document_type = fileData.fileCount > 1 ? 'BUNDLE' : fileData.documentTypes[0] || 'FILE';
                vetrina.owned = fileData.owned;
                vetrina.tags = fileData.tags;
                vetrina.primary_tag = fileData.primaryTag;
                vetrina.filesLoaded = true;
                vetrina.filename = fileData.fileCount > 1 ? `${fileData.fileCount} files` : fileData.files[0].filename;
                
                // Update the UI to show the new tags
                updateDocumentCardTags(vetrina.id, fileData.tags);
            } else {
                // Show error state
                fileList.innerHTML = '<li class="quick-look-error">Nessun file trovato</li>';
                return;
            }
        } catch (error) {
            console.error(`Error loading files for quick look:`, error);
            fileList.innerHTML = '<li class="quick-look-error">Errore nel caricamento dei file</li>';
            return;
        }
    }

    // Update file count in header
    const fileCountElement = overlay.querySelector('.quick-look-file-count');
    if (fileCountElement) {
        fileCountElement.textContent = `${vetrina.files.length} file${vetrina.files.length !== 1 ? 's' : ''}`;
    }

    // Clear loading state and populate file list
    fileList.innerHTML = '';
    vetrina.files.forEach((file, index) => {
        const fileItem = document.createElement('li');
        fileItem.className = 'quick-look-file-item';
        fileItem.dataset.index = index;
        
        // Get file type and size
        const fileType = getFileTypeFromFilename(file.filename);
        const fileSize = formatFileSize(file.size || 0);
        
        fileItem.innerHTML = `
            <div class="file-item-icon">${getDocumentPreviewIcon(file.filename)}</div>
            <div class="file-item-content">
                <div class="file-item-name" title="${file.filename}">${file.filename}</div>
                <div class="file-item-details">
                    <span class="file-item-type">${fileType}</span>
                    <span class="file-item-separator">•</span>
                    <span class="file-item-size">${fileSize}</span>
                </div>
            </div>
        `;
        fileList.appendChild(fileItem);
    });
    
    // Show first file by default
    switchQuickLookPreview(vetrina, 0);

    // Event listeners
    closeButton.addEventListener('click', closeQuickLook);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeQuickLook();
        }
    });
    fileList.addEventListener('click', (e) => {
        const item = e.target.closest('.quick-look-file-item');
        if (item) {
            switchQuickLookPreview(vetrina, parseInt(item.dataset.index, 10));
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', handleQuickLookKeyboard);

    // Animate in
    setTimeout(() => overlay.classList.add('visible'), 10);
}

function closeQuickLook() {
    const overlay = document.getElementById('quick-look-overlay');
    if (overlay) {
        // Remove keyboard event listener
        document.removeEventListener('keydown', handleQuickLookKeyboard);
        
        overlay.classList.remove('visible');
        overlay.addEventListener('transitionend', () => {
            overlay.remove();
        }, { once: true });
    }
}

function switchQuickLookPreview(vetrina, index) {
    const file = vetrina.files[index];
    if (!file) return;

    const previewContainer = document.querySelector('.quick-look-main-preview');
    const fileListItems = document.querySelectorAll('.quick-look-file-list .quick-look-file-item');

    // Get file type and size
    const fileType = getFileTypeFromFilename(file.filename);
    const fileSize = formatFileSize(file.size || 0);

    // Update preview content
    previewContainer.innerHTML = `
        <div class="preview-content-area">
            <div class="preview-icon-large">${getDocumentPreviewIcon(file.filename)}</div>
            <h3 class="preview-filename" title="${file.filename}">${file.filename}</h3>
            <div class="preview-file-details">
                <span class="preview-file-type">${fileType}</span>
                <span class="preview-file-separator">•</span>
                <span class="preview-file-size">${fileSize}</span>
            </div>
            <div class="preview-file-info">
                <p class="preview-file-description">
                    ${file.description || 'Nessuna descrizione disponibile'}
                </p>
            </div>
        </div>
    `;

    // Update active class in file list
    fileListItems.forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
}

function handleQuickLookKeyboard(e) {
    const overlay = document.getElementById('quick-look-overlay');
    if (!overlay) return;

    switch (e.key) {
        case 'Escape':
            closeQuickLook();
            break;
        case 'ArrowDown':
            e.preventDefault();
            navigateQuickLookFile(1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            navigateQuickLookFile(-1);
            break;
    }
}

function navigateQuickLookFile(direction) {
    const activeItem = document.querySelector('.quick-look-file-item.active');
    if (!activeItem) return;

    const currentIndex = parseInt(activeItem.dataset.index, 10);
    const fileList = document.querySelectorAll('.quick-look-file-item');
    const newIndex = (currentIndex + direction + fileList.length) % fileList.length;
    
    const newItem = document.querySelector(`[data-index="${newIndex}"]`);
    if (newItem) {
        newItem.click();
        newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}



// ===========================
// PROFESSIONAL SCROLL TO TOP FUNCTIONALITY
// ===========================

function initializeScrollToTop() {
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    if (!scrollToTopBtn) return;

    let scrollThreshold = 300; // Show button after scrolling 300px
    let isScrolling = false;
    let scrollTimeout;

    // Show/hide button based on scroll position
    function handleScroll() {
        const scrollY = window.scrollY || window.pageYOffset;
        
        if (scrollY > scrollThreshold) {
            if (!scrollToTopBtn.classList.contains('visible')) {
                scrollToTopBtn.classList.add('visible');
                // Add pulse animation for first appearance
                setTimeout(() => {
                    scrollToTopBtn.classList.add('pulse');
                    setTimeout(() => {
                        scrollToTopBtn.classList.remove('pulse');
                    }, 1000); // Reduced pulse duration for faster feedback
                }, 25); // Reduced delay for immediate response
            }
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    }

    // Smooth scroll to top using native smooth scrolling
    function scrollToTop() {
        // Remove pulse animation if active
        scrollToTopBtn.classList.remove('pulse');
        
        // Use native smooth scrolling for better performance and smoother animation
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // Event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    scrollToTopBtn.addEventListener('click', scrollToTop);
    
    // Keyboard accessibility
    scrollToTopBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            scrollToTop();
        }
    });

    // Touch device optimizations
    if ('ontouchstart' in window) {
        scrollToTopBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            scrollToTopBtn.style.transform = 'scale(0.95)';
        }, { passive: false });
        
        scrollToTopBtn.addEventListener('touchend', () => {
            scrollToTopBtn.style.transform = '';
        });
    }

    // Adjust threshold based on viewport height
    function adjustScrollThreshold() {
        const viewportHeight = window.innerHeight;
        scrollThreshold = Math.max(200, viewportHeight * 0.3); // At least 200px, or 30% of viewport
    }

    // Initial adjustment and on resize
    adjustScrollThreshold();
    window.addEventListener('resize', adjustScrollThreshold);

    // Performance optimization: throttle scroll events for better performance
    let ticking = false;
    
    function throttledHandleScroll() {
        if (!ticking) {
            requestAnimationFrame(() => {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    }

    // Use throttled version for all devices for better performance
    window.addEventListener('scroll', throttledHandleScroll, { passive: true });

    throttledHandleScroll(); // Initial check
}

// Initialize scroll to top functionality when page loads
document.addEventListener('DOMContentLoaded', initializeScrollToTop);

// ===========================
// DYNAMIC BACKGROUND POSITIONING
// ===========================

// Global variable to store image dimensions for immediate access
let bgImageDimensions = null;

// Preload and cache image dimensions immediately
function preloadBackgroundImage() {
    const tempImage = new Image();
    tempImage.src = 'images/bg.png';
    
    const storeImageDimensions = () => {
        if (tempImage.naturalWidth > 0 && tempImage.naturalHeight > 0) {
            bgImageDimensions = {
                width: tempImage.naturalWidth,
                height: tempImage.naturalHeight,
                aspectRatio: tempImage.naturalWidth / tempImage.naturalHeight
            };
            // Position immediately if DOM elements are ready
            adjustBackgroundPosition();
        }
    };
    
    if (tempImage.complete && tempImage.naturalWidth > 0) {
        storeImageDimensions();
    } else {
        tempImage.onload = storeImageDimensions;
        tempImage.onerror = () => console.error("Background image failed to load");
    }
}

function adjustBackgroundPosition() {
    const bgElement = document.querySelector('.background-image');
    const title = document.querySelector('.search-title');
    const searchContainer = document.querySelector('.search-container');

    if (!bgElement || !title || !searchContainer) {
        return;
    }

    // If we don't have image dimensions yet, try to get them
    if (!bgImageDimensions) {
        const tempImage = new Image();
        tempImage.src = 'images/bg.png';
        
        if (tempImage.complete && tempImage.naturalWidth > 0) {
            bgImageDimensions = {
                width: tempImage.naturalWidth,
                height: tempImage.naturalHeight,
                aspectRatio: tempImage.naturalWidth / tempImage.naturalHeight
            };
        } else {
            // Image not ready yet, will be called again when it loads
            return;
        }
    }

    const calculatePosition = () => {
        const imageAspectRatio = bgImageDimensions.aspectRatio;

        // Calculate the rendered height of the background based on viewport width + 2px
        const bgWidth = window.innerWidth + 2;
        const bgRenderedHeight = bgWidth / imageAspectRatio;

        // Set the container's height to match the image's rendered height
        bgElement.style.height = `${bgRenderedHeight}px`;

        // Find the page anchor's Y-coordinate relative to the document
        const scrollY = window.scrollY;
        const titleRect = title.getBoundingClientRect();
        const searchRect = searchContainer.getBoundingClientRect();
        const pageAnchorY = scrollY + titleRect.bottom + (searchRect.top - titleRect.bottom) / 2;

        // Calculate the image's internal anchor point in pixels (50% from the top)
        const imageAnchorInPixels = bgRenderedHeight * 0.50;

        // Calculate the final 'top' offset for the element.
        // This makes the image's anchor line up with the page's anchor.
        const finalTopOffset = pageAnchorY - imageAnchorInPixels;
        
        bgElement.style.top = `${finalTopOffset}px`;
    };

    calculatePosition();
}

// Debounce function to limit how often a function can run.
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Start preloading image immediately - even before DOM is ready
preloadBackgroundImage();

// Initialize background positioning immediately when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Position immediately when DOM is ready
    adjustBackgroundPosition();
});

// Also run on window load to ensure everything is fully loaded
window.addEventListener('load', adjustBackgroundPosition);

// Add event listeners for dynamic background
window.addEventListener('resize', debounce(adjustBackgroundPosition, 50));



function initializeStickySearch() {
    const searchContainerWrapper = document.querySelector('.search-container-wrapper');
    const header = document.querySelector('.header');
    
    if (!searchContainerWrapper || !header) {
        return;
    }

    function setStickyTop() {
        const headerHeight = header.offsetHeight;
        const searchContainer = searchContainerWrapper.querySelector('.search-container');
        const searchContainerHeight = searchContainer.offsetHeight;
        
        // Make the search bar stick at the top of the header (0px)
        // Then use CSS to center it within the header area
        const stickyTopValue = 0;
        
        // Use a more robust way to set the custom property on the root.
        document.documentElement.style.setProperty('--sticky-top-offset', `${stickyTopValue}px`);
    }

    // This observer will watch the sticky element itself.
    // It triggers when the element's position changes from 'relative' to 'sticky' (stuck) and back.
    const observer = new IntersectionObserver(
        ([e]) => {
            // e.intersectionRatio < 1 means the element is "stuck" at the top or bottom of its container.
            // We only care about when it's stuck at the top.
            if (e.boundingClientRect.top <= parseFloat(getComputedStyle(e.target).top)) {
                 e.target.classList.toggle('is-stuck', e.intersectionRatio < 1);
            }
        },
        { threshold: [1.0] } // Trigger when the element is fully in view (unstuck) or not (stuck).
    );

    // Start observing the wrapper.
    observer.observe(searchContainerWrapper);

    // Set the initial value and update on resize.
    setStickyTop();
    window.addEventListener('resize', setStickyTop);
}

document.addEventListener('DOMContentLoaded', initializeStickySearch);

// Font Loading Detection Script (moved from vendor-page.html for CSP compliance)
function showIconsImmediately() {
    document.querySelectorAll('.material-symbols-outlined').forEach(function(element) {
        element.style.visibility = 'visible';
        element.style.opacity = '1';
    });
}

// Show icons immediately on page load
showIconsImmediately();

// Update when fonts are ready
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() {
        if (document.fonts.check('1em "Material Symbols Outlined"')) {
            showIconsImmediately();
        }
    });
}

// Additional check after a short delay to ensure icons are visible
setTimeout(showIconsImmediately, 50);

// Add event listener for preview close button (replaces inline onclick)
document.addEventListener('DOMContentLoaded', function() {
    const previewCloseBtn = document.getElementById('previewCloseBtn');
    if (previewCloseBtn) {
        previewCloseBtn.addEventListener('click', closePreview);
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
function initializeReviewsOverlay() {
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

// Open reviews overlay for a specific vetrina
async function openReviewsOverlay(vetrinaId) {
    currentVetrinaForReviews = vetrinaId;
    const overlay = document.getElementById('reviewsOverlay');
    
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Show initial rating data instantly from search results
        showInitialRatingData(vetrinaId);
        
        // Load detailed reviews data in background
        await loadReviewsForVetrina(vetrinaId);
        updateReviewsOverlay();
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
        
        // Show loading for reviews list
        reviewsList.innerHTML = `
            <div class="reviews-loading">
                <div class="loading-spinner"></div>
                <p>Caricamento recensioni...</p>
            </div>
        `;
        
        // Hide add review button until we load user data
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

// Load reviews for a specific vetrina
async function loadReviewsForVetrina(vetrinaId) {
    try {
        
        const token = localStorage.getItem('authToken');
        
        // Get current user info for debugging
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add Authorization header only if token exists
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}/vetrine/${vetrinaId}/reviews`, {
            method: 'GET',
            headers: headers
        });

        if (response.ok) {
            const data = await response.json();
            currentReviews = data.reviews || [];
            currentUserReview = data.user_review || null;
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
        currentReviews = [];
        currentUserReview = null;
    }
}

// Update the reviews overlay content
function updateReviewsOverlay() {
    const reviewsList = document.getElementById('reviewsList');
    const bigRatingScore = document.querySelector('.big-rating-score');
    const totalReviews = document.querySelector('.total-reviews');
    const bigStars = document.querySelector('.big-stars');
    const addReviewBtn = document.querySelector('[data-action="show-review-form"]');

    if (!reviewsList || !bigRatingScore || !totalReviews || !bigStars || !addReviewBtn) return;

    // Calculate average rating
    const totalRating = currentReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = currentReviews.length > 0 ? (totalRating / currentReviews.length).toFixed(1) : '0.0';
    
    // Update summary
    bigRatingScore.textContent = averageRating;
    totalReviews.textContent = `Basato su ${currentReviews.length} recensioni`;
    
    // Update stars
    bigStars.innerHTML = generateFractionalStars(parseFloat(averageRating));
    
    // Show/hide add review button based on authentication and whether user has already reviewed
    const token = localStorage.getItem('authToken');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (!token || !currentUser) {
        // User not authenticated - hide add review button
        addReviewBtn.style.display = 'none';
    } else {
        // Check if user has already reviewed using frontend comparison
        const hasUserReviewed = currentReviews.some(review => 
            review.user?.user_id === currentUser.user_id
        );
        
        if (hasUserReviewed) {
            // User already reviewed - hide add review button
            addReviewBtn.style.display = 'none';
        } else {
            // User authenticated but hasn't reviewed - show add review button
            addReviewBtn.style.display = 'flex';
        }
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
                                review.user?.username || 'user'
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
        showError('Seleziona una valutazione prima di inviare la recensione.');
        return;
    }

    const comment = document.getElementById('reviewComment').value.trim();
    if (!comment) {
        showError('Inserisci un commento per la tua recensione.');
        return;
    }

    try {
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            showError('Sessione scaduta. Effettua nuovamente l\'accesso.');
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
            showStatus(message, 'success');
            hideAddReviewForm();
            
            // Get current user info
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            
            // Create a proper review object using backend response data
            const newReview = {
                rating: parseInt(selectedRating),
                review_text: comment,
                review_date: new Date().toISOString(),
                user: currentUser,
                // Add any additional fields that might be expected by the UI
                review_id: data.review?.review_id || Date.now(), // Use backend ID or fallback
                review_subject: data.review?.review_subject || null
            };
            
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
            
            // Update vendor banner rating if we're on vendor page
            if (window.location.pathname.includes('vendor-page.html')) {
                // Recalculate average rating for vendor banner
                const totalRating = currentReviews.reduce((sum, review) => sum + review.rating, 0);
                const averageRating = currentReviews.length > 0 ? (totalRating / currentReviews.length) : 0;
                
                // Update vendor banner with new rating
                updateVendorBannerRating(averageRating, currentReviews.length);
            }
        } else if (response.status === 401) {
            console.error('Authentication failed');
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            showError('Sessione scaduta. Effettua nuovamente l\'accesso.');
            return;
        } else {
            const errorData = await response.json();
            showError(errorData.message || 'Errore nell\'invio della recensione.');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showError('Errore di connessione. Riprova più tardi.');
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
        showError('Sessione scaduta. Effettua nuovamente l\'accesso.');
        return;
    }

    if (!confirm('Sei sicuro di voler eliminare la tua recensione?')) {
        return;
    }

    try {
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            showError('Sessione scaduta. Effettua nuovamente l\'accesso.');
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
            showStatus('Recensione eliminata con successo!', 'success');
            
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
            
            // Update vendor banner rating if we're on vendor page
            if (window.location.pathname.includes('vendor-page.html')) {
                // Recalculate average rating for vendor banner
                const totalRating = currentReviews.reduce((sum, review) => sum + review.rating, 0);
                const averageRating = currentReviews.length > 0 ? (totalRating / currentReviews.length) : 0;
                
                // Update vendor banner with new rating
                updateVendorBannerRating(averageRating, currentReviews.length);
            }
        } else if (response.status === 401) {
            console.error('Authentication failed');
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            showError('Sessione scaduta. Effettua nuovamente l\'accesso.');
            return;
        } else {
            const errorData = await response.json();
            showError(errorData.message || 'Errore nell\'eliminazione della recensione.');
        }
    } catch (error) {
        console.error('Error deleting review:', error);
        showError('Errore di connessione. Riprova più tardi.');
    }
}

// Update vendor banner rating
function updateVendorBannerRating(averageRating, reviewCount) {
    console.log('updateVendorBannerRating called with:', {
        averageRating: averageRating,
        averageRatingType: typeof averageRating,
        reviewCount: reviewCount,
        reviewCountType: typeof reviewCount
    });
    
    const vendorRatingBtn = document.getElementById('vendorRatingBtn');
    if (vendorRatingBtn) {
        const ratingStars = vendorRatingBtn.querySelector('.vendor-banner-rating-stars');
        const ratingText = vendorRatingBtn.querySelector('.vendor-rating-text');
        
        if (ratingStars && ratingText) {
            console.log('Updating vendor banner rating:', averageRating, reviewCount);
            
            // Clear existing content
            ratingStars.innerHTML = '';
            
            // Generate new stars
            const stars = generateVendorBannerStars(averageRating);
            console.log('Generated stars HTML:', stars);
            
            // Update the stars container
            ratingStars.innerHTML = stars;
            
            // Update the rating text
            ratingText.textContent = `${averageRating.toFixed(1)} (${reviewCount})`;
            
            // Force immediate reflow
            ratingStars.offsetHeight;
            
            // Ensure all stars are visible and properly styled
            setTimeout(() => {
                const starElements = ratingStars.querySelectorAll('.vendor-banner-rating-star');
                console.log('Found star elements:', starElements.length);
                
                starElements.forEach((star, index) => {
                    // Ensure proper display
                    star.style.display = 'inline-block';
                    star.style.visibility = 'visible';
                    star.style.opacity = '1';
                    
                    // For partial stars, ensure the CSS custom property is set
                    if (star.classList.contains('partial')) {
                        const fillPercentage = star.style.getPropertyValue('--fill-percentage');
                        console.log(`Star ${index + 1} partial fill: ${fillPercentage}`);
                    }
                });
                
                // Force another reflow to ensure all styles are applied
                ratingStars.offsetHeight;
                
                // Log the final state
                console.log('Final stars HTML:', ratingStars.innerHTML);
                console.log('Final stars computed styles:', Array.from(starElements).map(star => ({
                    classes: star.className,
                    color: getComputedStyle(star).color,
                    fillPercentage: star.style.getPropertyValue('--fill-percentage')
                })));
            }, 10);
        }
    }
}

// Update vetrina rating in search results
function updateVetrinaRatingInSearch(vetrinaId) {
    const ratingElements = document.querySelectorAll(`[data-vetrina-id="${vetrinaId}"] .rating-badge`);
    
    // Calculate average rating from current reviews
    console.log('updateVetrinaRatingInSearch - currentReviews:', currentReviews);
    
    const totalRating = currentReviews.reduce((sum, review) => {
        console.log('updateVetrinaRatingInSearch - review:', review, 'rating:', review.rating);
        return sum + (review.rating || 0);
    }, 0);
    
    const averageRating = currentReviews.length > 0 ? (totalRating / currentReviews.length) : 0;
    const reviewCount = currentReviews.length;
    
    console.log('updateVetrinaRatingInSearch - totalRating:', totalRating, 'averageRating:', averageRating, 'reviewCount:', reviewCount);
    
    ratingElements.forEach(element => {
        const ratingScore = element.querySelector('.rating-score');
        const ratingStars = element.querySelector('.rating-stars');
        const ratingCount = element.querySelector('.rating-count');
        
        if (ratingScore) ratingScore.textContent = averageRating.toFixed(1);
        if (ratingStars) ratingStars.innerHTML = generateFractionalStars(averageRating);
        if (ratingCount) ratingCount.textContent = `(${reviewCount})`;
    });
}

// Initialize reviews overlay when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeReviewsOverlay();
});