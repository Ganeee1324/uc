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
            filtersPanel.style.zIndex = '10000'; // Below sidebar overlay (10001)
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
    const orderOptions = document.querySelectorAll('.order-option');
    
    if (!orderBtn || !orderDropdown) return;
    
    // Toggle dropdown on button click
    orderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        orderDropdown.classList.toggle('show');
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
    
    // Remove active class from all options
    document.querySelectorAll('.order-option').forEach(opt => opt.classList.remove('active'));
    // Add active class to selected option
    const selectedOption = document.querySelector(`[data-order="${orderType}"]`);
    if (selectedOption) {
        selectedOption.classList.add('active');
    }
    
    // Here you can add logic to actually sort the results
    console.log('Selected order:', orderType);
}

// Sticky Search Bar Functionality (copied from search.js)
function initializeStickySearch() {
    const searchContainerWrapper = document.querySelector('.search-container-wrapper');
    
    if (!searchContainerWrapper) {
        return;
    }

    // Simple scroll event listener to add/remove stuck class
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add stuck class when scrolled down
        if (scrollTop > 100) {
            searchContainerWrapper.classList.add('is-stuck');
        } else {
            searchContainerWrapper.classList.remove('is-stuck');
        }
    });
}

// ===========================
// TAB SWITCHING FUNCTIONALITY
// ===========================

let currentTab = 'profile'; // Default tab

function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Hide all content sections
    const profileSection = document.querySelector('.profile-section');
    const dashboardRow = document.querySelector('.dashboard-row');
    const searchSection = document.getElementById('searchSection');
    const statsDashboard = document.getElementById('statsDashboard');
    
    if (tabName === 'stats') {
        // Show stats dashboard, hide others
        if (profileSection) profileSection.style.display = 'none';
        if (dashboardRow) dashboardRow.style.display = 'none';
        if (searchSection) searchSection.style.display = 'none';
        if (statsDashboard) statsDashboard.style.display = 'block';
        
        currentTab = 'stats';
    } else {
        // Show profile/dashboard content, hide stats
        if (profileSection) profileSection.style.display = 'block';
        if (dashboardRow) dashboardRow.style.display = 'flex';
        if (searchSection) {
            // Reset search section to its original state
            searchSection.style.display = '';
            searchSection.style.gridTemplateAreas = '';
            searchSection.style.gridTemplateRows = '';
            searchSection.style.alignItems = '';
            searchSection.style.justifyContent = '';
            searchSection.style.marginTop = '';
            searchSection.style.padding = '';
            searchSection.style.textAlign = '';
            searchSection.style.position = '';
            searchSection.style.width = '';
            searchSection.style.maxWidth = '';
            searchSection.style.zIndex = '';
            searchSection.style.isolation = '';
        }
        if (statsDashboard) statsDashboard.style.display = 'none';
        
        currentTab = 'profile';
    }
}

function initializeTabSwitching() {
    // Get menu items
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach((item) => {
        item.addEventListener('click', function(e) {
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
                    switchTab('stats');
                } else if (text === 'Profilo') {
                    console.log('Switching to Profilo tab');
                    switchTab('profile');
                } else {
                    // For other menu items, just switch back to profile view
                    console.log('Switching to profile view for:', text);
                    switchTab('profile');
                }
            }
        });
    });
}

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

// Safari Glow Fix - Temporarily apply hover state on initial load
function initializeSafariGlowFix() {
    // Detect Safari browser
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isSafari) {
        const searchBar = document.querySelector('.search-bar');
        if (searchBar) {
            // Add hover class immediately to force Safari to render the glow effect
            searchBar.classList.add('safari-hover-fix');
            
            // Force immediate style recalculation
            searchBar.offsetHeight;
            
            // Remove the hover class after a short delay to return to normal state
            setTimeout(() => {
                searchBar.classList.remove('safari-hover-fix');
            }, 150); // 150ms should be enough to trigger proper rendering
        }
    }
}

// Execute Safari fix as early as possible, even before DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSafariGlowFix);
} else {
    // DOM is already loaded, execute immediately
    initializeSafariGlowFix();
}

document.addEventListener('DOMContentLoaded', function() {
    initializeMobileMenu();
    initializeAISearchToggle();
    initializeFilters();
    initializeOrderDropdown();
    initializeStickySearch(); // Add sticky search functionality
    initializeTabSwitching(); // Add tab switching functionality
    initializeStatsDropdown(); // Add stats dropdown functionality
    initializeTimeFilters(); // Add time filters functionality
    initializeDocumentsPeriodFilter(); // Add documents period filter functionality
    // initializeDonutChart(); // Donut chart removed
    initializeDocumentPerformanceItems(); // Add document performance interactivity
    
    // Initialize animations when switching to stats tab
    setTimeout(() => {
        const venditeMenuItem = document.querySelector('.menu-item:nth-child(2)');
        if (venditeMenuItem) {
            const originalSwitchTab = switchTab;
            window.switchTab = function(tabName) {
                originalSwitchTab(tabName);
                if (tabName === 'stats') {
                    setTimeout(() => {
                        animateStatsCards();
                        // Re-initialize document items after tab switch
                        setTimeout(() => {
                            // initializeDonutChart(); // Donut chart removed
                            initializeDocumentPerformanceItems();
                        }, 300);
                    }, 100);
                }
            };
        }
    }, 100);
}); 