// Notification Manager Component
import React, { useEffect } from 'react';
import { useNotifications } from '@/hooks/redux';
import { Button } from '@/design-system/components/Button/Button';
import { Card } from '@/design-system/components/Card/Card';

interface NotificationProps {
  notification: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
    actions?: Array<{
      label: string;
      action: () => void;
    }>;
    timestamp: number;
  };
  onDismiss: (id: string) => void;
}

// Notification item component
const NotificationItem: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  // Auto-dismiss notification after duration
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(notification.id);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, [notification.id, notification.duration, onDismiss]);

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'border-green-500 bg-green-50 text-green-800';
      case 'error':
        return 'border-red-500 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-blue-500 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-500 bg-gray-50 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'i';
      default:
        return '•';
    }
  };

  return (
    <Card className={`p-4 mb-3 border-l-4 ${getTypeStyles()} shadow-md max-w-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <span className="inline-flex items-center justify-center w-6 h-6 text-sm font-bold rounded-full">
              {getIcon()}
            </span>
          </div>
          <div className="flex-grow min-w-0">
            <h4 className="text-sm font-medium">{notification.title}</h4>
            {notification.message && (
              <p className="mt-1 text-sm opacity-90">{notification.message}</p>
            )}
            {notification.actions && notification.actions.length > 0 && (
              <div className="mt-2 space-x-2">
                {notification.actions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      action.action();
                      onDismiss(notification.id);
                    }}
                    className="text-xs"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(notification.id)}
          className="flex-shrink-0 p-1 ml-2"
          aria-label="Dismiss notification"
        >
          ×
        </Button>
      </div>
    </Card>
  );
};

// Notification container component
const NotificationManager: React.FC = () => {
  const { notifications, dismissNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  );
};

export default NotificationManager;