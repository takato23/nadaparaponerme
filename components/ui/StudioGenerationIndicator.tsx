/**
 * AIGenerationIndicator
 *
 * A floating indicator that shows AI generation status globally.
 * Shows:
 * - Current generation in progress
 * - Queue length if multiple operations queued
 * - Retry status with countdown
 * - Completed results waiting to be viewed
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAIGenerationStatus, useAIGeneration } from '../../contexts/AIGenerationContext';
import { ROUTES } from '../../src/routes';

const TYPE_LABELS: Record<string, { label: string; icon: string; route: string }> = {
  studio: { label: 'Look', icon: 'auto_awesome', route: ROUTES.STUDIO },
  outfit: { label: 'Outfit', icon: 'checkroom', route: ROUTES.HOME },
  packing: { label: 'Packing', icon: 'luggage', route: ROUTES.HOME },
  'style-dna': { label: 'Style DNA', icon: 'fingerprint', route: ROUTES.HOME },
  'color-palette': { label: 'Paleta', icon: 'palette', route: ROUTES.HOME },
};

export function StudioGenerationIndicator() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isProcessing,
    queueLength,
    hasCompletedRequests,
    activeType,
    activeStatus,
    retryCount,
  } = useAIGenerationStatus();

  const { completedRequests, clearAllCompleted } = useAIGeneration();
  const [isExpanded, setIsExpanded] = useState(false);

  // Count completed by type
  const completedCount = completedRequests.filter(r => r.status === 'completed').length;
  const failedCount = completedRequests.filter(r => r.status === 'failed').length;

  // Don't show if nothing is happening
  const showIndicator = isProcessing || queueLength > 0 || completedCount > 0 || failedCount > 0;

  // Auto-collapse when navigating to relevant route
  useEffect(() => {
    if (activeType && location.pathname === TYPE_LABELS[activeType]?.route) {
      setIsExpanded(false);
    }
  }, [location.pathname, activeType]);

  if (!showIndicator) return null;

  const typeInfo = activeType ? TYPE_LABELS[activeType] : null;
  const isRetrying = activeStatus === 'retrying';

  const handleClick = () => {
    if (isExpanded) {
      setIsExpanded(false);
    } else if (completedCount > 0 || failedCount > 0) {
      setIsExpanded(true);
    } else if (typeInfo) {
      navigate(typeInfo.route);
    }
  };

  const handleNavigate = (route: string) => {
    navigate(route);
    setIsExpanded(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed bottom-24 right-4 z-50"
      >
        {/* Main Button */}
        <motion.button
          onClick={handleClick}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-medium
                     shadow-lg transition-all cursor-pointer
                     ${isRetrying
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30 hover:shadow-amber-500/50'
              : failedCount > 0 && !isProcessing
                ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-red-500/30 hover:shadow-red-500/50'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-purple-500/30 hover:shadow-purple-500/50'
            }
                     hover:scale-105 active:scale-95`}
          aria-label="Estado de creaciones IA"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isProcessing ? (
            <>
              {isRetrying ? (
                <span className="material-symbols-rounded text-lg animate-pulse">refresh</span>
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </motion.div>
              )}
              <span>
                {isRetrying
                  ? `Reintentando (${retryCount}/3)...`
                  : typeInfo
                    ? `Generando ${typeInfo.label}...`
                    : 'Generando...'
                }
              </span>
              {queueLength > 1 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  +{queueLength - 1}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="material-symbols-rounded text-lg">
                {failedCount > 0 ? 'error' : 'check_circle'}
              </span>
              <span>
                {completedCount > 0 && `${completedCount} listo${completedCount > 1 ? 's' : ''}`}
                {completedCount > 0 && failedCount > 0 && ' · '}
                {failedCount > 0 && `${failedCount} fallido${failedCount > 1 ? 's' : ''}`}
              </span>
              <span className="material-symbols-rounded text-sm">
                {isExpanded ? 'expand_more' : 'expand_less'}
              </span>
            </>
          )}
        </motion.button>

        {/* Expanded Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full right-0 mb-2 w-72 bg-white dark:bg-slate-800
                         rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700
                         overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Generaciones
                </span>
                {(completedCount > 0 || failedCount > 0) && (
                  <button
                    onClick={() => {
                      clearAllCompleted();
                      setIsExpanded(false);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400
                               dark:hover:text-gray-200 transition-colors"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>

              {/* Results List */}
              <div className="max-h-64 overflow-y-auto">
                {completedRequests.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No hay creaciones recientes
                  </div>
                ) : (
                  completedRequests.map((request) => {
                    const info = TYPE_LABELS[request.type] || { label: 'Generación', icon: 'auto_awesome', route: ROUTES.HOME };
                    const isCompleted = request.status === 'completed';
                    const isFailed = request.status === 'failed';

                    return (
                      <button
                        key={request.id}
                        onClick={() => isCompleted && handleNavigate(info.route)}
                        disabled={isFailed}
                        className={`w-full px-4 py-3 flex items-center gap-3
                                   border-b border-gray-50 dark:border-slate-700/50 last:border-0
                                   ${isCompleted
                            ? 'hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer'
                            : 'opacity-60 cursor-not-allowed'
                          }
                                   transition-colors text-left`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                                        ${isCompleted
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-500'
                          }`}
                        >
                          <span className="material-symbols-rounded">
                            {isFailed ? 'error' : info.icon}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {info.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {isFailed
                              ? request.error || 'Error desconocido'
                              : `Hace ${formatTimeAgo(request.completedAt || request.createdAt)}`
                            }
                          </div>
                        </div>
                        {isCompleted && (
                          <span className="material-symbols-rounded text-gray-400">
                            chevron_right
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'segundos';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export default StudioGenerationIndicator;
