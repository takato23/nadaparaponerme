import React, { useState } from 'react';
import type { ClothingItemMetadata } from '../types';

interface MetadataEditModalProps {
  imageDataUrl: string;
  metadata: ClothingItemMetadata;
  onSave: (updatedMetadata: ClothingItemMetadata) => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'shoes', label: 'Zapatos' },
  { value: 'accessory', label: 'Accesorio' },
  { value: 'outerwear', label: 'Abrigo' },
];

const SEASONS = [
  { value: 'primavera', label: '🌸 Primavera' },
  { value: 'verano', label: '☀️ Verano' },
  { value: 'otoño', label: '🍂 Otoño' },
  { value: 'invierno', label: '❄️ Invierno' },
];

const COMMON_COLORS = [
  'negro', 'blanco', 'gris', 'beige', 'marrón',
  'azul', 'azul marino', 'celeste', 'verde', 'rojo',
  'rosa', 'amarillo', 'naranja', 'morado', 'violeta'
];

const VIBE_TAGS_SUGGESTIONS = [
  'casual', 'formal', 'deportivo', 'elegante', 'vintage',
  'moderno', 'minimalista', 'bohemio', 'urbano', 'clásico',
  'trendy', 'cómodo', 'sofisticado', 'juvenil', 'profesional'
];

export default function MetadataEditModal({ imageDataUrl, metadata, onSave, onCancel }: MetadataEditModalProps) {
  const [editedMetadata, setEditedMetadata] = useState<ClothingItemMetadata>(metadata);
  const [customColor, setCustomColor] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCategoryChange = (category: string) => {
    setEditedMetadata(prev => ({ ...prev, category: category as any }));
  };

  const handleColorSelect = (color: string) => {
    setEditedMetadata(prev => ({ ...prev, color_primary: color }));
  };

  const handleCustomColorAdd = () => {
    if (customColor.trim()) {
      setEditedMetadata(prev => ({ ...prev, color_primary: customColor.trim().toLowerCase() }));
      setCustomColor('');
    }
  };

  const toggleSeason = (season: string) => {
    setEditedMetadata(prev => {
      const seasons = prev.seasons || [];
      const newSeasons = seasons.includes(season)
        ? seasons.filter(s => s !== season)
        : [...seasons, season];
      return { ...prev, seasons: newSeasons };
    });
  };

  const toggleVibeTag = (tag: string) => {
    setEditedMetadata(prev => {
      const tags = prev.vibe_tags || [];
      const newTags = tags.includes(tag)
        ? tags.filter(t => t !== tag)
        : [...tags, tag];
      return { ...prev, vibe_tags: newTags };
    });
  };

  const addCustomTag = () => {
    if (customTag.trim() && !(editedMetadata.vibe_tags || []).includes(customTag.trim().toLowerCase())) {
      setEditedMetadata(prev => ({
        ...prev,
        vibe_tags: [...(prev.vibe_tags || []), customTag.trim().toLowerCase()]
      }));
      setCustomTag('');
    }
  };

  const handleSave = () => {
    // Validación básica
    if (!editedMetadata.category || !editedMetadata.subcategory || !editedMetadata.color_primary) {
      setValidationError('Por favor completa los campos requeridos: categoría, tipo y color');
      return;
    }
    setValidationError(null);
    onSave(editedMetadata);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="liquid-glass rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold">Editar Prenda</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Preview */}
            <div>
              <img
                src={imageDataUrl}
                alt="Preview"
                className="w-full aspect-square object-cover rounded-2xl"
              />
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => handleCategoryChange(cat.value)}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        editedMetadata.category === cat.value
                          ? 'bg-primary text-white'
                          : 'bg-gray-200/60 dark:bg-gray-700/60'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategory */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Tipo de Prenda <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editedMetadata.subcategory}
                  onChange={(e) => setEditedMetadata(prev => ({ ...prev, subcategory: e.target.value }))}
                  placeholder="Ej: camiseta, jean, zapatillas..."
                  className="w-full p-3 bg-white/50 dark:bg-black/20 rounded-xl border-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Color Principal <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {COMMON_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => handleColorSelect(color)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        editedMetadata.color_primary === color
                          ? 'bg-primary text-white'
                          : 'bg-gray-200/60 dark:bg-gray-700/60'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomColorAdd()}
                    placeholder="Otro color..."
                    className="flex-1 p-2 bg-white/50 dark:bg-black/20 rounded-xl border-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <button
                    onClick={handleCustomColorAdd}
                    className="px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:scale-105 transition-transform text-sm"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* Seasons */}
              <div>
                <label className="block text-sm font-semibold mb-2">Temporadas</label>
                <div className="grid grid-cols-2 gap-2">
                  {SEASONS.map(season => (
                    <button
                      key={season.value}
                      onClick={() => toggleSeason(season.value)}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        (editedMetadata.seasons || []).includes(season.value)
                          ? 'bg-primary text-white'
                          : 'bg-gray-200/60 dark:bg-gray-700/60'
                      }`}
                    >
                      {season.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vibe Tags */}
              <div>
                <label className="block text-sm font-semibold mb-2">Estilo (Tags)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {VIBE_TAGS_SUGGESTIONS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleVibeTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        (editedMetadata.vibe_tags || []).includes(tag)
                          ? 'bg-primary text-white'
                          : 'bg-gray-200/60 dark:bg-gray-700/60'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                    placeholder="Agregar tag personalizado..."
                    className="flex-1 p-2 bg-white/50 dark:bg-black/20 rounded-xl border-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <button
                    onClick={addCustomTag}
                    className="px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:scale-105 transition-transform text-sm"
                  >
                    +
                  </button>
                </div>
                {(editedMetadata.vibe_tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editedMetadata.vibe_tags!.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary flex items-center gap-1"
                      >
                        {tag}
                        <button
                          onClick={() => toggleVibeTag(tag)}
                          className="hover:scale-110 transition-transform"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-6">
          {/* Validation Error */}
          {validationError && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
              {validationError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-white/10 font-bold py-3 rounded-2xl hover:bg-white/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-primary text-white font-bold py-3 rounded-2xl hover:scale-105 transition-transform"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
