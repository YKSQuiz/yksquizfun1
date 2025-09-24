#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Bundle Analyzer for Mobile Optimization
 * Analyzes the build output and provides optimization recommendations
 */

const BUILD_DIR = path.join(__dirname, '../../build');
const STATIC_DIR = path.join(BUILD_DIR, 'static');

function analyzeBundle() {
  console.log('🔍 Analyzing bundle for mobile optimization...\n');

  // Check if build directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ Build directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Analyze static files
  const staticFiles = analyzeStaticFiles();
  
  // Analyze JavaScript bundle
  const jsBundle = analyzeJSBundle();
  
  // Generate recommendations
  const recommendations = generateRecommendations(staticFiles, jsBundle);
  
  // Print report
  printReport(staticFiles, jsBundle, recommendations);
}

function analyzeStaticFiles() {
  const files = [];
  
  if (fs.existsSync(STATIC_DIR)) {
    const jsDir = path.join(STATIC_DIR, 'js');
    const cssDir = path.join(STATIC_DIR, 'css');
    
    // Analyze JS files
    if (fs.existsSync(jsDir)) {
      const jsFiles = fs.readdirSync(jsDir);
      jsFiles.forEach(file => {
        const filePath = path.join(jsDir, file);
        const stats = fs.statSync(filePath);
        files.push({
          name: file,
          size: stats.size,
          sizeKB: Math.round(stats.size / 1024),
          type: 'js',
          path: filePath
        });
      });
    }
    
    // Analyze CSS files
    if (fs.existsSync(cssDir)) {
      const cssFiles = fs.readdirSync(cssDir);
      cssFiles.forEach(file => {
        const filePath = path.join(cssDir, file);
        const stats = fs.statSync(filePath);
        files.push({
          name: file,
          size: stats.size,
          sizeKB: Math.round(stats.size / 1024),
          type: 'css',
          path: filePath
        });
      });
    }
  }
  
  return files;
}

function analyzeJSBundle() {
  const jsFiles = analyzeStaticFiles().filter(f => f.type === 'js');
  const mainBundle = jsFiles.find(f => f.name.includes('main'));
  
  if (!mainBundle) {
    return { size: 0, sizeKB: 0, optimized: false };
  }
  
  const sizeKB = mainBundle.sizeKB;
  const optimized = sizeKB < 500; // Target: under 500KB for mobile
  
  return {
    size: mainBundle.size,
    sizeKB: sizeKB,
    optimized: optimized,
    fileName: mainBundle.name
  };
}

function generateRecommendations(staticFiles, jsBundle) {
  const recommendations = [];
  
  // Bundle size recommendations
  if (jsBundle.sizeKB > 500) {
    recommendations.push({
      type: 'warning',
      message: `Bundle size is ${jsBundle.sizeKB}KB - consider code splitting`,
      action: 'Implement lazy loading for heavy components'
    });
  }
  
  if (jsBundle.sizeKB > 1000) {
    recommendations.push({
      type: 'critical',
      message: `Bundle size is ${jsBundle.sizeKB}KB - too large for mobile`,
      action: 'Remove unused dependencies and implement tree shaking'
    });
  }
  
  // CSS optimization
  const cssFiles = staticFiles.filter(f => f.type === 'css');
  const totalCSSSize = cssFiles.reduce((sum, f) => sum + f.sizeKB, 0);
  
  if (totalCSSSize > 100) {
    recommendations.push({
      type: 'warning',
      message: `CSS size is ${totalCSSSize}KB - consider purging unused styles`,
      action: 'Use CSS purging or remove unused styles'
    });
  }
  
  // General mobile optimizations
  recommendations.push({
    type: 'info',
    message: 'Mobile optimization checklist',
    action: 'Ensure all optimizations from MOBILE_PERFORMANCE_OPTIMIZATION.md are applied'
  });
  
  return recommendations;
}

function printReport(staticFiles, jsBundle, recommendations) {
  console.log('📊 Bundle Analysis Report\n');
  
  // Static files summary
  console.log('📁 Static Files:');
  staticFiles.forEach(file => {
    const icon = file.type === 'js' ? '📜' : '🎨';
    console.log(`  ${icon} ${file.name}: ${file.sizeKB}KB`);
  });
  
  console.log('\n📦 JavaScript Bundle:');
  const status = jsBundle.optimized ? '✅' : '⚠️';
  console.log(`  ${status} Main bundle: ${jsBundle.sizeKB}KB (${jsBundle.fileName})`);
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  recommendations.forEach(rec => {
    const icon = rec.type === 'critical' ? '🚨' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`  ${icon} ${rec.message}`);
    console.log(`     → ${rec.action}`);
  });
  
  // Mobile performance score
  const score = calculateMobileScore(jsBundle, staticFiles);
  console.log(`\n📱 Mobile Performance Score: ${score}/100`);
  
  if (score >= 80) {
    console.log('✅ Excellent mobile performance!');
  } else if (score >= 60) {
    console.log('⚠️  Good performance, but room for improvement');
  } else {
    console.log('🚨 Performance needs optimization for mobile');
  }
}

function calculateMobileScore(jsBundle, staticFiles) {
  let score = 100;
  
  // Bundle size penalty
  if (jsBundle.sizeKB > 1000) score -= 40;
  else if (jsBundle.sizeKB > 500) score -= 20;
  else if (jsBundle.sizeKB > 300) score -= 10;
  
  // CSS size penalty
  const cssSize = staticFiles.filter(f => f.type === 'css').reduce((sum, f) => sum + f.sizeKB, 0);
  if (cssSize > 100) score -= 20;
  else if (cssSize > 50) score -= 10;
  
  return Math.max(0, score);
}

// Run analysis
if (require.main === module) {
  analyzeBundle();
}

module.exports = { analyzeBundle }; 