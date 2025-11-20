import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingItem } from '../types';

interface SmartPackerViewProps {
  closet: ClothingItem[];
  onClose: () => void;
}

interface PackingItem {
  id: string;
  name: string;
  checked: boolean;
  icon: string;
  category: 'clothing' | 'essential' | 'toiletries' | 'tech';
  clothingItemId?: string; // Link to real closet item
}

const SmartPackerView: React.FC<SmartPackerViewProps> = ({ closet, onClose }) => {
  const [step, setStep] = useState<'form' | 'list'>('form');
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState('');
  const [activities, setActivities] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [items, setItems] = useState<PackingItem[]>([]);

  // Mock generation for now - in real app, call AI service
  const handleGenerate = async () => {
    setIsGenerating(true);

    // Simulate AI delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock result based on closet
    const newItems: PackingItem[] = [
      { id: '1', name: 'Pasaporte / DNI', checked: false, icon: 'badge', category: 'essential' },
      { id: '2', name: 'Cargador de teléfono', checked: false, icon: 'battery_charging_full', category: 'tech' },
      { id: '3', name: 'Neceser de aseo', checked: false, icon: 'soap', category: 'toiletries' },
    ];

    // Add some clothes from closet
    const tops = closet.filter(i => i.metadata.category === 'top').slice(0, 3);
    const bottoms = closet.filter(i => i.metadata.category === 'bottom').slice(0, 2);
    const shoes = closet.filter(i => i.metadata.category === 'shoes').slice(0, 1);

    tops.forEach(item => {
      newItems.push({
        id: item.id,
        name: item.metadata.subcategory || 'Top',
        checked: false,
        icon: 'checkroom',
        category: 'clothing',
        clothingItemId: item.id
      });
    });

    bottoms.forEach(item => {
      newItems.push({
        id: item.id,
        name: item.metadata.subcategory || 'Pantalón',
        checked: false,
        icon: 'checkroom',
        category: 'clothing',
        clothingItemId: item.id
      });
    });

    shoes.forEach(item => {
      newItems.push({
        id: item.id,
        name: item.metadata.subcategory || 'Zapatos',
        checked: false,
        icon: 'checkroom',
        category: 'clothing',
        clothingItemId: item.id
      });
    });

    setItems(newItems);
    setIsGenerating(false);
    setStep('list');
  };

  const toggleItem = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const progress = items.length > 0 ? items.filter(i => i.checked).length / items.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >

        {/* Header */}
        <div className="relative h-32 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex items-center justify-between shrink-0">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl"></div>
          </div>

          <div className="relative z-10 text-white">
            <h2 className="text-3xl font-bold mb-1">
              {step === 'form' ? 'Planifica tu Viaje' : `Viaje a ${destination}`}
            </h2>
            <p className="text-blue-100 font-medium">
              {step === 'form' ? 'Asistente de equipaje inteligente' : `${duration} • ${items.length} ítems`}
            </p>
          </div>

          <button
            onClick={onClose}
            className="relative z-10 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">¿A dónde vas?</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-3.5 text-gray-400">flight_takeoff</span>
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Ej: París, Playa del Carmen..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Duración</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-3.5 text-gray-400">schedule</span>
                        <input
                          type="text"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          placeholder="Ej: 5 días"
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Clima esperado</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-3.5 text-gray-400">thermostat</span>
                        <input
                          type="text"
                          placeholder="Ej: Soleado, 25°C"
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Actividades</label>
                    <textarea
                      value={activities}
                      onChange={(e) => setActivities(e.target.value)}
                      placeholder="Cenas elegantes, caminatas, playa..."
                      rows={3}
                      className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!destination || !duration || isGenerating}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-spin material-symbols-outlined">progress_activity</span>
                      Generando maleta...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">auto_awesome</span>
                      Generar Lista Inteligente
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Progress Bar */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Progreso de empaquetado</span>
                    <span className="text-blue-600 font-bold">{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      layout
                      className={`
                        flex items-center gap-4 p-4 rounded-xl cursor-pointer border transition-all
                        ${item.checked
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30'
                          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 shadow-sm hover:shadow-md'
                        }
                      `}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
                        ${item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600'}
                      `}>
                        {item.checked && <span className="material-symbols-outlined text-white text-sm">check</span>}
                      </div>

                      <div className="flex-grow min-w-0">
                        <p className={`font-medium truncate ${item.checked ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-white'}`}>
                          {item.name}
                        </p>
                        {item.category === 'clothing' && (
                          <p className="text-xs text-gray-500">De tu armario</p>
                        )}
                      </div>

                      <span className={`material-symbols-outlined ${item.checked ? 'text-green-400' : 'text-gray-400'}`}>
                        {item.icon}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setStep('form')}
                    className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Editar Viaje
                  </button>
                  <button className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                    Guardar Lista
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default SmartPackerView;