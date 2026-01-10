import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { requestNotificationPermission } from './services/firebase'

const queryClient = new QueryClient()

// Register service workers for PWA and Firebase Messaging
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register Firebase Messaging service worker first (needed for notifications)
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Firebase Messaging SW registered: ', registration);
        // Wait for service worker to be active before requesting permission
        if (registration.active) {
          // Small delay to ensure service worker is fully ready
          setTimeout(() => {
            requestNotificationPermission().catch(console.error);
          }, 1000);
        } else if (registration.installing) {
          registration.installing.addEventListener('statechange', () => {
            if (registration.installing.state === 'activated') {
              setTimeout(() => {
                requestNotificationPermission().catch(console.error);
              }, 1000);
            }
          });
        } else if (registration.waiting) {
          // Service worker is waiting, activate it
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          registration.waiting.addEventListener('statechange', () => {
            if (registration.waiting?.state === 'activated') {
              setTimeout(() => {
                requestNotificationPermission().catch(console.error);
              }, 1000);
            }
          });
        }
      })
      .catch((registrationError) => {
        console.log('Firebase Messaging SW registration failed: ', registrationError);
      });

    // Register PWA service worker (separate from Firebase)
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('PWA SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('PWA SW registration failed: ', registrationError);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

