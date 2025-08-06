/**
 * PERFORMANCE VALIDATION SUITE
 * Validates that all optimization targets are met
 */

class PerformanceValidator {
    constructor() {
        this.testSuite = {
            layoutShift: {
                name: 'Zero Layout Shift Test',
                target: 0.1,
                status: 'pending'
            },
            loadTime: {
                name: 'Load Time Test',
                target: 1000, // 1 second
                status: 'pending'
            },
            skeletonMatch: {
                name: 'Skeleton Dimension Match Test',
                target: 100, // 100% accuracy
                status: 'pending'
            },
            bundleSize: {
                name: 'Bundle Size Test',
                target: 200000, // 200KB
                status: 'pending'
            },
            accessibility: {
                name: 'Accessibility Test',
                target: 100, // No violations
                status: 'pending'
            }
        };
        
        this.results = {};
        this.init();
    }

    async init() {
        console.log('🧪 Starting Performance Validation Suite...');
        console.log('Target: Sub-1s loading with zero layout shift');
        console.log('========================================');
        
        await this.runAllTests();
        this.generateReport();
    }

    async runAllTests() {
        try {
            await Promise.all([
                this.testLayoutShift(),
                this.testLoadTime(),
                this.testSkeletonDimensions(),
                this.testBundleSize(),
                this.testAccessibility()
            ]);
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }
    }

    async testLayoutShift() {
        return new Promise((resolve) => {
            console.log('🔍 Testing Layout Shift...');
            
            let clsValue = 0;
            let entryCount = 0;
            
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                            entryCount++;
                        }
                    }
                });
                
                observer.observe({ entryTypes: ['layout-shift'] });
                
                // Test for 3 seconds
                setTimeout(() => {
                    observer.disconnect();
                    
                    this.results.layoutShift = {
                        value: clsValue,
                        entries: entryCount,
                        passed: clsValue <= this.testSuite.layoutShift.target
                    };
                    
                    const status = clsValue <= this.testSuite.layoutShift.target ? '✅' : '❌';
                    console.log(`${status} Layout Shift: ${clsValue.toFixed(4)} (target: ≤${this.testSuite.layoutShift.target})`);
                    
                    this.testSuite.layoutShift.status = clsValue <= this.testSuite.layoutShift.target ? 'passed' : 'failed';
                    resolve();
                }, 3000);
            } else {
                console.log('⚠️ PerformanceObserver not supported - skipping CLS test');
                this.testSuite.layoutShift.status = 'skipped';
                resolve();
            }
        });
    }

    async testLoadTime() {
        console.log('🔍 Testing Load Time...');
        
        const navigation = performance.getEntriesByType('navigation')[0];
        if (!navigation) {
            console.log('⚠️ Navigation timing not available');
            this.testSuite.loadTime.status = 'skipped';
            return;
        }
        
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        const domReady = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        const interactive = navigation.domInteractive - navigation.fetchStart;
        
        this.results.loadTime = {
            total: loadTime,
            domReady: domReady,
            interactive: interactive,
            passed: interactive <= this.testSuite.loadTime.target
        };
        
        const status = interactive <= this.testSuite.loadTime.target ? '✅' : '❌';
        console.log(`${status} Load Time: ${Math.round(interactive)}ms (target: ≤${this.testSuite.loadTime.target}ms)`);
        console.log(`   - DOM Ready: ${Math.round(domReady)}ms`);
        console.log(`   - Total Load: ${Math.round(loadTime)}ms`);
        
        this.testSuite.loadTime.status = interactive <= this.testSuite.loadTime.target ? 'passed' : 'failed';
    }

    async testSkeletonDimensions() {
        console.log('🔍 Testing Skeleton Dimension Matching...');
        
        // Create a temporary real card to compare dimensions
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.className = 'documents-grid';
        
        // Add real card
        const realCard = this.createRealCard();
        tempContainer.appendChild(realCard);
        
        // Add skeleton card
        const skeletonCard = this.createSkeletonCard();
        tempContainer.appendChild(skeletonCard);
        
        document.body.appendChild(tempContainer);
        
        // Force layout
        tempContainer.offsetHeight;
        
        // Measure dimensions
        const realRect = realCard.getBoundingClientRect();
        const skeletonRect = skeletonCard.getBoundingClientRect();
        
        const dimensionMatch = {
            height: Math.abs(realRect.height - skeletonRect.height) < 1,
            width: Math.abs(realRect.width - skeletonRect.width) < 1,
            heightDiff: Math.abs(realRect.height - skeletonRect.height),
            widthDiff: Math.abs(realRect.width - skeletonRect.width)
        };
        
        const accuracy = (dimensionMatch.height && dimensionMatch.width) ? 100 : 
                        (dimensionMatch.height || dimensionMatch.width) ? 50 : 0;
        
        this.results.skeletonMatch = {
            accuracy: accuracy,
            dimensions: dimensionMatch,
            realCard: { width: realRect.width, height: realRect.height },
            skeletonCard: { width: skeletonRect.width, height: skeletonRect.height },
            passed: accuracy >= this.testSuite.skeletonMatch.target
        };
        
        const status = accuracy >= this.testSuite.skeletonMatch.target ? '✅' : '❌';
        console.log(`${status} Skeleton Match: ${accuracy}% (target: ≥${this.testSuite.skeletonMatch.target}%)`);
        console.log(`   - Real Card: ${Math.round(realRect.width)}×${Math.round(realRect.height)}px`);
        console.log(`   - Skeleton: ${Math.round(skeletonRect.width)}×${Math.round(skeletonRect.height)}px`);
        console.log(`   - Difference: ${dimensionMatch.widthDiff.toFixed(1)}×${dimensionMatch.heightDiff.toFixed(1)}px`);
        
        // Cleanup
        document.body.removeChild(tempContainer);
        
        this.testSuite.skeletonMatch.status = accuracy >= this.testSuite.skeletonMatch.target ? 'passed' : 'failed';
    }

    async testBundleSize() {
        console.log('🔍 Testing Bundle Size...');
        
        const resources = performance.getEntriesByType('resource');
        let totalSize = 0;
        let criticalSize = 0;
        
        const breakdown = {
            css: 0,
            js: 0,
            images: 0,
            fonts: 0
        };
        
        resources.forEach(resource => {
            const size = resource.transferSize || resource.encodedBodySize || 0;
            const url = resource.name;
            
            totalSize += size;
            
            // Categorize resources
            if (url.includes('.css')) {
                breakdown.css += size;
                if (url.includes('critical') || url.includes('search.css')) {
                    criticalSize += size;
                }
            } else if (url.includes('.js')) {
                breakdown.js += size;
                if (url.includes('instant-loading') || url.includes('search.js')) {
                    criticalSize += size;
                }
            } else if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
                breakdown.images += size;
                if (url.includes('bg.png') || url.includes('Logo.png')) {
                    criticalSize += size;
                }
            } else if (url.includes('font')) {
                breakdown.fonts += size;
            }
        });
        
        this.results.bundleSize = {
            total: totalSize,
            critical: criticalSize,
            breakdown: breakdown,
            passed: criticalSize <= this.testSuite.bundleSize.target
        };
        
        const status = criticalSize <= this.testSuite.bundleSize.target ? '✅' : '❌';
        console.log(`${status} Bundle Size: ${Math.round(criticalSize / 1024)}KB (target: ≤${Math.round(this.testSuite.bundleSize.target / 1024)}KB)`);
        console.log(`   - CSS: ${Math.round(breakdown.css / 1024)}KB`);
        console.log(`   - JS: ${Math.round(breakdown.js / 1024)}KB`);
        console.log(`   - Images: ${Math.round(breakdown.images / 1024)}KB`);
        console.log(`   - Fonts: ${Math.round(breakdown.fonts / 1024)}KB`);
        console.log(`   - Total: ${Math.round(totalSize / 1024)}KB`);
        
        this.testSuite.bundleSize.status = criticalSize <= this.testSuite.bundleSize.target ? 'passed' : 'failed';
    }

    async testAccessibility() {
        console.log('🔍 Testing Accessibility...');
        
        const violations = [];
        
        // Test basic accessibility requirements
        const tests = [
            {
                name: 'Alt text for images',
                test: () => {
                    const images = document.querySelectorAll('img');
                    let missingAlt = 0;
                    images.forEach(img => {
                        if (!img.alt && !img.getAttribute('aria-label')) {
                            missingAlt++;
                        }
                    });
                    return { passed: missingAlt === 0, details: `${missingAlt} images missing alt text` };
                }
            },
            {
                name: 'Keyboard navigation',
                test: () => {
                    const focusable = document.querySelectorAll('button, input, a, [tabindex]');
                    let unfocusable = 0;
                    focusable.forEach(el => {
                        if (el.tabIndex === -1 && !el.disabled) {
                            unfocusable++;
                        }
                    });
                    return { passed: unfocusable === 0, details: `${unfocusable} elements not keyboard accessible` };
                }
            },
            {
                name: 'ARIA labels',
                test: () => {
                    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
                    const unlabeled = Array.from(buttons).filter(btn => !btn.textContent.trim()).length;
                    return { passed: unlabeled === 0, details: `${unlabeled} buttons without labels` };
                }
            }
        ];
        
        tests.forEach(test => {
            const result = test.test();
            if (!result.passed) {
                violations.push({ name: test.name, issue: result.details });
            }
        });
        
        this.results.accessibility = {
            violations: violations,
            passed: violations.length === 0
        };
        
        const status = violations.length === 0 ? '✅' : '❌';
        console.log(`${status} Accessibility: ${violations.length} violations (target: 0)`);
        
        if (violations.length > 0) {
            violations.forEach(violation => {
                console.log(`   - ${violation.name}: ${violation.issue}`);
            });
        }
        
        this.testSuite.accessibility.status = violations.length === 0 ? 'passed' : 'failed';
    }

    createRealCard() {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.innerHTML = `
            <div class="document-preview">
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PC9zdmc+" alt="Test">
            </div>
            <div class="document-content">
                <div class="document-header">
                    <h3 class="document-title">Test Document Title</h3>
                    <p class="document-author">di Test Author</p>
                </div>
                <div class="document-info">
                    <div class="info-item">Test Course</div>
                    <div class="info-item">Test Faculty</div>
                    <div class="info-item">10 pagine</div>
                    <div class="info-item">PDF</div>
                </div>
                <div class="document-footer">
                    <div class="footer-left">
                        <div class="user-avatar">T</div>
                        <div class="user-meta">
                            <span class="upload-date">01/01/2024</span>
                        </div>
                    </div>
                    <div class="document-price">€5.00</div>
                </div>
            </div>
        `;
        return card;
    }

    createSkeletonCard() {
        const card = document.createElement('div');
        card.className = 'document-card loading-card';
        card.innerHTML = `
            <div class="document-preview"></div>
            <div class="document-content">
                <div class="document-header">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-author"></div>
                </div>
                <div class="document-info">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                </div>
                <div class="document-footer">
                    <div class="skeleton-footer-left">
                        <div class="skeleton-avatar"></div>
                        <div class="skeleton-meta"></div>
                    </div>
                    <div class="skeleton-price"></div>
                </div>
            </div>
        `;
        return card;
    }

    generateReport() {
        console.log('\n📊 PERFORMANCE VALIDATION REPORT');
        console.log('=====================================');
        
        const passedTests = Object.values(this.testSuite).filter(test => test.status === 'passed').length;
        const totalTests = Object.values(this.testSuite).filter(test => test.status !== 'skipped').length;
        const skippedTests = Object.values(this.testSuite).filter(test => test.status === 'skipped').length;
        
        console.log(`Overall Score: ${passedTests}/${totalTests} tests passed`);
        if (skippedTests > 0) {
            console.log(`${skippedTests} tests skipped due to browser limitations`);
        }
        
        const overallStatus = passedTests === totalTests ? '✅ PASSED' : '❌ FAILED';
        console.log(`Status: ${overallStatus}`);
        
        console.log('\nDetailed Results:');
        Object.entries(this.testSuite).forEach(([key, test]) => {
            const status = test.status === 'passed' ? '✅' : 
                          test.status === 'failed' ? '❌' : 
                          test.status === 'skipped' ? '⏭️' : '⏳';
            console.log(`  ${status} ${test.name}: ${test.status.toUpperCase()}`);
        });
        
        if (passedTests === totalTests) {
            console.log('\n🎉 All performance targets achieved!');
            console.log('Search page is optimized for production deployment.');
        } else {
            console.log('\n⚠️ Some performance targets not met.');
            console.log('Review failed tests and implement fixes before deployment.');
        }
        
        return {
            passed: passedTests === totalTests,
            score: `${passedTests}/${totalTests}`,
            results: this.results,
            testSuite: this.testSuite
        };
    }

    exportResults() {
        const report = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            testSuite: this.testSuite,
            results: this.results,
            summary: {
                passed: Object.values(this.testSuite).filter(test => test.status === 'passed').length,
                failed: Object.values(this.testSuite).filter(test => test.status === 'failed').length,
                skipped: Object.values(this.testSuite).filter(test => test.status === 'skipped').length,
                total: Object.values(this.testSuite).length
            }
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-validation-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📁 Validation results exported to JSON file');
        return report;
    }
}

// Auto-run validation in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            window.performanceValidator = new PerformanceValidator();
        }, 2000); // Wait 2 seconds for page to settle
    });
}

// Make available globally
window.validatePerformance = () => {
    return new PerformanceValidator();
};

export { PerformanceValidator };