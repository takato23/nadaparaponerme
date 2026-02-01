import { motion } from 'framer-motion';
import { Instagram, Sparkles, Bug, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BetaInstagramWelcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-purple-900 dark:to-pink-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-block"
          >
            <Sparkles className="w-16 h-16 mx-auto text-purple-500" />
          </motion.div>
          
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            ¡Bienvenido, Beta Tester! 🎉
          </h1>
          
          <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
            <Instagram className="w-5 h-5" />
            <p className="text-sm">Gracias por venir desde @santiagobalosky</p>
          </div>
        </div>

        {/* Badge */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-4 text-center">
          <p className="font-bold text-lg">🏆 BETA TESTER #Instagram</p>
          <p className="text-sm opacity-90 mt-1">Sos parte de los primeros 1000 usuarios</p>
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Gift className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Límites 2x más generosos</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">200 créditos de IA + funciones premium gratis</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Bug className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Tu feedback es ORO</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Reportá cualquier bug - lo arreglamos en 24hs</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Acceso temprano</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Probá features nuevas antes que nadie</p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ <strong>Esto está en BETA:</strong> Puede haber bugs. Si algo se rompe, no te preocupes - usá el botón de reportar bug.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/armario')}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-2xl transition-all transform hover:scale-[1.02] shadow-lg"
        >
          Empezar a armar mi closet →
        </button>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Beta testers de Instagram obtienen beneficios por 30 días
        </p>
      </motion.div>
    </div>
  );
}
