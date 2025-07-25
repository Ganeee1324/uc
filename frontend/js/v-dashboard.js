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
    const mainSearchContainer = document.getElementById('searchSectionContainer');
    const documentsSearchContainer = document.getElementById('documentsSearchSectionContainer');
    
    if (tabName === 'stats') {
        // Show stats dashboard, hide others
        if (profileSection) profileSection.style.display = 'none';
        if (dashboardRow) dashboardRow.style.display = 'none';
        if (statsDashboard) statsDashboard.style.display = 'block';
        if (documentsDashboard) documentsDashboard.style.display = 'none';
        if (mainSearchContainer) mainSearchContainer.style.display = 'none';
        if (documentsSearchContainer) documentsSearchContainer.style.display = 'none';
        
        currentTab = 'stats';
    } else if (tabName === 'documents') {
        // Show purchased documents section, hide others
        if (profileSection) profileSection.style.display = 'none';
        if (dashboardRow) dashboardRow.style.display = 'none';
        if (statsDashboard) statsDashboard.style.display = 'none';
        if (mainSearchContainer) mainSearchContainer.style.display = 'none';
        
        // Show purchased documents section
        const purchasedDocumentsSection = document.getElementById('purchasedDocumentsSection');
        if (purchasedDocumentsSection) {
            purchasedDocumentsSection.style.display = 'block';
        }
        
        currentTab = 'documents';
        
        // Load purchased documents when switching to documents tab
        loadPurchasedDocuments();
    } else {
        // Show profile/dashboard content, hide stats and documents
        if (profileSection) profileSection.style.display = 'block';
        if (dashboardRow) dashboardRow.style.display = 'flex';
        if (statsDashboard) statsDashboard.style.display = 'none';
        if (documentsDashboard) documentsDashboard.style.display = 'none';
        if (mainSearchContainer) mainSearchContainer.style.display = 'block';
        if (documentsSearchContainer) documentsSearchContainer.style.display = 'none';
        
        // Clear documents search and ensure main search is loaded
        if (documentsSearchContainer) {
            documentsSearchContainer.innerHTML = '';
        }
        
        // Reload main search component if it's empty (fresh load to ensure proper initialization)
        if (mainSearchContainer && !mainSearchContainer.hasChildNodes()) {
            await loadSearchComponent('searchSectionContainer', {
                title: '', // Remove title
                subtitle: '', // Remove subtitle
                placeholder: 'Cerca una dispensa...'
            });
        }
        
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
// DOCUMENTS DASHBOARD FUNCTIONALITY
// ===========================

async function loadPurchasedDocuments() {
    console.log('Loading purchased documents...');
    
    const loadingState = document.getElementById('myDocumentsLoading');
    const emptyState = document.getElementById('myDocumentsEmpty');
    const documentsList = document.getElementById('myDocumentsList');
    
    // Show loading state, hide others
    if (loadingState) loadingState.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    if (documentsList) documentsList.style.display = 'none';
    
    try {
        // Make API call to fetch user's purchased/downloaded documents
        const response = await fetch('https://marketplace-backend-9b8c.onrender.com/api/documents/purchased', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Purchased documents loaded:', data);
        
        // Hide loading state
        if (loadingState) loadingState.style.display = 'none';
        
        if (data.documents && data.documents.length > 0) {
            // Hide empty state and show documents list
            if (emptyState) emptyState.style.display = 'none';
            if (documentsList) {
                documentsList.style.display = 'block';
                renderPurchasedDocuments(data.documents);
            }
            
            console.log('Documents loaded successfully');
        } else {
            // Show empty state
            if (emptyState) emptyState.style.display = 'block';
            if (documentsList) documentsList.style.display = 'none';
            
            console.log('No documents found');
        }
        
    } catch (error) {
        console.error('Error loading purchased documents:', error);
        
        // Hide loading state and show error
        if (loadingState) loadingState.style.display = 'none';
        
        // Show empty state with error message
        if (emptyState) {
            emptyState.style.display = 'block';
            const emptyTitle = emptyState.querySelector('h3');
            const emptyText = emptyState.querySelector('p');
            if (emptyTitle) emptyTitle.textContent = 'Errore nel caricamento';
            if (emptyText) emptyText.textContent = 'Si è verificato un errore durante il caricamento dei documenti acquistati. Riprova più tardi.';
        }
        if (documentsList) documentsList.style.display = 'none';
    }
}

function renderPurchasedDocuments(documents) {
    const documentsList = document.getElementById('myDocumentsList');
    if (!documentsList) return;
    
    documentsList.innerHTML = '';
    
    documents.forEach((doc, index) => {
        const documentElement = document.createElement('div');
        documentElement.className = 'purchased-document-item';
        documentElement.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 12px;
            background: white;
            transition: all 0.2s ease;
        `;
        
        documentElement.innerHTML = `
            <div style="flex: 1;">
                <h4 style="margin: 0 0 4px 0; color: #1f2937; font-size: 16px;">${doc.title || 'Documento senza titolo'}</h4>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">${doc.description || 'Nessuna descrizione disponibile'}</p>
                <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 12px;">Acquistato il: ${new Date(doc.purchase_date || Date.now()).toLocaleDateString('it-IT')}</p>
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick="downloadDocument('${doc.id}')" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                    Scarica
                </button>
                <button onclick="viewDocumentDetails('${doc.id}')" style="padding: 8px 16px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-size: 14px;">
                    Dettagli
                </button>
            </div>
        `;
        
        documentsList.appendChild(documentElement);
    });
}

// Document action functions for purchased documents
function downloadDocument(documentId) {
    console.log('Download document:', documentId);
    // TODO: Implement document download functionality
    alert('Funzione download documento in sviluppo');
}

function viewDocumentDetails(documentId) {
    console.log('View document details:', documentId);
    // TODO: Implement document details modal/page
    alert('Funzione dettagli documento in sviluppo');
}

function removeFromLibrary(documentId) {
    console.log('Remove document from library:', documentId);
    if (confirm('Sei sicuro di voler rimuovere questo documento dalla tua libreria?')) {
        // TODO: Implement document removal from library
        alert('Funzione rimozione documento in sviluppo');
    }
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
// SEARCH COMPONENT FUNCTIONALITY
// ===========================

async function loadSearchComponent(containerId, config = {}) {
    try {
        const response = await fetch('components/search-section/search-section.html');
        const html = await response.text();
        
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
            
            // Apply custom configuration
            const titleElement = container.querySelector('.search-title');
            if (titleElement) {
                if (config.title === '') {
                    titleElement.style.display = 'none';
                } else if (config.title) {
                    titleElement.textContent = config.title;
                }
            }
            
            const subtitleElement = container.querySelector('.search-subtitle');
            if (subtitleElement) {
                if (config.subtitle === '') {
                    subtitleElement.style.display = 'none';
                } else if (config.subtitle) {
                    subtitleElement.textContent = config.subtitle;
                }
            }
            
            if (config.placeholder) {
                const inputElement = container.querySelector('.search-input');
                if (inputElement) inputElement.placeholder = config.placeholder;
            }
            
            // For documents section, we need to ensure search-section.js can work properly
            if (containerId === 'documentsSearchSectionContainer') {
                // Clear the main search section to avoid conflicts
                const mainSearchContainer = document.getElementById('searchSectionContainer');
                if (mainSearchContainer) {
                    mainSearchContainer.innerHTML = '';
                }
                
                // Initialize the search component for documents
                await initializeSearchComponentForContext(container, 'documents');
            } else {
                // For the main search section, ensure documents search is cleared
                const documentsSearchContainer = document.getElementById('documentsSearchSectionContainer');
                if (documentsSearchContainer) {
                    documentsSearchContainer.innerHTML = '';
                }
                
                // Initialize the search component for profile
                await initializeSearchComponentForContext(container, 'profile');
            }
        }
    } catch (error) {
        console.error('Error loading search component:', error);
    }
}

async function initializeSearchComponentForContext(container, context) {
    console.log(`Initializing search component for context: ${context}`);
    
    // Add a delay to ensure DOM is ready and search-section.js is loaded
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Reinitialize the search-section.js functionality
    try {
        // Initialize user info
        const user = getCurrentUser();
        if (user) {
            updateSearchHeaderUserInfo(user);
        }
        
        // Initialize search functionality
        initializeSearchFunctionality(context);
        
        // Initialize filters safely
        initializeFiltersForContext(context);
        
        // Initialize documents grid for documents context
        if (context === 'documents') {
            initializeDocumentsGrid();
        }
        
        // Initialize performance cache if available
        if (window.performanceCache) {
            window.performanceCache.preloadCriticalData();
        }
        
        // Force re-initialization of search-section.js functions if they exist
        if (typeof window.initializeFilters === 'function') {
            console.log('Re-initializing filters from search-section.js');
            window.initializeFilters();
        }
        
        if (typeof window.initializeFilterControls === 'function') {
            console.log('Re-initializing filter controls from search-section.js');
            window.initializeFilterControls();
        }
        
        console.log(`Search component initialized successfully for ${context}`);
    } catch (error) {
        console.error(`Error initializing search component for ${context}:`, error);
    }
}

function updateSearchHeaderUserInfo(user) {
    // Safely update user avatar if element exists
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && user) {
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
        
        // Create gradient avatar
        const gradient = getConsistentGradient(user.username);
        const initials = getInitials(fullName);
        userAvatar.innerHTML = `<div style="background: ${gradient}; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: inherit; color: white; font-weight: 600;">${initials}</div>`;
    }
    
    // Update dropdown elements if they exist
    const dropdownAvatar = document.getElementById('dropdownAvatar');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');
    
    if (dropdownAvatar && user) {
        const gradient = getConsistentGradient(user.username);
        dropdownAvatar.style.background = gradient;
    }
    
    if (dropdownUserName && user) {
        dropdownUserName.textContent = user.username || 'User';
    }
    
    if (dropdownUserEmail && user) {
        dropdownUserEmail.textContent = user.email || 'user@example.com';
    }
}

function initializeSearchFunctionality(context) {
    // Initialize search input based on context
    const searchInput = document.getElementById('searchInput');
    if (searchInput && context === 'documents') {
        // Only override search input for documents context
        // Remove existing listeners to avoid duplicates
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        
        // Add documents-specific search listeners
        newSearchInput.addEventListener('input', function(e) {
            const query = e.target.value.trim();
            handleDocumentsSearch(query);
        });
        
        newSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                handleDocumentsSearch(query);
            }
        });
    }
    // For profile context, leave the original search-section.js handlers intact
    
    // Initialize filters functionality from search-section.js
    if (typeof initializeFilters === 'function') {
        initializeFilters();
    } else {
        // Fallback: manually initialize filters button
        const filtersBtn = document.getElementById('filtersBtn');
        if (filtersBtn) {
            // Remove existing listeners
            const newFiltersBtn = filtersBtn.cloneNode(true);
            filtersBtn.parentNode.replaceChild(newFiltersBtn, filtersBtn);
            
            // Add new listener
            newFiltersBtn.addEventListener('click', function() {
                const filtersPanel = document.getElementById('filtersPanel');
                const filtersOverlay = document.getElementById('filtersOverlay');
                if (filtersPanel) {
                    filtersPanel.classList.add('active');
                }
                if (filtersOverlay) {
                    filtersOverlay.classList.add('active');
                }
                document.body.style.overflow = 'hidden';
            });
        }
        
        // Initialize filters close button
        const filtersClose = document.getElementById('filtersClose');
        if (filtersClose) {
            filtersClose.addEventListener('click', function() {
                const filtersPanel = document.getElementById('filtersPanel');
                const filtersOverlay = document.getElementById('filtersOverlay');
                if (filtersPanel) {
                    filtersPanel.classList.remove('active');
                }
                if (filtersOverlay) {
                    filtersOverlay.classList.remove('active');
                }
                document.body.style.overflow = '';
            });
        }
        
        // Initialize filters overlay click
        const filtersOverlay = document.getElementById('filtersOverlay');
        if (filtersOverlay) {
            filtersOverlay.addEventListener('click', function() {
                const filtersPanel = document.getElementById('filtersPanel');
                if (filtersPanel) {
                    filtersPanel.classList.remove('active');
                }
                this.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
    }
    
    // Initialize other necessary elements
    initializeSearchUIElements();
}

function initializeSearchUIElements() {
    // Initialize AI toggle
    const aiToggle = document.getElementById('toggle');
    if (aiToggle) {
        aiToggle.addEventListener('change', function() {
            console.log('AI search toggled:', this.checked);
        });
    }
    
    // Initialize order dropdown
    const orderBtn = document.getElementById('orderBtn');
    if (orderBtn) {
        orderBtn.addEventListener('click', function() {
            const dropdown = this.parentNode.querySelector('.order-dropdown-content');
            if (dropdown) {
                dropdown.classList.toggle('show');
            }
        });
    }
}

function initializeFiltersForContext(context) {
    // Safely initialize filters to prevent null errors
    try {
        // Check if filter elements exist before trying to populate them
        const filterTypes = ['faculty', 'course', 'canale', 'tag', 'documentType', 'language', 'academicYear'];
        
        filterTypes.forEach(type => {
            const filterElement = document.getElementById(`${type}Filter`);
            const optionsElement = document.getElementById(`${type}Options`);
            
            if (filterElement && optionsElement) {
                // Only populate if elements exist
                populateOptionsIfExists(type, []);
            }
        });
        
        // Initialize filter manager if available
        if (window.filterManager) {
            window.filterManager.updateActiveFiltersDisplay();
        }
    } catch (error) {
        console.warn('Error initializing filters:', error);
    }
}

function populateOptionsIfExists(type, items) {
    const options = document.getElementById(`${type}Options`);
    const filterInput = document.getElementById(`${type}Filter`);
    
    if (!options || !filterInput) {
        return; // Silently return if elements don't exist
    }
    
    const currentValue = filterInput.value;
    
    // Clear existing options
    options.innerHTML = '';
    
    // Add options if items exist
    items.forEach(item => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'dropdown-option';
        optionDiv.textContent = item;
        optionDiv.addEventListener('click', () => {
            filterInput.value = item;
            options.parentElement.classList.remove('show');
        });
        options.appendChild(optionDiv);
    });
}

function initializeDocumentsGrid() {
    const documentsGrid = document.getElementById('documentsGrid');
    const documentCount = document.getElementById('documentCount');
    
    if (!documentsGrid) {
        console.warn('Documents grid not found');
        return;
    }
    
    // Initialize with empty state
    if (documentCount) {
        documentCount.textContent = 'Nessun documento trovato nella tua collezione';
    }
    
    // Clear the loading cards and show empty state
    documentsGrid.innerHTML = `
        <div class="no-results-container">
            <div class="no-results-icon">
                <span class="material-symbols-outlined">folder_open</span>
            </div>
            <h3 class="no-results-title">La tua collezione è vuota</h3>
            <p class="no-results-description">
                Non hai ancora documenti nella tua libreria personale.<br>
                Acquista documenti per vederli apparire qui.
            </p>
            <button class="explore-documents-btn" onclick="switchTab('profile')">
                <span class="material-symbols-outlined">explore</span>
                Esplora Documenti
            </button>
        </div>
    `;
}

function handleDocumentsSearch(query) {
    console.log('Searching documents for:', query);
    
    const documentsGrid = document.getElementById('documentsGrid');
    const documentCount = document.getElementById('documentCount');
    
    if (!documentsGrid) {
        console.warn('Documents grid not found');
        return;
    }
    
    // Use debounced search
    clearTimeout(window.documentsSearchTimeout);
    window.documentsSearchTimeout = setTimeout(() => {
        searchDocuments(query, documentsGrid, documentCount);
    }, 300);
}

function searchDocuments(query, documentsGrid, documentCount) {
    // For now, just show empty results since this is a purchased documents search
    // In a real implementation, this would search through user's purchased documents
    
    if (query.length === 0) {
        // Show empty state
        documentsGrid.innerHTML = `
            <div class="no-results-container">
                <div class="no-results-icon">
                    <span class="material-symbols-outlined">folder_open</span>
                </div>
                <h3 class="no-results-title">La tua collezione è vuota</h3>
                <p class="no-results-description">
                    Non hai ancora documenti nella tua libreria personale.<br>
                    Acquista documenti per vederli apparire qui.
                </p>
                <button class="explore-documents-btn" onclick="switchTab('profile')">
                    <span class="material-symbols-outlined">explore</span>
                    Esplora Documenti
                </button>
            </div>
        `;
        if (documentCount) {
            documentCount.textContent = 'Nessun documento trovato nella tua collezione';
        }
    } else {
        // Show search results (empty for now)
        documentsGrid.innerHTML = `
            <div class="no-results-container">
                <div class="no-results-icon">
                    <span class="material-symbols-outlined">search_off</span>
                </div>
                <h3 class="no-results-title">Nessun documento trovato</h3>
                <p class="no-results-description">
                    Non ci sono risultati per "${query}" nella tua collezione.<br>
                    Prova con parole chiave diverse.
                </p>
                <button class="clear-search-btn" onclick="document.querySelector('#documentsSearchSectionContainer .search-input').value = ''; document.querySelector('#documentsSearchSectionContainer .search-input').dispatchEvent(new Event('input'));">
                    <span class="material-symbols-outlined">clear</span>
                    Cancella Ricerca
                </button>
            </div>
        `;
        if (documentCount) {
            documentCount.textContent = `Nessun risultato per "${query}"`;
        }
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize user personalization first
    await initializeUserPersonalization();
    
    // Load main search component for Profilo tab
    await loadSearchComponent('searchSectionContainer', {
        title: '', // Remove title
        subtitle: '', // Remove subtitle
        placeholder: 'Cerca una dispensa...'
    });
    
    // Note: Documents search component will be loaded dynamically when switching to that tab
    
    initializeMobileMenu();
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