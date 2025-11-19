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

import React, { useState } from 'react';
import type { Collection } from '../../types/closet';
import { motion, AnimatePresence } from 'framer-motion';

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

  const handleDeleteCollection = (collection: Collection) => {
    if (collection.isDefault) return;

    const confirmed = window.confirm(
      `¿Eliminar la colección "${collection.name}"? Los items no se eliminarán.`
    );

    if (confirmed) {
      onDeleteCollection(collection.id);
    }
  };

  const openEditDialog = (collection: Collection) => {
    if (collection.isDefault) return;

    setEditingCollection(collection);
    setNewCollectionName(collection.name);
    setSelectedColor(collection.color);
    setSelectedIcon(collection.icon || ICON_OPTIONS[0]);
  };

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-bold text-text-secondary/70 dark:text-gray-500 uppercase tracking-wider">
          Colecciones
        </h3>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="w-6 h-6 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          aria-label="Nueva colección"
        >
          <span className="material-symbols-outlined text-primary text-sm font-bold">add</span>
        </button>
      </div>

      {/* Collections List */}
      <div className="space-y-2">
        {collections.map((collection) => {
          const isActive = collection.id === activeCollectionId;
          const itemCount = itemCounts[collection.id] || 0;

          return (
            <div
              key={collection.id}
              className="group relative"
            >
              <button
                onClick={() => onSelectCollection(collection.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 border
                  ${isActive
                    ? 'bg-primary/10 border-primary/20 text-primary shadow-glow-sm'
                    : 'bg-white/40 dark:bg-gray-800/40 border-transparent hover:bg-white/60 dark:hover:bg-gray-800/60 text-text-primary dark:text-gray-200 hover:shadow-sm'
                  }
                `}
              >
                {/* Icon */}
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                  ${isActive ? 'bg-primary/20' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-white dark:group-hover:bg-gray-600'}
                `}>
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{ color: isActive ? undefined : collection.color }}
                  >
                    {collection.icon || 'folder'}
                  </span>
                </div>

                {/* Name & Count */}
                <div className="flex-grow text-left min-w-0">
                  <div className={`font-bold text-sm truncate ${isActive ? 'text-primary' : ''}`}>
                    {collection.name}
                  </div>
                  {collection.description && (
                    <div className="text-[10px] text-text-secondary dark:text-gray-400 truncate">
                      {collection.description}
                    </div>
                  )}
                </div>

                {/* Item Count Badge */}
                <span className={`
                  text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 transition-colors
                  ${isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-200 dark:bg-gray-700 text-text-secondary dark:text-gray-400 group-hover:bg-gray-300 dark:group-hover:bg-gray-600'
                  }
                `}>
                  {itemCount}
                </span>
              </button>

              {/* Edit/Delete Actions (only for custom collections) */}
              {!collection.isDefault && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1 pl-4 bg-gradient-to-l from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900 py-1 pr-1 rounded-r-xl">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(collection);
                    }}
                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
                    aria-label="Editar colección"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCollection(collection);
                    }}
                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 flex items-center justify-center transition-colors"
                    aria-label="Eliminar colección"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create/Edit Collection Dialog */}
      <AnimatePresence>
        {(showCreateDialog || editingCollection) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-white/10"
            >
              <h3 className="text-xl font-serif font-bold text-text-primary dark:text-gray-100 mb-6">
                {editingCollection ? 'Editar Colección' : 'Nueva Colección'}
              </h3>

              {/* Name Input */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="ej: Verano 2025, Trabajo..."
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-primary/50 focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                  autoFocus
                />
              </div>

              {/* Color Picker */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`
                        w-8 h-8 rounded-full transition-transform hover:scale-110
                        ${selectedColor === color.value ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900 scale-110' : ''}
                      `}
                      style={{ backgroundColor: color.value }}
                      aria-label={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div className="mb-8">
                <label className="block text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-2">
                  Icono
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setSelectedIcon(icon)}
                      className={`
                        p-2.5 rounded-xl transition-all flex items-center justify-center
                        ${selectedIcon === icon
                          ? 'bg-primary text-white shadow-glow-accent scale-105'
                          : 'bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <span className="material-symbols-outlined text-xl">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateDialog(false);
                    setEditingCollection(null);
                    setNewCollectionName('');
                  }}
                  className="flex-1 px-4 py-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-gray-200 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={editingCollection ? handleUpdateCollection : handleCreateCollection}
                  disabled={!newCollectionName.trim()}
                  className="flex-1 px-4 py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-glow-accent hover:shadow-glow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100 transition-all"
                >
                  {editingCollection ? 'Guardar Cambios' : 'Crear Colección'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
