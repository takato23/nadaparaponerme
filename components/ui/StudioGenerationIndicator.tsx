/**
 * StudioGenerationIndicator
 *
 * A floating indicator that shows when a studio generation is in progress.
 * Displayed globally so users know their generation is running even when
 * they navigate away from the Studio.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStudioGenerationStatus } from '../../contexts/StudioGenerationContext';
import { ROUTES } from '../../src/routes';

export function StudioGenerationIndicator() {
  const { isGenerating, hasPendingResults, pendingCount } = useStudioGenerationStatus();
  const navigate = useNavigate();

  const showIndicator = isGenerating || hasPendingResults;

  if (!showIndicator) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onClick={() => navigate(ROUTES.STUDIO)}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full
                   bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium
                   shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50
                   hover:scale-105 active:scale-95 transition-all cursor-pointer"
        aria-label={isGenerating ? 'Generación en progreso' : `${pendingCount} look${pendingCount > 1 ? 's' : ''} listo${pendingCount > 1 ? 's' : ''}`}
      >
        {isGenerating ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </motion.div>
            <span>Generando...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-rounded text-lg">auto_awesome</span>
            <span>
              {pendingCount} look{pendingCount > 1 ? 's' : ''} listo{pendingCount > 1 ? 's' : ''}
            </span>
          </>
        )}
      </motion.button>
    </AnimatePresence>
  );
}

export default StudioGenerationIndicator;
