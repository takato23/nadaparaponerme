import React from 'react';
import type { SortOption } from '../types';
import { SwipeableModal } from './ui/SwipeableModal';

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
    <SwipeableModal
      isOpen={true}
      onClose={onClose}
      title="Ordenar por"
    >
      <div className="space-y-2">
        {options.map(opt => (
          <button
            key={opt.label}
            onClick={() => handleSelect(opt.value)}
            className={`w-full text-left p-3 rounded-xl text-lg font-medium transition-colors ${isSelected(opt.value)
                ? 'bg-primary text-white'
                : 'text-text-primary dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </SwipeableModal>
  );
};

export default SortOptionsView;
