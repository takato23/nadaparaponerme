import React from 'react';
import { useUserCredits } from '../hooks/useUserCredits';
import { getFeatureDisplayName, type FeatureType } from '../src/services/usageTrackingService';
import { useBillingSummary } from '../hooks/useBillingSummary';
import { buildPlanFeatureBullets, getPlanPriceLabel, type BillingCatalogPlan } from '../src/services/billingCatalogService';

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
  const { visiblePlans } = useBillingSummary();

  if (!isOpen) return null;

  const featureStatus = blockedFeature ? checkFeature(blockedFeature) : null;
  const featureName = blockedFeature ? getFeatureDisplayName(blockedFeature) : '';

  const getTitle = () => {
    if (reason === 'limit_reached' || (featureStatus && !featureStatus.isPremiumLocked)) {
      return 'Límite alcanzado';
    }
    if (reason === 'premium_feature' || featureStatus?.isPremiumLocked) {
      return 'Función Premium';
    }
    return 'Mejorá tu experiencia';
  };

  const getMessage = () => {
    if (featureStatus?.isPremiumLocked) {
      return `"${featureName}" requiere un plan con acceso premium.`;
    }
    if (featureStatus && !featureStatus.canUse) {
      return `Alcanzaste tu límite actual (${featureStatus.used}/${featureStatus.limit}).`;
    }
    return 'Desbloqueá más mensajes de Kumbi, shopping real y try-ons.';
  };

  const plans = visiblePlans.filter((plan) => plan.code === 'free' || plan.code === 'plus' || plan.code === 'pro');

  const handleSelectPlan = (planCode: string) => {
    if (planCode === tier) return;
    if (typeof window !== 'undefined') {
      onClose();
      window.location.href = '/planes';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl animate-fade-in">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10">
          <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>close</span>
        </button>

        <div className="p-8 pb-6 text-center border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-900/10">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20 transform rotate-3">
            <span className="material-symbols-rounded text-white" style={{ fontSize: '36px' }}>
              {featureStatus?.isPremiumLocked ? 'lock' : 'diamond'}
            </span>
          </div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            {getTitle()}
          </h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
            {getMessage()}
          </p>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/50 dark:bg-black/20">
          {plans.map((plan: BillingCatalogPlan) => {
            const current = plan.code === tier;
            const recommended = Boolean(plan.metadata?.recommended);
            const bullets = buildPlanFeatureBullets(plan);

            return (
              <div
                key={plan.code}
                className={`relative flex flex-col rounded-3xl p-6 transition-all duration-300 ${current
                  ? 'border-2 border-gray-200 bg-white/50 dark:border-gray-800 dark:bg-gray-900/50'
                  : recommended
                    ? 'border-2 border-transparent bg-white dark:bg-gray-800 shadow-xl shadow-purple-500/10 scale-100 hover:scale-[1.02] before:absolute before:inset-0 before:-z-10 before:rounded-3xl before:p-[2px] before:bg-gradient-to-br before:from-pink-500 before:via-purple-500 before:to-indigo-500'
                    : 'border-2 border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900'}
                `}
              >
                {recommended && !current && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] font-bold tracking-widest uppercase shadow-md shadow-pink-500/20">
                    Sugerido
                  </div>
                )}

                {current && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold">
                    Tu plan actual
                  </div>
                )}

                <div className="text-center mb-6 mt-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.display_name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                      {getPlanPriceLabel(plan, 'ARS')}
                    </span>
                  </div>
                </div>

                <ul className="flex-1 space-y-3 mb-6">
                  {bullets.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-rounded text-green-500 flex-shrink-0" style={{ fontSize: '18px' }}>check_circle</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.code)}
                  disabled={current}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 shadow-sm ${current
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none'
                    : recommended
                      ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5'
                      : 'bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-100'
                  }`}
                >
                  {current ? 'Tu plan actual' : plan.code === 'free' ? 'Continuar gratis' : 'Ver planes'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Los buckets de Kumbi, shopping real y try-ons se reinician al inicio de cada ciclo.
          </p>
        </div>
      </div>
    </div>
  );
}

interface UsageLimitAlertProps {
  feature: FeatureType;
  onUpgrade?: () => void;
  className?: string;
}

export function UsageLimitAlert({ feature, onUpgrade, className = '' }: UsageLimitAlertProps) {
  const { checkFeature, setShowUpgradeModal } = useUserCredits();
  const status = checkFeature(feature);

  if (status.limit === -1 || status.percentUsed < 70) return null;

  const featureName = getFeatureDisplayName(feature);

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      setShowUpgradeModal(true);
    }
  };

  return (
    <div className={`p-4 rounded-2xl border ${status.percentUsed >= 90
      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
      : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
    } ${className}`}>
      <div className="flex items-start gap-3">
        <span className="material-symbols-rounded text-xl text-amber-500">warning</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Te quedan pocos usos para {featureName}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Ya usaste {status.used} de {status.limit}. Si querés más capacidad, revisá los planes.
          </p>
          <button onClick={handleUpgrade} className="mt-3 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:underline">
            Ver planes
          </button>
        </div>
      </div>
    </div>
  );
}
