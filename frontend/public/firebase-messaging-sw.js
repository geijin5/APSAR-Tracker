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
    icon: payload.notification?.icon || '/logo.png', // Use logo for notification icon
    badge: '/logo.png', // Use logo for badge
    image: payload.notification?.image || payload.data?.image, // Optional large image
    tag: `chat-${payload.data?.conversationId || payload.data?.messageId || 'message'}`,
    data: {
      conversationId: payload.data?.conversationId,
      messageId: payload.data?.messageId,
      type: payload.data?.type || 'chat',
      url: payload.data?.url || '/chat',
      senderId: payload.data?.senderId,
      senderName: payload.data?.senderName
    },
    requireInteraction: false,
    silent: false
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();

  // Build URL with conversation info if available
  let urlToOpen = event.notification.data?.url || '/chat';
  if (event.notification.data?.conversationId) {
    // For group chats, navigate to chat page
    // For 1-on-1, could add user ID to URL if needed
    urlToOpen = '/chat';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // Check if any window matches our app domain
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Focus the window and navigate to chat
          return client.focus().then(() => {
            // Post message to navigate to chat
            if (client.navigate) {
              return client.navigate(urlToOpen);
            }
            return client;
          });
        }
      }
      // If app is not open, open it
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});


