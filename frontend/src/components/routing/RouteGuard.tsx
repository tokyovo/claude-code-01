import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useBlocker } from 'react-router-dom';
import { useAuth } from '@/hooks/redux';
import { Button } from '@/design-system';

interface RouteGuardProps {
  children: React.ReactNode;
  hasUnsavedChanges?: boolean;
  onNavigationBlocked?: () => void;
  customBlockMessage?: string;
}

/**
 * RouteGuard component that provides navigation guards and warnings
 * 
 * Features:
 * - Prevents navigation when there are unsaved changes
 * - Session expiry warnings
 * - Custom navigation blocking
 * - User confirmation dialogs
 */
const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  hasUnsavedChanges = false,
  onNavigationBlocked,
  customBlockMessage = 'You have unsaved changes. Are you sure you want to leave?',
}) => {
  const { isAuthenticated, sessionExpiry } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockedNavigation, setBlockedNavigation] = useState<string | null>(null);

  // Block navigation if there are unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => {
      if (!hasUnsavedChanges) return false;
      if (currentLocation.pathname === nextLocation.pathname) return false;
      return true;
    }
  );

  // Handle blocked navigation
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setBlockedNavigation(blocker.location?.pathname || null);
      setShowBlockDialog(true);
      
      if (onNavigationBlocked) {
        onNavigationBlocked();
      }
    }
  }, [blocker.state, blocker.location, onNavigationBlocked]);

  // Session expiry warning
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiry) return;

    const checkSessionExpiry = () => {
      const timeUntilExpiry = sessionExpiry - Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (timeUntilExpiry <= fiveMinutes && timeUntilExpiry > 0) {
        // Show session expiry warning
        if (window.confirm('Your session will expire soon. Would you like to extend it?')) {
          // TODO: Trigger token refresh
          console.log('Refreshing session...');
        }
      }
    };

    const interval = setInterval(checkSessionExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isAuthenticated, sessionExpiry]);

  // Handle browser's beforeunload event for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = customBlockMessage;
        return customBlockMessage;
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [hasUnsavedChanges, customBlockMessage]);

  const handleConfirmNavigation = () => {
    setShowBlockDialog(false);
    if (blockedNavigation) {
      navigate(blockedNavigation);
    } else if (blocker.proceed) {
      blocker.proceed();
    }
  };

  const handleCancelNavigation = () => {
    setShowBlockDialog(false);
    setBlockedNavigation(null);
    if (blocker.reset) {
      blocker.reset();
    }
  };

  return (
    <>
      {children}
      
      {/* Navigation blocking dialog */}
      {showBlockDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-yellow-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">
                      Unsaved Changes
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {customBlockMessage}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmNavigation}
                  className="w-full sm:ml-3 sm:w-auto"
                >
                  Leave Page
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelNavigation}
                  className="mt-3 w-full sm:mt-0 sm:w-auto"
                >
                  Stay
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RouteGuard;