import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  onMessageListener, 
  requestNotificationPermission, 
  handleChatNotification,
  getFCMToken 
} from '../services/firebase';

/**
 * Hook for managing chat notifications
 * Listens for FCM messages and shows notifications
 */
export const useNotifications = () => {
  const { user } = useAuth();

  // Request notification permission on mount if user is logged in
  useEffect(() => {
    if (user) {
      requestNotificationPermission().then((token) => {
        if (token) {
          console.log('Notification permission granted, token:', token);
          // TODO: Send token to backend to register for push notifications
          // This would typically be done via an API call to /api/notifications/register-token
        }
      }).catch(console.error);
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

