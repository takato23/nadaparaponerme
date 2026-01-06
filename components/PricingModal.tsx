/**
 * PricingModal Component
 *
 * Displays subscription plans and handles upgrade flow via MercadoPago.
 * Shows current plan, usage stats, and upgrade options.
 */

import React, { useState } from 'react';
import { createPaymentPreference } from '../src/services/paymentService';
import type { SubscriptionTier, SubscriptionPlan } from '../types-payment';
import { PAYMENTS_ENABLED, V1_SAFE_MODE } from '../src/config/runtime';

// ============================================================================
// TYPES
// ============================================================================

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  aiGenerationsUsed: number;
  aiGenerationsLimit: number;
  onRefresh?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Para empezar a organizar tu armario',
    price_monthly_ars: 0,
    price_monthly_usd: 0,
    features: [
      'Hasta 50 prendas',
      '10 generaciones de IA/mes',
      'Análisis básico de color',
      'Outfits guardados ilimitados',
    ],
    limits: {
      ai_generations_per_month: 10,
      max_closet_items: 50,
      max_saved_outfits: -1,
      can_use_virtual_tryon: false,
      can_use_ai_designer: false,
      can_use_lookbook: false,
      can_use_style_dna: false,
      can_export_lookbooks: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para fashionistas serios',
    price_monthly_ars: 2999,
    price_monthly_usd: 9.99,
    features: [
      'Prendas ilimitadas',
      '100 generaciones de IA/mes',
      'Probador virtual',
      'AI Fashion Designer',
      'Lookbook Creator',
      'Sin anuncios',
    ],
    limits: {
      ai_generations_per_month: 100,
      max_closet_items: -1,
      max_saved_outfits: -1,
      can_use_virtual_tryon: true,
      can_use_ai_designer: true,
      can_use_lookbook: true,
      can_use_style_dna: false,
      can_export_lookbooks: true,
    },
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Experiencia completa',
    price_monthly_ars: 4999,
    price_monthly_usd: 16.99,
    features: [
      'Todo lo de Pro +',
      'IA ilimitada',
      'Style DNA Profile',
      'Evolución de estilo',
      'Acceso anticipado',
      'Soporte prioritario',
    ],
    limits: {
      ai_generations_per_month: -1,
      max_closet_items: -1,
      max_saved_outfits: -1,
      can_use_virtual_tryon: true,
      can_use_ai_designer: true,
      can_use_lookbook: true,
      can_use_style_dna: true,
      can_export_lookbooks: true,
    },
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function PricingModal({
  isOpen,
  onClose,
  currentTier,
  aiGenerationsUsed,
  aiGenerationsLimit,
}: PricingModalProps) {
  const [isLoading, setIsLoading] = useState<SubscriptionTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (tier === 'free' || tier === currentTier) return;

    try {
      if (V1_SAFE_MODE && !PAYMENTS_ENABLED) {
        setError('Pagos desactivados durante la V1 (beta). Próximamente vas a poder hacer upgrade.');
        return;
      }

      setIsLoading(tier);
      setError(null);

      const preference = await createPaymentPreference(tier, 'ARS');

      // Redirect to MercadoPago checkout
      window.location.href = preference.init_point;
    } catch (err) {
      console.error('Error creating payment:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar el pago');
      setIsLoading(null);
    }
  };

  const getButtonText = (plan: SubscriptionPlan) => {
    if (plan.id === currentTier) return 'Plan actual';
    if (plan.id === 'free') return 'Gratis';
    if (isLoading === plan.id) return 'Procesando...';

    const tierOrder = { free: 0, pro: 1, premium: 2 };
    if (tierOrder[plan.id] < tierOrder[currentTier]) return 'Downgrade';

    return 'Upgrade';
  };

  const isButtonDisabled = (plan: SubscriptionPlan) => {
    if (plan.id === currentTier) return true;
    if (plan.id === 'free') return true;
    if (V1_SAFE_MODE && !PAYMENTS_ENABLED) return true;
    if (isLoading !== null) return true;
    return false;
  };

  const usagePercentage = aiGenerationsLimit === -1
    ? 0
    : Math.min(100, (aiGenerationsUsed / aiGenerationsLimit) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Elegí tu plan
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Desbloqueá todo el potencial de tu asistente de moda
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Cerrar"
          >
            <span className="material-symbols-rounded text-2xl text-gray-500">close</span>
          </button>
        </div>

        {/* Current Usage */}
        {currentTier !== 'premium' && (
          <div className="mx-6 mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Uso este mes
              </span>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                {aiGenerationsUsed} / {aiGenerationsLimit === -1 ? '∞' : aiGenerationsLimit} generaciones
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercentage >= 90
                    ? 'bg-red-500'
                    : usagePercentage >= 70
                    ? 'bg-yellow-500'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            {usagePercentage >= 80 && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                ⚠️ Te quedan pocas generaciones. Considerá hacer upgrade.
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        {V1_SAFE_MODE && !PAYMENTS_ENABLED && !error && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Beta: los pagos están desactivados por seguridad. Podés usar la app en modo Free mientras validamos el checkout.
            </p>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-4 p-6">
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentTier;
            const isPopular = plan.popular;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col p-6 rounded-2xl border-2 transition-all duration-300 ${
                  isCurrentPlan
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : isPopular
                    ? 'border-pink-500 bg-white dark:bg-gray-800 shadow-lg scale-105'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold rounded-full">
                    Más popular
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                    Tu plan
                  </div>
                )}

                {/* Plan Name */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mt-4 mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {plan.price_monthly_ars === 0
                        ? 'Gratis'
                        : `$${plan.price_monthly_ars.toLocaleString('es-AR')}`}
                    </span>
                    {plan.price_monthly_ars > 0 && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">/mes</span>
                    )}
                  </div>
                  {plan.price_monthly_usd > 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      ~USD ${plan.price_monthly_usd}
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="material-symbols-rounded text-lg text-green-500 mt-0.5">
                        check_circle
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isButtonDisabled(plan)}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    isCurrentPlan
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : plan.id === 'free'
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      : isPopular
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-lg hover:shadow-xl'
                      : 'bg-purple-500 text-white hover:bg-purple-600'
                  } ${isLoading === plan.id ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {isLoading === plan.id && (
                    <span className="material-symbols-rounded animate-spin mr-2">
                      progress_activity
                    </span>
                  )}
                  {getButtonText(plan)}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Pagos procesados de forma segura por MercadoPago.
            Podés cancelar en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PricingModal;
