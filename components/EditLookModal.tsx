import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import type { GeneratedLook } from '../types';
import { updateLookMetadata } from '../src/services/generatedLooksService';
import Loader from './Loader';

interface EditLookModalProps {
  look: GeneratedLook | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLook: GeneratedLook) => void;
}

export default function EditLookModal({ look, isOpen, onClose, onSave }: EditLookModalProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (look) {
      setTitle(look.title || '');
      setNotes(look.notes || '');
    }
  }, [look]);

  const handleSave = async () => {
    if (!look) return;

    setIsSaving(true);
    try {
      const updated = await updateLookMetadata(look.id, {
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSave(updated);
      toast.success('Look actualizado');
      onClose();
    } catch (error) {
      console.error('Error updating look:', error);
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  if (!look) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Editar look</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
              >
                <span className="material-symbols-outlined text-gray-600">close</span>
              </button>
            </div>

            {/* Preview */}
            <div className="px-4 pt-4">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={look.image_url}
                  alt="Look preview"
                  className="w-20 h-24 rounded-xl object-cover shadow"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">
                    Creado el {new Date(look.created_at).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Preset: {look.generation_preset}
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Título
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Look de verano, Outfit casual..."
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-0 outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notas
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Agregá detalles, ocasión, o lo que quieras recordar..."
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-0 outline-none transition text-sm resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-1">
                  {notes.length}/500
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 pt-0 flex gap-3">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 py-3 rounded-xl border border-gray-200 font-semibold text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 rounded-xl bg-gray-900 font-semibold text-sm text-white hover:bg-gray-800 transition flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader size="small" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
