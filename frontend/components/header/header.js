// Header Component JavaScript

// API Configuration - use existing API_BASE if defined, otherwise define it
if (typeof API_BASE === 'undefined') {
    var API_BASE = window.APP_CONFIG?.API_BASE || 'https://symbia.it';
}

// Authentication token from localStorage - use window object to avoid shadowing
if (typeof window.authToken === 'undefined') {
    window.authToken = localStorage.getItem('authToken');
}
var authToken = window.authToken;

// Check if user is authenticated - only declare if not already declared
if (typeof checkAuthentication === 'undefined') {
    window.checkAuthentication = function() {
        return !!authToken;
    };
}

// Initialize header user info - only declare if not already declared
if (typeof initializeUserInfo === 'undefined') {
    window.initializeUserInfo = async function() {
        const user = await fetchCurrentUserData();
        updateHeaderUserInfo(user);
    };
}

// Fetch current user data - only declare if not already declared
if (typeof fetchCurrentUserData === 'undefined') {
    window.fetchCurrentUserData = async function() {
        const cachedUser = localStorage.getItem('currentUser');
        if (cachedUser) {
            return JSON.parse(cachedUser);
        }
        
        // Refresh auth token from localStorage in case it was updated
        authToken = localStorage.getItem('authToken');
        window.authToken = authToken;
        
        // If no cached data but user has auth token, fetch from API
        if (authToken) {
            try {
                const response = await fetch(`${API_BASE}/user`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    // Cache the user data
                    localStorage.setItem('currentUser', JSON.stringify(userData));
                    return userData;
                } else {
                    // Invalid token, clear auth data
                    logout();
                    return null;
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                return null;
            }
        }
        
        // No auth token, user is not authenticated
        return null;
    };
}

// Update header user info display - only declare if not already declared
if (typeof updateHeaderUserInfo === 'undefined') {
    window.updateHeaderUserInfo = function(user) {
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
        } else if (user.surname) {
            fullName = user.surname;
        } else {
            fullName = user.username || 'User';
        }
        
        // Create gradient avatar
        const gradient = getConsistentGradient(user.username);
        const gradientAvatar = `<div class="header-user-avatar" style="background: ${gradient}; color: white; font-weight: 700; font-size: 16px; display: flex; align-items: center; justify-content: center;">${getInitials(fullName)}</div>`;
        
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
                
                // Move dropdown to body to avoid any container clipping issues
                const dropdown = document.querySelector('.user-dropdown');
                if (dropdown) {
                    if (dropdown.parentElement !== document.body) {
                        document.body.appendChild(dropdown);
                    }
                    
                    // Position it relative to the user avatar
                    const userAvatarRect = userAvatar.getBoundingClientRect();
                    dropdown.style.position = 'fixed';
                    dropdown.style.top = `${userAvatarRect.bottom + 12}px`;
                    dropdown.style.right = `${window.innerWidth - userAvatarRect.right}px`;
                    dropdown.style.left = 'auto';
                    
                    // Add open class to show the dropdown
                    dropdown.classList.add('open');
                    
                    // Add hover handlers to the dropdown itself (only once)
                    if (!dropdown.hasAttribute('data-hover-initialized')) {
                        dropdown.setAttribute('data-hover-initialized', 'true');
                        
                        dropdown.addEventListener('mouseenter', () => {
                            clearTimeout(hoverTimeout);
                            userInfo.classList.add('open');
                            dropdown.classList.add('open');
                        });
                        
                        dropdown.addEventListener('mouseleave', () => {
                            hoverTimeout = setTimeout(() => {
                                userInfo.classList.remove('open');
                                dropdown.classList.remove('open');
                            }, 150);
                        });
                    }
                }
            });
            
            // Note: Dropdown hover handlers are now added dynamically when dropdown is moved to body
            
            // Hide dropdown when mouse leaves the user info area with small delay
            userInfo.addEventListener('mouseleave', (event) => {
                event.stopPropagation();
                hoverTimeout = setTimeout(() => {
                    userInfo.classList.remove('open');
                    const dropdown = document.querySelector('.user-dropdown');
                    if (dropdown) {
                        dropdown.classList.remove('open');
                    }
                }, 150); // Small delay to allow moving to dropdown
            });
            
            // Cancel timeout when re-entering the area
            userInfo.addEventListener('mouseenter', (event) => {
                event.stopPropagation();
                clearTimeout(hoverTimeout);
            });
        }
        
        // Redirect to profile when user clicks their avatar
        userAvatar.addEventListener('click', (event) => {
            event.stopPropagation();
            // Redirect to profile with user info
            window.location.href = 'profile.html';
        });

        // Make dropdown user info clickable to redirect to profile
        const dropdownUserInfo = document.querySelector('.dropdown-user-info');
        if (dropdownUserInfo) {
            dropdownUserInfo.addEventListener('click', (event) => {
                event.stopPropagation();
                // Redirect to profile page
                window.location.href = 'profile.html';
            });
        }
        
        // Make dropdown avatar clickable to redirect to profile
        if (dropdownAvatar) {
            dropdownAvatar.addEventListener('click', (event) => {
                event.stopPropagation();
                // Redirect to profile page
                window.location.href = 'profile.html';
            });
        }
        
        // Make dropdown username clickable to redirect to profile
        if (dropdownUserName) {
            dropdownUserName.addEventListener('click', (event) => {
                event.stopPropagation();
                // Redirect to profile page
                window.location.href = 'profile.html';
            });
        }
        
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
            <button class="login-btn" onclick="redirectToLogin()">
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
}

// Generate consistent gradient for user avatars - only declare if not already declared
if (typeof getConsistentGradient === 'undefined') {
    window.getConsistentGradient = function(username) {
    if (!username) return 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
    
    // Create a simple hash of the username
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        const char = username.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Define gradient color pairs
    const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Blue to Purple
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Pink to Red
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Light Blue to Cyan
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Green to Teal
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Pink to Yellow
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Mint to Pink
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // Coral to Light Pink
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Cream to Peach
        'linear-gradient(135deg, #ff8a80 0%, #ea80fc 100%)', // Light Red to Purple
        'linear-gradient(135deg, #8fd3f4 0%, #84fab0 100%)', // Sky Blue to Green
        'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)', // Lavender to Light Yellow
        'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)', // Light Cyan to Blue
        'linear-gradient(135deg, #fdbb2d 0%, #22c1c3 100%)', // Orange to Teal
        'linear-gradient(135deg, #e056fd 0%, #f441a5 100%)', // Purple to Magenta
        'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)', // Light Green to Yellow
    ];
    
    // Use absolute value of hash to ensure positive index
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
    }
}

// Get initials from name - only declare if not already declared
if (typeof getInitials === 'undefined') {
    window.getInitials = function(name) {
    if (!name) return 'U';
    
    const names = name.trim().split(' ');
    if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
    } else {
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }
    }
}

// Redirect to login function - only declare if not already declared
if (typeof redirectToLogin === 'undefined') {
    window.redirectToLogin = function() {
        // Prevent any default behavior and redirect immediately
        event.preventDefault();
        event.stopPropagation();
        window.location.href = 'index.html';
    }
}

// Logout function - only declare if not already declared
if (typeof logout === 'undefined') {
    window.logout = function() {
    // Clear authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Reset auth token
    authToken = null;
    window.authToken = null;
    
    // Redirect to login page
    window.location.href = 'index.html';
    }
}

// Close dropdown when clicking outside
function closeUserDropdown() {
    const userInfo = document.querySelector('.user-info');
    const dropdown = document.querySelector('.user-dropdown');
    if (userInfo) {
        userInfo.classList.remove('open');
    }
    if (dropdown) {
        dropdown.classList.remove('open');
    }
}

// Handle clicks outside dropdown
document.addEventListener('click', (event) => {
    const userInfo = document.querySelector('.user-info');
    const dropdown = document.querySelector('.user-dropdown');
    const isClickInUserInfo = userInfo && userInfo.contains(event.target);
    const isClickInDropdown = dropdown && dropdown.contains(event.target);
    
    if (!isClickInUserInfo && !isClickInDropdown) {
        closeUserDropdown();
    }
});

// Initialize header when DOM is loaded
function initializeHeader() {
    // Initialize user info
    initializeUserInfo();
    
    // Handle mobile menu toggle if present
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    // Handle user favorites click
    const userFavorites = document.getElementById('userFavorites');
    if (userFavorites) {
        userFavorites.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'preferiti.html';
        });
    }
}

// Export initializeHeader function for global use
window.initializeHeader = initializeHeader;