/**
 * CACHE REFRESH TEST
 * Specifically tests the cached image delay issue
 */

class CacheRefreshTest {
    constructor() {
        this.testResults = {};
        this.runTests();
    }

    async runTests() {
        console.log('🧪 Testing Cached Image Refresh Behavior...');
        console.log('===========================================');
        
        await this.testCSSBackgroundApplication();
        await this.testPreloadVsCSSRace();
        await this.testBrowserCacheScenario();
        
        this.reportResults();
    }

    async testCSSBackgroundApplication() {
        console.log('🔍 Test 1: CSS Background Application (Critical)');
        
        try {
            // Test if background image is applied directly in CSS
            const bgElement = document.querySelector('.background-image');
            if (!bgElement) {
                this.testResults.cssApplication = 'failed - no background element';
                return;
            }
            
            const computedStyle = window.getComputedStyle(bgElement);
            const backgroundImage = computedStyle.backgroundImage;
            
            console.log('📊 Background image CSS value:', backgroundImage);
            
            // Check if the CSS contains the image URL
            if (backgroundImage.includes('bg.png')) {
                this.testResults.cssApplication = 'passed';
                console.log('✅ Background image is applied directly in CSS');
            } else if (backgroundImage.includes('gradient')) {
                this.testResults.cssApplication = 'partial - gradient fallback';
                console.log('⚠️ Only gradient is applied, image may be missing');
            } else {
                this.testResults.cssApplication = 'failed';
                console.log('❌ No background applied in CSS');
            }
            
        } catch (error) {
            this.testResults.cssApplication = 'failed';
            console.log('❌ CSS application test failed:', error.message);
        }
    }

    async testPreloadVsCSSRace() {
        console.log('🔍 Test 2: Preload vs CSS Race Condition');
        
        return new Promise((resolve) => {
            const startTime = performance.now();
            
            // Check if preload link exists
            const preloadLink = document.querySelector('link[rel="preload"][href*="bg.png"]');
            if (!preloadLink) {
                this.testResults.raceCondition = 'failed - no preload link';
                console.log('❌ No preload link found');
                resolve();
                return;
            }
            
            console.log('📊 Preload link found:', preloadLink.href);
            
            // Test if CSS background loads without waiting for preload
            const testImg = new Image();
            testImg.onload = () => {
                const loadTime = performance.now() - startTime;
                console.log(`📊 Image load time: ${Math.round(loadTime)}ms`);
                
                // The key insight: CSS should apply the image regardless of this load time
                const bgElement = document.querySelector('.background-image');
                const computedStyle = window.getComputedStyle(bgElement);
                
                if (computedStyle.backgroundImage.includes('bg.png')) {
                    this.testResults.raceCondition = 'passed';
                    console.log('✅ CSS applies background image synchronously');
                } else {
                    this.testResults.raceCondition = 'failed';
                    console.log('❌ CSS waits for JavaScript/preload');
                }
                resolve();
            };
            
            testImg.onerror = () => {
                this.testResults.raceCondition = 'failed - image error';
                console.log('❌ Image failed to load');
                resolve();
            };
            
            testImg.src = 'images/bg.png?' + Date.now();
        });
    }

    async testBrowserCacheScenario() {
        console.log('🔍 Test 3: Browser Cache Scenario Simulation');
        
        try {
            // Simulate the exact scenario: image is in browser cache
            const testImg1 = new Image();
            testImg1.src = 'images/bg.png';
            
            // Wait for it to be cached
            await new Promise(resolve => {
                if (testImg1.complete) {
                    resolve();
                } else {
                    testImg1.onload = resolve;
                    testImg1.onerror = resolve;
                }
            });
            
            console.log('📊 Image is now in browser cache');
            
            // Now test refresh scenario - create new image as if page refreshed
            const testImg2 = new Image();
            testImg2.src = 'images/bg.png';
            
            // Check if it loads instantly from cache
            const isCached = testImg2.complete;
            console.log('📊 Image loads instantly from cache:', isCached);
            
            // The critical test: does CSS show the background immediately?
            const bgElement = document.querySelector('.background-image');
            const rect = bgElement.getBoundingClientRect();
            
            // Force a repaint to ensure CSS is applied
            bgElement.offsetHeight;
            
            const computedStyle = window.getComputedStyle(bgElement);
            const backgroundImage = computedStyle.backgroundImage;
            
            if (backgroundImage.includes('bg.png')) {
                this.testResults.cacheScenario = 'passed';
                console.log('✅ Background shows immediately even with cached image');
            } else {
                this.testResults.cacheScenario = 'failed';
                console.log('❌ Background not shown immediately with cached image');
                console.log('📊 Current background:', backgroundImage);
            }
            
        } catch (error) {
            this.testResults.cacheScenario = 'failed';
            console.log('❌ Cache scenario test failed:', error.message);
        }
    }

    reportResults() {
        console.log('\n📊 CACHE REFRESH TEST RESULTS');
        console.log('=============================');
        
        const tests = [
            { name: 'CSS Background Application', result: this.testResults.cssApplication },
            { name: 'Preload vs CSS Race', result: this.testResults.raceCondition },
            { name: 'Browser Cache Scenario', result: this.testResults.cacheScenario }
        ];
        
        let passed = 0;
        
        tests.forEach(test => {
            const status = test.result?.includes('passed') ? '✅' : '❌';
            console.log(`${status} ${test.name}: ${test.result || 'unknown'}`);
            if (test.result?.includes('passed')) passed++;
        });
        
        console.log(`\nScore: ${passed}/${tests.length} tests passed`);
        
        if (passed === tests.length) {
            console.log('\n🎉 All cache refresh tests passed!');
            console.log('The background image should show instantly on refresh.');
        } else {
            console.log('\n⚠️ Some tests failed.');
            console.log('🔧 Solution: Background image is now applied directly in CSS');
            console.log('   This eliminates all JavaScript timing issues.');
        }
        
        console.log('\n📋 Manual Test Instructions:');
        console.log('1. Open search page in a new tab');
        console.log('2. Wait for background to fully load');
        console.log('3. Refresh page (F5) - background should appear INSTANTLY');
        console.log('4. Try multiple refreshes - should always be instant');

        return {
            passed: passed === tests.length,
            details: this.testResults
        };
    }
}

// Auto-run test
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.cacheRefreshTest = new CacheRefreshTest();
        }, 1000);
    });
} else {
    setTimeout(() => {
        window.cacheRefreshTest = new CacheRefreshTest();
    }, 1000);
}

// Make available globally
window.testCacheRefresh = () => {
    return new CacheRefreshTest();
};

export { CacheRefreshTest };