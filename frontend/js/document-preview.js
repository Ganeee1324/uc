/**
 * WORLD-CLASS DOCUMENT PREVIEW JS
 * Premium Interactive Experience v2.0
 */

class PremiumDocumentPreview {
    constructor() {
        this.currentZoom = 100;
        this.isFullscreen = false;
        this.favorited = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupAnimations();
        this.setupScrollEffects();
        this.preloadElements();
    }

    setupEventListeners() {
        // Header interactions
        this.setupHeaderActions();
        
        // Document viewer controls
        this.setupViewerControls();
        
        // Interactive buttons
        this.setupInteractiveButtons();
        
        // Card interactions
        this.setupCardInteractions();
        
        // Review system
        this.setupReviewSystem();
    }

    setupHeaderActions() {
        // Share button
        const shareBtn = document.querySelector('.share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showShareModal();
            });
        }

        // Favorite button
        const favoriteBtn = document.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleFavorite();
            });
        }

        // User avatar click
        const userAvatar = document.querySelector('.user-avatar');
        if (userAvatar) {
            userAvatar.addEventListener('click', (e) => {
                e.preventDefault();
                this.showUserMenu();
            });
        }
    }

    setupViewerControls() {
        // Zoom out
        const zoomOutBtn = document.querySelector('.control-btn[title="Zoom out"]');
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }

        // Zoom in
        const zoomInBtn = document.querySelector('.control-btn[title="Zoom in"]');
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }

        // Fullscreen
        const fullscreenBtn = document.querySelector('.control-btn[title="Fullscreen"]');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
    }

    setupInteractiveButtons() {
        // Add to cart button
        const addToCartBtn = document.querySelector('.premium-btn.primary');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addToCart();
            });
        }

        // Buy now button
        const buyNowBtn = document.querySelector('.premium-btn.secondary');
        if (buyNowBtn) {
            buyNowBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.buyNow();
            });
        }

        // Write review button
        const writeReviewBtn = document.querySelector('.write-review-btn');
        if (writeReviewBtn) {
            writeReviewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showReviewModal();
            });
        }
    }

    setupCardInteractions() {
        // Recommendation cards
        const recommendationCards = document.querySelectorAll('.recommendation-card');
        recommendationCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.overlay-btn')) {
                    this.navigateToDocument(card);
                }
            });

            // Overlay button
            const overlayBtn = card.querySelector('.overlay-btn');
            if (overlayBtn) {
                overlayBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.quickPreview(card);
                });
            }
        });
    }

    setupReviewSystem() {
        // Star rating interactions
        const stars = document.querySelectorAll('.stars .star');
        stars.forEach((star, index) => {
            star.addEventListener('mouseenter', () => this.highlightStars(index));
            star.addEventListener('mouseleave', () => this.resetStars());
            star.addEventListener('click', () => this.setRating(index + 1));
        });
    }

    setupAnimations() {
        // Intersection Observer for fade-in animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
                }
            });
        }, observerOptions);

        // Observe recommendation cards
        const cards = document.querySelectorAll('.recommendation-card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            observer.observe(card);
        });
    }

    setupScrollEffects() {
        // Smooth scroll for internal links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Header scroll effect
        let lastScrollY = window.scrollY;
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.premium-header');
            const currentScrollY = window.scrollY;

            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
            }
            
            lastScrollY = currentScrollY;
        });
    }

    preloadElements() {
        // Preload critical images and icons
        const imageUrls = [
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face'
        ];

        imageUrls.forEach(url => {
            const img = new Image();
            img.src = url;
        });
    }

    // Viewer Controls
    zoomOut() {
        if (this.currentZoom > 25) {
            this.currentZoom -= 25;
            this.updateZoomLevel();
            this.animateZoom();
        }
    }

    zoomIn() {
        if (this.currentZoom < 200) {
            this.currentZoom += 25;
            this.updateZoomLevel();
            this.animateZoom();
        }
    }

    updateZoomLevel() {
        const zoomDisplay = document.querySelector('.zoom-level');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${this.currentZoom}%`;
        }
    }

    animateZoom() {
        const preview = document.querySelector('.document-preview');
        if (preview) {
            preview.style.transform = `scale(${this.currentZoom / 100})`;
            preview.style.transition = 'transform 0.3s ease';
        }
    }

    toggleFullscreen() {
        const viewer = document.querySelector('.premium-viewer');
        const icon = document.querySelector('.control-btn[title="Fullscreen"] .material-symbols-outlined');
        
        if (!this.isFullscreen) {
            viewer.classList.add('fullscreen-mode');
            icon.textContent = 'fullscreen_exit';
            this.isFullscreen = true;
        } else {
            viewer.classList.remove('fullscreen-mode');
            icon.textContent = 'fullscreen';
            this.isFullscreen = false;
        }
    }

    // Header Actions
    toggleFavorite() {
        const favoriteBtn = document.querySelector('.favorite-btn .material-symbols-outlined');
        
        this.favorited = !this.favorited;
        favoriteBtn.textContent = this.favorited ? 'favorite' : 'favorite_border';
        
        // Add animation
        favoriteBtn.style.transform = 'scale(1.2)';
        favoriteBtn.style.color = this.favorited ? '#ef4444' : '';
        
        setTimeout(() => {
            favoriteBtn.style.transform = 'scale(1)';
        }, 200);

        this.showToast(this.favorited ? 'Added to favorites!' : 'Removed from favorites');
    }

    showShareModal() {
        // Create share modal
        const modal = this.createModal('Share Document', `
            <div class="share-options">
                <button class="share-option" data-type="copy">
                    <span class="material-symbols-outlined">link</span>
                    Copy Link
                </button>
                <button class="share-option" data-type="email">
                    <span class="material-symbols-outlined">email</span>
                    Email
                </button>
                <button class="share-option" data-type="social">
                    <span class="material-symbols-outlined">share</span>
                    Social Media
                </button>
            </div>
        `);

        // Add event listeners
        modal.querySelectorAll('.share-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.handleShare(type);
                this.closeModal(modal);
            });
        });
    }

    showUserMenu() {
        const userAvatar = document.querySelector('.user-avatar');
        
        // Create user menu
        const menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="menu-item">
                <span class="material-symbols-outlined">person</span>
                Profile
            </div>
            <div class="menu-item">
                <span class="material-symbols-outlined">shopping_cart</span>
                My Cart
            </div>
            <div class="menu-item">
                <span class="material-symbols-outlined">favorite</span>
                Favorites
            </div>
            <div class="menu-item">
                <span class="material-symbols-outlined">settings</span>
                Settings
            </div>
            <hr class="menu-divider">
            <div class="menu-item">
                <span class="material-symbols-outlined">logout</span>
                Sign Out
            </div>
        `;

        // Position and show menu
        const rect = userAvatar.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 10}px`;
        menu.style.right = `${window.innerWidth - rect.right}px`;
        
        document.body.appendChild(menu);

        // Close menu on outside click
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!menu.contains(e.target) && !userAvatar.contains(e.target)) {
                    menu.remove();
                }
            }, { once: true });
        }, 100);
    }

    // Purchase Actions
    addToCart() {
        const button = document.querySelector('.premium-btn.primary');
        const originalText = button.querySelector('.btn-text').textContent;
        const icon = button.querySelector('.material-symbols-outlined');
        
        // Button loading state
        button.style.pointerEvents = 'none';
        icon.textContent = 'hourglass_empty';
        button.querySelector('.btn-text').textContent = 'Adding...';
        
        // Simulate API call
        setTimeout(() => {
            icon.textContent = 'check';
            button.querySelector('.btn-text').textContent = 'Added!';
            button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            
            setTimeout(() => {
                icon.textContent = 'shopping_cart';
                button.querySelector('.btn-text').textContent = originalText;
                button.style.background = '';
                button.style.pointerEvents = '';
            }, 2000);
        }, 1500);

        this.showToast('Document added to cart!');
    }

    buyNow() {
        const button = document.querySelector('.premium-btn.secondary');
        
        // Add loading animation
        button.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            button.style.transform = 'scale(1)';
            this.showPurchaseModal();
        }, 150);
    }

    showPurchaseModal() {
        const modal = this.createModal('Complete Purchase', `
            <div class="purchase-form">
                <div class="purchase-summary">
                    <h3>Advanced Machine Learning Algorithms</h3>
                    <div class="price-line">
                        <span>Price:</span>
                        <span class="price">€24.99</span>
                    </div>
                </div>
                <div class="payment-methods">
                    <button class="payment-method">
                        <span class="material-symbols-outlined">credit_card</span>
                        Credit Card
                    </button>
                    <button class="payment-method">
                        <span class="material-symbols-outlined">account_balance_wallet</span>
                        PayPal
                    </button>
                </div>
                <button class="confirm-purchase">
                    <span class="material-symbols-outlined">lock</span>
                    Secure Purchase
                </button>
            </div>
        `);

        // Add purchase logic
        const confirmBtn = modal.querySelector('.confirm-purchase');
        confirmBtn.addEventListener('click', () => {
            this.processPurchase();
            this.closeModal(modal);
        });
    }

    // Card Interactions
    navigateToDocument(card) {
        const title = card.querySelector('.card-title').textContent;
        
        // Add navigation animation
        card.style.transform = 'scale(0.95)';
        card.style.opacity = '0.8';
        
        setTimeout(() => {
            this.showToast(`Opening: ${title}`);
            // Here you would typically navigate to the document
        }, 200);
    }

    quickPreview(card) {
        const title = card.querySelector('.card-title').textContent;
        const description = card.querySelector('.card-description').textContent;
        
        const modal = this.createModal('Quick Preview', `
            <div class="quick-preview">
                <div class="preview-content">
                    <h3>${title}</h3>
                    <p>${description}</p>
                    <div class="preview-actions">
                        <button class="preview-btn primary">View Full Document</button>
                        <button class="preview-btn secondary">Add to Cart</button>
                    </div>
                </div>
            </div>
        `);

        // Add preview interactions
        const viewBtn = modal.querySelector('.preview-btn.primary');
        const addBtn = modal.querySelector('.preview-btn.secondary');
        
        viewBtn.addEventListener('click', () => {
            this.closeModal(modal);
            this.navigateToDocument(card);
        });
        
        addBtn.addEventListener('click', () => {
            this.closeModal(modal);
            this.showToast('Added to cart!');
        });
    }

    // Review System
    showReviewModal() {
        const modal = this.createModal('Write a Review', `
            <div class="review-form">
                <div class="rating-section">
                    <label>Your Rating:</label>
                    <div class="interactive-stars">
                        ${Array(5).fill(0).map((_, i) => 
                            `<span class="star interactive" data-rating="${i + 1}">★</span>`
                        ).join('')}
                    </div>
                </div>
                <div class="review-text">
                    <label for="review-content">Your Review:</label>
                    <textarea id="review-content" rows="4" placeholder="Share your thoughts about this document..."></textarea>
                </div>
                <div class="review-actions">
                    <button class="submit-review">Submit Review</button>
                </div>
            </div>
        `);

        this.setupReviewModalInteractions(modal);
    }

    setupReviewModalInteractions(modal) {
        const stars = modal.querySelectorAll('.interactive-stars .star');
        let selectedRating = 0;

        stars.forEach((star, index) => {
            star.addEventListener('mouseenter', () => {
                this.highlightStarsInModal(stars, index);
            });
            
            star.addEventListener('mouseleave', () => {
                this.resetStarsInModal(stars, selectedRating);
            });
            
            star.addEventListener('click', () => {
                selectedRating = index + 1;
                this.setStarsInModal(stars, selectedRating);
            });
        });

        const submitBtn = modal.querySelector('.submit-review');
        submitBtn.addEventListener('click', () => {
            const content = modal.querySelector('#review-content').value;
            if (selectedRating > 0 && content.trim()) {
                this.submitReview(selectedRating, content);
                this.closeModal(modal);
            } else {
                this.showToast('Please provide a rating and review text');
            }
        });
    }

    highlightStarsInModal(stars, index) {
        stars.forEach((star, i) => {
            star.style.color = i <= index ? '#fbbf24' : '#d1d5db';
        });
    }

    resetStarsInModal(stars, selectedRating) {
        stars.forEach((star, i) => {
            star.style.color = i < selectedRating ? '#fbbf24' : '#d1d5db';
        });
    }

    setStarsInModal(stars, rating) {
        stars.forEach((star, i) => {
            star.style.color = i < rating ? '#fbbf24' : '#d1d5db';
        });
    }

    submitReview(rating, content) {
        // Simulate API call
        this.showToast('Review submitted successfully!');
        
        // Add new review to the list (simulation)
        setTimeout(() => {
            this.addReviewToList(rating, content);
        }, 1000);
    }

    addReviewToList(rating, content) {
        const commentsList = document.querySelector('.comments-list');
        const newComment = document.createElement('div');
        newComment.className = 'comment';
        newComment.innerHTML = `
            <div class="comment-header">
                <div class="comment-author">
                    <div class="author-avatar">
                        <span>Y</span>
                    </div>
                    <div class="author-info">
                        <span class="author-name">You</span>
                        <div class="comment-rating">
                            ${Array(5).fill(0).map((_, i) => 
                                `<span class="star">${i < rating ? '★' : '★'}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                <span class="comment-time">Just now</span>
            </div>
            <p class="comment-text">${content}</p>
        `;
        
        // Add with animation
        newComment.style.opacity = '0';
        newComment.style.transform = 'translateY(20px)';
        commentsList.insertBefore(newComment, commentsList.firstChild);
        
        setTimeout(() => {
            newComment.style.transition = 'all 0.3s ease';
            newComment.style.opacity = '1';
            newComment.style.transform = 'translateY(0)';
        }, 100);
    }

    // Utility Functions
    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'premium-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="modal-close">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add close functionality
        const closeBtn = modal.querySelector('.modal-close');
        const overlay = modal.querySelector('.modal-overlay');
        
        [closeBtn, overlay].forEach(element => {
            element.addEventListener('click', () => this.closeModal(modal));
        });

        // Prevent modal content click from closing
        modal.querySelector('.modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Animate in
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modal.querySelector('.modal-content').style.transform = 'scale(1)';
        });

        return modal;
    }

    closeModal(modal) {
        modal.style.opacity = '0';
        modal.querySelector('.modal-content').style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            modal.remove();
        }, 300);
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `premium-toast ${type}`;
        toast.innerHTML = `
            <span class="material-symbols-outlined">
                ${type === 'success' ? 'check_circle' : 'info'}
            </span>
            <span class="toast-message">${message}</span>
        `;

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0) translateY(0)';
            toast.style.opacity = '1';
        });

        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(100%) translateY(0)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    handleShare(type) {
        switch (type) {
            case 'copy':
                navigator.clipboard.writeText(window.location.href);
                this.showToast('Link copied to clipboard!');
                break;
            case 'email':
                window.location.href = `mailto:?subject=Check out this document&body=${encodeURIComponent(window.location.href)}`;
                break;
            case 'social':
                this.showToast('Social sharing opened!');
                break;
        }
    }

    processPurchase() {
        this.showToast('Processing purchase...');
        
        setTimeout(() => {
            this.showToast('Purchase completed successfully!');
        }, 2000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PremiumDocumentPreview();
});

// Add premium modal and toast styles
const premiumStyles = `
<style>
.premium-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
}

.modal-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.95);
    background: white;
    border-radius: 1rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    max-width: 500px;
    width: 90vw;
    max-height: 80vh;
    overflow: auto;
    transition: transform 0.3s ease;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
}

.modal-close {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.5rem;
    color: #6b7280;
    transition: all 0.2s ease;
}

.modal-close:hover {
    background: #f3f4f6;
    color: #111827;
}

.modal-body {
    padding: 1.5rem;
}

.share-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.share-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.share-option:hover {
    background: #f3f4f6;
    border-color: #3b82f6;
}

.user-menu {
    position: fixed;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    min-width: 200px;
    z-index: 1001;
    animation: fadeInUp 0.2s ease-out;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: background 0.2s ease;
}

.menu-item:hover {
    background: #f3f4f6;
}

.menu-item:first-child {
    border-radius: 0.75rem 0.75rem 0 0;
}

.menu-item:last-child {
    border-radius: 0 0 0.75rem 0.75rem;
}

.menu-divider {
    margin: 0.5rem 0;
    border: none;
    border-top: 1px solid #e5e7eb;
}

.premium-toast {
    position: fixed;
    top: 2rem;
    right: 2rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1rem 1.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    z-index: 10001;
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.3s ease;
}

.premium-toast.success {
    border-left: 4px solid #10b981;
}

.premium-toast .material-symbols-outlined {
    color: #10b981;
}

.toast-message {
    font-size: 0.875rem;
    font-weight: 500;
    color: #111827;
}

.fullscreen-mode {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    z-index: 1000 !important;
    background: white !important;
}

.purchase-form,
.review-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.purchase-summary h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 1rem;
}

.price-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
}

.price-line .price {
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
}

.payment-methods {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.payment-method,
.confirm-purchase {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
}

.payment-method:hover {
    border-color: #3b82f6;
    background: #f9fafb;
}

.confirm-purchase {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border: none;
    font-weight: 600;
}

.confirm-purchase:hover {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.rating-section label,
.review-text label {
    font-weight: 600;
    color: #111827;
    margin-bottom: 0.5rem;
}

.interactive-stars {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1rem;
}

.interactive-stars .star {
    font-size: 1.5rem;
    color: #d1d5db;
    cursor: pointer;
    transition: color 0.2s ease;
}

.interactive-stars .star:hover {
    color: #fbbf24;
}

#review-content {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    resize: vertical;
    font-family: inherit;
}

.submit-review {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.submit-review:hover {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.preview-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
}

.preview-btn {
    flex: 1;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.preview-btn.primary {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border: none;
}

.preview-btn.secondary {
    background: white;
    color: #3b82f6;
    border: 2px solid #3b82f6;
}

.preview-btn:hover {
    transform: translateY(-1px);
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', premiumStyles); 