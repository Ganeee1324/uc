/**
 * PERFORMANCE ANALYZER & BUNDLE OPTIMIZER
 * Analyzes current performance bottlenecks and provides optimization recommendations
 */

class PerformanceAnalyzer {
    constructor() {
        this.metrics = {
            loadTimes: {},
            bundleSizes: {},
            cacheStats: {},
            coreWebVitals: {}
        };
        this.recommendations = [];
        this.init();
    }

    init() {
        console.log('🔍 Performance Analyzer initializing...');
        this.analyzeCurrentState();
        this.measureCoreWebVitals();
        this.analyzeBundleSizes();
        this.generateRecommendations();
    }

    analyzeCurrentState() {
        // Analyze current CSS files
        const stylesheets = Array.from(document.styleSheets);
        console.log('📊 Current CSS Analysis:');
        
        stylesheets.forEach((sheet, index) => {
            try {
                const href = sheet.href || 'inline-style';
                console.log(`  ${index + 1}. ${href}`);
                
                if (sheet.cssRules) {
                    console.log(`     Rules: ${sheet.cssRules.length}`);
                    this.analyzeUnusedCSS(sheet);
                }
            } catch (e) {
                console.log(`     Cannot access (CORS): ${e.message}`);
            }
        });

        // Analyze JavaScript files
        const scripts = Array.from(document.scripts);
        console.log('📊 Current JavaScript Analysis:');
        
        scripts.forEach((script, index) => {
            if (script.src) {
                console.log(`  ${index + 1}. ${script.src}`);
            }
        });
    }

    analyzeUnusedCSS(stylesheet) {
        if (!stylesheet.cssRules) return;
        
        let unusedRules = 0;
        let totalRules = stylesheet.cssRules.length;
        
        Array.from(stylesheet.cssRules).forEach(rule => {
            if (rule.type === CSSRule.STYLE_RULE) {
                try {
                    const elements = document.querySelectorAll(rule.selectorText);
                    if (elements.length === 0) {
                        unusedRules++;
                    }
                } catch (e) {
                    // Invalid selector, likely unused
                    unusedRules++;
                }
            }
        });
        
        const usagePercent = Math.round(((totalRules - unusedRules) / totalRules) * 100);
        console.log(`     Used: ${usagePercent}% (${totalRules - unusedRules}/${totalRules} rules)`);
        
        if (usagePercent < 70) {
            this.recommendations.push({
                type: 'css-optimization',
                message: `Stylesheet has ${100 - usagePercent}% unused CSS. Consider code splitting.`,
                priority: 'high',
                impact: 'Bundle size reduction'
            });
        }
    }

    measureCoreWebVitals() {
        // Measure LCP (Largest Contentful Paint)
        if ('PerformanceObserver' in window) {
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    this.metrics.coreWebVitals.lcp = entry.startTime;
                    console.log(`📊 LCP: ${Math.round(entry.startTime)}ms`);
                    
                    if (entry.startTime > 2500) {
                        this.recommendations.push({
                            type: 'lcp-optimization',
                            message: `LCP is ${Math.round(entry.startTime)}ms (target: <2500ms). Optimize critical path.`,
                            priority: 'critical',
                            impact: 'User experience'
                        });
                    }
                }
            }).observe({ entryTypes: ['largest-contentful-paint'] });

            // Measure FID (First Input Delay)
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    this.metrics.coreWebVitals.fid = entry.processingStart - entry.startTime;
                    console.log(`📊 FID: ${Math.round(this.metrics.coreWebVitals.fid)}ms`);
                }
            }).observe({ entryTypes: ['first-input'] });

            // Measure CLS (Cumulative Layout Shift)
            let clsValue = 0;
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                this.metrics.coreWebVitals.cls = clsValue;
                console.log(`📊 CLS: ${clsValue.toFixed(3)}`);
                
                if (clsValue > 0.1) {
                    this.recommendations.push({
                        type: 'cls-optimization',
                        message: `CLS is ${clsValue.toFixed(3)} (target: <0.1). Implement skeleton placeholders.`,
                        priority: 'high',
                        impact: 'Visual stability'
                    });
                }
            }).observe({ entryTypes: ['layout-shift'] });
        }
    }

    analyzeBundleSizes() {
        // Estimate bundle sizes based on resource loading
        const performanceEntries = performance.getEntriesByType('resource');
        
        console.log('📊 Resource Loading Analysis:');
        
        let totalCSS = 0;
        let totalJS = 0;
        let totalImages = 0;
        
        performanceEntries.forEach(entry => {
            const size = entry.transferSize || entry.encodedBodySize || 0;
            const url = entry.name;
            
            if (url.includes('.css')) {
                totalCSS += size;
                console.log(`  CSS: ${url} - ${Math.round(size / 1024)}KB`);
            } else if (url.includes('.js')) {
                totalJS += size;
                console.log(`  JS: ${url} - ${Math.round(size / 1024)}KB`);
            } else if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
                totalImages += size;
                console.log(`  IMG: ${url} - ${Math.round(size / 1024)}KB`);
            }
        });
        
        console.log(`📊 Total Bundle Sizes:`);
        console.log(`  CSS: ${Math.round(totalCSS / 1024)}KB`);
        console.log(`  JS: ${Math.round(totalJS / 1024)}KB`);
        console.log(`  Images: ${Math.round(totalImages / 1024)}KB`);
        console.log(`  Total: ${Math.round((totalCSS + totalJS + totalImages) / 1024)}KB`);
        
        this.metrics.bundleSizes = { totalCSS, totalJS, totalImages };
        
        // Generate bundle size recommendations
        if (totalCSS > 100000) { // 100KB
            this.recommendations.push({
                type: 'css-splitting',
                message: `CSS bundle is ${Math.round(totalCSS / 1024)}KB. Consider code splitting and critical CSS inlining.`,
                priority: 'medium',
                impact: 'Load time reduction'
            });
        }
        
        if (totalJS > 200000) { // 200KB
            this.recommendations.push({
                type: 'js-splitting',
                message: `JavaScript bundle is ${Math.round(totalJS / 1024)}KB. Implement lazy loading and code splitting.`,
                priority: 'high',
                impact: 'Parse time reduction'
            });
        }
    }

    generateRecommendations() {
        console.log('🎯 Performance Optimization Recommendations:');
        
        // Add general recommendations based on analysis
        this.recommendations.push(
            {
                type: 'critical-css',
                message: 'Inline critical CSS for above-the-fold content to eliminate render-blocking.',
                priority: 'high',
                impact: 'Faster first paint'
            },
            {
                type: 'font-optimization',
                message: 'Use font-display: swap and preload critical fonts.',
                priority: 'medium',
                impact: 'Reduced layout shift'
            },
            {
                type: 'image-optimization',
                message: 'Implement lazy loading and use modern formats (WebP, AVIF).',
                priority: 'medium',
                impact: 'Bandwidth reduction'
            },
            {
                type: 'service-worker',
                message: 'Implement service worker for critical resource caching.',
                priority: 'low',
                impact: 'Repeat visit performance'
            }
        );
        
        // Sort by priority
        const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
        this.recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        
        // Display recommendations
        this.recommendations.forEach((rec, index) => {
            const priority = rec.priority.toUpperCase();
            const icon = rec.priority === 'critical' ? '🚨' : rec.priority === 'high' ? '⚠️' : rec.priority === 'medium' ? '💡' : 'ℹ️';
            console.log(`  ${icon} [${priority}] ${rec.message}`);
            console.log(`    Impact: ${rec.impact}`);
        });
    }

    generateOptimizationPlan() {
        const plan = {
            immediate: this.recommendations.filter(r => r.priority === 'critical' || r.priority === 'high'),
            shortTerm: this.recommendations.filter(r => r.priority === 'medium'),
            longTerm: this.recommendations.filter(r => r.priority === 'low'),
            metrics: this.metrics
        };
        
        console.log('📋 Optimization Implementation Plan:');
        console.log('  Immediate (Critical/High Priority):', plan.immediate.length);
        console.log('  Short-term (Medium Priority):', plan.shortTerm.length);
        console.log('  Long-term (Low Priority):', plan.longTerm.length);
        
        return plan;
    }

    // Utility methods for ongoing monitoring
    startPerformanceMonitoring() {
        setInterval(() => {
            this.measureCurrentPerformance();
        }, 30000); // Check every 30 seconds
    }

    measureCurrentPerformance() {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            console.log('📊 Current Performance Metrics:');
            console.log(`  DNS Lookup: ${Math.round(navigation.domainLookupEnd - navigation.domainLookupStart)}ms`);
            console.log(`  TCP Connect: ${Math.round(navigation.connectEnd - navigation.connectStart)}ms`);
            console.log(`  Request: ${Math.round(navigation.responseStart - navigation.requestStart)}ms`);
            console.log(`  Response: ${Math.round(navigation.responseEnd - navigation.responseStart)}ms`);
            console.log(`  DOM Processing: ${Math.round(navigation.domContentLoadedEventEnd - navigation.responseEnd)}ms`);
            console.log(`  Load Complete: ${Math.round(navigation.loadEventEnd - navigation.loadEventStart)}ms`);
        }
    }

    // Export analysis results
    exportAnalysis() {
        const report = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            metrics: this.metrics,
            recommendations: this.recommendations,
            bundleSizes: this.metrics.bundleSizes,
            coreWebVitals: this.metrics.coreWebVitals
        };
        
        // Create downloadable report
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-analysis-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📁 Performance analysis exported to JSON file');
        return report;
    }
}

// Auto-initialize for development
window.performanceAnalyzer = new PerformanceAnalyzer();

// Make it available globally for manual analysis
window.analyzePerformance = () => {
    return window.performanceAnalyzer.generateOptimizationPlan();
};

window.exportPerformanceReport = () => {
    return window.performanceAnalyzer.exportAnalysis();
};

export { PerformanceAnalyzer };