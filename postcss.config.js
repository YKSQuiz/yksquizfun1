const purgecss = require('@fullhuman/postcss-purgecss');

module.exports = {
  plugins: [
    require('autoprefixer'),
    ...(process.env.NODE_ENV === 'production' ? [
      purgecss({
        content: [
          './src/**/*.tsx',
          './src/**/*.ts',
          './src/**/*.jsx',
          './src/**/*.js',
          './public/index.html'
        ],
        defaultExtractor: content => {
          // CSS sınıflarını ve ID'leri çıkar
          const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
          const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
          return broadMatches.concat(innerMatches);
        },
        // Kullanılan CSS sınıflarını koru
        safelist: [
          // React Router sınıfları
          /^router-/,
          // Dinamik sınıflar
          /^subject-/,
          /^quiz-/,
          /^tyt-/,
          /^ayt-/,
          // Animasyon sınıfları
          /^animate-/,
          /^fade-/,
          /^slide-/,
          // Responsive sınıfları
          /^sm:/,
          /^md:/,
          /^lg:/,
          /^xl:/,
          // Pseudo sınıfları
          /^hover:/,
          /^focus:/,
          /^active:/,
          // Özel sınıflar
          'loading-container',
          'error-message',
          'success-message',
          'warning-message'
        ],
        // CSS dosyalarını temizle
        css: ['./src/**/*.css'],
        // Font dosyalarını koru
        fontFace: true,
        // Keyframes'leri koru
        keyframes: true,
        // Variables'ları koru
        variables: true
      })
    ] : [])
  ]
};
