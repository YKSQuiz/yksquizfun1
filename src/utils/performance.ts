// Enhanced Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];
  private isEnabled: boolean = true;
  private reportInterval: number = 30000; // 30 seconds
  private reportTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.initObservers();
    this.startPeriodicReporting();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initObservers() {
    // Mobile detection for performance monitoring
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Disable heavy performance monitoring on mobile for better performance
    if (isMobile && process.env.NODE_ENV === 'production') {
      console.log('Performance monitoring disabled on mobile for optimization');
      this.isEnabled = false;
      return;
    }

    // Check if user prefers reduced motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      console.log('Performance monitoring reduced due to user preference');
      this.isEnabled = false;
      return;
    }
    
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('navigation', navEntry.loadEventEnd - navEntry.loadEventStart);
          }
        }
      });
      
      try {
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (e) {
        console.warn('Navigation timing not supported');
      }

      // Observe paint timing - only on desktop
      if (!isMobile) {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'paint') {
              this.recordMetric('paint', entry.startTime);
            }
          }
        });
        
        try {
          paintObserver.observe({ entryTypes: ['paint'] });
          this.observers.push(paintObserver);
        } catch (e) {
          console.warn('Paint timing not supported');
        }
      }
    }
  }

  recordMetric(name: string, value: number) {
    if (!this.isEnabled) return;
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    
    // Keep only last 100 measurements to prevent memory leaks
    const values = this.metrics.get(name)!;
    if (values.length > 100) {
      values.splice(0, values.length - 100);
    }
  }

  getAverageMetric(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getMetrics(): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    this.metrics.forEach((values, key) => {
      result[key] = [...values];
    });
    return result;
  }

  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    });
  }

  measureSync<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    }
  }

  reportMetrics() {
    const metrics = this.getMetrics();
    console.log('Performance Metrics:', metrics);
    
    // Send to analytics if available
    if (process.env.NODE_ENV === 'production') {
      // Send to analytics service
      this.sendToAnalytics(metrics);
    }
  }

  private sendToAnalytics(metrics: Record<string, number[]>) {
    // Implementation for sending metrics to analytics service
    // This could be Google Analytics, Firebase Analytics, etc.
    try {
      // Example: Send to Firebase Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        Object.entries(metrics).forEach(([name, values]) => {
          const average = values.reduce((sum, val) => sum + val, 0) / values.length;
          (window as any).gtag('event', 'performance_metric', {
            metric_name: name,
            metric_value: average,
            metric_count: values.length
          });
        });
      }
    } catch (e) {
      console.warn('Failed to send metrics to analytics:', e);
    }
  }

  private startPeriodicReporting() {
    if (!this.isEnabled) return;
    
    this.reportTimer = setInterval(() => {
      this.reportMetrics();
    }, this.reportInterval);
  }

  private stopPeriodicReporting() {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
  }

  // Enhanced metrics collection
  collectWebVitals() {
    if (!this.isEnabled) return;

    // Collect Core Web Vitals
    this.collectLCP();
    this.collectFID();
    this.collectCLS();
  }

  private collectLCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('lcp', lastEntry.startTime);
      });
      
      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('LCP not supported');
      }
    }
  }

  private collectFID() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as PerformanceEventTiming;
          this.recordMetric('fid', fidEntry.processingStart - fidEntry.startTime);
        }
      });
      
      try {
        observer.observe({ entryTypes: ['first-input'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('FID not supported');
      }
    }
  }

  private collectCLS() {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.recordMetric('cls', clsValue);
      });
      
      try {
        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('CLS not supported');
      }
    }
  }

  // Performance budget monitoring
  checkPerformanceBudget() {
    const budgets = {
      lcp: 2500, // 2.5 seconds
      fid: 100,  // 100ms
      cls: 0.1   // 0.1
    };

    const violations = [];
    
    for (const [metric, threshold] of Object.entries(budgets)) {
      const average = this.getAverageMetric(metric);
      if (average > threshold) {
        violations.push({
          metric,
          value: average,
          threshold,
          severity: average > threshold * 1.5 ? 'critical' : 'warning'
        });
      }
    }

    if (violations.length > 0) {
      console.warn('Performance budget violations:', violations);
      this.sendPerformanceAlert(violations);
    }

    return violations;
  }

  private sendPerformanceAlert(violations: any[]) {
    // Send to analytics or monitoring service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      violations.forEach(violation => {
        (window as any).gtag('event', 'performance_budget_violation', {
          metric: violation.metric,
          value: violation.value,
          threshold: violation.threshold,
          severity: violation.severity
        });
      });
    }
  }

  destroy() {
    this.stopPeriodicReporting();
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// React Hook for performance monitoring
export const usePerformanceMonitor = () => {
  const monitor = PerformanceMonitor.getInstance();

  const measureAsync = (name: string, fn: () => Promise<any>) => {
    return monitor.measureAsync(name, fn);
  };

  const measureSync = (name: string, fn: () => any) => {
    return monitor.measureSync(name, fn);
  };

  const recordMetric = (name: string, value: number) => {
    monitor.recordMetric(name, value);
  };

  const collectWebVitals = () => {
    monitor.collectWebVitals();
  };

  const checkPerformanceBudget = () => {
    return monitor.checkPerformanceBudget();
  };

  return {
    measureAsync,
    measureSync,
    recordMetric,
    collectWebVitals,
    checkPerformanceBudget,
    getMetrics: () => monitor.getMetrics(),
    reportMetrics: () => monitor.reportMetrics()
  };
};

// Web Vitals monitoring - Disabled for mobile optimization
export const reportWebVitals = (onPerfEntry: (metric: any) => void) => {
  // Disabled to reduce bundle size
  console.log('Web Vitals disabled for mobile optimization');
};

// Memory usage monitoring
export const getMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    };
  }
  return null;
};

// Network monitoring
export const getNetworkInfo = () => {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    };
  }
  return null;
};
