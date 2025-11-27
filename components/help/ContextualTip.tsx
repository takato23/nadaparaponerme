import React, { useState, useEffect } from 'react';

interface ContextualTipProps {
  id: string;
  title: string;
  message: string;
  icon?: string;
  variant?: 'info' | 'success' | 'warning' | 'tip';
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissable?: boolean;
  onDismiss?: () => void;
  autoHide?: number; // Auto hide after X milliseconds
  position?: 'top' | 'bottom' | 'inline';
  showOnce?: boolean; // If true, won't show again after dismissed
}

const ContextualTip: React.FC<ContextualTipProps> = ({
  id,
  title,
  message,
  icon,
  variant = 'info',
  action,
  dismissable = true,
  onDismiss,
  autoHide,
  position = 'inline',
  showOnce = false
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Check if already dismissed (for showOnce tips)
  useEffect(() => {
    if (showOnce) {
      const dismissed = localStorage.getItem(`tip-dismissed-${id}`);
      if (dismissed) {
        setIsVisible(false);
      }
    }
  }, [id, showOnce]);

  // Auto hide
  useEffect(() => {
    if (autoHide && isVisible) {
      const timeout = setTimeout(() => {
        handleDismiss();
      }, autoHide);
      return () => clearTimeout(timeout);
    }
  }, [autoHide, isVisible]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (showOnce) {
        localStorage.setItem(`tip-dismissed-${id}`, 'true');
      }
      onDismiss?.();
    }, 300);
  };

  if (!isVisible) return null;

  const variantStyles = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'info',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-800 dark:text-blue-200'
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: 'check_circle',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      titleColor: 'text-emerald-800 dark:text-emerald-200'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      icon: 'warning',
      iconColor: 'text-amber-600 dark:text-amber-400',
      titleColor: 'text-amber-800 dark:text-amber-200'
    },
    tip: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      icon: 'lightbulb',
      iconColor: 'text-purple-600 dark:text-purple-400',
      titleColor: 'text-purple-800 dark:text-purple-200'
    }
  };

  const styles = variantStyles[variant];

  const positionClasses = {
    top: 'fixed top-4 left-4 right-4 z-50 max-w-lg mx-auto',
    bottom: 'fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto',
    inline: ''
  };

  return (
    <div
      className={`
        ${positionClasses[position]}
        ${styles.bg} ${styles.border}
        border rounded-xl p-4
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 scale-95 translate-y-2' : 'opacity-100 scale-100 translate-y-0'}
        ${position !== 'inline' ? 'shadow-lg' : ''}
        animate-fade-in
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${styles.iconColor}`}>
          <span className="material-symbols-outlined text-xl">
            {icon || styles.icon}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold ${styles.titleColor} mb-1`}>
            {title}
          </h4>
          <p className="text-sm text-text-secondary dark:text-gray-400 leading-relaxed">
            {message}
          </p>

          {/* Action button */}
          {action && (
            <button
              onClick={action.onClick}
              className={`mt-3 text-sm font-medium ${styles.iconColor} hover:underline`}
            >
              {action.label} →
            </button>
          )}
        </div>

        {/* Dismiss button */}
        {dismissable && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-lg text-text-secondary">
              close
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ContextualTip;

// Preset tip components for common use cases
export const FirstOutfitTip: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => (
  <ContextualTip
    id="first-outfit"
    title="Tu primer outfit"
    message="Calificá este outfit después de usarlo. Eso ayuda a la IA a aprender tus gustos y mejorar las próximas sugerencias."
    variant="tip"
    icon="star"
    onDismiss={onDismiss}
    showOnce
    position="bottom"
    autoHide={10000}
  />
);

export const EmptyClosetTip: React.FC<{ onAction: () => void }> = ({ onAction }) => (
  <ContextualTip
    id="empty-closet-tip"
    title="Tu armario está esperando"
    message="Subí al menos 5 prendas para que la IA pueda crear outfits increíbles para vos."
    variant="info"
    icon="add_a_photo"
    action={{
      label: 'Subir prendas',
      onClick: onAction
    }}
    dismissable={false}
  />
);

export const LowRatingsTip: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => (
  <ContextualTip
    id="low-ratings"
    title="Mejoramos con tu feedback"
    message="Notamos que las últimas sugerencias no te convencieron. Probá describir la ocasión con más detalle para mejores resultados."
    variant="warning"
    onDismiss={onDismiss}
    showOnce
    position="top"
  />
);

export const StreakTip: React.FC<{ days: number; onDismiss: () => void }> = ({ days, onDismiss }) => (
  <ContextualTip
    id={`streak-${days}`}
    title={`${days} días seguidos`}
    message="Vas muy bien con tu racha. Seguí así y desbloqueás badges especiales y funciones premium."
    variant="success"
    icon="local_fire_department"
    onDismiss={onDismiss}
    showOnce
    position="top"
    autoHide={5000}
  />
);

export const NewFeatureTip: React.FC<{
  featureName: string;
  description: string;
  onAction: () => void;
  onDismiss: () => void;
}> = ({ featureName, description, onAction, onDismiss }) => (
  <ContextualTip
    id={`new-feature-${featureName.toLowerCase().replace(/\s/g, '-')}`}
    title={`Nuevo: ${featureName}`}
    message={description}
    variant="tip"
    icon="new_releases"
    action={{
      label: 'Probar ahora',
      onClick: onAction
    }}
    onDismiss={onDismiss}
    showOnce
    position="bottom"
  />
);

export const ProTip: React.FC<{
  title: string;
  message: string;
  onDismiss?: () => void;
}> = ({ title, message, onDismiss }) => (
  <ContextualTip
    id={`pro-tip-${title.toLowerCase().replace(/\s/g, '-')}`}
    title={title}
    message={message}
    variant="tip"
    icon="lightbulb"
    onDismiss={onDismiss}
    showOnce
  />
);
