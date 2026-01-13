/**
 * OnboardingView - Bienvenida Mejorada para Beta
 * 
 * Mejoras:
 * - Animaciones con framer-motion
 * - Diseño más visual y móvil-friendly
 * - Pasos claros y concisos
 * - Botón destacado para empezar
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ROUTES } from '../src/routes';
import OjoDeLocaLogo from './OjoDeLocaLogo';
import { useThemeContext } from '../contexts/ThemeContext';

interface OnboardingViewProps {
  onComplete: () => void;
}

interface Step {
  icon: string;
  title: string;
  description: string;
  gradient: string;
}

const STEPS: Step[] = [
  {
    icon: 'add_a_photo',
    title: 'Subí tu ropa',
    description: 'Sacale fotos a tus prendas y la IA las analiza automáticamente',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: 'auto_awesome',
    title: 'Generá outfits',
    description: 'Pedí looks para cualquier ocasión: trabajo, cita, viaje...',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: 'chat',
    title: 'Preguntale a la IA',
    description: 'Chat 24/7 para consejos de moda y combinaciones',
    gradient: 'from-emerald-500 to-teal-500',
  },
];

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
      }`}
    >
      <div className="w-full max-w-md">
        {/* Logo y Skip */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10">
              <OjoDeLocaLogo className="w-full h-full text-primary" />
            </div>
            <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>No Tengo Nada</span>
          </div>
          <button
            onClick={handleSkip}
            className={`text-sm font-medium transition-colors ${
              isDark ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Saltar
          </button>
        </div>

        {/* Contenido animado */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            {/* Ícono grande con gradiente */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br ${STEPS[currentStep].gradient} flex items-center justify-center shadow-lg`}
            >
              <span className="material-symbols-outlined text-white text-5xl">
                {STEPS[currentStep].icon}
              </span>
            </motion.div>

            {/* Título */}
            <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {STEPS[currentStep].title}
            </h2>

            {/* Descripción */}
            <p className={`text-lg mb-8 max-w-xs mx-auto ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
              {STEPS[currentStep].description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Indicadores de paso */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition-all duration-300 ${index === currentStep
                  ? 'w-8 bg-primary'
                  : isDark ? 'w-2 bg-white/30 hover:bg-white/50' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
            />
          ))}
        </div>

        {/* Botón principal */}
        <motion.button
          onClick={handleNext}
          whileTap={{ scale: 0.95 }}
          className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl transition-all"
        >
          {currentStep < STEPS.length - 1 ? 'Siguiente' : '¡Empezar!'}
        </motion.button>

        {/* Texto de privacidad */}
        <p className={`text-xs text-center mt-4 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
          Al continuar aceptás los{' '}
          <Link to={ROUTES.TERMS} className={`underline ${isDark ? 'hover:text-white' : 'hover:text-slate-700'}`}>
            términos y condiciones
          </Link>{' '}
          y la{' '}
          <Link to={ROUTES.PRIVACY} className={`underline ${isDark ? 'hover:text-white' : 'hover:text-slate-700'}`}>
            política de privacidad
          </Link>
        </p>
      </div>
    </motion.div>
  );
};

export default OnboardingView;
