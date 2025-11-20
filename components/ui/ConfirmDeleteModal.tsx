/**
 * CONFIRM DELETE MODAL
 *
 * Reusable confirmation modal for all delete operations.
 * Prevents accidental data loss with clear warning and two-button pattern.
 *
 * Features:
 * - Red destructive button for delete
 * - Gray neutral button for cancel
 * - Shows item name and type
 * - Keyboard support (Escape to cancel, Enter to confirm)
 * - Loading state during deletion
 * - Dark mode support
 * - Mobile-friendly touch targets (44px+)
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName?: string;
  itemType?: string;
  isLoading?: boolean;
  warningMessage?: string;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'elemento',
  isLoading = false,
  warningMessage = 'Esta acción no se puede deshacer'
}: ConfirmDeleteModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button when modal opens (accessibility)
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return; // Prevent actions during loading

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && !isLoading) {
        e.preventDefault();
        onConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose, onConfirm]);

  const handleConfirm = async () => {
    if (isLoading) return;
    await onConfirm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          >
            <div className="bg-white dark:bg-background-dark rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">
                      warning
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary dark:text-white">
                    Confirmar Eliminación
                  </h2>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <p className="text-base text-text-secondary dark:text-gray-300">
                    {itemName ? (
                      <>
                        ¿Estás seguro que deseas eliminar <span className="font-semibold text-text-primary dark:text-white">"{itemName}"</span>?
                      </>
                    ) : (
                      <>¿Estás seguro que deseas eliminar este {itemType}?</>
                    )}
                  </p>

                  {/* Warning message */}
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg mt-0.5">
                      info
                    </span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                      {warningMessage}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 pt-4 bg-gray-50/50 dark:bg-background-dark/50 flex gap-3">
                {/* Cancel button - primary action for safety */}
                <button
                  ref={cancelButtonRef}
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 h-14 rounded-2xl bg-gray-200 dark:bg-gray-700 text-text-primary dark:text-white font-bold text-base
                    hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancelar
                </button>

                {/* Delete button - destructive action */}
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="flex-1 h-14 rounded-2xl bg-red-600 dark:bg-red-500 text-white font-bold text-base
                    hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">delete</span>
                      <span>Eliminar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
