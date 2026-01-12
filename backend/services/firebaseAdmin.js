// Firebase Admin SDK for sending push notifications
// This service initializes Firebase Admin and provides functions to send notifications

let admin = null;

/**
 * Initialize Firebase Admin SDK
 * Requires GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to service account key
 * Or FIREBASE_SERVICE_ACCOUNT_KEY environment variable with the JSON string
 */
function initializeFirebaseAdmin() {
  if (admin) {
    return admin;
  }

  try {
    const adminModule = require('firebase-admin');
    
    // Check if already initialized
    if (adminModule.apps.length > 0) {
      admin = adminModule;
      return admin;
    }

    // Try to initialize with service account
    let serviceAccount;
    
    // Option 1: From environment variable (JSON string)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
      }
    }
    
    // Option 2: From file path (GOOGLE_APPLICATION_CREDENTIALS)
    if (!serviceAccount && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      } catch (e) {
        console.error('Failed to load service account from GOOGLE_APPLICATION_CREDENTIALS:', e.message);
      }
    }

    if (serviceAccount) {
      admin = adminModule.initializeApp({
        credential: adminModule.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized successfully');
    } else {
      console.warn('Firebase Admin not initialized - service account credentials not found. Push notifications will not work.');
      console.warn('Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS environment variable.');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
    console.warn('Push notifications will not be available.');
  }

  return admin;
}

/**
 * Send push notification to a single device
 * @param {string} token - FCM token
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise}
 */
async function sendNotification(token, notification, data = {}) {
  if (!admin) {
    initializeFirebaseAdmin();
  }

  if (!admin) {
    console.warn('Firebase Admin not initialized. Cannot send notification.');
    return null;
  }

  try {
    const message = {
      token,
      notification: {
        title: notification.title || 'APSAR Tracker',
        body: notification.body || '',
        icon: notification.icon || '/logo.png',
        image: notification.image
      },
      data: {
        ...data,
        click_action: data.url || '/chat'
      },
      webpush: {
        notification: {
          icon: notification.icon || '/logo.png',
          badge: '/logo.png'
        },
        fcmOptions: {
          link: data.url || '/chat'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: notification.badge || 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    
    // Handle invalid token errors
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.log('Invalid or unregistered token, should be removed from user record');
      throw { code: 'INVALID_TOKEN', token };
    }
    
    throw error;
  }
}

/**
 * Send push notification to multiple devices
 * @param {Array<string>} tokens - Array of FCM tokens
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} Results object with success and failure counts
 */
async function sendMulticastNotification(tokens, notification, data = {}) {
  if (!admin) {
    initializeFirebaseAdmin();
  }

  if (!admin || !tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  try {
    const message = {
      notification: {
        title: notification.title || 'APSAR Tracker',
        body: notification.body || '',
        icon: notification.icon || '/logo.png',
        image: notification.image
      },
      data: {
        ...data,
        click_action: data.url || '/chat'
      },
      webpush: {
        notification: {
          icon: notification.icon || '/logo.png',
          badge: '/logo.png'
        },
        fcmOptions: {
          link: data.url || '/chat'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: notification.badge || 1
          }
        }
      },
      tokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Extract invalid tokens
    const invalidTokens = [];
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success && 
            (resp.error?.code === 'messaging/invalid-registration-token' || 
             resp.error?.code === 'messaging/registration-token-not-registered')) {
          invalidTokens.push(tokens[idx]);
        }
      });
    }

    console.log(`Sent notification to ${response.successCount}/${tokens.length} devices`);
    
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens
    };
  } catch (error) {
    console.error('Error sending multicast notification:', error);
    throw error;
  }
}

/**
 * Send notification to user by user ID
 * Gets all FCM tokens for the user and sends to all devices
 * @param {Object} user - User document with fcmTokens array
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>} Results object
 */
async function sendNotificationToUser(user, notification, data = {}) {
  if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const tokens = user.fcmTokens.map(t => t.token);
  return await sendMulticastNotification(tokens, notification, data);
}

module.exports = {
  initializeFirebaseAdmin,
  sendNotification,
  sendMulticastNotification,
  sendNotificationToUser
};

