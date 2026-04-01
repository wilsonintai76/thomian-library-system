// Deployment v3.2.7 - Kiosk Stable
import React from 'react'
import ReactDOM from 'react-dom/client'
import KioskHome from './components/KioskHome'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <main>
      <KioskHome />
    </main>
  </React.StrictMode>,
)

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (registration.waiting) {
        window.dispatchEvent(new CustomEvent('swUpdateAvailable', { detail: registration }));
      }
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('swUpdateAvailable', { detail: registration }));
          }
        });
      });
    }).catch(() => {});
  });
}
