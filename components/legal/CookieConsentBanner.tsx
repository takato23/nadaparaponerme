import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../src/routes';
import { setConsentPreferences } from '../../src/services/consentService';
import { useConsentPreferences } from '../../hooks/useConsentPreferences';

export const CookieConsentBanner: React.FC = () => {
  const consent = useConsentPreferences();

  if (consent) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9998] pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-2xl p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Cookies y anuncios
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              Usamos cookies para Analytics y anuncios de AdSense. Solo se activan si aceptás.
              Podés leer <Link to={ROUTES.PRIVACY} className="underline hover:text-gray-900 dark:hover:text-white">Privacidad</Link> y{' '}
              <Link to={ROUTES.TERMS} className="underline hover:text-gray-900 dark:hover:text-white">Términos</Link>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setConsentPreferences({ analytics: false, ads: false })}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Rechazar
            </button>
            <button
              onClick={() => setConsentPreferences({ analytics: true, ads: true })}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition shadow-lg shadow-emerald-500/20"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
