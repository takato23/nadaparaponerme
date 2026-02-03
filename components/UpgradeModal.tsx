/**
 * UpgradeModal Component
 *
 * Modal that appears when user hits usage limits or tries to access premium features.
 * Shows pricing tiers and upgrade options.
 */

import React from 'react';
import { useUserCredits } from '../hooks/useUserCredits';
import { getFeatureDisplayName, type FeatureType } from '../src/services/usageTrackingService';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockedFeature?: FeatureType | null;
  reason?: 'limit_reached' | 'premium_feature' | 'general';
}

export function UpgradeModal({
  isOpen,
  onClose,
  blockedFeature,
  reason = 'general',
}: UpgradeModalProps) {
  const { tier, checkFeature } = useUserCredits();

  if (!isOpen) return null;

  // Get feature status if blocked feature provided
  const featureStatus = blockedFeature ? checkFeature(blockedFeature) : null;
  const featureName = blockedFeature ? getFeatureDisplayName(blockedFeature) : '';

  // Determine the title and message
  const getTitle = () => {
    if (reason === 'limit_reached' || (featureStatus && !featureStatus.isPremiumLocked)) {
      return '¡Créditos agotados!';
    }
    if (reason === 'premium_feature' || featureStatus?.isPremiumLocked) {
      return 'Función Premium';
    }
    return 'Mejorá tu experiencia';
  };

  const getMessage = () => {
    if (featureStatus?.isPremiumLocked) {
      return `"${featureName}" es una función exclusiva para usuarios Pro y Premium.`;
    }
    if (featureStatus && !featureStatus.canUse) {
      return `Alcanzaste tu límite mensual de créditos (${featureStatus.used}/${featureStatus.limit}).`;
    }
    return 'Desbloquea más créditos y funciones para tu armario inteligente.';
  };

  // Plans configuration
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      priceLabel: 'Gratis',
      description: 'Para empezar',
      features: [
        '200 créditos IA/mes (Rápido)',
        'Escaneo limitado de prendas',
        'Chat limitado',
        'Items ilimitados en closet',
      ],
      limitations: [
        'Sin probador virtual',
        'Sin generación de imágenes',
        'Sin Style DNA',
      ],
      current: tier === 'free',
      recommended: false,
      color: 'gray',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 2999,
      priceLabel: 'AR$ 2.999/mes',
      description: 'Para fashionistas',
      features: [
        '300 créditos IA/mes',
        'Escaneo ampliado de prendas',
        'Chat ampliado',
        'Probador virtual Rápido',
        'Ultra habilitado',
        'Lookbook Creator',
        'Sin publicidad',
      ],
      limitations: [
        'Style DNA limitado',
      ],
      current: tier === 'pro',
      recommended: true,
      color: 'blue',
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 4999,
      priceLabel: 'AR$ 4.999/mes',
      description: 'Experiencia completa',
      features: [
        '400 créditos IA/mes',
        'Probador virtual Ultra',
        'Más créditos para imagen',
        'Style DNA completo',
        'Acceso anticipado',
        'Soporte prioritario',
      ],
      limitations: [],
      current: tier === 'premium',
      recommended: false,
      color: 'purple',
    },
  ];

  const handleSelectPlan = (planId: string) => {
    if (planId === tier) return;

    // In a real app, this would redirect to payment
    // For now, we'll just show an alert
    // Show a professional "coming soon" message instead of raw alert
    const message = planId === 'pro'
      ? '¡Gracias por tu interés en Pro! El sistema de pagos estará disponible muy pronto.'
      : '¡Gracias por tu interés en Premium! El sistema de pagos estará disponible muy pronto.';

    // Use toast if available, otherwise console for now (alerts removed for production)
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.info(message);
    } else {
      // Fallback for environments without toast or for development
      console.log(message);
      alert(message); // Keeping alert for now as a fallback if toast is not integrated
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
        >
          <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>
            close
          </span>
        </button>

        {/* Header */}
        <div className="p-6 pb-4 text-center border-b border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="material-symbols-rounded text-white" style={{ fontSize: '32px' }}>
              {featureStatus?.isPremiumLocked ? 'lock' : 'rocket_launch'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getTitle()}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {getMessage()}
          </p>
        </div>

        {/* Plans Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`
                relative rounded-xl border-2 p-4 transition-all
                ${plan.current
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : plan.recommended
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                }
              `}
            >
              {/* Recommended badge */}
              {plan.recommended && !plan.current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-500 text-white text-xs font-medium">
                  Recomendado
                </div>
              )}

              {/* Current badge */}
              {plan.current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-medium">
                  Plan actual
                </div>
              )}

              {/* Plan header */}
              <div className="text-center mb-4 mt-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {plan.description}
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {plan.priceLabel}
                  </span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="material-symbols-rounded text-green-500 flex-shrink-0" style={{ fontSize: '18px' }}>
                      check_circle
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
                {plan.limitations.map((limitation, idx) => (
                  <li key={`lim-${idx}`} className="flex items-start gap-2 text-sm">
                    <span className="material-symbols-rounded text-gray-400 flex-shrink-0" style={{ fontSize: '18px' }}>
                      remove_circle
                    </span>
                    <span className="text-gray-500">{limitation}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={plan.current}
                className={`
                  w-full py-2.5 rounded-xl font-medium transition-all
                  ${plan.current
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    : plan.recommended
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : plan.id === 'premium'
                        ? 'bg-purple-500 hover:bg-purple-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {plan.current ? 'Plan actual' : plan.price === 0 ? 'Continuar gratis' : 'Elegir plan'}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Los créditos se reinician el primer día de cada mes.
            {tier === 'free' && ' Podés cancelar en cualquier momento.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// USAGE LIMIT ALERT (inline alert for near-limit warnings)
// ============================================================================

interface UsageLimitAlertProps {
  feature: FeatureType;
  onUpgrade?: () => void;
  className?: string;
}

export function UsageLimitAlert({ feature, onUpgrade, className = '' }: UsageLimitAlertProps) {
  const { checkFeature, setShowUpgradeModal } = useUserCredits();
  const status = checkFeature(feature);

  // Don't show if unlimited or plenty remaining
  if (status.limit === -1 || status.percentUsed < 70) return null;

  const featureName = getFeatureDisplayName(feature);

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      setShowUpgradeModal(true);
    }
  };

  // Premium locked
  if (status.isPremiumLocked) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 ${className}`}>
        <span className="material-symbols-rounded text-purple-500" style={{ fontSize: '20px' }}>
          lock
        </span>
        <span className="flex-1 text-sm text-purple-700 dark:text-purple-300">
          {featureName} es una función Premium
        </span>
        <button
          onClick={handleUpgrade}
          className="px-3 py-1 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
        >
          Upgrade
        </button>
      </div>
    );
  }

  // Limit reached
  if (!status.canUse) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${className}`}>
        <span className="material-symbols-rounded text-red-500" style={{ fontSize: '20px' }}>
          error
        </span>
        <span className="flex-1 text-sm text-red-700 dark:text-red-300">
          Alcanzaste tu límite de {featureName} ({status.used}/{status.limit})
        </span>
        <button
          onClick={handleUpgrade}
          className="px-3 py-1 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          Upgrade
        </button>
      </div>
    );
  }

  // Near limit warning (70-99%)
  return (
    <div className={`flex items-center gap-2 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 ${className}`}>
      <span className="material-symbols-rounded text-yellow-600" style={{ fontSize: '20px' }}>
        warning
      </span>
      <span className="flex-1 text-sm text-yellow-700 dark:text-yellow-300">
        Te quedan {status.remaining} usos de {featureName} este mes
      </span>
      <button
        onClick={handleUpgrade}
        className="px-3 py-1 text-sm font-medium rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
      >
        Ver planes
      </button>
    </div>
  );
}

export default UpgradeModal;
