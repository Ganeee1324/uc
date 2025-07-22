// Mobile Menu Toggle Logic
let isMobileMenuOpen = false;

function toggleMobileMenu() {
    console.log('toggleMobileMenu called, current state:', isMobileMenuOpen);
    isMobileMenuOpen = !isMobileMenuOpen;
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const hamburgerInput = document.querySelector('#mobileMenuToggle input[type="checkbox"]');
    
    console.log('New state:', isMobileMenuOpen);
    console.log('Elements found:', { sidebar, sidebarOverlay, hamburgerInput });
    
    if (isMobileMenuOpen) {
        console.log('Opening mobile menu...');
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
        hamburgerInput.checked = true;
        document.body.style.overflow = 'hidden';
    } else {
        console.log('Closing mobile menu...');
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
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

// AI Search Toggle Logic (copied from search.js)

let aiSearchEnabled = false;

function updateSearchPlaceholder(aiEnabled) {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    if (aiEnabled) {
        searchInput.placeholder = 'Cerca con intelligenza semantica... (es. "concetti di fisica quantistica")';
    } else {
        searchInput.placeholder = 'Cerca una dispensa...';
    }
}

function initializeAISearchToggle() {
    const aiToggle = document.getElementById('aiSearchToggle');
    const toggleInput = document.getElementById('toggle');
    const searchBar = document.querySelector('.search-bar');
    const searchInput = document.getElementById('searchInput');
    if (!aiToggle || !toggleInput) return;
    // Load saved state from localStorage
    const savedState = localStorage.getItem('aiSearchEnabled');
    if (savedState === 'true') {
        aiSearchEnabled = true;
        toggleInput.checked = true;
        searchBar.classList.add('ai-active');
        const searchBarBackground = document.getElementById('searchBarBackground');
        if (searchBarBackground) searchBarBackground.classList.add('ai-active');
        updateSearchPlaceholder(true);
    }
    // Toggle event handler
    toggleInput.addEventListener('change', function(e) {
        aiSearchEnabled = toggleInput.checked;
        if (aiSearchEnabled) {
            searchBar.classList.add('ai-active');
            const searchBarBackground = document.getElementById('searchBarBackground');
            if (searchBarBackground) searchBarBackground.classList.add('ai-active');
            updateSearchPlaceholder(true);
            aiToggle.style.transform = 'scale(1.1)';
            setTimeout(() => { aiToggle.style.transform = ''; }, 200);
        } else {
            searchBar.classList.remove('ai-active');
            const searchBarBackground = document.getElementById('searchBarBackground');
            if (searchBarBackground) searchBarBackground.classList.remove('ai-active');
            updateSearchPlaceholder(false);
            aiToggle.style.transform = 'scale(0.95)';
            setTimeout(() => { aiToggle.style.transform = ''; }, 200);
        }
        localStorage.setItem('aiSearchEnabled', aiSearchEnabled.toString());
    });
    // Keyboard shortcut: Ctrl+Shift+A to toggle AI search
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            toggleInput.checked = !toggleInput.checked;
            toggleInput.dispatchEvent(new Event('change'));
        }
    });
    // Add tooltip on hover
    aiToggle.addEventListener('mouseenter', function() {
        const tooltip = aiSearchEnabled ?
            'Disattiva ricerca semantica (Ctrl+Shift+A)' :
            'Attiva ricerca semantica (Ctrl+Shift+A)';
        aiToggle.title = tooltip;
    });
}

// ===========================
// ADVANCED FILTER SYSTEM - FULLY FUNCTIONAL (copied from search.js)
// ===========================

let isFiltersOpen = false;

function toggleFiltersPanel() {
    isFiltersOpen = !isFiltersOpen;
    const filtersPanel = document.getElementById('filtersPanel');
    const filtersOverlay = document.getElementById('filtersOverlay');
    const mainContent = document.querySelector('.main-content');
    // Optionally, add: const documentsGrid = document.getElementById('documentsGrid');
    if (isFiltersOpen) {
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
        // if (documentsGrid) documentsGrid.classList.add('filters-open');
        document.body.classList.add('filters-open');
        document.body.style.overflow = 'hidden';
    } else {
        closeFiltersPanel();
    }
}

function closeFiltersPanel() {
    isFiltersOpen = false;
    const filtersPanel = document.getElementById('filtersPanel');
    const filtersOverlay = document.getElementById('filtersOverlay');
    const mainContent = document.querySelector('.main-content');
    // Optionally, add: const documentsGrid = document.getElementById('documentsGrid');
    if (filtersPanel) filtersPanel.classList.remove('active');
    if (filtersOverlay) filtersOverlay.classList.remove('active');
    if (mainContent) mainContent.classList.remove('filters-open');
    // if (documentsGrid) documentsGrid.classList.remove('filters-open');
    document.body.classList.remove('filters-open');
    document.body.style.overflow = '';
}

function initializeFilters() {
    const filtersBtn = document.getElementById('filtersBtn');
    const filtersPanel = document.getElementById('filtersPanel');
    const filtersOverlay = document.getElementById('filtersOverlay');
    const filtersClose = document.getElementById('filtersClose');
    const clearAllFilters = document.getElementById('clearAllFilters');
    if (filtersBtn) filtersBtn.addEventListener('click', toggleFiltersPanel);
    if (filtersClose) filtersClose.addEventListener('click', closeFiltersPanel);
    if (filtersOverlay) filtersOverlay.addEventListener('click', closeFiltersPanel);
    if (clearAllFilters) clearAllFilters.addEventListener('click', function() {
        // Reset all filter inputs (basic version)
        document.querySelectorAll('.dropdown-input').forEach(input => input.value = '');
        closeFiltersPanel();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isFiltersOpen) {
            closeFiltersPanel();
        }
    });
}

// Order/Sort Dropdown Functionality
function initializeOrderDropdown() {
    const orderBtn = document.getElementById('orderBtn');
    const orderDropdown = document.querySelector('.order-dropdown-content');
    const orderText = orderBtn?.querySelector('.order-text');
    let isOrderOpen = false;

    if (!orderBtn || !orderDropdown) return;

    // Toggle dropdown
    orderBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        isOrderOpen = !isOrderOpen;
        
        if (isOrderOpen) {
            orderDropdown.style.display = 'block';
            orderBtn.classList.add('active');
        } else {
            orderDropdown.style.display = 'none';
            orderBtn.classList.remove('active');
        }
    });

    // Handle option selection
    document.querySelectorAll('.order-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const selectedOrder = this.dataset.order;
            const selectedText = this.querySelector('.order-text').textContent;
            
            // Update button text
            if (orderText) {
                orderText.textContent = selectedText;
            }
            
            // Remove active class from all options
            document.querySelectorAll('.order-option').forEach(opt => opt.classList.remove('active'));
            // Add active class to selected option
            this.classList.add('active');
            
            // Close dropdown
            orderDropdown.style.display = 'none';
            orderBtn.classList.remove('active');
            isOrderOpen = false;
            
            // Here you can add logic to actually sort the results
            console.log('Selected order:', selectedOrder);
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (isOrderOpen && !orderBtn.contains(e.target) && !orderDropdown.contains(e.target)) {
            orderDropdown.style.display = 'none';
            orderBtn.classList.remove('active');
            isOrderOpen = false;
        }
    });

    // Close dropdown on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isOrderOpen) {
            orderDropdown.style.display = 'none';
            orderBtn.classList.remove('active');
            isOrderOpen = false;
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initializeMobileMenu();
    initializeAISearchToggle();
    initializeFilters();
    initializeOrderDropdown();
}); 