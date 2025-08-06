// ===========================
// 🎨 BACKGROUND IMAGE OPTIMIZATION & RESPONSIVE HANDLING
// ===========================

// THE SOLUTION: CSS handles positioning, JS only handles responsive updates
function handleResize() {
    // CSS variables handle all positioning automatically
    // This just triggers CSS recalculation on significant viewport changes
    console.log('🔄 Viewport resized, CSS will handle repositioning automatically');
}

// Debounce function to limit resize handling
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Only handle resize for responsive updates - CSS does the rest
window.addEventListener('resize', debounce(handleResize, 100));

console.log('✅ THE SOLUTION: CSS-first background system initialized');