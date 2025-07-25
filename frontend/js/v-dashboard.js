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
        if (documentsSearchContainer) {
            documentsSearchContainer.style.display = 'none';
            documentsSearchContainer.innerHTML = '';
        }
        
        currentTab = 'stats';
    } else if (tabName === 'documents') {
        // Show documents dashboard, hide others
        if (profileSection) profileSection.style.display = 'none';
        if (dashboardRow) dashboardRow.style.display = 'none';
        if (statsDashboard) statsDashboard.style.display = 'none';
        if (mainSearchContainer) mainSearchContainer.style.display = 'none';
        
        // Show documents dashboard
        if (documentsDashboard) documentsDashboard.style.display = 'block';
        if (documentsSearchContainer) documentsSearchContainer.style.display = 'block';
        
        currentTab = 'documents';
        
        // Load search component for documents - let search-section handle itself
        const hasDocumentsSearchComponent = documentsSearchContainer && documentsSearchContainer.querySelector('.search-section');
        if (documentsSearchContainer && !hasDocumentsSearchComponent) {
            try {
                console.log('Loading search component for documents...');
                const response = await fetch('components/search-section/search-section-component.html');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const html = await response.text();
                console.log('Search component HTML loaded for documents, length:', html.length);
                documentsSearchContainer.innerHTML = html;
                console.log('Search component inserted into documents container');
                
                // Search component will auto-initialize itself with smart retry logic
                console.log('Search component loaded for documents - auto-initialization in progress');
                
                // Manually trigger document loading for the documents search section
                setTimeout(() => {
                    if (typeof applyFiltersAndRender === 'function') {
                        console.log('Manually triggering document loading for documents search section...');
                        applyFiltersAndRender();
                    }
                }, 500);
            } catch (error) {
                console.error('Error loading documents search component:', error);
            }
        } else {
            console.log('Documents search container not found or already has search component:', hasDocumentsSearchComponent ? 'has component' : 'container not found');
        }
    } else {
        // Show profile/dashboard content, hide stats and documents
        if (profileSection) profileSection.style.display = 'block';
        if (dashboardRow) dashboardRow.style.display = 'flex';
        if (statsDashboard) statsDashboard.style.display = 'none';
        if (documentsDashboard) documentsDashboard.style.display = 'none';
        if (mainSearchContainer) {
            mainSearchContainer.style.display = 'block';
            console.log('Setting main search container to display: block');
        }
        if (documentsSearchContainer) {
            documentsSearchContainer.style.display = 'none';
            // Clear documents search container
            documentsSearchContainer.innerHTML = '';
        }
        
        // Ensure main search component is loaded - let search-section handle itself
        const hasSearchComponent = mainSearchContainer && mainSearchContainer.querySelector('.search-section');
        if (mainSearchContainer && !hasSearchComponent) {
            try {
                console.log('Loading search component in switchTab...');
                const response = await fetch('components/search-section/search-section-component.html');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const html = await response.text();
                console.log('Search component HTML loaded in switchTab, length:', html.length);
                mainSearchContainer.innerHTML = html;
                console.log('Search component inserted into main container');
                
                // Search component will auto-initialize itself with smart retry logic
                console.log('Search component loaded in switchTab - auto-initialization in progress');
            } catch (error) {
                console.error('Error loading main search component:', error);
            }
        } else {
            console.log('Main search container not found or already has search component:', hasSearchComponent ? 'has component' : 'container not found');
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
// MAIN INITIALIZATION
// ===========================

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize user personalization first
    await initializeUserPersonalization();
    
    // Load main search component for Profilo tab - let search-section handle itself
    const mainSearchContainer = document.getElementById('searchSectionContainer');
    console.log('Search container found:', mainSearchContainer);
    const hasSearchComponent = mainSearchContainer && mainSearchContainer.querySelector('.search-section');
    if (mainSearchContainer && !hasSearchComponent) {
        try {
            console.log('Loading search component...');
            const response = await fetch('components/search-section/search-section-component.html');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            console.log('Search component HTML loaded, length:', html.length);
            mainSearchContainer.innerHTML = html;
            console.log('Search component inserted into container');
            
            // Search component will auto-initialize itself with smart retry logic
            console.log('Search component loaded - auto-initialization in progress');
        } catch (error) {
            console.error('Error loading main search component:', error);
        }
    } else {
        console.log('Search container not found or already has search component:', hasSearchComponent ? 'has component' : 'container not found');
    }
    
    // Initialize dashboard functionality
    initializeMobileMenu();
    initializeTabSwitching(); // Add tab switching functionality
    initializeStatsDropdown(); // Add stats dropdown functionality
    initializeTimeFilters(); // Add time filters functionality
    initializeDocumentsPeriodFilter(); // Add documents period filter functionality
    initializeDocumentPerformanceItems(); // Add document performance interactivity
    
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