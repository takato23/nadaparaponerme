/**
 * PricingPage - Standalone Pricing Page
 * 
 * Full-page component for /pricing and /planes routes.
 * Displays subscription plans and handles upgrade flow via MercadoPago.
 */

import React, { useState } from 'react';
    import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import * as paymentService from '../src/services/paymentService';
    import { useSubscription } from '../hooks/useSubscription';
    import { ROUTES } from '../src/routes';
import {
    SUBSCRIPTION_PLANS,
    type SubscriptionTier,
    type SubscriptionPlan
} from '../types-payment';
import { PAYMENTS_ENABLED, USD_ENABLED } from '../src/config/runtime';
import * as analytics from '../src/services/analyticsService';

// ============================================================================
// CONSTANTS
// ============================================================================

const PLANS: SubscriptionPlan[] = SUBSCRIPTION_PLANS;
const EASE_STANDARD: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Animation variants
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_STANDARD } }
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function PricingPage() {
    const navigate = useNavigate();
    const subscription = useSubscription();
    const [isLoading, setIsLoading] = useState<SubscriptionTier | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');

    const currentTier = subscription.tier;
    const aiGenerationsUsed = subscription.aiGenerationsUsed;
    const aiGenerationsLimit = subscription.aiGenerationsLimit;

    const handleUpgrade = async (tier: SubscriptionTier) => {
        if (tier === 'free' || tier === currentTier) return;

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

    const getButtonText = (plan: SubscriptionPlan) => {
        if (plan.id === currentTier) return 'Plan actual';
        if (plan.id === 'free') return 'Gratis';
        if (isLoading === plan.id) return 'Procesando...';

        const tierOrder = { free: 0, pro: 1, premium: 2 };
        if (tierOrder[plan.id] < tierOrder[currentTier]) return 'Downgrade';

        return 'Mejorar Plan';
    };

    const isButtonDisabled = (plan: SubscriptionPlan) => {
        if (plan.id === currentTier) return true;
        if (plan.id === 'free') return true;
        if (!PAYMENTS_ENABLED) return true;
        if (isLoading !== null) return true;
        return false;
    };

    const usagePercentage = aiGenerationsLimit === -1
        ? 0
        : Math.min(100, (aiGenerationsUsed / aiGenerationsLimit) * 100);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <span className="material-symbols-rounded text-xl">arrow_back</span>
                        <span className="text-sm font-medium">Volver</span>
                    </button>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                        Planes y precios
                    </h1>
                    <div className="w-20" /> {/* Spacer for centering */}
                </div>
            </header>

            <motion.main
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="max-w-6xl mx-auto px-4 py-8 pb-24"
            >
                {/* Hero */}
                <motion.section variants={itemVariants} className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Elegí tu plan
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Desbloqueá todo el potencial de tu asistente de moda personal con IA
                    </p>
                </motion.section>

                {/* Currency indicator */}
                <motion.section variants={itemVariants} className="text-center mb-8">
                    {USD_ENABLED ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setCurrency('ARS')}
                                className={`px-3 py-1 rounded-full ${currency === 'ARS' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                                ARS
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrency('USD')}
                                className={`px-3 py-1 rounded-full ${currency === 'USD' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                                USD
                            </button>
                        </div>
                    ) : (
                        <span className="text-sm text-gray-500">Precios en pesos argentinos</span>
                    )}
                </motion.section>

                {/* Current Usage */}
                {aiGenerationsLimit !== -1 && (
                    <motion.section variants={itemVariants} className="max-w-md mx-auto mb-10">
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Uso este mes
                                </span>
                                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                    {aiGenerationsUsed} / {aiGenerationsLimit === -1 ? '∞' : aiGenerationsLimit} créditos
                                </span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${usagePercentage >= 90
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
                                    ⚠️ Te quedan pocos créditos. Considerá hacer upgrade.
                                </p>
                            )}
                        </div>
                    </motion.section>
                )}

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    >
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                )}

                {!PAYMENTS_ENABLED && !error && (
                    <motion.div
                        variants={itemVariants}
                        className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                    >
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            🔒 Por ahora, los pagos están desactivados. Podés usar la app en modo Free mientras terminamos de validar el checkout.
                        </p>
                    </motion.div>
                )}

                {/* Plans Grid */}
                <motion.section variants={itemVariants}>
                    <div className="grid md:grid-cols-3 gap-6">
                        {PLANS.map((plan) => {
                            const isCurrentPlan = plan.id === currentTier;
                            const isPopular = plan.popular;

                            return (
                                <motion.div
                                    key={plan.id}
                                    whileHover={{ y: -4 }}
                                    className={`relative flex flex-col p-6 rounded-3xl border-2 transition-all duration-300 ${isCurrentPlan
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                        : isPopular
                                            ? 'border-pink-500 bg-white dark:bg-gray-800 shadow-xl shadow-pink-500/20'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                >
                                    {/* Popular Badge */}
                                    {isPopular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold rounded-full shadow-lg">
                                            ✨ Más popular
                                        </div>
                                    )}

                                    {/* Current Plan Badge */}
                                    {isCurrentPlan && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                                            Tu plan actual
                                        </div>
                                    )}

                                    {/* Plan Name */}
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                        {plan.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {plan.description}
                                    </p>

                                    {/* Price */}
                                    <div className="mt-6 mb-8">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-bold text-gray-900 dark:text-white">
                                                {(currency === 'ARS' ? plan.price_monthly_ars : plan.price_monthly_usd) === 0
                                                    ? 'Gratis'
                                                    : currency === 'ARS'
                                                        ? `$${plan.price_monthly_ars.toLocaleString('es-AR')}`
                                                        : `US$ ${plan.price_monthly_usd.toLocaleString('en-US')}`}
                                            </span>
                                            {(currency === 'ARS' ? plan.price_monthly_ars : plan.price_monthly_usd) > 0 && (
                                                <span className="text-sm text-gray-500 dark:text-gray-400">/mes</span>
                                            )}
                                        </div>
                                        {currency === 'ARS' && plan.price_monthly_usd > 0 && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                ~USD ${plan.price_monthly_usd}
                                            </p>
                                        )}
                                    </div>

                                    {/* Features */}
                                    <ul className="flex-1 space-y-3 mb-8">
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
                                        className={`w-full py-4 px-6 rounded-2xl font-semibold text-sm transition-all duration-200 ${isCurrentPlan
                                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                            : plan.id === 'free'
                                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                                                : isPopular
                                                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-lg hover:shadow-xl hover:scale-[1.02]'
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
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.section>

                {/* Credits explanation */}
                <motion.section variants={itemVariants} className="mt-12 text-center">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        ¿Cómo funcionan los créditos?
                    </h4>
                    <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <span className="text-2xl">⚡</span>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-2">Rápido</p>
                            <p className="text-xs text-gray-500">1 crédito por generación</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <span className="text-2xl">✨</span>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-2">Ultra</p>
                            <p className="text-xs text-gray-500">4 créditos por generación</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <span className="text-2xl">🔄</span>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-2">Reset</p>
                            <p className="text-xs text-gray-500">Se renuevan cada mes</p>
                        </div>
                    </div>
                </motion.section>

                {/* Footer */}
                <motion.section variants={itemVariants} className="mt-12 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        {currency === 'USD'
                            ? 'Pagos procesados de forma segura por Paddle. Podés cancelar en cualquier momento.'
                            : 'Pagos procesados de forma segura por MercadoPago. Podés cancelar en cualquier momento.'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <Link to={ROUTES.TERMS} className="hover:text-gray-700 dark:hover:text-gray-200 underline underline-offset-4">
                            Términos
                        </Link>
                        <Link to={ROUTES.PRIVACY} className="hover:text-gray-700 dark:hover:text-gray-200 underline underline-offset-4">
                            Privacidad
                        </Link>
                        <Link to={ROUTES.REFUND} className="hover:text-gray-700 dark:hover:text-gray-200 underline underline-offset-4">
                            Reembolsos
                        </Link>
                    </div>
                </motion.section>
            </motion.main>
        </div>
    );
}
