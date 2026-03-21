import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import * as paymentService from '../src/services/paymentService';
import { ROUTES } from '../src/routes';
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

const EASE_STANDARD: [number, number, number, number] = [0.22, 1, 0.36, 1];
const INSTAGRAM_URL = 'https://instagram.com/ojodeloca.app';
const SUPPORT_EMAIL = 'soporte@ojodeloca.app';
const tierOrder: Record<string, number> = { free: 0, plus: 1, pro: 2, premium: 3 };

type UpgradeTier = 'plus' | 'pro' | 'premium';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_STANDARD } },
};

function PricingSkeletonCard({ highlight = false }: { highlight?: boolean }) {
  return (
    <div
      className={`relative flex flex-col rounded-3xl border-2 p-5 ${
        highlight ? 'border-teal-300 bg-white shadow-xl shadow-teal-500/10' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 rounded-full bg-gray-200" />
      <div className="mt-4 h-6 w-24 animate-pulse rounded-full bg-gray-200" />
      <div className="mt-3 h-4 w-40 animate-pulse rounded-full bg-gray-100" />
      <div className="mt-6 h-10 w-36 animate-pulse rounded-2xl bg-gray-200" />
      <div className="mt-6 min-h-[11rem] space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="mt-1 h-4 w-4 rounded-full bg-gray-200" />
            <div className="h-4 flex-1 animate-pulse rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="mt-4 h-4 w-48 animate-pulse rounded-full bg-gray-100" />
      <div className="mt-6 h-12 w-full animate-pulse rounded-2xl bg-gray-200" />
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { data: billingSummary, visiblePlans, isLoading: isBillingLoading, error: billingError } = useBillingSummary();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<BillingCurrency>('ARS');

  const currentTier = billingSummary?.current?.plan?.code || 'free';
  const kumbiUsage = getBucketSummary(billingSummary, 'kumbi_messages');

  useEffect(() => {
    analytics.trackEvent('paywall_viewed', {
      surface: 'pricing_page',
      tier: currentTier,
    });
  }, [currentTier]);

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

  const usagePercentage = !kumbiUsage || kumbiUsage.monthly_limit <= 0 || kumbiUsage.monthly_limit === -1
    ? 0
    : Math.min(100, (kumbiUsage.used / kumbiUsage.monthly_limit) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-pink-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            <span className="material-symbols-rounded text-xl">arrow_back</span>
            <span className="text-sm font-medium">Volver</span>
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Planes y precios</h1>
          <div className="w-20" />
        </div>
      </header>

      <motion.main variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto px-4 py-8 pb-24">
        <motion.section variants={itemVariants} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Planes para organizar, consultar y guardar mejores looks</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Empezá gratis para cargar tu armario, analizar tus prendas y usar Kumbi. Subí de plan cuando quieras shopping real con links y precios.
          </p>
        </motion.section>

        <motion.section variants={itemVariants} className="text-center mb-8">
          {USD_ENABLED ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 p-1 text-xs">
              <button type="button" onClick={() => setCurrency('ARS')} className={`px-3 py-1 rounded-full ${currency === 'ARS' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>ARS</button>
              <button type="button" onClick={() => setCurrency('USD')} className={`px-3 py-1 rounded-full ${currency === 'USD' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>USD</button>
            </div>
          ) : (
            <span className="text-sm text-gray-500">Precios en pesos argentinos</span>
          )}
        </motion.section>

        {kumbiUsage && kumbiUsage.monthly_limit !== -1 && (
          <motion.section variants={itemVariants} className="max-w-md mx-auto mb-10">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 border border-teal-200 dark:border-teal-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mensajes de Kumbi este ciclo</span>
                <span className="text-sm font-bold text-teal-600 dark:text-teal-400">{kumbiUsage.used} / {kumbiUsage.monthly_limit}</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${usagePercentage >= 90 ? 'bg-red-500' : usagePercentage >= 70 ? 'bg-yellow-500' : 'bg-gradient-to-r from-teal-500 to-cyan-500'}`} style={{ width: `${usagePercentage}%` }} />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Tus consultas con Kumbi se cuentan por ciclo para que sepas cuándo te conviene subir de plan.</p>
            </div>
          </motion.section>
        )}

        {(error || billingError) && (
          <motion.div variants={itemVariants} className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error || billingError}</p>
          </motion.div>
        )}

        {isBillingLoading ? (
          <motion.section variants={itemVariants} className="max-w-5xl mx-auto">
            <div className="mb-6 text-center text-sm text-gray-500">Cargando catálogo...</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <PricingSkeletonCard />
              <PricingSkeletonCard highlight />
              <PricingSkeletonCard />
            </div>
          </motion.section>
        ) : (
          <motion.section variants={itemVariants} className="max-w-5xl mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {visiblePlans.map((plan: BillingCatalogPlan) => {
                const isCurrentPlan = plan.code === currentTier;
                const isPopular = Boolean(plan.metadata?.recommended);
                const featureBullets = buildPlanFeatureBullets(plan);
                const shoppingLimit = plan.buckets.find((bucket) => bucket.key === 'shopping_grounded_searches')?.monthly_limit ?? 0;

                return (
                  <motion.div
                    key={plan.code}
                    whileHover={{ y: -4 }}
                    className={`relative flex flex-col p-5 rounded-3xl border-2 transition-all duration-300 ${isCurrentPlan
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                      : isPopular
                        ? 'border-teal-500 bg-white dark:bg-gray-800 shadow-xl shadow-teal-500/10'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                  >
                    {isPopular && !isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs font-bold rounded-full shadow-lg">
                        Recomendado
                      </div>
                    )}

                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-teal-500 text-white text-xs font-bold rounded-full">
                        Tu plan actual
                      </div>
                    )}

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-2">{plan.display_name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>

                    <div className="mt-4 mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">{getPlanPriceLabel(plan, currency)}</span>
                        {plan.code !== 'free' && <span className="text-sm text-gray-500 dark:text-gray-400">/mes</span>}
                      </div>
                    </div>

                    <ul className="min-h-[11rem] flex-1 space-y-3 mb-6">
                      {featureBullets.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="material-symbols-rounded text-lg text-green-500 mt-0.5">check_circle</span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      {shoppingLimit > 0 ? 'Incluye shopping con links y precios cuando necesites completar un look.' : 'El “dónde comprar esta prenda” queda reservado para planes pagos.'}
                    </p>

                    <button
                      onClick={() => !isCurrentPlan && plan.code !== 'free' ? handleUpgrade(plan.code as UpgradeTier) : undefined}
                      disabled={isCurrentPlan || plan.code === 'free' || !PAYMENTS_ENABLED || isLoading !== null || (tierOrder[plan.code] || 0) <= (tierOrder[currentTier] || 0)}
                      className={`w-full mt-auto px-4 py-3 rounded-2xl font-semibold transition-colors ${isCurrentPlan
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'} disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {isCurrentPlan ? 'Plan actual' : isLoading === plan.code ? 'Procesando...' : plan.code === 'free' ? 'Gratis' : 'Hacer upgrade'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        <motion.section variants={itemVariants} className="text-center mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">¿Necesitás ayuda con tu suscripción?</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">{SUPPORT_EMAIL}</a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 dark:text-teal-400 hover:underline">Instagram</a>
            <Link to={ROUTES.HOME} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">Volver al inicio</Link>
          </div>
        </motion.section>
      </motion.main>
    </div>
  );
}
