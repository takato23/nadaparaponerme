import React, { useState, useRef } from 'react';
import type { GroundingChunk } from '../types';
import { searchProductsFromImage, searchProductsForItem } from '../src/services/geminiService';
import { getShoppingLinks, getSponsoredPlacements, ShoppingLink } from '../src/services/monetizationService';
import Loader from './Loader';
import { Card } from './ui/Card';

interface ShopLookViewProps {
  onClose: () => void;
}

export default function ShopLookView({ onClose }: ShopLookViewProps) {
  const [mode, setMode] = useState<'idle' | 'uploading' | 'searching' | 'results'>('idle');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textQuery, setTextQuery] = useState('');
  const [results, setResults] = useState<{
    description: string;
    category: string;
    links: GroundingChunk[];
    quickLinks: ShoppingLink[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sponsoredPlacements = results ? getSponsoredPlacements(results.description) : [];

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setMode('uploading');

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageDataUrl = event.target?.result as string;
      setImagePreview(imageDataUrl);

      // Search products
      setMode('searching');
      try {
        const result = await searchProductsFromImage(imageDataUrl);
        const quickLinks = getShoppingLinks(result.description);

        setResults({
          ...result,
          quickLinks
        });
        setMode('results');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al buscar');
        setMode('idle');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTextSearch = async () => {
    if (!textQuery.trim()) return;

    setError(null);
    setMode('searching');
    setImagePreview(null);

    try {
      const links = await searchProductsForItem(textQuery);
      const quickLinks = getShoppingLinks(textQuery);

      setResults({
        description: textQuery,
        category: 'unknown',
        links,
        quickLinks
      });
      setMode('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar');
      setMode('idle');
    }
  };

  const handleReset = () => {
    setMode('idle');
    setImagePreview(null);
    setTextQuery('');
    setResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card variant="glass" padding="none" rounded="3xl" className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">shopping_bag</span>
              Encontrar Prenda
            </h2>
            <p className="text-sm text-white/60 mt-1">
              Subí una foto o describí lo que buscás
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-2xl hover:bg-white/10 transition-all"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload Section */}
          {mode === 'idle' && (
            <div className="space-y-6">
              {/* Image Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 hover:border-emerald-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-white/5"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-5xl text-emerald-500 mb-4 block">add_photo_alternate</span>
                <p className="font-semibold text-lg mb-2">Subir imagen</p>
                <p className="text-sm text-white/60">
                  Screenshot de Instagram, foto de revista, etc.
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-white/10"></div>
                <span className="text-white/40 text-sm">o describí</span>
                <div className="flex-1 border-t border-white/10"></div>
              </div>

              {/* Text Search */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={textQuery}
                  onChange={(e) => setTextQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTextSearch()}
                  placeholder="Ej: vestido negro elegante, remera blanca básica..."
                  className="w-full px-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:outline-none transition-all text-lg"
                />
                <button
                  onClick={handleTextSearch}
                  disabled={!textQuery.trim()}
                  className="w-full py-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">search</span>
                  Buscar
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {(mode === 'uploading' || mode === 'searching') && (
            <div className="flex flex-col items-center justify-center py-12">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-2xl mb-6"
                />
              )}
              <Loader />
              <p className="mt-4 text-white/60">
                {mode === 'uploading' ? 'Procesando imagen...' : 'Buscando productos...'}
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-5xl text-red-500 mb-4 block">error</span>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {/* Results */}
          {mode === 'results' && results && (
            <div className="space-y-6">
              {/* Image + Description */}
              {imagePreview && (
                <div className="flex gap-4 items-start">
                  <img
                    src={imagePreview}
                    alt="Prenda"
                    className="w-24 h-24 object-cover rounded-xl"
                  />
                  <div>
                    <p className="font-semibold text-lg">{results.description}</p>
                    <p className="text-sm text-white/60 capitalize">{results.category}</p>
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500">storefront</span>
                  Buscar en tiendas
                </h3>

                {sponsoredPlacements.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Patrocinado</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {sponsoredPlacements.map((placement) => (
                        <a
                          key={placement.id}
                          href={placement.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-4 rounded-xl bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-500">{placement.icon}</span>
                            <div>
                              <p className="text-sm font-semibold">{placement.name}</p>
                              <p className="text-xs text-white/60">{placement.description}</p>
                            </div>
                          </div>
                          <p className="text-xs font-semibold text-emerald-400 mt-2">{placement.cta}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  {results.quickLinks.map((link) => (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-xl bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 transition-all text-center"
                    >
                      <span className="material-symbols-outlined text-2xl mb-2 block">{link.icon}</span>
                      <span className="text-sm font-medium">{link.name}</span>
                      <span className="block text-xs text-emerald-400 font-bold uppercase mt-1">Afiliado</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* AI Results */}
              {results.links.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500">auto_awesome</span>
                    Resultados AI
                  </h3>
                  <div className="space-y-2">
                    {results.links.map((link, index) => (
                      <a
                        href={link.web.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={index}
                        className="block bg-white/5 hover:bg-white/10 p-4 rounded-xl transition-all border border-white/10 hover:border-emerald-500/30"
                      >
                        <p className="font-semibold truncate">{link.web.title}</p>
                        <p className="text-sm text-white/60 truncate">{new URL(link.web.uri).hostname}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* New Search Button */}
              <button
                onClick={handleReset}
                className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all font-medium flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">refresh</span>
                Nueva búsqueda
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
