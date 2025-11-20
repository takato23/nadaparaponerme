import React from 'react';
import { motion } from 'framer-motion';

interface PhotoPreviewProps {
  imageDataUrl: string;
  onConfirm: () => void;
  onRetake: () => void;
  qualityWarnings?: string[];
}

const PhotoPreview = ({ imageDataUrl, onConfirm, onRetake, qualityWarnings = [] }: PhotoPreviewProps) => {
  const hasWarnings = qualityWarnings.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-white dark:bg-gray-900"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-serif font-bold text-text-primary dark:text-gray-100">
          ¿Se ve bien la prenda?
        </h2>
        <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
          Verifica que la imagen sea clara y completa
        </p>
      </div>

      {/* Image Preview */}
      <div className="flex-grow relative overflow-hidden bg-gray-100 dark:bg-gray-800">
        <img
          src={imageDataUrl}
          alt="Preview"
          className="w-full h-full object-contain"
        />

        {/* Quality Badge Overlay */}
        {!hasWarnings && (
          <div className="absolute top-4 right-4 px-3 py-2 rounded-full bg-green-500/90 backdrop-blur-sm flex items-center gap-2 text-white text-sm font-semibold shadow-lg">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            Buena Calidad
          </div>
        )}
      </div>

      {/* Quality Warnings */}
      {hasWarnings && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl shrink-0 mt-0.5">
              warning
            </span>
            <div className="flex-grow">
              <h3 className="text-sm font-bold text-yellow-900 dark:text-yellow-100 mb-2">
                Posibles Problemas de Calidad
              </h3>
              <ul className="space-y-1">
                {qualityWarnings.map((warning, i) => (
                  <li key={i} className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                    <span className="shrink-0">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                Puedes continuar o tomar otra foto con mejor calidad.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3 bg-white dark:bg-gray-900">
        <button
          onClick={onConfirm}
          className="w-full bg-primary text-white font-bold py-4 px-6 rounded-2xl shadow-glow-accent hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">auto_awesome</span>
          {hasWarnings ? 'Analizar de Todos Modos' : 'Sí, Analizar con IA'}
        </button>

        <button
          onClick={onRetake}
          className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-text-primary dark:text-gray-200 font-bold py-4 px-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">refresh</span>
          No, Tomar Otra Foto
        </button>

        {/* Quick Tips */}
        <div className="pt-2 text-center">
          <p className="text-xs text-text-secondary dark:text-gray-500">
            Una buena foto mejora la precisión del análisis de IA
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default PhotoPreview;
