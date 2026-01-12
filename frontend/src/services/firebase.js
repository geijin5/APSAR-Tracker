// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD5F2AqJQXP5jshRWfspEHELXm1nSNbx6c",
  authDomain: "apsar-tracker.firebaseapp.com",
  projectId: "apsar-tracker",
  storageBucket: "apsar-tracker.firebasestorage.app",
  messagingSenderId: "587292252088",
  appId: "1:587292252088:web:56ae99425079064714614d",
  measurementId: "G-995XT5K0FZ"
};

// Initialize Firebase with error handling
let app = null;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.warn('Firebase app initialization failed (non-critical):', error);
}

// Initialize Analytics (only in browser, not in service worker)
let analytics = null;
if (typeof window !== 'undefined' && app) {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    // Analytics failures are non-critical - app should still work
    console.warn('Firebase Analytics initialization failed (non-critical):', error);
  }
}

// Initialize Firebase Cloud Messaging
let messaging = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && app) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    // Messaging failures are non-critical - app should still work
    console.warn('Firebase Messaging initialization failed (non-critical):', error);
  }
}

/**
 * Request notification permission and get FCM token
 * @returns {Promise<string|null>} FCM token or null if permission denied
 */
export const requestNotificationPermission = async () => {
  // Wait a bit for messaging to be initialized if service worker is still loading
  if (!messaging) {
    // Try to re-initialize messaging
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && app) {
        const { getMessaging } = await import('firebase/messaging');
        const newMessaging = getMessaging(app);
        if (newMessaging) {
          messaging = newMessaging;
        }
      }
    } catch (error) {
      console.warn('Firebase Messaging initialization delayed:', error);
      return null;
    }
    
    if (!messaging) {
      console.warn('Firebase Messaging not available');
      return null;
    }
  }

  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Get FCM token
    // Note: VAPID key should be retrieved from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
    // For now, we'll try without VAPID key first (Firebase may auto-generate one)
    let token;
    try {
      token = await getToken(messaging);
    } catch (tokenError) {
      // If token retrieval fails, it might be because service worker isn't ready yet
      console.warn('FCM token retrieval failed, service worker may not be ready:', tokenError);
      // Wait a bit and try again
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        token = await getToken(messaging);
      } catch (retryError) {
        console.error('FCM token retrieval failed after retry:', retryError);
        return null;
      }
    }

    if (token) {
      console.log('FCM Token obtained:', token.substring(0, 20) + '...');
      // Store token in localStorage for backend registration
      localStorage.setItem('fcmToken', token);
      return token;
    } else {
      console.warn('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

/**
 * Get existing FCM token from localStorage
 * @returns {string|null} FCM token or null
 */
export const getFCMToken = () => {
  return localStorage.getItem('fcmToken');
};

/**
 * Setup listener for foreground messages
 * @param {Function} callback Function to call when message is received
 * @returns {Function} Unsubscribe function
 */
export const onMessageListener = (callback) => {
  if (!messaging) {
    console.warn('Firebase Messaging not available (non-critical)');
    return () => {};
  }

  try {
    return onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      if (callback) {
        try {
          callback(payload);
        } catch (err) {
          console.warn('Error in message callback (non-critical):', err);
        }
      }
    });
  } catch (error) {
    console.warn('Error setting up message listener (non-critical):', error);
    return () => {};
  }
};

/**
 * Show browser notification
 * @param {string} title Notification title
 * @param {Object} options Notification options
 */
export const showNotification = (title, options = {}) => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    const notificationOptions = {
      body: options.body || '',
      icon: options.icon || '/logo.png', // Use logo for notification icon
      badge: options.badge || '/logo.png', // Use logo for badge
      tag: options.tag || 'apsar-chat',
      requireInteraction: options.requireInteraction || false,
      data: options.data || {},
      ...options
    };

    const notification = new Notification(title, notificationOptions);

    // Handle notification click
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (options.onClick) {
        options.onClick(event);
      }
      notification.close();
    };

    // Auto-close after 5 seconds if not requiring interaction
    if (!notificationOptions.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }
};

/**
 * Handle FCM payload and show notification for chat messages
 * @param {Object} payload FCM message payload
 */
export const handleChatNotification = (payload) => {
  const { notification, data } = payload;

  // Handle notification from FCM
  if (notification) {
    showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon || '/logo.png', // Use logo for notification icon
      tag: `chat-${data?.conversationId || 'message'}`,
      data: {
        conversationId: data?.conversationId,
        messageId: data?.messageId,
        type: data?.type || 'chat',
        url: data?.url || '/chat'
      },
      onClick: (event) => {
        // Navigate to chat on click
        if (data?.url) {
          window.location.href = data.url;
        } else {
          window.location.href = '/chat';
        }
      }
    });
  } else if (data) {
    // Handle data-only payload
    const title = data.title || 'New Message';
    const body = data.body || data.content || 'You have a new message';
    
    showNotification(title, {
      body: body,
      icon: '/logo.png', // Use logo for notification icon
      tag: `chat-${data.conversationId || data.messageId || 'message'}`,
      data: {
        conversationId: data.conversationId,
        messageId: data.messageId,
        type: data.type || 'chat',
        url: data.url || '/chat'
      },
      onClick: (event) => {
        if (data.url) {
          window.location.href = data.url;
        } else {
          window.location.href = '/chat';
        }
      }
    });
  }
};

export { app, analytics, messaging };
export default app;

