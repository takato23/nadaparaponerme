import React from 'react';
import { motion } from 'framer-motion';

interface PhotoGuidanceModalProps {
  onClose: () => void;
  onShowExample?: () => void;
}

const PhotoGuidanceModal = ({ onClose, onShowExample }: PhotoGuidanceModalProps) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">photo_camera</span>
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold">Tips para Fotos Perfectas</h2>
              <p className="text-white/80 text-sm">Asegura la mejor calidad de análisis</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Good Photos Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
              </div>
              <h3 className="text-lg font-bold text-text-primary dark:text-gray-100">Buena Foto</h3>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {[
                { icon: 'crop_free', text: 'Prenda completa y centrada en el cuadro' },
                { icon: 'wb_sunny', text: 'Luz natural clara (cerca de ventana)' },
                { icon: 'square', text: 'Fondo liso y de color claro' },
                { icon: 'remove_red_eye', text: 'Imagen nítida, sin desenfoque' },
                { icon: 'straighten', text: 'Prenda extendida o colgada (no arrugada)' }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/10">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl shrink-0">
                    {item.icon}
                  </span>
                  <span className="text-sm text-green-800 dark:text-green-200">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bad Photos Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400">cancel</span>
              </div>
              <h3 className="text-lg font-bold text-text-primary dark:text-gray-100">Evita Estas Fotos</h3>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {[
                { icon: 'blur_on', text: 'Foto borrosa o movida' },
                { icon: 'brightness_low', text: 'Demasiado oscura o con flash directo' },
                { icon: 'texture', text: 'Fondo confuso o desordenado' },
                { icon: 'crop', text: 'Prenda cortada o incompleta' },
                { icon: 'layers', text: 'Varias prendas juntas o superpuestas' }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl shrink-0">
                    {item.icon}
                  </span>
                  <span className="text-sm text-red-800 dark:text-red-200">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tips */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-sm">checkroom</span>
                <h3 className="text-sm font-bold text-text-primary dark:text-gray-100 uppercase tracking-wider">
                  Posición de la Prenda
                </h3>
              </div>
              <p className="text-xs text-text-secondary dark:text-gray-400 mb-2">
                Podés sacarlas de 3 formas:
              </p>
              <ul className="grid grid-cols-1 gap-2">
                {[
                  { title: 'Colgada (Recomendado)', desc: 'En una percha sobre una pared blanca.' },
                  { title: 'Plana', desc: 'Sobre una mesa o piso liso y despejado.' },
                  { title: 'Puesta', desc: 'Frente a un espejo o alguien te saca.' }
                ].map((item, i) => (
                  <li key={i} className="text-xs text-text-secondary dark:text-gray-400">
                    <span className="font-bold text-primary">• {item.title}:</span> {item.desc}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-sm">settings_backup_restore</span>
                <h3 className="text-sm font-bold text-text-primary dark:text-gray-100 uppercase tracking-wider">
                  Vista de Espalda
                </h3>
              </div>
              <p className="text-xs text-text-secondary dark:text-gray-400">
                Si tomás la espalda, asegurate de usar el mismo método (si la colgaste para el frente, colgada para la espalda) y la misma distancia para que el tamaño coincida.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          {onShowExample && (
            <button
              onClick={onShowExample}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-primary text-primary font-semibold hover:bg-primary/5 transition-colors"
            >
              Ver Ejemplos
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-semibold shadow-glow-accent hover:scale-[1.02] transition-transform"
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PhotoGuidanceModal;
