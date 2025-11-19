
import React, { useState } from 'react';
import type { PackingListResult, ClothingItem } from '../types';
import ClosetGrid from './ClosetGrid';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';

interface PackingListViewProps {
  result: PackingListResult;
  inventory: ClothingItem[];
  onBack: () => void;
}

const PackingListView = ({ result, inventory, onBack }: PackingListViewProps) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'items' | 'suggestions'>('items');

  const packedItems = result.packing_list
    .map(id => inventory.find(item => item.id === id))
    .filter((item): item is ClothingItem => !!item);

  const groupedItems = {
    'Partes de Arriba': packedItems.filter(i => i.metadata.category === 'top'),
    'Partes de Abajo': packedItems.filter(i => i.metadata.category === 'bottom'),
    'Calzado': packedItems.filter(i => i.metadata.category === 'shoes'),
    'Otros': packedItems.filter(i => !['top', 'bottom', 'shoes'].includes(i.metadata.category))
  };

  const handleSaveTrip = () => {
    // TODO: Implement actual trip saving logic
    toast.success('Viaje guardado en tus planes');
  };

  const handleAddToCalendar = () => {
    // TODO: Implement calendar integration
    toast.success('Recordatorio añadido al calendario');
  };

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-30 flex flex-col p-4 animate-fade-in md:fixed md:bg-black/30 md:items-center md:justify-center">
      <div className="contents md:block md:relative md:w-full md:max-w-4xl bg-white/95 dark:bg-background-dark/95 md:rounded-3xl md:max-h-[90vh] md:flex md:flex-col md:shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors dark:text-gray-200">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-text-primary dark:text-gray-200">Tu Maleta Inteligente</h1>
          <div className="flex gap-2">
            <button onClick={handleSaveTrip} className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors" title="Guardar Viaje">
              <span className="material-symbols-outlined">bookmark</span>
            </button>
            <button onClick={handleAddToCalendar} className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors" title="Añadir al Calendario">
              <span className="material-symbols-outlined">calendar_month</span>
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex p-2 gap-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'items'
              ? 'bg-primary text-white shadow-lg shadow-primary/30'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400'
              }`}
          >
            Prendas ({packedItems.length})
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'suggestions'
              ? 'bg-primary text-white shadow-lg shadow-primary/30'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400'
              }`}
          >
            Sugerencias de Outfits
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-4 md:p-6">
          {activeTab === 'items' && (
            <div className="space-y-8 pb-20">
              {Object.entries(groupedItems).map(([category, items]) => (
                items.length > 0 && (
                  <div key={category} className="animate-fade-in">
                    <h3 className="font-bold text-lg mb-4 text-text-primary dark:text-gray-200 flex items-center gap-2">
                      {category === 'Partes de Arriba' && <span className="material-symbols-outlined">apparel</span>}
                      {category === 'Partes de Abajo' && <span className="material-symbols-outlined">trousers</span>}
                      {category === 'Calzado' && <span className="material-symbols-outlined">steps</span>}
                      {category === 'Otros' && <span className="material-symbols-outlined">checkroom</span>}
                      {category}
                      <span className="text-sm font-normal text-gray-400 ml-2">({items.length})</span>
                    </h3>
                    <div className="-mx-2 md:mx-0">
                      <ClosetGrid items={items} onItemClick={() => { }} viewMode="grid" />
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div className="animate-fade-in pb-20">
              <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-3xl p-6 border border-primary/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">auto_awesome</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-text-primary dark:text-gray-200">Sugerencias de la IA</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Combinaciones optimizadas para tu viaje</p>
                  </div>
                </div>

                <div
                  className="prose prose-sm md:prose-base dark:prose-invert max-w-none
                                prose-headings:font-bold prose-headings:text-primary
                                prose-strong:text-text-primary dark:prose-strong:text-white
                                prose-li:marker:text-primary"
                  dangerouslySetInnerHTML={{ __html: result.outfit_suggestions.replace(/\n/g, '<br />') }}
                />
              </div>

              {/* Future feature teaser */}
              <div className="mt-8 p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  ¿Te gustaron estas sugerencias? Pronto podrás guardarlas como outfits individuales.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar (Mobile) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-background-dark/90 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 z-40 flex gap-3">
          <button
            onClick={handleSaveTrip}
            className="flex-1 bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">bookmark</span>
            Guardar
          </button>
          <button
            onClick={handleAddToCalendar}
            className="flex-1 bg-primary text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
          >
            <span className="material-symbols-outlined">calendar_month</span>
            Calendario
          </button>
        </div>

        {/* Toast Notifications */}
        {toast.toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            duration={t.duration}
            onClose={() => toast.hideToast(t.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default PackingListView;