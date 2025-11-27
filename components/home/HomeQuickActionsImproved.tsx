import React from 'react';
import { motion } from 'framer-motion';
import { QuickActionConfig } from './featuresConfig';

interface HomeQuickActionsImprovedProps {
  actions: Array<QuickActionConfig & { onClick: () => void }>;
}

/**
 * Quick Actions mejorado con:
 * - Accesibilidad completa (ARIA labels, roles, keyboard navigation)
 * - Animaciones más suaves
 * - Mejor soporte táctil
 * - Diseño responsive mejorado
 */
export const HomeQuickActionsImproved: React.FC<HomeQuickActionsImprovedProps> = ({ actions }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card p-4 md:p-6 relative overflow-hidden"
      role="region"
      aria-label="Acciones rápidas"
    >
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-5 px-1">
        <h2 className="font-serif font-bold text-text-primary dark:text-gray-100 text-lg md:text-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl md:text-2xl" aria-hidden="true">
            bolt
          </span>
          Acceso Rápido
        </h2>
      </div>

      {/* Actions Grid */}
      <div
        className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4"
        role="toolbar"
        aria-label="Botones de acceso rápido"
      >
        {actions.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 + 0.2 }}
            onClick={action.onClick}
            className="flex flex-col items-center gap-1.5 sm:gap-2 md:gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
            aria-label={action.ariaLabel}
          >
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className={`
                w-full aspect-square rounded-xl sm:rounded-2xl md:rounded-3xl
                ${action.bg}
                flex items-center justify-center
                transition-all duration-300
                group-hover:shadow-md
                border border-transparent
                group-hover:border-gray-100 dark:group-hover:border-slate-700
                group-focus-visible:border-primary
                relative overflow-hidden
              `}
            >
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/20 dark:from-white/0 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              <motion.span
                className={`material-symbols-outlined text-xl sm:text-2xl md:text-3xl lg:text-4xl ${action.color} relative z-10`}
                initial={false}
                whileHover={{ rotate: 6 }}
                aria-hidden="true"
              >
                {action.icon}
              </motion.span>
            </motion.div>

            <span className="text-[10px] sm:text-xs md:text-sm font-bold text-text-secondary dark:text-gray-400 group-hover:text-text-primary dark:group-hover:text-gray-200 transition-colors text-center leading-tight px-0.5 line-clamp-1">
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Keyboard hint (solo visible en focus) */}
      <p className="sr-only">
        Usa Tab para navegar entre las acciones y Enter o Espacio para activar
      </p>
    </motion.div>
  );
};

export default HomeQuickActionsImproved;
