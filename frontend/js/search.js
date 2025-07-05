const API_BASE = 'http://146.59.236.26:5000';
let authToken = localStorage.getItem('authToken');

// Check if user is authenticated, redirect to login if not
function checkAuthentication() {
    if (!authToken) {
        console.log('No auth token found, redirecting to login');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

let currentVetrine = [];
let currentFiles = [];
let originalFiles = []; // Keep original unfiltered data
let activeFilters = {};
let isFiltersOpen = false;

    // Initialize the page
    window.onload = async function() {
        console.log('🚀 Page loading started...');
        
        // Loading state is already set in HTML for immediate display
        // This ensures layout stability even on first load with empty cache
        console.log('✅ Loading state already present in HTML - no layout shift will occur');
        
        // Check authentication after showing loading state
        if (!checkAuthentication()) {
            console.log('❌ Authentication failed, redirecting...');
            return; // Stop execution if not authenticated
        }
        
        console.log('✅ Authentication passed, initializing page...');
        
        // Initialize user info and logout button
        initializeUserInfo();
        
        console.log('📱 Loading files and initializing components...');
        initializeAnimations();
        initializeFilters();
        initializeScrollToTop();
        
        // Load files first, then restore filters
        await loadAllFiles();
        
        // Ensure documents are shown after loading
        if (originalFiles && originalFiles.length > 0) {
            console.log('Initial load complete, showing all documents');
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
                        console.log('Safety check: No documents shown, displaying all documents');
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
            console.log('🧪 Manual loading test triggered!');
            
        }
        
        // Add keyboard shortcut to clear all filters (Ctrl/Cmd + Alt + C)
        if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'c') {
            e.preventDefault();
            console.log('🧹 Manual clear all filters triggered!');
            clearAllFiltersAction();
        }
        
        // Add keyboard shortcut to debug filter state (Ctrl/Cmd + Alt + D)
        if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'd') {
            e.preventDefault();
            console.log('🔍 Debug filter state:');
            console.log('Active filters:', activeFilters);
            console.log('Active filters count:', Object.keys(activeFilters).length);
            console.log('Original files count:', originalFiles ? originalFiles.length : 'undefined');
            console.log('Current files count:', currentFiles ? currentFiles.length : 'undefined');
        }
    });
    
    // Add a single, reliable event listener to refresh favorites when the page is shown.
    window.addEventListener('pageshow', (event) => {
        console.log('📄 Pageshow event triggered:', { persisted: event.persisted, favoritesChanged: sessionStorage.getItem('favoritesChanged') });
        // This event fires on initial load and when navigating back to the page.
        const favoritesChanged = sessionStorage.getItem('favoritesChanged');
        
        if (favoritesChanged === 'true') {
            console.log('🔄 Favorites changed on another page, refreshing status...');
            sessionStorage.removeItem('favoritesChanged'); // Clear the flag
            refreshFavoriteStatus();
        } else if (event.persisted) {
            // event.persisted is true if the page was restored from the back-forward cache.
            console.log('🔄 Page restored from cache, refreshing favorite status...');
            refreshFavoriteStatus();
        }
    });
    
    // Mark when we're leaving the page
    let isLeavingPage = false;
    window.addEventListener('beforeunload', () => {
        isLeavingPage = true;
    });
    
    // Check if we're returning to the page and refresh favorites
    window.addEventListener('pageshow', async (event) => {
        if (isLeavingPage && currentFiles && currentFiles.length > 0) {
            console.log('🔄 Returning to page, refreshing favorite status...');
            isLeavingPage = false;
            setTimeout(async () => {
                await refreshFavoriteStatus();
            }, 200);
        }
    });
    
    // Handle browser back/forward navigation
    window.addEventListener('popstate', async (event) => {
        if (currentFiles && currentFiles.length > 0) {
            console.log('🔄 Browser navigation detected, refreshing favorite status...');
            setTimeout(async () => {
                await refreshFavoriteStatus();
            }, 100);
        }
    });
    
    console.log('✅ Page initialization complete!');
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

    // If cache is empty, handle as an auth error
    logout();
    return null;
}

function updateHeaderUserInfo(user) {
    if (!user) return;
    const userInfo = document.querySelector('.user-info');
    if (!userInfo) return;

    const userAvatar = userInfo.querySelector('.user-avatar');
    const userName = userInfo.querySelector('.user-name');
    const logoutBtn = userInfo.querySelector('.logout-btn');

    if (userAvatar) {
        // Keep the SVG icon instead of showing initials
        // The SVG is already in the HTML, so we don't need to modify it
    }
    
    if (userName) {
        userName.textContent = user.username || 'User';
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Sei sicuro di voler effettuare il logout?')) {
                logout();
            }
        });
    }
}

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
    // Author autocomplete (with overlay suggestions)
    initializeAuthorFilter();
    
    // Professional dropdowns (includes all dropdown types now)
    setupDropdowns();

    // Rating filter
    initializeRatingFilter();
    
    // Toggle group filters
    initializeToggleFilters();
    
    // Price range filters
    initializePriceRangeFilter();
}

function handleFilterChangeImmediate(e) {
    // This function is no longer needed since we're using professional dropdowns
    // All filter changes are now handled through the dropdown system
}

function initializeAuthorFilter() {
    const authorContainer = document.querySelector('.author-container');
    const authorInput = document.getElementById('autoreFilter');
    const authorSuggestions = document.getElementById('authorSuggestions');
    const authorOptions = document.getElementById('authorOptions');
    let authors = [];
    let selectedIndex = -1;
    let isAuthorOpen = false;
    
    if (!authorInput || !authorSuggestions || !authorOptions) return;
    
    // Handle author filter label click - close suggestions if open, do nothing if closed
    const authorLabel = document.querySelector('label[for="autoreFilter"]');
    if (authorLabel) {
        authorLabel.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isAuthorOpen) {
                hideSuggestions();
            }
            // Do nothing if suggestions are closed
        });
    }
    
    // Extract authors from files
    function updateAuthors() {
        if (originalFiles.length > 0) {
            authors = [...new Set(originalFiles.map(f => 
                f.author_username || f.vetrina_info?.owner_username
            ).filter(Boolean))].sort();
        }
    }
    
    authorInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        updateAuthors();
        
        if (query.length === 0) {
            hideSuggestions();
            // Only clear the filter if the user manually clears the input
            if (activeFilters.author) {
                delete activeFilters.author;
                triggerFilterUpdate();
            }
            return;
        }
        
        // Reset scroll to top when typing
        if (isAuthorOpen) {
            authorOptions.scrollTop = 0;
        }
        
        const filteredAuthors = authors.filter(author => 
            author.toLowerCase().includes(query)
        );
        
        showSuggestions(filteredAuthors, query);
        selectedIndex = -1;
    });
    
    // Don't show suggestions on focus, only when typing
    authorInput.addEventListener('focus', (e) => {
        // Only show if there's already text
        if (e.target.value.trim().length > 0) {
            const query = e.target.value.toLowerCase().trim();
            updateAuthors();
            const filteredAuthors = authors.filter(author => 
                author.toLowerCase().includes(query)
            );
            showSuggestions(filteredAuthors, query);
        }
    });
    
    authorInput.addEventListener('keydown', (e) => {
        const options = authorOptions.querySelectorAll('.author-option');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, options.length - 1);
            updateSelection(options);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSelection(options);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && options[selectedIndex]) {
                const authorText = options[selectedIndex].querySelector('span').textContent;
                selectAuthor(authorText);
            }
        } else if (e.key === 'Escape') {
            hideSuggestions();
        }
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.author-container')) {
            if (isAuthorOpen) {
                hideSuggestions();
                // Don't clear the input when clicking outside - preserve the filter
            }
        }
    });
    
    function showSuggestions(filteredAuthors, query) {
        // If an author filter is active, show only that author with an X to remove
        if (activeFilters.author && authorInput.value === activeFilters.author) {
            authorOptions.innerHTML = `
                <div class="author-option selected has-active-filter" data-value="${activeFilters.author}">
                    <span>${activeFilters.author}</span>
                    <i class="material-symbols-outlined dropdown-option-remove">close</i>
                </div>
            `;
            const removeBtn = authorOptions.querySelector('.dropdown-option-remove');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    authorInput.value = '';
                    delete activeFilters.author;
                    hideSuggestions();
                    triggerFilterUpdate();
                });
            }
            authorContainer.classList.add('open');
            isAuthorOpen = true;
            return;
        }
        // Default: show suggestions as before
        authorOptions.innerHTML = '';
        filteredAuthors.slice(0, 10).forEach(author => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'author-option';
            optionDiv.innerHTML = `
                <span>${author}</span>
                <span class="author-option-check">✓</span>
            `;
            optionDiv.addEventListener('click', () => selectAuthor(author));
            authorOptions.appendChild(optionDiv);
        });
        authorContainer.classList.add('open');
        isAuthorOpen = true;
    }
    
    function hideSuggestions() {
        authorContainer.classList.remove('open');
        isAuthorOpen = false;
        selectedIndex = -1;
    }
    
    function updateSelection(options) {
        options.forEach((option, index) => {
            option.classList.toggle('highlighted', index === selectedIndex);
        });
        
        // Scroll to highlighted option
        if (selectedIndex >= 0 && options[selectedIndex]) {
            options[selectedIndex].scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }
    
    function selectAuthor(author) {
        authorInput.value = author;
        activeFilters.author = author;
        hideSuggestions();
        triggerFilterUpdate();
    }
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
    let canali = ['A', 'B', 'C', 'D', 'E', 'F'];
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
                `<div class="autocomplete-suggestion" data-value="${canale}">Canale ${canale}</div>`
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
            const clickedAuthorContainer = e.target.closest('.author-container');
            
            if (!clickedDropdownInputWrapper && !clickedDropdownContent && !clickedAuthorContainer) {
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

async function loadHierarchyData() {
    if (window.facultyCoursesData) return;
    
    try {
        const data = await makeSimpleRequest('/hierarchy');
        
        // The backend returns data already in the correct format:
        // { "Faculty Name": [["course_code", "course_name"], ...], ... }
        if (data && typeof data === 'object') {
            window.facultyCoursesData = data;
            console.log('Loaded hierarchy data:', Object.keys(data).length, 'faculties');
        } else {
            console.warn('Unexpected hierarchy data format:', data);
            window.facultyCoursesData = {};
        }
    } catch (error) {
        console.error('Error loading hierarchy data:', error);
        window.facultyCoursesData = {};
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
    populateOptions('canale', ['A', 'B', 'C', 'D', 'E', 'F']);
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
        // Single-select behavior (for faculty, course, canale, author)
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
        items = ['A', 'B', 'C', 'D', 'E', 'F'];
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
        // Always show all tag options
        items = ['appunti', 'dispense', 'esercizi'];
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
    console.log('updateActiveFilterIndicators called, activeFilters:', { ...activeFilters });
    
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
        
        console.log(`Checking ${type}, filterKey: ${filterKey}, activeFilterValue: ${activeFilterValue}`);
        
        options.querySelectorAll('.dropdown-option').forEach(option => {
            const hasActiveFilter = activeFilterValue === option.dataset.value;
            option.classList.toggle('has-active-filter', hasActiveFilter);
        });
    });
    
    console.log('updateActiveFilterIndicators finished, activeFilters:', { ...activeFilters });
}

function removeFilterFromDropdown(type, filterKey) {
    console.log('=== REMOVE FILTER START ===');
    console.log('Removing filter:', type, filterKey, 'Current activeFilters:', { ...activeFilters });
    
    const input = document.getElementById(`${type}Filter`);
    const container = document.querySelector(`[data-dropdown="${type}"]`);
    
    // Clear the input
    input.value = '';
    container.classList.remove('open');
    
    // Remove from active filters
    delete activeFilters[filterKey];
    
    console.log('After removal, activeFilters:', { ...activeFilters });
    
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
    
    console.log('Before updateActiveFilterIndicators, activeFilters:', { ...activeFilters });
    
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
            
            console.log('Calling populateOptions with items:', items);
            // Call populateOptions directly with the items
            populateOptions(type, items);
        } else {
            // For dynamic dropdowns, refresh with current search term
            const searchTerm = input.value;
            filterDropdownOptions(type, searchTerm);
        }
        
        // Update active filter indicators in all dropdowns
        updateActiveFilterIndicators();
        
        console.log('Before applyFiltersAndRender, activeFilters:', { ...activeFilters });
        
        applyFiltersAndRender();
        saveFiltersToStorage();
        
        console.log('=== REMOVE FILTER END ===');
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

    // Size toggles
    const sizeToggles = document.querySelectorAll('.size-toggle');
    
    sizeToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            sizeToggles.forEach(t => t.classList.remove('active'));
            toggle.classList.add('active');
            
            const sizeType = toggle.dataset.size;
            
            if (sizeType === 'all') {
                delete activeFilters.sizeType;
            } else {
                activeFilters.sizeType = sizeType;
            }
            
            // Apply filters immediately
            applyFiltersAndRender();
            saveFiltersToStorage();
        });
    });

    // Time toggles
    const timeToggles = document.querySelectorAll('.time-toggle');
    
    timeToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            timeToggles.forEach(t => t.classList.remove('active'));
                toggle.classList.add('active');
            
            const timeType = toggle.dataset.time;
            
            if (timeType === 'all') {
                delete activeFilters.timeType;
            } else {
                activeFilters.timeType = timeType;
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

async function applyFiltersAndRender() {
    // Check if we have data loaded
    if (!originalFiles || originalFiles.length === 0) {
        console.log('No data loaded yet, loading files first...');
        await loadAllFiles();
        return;
    }
    
    // Check if we have backend-searchable filters (course_name, faculty_name) 
    // or if there's an active search query
    const searchInput = document.getElementById('searchInput');
    const currentQuery = searchInput?.value?.trim() || '';
    
    const hasBackendFilters = activeFilters.course_name || activeFilters.faculty_name;
    
    if (hasBackendFilters || currentQuery) {
        // Use backend search with filters
        await performSearch(currentQuery);
    } else if (Object.keys(activeFilters).length === 0) {
        // No filters active, show all original files
        console.log('No filters active, showing all documents');
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
            <button class="bottom-clear-all-btn" id="bottomClearAllButton" onclick="clearAllFiltersAction()">
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
    // Always get real hierarchy data from backend - don't depend on files
    try {
        const hierarchyResponse = await makeSimpleRequest('/hierarchy');
        if (hierarchyResponse) {
            // Store hierarchy for ALL faculties and courses
            window.facultyCoursesData = hierarchyResponse;
            console.log('Loaded hierarchy with', Object.keys(hierarchyResponse).length, 'faculties');
        }
    } catch (error) {
        console.error('Error loading hierarchy:', error);
        // Fallback to extract from files only if hierarchy fails
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
        
        // Author filter - case insensitive partial match
        if (activeFilters.author) {
            const fileAuthor = file.author_username || file.vetrina_info?.owner_username || '';
            if (!fileAuthor.toLowerCase().includes(activeFilters.author.toLowerCase())) {
                return false;
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
        
        // Size filter
        if (activeFilters.sizeType && activeFilters.sizeType !== 'all') {
            const fileSize = parseInt(file.size) || 0;
            const fileSizeMB = fileSize / (1024 * 1024);
            
            switch (activeFilters.sizeType) {
                case 'small':
                    if (fileSizeMB >= 5) return false;
                    break;
                case 'medium':
                    if (fileSizeMB < 5 || fileSizeMB > 20) return false;
                    break;
                case 'large':
                    if (fileSizeMB <= 20) return false;
                    break;
            }
        }
        
        // Time filter - publication date
        if (activeFilters.timeType && activeFilters.timeType !== 'all') {
            const fileDate = new Date(file.created_at);
            const now = new Date();
            const diffTime = now - fileDate;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            
            switch (activeFilters.timeType) {
                case 'week':
                    if (diffDays > 7) return false;
                    break;
                case 'month':
                    if (diffDays > 30) return false;
                    break;
                case 'year':
                    if (diffDays > 365) return false;
                    break;
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
                        itemValue = item === 'appunti' ? 'Appunti' : item === 'dispense' ? 'Dispense' : item === 'esercizi' ? 'Esercizi' : item;
                        break;
                }
                
                if (itemLabel && itemValue) {
                    filterPills.push(`
                        <div class="filter-pill" data-filter="${key}" data-value="${item}">
                            <span class="filter-pill-label">${itemLabel}:</span>
                            <span class="filter-pill-value">${itemValue}</span>
                            <span class="filter-pill-remove" onclick="removeActiveFilter('${key}', event, '${item}')"></span>
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
            case 'author':
                label = 'Autore';
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
            case 'sizeType':
                const sizeLabels = {
                    'small': '< 5MB',
                    'medium': '5-20MB',
                    'large': '> 20MB'
                };
                label = 'Dimensione';
                displayValue = sizeLabels[value];
                break;
            case 'timeType':
                const timeLabels = {
                    'week': 'Ultima settimana',
                    'month': 'Ultimo mese',
                    'year': 'Ultimo anno'
                };
                label = 'Periodo';
                displayValue = timeLabels[value];
                break;
            case 'vetrinaType':
                const vetrinaLabels = {
                    'single': 'Singolo File',
                    'multiple': 'Multi File'
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
                <div class="filter-pill" data-filter-key="${key}" onclick="removeActiveFilter('${key}', event)">
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
            <div class="filter-pill" data-filter-key="priceRange" onclick="removeActiveFilter('priceRange', event)">
                <span class="filter-pill-label">Prezzo:</span>
                <span class="filter-pill-value">€${minPrice}-€${maxPrice}</span>
                <div class="filter-pill-remove"></div>
            </div>
        `);
    }
    
    // Add clear all button if there are filters
    if (filterPills.length > 0) {
        filterPills.push(`
            <button class="clear-all-filters-btn" onclick="clearAllActiveFilters(event)">
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
                const tagDisplayMap = {
                    'appunti': 'Appunti',
                    'dispense': 'Dispense',
                    'esercizi': 'Esercizi'
                };
                
                if (filterKey === 'language' && languageDisplayMap[remainingValue]) {
                    displayText = languageDisplayMap[remainingValue];
                } else if (filterKey === 'tag' && tagDisplayMap[remainingValue]) {
                    displayText = tagDisplayMap[remainingValue];
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
        
        if (filterKey === 'sizeType') {
            document.querySelectorAll('.size-toggle').forEach(toggle => {
                toggle.classList.remove('active');
            });
            const allSizeToggle = document.querySelector('.size-toggle[data-size="all"]');
            if (allSizeToggle) allSizeToggle.classList.add('active');
        }
        
        if (filterKey === 'timeType') {
            document.querySelectorAll('.time-toggle').forEach(toggle => {
                toggle.classList.remove('active');
            });
            const allTimeToggle = document.querySelector('.time-toggle[data-time="all"]');
            if (allTimeToggle) allTimeToggle.classList.add('active');
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
                console.log('Authentication failed, redirecting to login');
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                window.location.href = 'login.html';
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Simple request failed:', error);
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
                console.log('Authentication failed, redirecting to login');
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                window.location.href = 'login.html';
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
    console.log('🔄 Creating loading cards...', count);
    const grid = document.getElementById('documentsGrid');
    if (!grid) {
        console.error('❌ Grid element not found!');
        return;
    }
    
    // Check if there are already loading cards from HTML - if so, just return
    const existingLoadingCards = grid.querySelectorAll('.loading-card');
    if (existingLoadingCards.length > 0) {
        console.log('✅ Loading cards already present from HTML, skipping creation');
        return;
    }
    
    console.log('✅ Grid element found, clearing content...');
    grid.innerHTML = '';
    
    // Add loading class to grid
    grid.classList.add('loading');
    
    // Add placeholder elements to maintain correct positioning
    const documentCountPlaceholder = document.createElement('div');
    documentCountPlaceholder.className = 'loading-placeholder document-count';
    grid.appendChild(documentCountPlaceholder);
    
    const activeFiltersPlaceholder = document.createElement('div');
    activeFiltersPlaceholder.className = 'loading-placeholder active-filters';
    grid.appendChild(activeFiltersPlaceholder);
    
    // Create a container for the loading cards grid
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'loading-cards-container';
    cardsContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: var(--space-5);
        width: 100%;
    `;
    
    for (let i = 0; i < count; i++) {
        const loadingCard = document.createElement('div');
        loadingCard.className = 'document-card loading';
        loadingCard.style.animationDelay = `${i * 0.1}s`;
        
        loadingCard.innerHTML = `
            <div class="document-preview">
                <div class="loading-preview"></div>
                <div class="document-type-badges">
                    <div class="skeleton-badge"></div>
                </div>
                <div class="rating-badge">
                    <div class="skeleton-rating-stars"></div>
                    <div class="skeleton-rating-count"></div>
                </div>
            </div>
            
            <button class="favorite-button">
                <div class="skeleton-favorite-icon"></div>
            </button>
            
            <div class="document-content">
                <div class="document-header">
                    <div class="document-title-section">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-description"></div>
                    </div>
                </div>
                <div class="document-info">
                    <div class="skeleton-info-item">
                        <div class="skeleton-info-icon"></div>
                        <div class="skeleton-info-text"></div>
                    </div>
                    <div class="skeleton-info-item">
                        <div class="skeleton-info-icon"></div>
                        <div class="skeleton-info-text"></div>
                    </div>
                    <div class="skeleton-info-item">
                        <div class="skeleton-info-icon"></div>
                        <div class="skeleton-info-text"></div>
                    </div>
                    <div class="skeleton-info-item">
                        <div class="skeleton-info-icon"></div>
                        <div class="skeleton-info-text"></div>
                    </div>
                </div>
                <div class="document-footer">
                    <div class="document-footer-left">
                        <div class="skeleton-avatar"></div>
                        <div class="skeleton-meta"></div>
                    </div>
                    <div class="skeleton-price"></div>
                </div>
            </div>
        `;
        
        cardsContainer.appendChild(loadingCard);
    }
    
    // Append the cards container to the grid
    grid.appendChild(cardsContainer);
    
    console.log(`✅ Added ${count} loading cards to grid`);
}



async function loadAllFiles() {
    try {
        // Loading cards are already shown from HTML
        showStatus('Caricamento documenti... 📚');
        
        // Only get vetrine metadata initially - don't load individual files yet
        const vetrineResponse = await makeAuthenticatedRequest('/vetrine');
        if (!vetrineResponse) {
            throw new Error('Failed to fetch vetrine');
        }
        
        currentVetrine = vetrineResponse.vetrine || [];
        console.log('Loaded vetrine metadata:', currentVetrine.length, 'vetrines');
        console.log('🔍 Raw vetrine data sample:', currentVetrine.slice(0, 3));
        
        // Transform vetrine into card items with mock file data for UI display
        console.log('🔄 Processing vetrine data for UI...');
        const allFiles = currentVetrine.map(vetrina => {
            console.log(`📋 Processing vetrina ${vetrina.vetrina_id}: favorite=${vetrina.favorite}, raw favorite value:`, vetrina.favorite, 'type:', typeof vetrina.favorite);
            // Create mock files for UI display (we don't load real files)
            const mockFileCount = Math.floor(Math.random() * 5) + 1; // 1-5 files
            const mockFiles = Array.from({ length: mockFileCount }, (_, i) => ({
                id: `${vetrina.id}-file-${i}`,
                filename: `file${i + 1}.pdf`,
                title: `File ${i + 1}`,
                size: Math.floor(Math.random() * 1000000) + 100000,
                price: Math.random() > 0.7 ? Math.floor(Math.random() * 10) + 1 : 0,
                document_type: ['PDF', 'DOCX', 'PPTX'][Math.floor(Math.random() * 3)],
                created_at: vetrina.created_at,
                download_count: Math.floor(Math.random() * 100),
                owned: false,
                tag: ['appunti', 'dispense', 'esercizi'][Math.floor(Math.random() * 3)]
            }));
            
            // Calculate totals for the vetrina
            const totalSize = mockFiles.reduce((sum, file) => sum + (file.size || 0), 0);
            const totalPrice = mockFiles.reduce((sum, file) => sum + (file.price || 0), 0);
            
            // Create a card item with mock file data for proper UI display
            const vetrineCard = {
                id: vetrina.id || vetrina.vetrina_id,
                isVetrina: true,
                filesLoaded: true, // Mark as loaded so it shows file stack UI
                fileCount: mockFileCount,
                files: mockFiles,
                // Use vetrina info for the card
                filename: mockFileCount > 1 ? `${mockFileCount} files` : mockFiles[0].filename,
                title: vetrina.name || 'Vetrina Senza Nome',
                description: vetrina.description || 'No description available',
                size: totalSize,
                price: totalPrice,
                created_at: vetrina.created_at,
                download_count: mockFiles.reduce((sum, file) => sum + (file.download_count || 0), 0),
                rating: Math.random() * 2 + 3, // Generate random rating between 3-5
                review_count: Math.floor(Math.random() * 30) + 5, // Random review count 5-35
                course_name: vetrina.course_instance?.course_name || extractCourseFromVetrina(vetrina.name),
                faculty_name: vetrina.course_instance?.faculty_name || extractFacultyFromVetrina(vetrina.name),
                language: vetrina.course_instance?.language || 'Italiano',
                canale: vetrina.course_instance?.canale || 'A',
                course_semester: vetrina.course_instance?.course_semester || 'Primo Semestre',
                academic_year: `${vetrina.course_instance?.date_year || 2024}/${(vetrina.course_instance?.date_year || 2024) + 1}`,
                document_types: Array.from(new Set(mockFiles.map(file => file.document_type))),
                document_type: mockFileCount > 1 ? 'BUNDLE' : mockFiles[0].document_type,
                author_username: vetrina.owner?.username || 'Unknown',
                owned: mockFiles.every(file => file.owned),
                favorite: vetrina.favorite === true, // Use the real favorite status from backend
                tags: mockFiles.map(file => file.tag).filter(tag => tag !== null),
                primary_tag: mockFiles.find(file => file.tag)?.tag || null,
                vetrina_info: {
                    id: vetrina.id || vetrina.vetrina_id,
                    name: vetrina.name,
                    description: vetrina.description,
                    course_instance_id: vetrina.course_instance?.instance_id,
                    owner_id: vetrina.owner?.id,
                    owner_username: vetrina.owner?.username || 'Unknown'
                }
            };
            console.log(`💖 Vetrina ${vetrina.vetrina_id} final favorite status: ${vetrineCard.favorite}`);
            return vetrineCard;
        });
        
        currentFiles = allFiles;
        originalFiles = [...allFiles]; // Keep original copy
        renderDocuments(currentFiles);
        populateFilterOptions();
        showStatus(`${allFiles.length} vetrine caricate con successo! 🎉`);
        
    } catch (error) {
        console.error('Error loading vetrine:', error);
        showError('Errore nel caricamento dei documenti. Riprova più tardi.');
        // Show empty state
        renderDocuments([]);
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

function renderDocuments(files) {
    console.log('renderDocuments called with', files ? files.length : 'undefined', 'files');
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
        console.log(`🎨 Rendering document ${item.id}: favorite=${item.favorite}`);
        const card = document.createElement('div');
        card.className = 'document-card';
        // Always use the vetrina ID, whether it's a single file or a collection
        card.setAttribute('data-vetrina-id', item.vetrina_id || item.id);
        card.style.animationDelay = `${index * 0.1}s`;
        
        // Make the entire card clickable
        card.style.cursor = 'pointer';
        card.onclick = async (e) => {
            // Don't trigger if clicking on interactive elements
            if (e.target.closest('.favorite-button') || e.target.closest('.view-files-button')) {
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
            const files = item.files;
            
            // Generate dynamic stack layers based on file count
            let stackLayers = '';
            if (fileCount === 2) {
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
            }
            
            previewContent = `
                <div class="preview-icon ${fileStackClass}" data-file-count="${fileCount}">
                    <div class="file-stack-container">
                        ${stackLayers}
                        ${stackCountBadge}
                    </div>
                </div>
            `;
        } else {
            // Single file preview or loaded vetrina
            const filename = item.isVetrina && filesLoaded ? item.files[0].filename : item.filename;
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
        console.log(`❤️ Document ${item.id} isFavorited: ${isFavorited} (from item.favorite: ${item.favorite})`);
        card.innerHTML = `
            <div class="document-preview">
                ${previewContent}
                ${viewFilesButton}
                <div class="document-type-badges">
                    ${item.isVetrina && !filesLoaded ? 
                        '<div class="document-type-badge">Vetrina</div>' :
                        (item.tags && item.tags.length > 0 ?
                            `<div class="document-type-badge">${getTagDisplayName(item.tags[0])}</div>` +
                            (item.tags.length > 1 ? `<div class="document-type-badge more-types">+${item.tags.length - 1}</div>` : '')
                            : ''
                        )
                    }
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
                    <div class="document-info-item" title="Lingua: ${item.language || 'N/A'}${item.canale !== undefined && item.canale !== null && item.canale !== "0" ? ' - Canale: ' + item.canale : ''}">
                        <span class="info-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><path fill="currentColor" d="m11 16.5l-1 3.1h2z" class="clr-i-solid clr-i-solid-path-1"/><path fill="currentColor" d="M30.3 3h-16v5h4v2h-13c-1.7 0-3 1.3-3 3v11c0 1.7 1.3 3 3 3h1v5.1l6.3-5.1h6.7v-7h11c1.7 0 3-1.3 3-3V6c0-1.7-1.3-3-3-3M13.1 22.9l-.5-1.6H9.5l-.6 1.6H6.5L9.8 14h2.4l3.3 8.9zM28.3 15v2c-1.3 0-2.7-.4-3.9-1c-1.2.6-2.6.9-4 1l-.1-2q1.05 0 2.1-.3c-.9-.9-1.5-2-1.8-3.2h2.1c.3.9.9 1.6 1.6 2.2c1.1-.9 1.8-2.2 1.9-3.7h-6V8h3V6h2v2h3.3l.1 1c.1 2.1-.7 4.2-2.2 5.7c.7.2 1.3.3 1.9.3" class="clr-i-solid clr-i-solid-path-2"/><path fill="none" d="M0 0h36v36H0z"/></svg>
                        </span>
                        <span class="info-text">${item.language || 'N/A'}${item.canale !== undefined && item.canale !== null && item.canale !== "0" ? ' - Canale ' + item.canale : ''}</span>
                    </div>
                    <div class="document-info-item" title="Anno Accademico: ${item.academic_year || 'N/A'}">
                        <span class="info-icon">calendar_today</span>
                        <span class="info-text">${item.academic_year || 'N/A'}</span>
                    </div>
                </div>
                <div class="document-footer">
                    <div class="document-footer-left">
                        <div class="owner-avatar" title="Caricato da ${item.author_username || 'Unknown'}">
                            ${item.author_username ? item.author_username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div class="document-meta">
                            ${item.isVetrina && !filesLoaded ? 'Click to view' : formatFileSize(item.size || 0)}
                        </div>
                    </div>
                    <div class="document-price ${price === 0 ? 'free' : 'paid'}" title="${price === 0 ? 'Documento gratuito' : `Prezzo: €${price}`}">
                        ${item.isVetrina && !filesLoaded ? 'View' : (price === 0 ? 'Gratis' : `€${price}`)}
                    </div>
                </div>
            </div>
        `;
        
        if (item.isVetrina) {
            card.querySelector('.view-files-button').addEventListener('click', (e) => {
                e.stopPropagation();
                // Navigate to document preview page instead of opening quick look
                window.location.href = `document-preview.html?id=${item.id}`;
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

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('it-IT');
}

function showStatus(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `status-message ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, type === 'success' ? 3000 : 5000);
}

function showError(message) {
    showStatus(message, 'error');
}

// Function to refresh favorite status when page becomes visible
async function refreshFavoriteStatus() {
    try {
        console.log('🔄 Refreshing favorite status...');
        
        // Get fresh favorite data from the backend
        const response = await makeAuthenticatedRequest('/vetrine');
        if (response && response.vetrine) {
            let hasChanges = false;
            
            // Update the favorite status in current data
            response.vetrine.forEach(freshVetrina => {
                const existingIndex = currentFiles.findIndex(item => 
                    (item.vetrina_id || item.id) === freshVetrina.vetrina_id
                );
                if (existingIndex !== -1) {
                    const oldFavorite = currentFiles[existingIndex].favorite;
                    currentFiles[existingIndex].favorite = freshVetrina.favorite;
                    
                    // Check if the favorite status actually changed
                    if (oldFavorite !== freshVetrina.favorite) {
                        hasChanges = true;
                        console.log(`📝 Updated favorite status for vetrina ${freshVetrina.vetrina_id}: ${oldFavorite} -> ${freshVetrina.favorite}`);
                    }
                }
                
                const originalIndex = originalFiles.findIndex(item => 
                    (item.vetrina_id || item.id) === freshVetrina.vetrina_id
                );
                if (originalIndex !== -1) {
                    originalFiles[originalIndex].favorite = freshVetrina.favorite;
                }
            });
            
            // Update only the favorite button states without re-rendering everything
            if (hasChanges) {
                console.log('🔄 Updating favorite button states...');
                response.vetrine.forEach(freshVetrina => {
                    const existingIndex = currentFiles.findIndex(item => 
                        (item.vetrina_id || item.id) === freshVetrina.vetrina_id
                    );
                    if (existingIndex !== -1) {
                        const card = document.querySelector(`[data-vetrina-id="${freshVetrina.vetrina_id}"]`);
                        if (card) {
                            const favoriteBtn = card.querySelector('.favorite-button');
                            if (favoriteBtn) {
                                if (freshVetrina.favorite) {
                                    favoriteBtn.classList.add('active');
                                    favoriteBtn.setAttribute('title', 'Rimuovi dai preferiti');
                                } else {
                                    favoriteBtn.classList.remove('active');
                                    favoriteBtn.setAttribute('title', 'Aggiungi ai preferiti');
                                }
                            }
                        }
                    }
                });
                console.log('✅ Favorite button states updated');
            } else {
                console.log('✅ No favorite status changes detected');
            }
        }
    } catch (error) {
        console.error('Error refreshing favorite status:', error);
    }
}

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
        console.log(`Attempting to ${isActive ? 'add' : 'remove'} favorite for vetrina: ${vetrinaId}`);
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

    // If files haven't been loaded yet, load them now
    if (!file.filesLoaded) {
        try {
            showStatus('Caricamento dettagli documento... 📚');
            
            // Load files for this specific vetrina
            const filesResponse = await makeAuthenticatedRequest(`/vetrine/${file.id}/files`);
            if (filesResponse && filesResponse.files) {
                const files = filesResponse.files;
                
                if (files.length > 0) {
                    // Calculate total size and price for the vetrina
                    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
                    const totalPrice = files.reduce((sum, file) => sum + (file.price || 0), 0);
                    
                    // Update the file object with loaded data
                    file.fileCount = files.length;
                    file.files = files.map(file => ({
                        id: file.id,
                        filename: file.filename,
                        title: getOriginalFilename(file.filename),
                        size: file.size || 0,
                        price: file.price || 0,
                        document_type: getFileTypeFromFilename(file.filename),
                        created_at: file.created_at,
                        download_count: file.download_count || 0,
                        owned: file.owned || false,
                        tag: file.tag || null
                    }));
                    file.size = totalSize;
                    file.price = totalPrice;
                    file.download_count = files.reduce((sum, file) => sum + (file.download_count || 0), 0);
                    file.document_types = files.length > 1 ? 
                        Array.from(new Set(files.map(file => getDocumentCategory(getOriginalFilename(file.filename), ''))))
                        : [getDocumentCategory(getOriginalFilename(files[0].filename), '')];
                    file.document_type = files.length > 1 ? 'BUNDLE' : getFileTypeFromFilename(files[0].filename);
                    file.owned = files.every(file => file.owned);
                    file.tags = files.map(file => file.tag).filter(tag => tag !== null);
                    file.primary_tag = files.find(file => file.tag)?.tag || null;
                    file.filesLoaded = true;
                    
                    // Update the filename to show actual file count
                    file.filename = files.length > 1 ? `${files.length} files` : files[0].filename;
                }
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
    }

    // Use REAL database information for preview
    const documentTitle = file.title || 'Documento Senza Titolo';
    const documentType = file.document_type || 'Documento';
    const courseName = file.course_name || file.vetrina_info?.course_name || 'Corso';
    const faculty = file.faculty_name || file.vetrina_info?.faculty_name || 'Facoltà';
    const canale = file.canale || file.vetrina_info?.canale || 'A';
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
        `<button class="btn primary" onclick="downloadDocument(${file.id}); closePreview();">
            <i class="material-symbols-outlined">download</i>
            Scarica Documento
         </button>
         <button class="btn secondary" onclick="closePreview()">
            <i class="material-symbols-outlined">close</i>
            Chiudi
         </button>` :
        price === 0 ?
        `<button class="btn primary" onclick="downloadDocument(${file.id}); closePreview();">
            <i class="material-symbols-outlined">download</i>
            Scarica Gratis
         </button>
         <button class="btn secondary" onclick="closePreview()">
            <i class="material-symbols-outlined">close</i>
            Chiudi
         </button>` :
        `<button class="btn primary" onclick="purchaseDocument(${file.id}); closePreview();">
            <i class="material-symbols-outlined">payment</i>
            Acquista per €${price}
         </button>
         <button class="btn secondary" onclick="closePreview()">
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
        // Replace loading with document icon
        modalLoading.innerHTML = `
            <div class="preview-icon">
                <span class="document-icon">${getDocumentPreviewIcon(file.filename)}</span>
                <div class="file-extension">${file.document_type}</div>
            </div>
        `;
        modalLoading.style.display = 'flex';
    }
    
    if (modalImg) {
        modalImg.style.display = 'none';
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
        const response = await fetch(`${API_BASE}/files/${fileId}/download`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = getOriginalFilename(currentFiles.find(f => f.id === fileId)?.filename) || 'documento';
            a.click();
            window.URL.revokeObjectURL(url);
            showStatus('Documento scaricato con successo! 🎉');
            } else {
            throw new Error('Download fallito');
        }
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
        // Show loading cards immediately
        showLoadingCards(6);
        showStatus('Ricerca in corso... 🔍');
        
        // If no query, load all files with current filters
        if (!query || !query.trim()) {
            await loadAllFiles();
            return;
        }
        
        // Build search parameters
        const searchParams = new URLSearchParams();
        searchParams.append('text', query.trim());
        
        // Add any active filters to the search
        if (activeFilters.course_name) {
            searchParams.append('course_name', activeFilters.course_name);
        }
        if (activeFilters.faculty_name) {
            searchParams.append('faculty', activeFilters.faculty_name);
        }
        
        // Make backend search request with fallback
        let response;
        try {
            // Use authenticated request for GET search to include favorite status
            response = await makeAuthenticatedRequest(`/vetrine?${searchParams.toString()}`);
        } catch (error) {
            console.warn('Backend search failed, falling back to client-side search:', error);
            // Fallback to client-side search if backend fails
            await performClientSideSearch(query);
        return;
    }
    
        if (!response) {
            console.warn('Empty response from backend, falling back to client-side search');
            await performClientSideSearch(query);
            return;
        }
        
        const searchResults = response.vetrine || [];
        console.log('Backend search results:', searchResults);
        
        // Transform search results into display format
        const transformedResults = await transformSearchResults(searchResults);
        
        // Apply any remaining client-side filters (except course/faculty which are handled by backend)
        const filteredResults = applyClientSideFilters(transformedResults);
        
        // Update current files and render
        currentFiles = filteredResults;
        renderDocuments(filteredResults);
        
        // Show search results status
        const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
        const searchSummary = searchTerms.length > 1 
            ? `"${searchTerms.join('" + "')}"` 
            : `"${query}"`;
        
        showStatus(`Trovati ${filteredResults.length} documenti per ${searchSummary} 🎉`);
        
    } catch (error) {
        console.error('Search error:', error);
        showError('Errore durante la ricerca. Riprova più tardi.');
        // Fallback to current files if search fails
        renderDocuments(currentFiles);
    }
}

// New function to transform backend search results into frontend display format
async function transformSearchResults(vetrine) {
    const transformedResults = [];
    
    for (const vetrina of vetrine) {
        try {
            // Load files for this vetrina
                            const filesResponse = await makeAuthenticatedRequest(`/vetrine/${vetrina.id}/files`);
            if (!filesResponse || !filesResponse.files || filesResponse.files.length === 0) {
                continue; // Skip vetrine with no files
            }
            
            const files = filesResponse.files;
            
            // Calculate totals for the vetrina
            const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
            const totalPrice = files.reduce((sum, file) => sum + (file.price || 0), 0);
            
                                // Transform the vetrina into a card item (same format as loadAllFiles)
                    const vetrineCard = {
                        id: vetrina.id || vetrina.vetrina_id,
                        isVetrina: true,
                        fileCount: files.length,
                        files: files.map(file => ({
                            id: file.id,
                            filename: file.filename,
                            title: getOriginalFilename(file.filename),
                            size: file.size || 0,
                            price: file.price || 0,
                            document_type: getFileTypeFromFilename(file.filename),
                            created_at: file.created_at,
                            download_count: file.download_count || 0,
                            owned: file.owned || false,
                            tag: file.tag || null
                        })),
                        // Use vetrina info for the card
                        filename: files.length > 1 ? `${files.length} files` : files[0].filename,
                        title: vetrina.name || 'Vetrina Senza Nome',
                        description: vetrina.description || 'No description available',
                        size: totalSize,
                        price: totalPrice,
                        created_at: vetrina.created_at,
                        download_count: files.reduce((sum, file) => sum + (file.download_count || 0), 0),
                        rating: Math.random() * 2 + 3, // Generate random rating between 3-5
                        review_count: Math.floor(Math.random() * 30) + 5, // Random review count 5-35
                        course_name: vetrina.course_instance?.course_name || 'Corso Generale',
                        faculty_name: vetrina.course_instance?.faculty_name || 'Facoltà Generale',
                        language: vetrina.course_instance?.language || 'Italiano',
                        canale: vetrina.course_instance?.canale || 'A',
                        course_semester: vetrina.course_instance?.course_semester || 'Primo Semestre',
                        academic_year: `${vetrina.course_instance?.date_year || 2024}/${(vetrina.course_instance?.date_year || 2024) + 1}`,
                        document_types: files.length > 1 ? 
                            Array.from(new Set(files.map(file => getDocumentCategory(getOriginalFilename(file.filename), ''))))
                            : [getDocumentCategory(getOriginalFilename(files[0].filename), '')],
                        document_type: files.length > 1 ? 'BUNDLE' : getFileTypeFromFilename(files[0].filename),
                        author_username: vetrina.owner?.username || 'Unknown',
                        owned: files.every(file => file.owned),
                        favorite: vetrina.favorite || false,
                        // Add tags from files
                        tags: files.map(file => file.tag).filter(tag => tag !== null),
                        primary_tag: files.find(file => file.tag)?.tag || null,
                        vetrina_info: {
                            id: vetrina.id || vetrina.vetrina_id,
                            name: vetrina.name,
                            description: vetrina.description,
                            course_instance_id: vetrina.course_instance?.instance_id,
                            owner_id: vetrina.owner?.id,
                            owner_username: vetrina.owner?.username || 'Unknown'
                        }
                    };
            transformedResults.push(vetrineCard);
            
        } catch (error) {
            console.error(`Error loading files for vetrina ${vetrina.id}:`, error);
        }
    }
    
    return transformedResults;
}

// New function to apply remaining client-side filters (excluding course/faculty which backend handles)
function applyClientSideFilters(files) {
    let filtered = [...files];
    
    // Apply filters that aren't handled by backend
    Object.entries(activeFilters).forEach(([key, value]) => {
        if (!value || key === 'course_name' || key === 'faculty_name') return; // Skip backend-handled filters
        
        filtered = filtered.filter(file => {
            switch (key) {
                case 'author':
                    return file.author_username && file.author_username.toLowerCase().includes(value.toLowerCase());
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
    console.log('restoreFiltersFromStorage called - CLEARING ALL FILTERS ON REFRESH');
    
    // Clear all filters on page refresh - treat it like a fresh visit
    activeFilters = {};
    
    // Clear filters from localStorage
    try {
        localStorage.removeItem('searchFilters');
        console.log('Cleared filters from localStorage');
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
        console.log('Showing all documents after filter clear');
        if (originalFiles && originalFiles.length > 0) {
            renderDocuments(originalFiles);
            currentFiles = originalFiles;
            showStatus(`${originalFiles.length} documenti disponibili 📚`);
        }
    }, 300);
    
    // Force a re-render of dropdown options to ensure clean visual states
    setTimeout(() => {
        console.log('Final UI update with cleared filters...');
        
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
            
            console.log('Filter clear complete. Active filters: 0');
        }, 100);
    }, 200);
}

function updateFilterInputs() {
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
    
    // Clear all inputs first to ensure clean state
    const allInputs = ['autoreFilter', 'facultyFilter', 'courseFilter', 'canaleFilter', 'documentTypeFilter', 'languageFilter', 'academicYearFilter', 'tagFilter'];
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
    
    // Update author input
    const authorInput = document.getElementById('autoreFilter');
    if (authorInput && activeFilters.author) {
        authorInput.value = activeFilters.author;
    }
    
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
            } else if (type === 'tag' && tagDisplayMap[activeFilters[filterKey]]) {
                displayValue = tagDisplayMap[activeFilters[filterKey]];
            }
            
            input.value = displayValue;
        }
    });
    
    // Reset all toggle states first
    const toggleTypes = ['priceType', 'sizeType', 'timeType', 'vetrinaType'];
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
        window.location.href = 'login.html';
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

function openQuickLook(vetrina) {
    // Prevent multiple modals
    if (document.getElementById('quick-look-overlay')) return;

    const modalHTML = `
        <div id="quick-look-overlay" class="quick-look-overlay">
            <div class="quick-look-modal">
                <button class="quick-look-close-button">&times;</button>
                <div class="quick-look-header">
                    <h2 class="quick-look-title">${vetrina.title}</h2>
                    <p class="quick-look-file-count">${vetrina.files.length} files</p>
                </div>
                <div class="quick-look-body">
                    <div class="quick-look-main-preview">
                        <div class="preview-placeholder">
                            <span class="material-symbols-outlined">visibility</span>
                            <p>Select a file to preview</p>
                        </div>
                    </div>
                    <div class="quick-look-sidebar">
                        <ul class="quick-look-file-list">
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

    // Populate file list
    vetrina.files.forEach((file, index) => {
        const fileItem = document.createElement('li');
        fileItem.className = 'quick-look-file-item';
        fileItem.dataset.index = index;
        fileItem.innerHTML = `
            <span class="file-item-icon">${getDocumentPreviewIcon(file.filename)}</span>
            <span class="file-item-name">${file.filename}</span>
            <span class="file-item-size">${formatFileSize(file.size)}</span>
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

    // Animate in
    setTimeout(() => overlay.classList.add('visible'), 10);
}

function closeQuickLook() {
    const overlay = document.getElementById('quick-look-overlay');
    if (overlay) {
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

    // Update preview content
    previewContainer.innerHTML = `
        <div class="preview-content-area">
            <div class="preview-icon-large">${getDocumentPreviewIcon(file.filename)}</div>
            <h3 class="preview-filename">${file.filename}</h3>
            <p class="preview-file-details">
                <span>Type: ${file.document_type}</span> | 
                <span>Size: ${formatFileSize(file.size)}</span>
            </p>
        </div>
    `;

    // Update active class in file list
    fileListItems.forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
}

// Fallback client-side search function when backend search fails
async function performClientSideSearch(query) {
    try {
        // Load all files if not already loaded
        if (originalFiles.length === 0) {
            await loadAllFiles();
        }
        
        let filesToSearch = originalFiles;
        
        // Apply current filters first
        if (Object.keys(activeFilters).length > 0) {
            filesToSearch = applyFiltersToFiles(originalFiles);
        }
        
        if (!query.trim()) {
            renderDocuments(filesToSearch);
            return;
        }
        
        // Split search query into individual terms and clean them
        const searchTerms = query.toLowerCase()
            .split(/\s+/)
            .map(term => term.trim())
            .filter(term => term.length > 0);
        
        // Calculate relevance score for each file
        const scoredFiles = filesToSearch.map(file => {
            let score = 0;
            let hasMatch = false;
            
            // Helper function to check if terms match in a field
            const checkFieldMatch = (fieldValue, multiplier) => {
                if (!fieldValue) return false;
                
                const fieldText = fieldValue.toLowerCase()
                    .replace(/[^\w\s]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                let fieldMatches = 0;
                searchTerms.forEach(term => {
                    if (fieldText.includes(term) || 
                        fieldText.split(' ').some(word => 
                            word.startsWith(term) || word.includes(term)
                        )) {
                        fieldMatches++;
                    }
                });
                
                if (fieldMatches === searchTerms.length) {
                    score += multiplier * fieldMatches;
                    return true;
                }
                return false;
            };
            
            // Priority scoring (higher multiplier = higher priority)
            if (checkFieldMatch(file.title, 100)) hasMatch = true;
            if (checkFieldMatch(file.course_name, 80)) hasMatch = true;
            if (checkFieldMatch(file.description, 60)) hasMatch = true;
            if (checkFieldMatch(file.faculty_name, 50)) hasMatch = true;
            if (checkFieldMatch(file.author_username, 40)) hasMatch = true;
            if (checkFieldMatch(file.vetrina_info?.name, 30)) hasMatch = true;
            if (checkFieldMatch(file.vetrina_info?.description, 20)) hasMatch = true;
            if (checkFieldMatch(file.document_type, 15)) hasMatch = true;
            if (checkFieldMatch(file.language, 10)) hasMatch = true;
            
            return {
                file,
                score,
                hasMatch
            };
        });
        
        // Filter files that have matches and sort by score (descending)
        const filtered = scoredFiles
            .filter(item => item.hasMatch)
            .sort((a, b) => b.score - a.score)
            .map(item => item.file);
        
        currentFiles = filtered;
        renderDocuments(filtered);
        
        // Show search results status
        const searchSummary = searchTerms.length > 1 
            ? `"${searchTerms.join('" + "')}"` 
            : `"${query}"`;
        
        showStatus(`Trovati ${filtered.length} documenti per ${searchSummary} 🔍 (ricerca locale)`);
        
    } catch (error) {
        console.error('Client-side search error:', error);
        showError('Errore durante la ricerca. Riprova più tardi.');
        renderDocuments(currentFiles);
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
        if (isScrolling) return;
        
        isScrolling = true;
        requestAnimationFrame(() => {
            const scrollY = window.scrollY || window.pageYOffset;
            
            if (scrollY > scrollThreshold) {
                if (!scrollToTopBtn.classList.contains('visible')) {
                    scrollToTopBtn.classList.add('visible');
                    // Add pulse animation for first appearance
                    setTimeout(() => {
                        scrollToTopBtn.classList.add('pulse');
                        setTimeout(() => {
                            scrollToTopBtn.classList.remove('pulse');
                        }, 2000);
                    }, 100);
                }
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
            
            isScrolling = false;
        });
    }

    // Smooth scroll to top
    function scrollToTop() {
        // Remove pulse animation if active
        scrollToTopBtn.classList.remove('pulse');
        
        // Smooth scroll to top with easing
        const startPosition = window.scrollY || window.pageYOffset;
        const startTime = performance.now();
        const duration = 800; // 800ms duration
        
        function easeInOutCubic(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }
        
        function animateScroll(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOutCubic(progress);
            
            const newPosition = startPosition - (startPosition * easedProgress);
            window.scrollTo(0, newPosition);
            
            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        }
        
        requestAnimationFrame(animateScroll);
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

    // Performance optimization: throttle scroll events on mobile
    let ticking = false;
    const originalHandleScroll = handleScroll;
    
    function throttledHandleScroll() {
        if (!ticking) {
            requestAnimationFrame(() => {
                originalHandleScroll();
                ticking = false;
            });
            ticking = true;
        }
    }

    // Use throttled version on mobile devices
    if ('ontouchstart' in window) {
        window.removeEventListener('scroll', handleScroll);
        window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    }

    throttledHandleScroll(); // Initial check
}

// Initialize scroll to top functionality when page loads
document.addEventListener('DOMContentLoaded', initializeScrollToTop);

// ===========================
// DYNAMIC BACKGROUND POSITIONING
// ===========================

function adjustBackgroundPosition() {
    const bgElement = document.querySelector('.background-image');
    const title = document.querySelector('.search-title');
    const searchContainer = document.querySelector('.search-container');

    if (!bgElement || !title || !searchContainer) {
        return;
    }

    // Use an Image object to get the natural dimensions and calculate aspect ratio.
    // This is the key to making the calculation reliable.
    const tempImage = new Image();
    // The path must be relative to the HTML file that loads the script.
    tempImage.src = 'images/bg.png'; 

    const calculatePosition = () => {
        if (tempImage.naturalWidth === 0 || tempImage.naturalHeight === 0) {
            // Avoid division by zero if image fails to load
            return;
        }
        const imageAspectRatio = tempImage.naturalWidth / tempImage.naturalHeight;

        // Calculate the rendered height of the background based on viewport width
        const viewportWidth = window.innerWidth;
        const bgRenderedHeight = viewportWidth / imageAspectRatio;

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

    // This handles both cached and uncached images
    if (tempImage.complete) {
        calculatePosition();
    } else {
        tempImage.onload = calculatePosition;
        tempImage.onerror = () => console.error("Background image failed to load, cannot position it.");
    }
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

// Add event listeners for dynamic background
window.addEventListener('load', adjustBackgroundPosition);
window.addEventListener('resize', debounce(adjustBackgroundPosition, 50));