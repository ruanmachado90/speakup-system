import { useEffect } from 'react';

/**
 * Performance Monitor Component
 * Monitora e reporta métricas de performance da aplicação
 * Ativa apenas em desenvolvimento
 */

const PerformanceMonitor = () => {
  useEffect(() => {
    // Apenas em desenvolvimento
    if (import.meta.env.MODE !== 'development') return;

    // Web Vitals monitoring
    const reportWebVitals = () => {
      if ('performance' in window && 'PerformanceObserver' in window) {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log('📊 LCP (Largest Contentful Paint):', lastEntry.renderTime || lastEntry.loadTime, 'ms');
        });
        try {
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {
          console.warn('LCP monitoring not supported');
        }

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            console.log('📊 FID (First Input Delay):', entry.processingStart - entry.startTime, 'ms');
          });
        });
        try {
          fidObserver.observe({ type: 'first-input', buffered: true });
        } catch (e) {
          console.warn('FID monitoring not supported');
        }

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          console.log('📊 CLS (Cumulative Layout Shift):', clsValue);
        });
        try {
          clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {
          console.warn('CLS monitoring not supported');
        }

        // First Contentful Paint (FCP)
        const navigationTiming = performance.getEntriesByType('navigation')[0];
        if (navigationTiming) {
          console.log('📊 Navigation Timing:', {
            'DNS Lookup': navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart,
            'TCP Connection': navigationTiming.connectEnd - navigationTiming.connectStart,
            'Request Time': navigationTiming.responseStart - navigationTiming.requestStart,
            'Response Time': navigationTiming.responseEnd - navigationTiming.responseStart,
            'DOM Processing': navigationTiming.domComplete - navigationTiming.domLoading,
            'Total Load Time': navigationTiming.loadEventEnd - navigationTiming.fetchStart,
          });
        }

        // Paint Timing
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach((entry) => {
          console.log(`📊 ${entry.name}:`, entry.startTime, 'ms');
        });

        // Resource Timing Summary
        const resources = performance.getEntriesByType('resource');
        const resourceSummary = {
          scripts: resources.filter(r => r.name.includes('.js')).length,
          styles: resources.filter(r => r.name.includes('.css')).length,
          images: resources.filter(r => /\.(jpg|jpeg|png|gif|svg|webp)/.test(r.name)).length,
          totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
        };
        console.log('📦 Resources Loaded:', resourceSummary);
        console.log('📦 Total Transfer Size:', (resourceSummary.totalSize / 1024 / 1024).toFixed(2), 'MB');
      }
    };

    // Report metrics after page load
    if (document.readyState === 'complete') {
      reportWebVitals();
    } else {
      window.addEventListener('load', reportWebVitals);
      return () => window.removeEventListener('load', reportWebVitals);
    }
  }, []);

  // Monitor React re-renders in development
  useEffect(() => {
    if (import.meta.env.MODE !== 'development') return;

    let renderCount = 0;
    const startTime = Date.now();

    const interval = setInterval(() => {
      renderCount++;
      if (renderCount % 10 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`🔄 App re-renders: ${renderCount} (${elapsed}s elapsed)`);
      }
    }, 0);

    return () => clearInterval(interval);
  }, []);

  // Bundle size warning
  useEffect(() => {
    if (import.meta.env.MODE !== 'development') return;

    console.log(`
    ╔════════════════════════════════════════════════════╗
    ║     🚀 Performance Monitor Active                  ║
    ╠════════════════════════════════════════════════════╣
    ║  Mode: ${import.meta.env.MODE.padEnd(43)}║
    ║  Monitoring: Web Vitals, Re-renders, Resources    ║
    ║                                                    ║
    ║  💡 Tips:                                          ║
    ║  • Use React DevTools Profiler for re-renders    ║
    ║  • Check Network tab for bundle sizes            ║
    ║  • LCP should be < 2.5s (good)                   ║
    ║  • FID should be < 100ms (good)                  ║
    ║  • CLS should be < 0.1 (good)                    ║
    ╚════════════════════════════════════════════════════╝
    `);
  }, []);

  return null; // Este é um componente sem UI
};

export default PerformanceMonitor;
