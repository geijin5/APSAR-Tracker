import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'

const queryClient = new QueryClient()

// Register service workers asynchronously - don't block app startup
if ('serviceWorker' in navigator) {
  // Use requestIdleCallback if available, otherwise setTimeout
  const registerServiceWorkers = () => {
    // Register PWA service worker first (more essential)
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('PWA SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.warn('PWA SW registration failed (non-critical): ', registrationError);
      });

    // Register Firebase Messaging service worker (can fail gracefully)
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Firebase Messaging SW registered: ', registration);
        // Try to initialize notifications after a delay (don't block startup)
        setTimeout(() => {
          try {
            import('./services/firebase').then(({ requestNotificationPermission }) => {
              requestNotificationPermission().catch((err) => {
                console.warn('Notification permission request failed (non-critical):', err);
              });
            }).catch((err) => {
              console.warn('Firebase module load failed (non-critical):', err);
            });
          } catch (err) {
            console.warn('Firebase initialization error (non-critical):', err);
          }
        }, 3000); // Delay to ensure app is loaded first
      })
      .catch((registrationError) => {
        console.warn('Firebase Messaging SW registration failed (non-critical): ', registrationError);
      });
  };

  if (window.requestIdleCallback) {
    window.requestIdleCallback(registerServiceWorkers, { timeout: 5000 });
  } else {
    window.addEventListener('load', () => {
      setTimeout(registerServiceWorkers, 1000);
    });
  }
}

// Render app immediately - don't wait for service workers
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)

