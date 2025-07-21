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

document.addEventListener('DOMContentLoaded', function() {
    initializeAISearchToggle();
}); 