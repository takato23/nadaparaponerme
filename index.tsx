import React from 'react';
import './src/index.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { bootstrapAuthState } from './hooks/useAuth';
import { initializeGlobalErrorCapture } from './src/services/errorReportingService';
import { stampReleaseIdentifier } from './src/services/releaseInfo';

// ⛔ SECURITY: Gemini API initialization removed - all AI calls go through Edge Functions

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

initializeGlobalErrorCapture();
const currentReleaseId = stampReleaseIdentifier();

const CHUNK_RELOAD_GUARD_KEY = 'ojodeloca-chunk-reload-release';

function isChunkLoadFailureMessage(message: string): boolean {
  return (
    message.includes('Failed to fetch dynamically imported module')
    || message.includes('Importing a module script failed')
    || message.includes('ChunkLoadError')
  );
}

async function recoverFromChunkLoadFailure(message?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!message || !isChunkLoadFailureMessage(message)) return;

  const lastRecoveredRelease = window.sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY);
  if (lastRecoveredRelease === currentReleaseId) return;

  window.sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, currentReleaseId);

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
    }
  } catch (error) {
    console.warn('Chunk recovery cleanup failed:', error);
  }

  window.location.reload();
}

function reloadForChunkRecovery(message?: string): void {
  void recoverFromChunkLoadFailure(message);
}

function isPreviewDeploymentHost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('.vercel.app');
}

async function clearServiceWorkerState(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
    }
  } catch (error) {
    console.warn('Service worker cleanup failed:', error);
  }
}

window.addEventListener('error', (event) => {
  const target = event.target as HTMLScriptElement | null;
  if (target?.tagName === 'SCRIPT' && target.getAttribute('type') === 'module') {
    reloadForChunkRecovery(target.src || event.message);
    return;
  }

  reloadForChunkRecovery(event.message);
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? '');
  reloadForChunkRecovery(message);
});

const root = ReactDOM.createRoot(rootElement);
const appTree = (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

void bootstrapAuthState()
  .catch((error) => {
    console.error('Auth bootstrap failed before render:', error);
  })
  .finally(() => {
    root.render(import.meta.env.DEV ? appTree : <React.StrictMode>{appTree}</React.StrictMode>);
  });

// Register Service Worker for installable/offline PWA behavior in production.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    if (isPreviewDeploymentHost()) {
      void clearServiceWorkerState();
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);

        if (registration.waiting) {
          registration.waiting.postMessage('skipWaiting');
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              installingWorker.postMessage('skipWaiting');
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
