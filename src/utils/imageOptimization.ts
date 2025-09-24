/**
 * Image Optimization Utilities
 * Provides lazy loading, responsive images, and performance optimizations
 */

export interface ImageOptimizationOptions {
  lazy?: boolean;
  placeholder?: string;
  sizes?: string;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
}

export class ImageOptimizer {
  private static instance: ImageOptimizer;
  private observer: IntersectionObserver | null = null;
  private loadedImages = new Set<string>();

  private constructor() {
    this.initIntersectionObserver();
  }

  static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer();
    }
    return ImageOptimizer.instance;
  }

  private initIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              this.loadImage(img);
              this.observer?.unobserve(img);
            }
          });
        },
        {
          rootMargin: '50px 0px', // Start loading 50px before image comes into view
          threshold: 0.1
        }
      );
    }
  }

  private loadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    if (!src || this.loadedImages.has(src)) return;

    // Create a new image to preload
    const imageLoader = new Image();
    
    imageLoader.onload = () => {
      img.src = src;
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-loaded');
      this.loadedImages.add(src);
    };

    imageLoader.onerror = () => {
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-error');
      // Fallback to placeholder or original src
      if (img.dataset.placeholder) {
        img.src = img.dataset.placeholder;
      }
    };

    imageLoader.src = src;
  }

  /**
   * Optimize image source based on device capabilities
   */
  getOptimizedImageSrc(
    originalSrc: string, 
    options: ImageOptimizationOptions = {}
  ): string {
    const { quality = 80, format } = options;
    
    // Check for WebP support
    const supportsWebP = this.supportsWebP();
    const supportsAVIF = this.supportsAVIF();
    
    // Determine best format
    let optimizedFormat = format;
    if (!optimizedFormat) {
      if (supportsAVIF) {
        optimizedFormat = 'avif';
      } else if (supportsWebP) {
        optimizedFormat = 'webp';
      } else {
        optimizedFormat = 'jpeg';
      }
    }

    // For now, return original src as we don't have image processing service
    // In production, you would integrate with a service like Cloudinary, ImageKit, etc.
    return originalSrc;
  }

  /**
   * Create a responsive image element with lazy loading
   */
  createOptimizedImage(
    src: string,
    alt: string,
    options: ImageOptimizationOptions = {}
  ): HTMLImageElement {
    const { lazy = true, placeholder, sizes } = options;
    
    const img = document.createElement('img');
    img.alt = alt;
    img.sizes = sizes || '100vw';
    
    if (lazy && this.observer) {
      // Lazy loading setup
      img.dataset.src = this.getOptimizedImageSrc(src, options);
      img.src = placeholder || this.createPlaceholder();
      img.classList.add('lazy-loading');
      
      // Add loading styles
      img.style.filter = 'blur(5px)';
      img.style.transition = 'filter 0.3s ease';
      
      this.observer.observe(img);
    } else {
      // Immediate loading
      img.src = this.getOptimizedImageSrc(src, options);
    }
    
    return img;
  }

  /**
   * Create a simple placeholder image
   */
  private createPlaceholder(): string {
    // Create a 1x1 transparent pixel as placeholder
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmM2YzZjMiLz48L3N2Zz4=';
  }

  /**
   * Check WebP support
   */
  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Check AVIF support
   */
  private supportsAVIF(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  }

  /**
   * Preload critical images
   */
  preloadImages(urls: string[]): Promise<void[]> {
    return Promise.all(
      urls.map(url => 
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
          img.src = url;
        })
      )
    );
  }

  /**
   * Get device pixel ratio for responsive images
   */
  getDevicePixelRatio(): number {
    return window.devicePixelRatio || 1;
  }

  /**
   * Generate responsive image sizes
   */
  generateResponsiveSizes(baseWidth: number): string {
    const ratios = [1, 1.5, 2, 3];
    const sizes = ratios.map(ratio => 
      `${Math.round(baseWidth * ratio)}w`
    ).join(', ');
    
    return sizes;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.loadedImages.clear();
  }
}

// React Hook for image optimization
export const useImageOptimization = () => {
  const optimizer = ImageOptimizer.getInstance();

  const optimizeImage = (src: string, options?: ImageOptimizationOptions) => {
    return optimizer.getOptimizedImageSrc(src, options);
  };

  const preloadImages = (urls: string[]) => {
    return optimizer.preloadImages(urls);
  };

  const getResponsiveSizes = (baseWidth: number) => {
    return optimizer.generateResponsiveSizes(baseWidth);
  };

  return {
    optimizeImage,
    preloadImages,
    getResponsiveSizes,
    getDevicePixelRatio: () => optimizer.getDevicePixelRatio()
  };
};

// CSS for lazy loading
export const lazyLoadingCSS = `
  .lazy-loading {
    filter: blur(5px);
    transition: filter 0.3s ease;
  }
  
  .lazy-loaded {
    filter: none;
  }
  
  .lazy-error {
    background-color: #f3f3f3;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    font-size: 14px;
  }
`;
