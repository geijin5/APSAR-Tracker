import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Don't prevent default - let error boundary handle it
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent default to avoid console error spam
  event.preventDefault();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

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
try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
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
    </React.StrictMode>
  );
  
  console.log('App rendered successfully');
} catch (error) {
  console.error('Failed to render app:', error);
  // Fallback UI
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif;">
        <h1>App Failed to Load</h1>
        <p>Error: ${error.message}</p>
        <button onclick="window.location.reload()">Reload Page</button>
        <pre style="background: #f0f0f0; padding: 10px; margin-top: 10px; overflow: auto;">${error.stack || error.toString()}</pre>
      </div>
    `;
  }
}

