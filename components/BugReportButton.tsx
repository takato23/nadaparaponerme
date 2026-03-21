import { useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Bug, ExternalLink, Instagram, Mail, Send, X } from 'lucide-react';
import * as analytics from '../src/services/analyticsService';
import { generateErrorMailto, submitErrorReport } from '../src/services/errorReportingService';
import { getCurrentReleaseIdentifier } from '../src/services/releaseInfo';

const INSTAGRAM_URL = 'https://instagram.com/ojodeloca.app';
const SUPPORT_EMAIL = 'soporte@ojodeloca.app';

export default function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [bug, setBug] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const releaseId = useMemo(() => getCurrentReleaseIdentifier(), []);

  const fallbackMailto = useMemo(() => {
    return generateErrorMailto({
      error_name: 'beta_support_request',
      error_message: bug.trim() || 'Reporte sin detalle',
      url: window.location.href,
      user_agent: navigator.userAgent,
      user_comment: bug.trim() || undefined,
    });
  }, [bug]);

  const handleClose = () => {
    setIsOpen(false);
    setSubmitError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!bug.trim() || isSubmitting) return;

    const bugReport = {
      description: bug.trim(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      screen: `${window.innerWidth}x${window.innerHeight}`,
    };

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const existingBugs = JSON.parse(localStorage.getItem('bug_reports') || '[]');
      existingBugs.push(bugReport);
      localStorage.setItem('bug_reports', JSON.stringify(existingBugs));

      const result = await submitErrorReport({
        error_name: 'beta_support_request',
        error_message: bugReport.description,
        url: bugReport.url,
        user_agent: bugReport.userAgent,
        user_comment: `Pantalla: ${bugReport.screen}\nHora: ${bugReport.timestamp}`,
      });

      if (!result.success) {
        throw new Error(result.error || 'No se pudo enviar el reporte');
      }

      analytics.trackEvent('bug_report_submitted', {
        surface: 'floating_beta_support',
      });

      setSubmitted(true);
      window.setTimeout(() => {
        setSubmitted(false);
        setBug('');
        handleClose();
      }, 2200);
    } catch (error) {
      console.error('Error reporting bug:', error);
      setSubmitError('No se pudo enviar desde la app. Probá por mail o Instagram.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-safe-6 right-safe-6 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-black/80 px-4 py-3 text-white shadow-2xl backdrop-blur-xl transition-colors hover:bg-black"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        title={`Release ${releaseId}`}
      >
        <Bug className="h-5 w-5 text-pink-400" />
        <span className="hidden text-sm font-semibold sm:inline">Soporte beta</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl dark:bg-gray-900"
            >
              {submitted ? (
                <div className="space-y-4 px-6 py-10 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                      <Send className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Te leo.</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Quedó guardado para revisión. Si es algo urgente de pago, escribime también por Instagram.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                        <Bug className="h-5 w-5 text-pink-500" />
                        Soporte beta
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Si algo se rompió, el pago no impactó o viste algo raro, dejalo acá.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                      aria-label="Cerrar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="rounded-2xl border border-pink-100 bg-pink-50/70 p-3 text-xs text-pink-900 dark:border-pink-900/40 dark:bg-pink-950/20 dark:text-pink-100">
                    <p className="font-semibold">Incluye automáticamente:</p>
                    <p className="mt-1">
                      ruta {window.location.pathname} · pantalla {window.innerWidth}x{window.innerHeight} · hora {new Date().toLocaleString('es-AR')}
                    </p>
                    <p className="mt-1 font-mono text-[11px]">
                      release {releaseId}
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      ¿Qué pasó?
                    </label>
                    <textarea
                      value={bug}
                      onChange={(e) => setBug(e.target.value)}
                      placeholder="Ej: pagué con MercadoPago y seguí viendo Free, o el armario no cargó."
                      className="h-32 w-full resize-none rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      required
                    />
                  </div>

                  {submitError && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="font-semibold">No salió desde la app.</p>
                          <p className="mt-1">{submitError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <Mail className="h-4 w-4" />
                      Mail
                    </a>
                    <a
                      href={INSTAGRAM_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <Instagram className="h-4 w-4" />
                      Instagram
                    </a>
                  </div>

                  {submitError && (
                    <a
                      href={fallbackMailto}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir mail con reporte
                    </a>
                  )}

                  <button
                    type="submit"
                    disabled={!bug.trim() || isSubmitting}
                    className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-orange-500 py-3 font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar reporte'}
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
