const API_BASE = 'http://localhost:5000';
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
window.onload = function() {
    // Check authentication first
    if (!checkAuthentication()) {
        return; // Stop execution if not authenticated
    }
    
    console.log('Loading page with valid auth token');
    
    // Initialize user info and logout button
    initializeUserInfo();
    
    loadAllFiles();
    initializeAnimations();
    initializeFilters();
};

function initializeUserInfo() {
    // Get user info from localStorage or set defaults
    const userInfo = localStorage.getItem('currentUser');
    let userData = { username: 'User', email: 'user@example.com' };
    
    if (userInfo) {
        try {
            userData = JSON.parse(userInfo);
        } catch (e) {
            console.warn('Invalid user data in localStorage');
        }
    }
    
    // Populate user info
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (userAvatar) {
        userAvatar.textContent = userData.username.charAt(0).toUpperCase();
    }
    
    if (userName) {
        userName.textContent = userData.username;
    }
    
    // Wire up logout button
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
            delete activeFilters.author;
            applyFiltersAndRender();
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
            if (isAuthorOpen || authorInput.value) {
                hideSuggestions();
                // Always clear input when clicking outside
                if (authorInput.value) {
                    authorInput.value = '';
                    delete activeFilters.author;
                    applyFiltersAndRender();
                }
            }
        }
    });
    
    function showSuggestions(filteredAuthors, query) {
        if (filteredAuthors.length === 0) {
            hideSuggestions();
            return;
        }
        
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
        applyFiltersAndRender();
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
            applyFiltersAndRender();
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
        const staticDropdowns = ['documentType', 'language', 'academicYear'];
        const allDropdowns = [...searchableDropdowns, ...staticDropdowns];
        
        // Setup searchable dropdowns (faculty, course, canale)
        searchableDropdowns.forEach(type => {
            const container = document.querySelector(`[data-dropdown="${type}"]`);
            const input = document.getElementById(`${type}Filter`);
            const options = document.getElementById(`${type}Options`);
            
            if (!container || !input || !options) return;
            
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
            
            // Handle arrow click
            const arrow = container.querySelector('.dropdown-arrow');
            if (arrow) {
                arrow.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleDropdown(container, type);
                    input.focus();
                });
            }
            
            // Keyboard navigation
            input.addEventListener('keydown', (e) => {
                handleDropdownKeyboard(e, type);
            });
        });
        
        // Setup static dropdowns (documentType, language, academicYear)
        staticDropdowns.forEach(type => {
            const container = document.querySelector(`[data-dropdown="${type}"]`);
            const input = document.getElementById(`${type}Filter`);
            const options = document.getElementById(`${type}Options`);
            
            if (!container || !input || !options) return;
            
            // Handle click to open dropdown (readonly inputs)
            input.addEventListener('click', (e) => {
                e.preventDefault();
                toggleDropdown(container, type);
            });
            
            // Handle arrow click
            const arrow = container.querySelector('.dropdown-arrow');
            if (arrow) {
                arrow.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleDropdown(container, type);
                });
            }
            
            // Keyboard navigation
            input.addEventListener('keydown', (e) => {
                handleDropdownKeyboard(e, type);
            });
            
            // Setup option clicks
            options.addEventListener('click', (e) => {
                const option = e.target.closest('.dropdown-option');
                if (option) {
                    const value = option.dataset.value;
                    const text = option.querySelector('span').textContent;
                    selectDropdownOption(type, value, text);
                }
            });
        });
        
        // Close dropdowns when clicking outside (unified for all dropdowns)
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-container') && !e.target.closest('.author-container')) {
                closeAllDropdowns();
                // Clear any invalid inputs consistently
                allDropdowns.forEach(type => {
                    const input = document.getElementById(`${type}Filter`);
                    if (input && !input.readOnly) {
                        const currentValue = input.value.trim();
                        const isValidSelection = activeFilters[type] === currentValue;
                        
                        if (!isValidSelection && currentValue !== '') {
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
    
    // Close all other dropdowns
    closeAllDropdowns();
    
    if (!isOpen) {
        container.classList.add('open');
        const input = document.getElementById(`${type}Filter`);
        
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
        const response = await fetch(`${API_BASE}/hierarchy`);
        const data = await response.json();
        
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
    
    options.innerHTML = items.map(item => {
        const displayText = (type === 'language' && languageDisplayMap[item]) ? languageDisplayMap[item] : item;
        return `
        <div class="dropdown-option ${item === currentValue ? 'selected' : ''}" data-value="${item}">
            <span>${displayText}</span>
            <i class="material-symbols-outlined dropdown-option-check">check</i>
        </div>
        `;
    }).join('');
    
    // Add click handlers
    options.querySelectorAll('.dropdown-option').forEach(option => {
        option.addEventListener('click', () => {
            const value = option.dataset.value;
            const displayText = option.querySelector('span').textContent;
            selectDropdownOption(type, value, displayText);
        });
    });
}

function filterDropdownOptions(type, searchTerm) {
    let items = [];
    
    if (type === 'faculty') {
        items = Object.keys(window.facultyCoursesData || {}).sort();
    } else if (type === 'course') {
        const selectedFaculty = activeFilters.faculty;
        if (selectedFaculty && window.facultyCoursesData && window.facultyCoursesData[selectedFaculty]) {
            items = window.facultyCoursesData[selectedFaculty].map(course => course[1]).sort();
        } else if (window.facultyCoursesData) {
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
    } else if (type === 'language') {
        items = ['Italian', 'English'];
    } else if (type === 'academicYear') {
        items = ['2024/2025', '2023/2024', '2022/2023', '2021/2022'];
    }
    
    // For static dropdowns, don't filter by search term (they're readonly)
    if (['documentType', 'language', 'academicYear'].includes(type)) {
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
    
    // Use displayText if provided, otherwise use value
    input.value = displayText || value;
    container.classList.remove('open');
    
    // Update visual selection in dropdown
    const options = document.getElementById(`${type}Options`);
    if (options) {
        options.querySelectorAll('.dropdown-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.value === value) {
                option.classList.add('selected');
            }
        });
    }
    
    // Map dropdown types to filter keys
    const filterKeyMap = {
        'faculty': 'faculty',
        'course': 'course',
        'canale': 'canale',
        'documentType': 'documentType',
        'language': 'language',
        'academicYear': 'academicYear'
    };
    
    const filterKey = filterKeyMap[type] || type;
    
    // Update active filters
    if (value && value.trim()) {
        activeFilters[filterKey] = value.trim();
    } else {
        delete activeFilters[filterKey];
    }
    
    // Update dependent dropdowns
    if (type === 'faculty') {
        const courseInput = document.getElementById('courseFilter');
        courseInput.value = '';
        delete activeFilters.course;
        // Don't auto-open course dropdown, just update its options
        filterDropdownOptions('course', '');
    }
    
    applyFiltersAndRender();
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

function applyFiltersAndRender() {
    const filteredFiles = applyFiltersToFiles(originalFiles);
    renderDocuments(filteredFiles);
    updateActiveFiltersDisplay();
    updateFilterCount();
    updateBottomFilterCount();
    
    // Show filter status
    const filterCount = Object.keys(activeFilters).length;
    if (filterCount > 0) {
        showStatus(`${filteredFiles.length} documenti trovati con ${filterCount} filtri attivi 🎯`);
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
        const hierarchyResponse = await makeRequest('/hierarchy');
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

    // Save current selection
    const input = document.getElementById(`${type}Filter`);
    const currentValue = activeFilters[type] || '';

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
    
    // Update visual selection
    optionsContainer.querySelectorAll('.dropdown-option').forEach(option => {
        option.classList.toggle('selected', option.dataset.value === currentValue);
    });
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
    
    // Reset all dropdown filters to their default values
    const dropdownResets = [
        { id: 'documentTypeFilter', defaultValue: 'Tutti i tipi' },
        { id: 'languageFilter', defaultValue: 'Tutte le lingue' },
        { id: 'academicYearFilter', defaultValue: 'Tutti gli anni' }
    ];
    
    dropdownResets.forEach(({ id, defaultValue }) => {
        const input = document.getElementById(id);
        if (input) {
            input.value = defaultValue;
        }
        
        // Reset visual selection in dropdown options
        const optionsContainer = document.getElementById(id.replace('Filter', 'Options'));
        if (optionsContainer) {
            optionsContainer.querySelectorAll('.dropdown-option').forEach(option => {
                option.classList.toggle('selected', option.dataset.value === '');
            });
        }
    });
    
    // Reset all autocomplete inputs
    const autocompleteInputs = ['autoreFilter', 'facultyFilter', 'courseFilter', 'canaleFilter'];
    autocompleteInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = '';
        }
    });
    
    // Close all dropdowns and hide suggestion containers
    closeAllDropdowns();
    document.querySelectorAll('.author-suggestions, .autocomplete-suggestions').forEach(suggestions => {
        suggestions.classList.remove('show');
    });
    document.querySelectorAll('.author-container').forEach(container => {
        container.classList.remove('open');
    });
    
    // Reset rating stars
    document.querySelectorAll('.rating-star-filter').forEach(star => {
        star.classList.remove('active');
        star.style.color = '#d1d5db';
    });
    
    const ratingText = document.getElementById('ratingText');
    if (ratingText) ratingText.textContent = 'Qualsiasi rating';
    
    // Reset toggle groups
    document.querySelectorAll('.price-toggle, .size-toggle, .time-toggle').forEach(toggle => {
        toggle.classList.remove('active');
    });
    
    // Activate "all" toggles
    const allToggles = document.querySelectorAll('[data-price="all"], [data-size="all"], [data-time="all"]');
    allToggles.forEach(toggle => toggle.classList.add('active'));
    
    // Reset price range and show it (since "All" is now active)
    const minPriceRange = document.getElementById('minPriceRange');
    const maxPriceRange = document.getElementById('maxPriceRange');
    const minPriceValue = document.getElementById('minPriceValue');
    const maxPriceValue = document.getElementById('maxPriceValue');
    const priceRangeContainer = document.getElementById('priceRangeContainer');
    
    if (minPriceRange) minPriceRange.value = 0;
    if (maxPriceRange) maxPriceRange.value = 100;
    if (minPriceValue) minPriceValue.textContent = '€0';
    if (maxPriceValue) maxPriceValue.textContent = '€100';
    
    updatePriceSliderFill();
    
    // Show price range container since "All" toggle is active
    if (priceRangeContainer) priceRangeContainer.style.display = 'block';
    
    // Apply changes immediately
    applyFiltersAndRender();
    
    showStatus('Tutti i filtri sono stati rimossi 🧹');
}

function applyFiltersToFiles(files) {
    return files.filter(file => {
        // Faculty filter - case insensitive partial match
        if (activeFilters.faculty) {
            const fileFaculty = file.faculty_name || file.vetrina_info?.faculty_name || '';
            if (!fileFaculty.toLowerCase().includes(activeFilters.faculty.toLowerCase())) {
                return false;
            }
        }
        
        // Course filter - case insensitive partial match
        if (activeFilters.course) {
            const fileCourse = file.course_name || file.vetrina_info?.course_name || '';
            if (!fileCourse.toLowerCase().includes(activeFilters.course.toLowerCase())) {
                return false;
            }
        }
        
        // Author filter - case insensitive partial match
        if (activeFilters.author) {
            const fileAuthor = file.author_username || file.vetrina_info?.owner_username || '';
            if (!fileAuthor.toLowerCase().includes(activeFilters.author.toLowerCase())) {
                return false;
            }
        }
        
        // Document type filter - exact match
        if (activeFilters.documentType) {
            const fileType = file.document_type || '';
            if (fileType !== activeFilters.documentType) {
                return false;
            }
        }
        
        // Language filter - exact match
        if (activeFilters.language) {
            const fileLanguage = file.language || '';
            if (fileLanguage !== activeFilters.language) {
                return false;
            }
        }
        
        // Canale filter - exact match
        if (activeFilters.canale) {
            const fileCanale = file.canale || file.vetrina_info?.canale || '';
            if (fileCanale !== activeFilters.canale) {
                return false;
            }
        }
        
        // Academic year filter - exact match
        if (activeFilters.academicYear) {
            const fileYear = file.academic_year || '';
            if (fileYear !== activeFilters.academicYear) {
                return false;
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
        
        return true;
    });
}

function updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('activeFilters');
    if (!activeFiltersContainer) return;
    
    const filterEntries = Object.entries(activeFilters).filter(([key, value]) => {
        return value !== null && value !== undefined && value !== '' && value !== 'all';
    });
    
    if (filterEntries.length === 0) {
        activeFiltersContainer.classList.remove('has-filters');
        activeFiltersContainer.innerHTML = '';
        return;
    }
    
    activeFiltersContainer.classList.add('has-filters');
    
    const filterTags = [];
    
    // Add "Clear All" button as the very first filter tag - SAME STYLING AS OTHERS
    filterTags.push(`
        <div class="filter-tag clear-all-tag" onclick="clearAllFiltersAction()">
            <i class="material-symbols-outlined">clear_all</i>
            <span>Rimuovi tutti</span>
        </div>
    `);
    
    filterEntries.forEach(([key, value]) => {
        let displayText = '';
        
        switch (key) {
            case 'faculty':
                displayText = `Facoltà: ${value}`;
                break;
            case 'course':
                displayText = `Corso: ${value}`;
                break;
            case 'author':
                displayText = `Autore: ${value}`;
                break;
            case 'documentType':
                displayText = `Tipo: ${value}`;
                break;
            case 'language':
                displayText = `Lingua: ${value}`;
                break;
            case 'canale':
                displayText = `Canale: ${value}`;
                break;
            case 'academicYear':
                displayText = `Anno: ${value}`;
                break;
            case 'minRating':
                displayText = `Rating: ${value}+ ⭐`;
                break;
            case 'priceType':
                if (value === 'free') {
                    displayText = 'Gratis 🆓';
                } else if (value === 'paid') {
                    displayText = 'A pagamento 💰';
                } else if (value === 'all') {
                    displayText = 'Tutti i prezzi 💱';
                }
                break;
            case 'sizeType':
                const sizeLabels = {
                    'small': '< 5MB',
                    'medium': '5-20MB',
                    'large': '> 20MB'
                };
                displayText = `Dimensione: ${sizeLabels[value]}`;
                break;
            case 'timeType':
                const timeLabels = {
                    'week': 'Ultima settimana',
                    'month': 'Ultimo mese',
                    'year': 'Ultimo anno'
                };
                displayText = timeLabels[value];
                break;
        }
        
        if (displayText) {
            // MAKE ENTIRE FILTER TAG CLICKABLE FOR REMOVAL
            filterTags.push(`
                <div class="filter-tag" onclick="removeFilter('${key}')">
                    <span>${displayText}</span>
                    <i class="material-symbols-outlined">close</i>
                </div>
            `);
        }
    });
    
    // Add price range tag if min/max are set and not default values
    if ((activeFilters.minPrice !== undefined || activeFilters.maxPrice !== undefined) &&
        (activeFilters.minPrice !== 0 || activeFilters.maxPrice !== 100)) {
        const minPrice = activeFilters.minPrice !== undefined ? activeFilters.minPrice : 0;
        const maxPrice = activeFilters.maxPrice !== undefined ? activeFilters.maxPrice : 100;
        // MAKE ENTIRE PRICE RANGE TAG CLICKABLE FOR REMOVAL
        filterTags.push(`
            <div class="filter-tag" onclick="removeFilter('priceRange')">
                <span>€${minPrice}-€${maxPrice}</span>
                <i class="material-symbols-outlined">close</i>
            </div>
        `);
    }
    
    activeFiltersContainer.innerHTML = filterTags.join('');
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
    }
    
    // Apply changes immediately
    applyFiltersAndRender();
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
        const response = await fetch(API_BASE + url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
                ...options.headers
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
            const data = await response.json();
            throw new Error(data.msg || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}

async function loadAllFiles() {
    try {
        showStatus('Caricamento documenti... 📚');
        
        // First get all vetrine
        const vetrineResponse = await makeRequest('/vetrine');
        if (!vetrineResponse) {
            throw new Error('Failed to fetch vetrine');
        }
        
        currentVetrine = vetrineResponse.vetrine || [];
        console.log('Loaded vetrine:', currentVetrine);
        
        // Load files for each vetrina and group them by vetrina
        const allFiles = [];
        for (const vetrina of currentVetrine) {
            try {
                const filesResponse = await makeRequest(`/vetrine/${vetrina.id}/files`);
                if (filesResponse && filesResponse.files) {
                    const files = filesResponse.files;
                    
                    if (files.length === 0) continue;
                    
                    // Calculate total size and average price for the vetrina
                    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
                    const totalPrice = files.reduce((sum, file) => sum + (file.price || 0), 0);
                    
                    // Transform the vetrina into a card item
                    const vetrineCard = {
                        id: vetrina.id,
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
                            owned: file.owned || false
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
                        course_name: vetrina.course_instance?.course_name || extractCourseFromVetrina(vetrina.name),
                        faculty_name: vetrina.course_instance?.faculty_name || extractFacultyFromVetrina(vetrina.name),
                        language: vetrina.course_instance?.language || 'Italiano',
                        canale: vetrina.course_instance?.canale || 'A',
                        course_semester: vetrina.course_instance?.course_semester || 'Primo Semestre',
                        academic_year: `${vetrina.course_instance?.date_year || 2024}/${(vetrina.course_instance?.date_year || 2024) + 1}`,
                        document_type: files.length > 1 ? 'BUNDLE' : getFileTypeFromFilename(files[0].filename),
                        author_username: vetrina.owner?.username || 'Unknown',
                        owned: files.every(file => file.owned),
                        vetrina_info: {
                            id: vetrina.id,
                            name: vetrina.name,
                            description: vetrina.description,
                            course_instance_id: vetrina.course_instance?.instance_id,
                            owner_id: vetrina.owner?.id,
                            owner_username: vetrina.owner?.username || 'Unknown'
                        }
                    };
                    allFiles.push(vetrineCard);
                }
            } catch (error) {
                console.error(`Error loading files for vetrina ${vetrina.id}:`, error);
            }
        }
        
        currentFiles = allFiles;
        originalFiles = [...allFiles]; // Keep original copy
        renderDocuments(currentFiles);
        populateFilterOptions();
        showStatus(`${allFiles.length} documenti caricati con successo! 🎉`);
        
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

function renderDocuments(files) {
    const grid = document.getElementById('documentsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (!files || files.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <span class="material-symbols-outlined">search_off</span>
                <h3>Nessun risultato trovato</h3>
                <p>Prova a modificare i filtri o a cercare qualcos'altro</p>
            </div>
        `;
        return;
    }
    
    files.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        // Make the entire card clickable
        card.style.cursor = 'pointer';
        card.onclick = () => {
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
        
        // Determine if this is a multi-file vetrina
        const isMultiFile = item.isVetrina && item.fileCount > 1;
        const fileStackClass = isMultiFile ? 'file-stack' : '';
        const stackCountBadge = isMultiFile ? `<div class="file-count-badge">${item.fileCount}</div>` : '';
        
        // Generate preview based on whether it's a single file or multi-file vetrina
        let previewContent;
        if (isMultiFile) {
            // Show professional file stack with uniform grid on hover
            const fileCount = item.fileCount;
            const files = item.files;
            
            // Generate dynamic stack layers based on file count
            let stackLayers = '';
            if (fileCount === 2) {
                // 2 files: back and front
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
                // 3 files: back, middle, front
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
                // More than 3 files: show 3 layers representing different files
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
            
            // Generate files for the centered carousel
            const carouselFiles = files.map((file, index) => `
                <div class="carousel-file" data-index="${index}">
                    <span class="document-icon">${getDocumentPreviewIcon(file.filename)}</span>
                    <div class="file-extension">${file.document_type}</div>
                    <div class="file-name">${file.filename.length > 12 ? file.filename.substring(0, 12) + '...' : file.filename}</div>
                </div>
            `).join('');
            
            previewContent = `
                <div class="preview-icon ${fileStackClass}" data-file-count="${fileCount}">
                    <div class="file-stack-container">
                        ${stackLayers}
                        ${stackCountBadge}
                    </div>
                    <div class="files-carousel-container" data-files-count="${files.length}">
                        <div class="carousel-viewport">
                            <div class="carousel-track">
                                ${carouselFiles}
                            </div>
                            <div class="carousel-scroll-hint">scroll to browse</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Single file preview
            const filename = item.isVetrina ? item.files[0].filename : item.filename;
            previewContent = `
                <div class="preview-icon">
                    <span class="document-icon">${getDocumentPreviewIcon(filename)}</span>
                    <div class="file-extension">${documentType}</div>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="document-preview">
                ${previewContent}
                <div class="document-type-badge">${documentCategory}</div>
                <div class="rating-badge">
                    <div class="rating-stars">${stars}</div>
                    <span class="rating-count">(${reviewCount})</span>
                </div>
            </div>
            
            <button class="favorite-button" onclick="event.stopPropagation(); toggleFavorite(this)" title="Aggiungi ai preferiti">
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
                    <div class="document-info-item" title="Corso: ${item.course_name || 'N/A'}">
                        <span class="info-icon">📚</span>
                        <span class="info-text">${item.course_name || 'N/A'}</span>
                    </div>
                    <div class="document-info-item" title="Facoltà: ${item.faculty_name || 'N/A'}">
                        <span class="info-icon">🏛️</span>
                        <span class="info-text">${item.faculty_name || 'N/A'}</span>
                    </div>
                    <div class="document-info-item" title="Lingua: ${item.language || 'N/A'}">
                        <span class="info-icon">📝</span>
                        <span class="info-text">${item.language || 'N/A'}</span>
                    </div>
                </div>
                <div class="document-footer">
                    <div class="document-footer-left">
                        <div class="owner-avatar" title="Caricato da ${item.author_username || 'Unknown'}">
                            ${item.author_username ? item.author_username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div class="document-meta">${formatFileSize(item.size || 0)}</div>
                    </div>
                    <div class="document-price ${price === 0 ? 'free' : 'paid'}" title="${price === 0 ? 'Documento gratuito' : `Prezzo: €${price}`}">
                        ${price === 0 ? 'Gratis' : `€${price}`}
                    </div>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });

    // Initialize card animations
    setTimeout(() => {
        const cards = document.querySelectorAll('.document-card');
        cards.forEach((card, index) => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
        
        // Initialize carousel interactions after a brief delay
        setTimeout(() => {
            initializeCarousels();
        }, 150);
    }, 100);
}

function initializeCarousels() {
    const carouselContainers = document.querySelectorAll('.files-carousel-container');
    
    carouselContainers.forEach(container => {
        const track = container.querySelector('.carousel-track');
        const files = container.querySelectorAll('.carousel-file');
        const filesCount = parseInt(container.dataset.filesCount) || files.length;
        const documentCard = container.closest('.document-card');
        
        if (files.length === 0) return;
        
        let currentIndex = 0;
        let isScrolling = false;
        let startX = 0;
        let startScrollLeft = 0;
        let carouselActive = false;
        
        // Listen for hover to start the animation sequence
        documentCard.addEventListener('mouseenter', () => {
            if (!carouselActive) {
                // Delay setting active states until animation completes
                setTimeout(() => {
                    carouselActive = true;
                    updateCarouselDisplay();
                }, 1000); // After all files have animated in
            }
        });
        
        documentCard.addEventListener('mouseleave', () => {
            carouselActive = false;
            // Reset all states when leaving
            files.forEach(file => {
                file.classList.remove('active', 'side', 'far');
            });
        });
        
        function updateCarouselDisplay() {
            if (!carouselActive) return;
            
            files.forEach((file, index) => {
                file.classList.remove('active', 'side', 'far');
                
                if (index === currentIndex) {
                    file.classList.add('active');
                } else if (Math.abs(index - currentIndex) === 1 || 
                          (currentIndex === 0 && index === filesCount - 1) ||
                          (currentIndex === filesCount - 1 && index === 0)) {
                    file.classList.add('side');
                } else {
                    file.classList.add('far');
                }
            });
            
            // Center the active file
            const activeFile = files[currentIndex];
            if (activeFile) {
                const containerWidth = container.clientWidth;
                const fileLeft = activeFile.offsetLeft;
                const fileWidth = activeFile.clientWidth;
                const centerPosition = fileLeft - (containerWidth / 2) + (fileWidth / 2);
                track.style.transform = `translateX(-${centerPosition}px)`;
            }
        }
        
        function nextFile() {
            if (!carouselActive) return;
            currentIndex = (currentIndex + 1) % filesCount;
            updateCarouselDisplay();
        }
        
        function prevFile() {
            if (!carouselActive) return;
            currentIndex = (currentIndex - 1 + filesCount) % filesCount;
            updateCarouselDisplay();
        }
        
        // Mouse/touch interactions
        track.addEventListener('mousedown', startDrag);
        track.addEventListener('touchstart', startDrag);
        
        function startDrag(e) {
            if (!carouselActive) return;
            isScrolling = true;
            startX = e.pageX || e.touches[0].pageX;
            startScrollLeft = currentIndex;
            track.style.cursor = 'grabbing';
        }
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag);
        
        function drag(e) {
            if (!isScrolling) return;
            e.preventDefault();
            
            const x = e.pageX || e.touches[0].pageX;
            const deltaX = startX - x;
            const threshold = 50; // Minimum drag distance to trigger change
            
            if (Math.abs(deltaX) > threshold) {
                if (deltaX > 0) {
                    nextFile();
                } else {
                    prevFile();
                }
                isScrolling = false;
                track.style.cursor = 'grab';
            }
        }
        
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
        
        function stopDrag() {
            isScrolling = false;
            track.style.cursor = 'grab';
        }
        
        // Wheel scroll interaction
        container.addEventListener('wheel', (e) => {
            if (!carouselActive) return;
            e.preventDefault();
            if (e.deltaY > 0) {
                nextFile();
            } else {
                prevFile();
            }
        });
        
        // Click on files to make them active
        files.forEach((file, index) => {
            file.addEventListener('click', () => {
                if (!carouselActive) return;
                currentIndex = index;
                updateCarouselDisplay();
            });
        });
        
        // Auto-scroll demonstration (optional - can be removed)
        let autoScrollInterval;
        
        container.addEventListener('mouseenter', () => {
            clearInterval(autoScrollInterval);
        });
        
        container.addEventListener('mouseleave', () => {
            // Start auto-scroll after 3 seconds of no interaction
            setTimeout(() => {
                if (!container.matches(':hover') && carouselActive) {
                    autoScrollInterval = setInterval(() => {
                        if (!container.matches(':hover') && carouselActive) {
                            nextFile();
                        } else {
                            clearInterval(autoScrollInterval);
                        }
                    }, 2000);
                }
            }, 3000);
        });
    });
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

function toggleFavorite(button) {
    button.classList.toggle('active');
    const isFavorited = button.classList.contains('active');
    showStatus(isFavorited ? 'Aggiunto ai preferiti! ❤️' : 'Rimosso dai preferiti 💔');
}

function previewDocument(fileId) {
    const file = currentFiles.find(f => f.id === fileId);
    if (!file) return;

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

function performSearch(query) {
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
        // Tier 1: Highest Priority
        if (checkFieldMatch(file.title, 100)) hasMatch = true;                    // Title: 100x
        if (checkFieldMatch(file.course_name, 80)) hasMatch = true;               // Course: 80x
        
        // Tier 2: High Priority  
        if (checkFieldMatch(file.description, 60)) hasMatch = true;               // Description: 60x
        if (checkFieldMatch(file.faculty_name, 50)) hasMatch = true;              // Faculty: 50x
        
        // Tier 3: Medium Priority
        if (checkFieldMatch(file.author_username, 40)) hasMatch = true;           // Author: 40x
        if (checkFieldMatch(file.main_professor, 35)) hasMatch = true;            // Professor: 35x
        if (checkFieldMatch(file.vetrina_info?.name, 30)) hasMatch = true;        // Vetrina name: 30x
        
        // Tier 4: Lower Priority
        if (checkFieldMatch(file.vetrina_info?.description, 20)) hasMatch = true; // Vetrina desc: 20x
        if (checkFieldMatch(file.document_type, 15)) hasMatch = true;             // Doc type: 15x
        if (checkFieldMatch(file.language, 10)) hasMatch = true;                  // Language: 10x
        if (checkFieldMatch(file.vetrina_info?.owner_username, 10)) hasMatch = true; // Owner: 10x
        
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
    
    renderDocuments(filtered);
    
    // Enhanced status message with more context
    const searchSummary = searchTerms.length > 1 
        ? `"${searchTerms.join('" + "')}"` 
        : `"${query}"`;
    
    showStatus(`Trovati ${filtered.length} documenti per ${searchSummary} 🔍`);
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
        searchBtn.addEventListener('click', function() {
            performSearch(searchInput.value);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });

        // Real-time search with debounce
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (!this.value.trim()) {
                    // If search is cleared, apply current filters or show all
                    if (Object.keys(activeFilters).length > 0) {
                        const filtered = applyFiltersToFiles(originalFiles);
                        renderDocuments(filtered);
                    } else {
                        renderDocuments(originalFiles);
                    }
                } else if (this.value.length >= 2) {
                    // Only search when at least 2 characters
                    performSearch(this.value);
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