// Firebase Cloud Messaging Service Worker
// This file must be in the public directory to be accessible as a service worker

importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging.js');

// Initialize Firebase in service worker
const firebaseConfig = {
  apiKey: "AIzaSyD5F2AqJQXP5jshRWfspEHELXm1nSNbx6c",
  authDomain: "apsar-tracker.firebaseapp.com",
  projectId: "apsar-tracker",
  storageBucket: "apsar-tracker.firebasestorage.app",
  messagingSenderId: "587292252088",
  appId: "1:587292252088:web:56ae99425079064714614d",
  measurementId: "G-995XT5K0FZ"
};

firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging object
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'APSAR Tracker';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || payload.data?.content || 'You have a new message',
    icon: payload.notification?.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: `chat-${payload.data?.conversationId || payload.data?.messageId || 'message'}`,
    data: {
      conversationId: payload.data?.conversationId,
      messageId: payload.data?.messageId,
      type: payload.data?.type || 'chat',
      url: payload.data?.url || '/chat'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/chat';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If app is not open, open it
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

