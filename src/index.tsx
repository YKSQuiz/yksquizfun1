import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext'; // AuthProvider'ı import et

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Performance monitoring - Disabled for mobile optimization
// Web Vitals removed to reduce bundle size

// Service Worker Registration
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', async () => {
    // Eski SW ve cache'leri temizle (bu origin için)
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}

    // Güncel SW'yi kaydet
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        // Mevcut istemcilerde yeni SW’yi hemen etkinleştir
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        // Bu origin'e ait tüm SW'lere cache temizleme sinyali gönder
        try {
          registration.active?.postMessage({ type: 'CLEAR_CACHE' });
          navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHE' });
          navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage({ type: 'CLEAR_CACHE' }));
        } catch {}
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Sayfa odağa geldiğinde de cache temizleme sinyali gönder (özellikle iOS/Safari için)
if ('serviceWorker' in navigator) {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      try {
        navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHE' });
      } catch {}
    }
  });
}

// Development ortamında eski service worker'ları devre dışı bırak
if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().then(() => {
          // Eski cache'leri de temizle
          if (window.caches) {
            caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
          }
        });
      });
    });
  });
}

root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
