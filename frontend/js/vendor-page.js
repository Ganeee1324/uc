// Vendor Page - Banner Only (Search functionality provided by search-component.js)

// API Configuration - use existing API_BASE if defined, otherwise define it
if (typeof API_BASE === 'undefined') {
    var API_BASE = window.APP_CONFIG?.API_BASE || 'https://symbia.it';
}

// Vendor Banner Functionality
function updateVendorBanner(vendorData) {
    const vendorAvatar = document.getElementById('vendorAvatar');
    const vendorName = document.getElementById('vendorName');
    const vendorFaculty = document.getElementById('vendorFaculty');
    const vendorChannel = document.getElementById('vendorChannel');
    const vendorRatingBtn = document.getElementById('vendorRatingBtn');
    
    if (vendorAvatar && vendorName && vendorFaculty && vendorChannel && vendorRatingBtn) {
        // Set vendor name
        vendorName.textContent = vendorData.username;
        
        // Set vendor faculty and channel
        vendorFaculty.textContent = vendorData.facolta || 'Non specificata';
        vendorChannel.textContent = vendorData.canale === 0 || vendorData.canale === '0' ? 'Unico' : (vendorData.canale || 'Non specificato');
        
        // Create avatar with gradient background and initial
        const initial = vendorData.username ? vendorData.username.charAt(0).toUpperCase() : 'U';
        const gradient = getConsistentGradient(vendorData.username);
        vendorAvatar.style.background = gradient;
        vendorAvatar.textContent = initial;
        vendorAvatar.classList.remove('loading-text');
        
        // Set rating
        const rating = parseFloat(vendorData.media_recensioni) || 0;
        const reviewCount = parseInt(vendorData.numero_recensioni) || 0;
        
        const ratingStars = vendorRatingBtn.querySelector('.vendor-banner-rating-stars');
        const ratingText = vendorRatingBtn.querySelector('.vendor-rating-text');
        
        if (ratingStars && ratingText) {
            ratingStars.innerHTML = generateVendorBannerStars(rating);
            ratingText.textContent = reviewCount > 0 ? `${rating.toFixed(1)} (${reviewCount})` : 'Nessuna recensione';
        }
    }
}

// Generate star display for vendor banner
function generateVendorBannerStars(rating) {
    const fullStars = Math.floor(rating);
    const hasPartialStar = (rating % 1) >= 0.1;
    const emptyStars = 5 - fullStars - (hasPartialStar ? 1 : 0);
    
    let stars = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        stars += '<span class="vendor-banner-rating-star filled">★</span>';
    }
    
    // Partial star
    if (hasPartialStar) {
        const fillPercentage = Math.round((rating % 1) * 100);
        stars += `<span class="vendor-banner-rating-star partial" style="--fill-percentage: ${fillPercentage}%">★</span>`;
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        stars += '<span class="vendor-banner-rating-star empty">★</span>';
    }
    
    return stars;
}

// Get consistent gradient for user avatar (using search-component's STRONG_GRADIENTS)
function getConsistentGradient(username) {
    if (!username) return STRONG_GRADIENTS[0];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return STRONG_GRADIENTS[Math.abs(hash) % STRONG_GRADIENTS.length];
}

// Update URL to include vendor parameters for proper reloading
function updateVendorURL(vendorData) {
    if (!vendorData || !vendorData.username) return;
    
    const currentUrl = new URL(window.location);
    
    // Always ensure we have a user parameter for reloading
    if (!currentUrl.searchParams.has('user')) {
        currentUrl.searchParams.set('user', vendorData.username);
        window.history.replaceState({}, '', currentUrl.href);
    }
}

// Initialize vendor page
async function initializeVendorPage() {
    try {
        // Get vendor username/ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const vendorUsername = urlParams.get('user'); // From search results: ?user=username
        const vendorUserId = urlParams.get('userId'); // From profile: ?userId=id
        const vendorParam = urlParams.get('vendor'); // Generic: ?vendor=username
        
        
        // Determine which parameter to use
        let vendorIdentifier = vendorUsername || vendorParam;
        let isUserId = false;
        
        if (!vendorIdentifier && vendorUserId) {
            vendorIdentifier = vendorUserId;
            isUserId = true;
        }
        
        if (!vendorIdentifier) {
            console.error('No vendor specified in URL. Expected: ?user=username or ?userId=id or ?vendor=username');
            return;
        }
        
        // Fetch vendor data - try different API endpoints
        let vendorData = null;
        
        if (isUserId) {
            // Fetch by user ID
            vendorData = await fetchVendorById(vendorIdentifier);
        } else {
            // Fetch by username
            vendorData = await fetchVendorByUsername(vendorIdentifier);
        }
        
        if (!vendorData) {
            console.error('Failed to fetch vendor data');
            return;
        }
        
        // Update vendor banner
        updateVendorBanner(vendorData);
        
        // Update URL to include the vendor parameter for proper reloading
        updateVendorURL(vendorData);
        
        // Initialize save vendor button
        initializeSaveVendorButton(vendorData);
        
        // Filter search results to show only this vendor's documents
        filterDocumentsByVendor(vendorData.username || vendorData.user_username);
        
    } catch (error) {
        console.error('Error initializing vendor page:', error);
        // Show error in banner
        showVendorError('Errore nel caricamento dei dati del venditore');
    }
}

// Fetch vendor data by username
async function fetchVendorByUsername(username) {
    try {
        // Search for vetrine by this author using the correct API endpoint
        const response = await fetch(`${API_BASE}/vetrine?text=${encodeURIComponent(username)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Filter vetrine to find those actually authored by this username
        const authorVetrine = data.vetrine ? data.vetrine.filter(vetrina => 
            vetrina.author && (
                vetrina.author.username === username || 
                vetrina.author_username === username
            )
        ) : [];
        
        // Extract vendor info from the vetrine data
        if (authorVetrine.length > 0) {
            const firstVetrina = authorVetrine[0];
            const author = firstVetrina.author || {};
            const courseInstance = firstVetrina.course_instance || {};
            
            return {
                username: author.username || firstVetrina.author_username || username,
                facolta: courseInstance.faculty_name || 'Non specificata',
                canale: courseInstance.canale,
                media_recensioni: firstVetrina.average_rating || 0,
                numero_recensioni: firstVetrina.reviews_count || 0,
                user_id: author.user_id
            };
        }
        
        // If no vetrine found for this author, return basic info
        return {
            username: username,
            facolta: 'Non specificata',
            canale: 'Non specificato',
            media_recensioni: 0,
            numero_recensioni: 0
        };
        
    } catch (error) {
        console.error('Error fetching vendor by username:', error);
        return null;
    }
}

// Fetch vendor data by user ID
async function fetchVendorById(userId) {
    try {
        // Get user info by ID using the correct endpoint
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const userData = await response.json();
        
        // Convert user data to vendor data format
        return {
            username: userData.username,
            facolta: userData.user_faculty || 'Non specificata',
            canale: userData.user_canale,
            media_recensioni: 0, // User endpoint doesn't provide review stats
            numero_recensioni: 0,
            user_id: userData.user_id
        };
        
    } catch (error) {
        console.error('Error fetching vendor by ID:', error);
        return null;
    }
}

// Show error message in vendor banner
function showVendorError(message) {
    const vendorName = document.getElementById('vendorName');
    const vendorAvatar = document.getElementById('vendorAvatar');
    
    if (vendorName) {
        vendorName.textContent = message;
    }
    
    if (vendorAvatar) {
        vendorAvatar.textContent = '!';
        vendorAvatar.style.background = 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)';
        vendorAvatar.classList.remove('loading-text');
    }
}

// Initialize save vendor button functionality
function initializeSaveVendorButton(vendorData) {
    const saveVendorBtn = document.getElementById('saveVendorBtn');
    if (saveVendorBtn && vendorData) {
        saveVendorBtn.addEventListener('click', () => {
            // Toggle save state (this would connect to backend API)
            const icon = saveVendorBtn.querySelector('.material-symbols-outlined');
            const text = saveVendorBtn.querySelector('span:last-child');
            
            if (icon.textContent === 'bookmark_add') {
                icon.textContent = 'bookmark';
                text.textContent = 'Salvato';
                saveVendorBtn.classList.add('saved');
            } else {
                icon.textContent = 'bookmark_add';
                text.textContent = 'Salva venditore';
                saveVendorBtn.classList.remove('saved');
            }
        });
    }
}

// Filter search results to show only this vendor's documents
function filterDocumentsByVendor(vendorUsername) {
    // This function communicates with the search-component to filter results
    // by triggering a search with the vendor's username
    
    // Wait for search component to load, then trigger search
    setTimeout(() => {
        // Method 1: If performSearch function is available, use it
        if (typeof performSearch === 'function') {
            performSearch(vendorUsername);
        }
        // Method 2: If triggerSearch function is available, use it  
        else if (typeof triggerSearch === 'function') {
            triggerSearch(vendorUsername);
        }
        // Method 3: Manually trigger search by setting input and clicking search
        else {
            const searchInput = document.querySelector('#searchInput, .search-input, [data-search-input]');
            const searchButton = document.querySelector('#searchButton, .search-button, [data-search-btn]');
            
            if (searchInput) {
                searchInput.value = vendorUsername;
                
                // Trigger input event to update search
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Click search button if available
                if (searchButton) {
                    setTimeout(() => searchButton.click(), 100);
                }
            }
        }
    }, 1500); // Increased timeout to ensure search component is fully loaded
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeVendorPage);