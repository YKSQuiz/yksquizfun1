import { useCallback, useRef, useEffect } from 'react';

interface TouchOptimizationOptions {
  preventDefault?: boolean;
  passive?: boolean;
  debounceMs?: number;
}

/**
 * Mobil touch event optimizasyonu için hook
 * Touch event'lerini optimize eder ve performansı artırır
 */
export const useTouchOptimization = (options: TouchOptimizationOptions = {}) => {
  const {
    preventDefault = false,
    passive = true,
    debounceMs = 16 // 60fps için ~16ms
  } = options;

  const touchStartTime = useRef<number>(0);
  const touchStartPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchTime = useRef<number>(0);
  const isScrolling = useRef<boolean>(false);

  // Touch start handler
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const now = Date.now();
    
    // Debounce touch events
    if (now - lastTouchTime.current < debounceMs) {
      if (preventDefault) {
        e.preventDefault();
      }
      return;
    }
    
    lastTouchTime.current = now;
    touchStartTime.current = now;
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartPosition.current = { x: touch.clientX, y: touch.clientY };
      isScrolling.current = false;
    }
    
    if (preventDefault) {
      e.preventDefault();
    }
  }, [preventDefault, debounceMs]);

  // Touch move handler
  const handleTouchMove = useCallback((e: TouchEvent) => {
    const now = Date.now();
    
    // Debounce touch events
    if (now - lastTouchTime.current < debounceMs) {
      if (preventDefault) {
        e.preventDefault();
      }
      return;
    }
    
    lastTouchTime.current = now;
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPosition.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPosition.current.y);
      
      // Determine if user is scrolling
      if (deltaX > 10 || deltaY > 10) {
        isScrolling.current = true;
      }
    }
    
    if (preventDefault) {
      e.preventDefault();
    }
  }, [preventDefault, debounceMs]);

  // Touch end handler
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const now = Date.now();
    const touchDuration = now - touchStartTime.current;
    
    // Debounce touch events
    if (now - lastTouchTime.current < debounceMs) {
      if (preventDefault) {
        e.preventDefault();
      }
      return;
    }
    
    lastTouchTime.current = now;
    
    // Only trigger click if it wasn't a scroll and was a quick tap
    if (!isScrolling.current && touchDuration < 300) {
      // This is a tap, not a scroll
      const touch = e.changedTouches[0];
      if (touch) {
        const deltaX = Math.abs(touch.clientX - touchStartPosition.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartPosition.current.y);
        
        if (deltaX < 10 && deltaY < 10) {
          // Create a synthetic click event
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: touch.clientX,
            clientY: touch.clientY
          });
          
          // Dispatch to the target element
          if (e.target) {
            (e.target as Element).dispatchEvent(clickEvent);
          }
        }
      }
    }
    
    isScrolling.current = false;
    
    if (preventDefault) {
      e.preventDefault();
    }
  }, [preventDefault, debounceMs]);

  // Apply touch optimizations to element
  const applyTouchOptimizations = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    const options = { passive, capture: false };
    
    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, passive]);

  // CSS optimizations for touch
  const getTouchOptimizedStyles = useCallback(() => ({
    touchAction: preventDefault ? 'none' : 'manipulation',
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    willChange: 'transform',
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden'
  }), [preventDefault]);

  return {
    applyTouchOptimizations,
    getTouchOptimizedStyles,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};

/**
 * Mobil scroll optimizasyonu
 */
export const useScrollOptimization = () => {
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const isScrolling = useRef<boolean>(false);

  const handleScroll = useCallback((callback: () => void) => {
    if (!isScrolling.current) {
      isScrolling.current = true;
      callback();
    }

    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    scrollTimeout.current = setTimeout(() => {
      isScrolling.current = false;
    }, 150);
  }, []);

  const getScrollOptimizedStyles = useCallback(() => ({
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    scrollBehavior: 'smooth'
  }), []);

  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  return {
    handleScroll,
    getScrollOptimizedStyles
  };
};

/**
 * Mobil performans için viewport optimizasyonu
 */
export const useViewportOptimization = () => {
  useEffect(() => {
    // Viewport meta tag optimizasyonu
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }

    // Prevent zoom on input focus (iOS)
    const preventZoom = (e: Event) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
          );
        }
      }
    };

    const restoreZoom = (e: Event) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
          );
        }
      }
    };

    document.addEventListener('focusin', preventZoom, { passive: true });
    document.addEventListener('focusout', restoreZoom, { passive: true });

    return () => {
      document.removeEventListener('focusin', preventZoom);
      document.removeEventListener('focusout', restoreZoom);
    };
  }, []);
};
