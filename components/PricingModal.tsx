import React, { useState } from 'react';
import * as paymentService from '../src/services/paymentService';
import { type SubscriptionTier } from '../types-payment';
import { PAYMENTS_ENABLED, USD_ENABLED } from '../src/config/runtime';
import * as analytics from '../src/services/analyticsService';
import { useBillingSummary } from '../hooks/useBillingSummary';
import {
  buildPlanFeatureBullets,
  getBucketSummary,
  getPlanPriceLabel,
  type BillingCatalogPlan,
  type BillingCurrency,
} from '../src/services/billingCatalogService';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  aiGenerationsUsed: number;
  aiGenerationsLimit: number;
  onRefresh?: () => void;
}

type UpgradeTier = 'plus' | 'pro' | 'premium';
const tierOrder: Record<string, number> = { free: 0, plus: 1, pro: 2, premium: 3 };

export function PricingModal({
  isOpen,
  onClose,
}: PricingModalProps) {
  const { data: billingSummary, visiblePlans, isLoading: isBillingLoading, error: billingError } = useBillingSummary();
  const [isLoading, setIsLoading] = useState<SubscriptionTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<BillingCurrency>('ARS');

  const currentTier = (billingSummary?.current?.plan?.code || 'free') as string;
  const kumbiUsage = getBucketSummary(billingSummary, 'kumbi_messages');

  if (!isOpen) return null;

  const handleUpgrade = async (tier: UpgradeTier) => {
    try {
      analytics.trackCheckoutStart(tier, currency);
      if (!PAYMENTS_ENABLED) {
        setError('Pagos desactivados. Próximamente vas a poder hacer upgrade.');
        return;
      }

      setIsLoading(tier);
      setError(null);
      await paymentService.startCheckout(tier, currency);
    } catch (err) {
      console.error('Error creating payment:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar el pago');
      setIsLoading(null);
    }
  };

  if (isBillingLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 text-center">
          Cargando planes...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-800/50">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Elegí tu plan</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Pricing y límites leídos desde billing-summary para una Kumbi transversal a toda la app.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Cerrar">
            <span className="material-symbols-rounded text-2xl text-gray-500">close</span>
          </button>
        </div>

        <div className="px-6 pt-4">
          {USD_ENABLED ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 p-1 text-xs">
              <button type="button" onClick={() => setCurrency('ARS')} className={`px-3 py-1 rounded-full ${currency === 'ARS' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                ARS
              </button>
              <button type="button" onClick={() => setCurrency('USD')} className={`px-3 py-1 rounded-full ${currency === 'USD' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                USD
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Precios en ARS</span>
          )}
        </div>

        {kumbiUsage && kumbiUsage.monthly_limit !== -1 && (
          <div className="mx-6 mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mensajes de Kumbi este ciclo</span>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{kumbiUsage.used} / {kumbiUsage.monthly_limit}</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-purple-500 to-pink-500"
                style={{ width: `${Math.min(100, (kumbiUsage.used / Math.max(kumbiUsage.monthly_limit, 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="mx-6 mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Home + armario</p>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Kumbi entra en contexto para destrabar decisiones rápidas sin obligarte a cambiar de vista.
            </p>
          </div>
          <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-teal-50/80 dark:bg-teal-900/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">Incluido</p>
            <p className="mt-2 text-sm leading-6 text-teal-900 dark:text-teal-100/80">
              Los mensajes de Kumbi cubren ayuda conversacional y recomendaciones base en toda la experiencia.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Upgrade</p>
            <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100/80">
              Las salidas caras, como try-on, Studio y shopping con links reales, son las que justifican subir de plan.
            </p>
          </div>
        </div>

        {(error || billingError) && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error || billingError}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 p-6 md:p-8">
          {visiblePlans.map((plan: BillingCatalogPlan) => {
            const isCurrentPlan = plan.code === currentTier;
            const isPopular = Boolean(plan.metadata?.recommended);
            const featureBullets = buildPlanFeatureBullets(plan);

            return (
              <div
                key={plan.code}
                className={`relative flex flex-col p-6 rounded-2xl border-2 transition-all duration-300 ${isCurrentPlan
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : isPopular
                    ? 'border-pink-500 bg-white dark:bg-gray-800 shadow-lg scale-105'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                {isPopular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold rounded-full">
                    Más popular
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                    Tu plan
                  </div>
                )}

                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.display_name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>

                <div className="mt-4 mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{getPlanPriceLabel(plan, currency)}</span>
                    {plan.code !== 'free' && <span className="text-sm text-gray-500 dark:text-gray-400">/mes</span>}
                  </div>
                </div>

                <ul className="flex-1 space-y-3 mb-6">
                  {featureBullets.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="material-symbols-rounded text-lg text-green-500 mt-0.5">check_circle</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => !isCurrentPlan && plan.code !== 'free' ? handleUpgrade(plan.code as UpgradeTier) : undefined}
                  disabled={isCurrentPlan || plan.code === 'free' || !PAYMENTS_ENABLED || isLoading !== null || (tierOrder[plan.code] || 0) <= (tierOrder[currentTier] || 0)}
                  className="w-full py-3 px-4 rounded-xl font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCurrentPlan ? 'Plan actual' : isLoading === plan.code ? 'Procesando...' : plan.code === 'free' ? 'Gratis' : 'Hacer upgrade'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
