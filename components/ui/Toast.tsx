import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

interface ToastConfig {
  icon: string;
  bgColor: string;
  textColor: string;
}

const toastConfig: Record<ToastType, ToastConfig> = {
  success: {
    icon: 'check_circle',
    bgColor: 'bg-green-500',
    textColor: 'text-white'
  },
  error: {
    icon: 'error',
    bgColor: 'bg-red-500',
    textColor: 'text-white'
  },
  warning: {
    icon: 'warning',
    bgColor: 'bg-yellow-500',
    textColor: 'text-white'
  },
  info: {
    icon: 'info',
    bgColor: 'bg-blue-500',
    textColor: 'text-white'
  }
};

const Toast = ({ message, type = 'info', duration = 3000, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const config = toastConfig[type];

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    // Auto dismiss after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300); // Match animation duration
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-[calc(100vw-2rem)] transition-all duration-300 ${
        isVisible && !isExiting
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-4'
      }`}
      style={{
        // Safe area insets for notch/dynamic island
        top: 'max(1rem, env(safe-area-inset-top))'
      }}
    >
      <div
        className={`${config.bgColor} ${config.textColor} px-6 py-3 rounded-full shadow-lg flex items-center gap-3 backdrop-blur-sm`}
      >
        <span className="material-symbols-outlined text-xl">{config.icon}</span>
        <p className="font-semibold text-sm">{message}</p>
        <button
          onClick={handleClose}
          className="ml-2 hover:opacity-70 transition-opacity"
          aria-label="Cerrar notificación"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  );
};

// Toast container hook for managing multiple toasts
export interface ToastMessage {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            top: `calc(${index * 4.5}rem + max(1rem, env(safe-area-inset-top)))`
          }}
          className="absolute"
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </>
  );

  return { showToast, ToastContainer };
};

export default Toast;
