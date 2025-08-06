/**
 * BACKGROUND FIX TEST
 * Non-module script to test background image loading
 */

function testBackgroundFix() {
    console.log('🧪 BACKGROUND IMAGE FIX TEST');
    console.log('============================');
    
    // Test 1: Check if background element exists
    const bgElement = document.querySelector('.background-image');
    if (!bgElement) {
        console.log('❌ Background element not found');
        return;
    }
    
    // Test 2: Check computed styles
    const computedStyle = window.getComputedStyle(bgElement);
    const backgroundImage = computedStyle.backgroundImage;
    const backgroundSize = computedStyle.backgroundSize;
    
    console.log('📊 Current CSS values:');
    console.log('   background-image:', backgroundImage);
    console.log('   background-size:', backgroundSize);
    
    // Test 3: Check if image is applied
    if (backgroundImage.includes('bg.png')) {
        console.log('✅ Background image is applied');
    } else {
        console.log('❌ Background image NOT applied');
        console.log('🔧 Attempting to fix...');
        
        // Apply fix directly
        bgElement.style.backgroundImage = 'url("images/bg.png")';
        bgElement.style.backgroundSize = '100vw auto';
        bgElement.style.backgroundRepeat = 'no-repeat';
        bgElement.style.backgroundPosition = 'center top';
        
        console.log('✅ Background applied via JavaScript fix');
    }
    
    // Test 4: Performance test
    const img = new Image();
    const startTime = performance.now();
    
    img.onload = function() {
        const loadTime = performance.now() - startTime;
        console.log(`📊 Image load time: ${Math.round(loadTime)}ms`);
        
        if (loadTime < 10) {
            console.log('✅ Image loads from cache (very fast)');
        } else if (loadTime < 100) {
            console.log('✅ Image loads quickly');
        } else {
            console.log('⚠️ Image loads slowly');
        }
    };
    
    img.src = 'images/bg.png?test=' + Date.now();
    
    console.log('\n📋 MANUAL TEST:');
    console.log('1. Refresh this page (F5)');
    console.log('2. Background should appear instantly');
    console.log('3. If not, run: fixBackgroundNow()');
}

function fixBackgroundNow() {
    console.log('🔧 EMERGENCY BACKGROUND FIX');
    
    const bgElement = document.querySelector('.background-image');
    if (!bgElement) {
        console.log('❌ Background element not found');
        return;
    }
    
    // Force apply background with highest priority
    bgElement.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        z-index: -1 !important;
        background-image: url('images/bg.png') !important;
        background-size: 100vw auto !important;
        background-repeat: no-repeat !important;
        background-position: center top !important;
        will-change: transform !important;
    `;
    
    console.log('✅ Background force-applied');
}

// Make functions globally available
window.testBackgroundFix = testBackgroundFix;
window.fixBackgroundNow = fixBackgroundNow;

// Auto-run test when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testBackgroundFix);
} else {
    testBackgroundFix();
}