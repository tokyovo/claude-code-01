// Session Manager Component for handling authentication and session timeout
import React, { useEffect } from 'react';
import { useAuth, useSessionManagement } from '@/hooks/redux';

const SessionManager: React.FC = () => {
  const { isAuthenticated, updateActivity } = useAuth();
  useSessionManagement(); // This handles session expiry warnings internally

  // Track user activity to update session
  useEffect(() => {
    if (!isAuthenticated) return;

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      updateActivity();
    };

    // Throttle activity updates to avoid excessive calls
    let activityTimer: NodeJS.Timeout;
    const throttledHandleActivity = () => {
      if (activityTimer) clearTimeout(activityTimer);
      activityTimer = setTimeout(handleActivity, 5000); // Update every 5 seconds max
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, throttledHandleActivity);
    });

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, throttledHandleActivity);
      });
      if (activityTimer) clearTimeout(activityTimer);
    };
  }, [isAuthenticated, updateActivity]);

  // This component doesn't render anything visible
  // It just manages session state in the background
  return null;
};

export default SessionManager;