import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

let notificationId = 0;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (type, message) => {
      const id = ++notificationId;
      setNotifications((prev) => [...prev, { id, type, message }]);
      setTimeout(() => removeNotification(id), 5000);
      return id;
    },
    [removeNotification]
  );

  const showSuccess = useCallback(
    (message) => addNotification('success', message),
    [addNotification]
  );

  const showError = useCallback(
    (message) => addNotification('error', message),
    [addNotification]
  );

  const showInfo = useCallback(
    (message) => addNotification('info', message),
    [addNotification]
  );

  const value = { showSuccess, showError, showInfo };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  );
}

function NotificationContainer({ notifications, onRemove }) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function NotificationToast({ notification, onRemove }) {
  const { id, type, message } = notification;

  const config = {
    success: {
      bg: 'bg-green-50 border-green-400',
      text: 'text-green-800',
      icon: <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />,
    },
    error: {
      bg: 'bg-red-50 border-red-400',
      text: 'text-red-800',
      icon: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
    },
    info: {
      bg: 'bg-blue-50 border-blue-400',
      text: 'text-blue-800',
      icon: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
    },
  };

  const { bg, text, icon } = config[type] || config.info;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg ${bg} animate-slide-in`}
      role="alert"
    >
      {icon}
      <p className={`text-sm font-medium flex-1 ${text}`}>{message}</p>
      <button
        onClick={() => onRemove(id)}
        className={`flex-shrink-0 ${text} hover:opacity-70 transition-opacity`}
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
