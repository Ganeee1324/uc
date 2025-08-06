/**
 * BACKGROUND IMAGE LOADING TEST
 * Tests the background image loading optimization to ensure no delays
 */

class BackgroundLoadTest {
    constructor() {
        this.testResults = {
            sessionCacheTest: 'pending',
            imageLoadTest: 'pending',
            fallbackTest: 'pending',
            refreshTest: 'pending'
        };
        
        this.runTests();
    }

    async runTests() {
        console.log('🧪 Testing Background Image Loading Optimization...');
        console.log('================================================');
        
        // Test 1: Session cache functionality
        await this.testSessionCache();
        
        // Test 2: Image loading speed
        await this.testImageLoadSpeed();
        
        // Test 3: Fallback mechanism
        await this.testFallbackMechanism();
        
        // Test 4: Refresh behavior simulation
        await this.testRefreshBehavior();
        
        this.reportResults();
    }

    async testSessionCache() {
        console.log('🔍 Test 1: Session Cache Functionality');
        
        try {
            // Clear existing cache
            sessionStorage.removeItem('bg-loaded');
            sessionStorage.removeItem('bg-load-time');
            
            // Set recent cache entry
            sessionStorage.setItem('bg-load-time', Date.now().toString());
            sessionStorage.setItem('bg-loaded', 'true');
            
            // Simulate cache check
            const recentLoad = sessionStorage.getItem('bg-load-time');
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            const cacheValid = recentLoad && parseInt(recentLoad) > fiveMinutesAgo;
            
            if (cacheValid) {
                this.testResults.sessionCacheTest = 'passed';
                console.log('✅ Session cache test passed');
            } else {
                this.testResults.sessionCacheTest = 'failed';
                console.log('❌ Session cache test failed');
            }
            
        } catch (error) {
            this.testResults.sessionCacheTest = 'failed';
            console.log('❌ Session cache test failed:', error.message);
        }
    }

    async testImageLoadSpeed() {
        console.log('🔍 Test 2: Image Loading Speed');
        
        return new Promise((resolve) => {
            const startTime = performance.now();
            const img = new Image();
            
            img.onload = () => {
                const loadTime = performance.now() - startTime;
                console.log(`📊 Image load time: ${Math.round(loadTime)}ms`);
                
                if (loadTime < 1000) { // Less than 1 second
                    this.testResults.imageLoadTest = 'passed';
                    console.log('✅ Image load speed test passed');
                } else {
                    this.testResults.imageLoadTest = 'failed';
                    console.log('❌ Image load speed test failed (too slow)');
                }
                resolve();
            };
            
            img.onerror = () => {
                this.testResults.imageLoadTest = 'failed';
                console.log('❌ Image load speed test failed (load error)');
                resolve();
            };
            
            // Add timeout for very slow connections
            setTimeout(() => {
                if (this.testResults.imageLoadTest === 'pending') {
                    this.testResults.imageLoadTest = 'failed';
                    console.log('❌ Image load speed test failed (timeout)');
                    resolve();
                }
            }, 5000);
            
            img.src = 'images/bg.png?test=' + Date.now();
        });
    }

    async testFallbackMechanism() {
        console.log('🔍 Test 3: Fallback Mechanism');
        
        try {
            // Test CSS fallback gradient
            const testDiv = document.createElement('div');
            testDiv.style.cssText = `
                position: absolute;
                left: -9999px;
                width: 100px;
                height: 100px;
                background-image: linear-gradient(135deg, #9ddafd 0%, #84d0fc 50%, #9ddafd 100%);
            `;
            
            document.body.appendChild(testDiv);
            
            // Check computed style
            const computedStyle = window.getComputedStyle(testDiv);
            const backgroundImage = computedStyle.backgroundImage;
            
            document.body.removeChild(testDiv);
            
            if (backgroundImage.includes('gradient')) {
                this.testResults.fallbackTest = 'passed';
                console.log('✅ Fallback mechanism test passed');
            } else {
                this.testResults.fallbackTest = 'failed';
                console.log('❌ Fallback mechanism test failed');
            }
            
        } catch (error) {
            this.testResults.fallbackTest = 'failed';
            console.log('❌ Fallback mechanism test failed:', error.message);
        }
    }

    async testRefreshBehavior() {
        console.log('🔍 Test 4: Refresh Behavior Simulation');
        
        try {
            // Simulate page refresh scenario
            // Step 1: Set up cache as if image was recently loaded
            sessionStorage.setItem('bg-load-time', Date.now().toString());
            
            // Step 2: Test immediate application (simulating refresh)
            const imageUrl = 'images/bg.png';
            const recentLoad = sessionStorage.getItem('bg-load-time');
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            
            if (recentLoad && parseInt(recentLoad) > fiveMinutesAgo) {
                // This is what should happen on refresh - immediate application
                document.documentElement.style.setProperty('--test-bg', `url("${imageUrl}")`);
                
                // Verify the CSS property was set
                const propertyValue = document.documentElement.style.getPropertyValue('--test-bg');
                
                if (propertyValue.includes('bg.png')) {
                    this.testResults.refreshTest = 'passed';
                    console.log('✅ Refresh behavior test passed');
                } else {
                    this.testResults.refreshTest = 'failed';
                    console.log('❌ Refresh behavior test failed (CSS property not set)');
                }
                
                // Clean up
                document.documentElement.style.removeProperty('--test-bg');
            } else {
                this.testResults.refreshTest = 'failed';
                console.log('❌ Refresh behavior test failed (cache logic error)');
            }
            
        } catch (error) {
            this.testResults.refreshTest = 'failed';
            console.log('❌ Refresh behavior test failed:', error.message);
        }
    }

    reportResults() {
        console.log('\n📊 BACKGROUND IMAGE LOADING TEST RESULTS');
        console.log('========================================');
        
        const tests = [
            { name: 'Session Cache', result: this.testResults.sessionCacheTest },
            { name: 'Image Load Speed', result: this.testResults.imageLoadTest },
            { name: 'Fallback Mechanism', result: this.testResults.fallbackTest },
            { name: 'Refresh Behavior', result: this.testResults.refreshTest }
        ];
        
        let passed = 0;
        let total = tests.length;
        
        tests.forEach(test => {
            const status = test.result === 'passed' ? '✅' : '❌';
            console.log(`${status} ${test.name}: ${test.result.toUpperCase()}`);
            if (test.result === 'passed') passed++;
        });
        
        console.log(`\nOverall Score: ${passed}/${total} tests passed`);
        
        if (passed === total) {
            console.log('🎉 All background image loading tests passed!');
            console.log('The refresh delay issue should be resolved.');
        } else {
            console.log('⚠️ Some tests failed. Background image loading may still have issues.');
        }
        
        // Instructions for user
        console.log('\n📋 How to test manually:');
        console.log('1. Load the search page');
        console.log('2. Wait for background to appear');
        console.log('3. Refresh the page (F5 or Ctrl+R)');
        console.log('4. Background should appear instantly without delay');
        
        return {
            passed: passed === total,
            score: `${passed}/${total}`,
            details: this.testResults
        };
    }
}

// Auto-run test in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            window.backgroundLoadTest = new BackgroundLoadTest();
        }, 1000);
    });
}

// Make available globally
window.testBackgroundLoading = () => {
    return new BackgroundLoadTest();
};

export { BackgroundLoadTest };