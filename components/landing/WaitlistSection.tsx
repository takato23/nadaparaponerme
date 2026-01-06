import React, { useState } from 'react';
import { joinWaitlist } from '../../src/services/waitlistService';
import * as analytics from '../../src/services/analyticsService';
import { useThemeContext } from '../../contexts/ThemeContext';

export default function WaitlistSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'loading') return;

    setStatus('loading');

    const result = await joinWaitlist(email, 'landing_waitlist');

    if (result.success) {
      setStatus('success');
      analytics.trackWaitlistSignup();
      setEmail('');
    } else {
      setStatus('error');
    }

    setMessage(result.message);

    // Reset status after 5 seconds
    setTimeout(() => {
      if (result.success) {
        setStatus('idle');
        setMessage('');
      }
    }, 5000);
  };

  return (
    <section className={`relative py-16 px-4 transition-colors duration-500 ${
      isDark ? 'bg-gradient-to-b from-[#05060a] to-[#0a0b10]' : 'bg-gradient-to-b from-slate-100 to-slate-50'
    }`}>
      <div className="max-w-xl mx-auto text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 ${
          isDark ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-100 border border-purple-200'
        }`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
          </span>
          <span className={`text-xs font-medium ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>Beta privada - Cupos limitados</span>
        </div>

        <h2 className={`text-2xl sm:text-3xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
          Sumate a la lista de espera
        </h2>
        <p className={`mb-8 max-w-md mx-auto ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
          Sé de los primeros en probar la app. Los primeros 500 usuarios tendrán acceso gratuito a features Pro por 3 meses.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            disabled={status === 'loading' || status === 'success'}
            className={`flex-1 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 transition-all ${
              isDark
                ? 'bg-white/5 border border-white/10 text-white placeholder-white/40'
                : 'bg-white border border-slate-200 text-slate-800 placeholder-slate-400 shadow-sm'
            }`}
            required
          />
          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
          >
            {status === 'loading' ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Enviando...
              </span>
            ) : status === 'success' ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                ¡Anotado!
              </span>
            ) : (
              'Anotarme'
            )}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm ${status === 'success' ? 'text-green-500' : 'text-amber-500'}`}>
            {message}
          </p>
        )}

        <p className={`mt-6 text-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
          No spam. Solo te avisamos cuando esté listo.
        </p>
      </div>
    </section>
  );
}
