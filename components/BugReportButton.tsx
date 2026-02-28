import { useState } from 'react';
import { Bug, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [bug, setBug] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Capturar info automática
    const bugReport = {
      description: bug,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      screen: `${window.innerWidth}x${window.innerHeight}`,
    };

    // Enviar a PostHog o endpoint tuyo
    try {
      // Acá podés conectar con tu backend o PostHog
      console.log('Bug Report:', bugReport);
      
      // Por ahora lo guardo en localStorage para que no se pierda
      const existingBugs = JSON.parse(localStorage.getItem('bug_reports') || '[]');
      existingBugs.push(bugReport);
      localStorage.setItem('bug_reports', JSON.stringify(existingBugs));
      
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setBug('');
      }, 2000);
    } catch (error) {
      console.error('Error reporting bug:', error);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-safe-6 right-safe-6 bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg z-50 flex items-center gap-2"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Bug className="w-6 h-6" />
        <span className="hidden sm:inline font-semibold">Reportar Bug</span>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              {submitted ? (
                <div className="text-center space-y-4 py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-block"
                  >
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                      <Send className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    ¡Gracias! 🙏
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Te respondemos en menos de 24hs
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Bug className="w-6 h-6 text-red-500" />
                      Reportar Bug
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ¿Qué pasó? 🤔
                    </label>
                    <textarea
                      value={bug}
                      onChange={(e) => setBug(e.target.value)}
                      placeholder="Ej: Cuando intenté subir una foto, la app se trabó..."
                      className="w-full h-32 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      required
                    />
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-xs text-gray-600 dark:text-gray-300">
                    <p className="font-semibold mb-1">Se incluye automáticamente:</p>
                    <ul className="space-y-0.5 ml-4 list-disc">
                      <li>Página actual: {window.location.pathname}</li>
                      <li>Navegador: {navigator.userAgent.split(' ').slice(-2).join(' ')}</li>
                      <li>Hora: {new Date().toLocaleString('es-AR')}</li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    disabled={!bug.trim()}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all"
                  >
                    Enviar Reporte →
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
