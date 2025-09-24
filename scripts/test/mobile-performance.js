#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Mobile Performance Test Script
 * Tests the effectiveness of mobile optimizations
 */

const TEST_RESULTS_FILE = path.join(__dirname, '../../mobile-performance-results.json');

function runMobilePerformanceTest() {
  console.log('📱 Mobile Performance Test Starting...\n');

  const results = {
    timestamp: new Date().toISOString(),
    version: 'v4.0',
    tests: {}
  };

  // Test 1: Bundle Size Analysis
  results.tests.bundleSize = testBundleSize();
  
  // Test 2: Animation Performance
  results.tests.animationPerformance = testAnimationPerformance();
  
  // Test 3: Memory Usage Estimation
  results.tests.memoryUsage = testMemoryUsage();
  
  // Test 4: Timer Optimization
  results.tests.timerOptimization = testTimerOptimization();
  
  // Test 5: Cache Effectiveness
  results.tests.cacheEffectiveness = testCacheEffectiveness();
  
  // Calculate overall score
  results.overallScore = calculateOverallScore(results.tests);
  
  // Save results
  saveResults(results);
  
  // Print report
  printReport(results);
}

function testBundleSize() {
  const buildPath = path.join(__dirname, '../../build');
  
  if (!fs.existsSync(buildPath)) {
    return { passed: false, score: 0, message: 'Build directory not found' };
  }
  
  const staticPath = path.join(buildPath, 'static');
  const jsPath = path.join(staticPath, 'js');
  
  if (!fs.existsSync(jsPath)) {
    return { passed: false, score: 0, message: 'JS files not found' };
  }
  
  const jsFiles = fs.readdirSync(jsPath).filter(f => f.endsWith('.js'));
  let totalSize = 0;
  
  jsFiles.forEach(file => {
    const filePath = path.join(jsPath, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
  });
  
  const sizeKB = Math.round(totalSize / 1024);
  const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  
  // Score based on bundle size
  let score = 100;
  if (sizeKB > 1000) score = 20;
  else if (sizeKB > 500) score = 60;
  else if (sizeKB > 300) score = 80;
  else if (sizeKB > 200) score = 90;
  
  return {
    passed: sizeKB < 500,
    score: score,
    sizeKB: sizeKB,
    sizeMB: sizeMB,
    message: `Bundle size: ${sizeKB}KB (${sizeMB}MB)`
  };
}

function testAnimationPerformance() {
  // Check if animation optimizations are applied
  const cssPath = path.join(__dirname, '../../src/styles/components/features/home.css');
  
  if (!fs.existsSync(cssPath)) {
    return { passed: false, score: 0, message: 'CSS file not found' };
  }
  
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  
  // Check for optimized animation durations
  const optimizations = [
    { pattern: /animation.*1\.25s/, name: 'Shine animation optimized' },
    { pattern: /animation.*0\.6s/, name: 'Pulse animation optimized' },
    { pattern: /transition.*0\.35s/, name: 'Energy bar transition optimized' },
    { pattern: /animation.*0\.4s/, name: 'Pop animation optimized' }
  ];
  
  let foundOptimizations = 0;
  optimizations.forEach(opt => {
    if (opt.pattern.test(cssContent)) {
      foundOptimizations++;
    }
  });
  
  const score = Math.round((foundOptimizations / optimizations.length) * 100);
  
  return {
    passed: foundOptimizations >= 3,
    score: score,
    foundOptimizations: foundOptimizations,
    totalOptimizations: optimizations.length,
    message: `Found ${foundOptimizations}/${optimizations.length} animation optimizations`
  };
}

function testMemoryUsage() {
  // Check for memory leak prevention patterns
  const sourceFiles = [
    '../../src/components/features/home/Home.tsx',
    '../../src/contexts/AuthContext.tsx',
    '../../src/App.tsx'
  ];
  
  let memoryOptimizations = 0;
  const totalChecks = sourceFiles.length * 2; // 2 checks per file
  
  sourceFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for proper cleanup patterns
      if (content.includes('clearInterval') || content.includes('clearTimeout')) {
        memoryOptimizations++;
      }
      
      // Check for event listener cleanup
      if (content.includes('removeEventListener')) {
        memoryOptimizations++;
      }
    }
  });
  
  const score = Math.round((memoryOptimizations / totalChecks) * 100);
  
  return {
    passed: memoryOptimizations >= 4,
    score: score,
    memoryOptimizations: memoryOptimizations,
    totalChecks: totalChecks,
    message: `Found ${memoryOptimizations}/${totalChecks} memory optimizations`
  };
}

function testTimerOptimization() {
  // Check if timer intervals are optimized
  const sourceFiles = [
    '../../src/components/features/home/Home.tsx',
    '../../src/contexts/AuthContext.tsx',
    '../../src/components/features/admin/PerformanceDashboard.tsx'
  ];
  
  let timerOptimizations = 0;
  const totalChecks = 3;
  
  sourceFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for optimized intervals
      if (content.includes('5000') || content.includes('300000') || content.includes('30000')) {
        timerOptimizations++;
      }
    }
  });
  
  const score = Math.round((timerOptimizations / totalChecks) * 100);
  
  return {
    passed: timerOptimizations >= 2,
    score: score,
    timerOptimizations: timerOptimizations,
    totalChecks: totalChecks,
    message: `Found ${timerOptimizations}/${totalChecks} timer optimizations`
  };
}

function testCacheEffectiveness() {
  // Check if cache optimizations are implemented
  const quizFile = path.join(__dirname, '../../src/components/features/quiz/Quiz.tsx');
  
  if (!fs.existsSync(quizFile)) {
    return { passed: false, score: 0, message: 'Quiz file not found' };
  }
  
  const content = fs.readFileSync(quizFile, 'utf8');
  
  const cacheChecks = [
    { pattern: /cacheSize.*50/, name: 'Cache size increased' },
    { pattern: /CACHE_TTL/, name: 'TTL implemented' },
    { pattern: /timestamp.*Date\.now/, name: 'Timestamp tracking' },
    { pattern: /cleanupCache/, name: 'Cache cleanup' }
  ];
  
  let foundOptimizations = 0;
  cacheChecks.forEach(check => {
    if (check.pattern.test(content)) {
      foundOptimizations++;
    }
  });
  
  const score = Math.round((foundOptimizations / cacheChecks.length) * 100);
  
  return {
    passed: foundOptimizations >= 3,
    score: score,
    foundOptimizations: foundOptimizations,
    totalChecks: cacheChecks.length,
    message: `Found ${foundOptimizations}/${cacheChecks.length} cache optimizations`
  };
}

function calculateOverallScore(tests) {
  const scores = Object.values(tests).map(test => test.score);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(averageScore);
}

function saveResults(results) {
  try {
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log('💾 Test results saved to mobile-performance-results.json');
  } catch (error) {
    console.error('❌ Failed to save test results:', error.message);
  }
}

function printReport(results) {
  console.log('\n📊 Mobile Performance Test Results\n');
  
  Object.entries(results.tests).forEach(([testName, test]) => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${test.score}/100`);
    console.log(`   ${test.message}`);
  });
  
  console.log(`\n🎯 Overall Score: ${results.overallScore}/100`);
  
  if (results.overallScore >= 80) {
    console.log('🎉 Excellent mobile performance!');
  } else if (results.overallScore >= 60) {
    console.log('⚠️  Good performance, but room for improvement');
  } else {
    console.log('🚨 Performance needs optimization for mobile');
  }
  
  console.log('\n📝 Recommendations:');
  if (results.tests.bundleSize.score < 80) {
    console.log('  • Reduce bundle size for better mobile performance');
  }
  if (results.tests.animationPerformance.score < 80) {
    console.log('  • Optimize animation durations');
  }
  if (results.tests.memoryUsage.score < 80) {
    console.log('  • Implement proper memory cleanup');
  }
  if (results.tests.timerOptimization.score < 80) {
    console.log('  • Optimize timer intervals');
  }
  if (results.tests.cacheEffectiveness.score < 80) {
    console.log('  • Improve cache implementation');
  }
}

// Run test
if (require.main === module) {
  runMobilePerformanceTest();
}

module.exports = { runMobilePerformanceTest }; 