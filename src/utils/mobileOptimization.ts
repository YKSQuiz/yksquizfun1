// Mobil performans optimizasyonu utilities

/**
 * GPU acceleration için CSS transform optimizasyonu
 */
export const getGPUAcceleratedStyles = () => ({
  willChange: 'transform',
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
  perspective: '1000px'
});

/**
 * Mobil için optimize edilmiş animasyon CSS'i
 */
export const getMobileAnimationStyles = () => ({
  // GPU acceleration
  ...getGPUAcceleratedStyles(),
  
  // Touch optimizasyonu
  touchAction: 'manipulation',
  WebkitTouchCallout: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
  
  // Scroll optimizasyonu
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain'
});

/**
 * Mobil cihaz tespiti
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Mobil performans için debounce
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Mobil için throttle
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Memory leak önleme için cleanup
 */
export const createCleanupManager = () => {
  const cleanupFunctions: (() => void)[] = [];
  
  return {
    add: (fn: () => void) => cleanupFunctions.push(fn),
    cleanup: () => {
      cleanupFunctions.forEach(fn => {
        try {
          fn();
        } catch (error) {
          console.warn('Cleanup error:', error);
        }
      });
      cleanupFunctions.length = 0;
    }
  };
};
