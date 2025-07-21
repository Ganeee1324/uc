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

document.addEventListener('DOMContentLoaded', function() {
    initializeAISearchToggle();
    initializeFilters();
}); 