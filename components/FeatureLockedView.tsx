import React from 'react';
import { Card } from './ui/Card';

interface FeatureLockedViewProps {
  featureName: string;
  featureIcon: string;
  description: string;
  requiredTier: 'Pro' | 'Premium';
  onUpgrade: () => void;
  onClose: () => void;
}

/**
 * Small modal shown when user tries to access a locked feature
 * Shows upgrade prompt without full paywall
 */
const FeatureLockedView = ({
  featureName,
  featureIcon,
  description,
  requiredTier,
  onUpgrade,
  onClose,
}: FeatureLockedViewProps) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in">
      <Card variant="glass" padding="none" rounded="3xl" className="w-full max-w-md overflow-hidden">
        {/* Icon Header */}
        <div className="relative bg-gradient-to-br from-primary/20 to-accent-primary/20 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center backdrop-blur-sm">
            <span className="material-symbols-outlined text-primary text-5xl">{featureIcon}</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200 mb-2">
            {featureName}
          </h2>
          <p className="text-text-secondary dark:text-gray-400">
            {description}
          </p>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-text-primary dark:text-gray-200 text-lg">
              close
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Required Tier Badge */}
          <Card variant="default" padding="md" rounded="xl" className="text-center bg-gradient-to-r from-primary/10 to-accent-primary/10 border border-primary/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">lock</span>
              <span className="font-bold text-primary">Feature {requiredTier}</span>
            </div>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              Necesitás un plan <strong>{requiredTier}</strong> o superior para acceder
            </p>
          </Card>

          {/* Benefits */}
          <div className="space-y-3">
            <h3 className="font-semibold text-text-primary dark:text-gray-200">
              ¿Qué incluye {requiredTier}?
            </h3>
            <ul className="space-y-2">
              {requiredTier === 'Pro' ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                    <span className="text-sm text-text-primary dark:text-gray-300">100 generaciones de outfits por mes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                    <span className="text-sm text-text-primary dark:text-gray-300">Probador virtual con tu foto</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                    <span className="text-sm text-text-primary dark:text-gray-300">AI Fashion Designer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                    <span className="text-sm text-text-primary dark:text-gray-300">Lookbook Creator</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                    <span className="text-sm text-text-primary dark:text-gray-300">Generaciones de IA ilimitadas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                    <span className="text-sm text-text-primary dark:text-gray-300">Style DNA Profile completo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                    <span className="text-sm text-text-primary dark:text-gray-300">Análisis de evolución de estilo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                    <span className="text-sm text-text-primary dark:text-gray-300">Todo lo de Pro incluido</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={onUpgrade}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">rocket_launch</span>
              Ver Planes y Precios
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-text-secondary dark:text-gray-400 font-medium hover:text-text-primary dark:hover:text-gray-300 transition-colors"
            >
              Volver
            </button>
          </div>

          {/* Trust Badge */}
          <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-text-secondary dark:text-gray-400">
              💳 Pago seguro con <strong>MercadoPago</strong> • Cancelá cuando quieras
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FeatureLockedView;
