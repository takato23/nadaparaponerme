import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, MessageCircle, Sparkles, Target } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as analytics from '../src/services/analyticsService';
import { supabase } from '../src/lib/supabase';
import OjoDeLocaLogo from './OjoDeLocaLogo';

type LabVariant = 'hero' | 'decision' | 'quiz' | 'chat';

type QuickOption = {
  id: string;
  label: string;
};

const VARIANTS: Array<{ id: LabVariant; label: string; subtitle: string }> = [
  { id: 'hero', label: 'Hero', subtitle: 'Demo primero' },
  { id: 'decision', label: 'Decision', subtitle: 'Objetivo primero' },
  { id: 'quiz', label: 'Quiz', subtitle: '3 preguntas' },
  { id: 'chat', label: 'Chat', subtitle: 'Conversación guiada' },
];

const HERO_IMAGES = {
  before: '/images/demo/before.jpg',
  after: '/images/demo/after.jpg',
};

const DECISION_GOALS: QuickOption[] = [
  { id: 'wardrobe', label: 'Cargar mi armario' },
  { id: 'ai_looks', label: 'Armar looks' },
  { id: 'colorimetry', label: 'Definir estilo' },
  { id: 'weekly', label: 'Planificar semana' },
];

const QUIZ_OCCASIONS: QuickOption[] = [
  { id: 'wardrobe', label: 'Cargar armario' },
  { id: 'looks', label: 'Armar looks' },
  { id: 'style_profile', label: 'Definir estilo personal' },
  { id: 'all', label: 'Todo junto' },
];

const QUIZ_MOODS: QuickOption[] = [
  { id: 'quick', label: 'Rápido (1 click)' },
  { id: 'guided', label: 'Guiado paso a paso' },
  { id: 'advanced', label: 'Herramientas Pro' },
  { id: 'explore', label: 'Explorar opciones' },
];

const QUIZ_SEASONS: QuickOption[] = [
  { id: 'upload', label: 'Subir prendas ahora' },
  { id: 'goals', label: 'Elegir objetivos' },
  { id: 'color', label: 'Configurar colorimetría' },
  { id: 'first_look', label: 'Generar primer look' },
];

const CHAT_REPLIES: QuickOption[] = [
  { id: 'wardrobe', label: 'Quiero cargar mi armario' },
  { id: 'ai', label: 'Quiero armar looks' },
  { id: 'style', label: 'Quiero definir mi estilo' },
];

const FOCUS_RING_CLASS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]';
const SURFACE_CLASS = 'rounded-2xl border border-white/[0.16] bg-white/[0.06] backdrop-blur-sm';
const OPTION_CLASS = `rounded-2xl border border-white/[0.18] bg-white/[0.04] hover:bg-white/[0.10] hover:border-white/[0.35] transition ${FOCUS_RING_CLASS}`;

const getTotalSteps = (variant: LabVariant): number => {
  switch (variant) {
    case 'hero':
      return 1;
    case 'decision':
      return 2;
    case 'quiz':
      return 3;
    case 'chat':
      return 2;
    default:
      return 1;
  }
};

const isVariant = (value: string | null): value is LabVariant => {
  return value === 'hero' || value === 'decision' || value === 'quiz' || value === 'chat';
};

const getVariantFromSearch = (value: string | null): LabVariant => {
  return isVariant(value) ? value : 'hero';
};

const OnboardingLabView = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const variant = getVariantFromSearch(searchParams.get('v'));

  const [step, setStep] = useState(0);
  const [heroMode, setHeroMode] = useState<'before' | 'after'>('before');

  const [decisionGoal, setDecisionGoal] = useState('');
  const [quizOccasion, setQuizOccasion] = useState('');
  const [quizMood, setQuizMood] = useState('');
  const [quizSeason, setQuizSeason] = useState('');
  const [chatReply, setChatReply] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const sessionIdRef = useRef('lab_pending');

  const totalSteps = getTotalSteps(variant);
  const isFinalStep = step >= totalSteps - 1;

  useEffect(() => {
    const storageKey = 'ojodeloca-onboarding-lab-session-id';
    const existingSessionId = sessionStorage.getItem(storageKey);
    if (existingSessionId) {
      sessionIdRef.current = existingSessionId;
      return;
    }

    let nextSessionId = 'lab_session';
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      nextSessionId = `lab_${crypto.randomUUID()}`;
    } else {
      nextSessionId = `lab_${new Date().toISOString()}`;
    }

    sessionStorage.setItem(storageKey, nextSessionId);
    sessionIdRef.current = nextSessionId;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const legacyAuth = localStorage.getItem('ojodeloca-is-authenticated') === 'true';
      if (legacyAuth) {
        if (!cancelled) setIsAuthenticated(true);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!cancelled) {
          setIsAuthenticated(Boolean(session?.user));
        }
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      }
    };

    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isVariant(searchParams.get('v'))) {
      const next = new URLSearchParams(searchParams);
      next.set('v', 'hero');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (sessionIdRef.current === 'lab_pending') return;
    analytics.trackEvent('onboarding_lab_view', {
      variant,
      session_id: sessionIdRef.current,
      source: 'onboarding_lab',
    });
  }, [variant]);

  useEffect(() => {
    if (sessionIdRef.current === 'lab_pending') return;
    analytics.trackEvent('onboarding_lab_step_reached', {
      variant,
      session_id: sessionIdRef.current,
      step_number: step + 1,
      total_steps: totalSteps,
    });
  }, [step, totalSteps, variant]);

  const canContinue = useMemo(() => {
    if (variant === 'hero') return false;

    if (variant === 'decision') {
      return step === 0 ? Boolean(decisionGoal) : false;
    }

    if (variant === 'quiz') {
      if (step === 0) return Boolean(quizOccasion);
      if (step === 1) return Boolean(quizMood);
      return false;
    }

    if (variant === 'chat') {
      return step === 0 ? Boolean(chatReply) : false;
    }

    return false;
  }, [chatReply, decisionGoal, quizMood, quizOccasion, step, variant]);

  const selectedVariant = VARIANTS.find((item) => item.id === variant) || VARIANTS[0];
  const finalStepReady = useMemo(() => {
    if (variant === 'quiz' && step === 2) return Boolean(quizSeason);
    if (variant === 'decision' && step === 1) return Boolean(decisionGoal);
    if (variant === 'chat' && step === 1) return Boolean(chatReply);
    return true;
  }, [chatReply, decisionGoal, quizSeason, step, variant]);

  const updateVariant = (nextVariant: LabVariant) => {
    const next = new URLSearchParams(searchParams);
    next.set('v', nextVariant);
    setSearchParams(next);
    setStep(0);
    analytics.trackEvent('onboarding_lab_variant_switch', {
      session_id: sessionIdRef.current,
      from_variant: variant,
      to_variant: nextVariant,
    });
  };

  const goNext = () => {
    if (!canContinue) return;

    analytics.trackEvent('onboarding_lab_next_click', {
      variant,
      session_id: sessionIdRef.current,
      step_number: step + 1,
    });

    setStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const goBack = () => {
    if (step === 0) return;
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const goAuth = (mode: 'signup' | 'login') => {
    analytics.trackEvent('onboarding_lab_cta_click', {
      variant,
      session_id: sessionIdRef.current,
      step_number: step + 1,
      cta: mode,
    });

    if (mode === 'signup') {
      analytics.trackEvent('onboarding_lab_signup_start', {
        variant,
        session_id: sessionIdRef.current,
      });
    }

    navigate(`/?auth=${mode}`);
  };

  const renderHeroVariant = () => (
    <>
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/[0.07] text-xs uppercase tracking-[0.2em] text-white/85">
          <Sparkles className="w-3.5 h-3.5" />
          Armario primero
        </div>
        <h2 className="text-[clamp(2rem,6vw,3.8rem)] font-semibold leading-[0.94] max-w-[12ch] mx-auto">
          Vestite con lo que ya tenés
        </h2>
        <p className="text-sm sm:text-base text-white/75">Subí tu ropa, organizala y resolvé qué ponerte más rápido.</p>
      </div>

      <div className={`w-full max-w-[620px] p-2.5 sm:p-3 ${SURFACE_CLASS}`}>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => setHeroMode('before')}
            className={`py-2 rounded-xl text-sm font-semibold transition ${FOCUS_RING_CLASS} ${heroMode === 'before'
              ? 'bg-white text-black'
              : 'border border-white/15 text-white/75 hover:text-white'}`}
          >
            Antes
          </button>
          <button
            type="button"
            onClick={() => setHeroMode('after')}
            className={`py-2 rounded-xl text-sm font-semibold transition ${FOCUS_RING_CLASS} ${heroMode === 'after'
              ? 'bg-white text-black'
              : 'border border-white/15 text-white/75 hover:text-white'}`}
          >
            Después
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-black/35 h-[19vh] sm:h-[23vh] max-h-[240px] min-h-[145px]">
          <img
            src={heroMode === 'before' ? HERO_IMAGES.before : HERO_IMAGES.after}
            alt={heroMode === 'before' ? 'Demo antes' : 'Demo después'}
            className="absolute inset-0 w-full h-full object-contain"
          />
          <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/75 text-[10px] font-semibold uppercase tracking-[0.28em]">
            {heroMode === 'before' ? 'Antes' : 'Después'}
          </span>
        </div>
      </div>
    </>
  );

  const renderDecisionVariant = () => {
    if (step === 0) {
      return (
        <>
          <div className="text-center space-y-2">
            <h2 className="text-[clamp(1.55rem,4.6vw,2.35rem)] font-semibold leading-tight">¿Qué querés lograr primero?</h2>
            <p className="text-sm text-white/74">Seleccioná tu objetivo principal.</p>
          </div>

          <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DECISION_GOALS.map((goal) => {
              const isSelected = decisionGoal === goal.id;
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => setDecisionGoal(goal.id)}
                  className={`p-3 text-left ${OPTION_CLASS} ${isSelected ? 'bg-white/[0.14] border-white' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Target className="w-4 h-4 text-white/80" />
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-tight">{goal.label}</p>
                </button>
              );
            })}
          </div>
        </>
      );
    }

    const selected = DECISION_GOALS.find((item) => item.id === decisionGoal);

    return (
      <>
        <div className="text-center space-y-2">
          <h2 className="text-[clamp(1.65rem,4.9vw,2.6rem)] font-semibold leading-tight">Objetivo capturado</h2>
          <p className="text-sm text-white/74">Empezaremos por: <span className="text-white font-medium">{selected?.label || 'Objetivo'}</span></p>
        </div>

        <div className={`w-full max-w-xl p-4 text-sm text-white/80 ${SURFACE_CLASS}`}>
          Flujo sugerido: armario listo + primer look guardado + planificación semanal.
        </div>
      </>
    );
  };

  const renderQuizVariant = () => {
    if (step === 0) {
      return (
        <>
          <div className="text-center space-y-2">
            <h2 className="text-[clamp(1.55rem,4.6vw,2.35rem)] font-semibold leading-tight">1/3 · ¿Qué querés activar primero?</h2>
          </div>
          <div className="w-full max-w-2xl grid grid-cols-2 gap-3">
            {QUIZ_OCCASIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setQuizOccasion(item.id)}
                className={`p-3 text-left ${OPTION_CLASS} ${quizOccasion === item.id ? 'bg-white/[0.14] border-white' : ''}`}
              >
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <div className="text-center space-y-2">
            <h2 className="text-[clamp(1.55rem,4.6vw,2.35rem)] font-semibold leading-tight">2/3 · ¿Cómo querés la ayuda?</h2>
          </div>
          <div className="w-full max-w-2xl grid grid-cols-2 gap-3">
            {QUIZ_MOODS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setQuizMood(item.id)}
                className={`p-3 text-left ${OPTION_CLASS} ${quizMood === item.id ? 'bg-white/[0.14] border-white' : ''}`}
              >
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      );
    }

    const selectedOccasion = QUIZ_OCCASIONS.find((item) => item.id === quizOccasion);
    const selectedMood = QUIZ_MOODS.find((item) => item.id === quizMood);

    return (
      <>
        <div className="text-center space-y-2">
          <h2 className="text-[clamp(1.55rem,4.6vw,2.35rem)] font-semibold leading-tight">3/3 · Punto de inicio</h2>
        </div>

        <div className="w-full max-w-2xl grid grid-cols-2 gap-3">
          {QUIZ_SEASONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setQuizSeason(item.id)}
              className={`p-3 text-left ${OPTION_CLASS} ${quizSeason === item.id ? 'bg-white/[0.14] border-white' : ''}`}
            >
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {quizSeason && (
          <div className={`w-full max-w-2xl p-3 text-xs sm:text-sm text-white/80 ${SURFACE_CLASS}`}>
            Resultado: {selectedOccasion?.label} + {selectedMood?.label} + {QUIZ_SEASONS.find((item) => item.id === quizSeason)?.label}
          </div>
        )}
      </>
    );
  };

  const renderChatVariant = () => {
    if (step === 0) {
      return (
        <>
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/[0.07] text-xs uppercase tracking-[0.18em] text-white/85">
              <MessageCircle className="w-3.5 h-3.5" />
              Chat onboarding
            </div>
            <h2 className="text-[clamp(1.55rem,4.6vw,2.35rem)] font-semibold leading-tight">Contame cómo querés empezar</h2>
          </div>

          <div className="w-full max-w-2xl space-y-2">
            <div className={`max-w-[85%] px-3 py-2 text-sm ${SURFACE_CLASS}`}>
              Hola, soy tu asistente de armario. ¿Empezamos por cargar ropa, armar looks o definir tu estilo?
            </div>
            <div className="grid gap-2 pt-1">
              {CHAT_REPLIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setChatReply(item.id)}
                  className={`text-left px-3 py-2.5 text-sm ${OPTION_CLASS} ${chatReply === item.id ? 'bg-white/[0.14] border-white' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </>
      );
    }

    const selected = CHAT_REPLIES.find((item) => item.id === chatReply);

    return (
      <>
        <div className="text-center space-y-2">
          <h2 className="text-[clamp(1.65rem,4.9vw,2.6rem)] font-semibold leading-tight">Perfecto, vamos por ahí</h2>
          <p className="text-sm text-white/74">Respuesta elegida: <span className="text-white font-medium">{selected?.label}</span></p>
        </div>

        <div className="w-full max-w-2xl space-y-2">
          <div className={`max-w-[85%] px-3 py-2 text-sm ${SURFACE_CLASS}`}>
            Genial. Armamos tu armario base y te dejo tu primer look guardado para usar de nuevo.
          </div>
          <div className={`ml-auto max-w-[85%] px-3 py-2 text-sm ${SURFACE_CLASS}`}>
            Dale, empecemos.
          </div>
        </div>
      </>
    );
  };

  const renderVariantStep = () => {
    if (variant === 'hero') return renderHeroVariant();
    if (variant === 'decision') return renderDecisionVariant();
    if (variant === 'quiz') return renderQuizVariant();
    return renderChatVariant();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#05060a] text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-16 -left-12 w-[320px] h-[320px] bg-fuchsia-500/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-14 right-[-6%] w-[360px] h-[360px] bg-sky-500/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative h-full w-full max-w-6xl mx-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col">
        <header className="flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <OjoDeLocaLogo className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/55">Onboarding Lab</p>
              <p className="text-base sm:text-lg font-semibold">Mockups comparables</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? '/' : '/stylist-onboarding')}
            className={`text-sm text-white/80 hover:text-white transition ${FOCUS_RING_CLASS}`}
          >
            {isAuthenticated ? 'Ir al inicio' : 'Volver al onboarding real'}
          </button>
        </header>

        <div className="mt-4 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {VARIANTS.map((item) => {
            const isActive = item.id === variant;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => updateVariant(item.id)}
                className={`rounded-xl p-2 text-left border transition-all ${FOCUS_RING_CLASS} ${isActive
                  ? 'border-white bg-white/[0.16]'
                  : 'border-white/20 bg-white/[0.04] hover:bg-white/[0.10] hover:border-white/35'}`}
              >
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-white/70 mt-0.5">{item.subtitle}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-3 shrink-0 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/55">
          <span>{selectedVariant.label}</span>
          <span>Paso {step + 1} de {totalSteps}</span>
        </div>

        <main className="mt-2 flex-1 min-h-0 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.section
              key={`${variant}-${step}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 sm:gap-5 text-center"
            >
              {renderVariantStep()}
            </motion.section>
          </AnimatePresence>
        </main>

        <footer className="shrink-0 grid gap-2.5 pb-[max(env(safe-area-inset-bottom),6px)]">
          {!isFinalStep && variant !== 'hero' && (
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinue}
              className={`w-full py-3 sm:py-3.5 rounded-2xl font-bold text-base sm:text-lg transition ${FOCUS_RING_CLASS} ${canContinue
                ? 'bg-white text-black hover:scale-[1.01]'
                : 'bg-white/10 text-white/45 cursor-not-allowed'}`}
            >
              Siguiente
            </button>
          )}

          {(isFinalStep || variant === 'hero') && (
            <>
              <button
                type="button"
                onClick={() => goAuth('signup')}
                disabled={!finalStepReady}
                className={`w-full py-3 sm:py-3.5 rounded-2xl font-bold text-base sm:text-lg bg-white text-black hover:scale-[1.01] transition ${FOCUS_RING_CLASS}`}
              >
                Crear cuenta
              </button>

              <button
                type="button"
                onClick={() => goAuth('login')}
                disabled={!finalStepReady}
                className={`w-full py-2.5 sm:py-3 rounded-2xl border border-white/20 text-white/85 hover:text-white hover:border-white/40 transition ${FOCUS_RING_CLASS}`}
              >
                Ya tengo cuenta
              </button>

              {!finalStepReady && (
                <p className="text-xs text-center text-white/60">
                  Elegí una opción para completar el paso actual.
                </p>
              )}
            </>
          )}

          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              className={`text-sm text-white/75 hover:text-white transition ${FOCUS_RING_CLASS}`}
            >
              Volver
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default OnboardingLabView;
