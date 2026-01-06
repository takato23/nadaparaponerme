import React, { useState, useEffect } from 'react';
import type { SubscriptionPlan, Subscription } from '../types-payment';
import * as paymentService from '../src/services/paymentService';
import Loader from './Loader';
import { Card } from './ui/Card';
import { PAYMENTS_ENABLED, V1_SAFE_MODE } from '../src/config/runtime';

interface PaywallViewProps {
  onClose: () => void;
  featureName?: string;  // Which feature triggered the paywall
  featureDescription?: string;
}

const PaywallView = ({ onClose, featureName, featureDescription }: PaywallViewProps) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subscription, availablePlans] = await Promise.all([
        paymentService.getCurrentSubscription(),
        Promise.resolve(paymentService.getSubscriptionPlans()),
      ]);

      setCurrentSubscription(subscription);
      setPlans(availablePlans);
    } catch (err) {
      console.error('Error loading subscription data:', err);
      setError('Error al cargar los planes. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  };

  const handleUpgrade = async (tier: 'pro' | 'premium') => {
    try {
      if (V1_SAFE_MODE && !PAYMENTS_ENABLED) {
        setError('Pagos desactivados durante la V1 (beta). Próximamente vas a poder hacer upgrade.');
        return;
      }

      setUpgrading(true);
      setError('');

      await paymentService.upgradeSubscription(tier);
      // User will be redirected to MercadoPago, so no need to update state
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      setError('Error al procesar el upgrade. Intentá de nuevo.');
      setUpgrading(false);
    }
  };

  const formatPrice = (plan: SubscriptionPlan) => {
    if (plan.price_monthly_ars === 0) return 'Gratis';

    const price = currency === 'ARS' ? plan.price_monthly_ars : plan.price_monthly_usd;
    const currencySymbol = currency === 'ARS' ? '$' : 'US$';

    return `${currencySymbol} ${price.toLocaleString('es-AR')}`;
  };

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.tier === planId;
  };

  const canUpgradeTo = (planId: string) => {
    if (V1_SAFE_MODE && !PAYMENTS_ENABLED) return false;
    if (!currentSubscription) return planId !== 'free';

    const currentTier = currentSubscription.tier;
    const tierOrder = ['free', 'pro', 'premium'];

    return tierOrder.indexOf(planId) > tierOrder.indexOf(currentTier);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
        <Card variant="glass" padding="lg" rounded="3xl" className="w-full max-w-md text-center">
          <Loader />
          <p className="mt-4 text-text-secondary dark:text-gray-400">
            Cargando planes...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 overflow-y-auto">
      <Card variant="glass" padding="none" rounded="3xl" className="w-full max-w-6xl my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-6 py-4 border-b border-gray-200 dark:border-gray-800 z-10 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">
                Elegí tu plan
              </h2>
              {featureName && (
                <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                  {featureDescription || `Para acceder a ${featureName}, necesitás un plan Pro o Premium`}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setCurrency('ARS')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                currency === 'ARS'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-gray-300'
              }`}
            >
              ARS ($)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                currency === 'USD'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-gray-300'
              }`}
            >
              USD (US$)
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
          {V1_SAFE_MODE && !PAYMENTS_ENABLED && !error && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                Beta: pagos desactivados por seguridad. La app funciona en modo Free mientras validamos el checkout.
              </p>
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = isCurrentPlan(plan.id);
              const canUpgrade = canUpgradeTo(plan.id);

              return (
                <Card
                  key={plan.id}
                  variant={plan.popular ? 'primary' : 'glass'}
                  padding="lg"
                  rounded="2xl"
                  className={`relative transition-all ${
                    plan.popular
                      ? 'ring-4 ring-primary/20 scale-105'
                      : ''
                  } ${
                    isCurrent ? 'ring-2 ring-green-500' : ''
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="px-4 py-1 bg-accent-primary text-white text-xs font-bold rounded-full shadow-lg">
                        MÁS POPULAR
                      </span>
                    </div>
                  )}

                  {/* Current Plan Badge */}
                  {isCurrent && (
                    <div className="absolute -top-3 right-4">
                      <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        TU PLAN
                      </span>
                    </div>
                  )}

                  {/* Plan Name */}
                  <h3 className={`text-2xl font-bold mb-2 ${
                    plan.popular ? 'text-white' : 'text-text-primary dark:text-gray-200'
                  }`}>
                    {plan.name}
                  </h3>

                  {/* Plan Description */}
                  <p className={`text-sm mb-4 ${
                    plan.popular ? 'text-white/80' : 'text-text-secondary dark:text-gray-400'
                  }`}>
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className={`text-4xl font-bold ${
                      plan.popular ? 'text-white' : 'text-primary'
                    }`}>
                      {formatPrice(plan)}
                    </div>
                    {plan.price_monthly_ars > 0 && (
                      <div className={`text-sm ${
                        plan.popular ? 'text-white/70' : 'text-text-secondary dark:text-gray-400'
                      }`}>
                        por mes
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className={`material-symbols-outlined text-lg mt-0.5 ${
                          plan.popular ? 'text-white' : 'text-green-500'
                        }`}>
                          check_circle
                        </span>
                        <span className={`text-sm ${
                          plan.popular ? 'text-white' : 'text-text-primary dark:text-gray-300'
                        }`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {plan.id === 'free' ? (
                    isCurrent ? (
                      <button
                        disabled
                        className="w-full py-3 rounded-xl font-semibold bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      >
                        Plan Actual
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-3 rounded-xl font-semibold bg-gray-200 dark:bg-gray-800 text-text-secondary dark:text-gray-400 cursor-not-allowed"
                      >
                        Plan Básico
                      </button>
                    )
                  ) : isCurrent ? (
                    <button
                      disabled
                      className="w-full py-3 rounded-xl font-semibold bg-green-500 text-white cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">check_circle</span>
                      Plan Activo
                    </button>
                  ) : canUpgrade ? (
                    <button
                      onClick={() => handleUpgrade(plan.id as 'pro' | 'premium')}
                      disabled={upgrading}
                      className={`w-full py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
                        plan.popular
                          ? 'bg-white text-primary hover:bg-gray-100'
                          : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                    >
                      {upgrading ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">sync</span>
                          Procesando...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">rocket_launch</span>
                          Mejorar a {plan.name}
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 rounded-xl font-semibold bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    >
                      No disponible
                    </button>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Info Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-text-secondary dark:text-gray-400">
              💳 Pago seguro procesado por <strong>MercadoPago</strong>
            </p>
            <p className="text-xs text-text-secondary dark:text-gray-400 mt-2">
              Cancelá cuando quieras. Sin cargos ocultos.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaywallView;
