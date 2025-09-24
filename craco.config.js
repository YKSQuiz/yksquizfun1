const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Production optimizasyonları
      if (env === 'production') {
        // Tree shaking iyileştirmesi
        webpackConfig.optimization.usedExports = true;
        webpackConfig.optimization.sideEffects = false;
        
        // Bundle splitting optimizasyonu - Mobile optimized
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          minSize: 20000,
          maxSize: 200000, // Reduced from 244KB to 200KB for better mobile performance
          cacheGroups: {
            // Firebase - Split into smaller chunks
            firebaseAuth: {
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/].*auth/,
              name: 'firebase-auth',
              chunks: 'all',
              priority: 25,
              enforce: true
            },
            firebaseFirestore: {
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/].*firestore/,
              name: 'firebase-firestore',
              chunks: 'all',
              priority: 24,
              enforce: true
            },
            firebaseCore: {
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/].*app/,
              name: 'firebase-core',
              chunks: 'all',
              priority: 23,
              enforce: true
            },
            firebaseOther: {
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              name: 'firebase-other',
              chunks: 'all',
              priority: 22,
              enforce: true
            },
            // React libraries
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 20,
              enforce: true
            },
            // Large vendor libraries
            vendorLarge: {
              test: /[\\/]node_modules[\\/](recharts|canvas-confetti)[\\/]/,
              name: 'vendors-large',
              chunks: 'all',
              priority: 15,
              enforce: true
            },
            // Regular vendor libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              enforce: true,
              maxSize: 150000 // Limit vendor chunks to 150KB
            },
            // Mobile-specific optimizations
            mobile: {
              test: /[\\/]src[\\/](hooks|utils)[\\/]/,
              name: 'mobile-utils',
              chunks: 'all',
              priority: 8,
              enforce: true
            },
            // Common chunks
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              enforce: true,
              maxSize: 100000 // Limit common chunks to 100KB
            }
          }
        };
        
        // Module concatenation
        webpackConfig.optimization.concatenateModules = true;
        
        // Minification optimizasyonu
        if (webpackConfig.optimization.minimizer) {
          webpackConfig.optimization.minimizer.forEach(plugin => {
            if (plugin.constructor.name === 'TerserPlugin') {
              plugin.options.terserOptions = {
                ...plugin.options.terserOptions,
                compress: {
                  ...plugin.options.terserOptions?.compress,
                  drop_console: true,
                  drop_debugger: true,
                  pure_funcs: ['console.log', 'console.info', 'console.debug'],
                  // Additional mobile optimizations
                  passes: 2,
                  unsafe: true,
                  unsafe_comps: true,
                  unsafe_math: true
                },
                mangle: {
                  ...plugin.options.terserOptions?.mangle,
                  safari10: true,
                  properties: {
                    regex: /^_/
                  }
                }
              };
            }
          });
        }
        
        // CSS optimization with PurgeCSS (disabled for now due to compatibility issues)
        // TODO: Implement proper CSS purging with PostCSS
        // const PurgeCSSPlugin = require('@fullhuman/postcss-purgecss');
        // webpackConfig.plugins.push(
        //   new PurgeCSSPlugin({
        //     paths: [
        //       path.join(__dirname, 'src/**/*.{js,jsx,ts,tsx}'),
        //       path.join(__dirname, 'public/index.html')
        //     ],
        //     defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
        //     safelist: [
        //       // Keep dynamic classes
        //       /^bg-/,
        //       /^text-/,
        //       /^border-/,
        //       /^hover:/,
        //       /^focus:/,
        //       /^active:/,
        //       /^disabled:/,
        //       // Keep animation classes
        //       /^animate-/,
        //       /^transition-/,
        //       // Keep utility classes that might be generated dynamically
        //       /^w-/,
        //       /^h-/,
        //       /^p-/,
        //       /^m-/,
        //       /^flex/,
        //       /^grid/,
        //       /^hidden/,
        //       /^block/,
        //       /^inline/
        //     ],
        //     variables: true
        //   })
        // );
      }
      
      // Development optimizasyonları
      if (env === 'development') {
        // Faster builds
        webpackConfig.optimization.removeAvailableModules = false;
        webpackConfig.optimization.removeEmptyChunks = false;
        webpackConfig.optimization.splitChunks = false;
      }
      
      // Resolve optimizasyonları
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@types': path.resolve(__dirname, 'src/types')
      };
      
      // Module resolution optimizasyonu
      webpackConfig.resolve.modules = [
        path.resolve(__dirname, 'src'),
        'node_modules'
      ];
      
      // Extension resolution
      webpackConfig.resolve.extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
      
      return webpackConfig;
    }
  },
  
  // Babel optimizasyonları
  babel: {
    plugins: [
      // Production optimizasyonları
      ...(process.env.NODE_ENV === 'production' ? [
        // Console.log'ları kaldır (TerserPlugin zaten bunu yapıyor)
      ] : [])
    ]
  },
  
  // Dev server optimizasyonları
  devServer: {
    compress: true,
    hot: true,
    historyApiFallback: true,
    client: {
      overlay: {
        errors: true,
        warnings: false
      }
    }
  }
};
