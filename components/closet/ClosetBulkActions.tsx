/**
 * CLOSET BULK ACTIONS - Toolbar
 *
 * Floating toolbar for bulk operations with:
 * - Selection count display
 * - Quick bulk actions (delete, move, export, share)
 * - Select all / Deselect all
 * - Cancel selection mode
 * - Confirmation dialogs for destructive actions
 * - Responsive (desktop toolbar / mobile bottom sheet)
 * - Framer Motion animations
 * - Dark mode support
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Collection } from '../../types/closet';

export interface BulkAction {
  id: string;
  label: string;
  icon: string;
  variant?: 'default' | 'primary' | 'danger';
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

interface ClosetBulkActionsProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCancel: () => void;
  onAction: (actionId: string) => void;

  // Collections (for move/add to collection)
  collections?: Collection[];

  // Custom actions
  actions?: BulkAction[];
  extraActions?: BulkAction[];
  helperText?: string;

  // Position
  position?: 'top' | 'bottom' | 'floating';
}

const DEFAULT_ACTIONS: BulkAction[] = [
  {
    id: 'add-to-collection',
    label: 'Añadir a colección',
    icon: 'folder',
    variant: 'default'
  },
  {
    id: 'move-to-collection',
    label: 'Mover a colección',
    icon: 'drive_file_move',
    variant: 'default'
  },
  {
    id: 'export',
    label: 'Exportar',
    icon: 'download',
    variant: 'default'
  },
  {
    id: 'share',
    label: 'Compartir',
    icon: 'share',
    variant: 'default'
  },
  {
    id: 'delete',
    label: 'Eliminar',
    icon: 'delete',
    variant: 'danger',
    requiresConfirmation: true,
    confirmationMessage: '¿Estás seguro de que quieres eliminar las prendas seleccionadas?'
  }
];

export default function ClosetBulkActions({
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onDeselectAll,
  onCancel,
  onAction,
  collections = [],
  actions = DEFAULT_ACTIONS,
  extraActions = [],
  helperText,
  position = 'bottom'
}: ClosetBulkActionsProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<BulkAction | null>(null);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [collectionPickerAction, setCollectionPickerAction] = useState<'add' | 'move'>('add');

  const handleActionClick = (action: BulkAction) => {
    // Handle collection-related actions
    if (action.id === 'add-to-collection' || action.id === 'move-to-collection') {
      setCollectionPickerAction(action.id === 'add-to-collection' ? 'add' : 'move');
      setShowCollectionPicker(true);
      return;
    }

    // Handle actions requiring confirmation
    if (action.requiresConfirmation) {
      setConfirmationAction(action);
      setShowConfirmation(true);
      return;
    }

    // Execute action directly
    onAction(action.id);
  };

  const handleConfirm = () => {
    if (confirmationAction) {
      onAction(confirmationAction.id);
      setShowConfirmation(false);
      setConfirmationAction(null);
    }
  };

  const handleCollectionSelect = (collectionId: string) => {
    const actionId = collectionPickerAction === 'add'
      ? `add-to-collection-${collectionId}`
      : `move-to-collection-${collectionId}`;
    onAction(actionId);
    setShowCollectionPicker(false);
  };

  const getVariantClasses = (variant: BulkAction['variant']) => {
    switch (variant) {
      case 'primary':
        return 'bg-primary text-white hover:bg-primary-dark';
      case 'danger':
        return 'bg-red-500 text-white hover:bg-red-600';
      default:
        return 'bg-white/50 dark:bg-black/20 text-text-primary dark:text-gray-200 hover:bg-white/70 dark:hover:bg-black/30';
    }
  };

  // Position-based layout classes
  const positionClasses = {
    top: 'fixed top-20 left-1/2 -translate-x-1/2 z-40',
    bottom: 'fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40',
    floating: 'fixed bottom-24 md:bottom-10 right-6 z-40'
  };

  const resolvedActions = extraActions.length ? [...extraActions, ...actions] : actions;

  return (
    <>
      {/* Main toolbar */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`${positionClasses[position]} w-[95%] max-w-4xl`}
          >
            <div className="liquid-glass rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/20">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onCancel}
                    className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                    aria-label="Cancelar"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>

                  <div>
                  <div className="font-semibold text-text-primary dark:text-gray-200">
                    {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-text-secondary dark:text-gray-400">
                    {totalCount} disponibles
                  </div>
                  {helperText && (
                    <div className="text-[11px] text-text-secondary dark:text-gray-400 mt-1">
                      {helperText}
                    </div>
                  )}
                </div>
              </div>

                {/* Select all / Deselect all */}
                <button
                  onClick={allSelected ? onDeselectAll : onSelectAll}
                  className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                >
                  {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 p-3 overflow-x-auto">
                {resolvedActions.map((action, index) => (
                  <motion.button
                    key={action.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    onClick={() => handleActionClick(action)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all flex-shrink-0
                      ${getVariantClasses(action.variant)}
                    `}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {action.icon}
                    </span>
                    <span className="text-sm font-medium hidden md:inline">
                      {action.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {showConfirmation && confirmationAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirmation(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="liquid-glass rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-500 text-2xl">
                    warning
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-text-primary dark:text-gray-200">
                    Confirmar acción
                  </h3>
                  <p className="text-sm text-text-secondary dark:text-gray-400">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>

              <p className="text-text-primary dark:text-gray-200 mb-6">
                {confirmationAction.confirmationMessage}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/50 dark:bg-black/20 text-text-primary dark:text-gray-200 font-medium hover:bg-white/70 dark:hover:bg-black/30 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collection picker */}
      <AnimatePresence>
        {showCollectionPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCollectionPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="liquid-glass rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-text-primary dark:text-gray-200">
                  {collectionPickerAction === 'add' ? 'Añadir a colección' : 'Mover a colección'}
                </h3>
                <button
                  onClick={() => setShowCollectionPicker(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {collections.filter(c => !c.isDefault).map(collection => (
                  <button
                    key={collection.id}
                    onClick={() => handleCollectionSelect(collection.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-black/20 hover:bg-white/70 dark:hover:bg-black/30 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${collection.color}20` }}
                    >
                      <span className="material-symbols-outlined" style={{ color: collection.color }}>
                        {collection.icon || 'folder'}
                      </span>
                    </div>
                    <div className="flex-grow text-left">
                      <div className="font-semibold text-text-primary dark:text-gray-200">
                        {collection.name}
                      </div>
                      {collection.description && (
                        <div className="text-xs text-text-secondary dark:text-gray-400 truncate">
                          {collection.description}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-text-secondary dark:text-gray-400">
                      {collection.itemIds.length}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
