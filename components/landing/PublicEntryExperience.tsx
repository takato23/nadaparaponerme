import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Palette, Shirt, Sparkles } from 'lucide-react';
import AuthView from '../AuthView';
import OjoDeLocaLogo from '../OjoDeLocaLogo';
import { useMatchMedia } from '../../src/hooks/useMatchMedia';
import * as analytics from '../../src/services/analyticsService';
import {
  getPendingPublicEntryIntent,
  markPublicEntryAuthOpened,
  setPendingPublicEntryIntent,
  type PublicEntryIntent,
} from '../../src/services/publicEntryFlow';

const Eye3D = lazy(() => import('../Eye3D'));

class SilentEyeBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[public-entry] Eye3D disabled after render error:', error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface PublicEntryExperienceProps {
  authInitialMode: 'login' | 'signup';
  showAuth: boolean;
  onCloseAuth: () => void;
  onOpenAuth: (mode: 'login' | 'signup', intent?: PublicEntryIntent) => void;
  onLoggedIn: () => void;
}

type EntryCard = {
  id: PublicEntryIntent;
  helper: string;
  title: string;
  outcome: string;
  accent: string;
  icon: React.ReactNode;
};

const ENTRY_OPTIONS: EntryCard[] = [
  {
    id: 'look',
    helper: 'subir 3 looks',
    title: 'Arrancar por looks',
    outcome: 'Entrás a Looks para subir 3 outfits tuyos, recibir cruces útiles y arrancar con Kumbi desde algo real.',
    accent: '#6FD4E7',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: 'closet',
    helper: 'subir prendas',
    title: 'Cargar ropa',
    outcome: 'Entrás directo al armario digital con foco en carga y organización.',
    accent: '#D6BA95',
    icon: <Shirt className="h-4 w-4" />,
  },
  {
    id: 'style',
    helper: 'ordenar mejor',
    title: 'Definir estilo',
    outcome: 'Entrás al perfil de estilo para mejorar sugerencias y compras futuras.',
    accent: '#8BC6B2',
    icon: <Palette className="h-4 w-4" />,
  },
];

const FOCUS_RING_CLASS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#eef3f8]';

const getIntentLabel = (intent: PublicEntryIntent | null) =>
  ENTRY_OPTIONS.find((option) => option.id === intent)?.title ?? ENTRY_OPTIONS[0].title;

function supportsWebGL(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

export default function PublicEntryExperience({
  authInitialMode,
  showAuth,
  onCloseAuth,
  onOpenAuth,
  onLoggedIn,
}: PublicEntryExperienceProps) {
  const prefersReducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)');
  const isSmallScreen = useMatchMedia('(max-width: 640px)');
  const isShortViewport = useMatchMedia('(max-height: 760px)');
  const dpr: number | [number, number] = isSmallScreen ? [1, 1.2] : [1, 1.5];
  const blinkInterval = prefersReducedMotion ? 7200 : 4200;
  const [selectedIntent, setSelectedIntent] = useState<PublicEntryIntent>(() => getPendingPublicEntryIntent() ?? 'look');
  const [canRenderEye3D, setCanRenderEye3D] = useState(false);

  const selectedEntry = useMemo(
    () => ENTRY_OPTIONS.find((option) => option.id === selectedIntent) ?? ENTRY_OPTIONS[0],
    [selectedIntent],
  );

  const accentGlow = `${selectedEntry.accent}33`;
  const accentBorder = `${selectedEntry.accent}55`;
  const accentSoft = `${selectedEntry.accent}22`;
  const routeLabel =
    selectedEntry.id === 'closet' ? 'Armario' : selectedEntry.id === 'look' ? 'Looks' : 'Perfil';
  const primaryActionLabel =
    selectedEntry.id === 'closet'
      ? 'Crear cuenta e ir al armario'
      : selectedEntry.id === 'look'
        ? 'Crear cuenta y subir 3 looks'
        : 'Crear cuenta y seguir al perfil';

  useEffect(() => {
    analytics.trackEvent('public_entry_viewed', {
      stage: 'centered_eye',
      auth_visible: showAuth,
    });
  }, [showAuth]);

  useEffect(() => {
    setCanRenderEye3D(supportsWebGL());
  }, []);

  useEffect(() => {
    setPendingPublicEntryIntent(selectedIntent);
  }, [selectedIntent]);

  const handleIntentSelect = (intent: PublicEntryIntent) => {
    setSelectedIntent(intent);
    analytics.trackEvent('public_entry_intent_selected', {
      intent,
      stage: 'centered_eye',
    });
  };

  const openAuth = (mode: 'login' | 'signup') => {
    markPublicEntryAuthOpened(selectedIntent);
    analytics.trackEvent('auth_opened', {
      mode,
      source: 'public_entry',
      selected_intent: selectedIntent ?? 'none',
      stage: 'centered_eye',
    });
    onOpenAuth(mode, selectedIntent ?? undefined);
  };

  return (
    <main
      role="main"
      aria-label="Landing"
      data-entry-stage="centered-eye"
      className="relative min-h-dvh overflow-hidden bg-[#eef3f8] text-slate-950"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: [
            `radial-gradient(42% 34% at 22% 18%, ${accentGlow} 0%, rgba(255,255,255,0) 72%)`,
            'radial-gradient(36% 34% at 82% 20%, rgba(141,211,255,0.28) 0%, rgba(255,255,255,0) 70%)',
            'radial-gradient(34% 30% at 70% 78%, rgba(244,201,160,0.22) 0%, rgba(255,255,255,0) 72%)',
            'linear-gradient(135deg, #f7f8fc 0%, #edf2ff 46%, #f8f1ea 100%)',
          ].join(','),
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 rounded-full border border-black/8 bg-white/72 px-3 py-2 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-slate-950 text-white">
              <OjoDeLocaLogo className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Ojo de Loca</p>
              <p className="text-sm font-semibold text-slate-950">Entrada al dashboard</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openAuth('login')}
            className={`rounded-full border border-black/8 bg-white/72 px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.06)] transition hover:bg-white ${FOCUS_RING_CLASS}`}
          >
            Ya tengo cuenta
          </button>
        </header>

        <section className={`grid flex-1 gap-6 py-6 lg:grid-cols-[1fr_0.95fr] lg:items-center ${isShortViewport ? 'lg:py-5' : 'lg:py-8'}`}>
          <div className="order-2 flex flex-col lg:order-1">
            <div
              className="inline-flex w-fit items-center gap-2 rounded-full border border-black/8 bg-white/72 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
              style={{ boxShadow: `0 18px 60px ${accentSoft}` }}
            >
              onboarding al armario
            </div>

            <h1 className={`max-w-[11ch] font-semibold leading-[0.9] tracking-[-0.07em] text-slate-950 ${isShortViewport ? 'mt-4 text-[clamp(2.2rem,5.2vw,3.9rem)]' : 'mt-5 text-[clamp(2.8rem,6vw,4.8rem)]'}`}>
              Entrá al dashboard desde tu armario.
            </h1>

            <p className={`max-w-[38ch] text-slate-600 ${isShortViewport ? 'mt-3 text-[14px] leading-6 sm:text-[15px]' : 'mt-4 text-[15px] leading-7 sm:text-[17px]'}`}>
              Elegí cómo querés arrancar: subiendo 3 looks tuyos para recibir ayuda rápido, o cargando prendas si preferís precisión desde el primer día.
            </p>

            <div
              className="mt-5 rounded-[28px] border border-black/8 bg-white/76 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5"
              style={{ boxShadow: `0 22px 70px ${accentSoft}` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Primer destino</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{routeLabel}</p>
                </div>
                <span
                  className="inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700"
                  style={{ borderColor: accentBorder, backgroundColor: accentSoft }}
                >
                  {selectedEntry.helper}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{selectedEntry.outcome}</p>
            </div>

            <div className={`mt-5 flex w-full max-w-[42rem] flex-col items-stretch gap-3 sm:flex-row ${isShortViewport ? '' : 'sm:items-center'}`}>
              <button
                type="button"
                onClick={() => openAuth('signup')}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-slate-950 px-5 py-4 text-base font-bold text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] transition hover:scale-[1.01] hover:bg-slate-900 sm:w-auto sm:min-w-[19rem] ${FOCUS_RING_CLASS}`}
              >
                {primaryActionLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
              <div className="w-full rounded-[22px] border border-black/8 bg-white/76 px-4 py-3 text-left text-sm leading-6 text-slate-600 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:max-w-[19rem]">
                Entrás con una sola decision y la app conserva ese contexto para llevarte directo a la vista correcta.
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="rounded-[32px] border border-black/8 bg-white/74 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Preview</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Dashboard de entrada</h2>
                </div>
                <div className="rounded-2xl border border-black/8 bg-slate-950 px-4 py-3 text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)]">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Ruta</p>
                  <p className="mt-2 text-sm font-semibold">{routeLabel}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[28px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.82))] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Entrada estable</p>
                    <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">Primero valor real, después profundidad.</p>
                  </div>
                  <div className="relative h-20 w-32 overflow-hidden rounded-[22px] border border-black/8 bg-slate-950/95">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-90"
                      style={{ background: `radial-gradient(circle at 50% 50%, ${accentSoft} 0%, rgba(15,23,42,0) 72%)` }}
                    />
                    {canRenderEye3D ? (
                      <SilentEyeBoundary>
                        <Suspense fallback={<div className="absolute inset-0 rounded-[22px] bg-slate-950" />}>
                          <Eye3D
                            variant="landing"
                            blinkInterval={blinkInterval}
                            reducedMotion={prefersReducedMotion}
                            dpr={dpr}
                            className="absolute inset-0"
                          />
                        </Suspense>
                      </SilentEyeBoundary>
                    ) : (
                      <div className="absolute inset-0 rounded-[22px] bg-slate-950" />
                    )}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    { id: 'look', title: 'Looks', detail: 'Subir y reinterpretar', icon: 'style' },
                    { id: 'closet', title: 'Armario', detail: 'Carga y orden', icon: 'checkroom' },
                    { id: 'style', title: 'Perfil', detail: 'Definir estilo', icon: 'tune' },
                    { id: 'saved', title: 'Kumbi', detail: 'Pedir variantes', icon: 'forum' },
                  ].map((card) => {
                    const isActive =
                      (card.id === 'saved' && selectedEntry.id === 'look') ||
                      (card.id !== 'saved' && card.id === selectedEntry.id);
                    return (
                      <div
                        key={card.id}
                        className={`rounded-[22px] border p-3 transition ${isActive ? 'bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]' : 'bg-white/74 text-slate-950'}`}
                        style={{ borderColor: isActive ? selectedEntry.accent : 'rgba(15,23,42,0.08)' }}
                      >
                        <span className="material-symbols-rounded text-[24px]">{card.icon}</span>
                        <p className="mt-3 text-sm font-semibold">{card.title}</p>
                        <p className={`mt-1 text-xs ${isActive ? 'text-white/70' : 'text-slate-500'}`}>{card.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="order-3 grid w-full gap-3 sm:grid-cols-3 lg:col-span-2">
            {ENTRY_OPTIONS.map((option) => {
              const isSelected = option.id === selectedIntent;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleIntentSelect(option.id)}
                  onMouseEnter={() => setSelectedIntent(option.id)}
                  className={`rounded-[24px] border px-4 text-left shadow-[0_18px_60px_rgba(15,23,42,0.06)] transition sm:px-5 ${isShortViewport ? 'py-3' : 'py-4'} ${FOCUS_RING_CLASS} ${
                    isSelected
                      ? 'bg-slate-950 text-white'
                      : 'border-black/8 bg-white/74 text-slate-950 hover:bg-white'
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: `${option.accent}88`,
                          boxShadow: `0 22px 70px ${option.accent}2A`,
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/80"
                      style={isSelected ? { borderColor: `${option.accent}55`, color: option.accent } : { borderColor: 'rgba(15,23,42,0.08)' }}
                    >
                      {option.icon}
                    </span>
                    {isSelected ? <Check className="ml-auto h-3.5 w-3.5" /> : null}
                  </div>
                  <p className={`mt-3 text-[10px] uppercase tracking-[0.24em] ${isSelected ? 'text-white/55' : 'text-slate-500'}`}>{option.helper}</p>
                  <p className="mt-1 text-[15px] font-semibold leading-5">{option.title}</p>
                  <p className={`mt-2 text-sm leading-6 ${isSelected ? 'text-white/72' : 'text-slate-600'}`}>{option.outcome}</p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mx-auto mt-auto flex w-full max-w-6xl items-center justify-between gap-3 text-[11px] text-slate-500 sm:text-xs">
          <div className="flex items-center gap-3 uppercase tracking-[0.2em]">
            <span>Ojo</span>
            <span className="h-1 w-1 rounded-full bg-slate-400" />
            <span>Closet</span>
            <span className="h-1 w-1 rounded-full bg-slate-400" />
            <span>{routeLabel}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/legal/privacidad" className="transition hover:text-slate-950">Privacidad</a>
            <a href="/legal/terminos" className="transition hover:text-slate-950">Terminos</a>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAuth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 pb-3 pt-20 backdrop-blur-xl sm:items-center sm:px-6 sm:pb-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.985 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-[min(88dvh,780px)] w-full max-w-xl overflow-hidden rounded-[32px] border border-white/10 bg-[#05060a] shadow-[0_30px_120px_rgba(0,0,0,0.6)]"
            >
              <button
                type="button"
                onClick={onCloseAuth}
                className={`absolute right-4 top-4 z-[60] rounded-full border border-white/12 bg-black/28 px-3 py-1.5 text-sm font-medium text-white/80 transition hover:border-white/28 hover:text-white ${FOCUS_RING_CLASS}`}
              >
                Cerrar
              </button>
              <div className="pointer-events-none absolute left-4 top-4 z-[55] rounded-2xl border border-white/10 bg-black/35 px-3 py-2 backdrop-blur">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/44">Entrás por</p>
                <p className="mt-1 text-sm font-semibold text-white/88">{getIntentLabel(selectedIntent)}</p>
              </div>
              <AuthView onLogin={onLoggedIn} initialMode={authInitialMode} variant="eye" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
