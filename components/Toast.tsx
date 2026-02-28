import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
  }[type];

  const icon = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning',
  }[type];

  return (
    <div className="fixed bottom-safe-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-slide-in-up">
      <div className={`${bgColor} text-white px-6 py-3 rounded-2xl shadow-soft-lg flex items-center gap-3 min-w-[280px] max-w-md transition-all duration-250 ease-smooth hover:shadow-xl`}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-full transition-all duration-200 ease-smooth active:scale-90"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  );
};

export default Toast;
