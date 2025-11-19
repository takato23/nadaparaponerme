import React from 'react';
// FIX: Correct the import path for the SortOption type.
import type { SortOption } from '../types';

interface SortOptionsViewProps {
  currentSort: SortOption;
  onSortChange: (newSort: SortOption) => void;
  onClose: () => void;
}

const SortOptionsView = ({ currentSort, onSortChange, onClose }: SortOptionsViewProps) => {
  const options: { label: string; value: SortOption }[] = [
    { label: 'Más Recientes', value: { property: 'date', direction: 'desc' } },
    { label: 'Más Antiguos', value: { property: 'date', direction: 'asc' } },
    { label: 'Alfabético (A-Z)', value: { property: 'name', direction: 'asc' } },
    { label: 'Alfabético (Z-A)', value: { property: 'name', direction: 'desc' } },
    { label: 'Color (A-Z)', value: { property: 'color', direction: 'asc' } },
    { label: 'Color (Z-A)', value: { property: 'color', direction: 'desc' } },
  ];

  const handleSelect = (option: SortOption) => {
    onSortChange(option);
    onClose();
  };
  
  const isSelected = (option: SortOption) => {
    return option.property === currentSort.property && option.direction === currentSort.direction;
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end animate-fade-in" onClick={onClose}>
      <div 
        className="w-full bg-background-light dark:bg-gray-800 rounded-t-3xl p-4 animate-sheet-up liquid-glass" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
        <h2 className="text-xl font-bold text-center mb-4 text-text-primary dark:text-gray-200">Ordenar por</h2>
        <div className="space-y-2">
          {options.map(opt => (
            <button
              key={opt.label}
              onClick={() => handleSelect(opt.value)}
              className={`w-full text-left p-3 rounded-xl text-lg font-medium transition-colors ${
                isSelected(opt.value) 
                  ? 'bg-primary text-white' 
                  : 'text-text-primary dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SortOptionsView;