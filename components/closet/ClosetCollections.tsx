/**
 * CLOSET COLLECTIONS COMPONENT
 *
 * UI for managing closet collections/folders.
 * Features:
 * - List of collections with item counts
 * - Create new collection dialog
 * - Edit/delete collections
 * - Drag & drop items between collections
 * - Active collection highlighting
 * - Premium glassmorphism design
 */

import React, { useState, Suspense, lazy, startTransition } from 'react';
import type { Collection } from '../../types/closet';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmDeleteModal = lazy(() => import('../ui/ConfirmDeleteModal'));

interface ClosetCollectionsProps {
  collections: Collection[];
  activeCollectionId: string | null;
  onSelectCollection: (id: string) => void;
  onCreateCollection: (name: string, options?: { description?: string; color?: string; icon?: string }) => void;
  onUpdateCollection: (id: string, updates: Partial<Collection>) => void;
  onDeleteCollection: (id: string) => void;
  itemCounts?: Record<string, number>;  // Item count per collection
  className?: string;
}

const COLOR_OPTIONS = [
  { name: 'Índigo', value: '#6366F1' },
  { name: 'Rojo', value: '#EF4444' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Amarillo', value: '#F59E0B' },
  { name: 'Morado', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Gris', value: '#6B7280' }
];

const ICON_OPTIONS = [
  'folder',
  'work',
  'sunny',
  'ac_unit',
  'favorite',
  'star',
  'event',
  'shopping_bag',
  'luggage',
  'celebration'
];

export default function ClosetCollections({
  collections,
  activeCollectionId,
  onSelectCollection,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  itemCounts = {},
  className = ''
}: ClosetCollectionsProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].value);
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    collection: Collection | null;
  }>({ isOpen: false, collection: null });

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      onCreateCollection(newCollectionName.trim(), {
        color: selectedColor,
        icon: selectedIcon
      });
      setNewCollectionName('');
      setSelectedColor(COLOR_OPTIONS[0].value);
      setSelectedIcon(ICON_OPTIONS[0]);
      setShowCreateDialog(false);
    }
  };

  const handleUpdateCollection = () => {
    if (editingCollection && newCollectionName.trim()) {
      onUpdateCollection(editingCollection.id, {
        name: newCollectionName.trim(),
        color: selectedColor,
        icon: selectedIcon
      });
      setEditingCollection(null);
      setNewCollectionName('');
    }
  };

  const handleDeleteCollectionClick = (collection: Collection) => {
    if (collection.isDefault) return;
    startTransition(() => setDeleteConfirm({ isOpen: true, collection }));
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.collection) {
      onDeleteCollection(deleteConfirm.collection.id);
      startTransition(() => setDeleteConfirm({ isOpen: false, collection: null }));
    }
  };

  const openEditDialog = (collection: Collection) => {
    if (collection.isDefault) return;

    startTransition(() => {
      setEditingCollection(collection);
      setNewCollectionName(collection.name);
      setSelectedColor(collection.color);
      setSelectedIcon(collection.icon || ICON_OPTIONS[0]);
    });
  };

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-bold text-text-secondary/70 dark:text-gray-500 uppercase tracking-wider">
          Colecciones
        </h3>
        <button
          onClick={() => {
            if (showCreateDialog) {
              setShowCreateDialog(false);
              setNewCollectionName('');
            } else {
              setEditingCollection(null);
              setNewCollectionName('');
              setShowCreateDialog(true);
            }
          }}
          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${showCreateDialog ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : 'bg-primary/10 hover:bg-primary/20 text-primary'
            }`}
          aria-label={showCreateDialog ? 'Cancelar' : 'Nueva colección'}
        >
          <motion.span
            animate={{ rotate: showCreateDialog ? 45 : 0 }}
            className="material-symbols-outlined text-sm font-bold"
          >
            add
          </motion.span>
        </button>
      </div>

      {/* Inline Create/Edit Form */}
      <AnimatePresence>
        {(showCreateDialog || editingCollection) && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-xl border border-white/40 dark:border-white/10 shadow-sm relative overflow-hidden">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCollectionName.trim()) {
                    editingCollection ? handleUpdateCollection() : handleCreateCollection();
                  }
                  if (e.key === 'Escape') {
                    setShowCreateDialog(false);
                    setEditingCollection(null);
                    setNewCollectionName('');
                  }
                }}
                placeholder={editingCollection ? "Renombrar..." : "Nueva colección..."}
                className="w-full px-3 py-2 text-sm rounded-lg bg-white/90 dark:bg-gray-900 border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all outline-none font-medium mb-3 relative z-10"
                autoFocus
              />
              <div className="flex gap-2 relative z-10">
                <button
                  onClick={editingCollection ? handleUpdateCollection : handleCreateCollection}
                  disabled={!newCollectionName.trim()}
                  className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-primary text-white shadow-glow-sm hover:shadow-glow-md disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                >
                  {editingCollection ? 'Guardar' : 'Crear'}
                </button>
              </div>

              {/* Subtle glass effect behind the form */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-gray-800/40 pointer-events-none z-0"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collections List */}
      <div className="space-y-1 relative">
        {collections.map((collection) => {
          const isActive = collection.id === activeCollectionId;
          const itemCount = itemCounts[collection.id] || 0;

          return (
            <div key={collection.id} className="group relative">
              <button
                onClick={() => onSelectCollection(collection.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 relative z-10 ${isActive ? 'text-primary' : 'text-text-primary dark:text-gray-200 hover:bg-white/40 dark:hover:bg-gray-800/40'
                  }`}
              >
                {/* Active Indicator Background (Framer Motion) */}
                {isActive && (
                  <motion.div
                    layoutId="activeCollectionBg"
                    className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl z-[-1] shadow-glow-sm"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm ${isActive ? 'bg-primary/20' : 'bg-white/80 dark:bg-gray-700/80 backdrop-blur-md group-hover:bg-white dark:group-hover:bg-gray-600'
                  }`}>
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{ color: isActive ? undefined : collection.color }}
                  >
                    {collection.icon || 'folder'}
                  </span>
                </div>

                {/* Name & Count */}
                <div className="flex-grow text-left min-w-0">
                  <div className="font-bold text-sm truncate">
                    {collection.name}
                  </div>
                </div>

                {/* Item Count Badge */}
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 transition-colors ${isActive
                    ? 'bg-primary text-white shadow-sm border border-primary-light/30'
                    : 'bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-text-secondary dark:text-gray-400 group-hover:bg-white dark:group-hover:bg-gray-700'
                  }`}>
                  {itemCount}
                </span>
              </button>

              {/* Edit/Delete Actions */}
              {!collection.isDefault && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1 pl-4 bg-gradient-to-l from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900 py-1 pr-1 rounded-r-xl z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(collection);
                    }}
                    className="w-7 h-7 rounded-lg bg-gray-100/90 dark:bg-gray-800/90 backdrop-blur-md hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors border border-gray-200/50 dark:border-gray-700/50 hover:border-primary/30"
                    aria-label="Editar"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCollectionClick(collection);
                    }}
                    className="w-7 h-7 rounded-lg bg-gray-100/90 dark:bg-gray-800/90 backdrop-blur-md hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 flex items-center justify-center transition-colors border border-gray-200/50 dark:border-gray-700/50 hover:border-red-500/30"
                    aria-label="Eliminar"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <Suspense fallback={null}>
        <ConfirmDeleteModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, collection: null })}
          onConfirm={handleConfirmDelete}
          itemName={deleteConfirm.collection?.name}
          itemType="colección"
          warningMessage="Los items no se eliminarán, solo la colección."
        />
      </Suspense>
    </div>
  );
}
