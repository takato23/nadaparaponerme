import React, { useEffect, useMemo, useState } from 'react';
import * as paymentService from '../src/services/paymentService';
import Loader from './Loader';
import { Card } from './ui/Card';
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

const INSTAGRAM_URL = 'https://instagram.com/ojodeloca.app';
const SUPPORT_EMAIL = 'soporte@ojodeloca.app';

type UpgradeTier = 'plus' | 'pro' | 'premium';

interface PaywallViewProps {
  onClose: () => void;
  featureName?: string;
  featureDescription?: string;
}

const sortOrder: Record<string, number> = { free: 0, plus: 1, pro: 2, premium: 3 };

const PaywallView = ({ onClose, featureName, featureDescription }: PaywallViewProps) => {
  const { data: billingSummary, visiblePlans, isLoading: isBillingLoading, error: billingError } = useBillingSummary();
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currency, setCurrency] = useState<BillingCurrency>('ARS');

  const currentTier = (billingSummary?.current?.plan?.code || 'free') as string;
  const kumbiUsage = getBucketSummary(billingSummary, 'kumbi_messages');

  useEffect(() => {
    analytics.trackEvent('paywall_viewed', {
      surface: 'paywall_view',
      feature_name: featureName || 'general',
    });
  }, [featureName]);

  const plans = useMemo(() => visiblePlans, [visiblePlans]);

  const handleUpgrade = async (tier: UpgradeTier) => {
    try {
      analytics.trackCheckoutStart(tier, currency);
      if (!PAYMENTS_ENABLED) {
        setError('Pagos desactivados. Próximamente vas a poder hacer upgrade.');
        return;
      }

      setUpgrading(true);
      setError('');
      await paymentService.startCheckout(tier, currency);
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      setError('Error al procesar el upgrade. Intentá de nuevo.');
      setUpgrading(false);
    }
  };

  const isCurrentPlan = (planCode: string) => currentTier === planCode;

  const canUpgradeTo = (planCode: string) => {
    if (!PAYMENTS_ENABLED) return false;
    return (sortOrder[planCode] || 0) > (sortOrder[currentTier] || 0);
  };

  if (isBillingLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
        <Card variant="glass" padding="lg" rounded="3xl" className="w-full max-w-md text-center">
          <Loader />
          <p className="mt-4 text-text-secondary dark:text-gray-400">Cargando planes...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 overflow-y-auto">
      <Card variant="glass" padding="none" rounded="3xl" className="w-full max-w-6xl my-8">
        <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-6 py-4 border-b border-gray-200 dark:border-gray-800 z-10 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">Elegí tu plan</h2>
              {featureName && (
                <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                  {featureDescription || `Para acceder a ${featureName}, necesitás activar Plus o superior`}
                </p>
              )}
              <p className="text-xs text-text-secondary dark:text-gray-400 mt-2">
                Empezá gratis para cargar tu armario y usar Kumbi. Subí de plan cuando quieras más profundidad transversal, shopping real y la capa visual premium.
              </p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4">
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
              <span className="text-xs text-text-secondary dark:text-gray-400">Precios en ARS</span>
            )}
          </div>
        </div>

        <div className="p-6">
          {(error || billingError) && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">{error || billingError}</p>
            </div>
          )}

          {kumbiUsage && kumbiUsage.monthly_limit !== -1 && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 border border-teal-200 dark:border-teal-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mensajes de Kumbi este ciclo</span>
                <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                  {kumbiUsage.used} / {kumbiUsage.monthly_limit}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-teal-500 to-cyan-500"
                  style={{ width: `${Math.min(100, (kumbiUsage.used / Math.max(kumbiUsage.monthly_limit, 1)) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Este medidor te muestra cuánto usaste a Kumbi en el ciclo actual.
              </p>
            </div>
          )}

          <div className="mb-6 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(236,242,244,0.8))] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">Transversal</p>
              <h3 className="mt-2 text-lg font-semibold text-text-primary dark:text-gray-100">Kumbi en toda la app</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary dark:text-gray-400">
                La propuesta ya no es abrir un chat aparte: Kumbi vive en home, armario, looks y compras como una capa de ayuda contextual.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(202,232,234,0.84),rgba(223,231,236,0.76))] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2d5f64]">Incluido</p>
              <h3 className="mt-2 text-lg font-semibold text-[#14343b]">Conversación y criterio</h3>
              <p className="mt-2 text-sm leading-6 text-[#24454d]">
                Pedidos como “qué me pongo hoy”, “completame un look” o “qué me falta” viven dentro del bucket de mensajes de Kumbi.
              </p>
            </div>
            <div className="rounded-2xl border border-[#d8c4a4] bg-[linear-gradient(180deg,rgba(255,249,240,0.94),rgba(247,238,222,0.82))] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a5a13]">Upgrade</p>
              <h3 className="mt-2 text-lg font-semibold text-[#4f3511]">Visual premium y shopping real</h3>
              <p className="mt-2 text-sm leading-6 text-[#6a4a21]">
                Cuando el pedido pasa de conversación a try-on, Studio o links reales para comprar, ahí empieza el valor de los planes pagos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan: BillingCatalogPlan) => {
              const isCurrent = isCurrentPlan(plan.code);
              const canUpgrade = canUpgradeTo(plan.code);
              const featureBullets = buildPlanFeatureBullets(plan);
              const shoppingLimit = plan.buckets.find((bucket) => bucket.key === 'shopping_grounded_searches')?.monthly_limit ?? 0;

              return (
                <Card
                  key={plan.code}
                  variant={plan.metadata?.recommended ? 'primary' : 'glass'}
                  padding="lg"
                  rounded="2xl"
                  className={`relative transition-all ${plan.metadata?.recommended ? 'ring-4 ring-primary/20 scale-105' : ''} ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
                >
                  {plan.metadata?.recommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="px-4 py-1 bg-accent-primary text-white text-xs font-bold rounded-full shadow-lg">MÁS POPULAR</span>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute -top-3 right-4">
                      <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        TU PLAN
                      </span>
                    </div>
                  )}

                  <h3 className={`text-2xl font-bold mb-2 ${plan.metadata?.recommended ? 'text-white' : 'text-text-primary dark:text-gray-200'}`}>
                    {plan.display_name}
                  </h3>
                  <p className={`text-sm mb-4 ${plan.metadata?.recommended ? 'text-white/80' : 'text-text-secondary dark:text-gray-400'}`}>
                    {plan.description}
                  </p>

                  <div className="mb-6">
                    <div className={`text-4xl font-bold ${plan.metadata?.recommended ? 'text-white' : 'text-primary'}`}>
                      {getPlanPriceLabel(plan, currency)}
                    </div>
                    {plan.code !== 'free' && (
                      <div className={`text-sm ${plan.metadata?.recommended ? 'text-white/70' : 'text-text-secondary dark:text-gray-400'}`}>
                        por mes
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {featureBullets.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className={`material-symbols-outlined text-lg mt-0.5 ${plan.metadata?.recommended ? 'text-white' : 'text-green-500'}`}>
                          check_circle
                        </span>
                        <span className={`text-sm ${plan.metadata?.recommended ? 'text-white' : 'text-text-primary dark:text-gray-300'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {shoppingLimit > 0 ? (
                    <p className={`text-xs mb-4 ${plan.metadata?.recommended ? 'text-white/80' : 'text-text-secondary dark:text-gray-400'}`}>
                      Incluye shopping con links y precios para completar un look.
                    </p>
                  ) : (
                    <p className={`text-xs mb-4 ${plan.metadata?.recommended ? 'text-white/80' : 'text-text-secondary dark:text-gray-400'}`}>
                      El “dónde comprar esta prenda” queda reservado para planes pagos.
                    </p>
                  )}

                  {plan.code === 'free' ? (
                    isCurrent ? (
                      <button disabled className="w-full py-3 px-6 rounded-xl font-semibold bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed">
                        Plan actual
                      </button>
                    ) : (
                      <button disabled className="w-full py-3 px-6 rounded-xl font-semibold bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed">
                        Gratis
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.code as UpgradeTier)}
                      disabled={!canUpgrade || upgrading}
                      className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${plan.metadata?.recommended
                        ? 'bg-white text-primary hover:bg-gray-100'
                        : 'bg-primary text-white hover:bg-primary/90'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isCurrent ? 'Plan actual' : upgrading ? 'Procesando...' : canUpgrade ? 'Hacer upgrade' : 'No disponible'}
                    </button>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="mt-8 text-center text-sm text-text-secondary dark:text-gray-400">
            <p>¿Necesitás ayuda? Escribinos a <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a></p>
            <p className="mt-2">Seguinos en <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Instagram</a></p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaywallView;
