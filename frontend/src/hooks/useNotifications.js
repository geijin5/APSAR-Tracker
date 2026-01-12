import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  onMessageListener, 
  requestNotificationPermission, 
  handleChatNotification,
  getFCMToken 
} from '../services/firebase';
import api from '../services/api';

/**
 * Hook for managing chat notifications
 * Listens for FCM messages and shows notifications
 */
export const useNotifications = () => {
  const { user } = useAuth();

  // Request notification permission on mount if user is logged in
  useEffect(() => {
    if (user) {
      // Delay to ensure Firebase is initialized
      const timer = setTimeout(() => {
        requestNotificationPermission().then(async (token) => {
          if (token) {
            console.log('Notification permission granted, token:', token);
            // Register token with backend
            try {
              const deviceInfo = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
              };
              await api.post('/notifications/register-token', { token, deviceInfo });
              console.log('FCM token registered with backend');
            } catch (error) {
              console.warn('Error registering FCM token with backend (non-critical):', error);
            }
          }
        }).catch((err) => {
          console.warn('Notification permission request failed (non-critical):', err);
        });
      }, 2000); // Delay to ensure app is fully loaded

      return () => clearTimeout(timer);
    }
  }, [user]);

  // Set up listener for foreground messages
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onMessageListener((payload) => {
      console.log('Received FCM message:', payload);
      
      // Handle chat notifications
      if (payload.data?.type === 'chat' || payload.notification) {
        handleChatNotification(payload);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  // Get FCM token for backend registration
  const getToken = useCallback(() => {
    return getFCMToken();
  }, []);

  return {
    getToken
  };
};


