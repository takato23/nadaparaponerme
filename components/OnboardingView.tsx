/**
 * OnboardingView - Bienvenida de Alto Impacto
 * 
 * Mejoras aplicadas:
 * - Eliminación del carrusel estático (Anti-Safe Harbor)
 * - Diseño Asimétrico de 1 sola pantalla para cero fricción.
 * - Tipografía masiva (Massive Typographic Hero).
 * - Badges flotantes en Z-axis en lugar de listar aburridas opciones.
 * - Sin uso de morado (Purple Ban), paleta contrastante premium.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, WandSparkles, Palette, Camera } from 'lucide-react';
import { ROUTES } from '../src/routes';
import OjoDeLocaLogo from './OjoDeLocaLogo';

interface OnboardingViewProps {
  onComplete: () => void;
}

const FOCUS_RING_CLASS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]';

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#0a0a0d] text-white">
      {/* Dynamic Background Noise & Blur */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Soft, non-purple glows (Emerald and Deep Azure). Keeping it premium tech. */}
        <div className="absolute -top-[10%] -left-[10%] w-[50vh] h-[50vh] bg-teal-500/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[20%] right-[-5%] w-[60vh] h-[60vh] bg-sky-600/15 rounded-full blur-[120px]" />
        {/* Film grain effect overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
        />
      </div>

      <div className="relative w-full h-full max-w-5xl mx-auto flex flex-col px-6 py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-between items-center shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-none border border-white/10 flex items-center justify-center">
              <OjoDeLocaLogo className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-sm tracking-widest uppercase text-white/90">No Tengo Nada</span>
          </div>
          <button
            onClick={onComplete}
            className={`text-xs uppercase tracking-[0.2em] font-medium text-white/50 hover:text-white transition-colors ${FOCUS_RING_CLASS}`}
          >
            Saltar
          </button>
        </motion.header>

        {/* Main Content - Asymmetric typographic layout */}
        <div className="flex-1 min-h-0 flex flex-col justify-center mt-6 lg:mt-0 lg:flex-row lg:items-center lg:gap-12">

          <div className="flex-[1.2] flex flex-col z-10 w-full mb-10 lg:mb-0">
            {/* Tiny brutalist badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 self-start px-2 py-1 mb-6 border border-white/20 bg-black/40 text-[10px] font-bold uppercase tracking-[0.25em] text-white/80"
            >
              <div className="w-1.5 h-1.5 bg-emerald-500" />
              Armario real
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(2.5rem,8vw,5.5rem)] font-extrabold leading-[0.9] tracking-tight text-white mb-6"
            >
              Subí tu ropa.
              <span className="block text-white/40 italic font-serif mt-1">Organizala una vez.</span>
              Resolvé qué ponerte.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="text-white/60 text-base md:text-lg max-w-[40ch] leading-relaxed mb-10"
            >
              Convertí tu ropa real en un armario digital útil. Guardá looks, planificá la semana y comprá solo cuando de verdad falte algo.
            </motion.p>
          </div>

          {/* Floating Badges Visualization (Z-axis depth) */}
          <div className="flex-1 relative h-[300px] sm:h-[350px] w-full max-w-[450px] mx-auto lg:h-[450px] z-0">

            {/* Badge 1 */}
            <motion.div
              initial={{ opacity: 0, y: 50, rotate: -5 }}
              animate={{ opacity: 1, y: 0, rotate: -6 }}
              transition={{ duration: 0.8, delay: 0.7, type: 'spring' }}
              className="absolute top-[10%] left-[5%] p-4 bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex items-center gap-3 z-10 w-[240px]"
            >
              <div className="w-10 h-10 bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">Subí tus prendas</p>
                <p className="text-[10px] text-white/60 tracking-wider uppercase mt-0.5">Carga rápida</p>
              </div>
            </motion.div>

            {/* Badge 2 */}
            <motion.div
              initial={{ opacity: 0, x: 50, rotate: 5 }}
              animate={{ opacity: 1, x: 0, rotate: 8 }}
              transition={{ duration: 0.8, delay: 0.9, type: 'spring' }}
              className="absolute top-[40%] right-[0%] p-4 bg-[#111] border border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.8)] flex items-center gap-3 z-30 w-[260px]"
            >
              <div className="w-10 h-10 bg-white text-black flex items-center justify-center shrink-0">
                <WandSparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">Decidí más rápido</p>
                <p className="text-[10px] text-white/60 tracking-wider uppercase mt-0.5">Hoy, evento o viaje</p>
              </div>
              <Sparkles className="absolute -top-2 -right-2 text-white/30 w-6 h-6" />
            </motion.div>

            {/* Badge 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30, rotate: 2 }}
              animate={{ opacity: 1, y: 0, rotate: -2 }}
              transition={{ duration: 0.8, delay: 1.1, type: 'spring' }}
              className="absolute bottom-[10%] left-[15%] p-4 bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center gap-3 z-20 w-[230px]"
            >
              <div className="w-10 h-10 bg-sky-500/20 flex items-center justify-center shrink-0">
                <Palette className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">Guardá tus looks</p>
                <p className="text-[10px] text-white/60 tracking-wider uppercase mt-0.5">Repetí mejor</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.4 }}
          className="shrink-0 flex flex-col items-center pt-8 mt-auto border-t border-white/10"
        >
          <button
            onClick={onComplete}
            className={`w-full max-w-[400px] sm:w-[320px] py-4 bg-white text-black font-extrabold text-[15px] uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${FOCUS_RING_CLASS}`}
          >
            Empezar con mi armario
          </button>

          <div className="mt-5 text-center">
            <p className="text-[11px] text-white/30 tracking-wide">
              Al continuar aceptás los{' '}
              <Link to={ROUTES.TERMS} className="text-white/50 hover:text-white transition-colors underline decoration-white/20 underline-offset-2">
                Términos
              </Link>
              {' '}y{' '}
              <Link to={ROUTES.PRIVACY} className="text-white/50 hover:text-white transition-colors underline decoration-white/20 underline-offset-2">
                Privacidad
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingView;
