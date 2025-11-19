/**
 * CLOSET QUICK ACTIONS - Context Menu
 *
 * Context menu for quick item actions with:
 * - Right-click support (desktop)
 * - Long-press support (mobile)
 * - Framer Motion animations
 * - Smart positioning (avoids screen edges)
 * - Action categories (edit, organize, share)
 * - Dark mode support
 * - Keyboard navigation (Esc to close)
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingItem } from '../../types';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  variant?: 'default' | 'primary' | 'danger';
  separator?: boolean;
  disabled?: boolean;
}

interface ClosetQuickActionsProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number } | null;
  item: ClothingItem | null;
  onAction: (actionId: string, item: ClothingItem) => void;
  actions?: QuickAction[];
}

const DEFAULT_ACTIONS: QuickAction[] = [
  { id: 'view', label: 'Ver detalles', icon: 'visibility', variant: 'default' },
  { id: 'edit', label: 'Editar', icon: 'edit', variant: 'default' },
  { id: 'favorite', label: 'Marcar favorito', icon: 'favorite', variant: 'primary', separator: true },
  { id: 'add-to-collection', label: 'Añadir a colección', icon: 'folder', variant: 'default' },
  { id: 'move', label: 'Mover a...', icon: 'drive_file_move', variant: 'default' },
  { id: 'duplicate', label: 'Duplicar', icon: 'content_copy', variant: 'default', separator: true },
  { id: 'share', label: 'Compartir', icon: 'share', variant: 'default' },
  { id: 'export', label: 'Exportar imagen', icon: 'download', variant: 'default', separator: true },
  { id: 'delete', label: 'Eliminar', icon: 'delete', variant: 'danger' }
];

export default function ClosetQuickActions({
  isOpen,
  onClose,
  position,
  item,
  onAction,
  actions = DEFAULT_ACTIONS
}: ClosetQuickActionsProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Smart positioning (avoid screen edges)
  const getSmartPosition = () => {
    if (!position || !menuRef.current) return position;

    const menuWidth = 200;
    const menuHeight = menuRef.current.scrollHeight || 300;
    const padding = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + menuWidth + padding > viewportWidth) {
      x = viewportWidth - menuWidth - padding;
    }
    if (x < padding) {
      x = padding;
    }

    // Adjust vertical position
    if (y + menuHeight + padding > viewportHeight) {
      y = viewportHeight - menuHeight - padding;
    }
    if (y < padding) {
      y = padding;
    }

    return { x, y };
  };

  const handleAction = (actionId: string) => {
    if (item) {
      onAction(actionId, item);
      onClose();
    }
  };

  const getVariantClasses = (variant: QuickAction['variant']) => {
    switch (variant) {
      case 'primary':
        return 'text-primary hover:bg-primary/10';
      case 'danger':
        return 'text-red-600 dark:text-red-400 hover:bg-red-500/10';
      default:
        return 'text-text-primary dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700';
    }
  };

  if (!isOpen || !position || !item) return null;

  const smartPosition = getSmartPosition();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (mobile only) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />

          {/* Context menu */}
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed z-50 w-56 liquid-glass rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            style={{
              left: smartPosition?.x || 0,
              top: smartPosition?.y || 0
            }}
          >
            {/* Item preview header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                  <img
                    src={item.imageDataUrl}
                    alt={item.metadata?.subcategory || 'Item'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-semibold text-sm text-text-primary dark:text-gray-200 capitalize truncate">
                    {item.metadata?.subcategory || 'Sin categoría'}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-400 capitalize truncate">
                    {item.metadata?.color_primary || 'Sin color'}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions list */}
            <div className="py-2">
              {actions.map((action, index) => (
                <React.Fragment key={action.id}>
                  {action.separator && (
                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                  )}
                  <motion.button
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAction(action.id)}
                    disabled={action.disabled}
                    className={`
                      w-full px-4 py-2.5 flex items-center gap-3 transition-colors
                      ${getVariantClasses(action.variant)}
                      ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {action.icon}
                    </span>
                    <span className="text-sm font-medium">{action.label}</span>
                  </motion.button>
                </React.Fragment>
              ))}
            </div>

            {/* Footer hint (desktop only) */}
            <div className="hidden md:block px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/10">
              <p className="text-xs text-text-secondary dark:text-gray-400 text-center">
                Presiona <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-xs">Esc</kbd> para cerrar
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage context menu state
 */
export function useContextMenu() {
  const [contextMenu, setContextMenu] = React.useState<{
    isOpen: boolean;
    position: { x: number; y: number } | null;
    item: ClothingItem | null;
  }>({
    isOpen: false,
    position: null,
    item: null
  });

  const openContextMenu = (e: React.MouseEvent | React.TouchEvent, item: ClothingItem) => {
    e.preventDefault();

    let x = 0;
    let y = 0;

    if ('clientX' in e) {
      // Mouse event
      x = e.clientX;
      y = e.clientY;
    } else if (e.touches && e.touches.length > 0) {
      // Touch event
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    }

    setContextMenu({
      isOpen: true,
      position: { x, y },
      item
    });
  };

  const closeContextMenu = () => {
    setContextMenu({
      isOpen: false,
      position: null,
      item: null
    });
  };

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu
  };
}
