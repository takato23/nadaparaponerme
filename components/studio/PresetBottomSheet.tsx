import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GENERATION_PRESETS, GenerationPreset } from '../../types';

interface PresetBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPreset: GenerationPreset;
    onSelectPreset: (preset: GenerationPreset) => void;
}

export const PresetBottomSheet: React.FC<PresetBottomSheetProps> = ({
    isOpen,
    onClose,
    selectedPreset,
    onSelectPreset,
}) => {
    const handleSelect = (presetId: GenerationPreset) => {
        onSelectPreset(presetId);
        onClose();
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
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden"
                    >
                        {/* Handle */}
                        <div className="flex justify-center py-3">
                            <div className="w-10 h-1 bg-gray-300 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-5 pb-3 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">Elige un escenario</h3>
                            <p className="text-sm text-gray-500 mt-0.5">¿Dónde querés verte con este look?</p>
                        </div>

                        {/* Preset List */}
                        <div className="overflow-y-auto max-h-[60vh] pb-safe">
                            <div className="p-4 grid grid-cols-2 gap-3">
                                {GENERATION_PRESETS.map(preset => {
                                    const isSelected = selectedPreset === preset.id;

                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => handleSelect(preset.id)}
                                            className={`relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-left ${isSelected
                                                    ? 'border-[#1b1a17] bg-[#1b1a17]/5 shadow-md'
                                                    : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            {/* Icon */}
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isSelected ? 'bg-[#1b1a17] text-white' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                <span className="material-symbols-outlined">{preset.icon}</span>
                                            </div>

                                            {/* Label */}
                                            <p className={`text-sm font-semibold ${isSelected ? 'text-[#1b1a17]' : 'text-gray-800'}`}>
                                                {preset.label}
                                            </p>

                                            {/* Description */}
                                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                                {preset.description}
                                            </p>

                                            {/* Selected indicator */}
                                            {isSelected && (
                                                <div className="absolute top-3 right-3 w-5 h-5 bg-[#1b1a17] rounded-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-white text-sm">check</span>
                                                </div>
                                            )}

                                            {/* Premium badge for editorial */}
                                            {preset.id === 'editorial' && (
                                                <span className="absolute top-3 right-3 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-bold rounded-full">
                                                    PRO
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Safe area padding for iOS */}
                        <div className="h-safe" />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
