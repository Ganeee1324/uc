// Clean Document Preview JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Document preview page loaded');
    
    // Initialize the page
    initializeDocumentPreview();
    
    function initializeDocumentPreview() {
        // Setup smooth scrolling for the document info panel
        setupSmoothScrolling();
        
        // Handle button interactions
        setupButtonHandlers();
        
        // Setup responsive behavior
        setupResponsiveHandlers();
        
        // Add notification styles
        addNotificationStyles();
        
        // Initialize back button
        initializeBackButton();
        
        console.log('Document preview initialized successfully');
    }
    
    function setupSmoothScrolling() {
        const documentInfoPanel = document.querySelector('.document-info-panel');
        if (documentInfoPanel) {
            documentInfoPanel.style.scrollBehavior = 'smooth';
        }
    }
    
    function setupButtonHandlers() {
        // Add to cart button
        const addToCartBtn = document.querySelector('.btn-secondary');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', function() {
                showNotification('Document added to cart!', 'success');
            });
        }
        
        // Buy now button
        const buyNowBtn = document.querySelector('.btn-primary');
        if (buyNowBtn) {
            buyNowBtn.addEventListener('click', function() {
                showNotification('Redirecting to checkout...', 'success');
            });
        }
        
        // Recommended card clicks
        const recommendedCards = document.querySelectorAll('.recommended-card');
        recommendedCards.forEach((card, index) => {
            card.addEventListener('click', function() {
                showNotification('Opening document...', 'success');
            });
            
            // Add hover effect
            card.style.cursor = 'pointer';
        });
        
        // Write comment link
        const writeCommentLink = document.querySelector('.write-comment');
        if (writeCommentLink) {
            writeCommentLink.addEventListener('click', function(e) {
                e.preventDefault();
                showNotification('Comment feature coming soon!', 'info');
            });
        }
    }
    
    function setupResponsiveHandlers() {
        // Handle window resize for responsive layout
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
                adjustLayoutForScreenSize();
            }, 100);
        });
        
        // Initial layout adjustment
        adjustLayoutForScreenSize();
    }
    
    function adjustLayoutForScreenSize() {
        const mainContent = document.querySelector('.main-content');
        const screenWidth = window.innerWidth;
        
        if (screenWidth <= 1024) {
            // Mobile/tablet layout adjustments
            if (mainContent) {
                mainContent.style.flexDirection = 'column';
            }
        } else {
            // Desktop layout
            if (mainContent) {
                mainContent.style.flexDirection = 'row';
            }
        }
    }
    
    function initializeBackButton() {
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                goBack();
            });
        }
    }
    
    function showNotification(message, type = 'success') {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Show notification with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Hide and remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    function addNotificationStyles() {
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    padding: 12px 20px;
                    background: #fff;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    border-left: 4px solid #10b981;
                    font-weight: 500;
                    z-index: 10000;
                    opacity: 0;
                    transform: translateX(100%);
                    transition: all 0.3s ease;
                    max-width: 300px;
                    font-size: 14px;
                }
                
                .notification.show {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                .notification.success {
                    border-left-color: #10b981;
                    color: #047857;
                }
                
                .notification.error {
                    border-left-color: #ef4444;
                    color: #dc2626;
                }
                
                .notification.info {
                    border-left-color: #3b82f6;
                    color: #1d4ed8;
                }
            `;
            document.head.appendChild(styles);
        }
    }
});

// Utility function to handle back navigation
function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'search.html';
    }
} 