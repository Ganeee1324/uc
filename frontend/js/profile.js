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

async function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Hide all content sections
    const profileSection = document.querySelector('.profile-section');
    const dashboardRow = document.querySelector('.dashboard-row');
    const statsDashboard = document.getElementById('statsDashboard');
    const documentsDashboard = document.getElementById('documentsDashboard');
    const favoritesDashboard = document.getElementById('favoritesDashboard');
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
        if (mainSearchContainer) mainSearchContainer.style.display = 'none';
        if (documentsSearchContainer) {
            documentsSearchContainer.style.display = 'none';
            documentsSearchContainer.innerHTML = '';
        }
        if (favoritesSearchContainer) {
            favoritesSearchContainer.style.display = 'none';
            favoritesSearchContainer.innerHTML = '';
        }
        
        currentTab = 'stats';
    } else if (tabName === 'documents') {
        // Show documents dashboard, hide others
        if (profileSection) profileSection.style.display = 'none';
        if (dashboardRow) dashboardRow.style.display = 'none';
        if (statsDashboard) statsDashboard.style.display = 'none';
        if (favoritesDashboard) favoritesDashboard.style.display = 'none';
        if (mainSearchContainer) mainSearchContainer.style.display = 'none';
        if (favoritesSearchContainer) {
            favoritesSearchContainer.style.display = 'none';
            favoritesSearchContainer.innerHTML = '';
        }
        
        // Show documents dashboard
        if (documentsDashboard) documentsDashboard.style.display = 'block';
        if (documentsSearchContainer) documentsSearchContainer.style.display = 'block';
        
        currentTab = 'documents';
        
        // Documents search component is now handled via HTML Web Component - will auto-initialize
        console.log('Documents dashboard activated - search-section web component will handle itself');
    } else if (tabName === 'favorites') {
        // Show favorites dashboard, hide others
        if (profileSection) profileSection.style.display = 'none';
        if (dashboardRow) dashboardRow.style.display = 'none';
        if (statsDashboard) statsDashboard.style.display = 'none';
        if (documentsDashboard) documentsDashboard.style.display = 'none';
        if (mainSearchContainer) mainSearchContainer.style.display = 'none';
        if (documentsSearchContainer) {
            documentsSearchContainer.style.display = 'none';
            documentsSearchContainer.innerHTML = '';
        }
        
        // Show favorites dashboard
        if (favoritesDashboard) favoritesDashboard.style.display = 'block';
        if (favoritesSearchContainer) favoritesSearchContainer.style.display = 'block';
        
        currentTab = 'favorites';
        
        // Load favorites users first
        await loadFavoritesUsers();
        
        // Favorites search component is now handled via HTML Web Component - will auto-initialize
        console.log('Favorites dashboard activated - search-section web component will handle itself');
    } else {
        // Show profile/dashboard content, hide stats, documents, and favorites
        if (profileSection) profileSection.style.display = 'block';
        if (dashboardRow) dashboardRow.style.display = 'flex';
        if (statsDashboard) statsDashboard.style.display = 'none';
        if (documentsDashboard) documentsDashboard.style.display = 'none';
        if (favoritesDashboard) favoritesDashboard.style.display = 'none';
        if (mainSearchContainer) {
            mainSearchContainer.style.display = 'block';
            console.log('Setting main search container to display: block');
        }
        if (documentsSearchContainer) {
            documentsSearchContainer.style.display = 'none';
            // Clear documents search container
            documentsSearchContainer.innerHTML = '';
        }
        if (favoritesSearchContainer) {
            favoritesSearchContainer.style.display = 'none';
            // Clear favorites search container
            favoritesSearchContainer.innerHTML = '';
        }
        
        // Main search component is now handled via HTML Web Component - will auto-initialize
        console.log('Profile tab switched - search-section web component will handle itself');
        
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
        { first: 'Alice', last: 'Acciaio', email: 'alice.acciaio@email.com' }
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
    
    if (!dropdownBtn || !dropdownMenu) return;
    
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
    
    timeFilterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all buttons
            timeFilterBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Get period and update chart
            const period = btn.getAttribute('data-period');
            updateChartPeriod(period);
        });
    });
}

function initializeDocumentsPeriodFilter() {
    const periodBtn = document.getElementById('documentsPeriodBtn');
    const periodDropdown = document.getElementById('documentsPeriodDropdown');
    const periodOptions = document.querySelectorAll('.period-option');
    
    if (!periodBtn || !periodDropdown) return;
    
    // Toggle dropdown on button click
    periodBtn.addEventListener('click', (e) => {
        e.stopPropagation();
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
}

function openDocumentsPeriodDropdown() {
    const periodBtn = document.getElementById('documentsPeriodBtn');
    const periodDropdown = document.getElementById('documentsPeriodDropdown');
    
    if (periodBtn && periodDropdown) {
        periodBtn.classList.add('active');
        periodDropdown.classList.add('show');
    }
}

function closeDocumentsPeriodDropdown() {
    const periodBtn = document.getElementById('documentsPeriodBtn');
    const periodDropdown = document.getElementById('documentsPeriodDropdown');
    
    if (periodBtn && periodDropdown) {
        periodBtn.classList.remove('active');
        periodDropdown.classList.remove('show');
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

function updateChart(chartType) {
    console.log('Updating chart to show:', chartType);
    
    // Here you would typically update the chart with real data
    // For now, we'll just update the mock chart with different colors
    const chartLine = document.querySelector('.chart-line');
    const chartPoints = document.querySelectorAll('.chart-point');
    
    if (!chartLine) return;
    
    const colors = {
        revenue: '#3b82f6',
        sales: '#10b981',
        downloads: '#f59e0b',
        views: '#8b5cf6',
        conversion: '#ef4444'
    };
    
    const color = colors[chartType] || '#3b82f6';
    
    // Update chart colors
    chartLine.setAttribute('stroke', color);
    chartPoints.forEach(point => {
        point.setAttribute('fill', color);
    });
    
    // Update gradient
    const gradient = document.querySelector('#chartGradient stop:first-child');
    if (gradient) {
        gradient.style.stopColor = color;
    }
    
    // Add animation
    chartLine.style.transition = 'stroke 0.3s ease';
    chartPoints.forEach(point => {
        point.style.transition = 'fill 0.3s ease';
    });
}

function updateChartPeriod(period) {
    console.log('Updating chart period to:', period);
    
    // Here you would typically fetch new data based on the period
    // For now, we'll just log the change
    
    // You could animate the chart here or fetch new data
    const chartLine = document.querySelector('.chart-line');
    if (chartLine) {
        // Add a subtle animation to indicate data change
        chartLine.style.opacity = '0.5';
        setTimeout(() => {
            chartLine.style.opacity = '1';
        }, 300);
    }
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
        // If no user is logged in, redirect to login page
        window.location.href = 'index.html';
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
// MAIN INITIALIZATION
// ===========================

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize user personalization first
    await initializeUserPersonalization();
    
    // Main search component is now handled via HTML Web Component - will auto-initialize
    console.log('Profile page loaded - search-section web components will handle themselves');
    
    // Initialize dashboard functionality
    initializeMobileMenu();
    initializeTabSwitching(); // Add tab switching functionality
    initializeStatsDropdown(); // Add stats dropdown functionality
    initializeTimeFilters(); // Add time filters functionality
    initializeDocumentsPeriodFilter(); // Add documents period filter functionality
    initializeDocumentPerformanceItems(); // Add document performance interactivity
    initializeLogout(); // Add logout functionality
    
    // Set initial tab state to ensure proper display
    await switchTab('profile');
    
    // Initialize animations when switching to stats tab
    setTimeout(() => {
        const venditeMenuItem = document.querySelector('.menu-item:nth-child(2)');
        if (venditeMenuItem) {
            const originalSwitchTab = switchTab;
            window.switchTab = async function(tabName) {
                await originalSwitchTab(tabName);
                if (tabName === 'stats') {
                    setTimeout(() => {
                        animateStatsCards();
                        // Re-initialize document items after tab switch
                        setTimeout(() => {
                            initializeDocumentPerformanceItems();
                        }, 300);
                    }, 100);
                }
            };
        }
    }, 100);
}); 