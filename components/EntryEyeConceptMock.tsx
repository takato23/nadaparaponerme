import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Palette, Shirt, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OjoDeLocaLogo from './OjoDeLocaLogo';
import { useMatchMedia } from '../src/hooks/useMatchMedia';
import * as analytics from '../src/services/analyticsService';
import {
  markPublicEntryAuthOpened,
  setPendingPublicEntryIntent,
  type PublicEntryIntent,
} from '../src/services/publicEntryFlow';

const Eye3D = lazy(() => import('./Eye3D'));

class SilentEyeBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[entry-eye-mock] Eye3D disabled after render error:', error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const ENTRY_OPTIONS: Array<{
  id: PublicEntryIntent;
  label: string;
  helper: string;
  outcome: string;
  accent: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'closet',
    label: 'Subir armario',
    helper: 'digitalizar prendas',
    outcome: 'Entrás directo al armario digital con foco en carga y organización.',
    accent: '#D6BA95',
    icon: <Shirt className="h-4 w-4" />,
  },
  {
    id: 'look',
    label: 'Armar look',
    helper: 'resolver ahora',
    outcome: 'Entrás con la IA lista para combinar tu closet.',
    accent: '#6FD4E7',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: 'style',
    label: 'Definir estilo',
    helper: 'afinar criterio',
    outcome: 'Entrás al perfil de estilo para que la app te entienda mejor.',
    accent: '#8BC6B2',
    icon: <Palette className="h-4 w-4" />,
  },
];

const FOCUS_RING_CLASS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070d]';

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

export default function EntryEyeConceptMock() {
  const navigate = useNavigate();
  const prefersReducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)');
  const isSmallScreen = useMatchMedia('(max-width: 640px)');
  const dpr: number | [number, number] = isSmallScreen ? [1, 1.2] : [1, 1.6];
  const blinkInterval = prefersReducedMotion ? 7200 : 4200;
  const [selectedIntent, setSelectedIntent] = useState<PublicEntryIntent>('closet');
  const [canRenderEye3D, setCanRenderEye3D] = useState(false);

  useEffect(() => {
    setCanRenderEye3D(supportsWebGL());
  }, []);

  useEffect(() => {
    analytics.trackEvent('entry_eye_mock_viewed', {
      source: 'entry_eye_mock_minimal',
    });
  }, []);

  useEffect(() => {
    analytics.trackEvent('entry_eye_mock_intent_selected', {
      intent: selectedIntent,
    });
  }, [selectedIntent]);

  const selectedEntry = useMemo(
    () => ENTRY_OPTIONS.find((option) => option.id === selectedIntent) ?? ENTRY_OPTIONS[0],
    [selectedIntent],
  );
  const accentGlow = `${selectedEntry.accent}33`;
  const accentBorder = `${selectedEntry.accent}55`;
  const accentSoft = `${selectedEntry.accent}22`;

  const openAuth = (mode: 'signup' | 'login') => {
    setPendingPublicEntryIntent(selectedIntent);
    markPublicEntryAuthOpened(selectedIntent);
    analytics.trackEvent('entry_eye_mock_cta_click', {
      mode,
      intent: selectedIntent,
    });
    navigate(`/?auth=${mode}`);
  };

  return (
    <main aria-label="Entry eye concept mock" className="relative min-h-dvh overflow-hidden bg-[#06070d] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: [
            `radial-gradient(40% 34% at 50% 34%, ${accentGlow} 0%, rgba(88,165,255,0) 72%)`,
            'radial-gradient(30% 26% at 18% 18%, rgba(219, 176, 132, 0.18) 0%, rgba(219,176,132,0) 66%)',
            'radial-gradient(28% 30% at 82% 78%, rgba(115, 170, 154, 0.16) 0%, rgba(115,170,154,0) 70%)',
            'linear-gradient(180deg, #070910 0%, #0b1019 100%)',
          ].join(','),
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[78rem] flex-col px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[rgba(255,255,255,0.035)] px-3 py-2 backdrop-blur-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.07]">
              <OjoDeLocaLogo className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/42">Concept mock</p>
              <p className="text-sm font-semibold text-white/88">Ojo centrado + acceso directo</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openAuth('login')}
            className={`rounded-full border border-white/12 bg-black/26 px-4 py-3 text-sm font-medium text-white/78 transition hover:border-white/28 hover:text-white ${FOCUS_RING_CLASS}`}
          >
            Ya tengo cuenta
          </button>
        </div>

        <section className="flex flex-1 flex-col items-center justify-center py-2 text-center sm:py-4">
          <div className="relative flex w-full items-center justify-center">
            <div
              className="pointer-events-none absolute h-[14rem] w-[14rem] rounded-full blur-3xl sm:h-[18rem] sm:w-[18rem]"
              style={{ backgroundColor: accentSoft }}
            />
            <div
              className="pointer-events-none absolute h-[19rem] w-[19rem] rounded-full border bg-white/[0.015] sm:h-[24rem] sm:w-[24rem]"
              style={{ borderColor: accentBorder }}
            />

            <div className="relative h-[9rem] w-[min(82vw,20rem)] sm:h-[10.4rem] sm:w-[min(48vw,22rem)]">
              {canRenderEye3D ? (
                <SilentEyeBoundary>
                  <Suspense fallback={<div className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.04]" />}>
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
                <div className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.04]" />
              )}
            </div>
          </div>

          <div
            className="mt-1 inline-flex items-center gap-2 rounded-full border bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/48"
            style={{ borderColor: accentBorder }}
          >
            tu armario con ia
          </div>

          <h1 className="mt-4 max-w-[10.6ch] text-[clamp(2.55rem,6.8vw,4.75rem)] font-semibold leading-[0.9] tracking-[-0.07em] text-white">
            Entendé tu closet antes de pensar qué ponerte.
          </h1>

          <p className="mt-3 max-w-[38ch] text-[15px] leading-6 text-white/66 sm:text-[17px] sm:leading-7">
            Ojo de Loca convierte tu ropa real en un armario digital, te ayuda a combinarla y aprende tu estilo sin meterte en un onboarding forzado.
          </p>

          <div className="mt-5 grid w-full max-w-[52rem] grid-cols-3 gap-2 sm:gap-3">
            {ENTRY_OPTIONS.map((option) => {
              const isSelected = option.id === selectedIntent;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedIntent(option.id)}
                  onMouseEnter={() => setSelectedIntent(option.id)}
                  className={`rounded-[20px] border px-3 py-3 text-left transition sm:px-4 sm:py-3.5 ${FOCUS_RING_CLASS} ${
                    isSelected
                      ? 'bg-white/[0.11] shadow-[0_18px_40px_rgba(255,255,255,0.06)]'
                      : 'border-white/10 bg-white/[0.04] hover:border-white/22 hover:bg-white/[0.06]'
                  }`}
                  style={isSelected ? { borderColor: `${option.accent}66`, backgroundImage: `linear-gradient(180deg, ${option.accent}14 0%, rgba(255,255,255,0.05) 100%)` } : undefined}
                >
                  <div className="flex items-center gap-2 text-white/88">
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/[0.08]"
                      style={isSelected ? { borderColor: `${option.accent}55`, color: option.accent } : undefined}
                    >
                      {option.icon}
                    </span>
                    {isSelected ? <Check className="ml-auto h-3.5 w-3.5" /> : null}
                  </div>
                  <p className="mt-2 text-[9px] uppercase tracking-[0.24em] text-white/40 sm:text-[10px]">{option.helper}</p>
                  <p className="mt-1 text-[13px] font-semibold leading-4 text-white sm:text-[15px] sm:leading-5">{option.label}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex w-full max-w-[42rem] flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => openAuth('signup')}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-white px-5 py-4 text-base font-bold text-black transition hover:scale-[1.01] sm:w-auto sm:min-w-[18rem] ${FOCUS_RING_CLASS}`}
            >
              Crear cuenta y entrar
              <ArrowRight className="h-4 w-4" />
            </button>
            <div
              className="w-full rounded-[20px] border bg-white/[0.03] px-4 py-3 text-left text-sm leading-6 text-white/62 sm:w-auto sm:max-w-[22rem]"
              style={{ borderColor: accentBorder }}
            >
              {selectedEntry.outcome}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
