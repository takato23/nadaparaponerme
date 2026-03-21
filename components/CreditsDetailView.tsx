import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBillingSummary } from '../hooks/useBillingSummary';
import { getBucketSummary, isFeatureEnabled } from '../src/services/billingCatalogService';
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
  const { data, isLoading } = useBillingSummary();
  const kumbiUsage = useMemo(() => getBucketSummary(data, 'kumbi_messages'), [data]);
  const shoppingUsage = useMemo(() => getBucketSummary(data, 'shopping_grounded_searches'), [data]);
  const tryOnUsage = useMemo(() => getBucketSummary(data, 'tryons'), [data]);
  const planName = data?.usage?.plan?.display_name || data?.current?.plan?.display_name || 'Free';
  const cycleEnd = data?.usage?.cycle?.end || data?.current?.cycle?.end || null;
  const shoppingEnabled = isFeatureEnabled(data, 'shopping_real');

  const daysUntilReset = useMemo(() => {
    if (!cycleEnd) return 0;
    const diff = new Date(cycleEnd).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [cycleEnd]);

  if (!isOpen) return null;

  const getProgressColor = () => {
    if (!kumbiUsage || kumbiUsage.monthly_limit === -1) return 'bg-emerald-500';
    const percentUsed = (kumbiUsage.used / Math.max(kumbiUsage.monthly_limit, 1)) * 100;
    if (percentUsed >= 90) return 'bg-red-500';
    if (percentUsed >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const kumbiRemaining = !kumbiUsage || kumbiUsage.monthly_limit === -1
    ? -1
    : Math.max(0, kumbiUsage.monthly_limit - kumbiUsage.used - kumbiUsage.reserved);

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
          className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <span className="material-symbols-rounded text-white" style={{ fontSize: '20px' }}>forum</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Uso de Kumbi</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Se reinicia en {daysUntilReset} días</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <span className="material-symbols-rounded text-gray-400" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            <div className="text-center py-6">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-gray-700" />
                  {kumbiUsage && kumbiUsage.monthly_limit !== -1 && (
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * ((kumbiUsage.used / Math.max(kumbiUsage.monthly_limit, 1)) || 0)}`}
                      strokeLinecap="round"
                      className={getProgressColor()}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{isLoading ? '...' : kumbiRemaining === -1 ? '∞' : kumbiRemaining}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{kumbiUsage?.monthly_limit === -1 ? 'ilimitados' : `de ${kumbiUsage?.monthly_limit ?? 0}`}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-3 overflow-y-auto flex-1">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Plan actual</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{planName}</span>
              </div>
            </div>

            {kumbiUsage && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Mensajes de Kumbi</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {kumbiUsage.monthly_limit === -1 ? 'Ilimitados' : `${kumbiUsage.used} / ${kumbiUsage.monthly_limit}`}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Reservados ahora: {kumbiUsage.reserved}</p>
              </div>
            )}

            {shoppingUsage && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Shopping real</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {shoppingUsage.monthly_limit === -1 ? 'Ilimitado' : `${shoppingUsage.used} / ${shoppingUsage.monthly_limit}`}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {shoppingEnabled ? 'Incluye links y precios reales.' : 'No incluido en tu plan actual.'}
                </p>
              </div>
            )}

            {tryOnUsage && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Try-ons</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {tryOnUsage.monthly_limit === -1 ? 'Ilimitado' : `${tryOnUsage.used} / ${tryOnUsage.monthly_limit}`}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Bucket separado para imágenes premium.</p>
              </div>
            )}

            {!shoppingEnabled && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200/70 dark:border-amber-800/50">
                <p className="text-xs text-amber-700 dark:text-amber-200 font-semibold">
                  Tu plan actual no incluye shopping real con links y precios. Kumbi igual puede orientarte qué buscar.
                </p>
              </div>
            )}

            {ADSENSE_ENABLED && ADSENSE_CREDITS_SLOT && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Publicidad</p>
                <AdSenseBanner slot={ADSENSE_CREDITS_SLOT} className="rounded-lg overflow-hidden" />
              </div>
            )}

            {REWARDED_ADS_ENABLED && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Ganá usos viendo anuncios</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Disponible pronto con {REWARDED_ADS_PROVIDER}.</p>
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

          <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <button
              onClick={onUpgrade}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 transition-all shadow-lg shadow-violet-500/25"
            >
              Ver planes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
