const fs = require('fs');
const path = require('path');

/**
 * YKS Quiz uygulaması için sitemap.xml oluşturur
 */
function generateSitemap() {
  const baseUrl = 'https://www.yksquiz.fun';
  const currentDate = new Date().toISOString();
  
  // Ana sayfalar
  const pages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/quiz', priority: '0.9', changefreq: 'daily' },
    { url: '/profile', priority: '0.8', changefreq: 'weekly' },
    { url: '/stats', priority: '0.8', changefreq: 'weekly' },
    { url: '/market', priority: '0.7', changefreq: 'weekly' },
    { url: '/login', priority: '0.6', changefreq: 'monthly' },
    { url: '/admin', priority: '0.5', changefreq: 'monthly' }
  ];

  // XML başlangıcı
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Her sayfa için URL ekle
  pages.forEach(page => {
    sitemap += `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  });

  sitemap += '</urlset>';

  // Sitemap'i public klasörüne yaz
  const sitemapPath = path.join(__dirname, '../../public/sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap);

  console.log('✅ Sitemap.xml oluşturuldu:', sitemapPath);
  console.log(`📊 ${pages.length} sayfa eklendi`);
}

// Script'i çalıştır
if (require.main === module) {
  try {
    generateSitemap();
  } catch (error) {
    console.error('❌ Sitemap oluşturulurken hata:', error.message);
    process.exit(1);
  }
}

module.exports = { generateSitemap }; 