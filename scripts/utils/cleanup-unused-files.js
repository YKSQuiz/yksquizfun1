#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Kullanılmayan dosyaları tespit eder ve temizler
 */

function findUnusedFiles() {
  console.log('🔍 Kullanılmayan dosyalar tespit ediliyor...\n');

  const srcPath = path.join(__dirname, '../../src');
  const publicPath = path.join(__dirname, '../../public');
  
  // Kullanılan dosyaları takip et
  const usedFiles = new Set();
  const allFiles = [];
  
  // Tüm dosyaları tara
  function scanDirectory(dir, basePath = '') {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const relativePath = path.join(basePath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath, relativePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
        allFiles.push(relativePath);
      }
    });
  }
  
  scanDirectory(srcPath, 'src');
  
  // Import'ları analiz et
  function analyzeImports(filePath) {
    try {
      const content = fs.readFileSync(path.join(__dirname, '../../', filePath), 'utf8');
      
      // Import statement'larını bul
      const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
      const dynamicImportRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
      const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
      
      let match;
      
      // Static imports
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          // Relative import
          const resolvedPath = resolveImportPath(filePath, importPath);
          if (resolvedPath) {
            usedFiles.add(resolvedPath);
          }
        }
      }
      
      // Dynamic imports
      while ((match = dynamicImportRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          const resolvedPath = resolveImportPath(filePath, importPath);
          if (resolvedPath) {
            usedFiles.add(resolvedPath);
          }
        }
      }
      
      // Require statements
      while ((match = requireRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          const resolvedPath = resolveImportPath(filePath, importPath);
          if (resolvedPath) {
            usedFiles.add(resolvedPath);
          }
        }
      }
      
    } catch (error) {
      console.warn(`Dosya analiz edilemedi: ${filePath}`, error.message);
    }
  }
  
  // Import path'ini resolve et
  function resolveImportPath(fromFile, importPath) {
    const fromDir = path.dirname(fromFile);
    const resolvedPath = path.resolve(fromDir, importPath);
    
    // Farklı uzantıları dene
    const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];
    
    for (const ext of extensions) {
      const fullPath = resolvedPath + ext;
      if (fs.existsSync(path.join(__dirname, '../../', fullPath))) {
        return fullPath;
      }
    }
    
    return null;
  }
  
  // Tüm dosyaları analiz et
  allFiles.forEach(file => {
    usedFiles.add(file); // Dosya kendisi kullanılıyor
    analyzeImports(file);
  });
  
  // Kullanılmayan dosyaları bul
  const unusedFiles = allFiles.filter(file => !usedFiles.has(file));
  
  console.log(`📊 Analiz Sonuçları:`);
  console.log(`  📁 Toplam dosya: ${allFiles.length}`);
  console.log(`  ✅ Kullanılan dosya: ${usedFiles.size}`);
  console.log(`  ❌ Kullanılmayan dosya: ${unusedFiles.length}`);
  
  if (unusedFiles.length > 0) {
    console.log(`\n🗑️ Kullanılmayan dosyalar:`);
    unusedFiles.forEach(file => {
      console.log(`  • ${file}`);
    });
    
    console.log(`\n💡 Öneriler:`);
    console.log(`  1. Bu dosyaları manuel olarak kontrol edin`);
    console.log(`  2. Gerçekten kullanılmıyorsa silebilirsiniz`);
    console.log(`  3. Dikkatli olun - bazı dosyalar dinamik olarak yüklenebilir`);
  } else {
    console.log(`\n✅ Tüm dosyalar kullanılıyor!`);
  }
  
  return unusedFiles;
}

function findUnusedAssets() {
  console.log('\n🎨 Kullanılmayan asset dosyaları tespit ediliyor...\n');
  
  const publicPath = path.join(__dirname, '../../public');
  const srcPath = path.join(__dirname, '../../src');
  
  // Public klasöründeki asset'leri bul
  const assets = [];
  function scanAssets(dir, basePath = '') {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const relativePath = path.join(basePath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanAssets(filePath, relativePath);
      } else if (file.match(/\.(png|jpg|jpeg|gif|svg|ico|mp3|wav|ogg|css|js)$/i)) {
        assets.push(relativePath);
      }
    });
  }
  
  scanAssets(publicPath, 'public');
  
  // Asset'lerin kullanımını kontrol et
  const usedAssets = new Set();
  
  function checkAssetUsage(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        checkAssetUsage(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.css')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          assets.forEach(asset => {
            const assetName = path.basename(asset);
            const assetPath = asset.replace(/\\/g, '/');
            
            // Farklı referans şekillerini kontrol et
            if (content.includes(assetName) || 
                content.includes(assetPath) ||
                content.includes(`/${assetName}`) ||
                content.includes(`%PUBLIC_URL%/${assetName}`)) {
              usedAssets.add(asset);
            }
          });
        } catch (error) {
          console.warn(`Asset kontrolü yapılamadı: ${filePath}`, error.message);
        }
      }
    });
  }
  
  checkAssetUsage(srcPath);
  
  const unusedAssets = assets.filter(asset => !usedAssets.has(asset));
  
  console.log(`📊 Asset Analiz Sonuçları:`);
  console.log(`  🎨 Toplam asset: ${assets.length}`);
  console.log(`  ✅ Kullanılan asset: ${usedAssets.size}`);
  console.log(`  ❌ Kullanılmayan asset: ${unusedAssets.length}`);
  
  if (unusedAssets.length > 0) {
    console.log(`\n🗑️ Kullanılmayan asset'ler:`);
    unusedAssets.forEach(asset => {
      console.log(`  • ${asset}`);
    });
  } else {
    console.log(`\n✅ Tüm asset'ler kullanılıyor!`);
  }
  
  return unusedAssets;
}

function findUnusedExports() {
  console.log('\n📤 Kullanılmayan export\'lar tespit ediliyor...\n');
  
  const srcPath = path.join(__dirname, '../../src');
  const unusedExports = [];
  
  function analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Export'ları bul
      const exportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
      const defaultExportRegex = /export\s+default\s+(?:function\s+(\w+)|class\s+(\w+)|const\s+(\w+)|(\w+))/g;
      
      const exports = [];
      let match;
      
      while ((match = exportRegex.exec(content)) !== null) {
        exports.push(match[1]);
      }
      
      while ((match = defaultExportRegex.exec(content)) !== null) {
        const exportName = match[1] || match[2] || match[3] || match[4];
        if (exportName) {
          exports.push(exportName);
        }
      }
      
      // Export'ların kullanımını kontrol et
      exports.forEach(exportName => {
        const usageRegex = new RegExp(`\\b${exportName}\\b`, 'g');
        const matches = content.match(usageRegex);
        
        if (!matches || matches.length <= 1) {
          unusedExports.push({
            file: filePath,
            export: exportName
          });
        }
      });
      
    } catch (error) {
      console.warn(`Export analizi yapılamadı: ${filePath}`, error.message);
    }
  }
  
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        analyzeFile(filePath);
      }
    });
  }
  
  scanDirectory(srcPath);
  
  console.log(`📊 Export Analiz Sonuçları:`);
  console.log(`  📤 Kullanılmayan export: ${unusedExports.length}`);
  
  if (unusedExports.length > 0) {
    console.log(`\n🗑️ Kullanılmayan export'lar:`);
    unusedExports.forEach(({ file, export: exportName }) => {
      console.log(`  • ${path.relative(srcPath, file)}: ${exportName}`);
    });
  } else {
    console.log(`\n✅ Tüm export'lar kullanılıyor!`);
  }
  
  return unusedExports;
}

// Ana fonksiyon
function cleanupUnusedFiles() {
  console.log('🧹 Kullanılmayan Dosya ve Kod Temizliği\n');
  
  const unusedFiles = findUnusedFiles();
  const unusedAssets = findUnusedAssets();
  const unusedExports = findUnusedExports();
  
  console.log('\n📋 Özet:');
  console.log(`  📁 Kullanılmayan dosya: ${unusedFiles.length}`);
  console.log(`  🎨 Kullanılmayan asset: ${unusedAssets.length}`);
  console.log(`  📤 Kullanılmayan export: ${unusedExports.length}`);
  
  if (unusedFiles.length > 0 || unusedAssets.length > 0 || unusedExports.length > 0) {
    console.log('\n💡 Temizlik önerileri:');
    console.log('  1. Dosyaları manuel olarak kontrol edin');
    console.log('  2. Gerçekten kullanılmıyorsa silebilirsiniz');
    console.log('  3. Export\'ları kaldırmadan önce dikkatli olun');
    console.log('  4. Build testi yaparak her şeyin çalıştığından emin olun');
  } else {
    console.log('\n🎉 Temizlik gerekmiyor - her şey kullanılıyor!');
  }
}

// Script'i çalıştır
if (require.main === module) {
  try {
    cleanupUnusedFiles();
  } catch (error) {
    console.error('❌ Temizlik sırasında hata:', error.message);
    process.exit(1);
  }
}

module.exports = { cleanupUnusedFiles };
