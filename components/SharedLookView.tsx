import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { SharedGeneratedLook } from '../src/services/generatedLooksService';
import { getGeneratedLookByShareToken } from '../src/services/generatedLooksService';
import Loader from './Loader';

const studioTheme = {
  '--studio-ink': '#1b1a17',
  '--studio-ink-muted': 'rgba(27, 26, 23, 0.6)',
  '--studio-paper': '#f8f3ee',
  '--studio-rose': '#f5a7a3',
  '--studio-mint': '#9ad4c0',
} as React.CSSProperties;

export default function SharedLookView() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [look, setLook] = useState<SharedGeneratedLook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getShareErrorMessage = (message: string) => {
    const normalized = message.toLowerCase();
    if (normalized.includes('inválido') || normalized.includes('inv') || normalized.includes('válido')) {
      return 'El link de compartido no es válido.';
    }
    if (normalized.includes('expir') || normalized.includes('expiró') || normalized.includes('disponible')) {
      return 'Este link ya no está disponible.';
    }
    if (normalized.includes('no autenticado')) {
      return 'No se pudo validar el acceso.';
    }
    return 'No se pudo cargar el look compartido.';
  };

  useEffect(() => {
    async function loadLook() {
      if (!token) {
        setError('Link inválido');
        setIsLoading(false);
        return;
      }

      try {
        const data = await getGeneratedLookByShareToken(token);
        if (!data) {
          setError('Este look no existe, fue desactivado o el enlace expiró.');
        } else {
          setLook(data);
        }
      } catch (err) {
        console.error('Error loading shared look:', err);
        const message = err instanceof Error ? err.message : 'Error al cargar el look';
        setError(getShareErrorMessage(message));
      } finally {
        setIsLoading(false);
      }
    }

    loadLook();
  }, [token]);

  const handleDownload = async () => {
    if (!look) return;

    try {
      const response = await fetch(look.image_url);
      if (!response.ok) {
        throw new Error('No se pudo descargar la imagen compartida.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `look-${look.id.slice(0, 8)}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: look?.title || 'Mirá este look',
          text: 'Creado con No Tengo Nada Para Ponerme',
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copiado al portapapeles');
    }
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ ...studioTheme, background: 'var(--studio-paper)' }}
      >
        <Loader />
      </div>
    );
  }

  if (error || !look) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ ...studioTheme, background: 'var(--studio-paper)' }}
      >
        <span className="material-symbols-outlined text-6xl text-[color:var(--studio-ink-muted)] mb-4">
          broken_image
        </span>
        <h1 className="text-xl font-semibold text-[color:var(--studio-ink)] mb-2">
          {error || 'Look no encontrado'}
        </h1>
        <p className="text-sm text-[color:var(--studio-ink-muted)] mb-6 text-center">
          {error || 'El look que buscás no existe o el link expiró.'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-xl bg-[color:var(--studio-ink)] text-white font-semibold"
        >
          Ir al inicio
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ ...studioTheme, fontFamily: '"Poppins", sans-serif' }}
    >
      {/* Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 15% 10%, rgba(245, 167, 163, 0.25), transparent 45%), radial-gradient(circle at 85% 0%, rgba(154, 212, 192, 0.25), transparent 40%), linear-gradient(180deg, #f8f3ee 0%, #f0e7dd 100%)'
        }}
      />

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--studio-ink-muted)] mb-1">
            Look compartido
          </p>
          <h1
            className="text-2xl font-semibold text-[color:var(--studio-ink)]"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            {look.title || 'Look generado'}
          </h1>
          <p className="text-xs text-[color:var(--studio-ink-muted)] mt-1">
            {new Date(look.created_at).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </motion.header>

        {/* Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative rounded-3xl overflow-hidden shadow-2xl mb-6"
        >
          <img
            src={look.image_url}
            alt={look.title || 'Look compartido'}
            className="w-full aspect-[3/4] object-cover"
          />

          {/* Watermark */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 backdrop-blur-sm">
              <span className="text-lg">👁️</span>
              <span className="text-xs font-semibold text-[color:var(--studio-ink)]">
                No Tengo Nada Para Ponerme
              </span>
            </div>
            <div className="px-3 py-2 rounded-full bg-white/80 backdrop-blur-sm">
              <span className="text-xs text-[color:var(--studio-ink-muted)]">
                {look.generation_preset}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Notes */}
        {look.notes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/60 rounded-2xl p-4 mb-6 border border-white/70"
          >
            <p className="text-sm text-[color:var(--studio-ink)]">{look.notes}</p>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-3"
        >
          <button
            onClick={handleDownload}
            className="flex-1 py-4 rounded-2xl bg-white/80 border border-white/70 font-semibold text-sm text-[color:var(--studio-ink)] flex items-center justify-center gap-2 hover:bg-white transition"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Descargar
          </button>
          <button
            onClick={handleShare}
            className="flex-1 py-4 rounded-2xl bg-[color:var(--studio-ink)] font-semibold text-sm text-white flex items-center justify-center gap-2 hover:opacity-90 transition"
          >
            <span className="material-symbols-outlined text-lg">share</span>
            Compartir
          </button>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-[color:var(--studio-ink-muted)] mb-3">
            ¿Querés crear tus propios looks?
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[color:var(--studio-rose)] to-[color:var(--studio-mint)] font-semibold text-sm text-white shadow-lg"
          >
            Probá la app gratis
          </button>
        </motion.div>
      </div>
    </div>
  );
}
