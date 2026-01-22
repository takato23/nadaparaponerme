/**
 * CreditsDetailView Component - SIMPLIFIED
 *
 * Shows unified AI credits remaining for the month.
 * Simple, clean UI with single credit pool.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCreditStatus, CREDIT_LIMITS, getMonthlyUsage, getFeatureUsageSummary, type FeatureType } from '../services/usageTrackingService';
import { useSubscription } from '../hooks/useSubscription';
import { ADSENSE_CREDITS_SLOT, ADSENSE_ENABLED, REWARDED_ADS_ENABLED, REWARDED_ADS_PROVIDER } from '../src/config/runtime';
import toast from 'react-hot-toast';
import * as analytics from '../src/services/analyticsService';
import AdSenseBanner from './ads/AdSenseBanner';

interface CreditsDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export function CreditsDetailView({ isOpen, onClose, onUpgrade }: CreditsDetailViewProps) {
  const subscription = useSubscription();
  const status = getCreditStatus();
  const monthlyUsage = getMonthlyUsage();
  const featureUsage = getFeatureUsageSummary().filter((entry) => entry.used > 0);

  const featureLabels: Record<FeatureType, string> = {
    outfit_generation: 'Looks',
    clothing_analysis: 'Análisis de prendas',
    fashion_chat: 'Chat de moda',
    virtual_tryon: 'Probador',
    packing_list: 'Maleta inteligente',
    image_generation: 'Diseños IA',
    color_palette: 'Paleta de colores',
    style_dna: 'Style DNA',
    gap_analysis: 'Gaps de armario',
    lookbook: 'Lookbook',
    weather_outfit: 'Look del Clima',
    similar_items: 'Ítems similares',
    shopping_suggestions: 'Compras sugeridas',
    brand_recognition: 'Reconocimiento de marca',
  };

  const monthLabel = (() => {
    try {
      const [year, month] = monthlyUsage.month.split('-').map(Number);
      return new Date(year, month - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    } catch {
      return monthlyUsage.month;
    }
  })();

  if (!isOpen) return null;

  const getProgressColor = () => {
    if (status.limit === -1) return 'bg-emerald-500';
    if (status.percentUsed >= 90) return 'bg-red-500';
    if (status.percentUsed >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusText = () => {
    if (status.limit === -1) return 'Ilimitados';
    if (status.remaining === 0) return 'Sin créditos';
    if (status.remaining <= 5) return 'Casi agotados';
    return 'Disponibles';
  };

  const getStatusColor = () => {
    if (status.limit === -1) return 'text-emerald-500';
    if (status.remaining === 0) return 'text-red-500';
    if (status.remaining <= 5) return 'text-amber-500';
    return 'text-emerald-500';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <span className="material-symbols-rounded text-white" style={{ fontSize: '20px' }}>
                    toll
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Créditos IA
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Se reinician en {status.daysUntilReset} días
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="material-symbols-rounded text-gray-400" style={{ fontSize: '20px' }}>
                  close
                </span>
              </button>
            </div>

            {/* Main Credit Display */}
            <div className="text-center py-6">
              <div className="relative inline-flex items-center justify-center">
                {/* Circular Progress */}
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  {status.limit !== -1 && (
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (status.percentUsed / 100)}`}
                      strokeLinecap="round"
                      className={getProgressColor()}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {status.limit === -1 ? '∞' : status.remaining}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {status.limit === -1 ? 'ilimitados' : `de ${status.limit}`}
                  </span>
                </div>
              </div>

              <p className={`mt-3 text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </p>
            </div>
          </div>

          {/* Info Section */}
          <div className="p-5 space-y-3">
            {/* Low credits alert */}
            {status.limit !== -1 && status.remaining <= 5 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200/70 dark:border-amber-800/50">
                <p className="text-xs text-amber-700 dark:text-amber-200 font-semibold">
                  Te quedan pocos créditos. Considerá usar Rápido o sumar más créditos.
                </p>
              </div>
            )}

            {/* Monthly usage */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Uso del mes</p>
                <span className="text-xs uppercase tracking-wide text-gray-400">{monthLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {status.limit === -1 ? '∞' : `${status.used} / ${status.limit}`} créditos
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {status.limit === -1 ? 'Ilimitados' : `${status.remaining} restantes`}
                </span>
              </div>
            </div>
            {/* Current Plan */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded text-gray-500" style={{ fontSize: '18px' }}>
                  workspace_premium
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">Plan actual</span>
              </div>
              <span className={`text-sm font-semibold ${subscription.tier === 'premium' ? 'text-purple-500' :
                subscription.tier === 'pro' ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'
                }`}>
                {subscription.tier === 'premium' ? 'Premium' :
                  subscription.tier === 'pro' ? 'Pro' : 'Gratis'}
              </span>
            </div>

            {/* Credits per plan */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Créditos por plan:</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className={`p-2 rounded-lg ${subscription.tier === 'free' ? 'bg-primary/10 ring-1 ring-primary' : ''}`}>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{CREDIT_LIMITS.free}</p>
                  <p className="text-xs text-gray-500">Free</p>
                </div>
                <div className={`p-2 rounded-lg ${subscription.tier === 'pro' ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : ''}`}>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{CREDIT_LIMITS.pro}</p>
                  <p className="text-xs text-gray-500">Pro</p>
                </div>
                <div className={`p-2 rounded-lg ${subscription.tier === 'premium' ? 'bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-500' : ''}`}>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{CREDIT_LIMITS.premium}</p>
                  <p className="text-xs text-gray-500">Premium</p>
                </div>
              </div>
            </div>

            {/* What uses credits */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Consumo por acción:</p>
              <div className="flex flex-wrap gap-1.5">
                {['Look (1 crédito)', 'Analizar prenda (1)', 'Chat moda (1)', 'Probador Rápido (1)', 'Probador Ultra (4)'].map((item) => (
                  <span
                    key={item}
                    className="text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Feature usage breakdown */}
            {featureUsage.length > 0 && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Créditos por feature</p>
                <div className="grid grid-cols-2 gap-2">
                  {featureUsage.map((entry) => (
                    <div key={entry.feature} className="flex items-center justify-between rounded-lg bg-white/80 dark:bg-gray-700/60 px-2 py-1 text-xs text-gray-600 dark:text-gray-300">
                      <span className="truncate">{featureLabels[entry.feature] || entry.feature}</span>
                      <span className="font-semibold">{entry.used}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estimated cost */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Costo estimado</p>
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                <span>Rápido: {status.used} créditos</span>
                <span>Ultra: {Math.floor(status.used / 4)} usos</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">Equivalencia: 1 crédito = Rápido, 4 créditos = Ultra.</p>
            </div>

            {/* Rewarded ads */}
            {ADSENSE_ENABLED && ADSENSE_CREDITS_SLOT && subscription.tier === 'free' && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Publicidad</p>
                <AdSenseBanner slot={ADSENSE_CREDITS_SLOT} className="rounded-lg overflow-hidden" />
              </div>
            )}

            {REWARDED_ADS_ENABLED && subscription.tier !== 'premium' && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Ganá créditos viendo anuncios
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Disponible pronto con {REWARDED_ADS_PROVIDER}. Te suma créditos extras sin pagar.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      analytics.trackRewardedAdClick(REWARDED_ADS_PROVIDER);
                      toast('Próximamente');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                  >
                    Ver anuncio
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {subscription.tier !== 'premium' && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={onUpgrade}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 transition-all shadow-lg shadow-violet-500/25"
              >
                {status.remaining === 0 ? 'Obtener más créditos' : 'Upgrade para más créditos'}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CreditsDetailView;
