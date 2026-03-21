import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, MessageCircle, ScanSearch, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OjoDeLocaLogo from './OjoDeLocaLogo';
import * as analytics from '../src/services/analyticsService';
import {
  markPublicEntryAuthOpened,
  setPendingPublicEntryIntent,
  type PublicEntryIntent,
} from '../src/services/publicEntryFlow';

type TemplateId = 'editorial' | 'concierge' | 'sprint';

type ChoiceOption = {
  id: string;
  label: string;
  detail: string;
  intent: PublicEntryIntent;
};

type TemplateConfig = {
  id: TemplateId;
  kicker: string;
  title: string;
  summary: string;
  stepTitles: [string, string, string];
  stepDescriptions: [string, string, string];
  progressLabel: string;
  accentClass: string;
  options: ChoiceOption[];
  ctaLabel: string;
};

const TEMPLATE_CONFIGS: TemplateConfig[] = [
  {
    id: 'editorial',
    kicker: 'Template 1',
    title: 'Transformacion editorial',
    summary: 'Vende resultado aspiracional rapido con una demo fuerte y una sola decision.',
    stepTitles: [
      'Mira el cambio antes de explicarlo.',
      'Elegi el resultado que te haria entrar hoy.',
      'Entrá cuando ya viste la promesa.',
    ],
    stepDescriptions: [
      'Un onboarding que abre con impacto visual, no con formulario.',
      'La segunda pantalla reduce la decision a un objetivo claro.',
      'El cierre retoma la transformacion y empuja a conversion.',
    ],
    progressLabel: 'Aspiracional',
    accentClass: 'from-[#f7d5c7]/30 via-[#b15335]/20 to-transparent',
    options: [
      {
        id: 'editorial-look',
        label: 'Quiero mi primer look armado',
        detail: 'Entrar para resolver que me pongo hoy.',
        intent: 'look',
      },
      {
        id: 'editorial-closet',
        label: 'Quiero ordenar mi armario',
        detail: 'Entrar para digitalizar lo que ya tengo.',
        intent: 'closet',
      },
      {
        id: 'editorial-style',
        label: 'Quiero definir mejor mi estilo',
        detail: 'Entrar para darle contexto a la IA.',
        intent: 'style',
      },
    ],
    ctaLabel: 'Abrir el resultado',
  },
  {
    id: 'concierge',
    kicker: 'Template 2',
    title: 'Stylist concierge',
    summary: 'Baja ansiedad con tono de asistente personal y una seleccion guiada.',
    stepTitles: [
      'Habla como si una stylist ya te estuviera esperando.',
      'La conversacion detecta por donde te conviene entrar.',
      'El CTA vende acompanamiento, no solo registro.',
    ],
    stepDescriptions: [
      'El primer paso transmite cercania, criterio y calma.',
      'El segundo paso pide una sola respuesta util para personalizar la experiencia.',
      'El cierre promete una entrada mas contenida y personal.',
    ],
    progressLabel: 'Acompanamiento',
    accentClass: 'from-[#d9c3a2]/25 via-[#5c6d86]/18 to-transparent',
    options: [
      {
        id: 'concierge-style',
        label: 'Necesito que entiendas mi estilo',
        detail: 'Entrar por una experiencia mas personalizada.',
        intent: 'style',
      },
      {
        id: 'concierge-look',
        label: 'Necesito resolver un look rapido',
        detail: 'Entrar por una sugerencia lista para usar.',
        intent: 'look',
      },
      {
        id: 'concierge-closet',
        label: 'Necesito ordenar lo que ya tengo',
        detail: 'Entrar por una base clara en el armario.',
        intent: 'closet',
      },
    ],
    ctaLabel: 'Entrar con una stylist',
  },
  {
    id: 'sprint',
    kicker: 'Template 3',
    title: 'Closet sprint',
    summary: 'Priorizá claridad funcional y velocidad con una promesa concreta.',
    stepTitles: [
      'Promete una mejora puntual en menos tiempo.',
      'Converti la eleccion en una accion de arranque.',
      'El cierre mantiene energia de sprint y poca friccion.',
    ],
    stepDescriptions: [
      'El valor es ordenar el caos rapido, sin discurso aspiracional largo.',
      'El segundo paso define la accion principal con lenguaje directo.',
      'El CTA cierra como arranque operativo.',
    ],
    progressLabel: 'Rapidez',
    accentClass: 'from-[#9bb5aa]/24 via-[#2f5a51]/18 to-transparent',
    options: [
      {
        id: 'sprint-closet',
        label: 'Subir mis prendas primero',
        detail: 'Entrar directo al armario digital.',
        intent: 'closet',
      },
      {
        id: 'sprint-look',
        label: 'Generar un look apenas entro',
        detail: 'Entrar directo a la parte mas util.',
        intent: 'look',
      },
      {
        id: 'sprint-style',
        label: 'Configurar mi perfil y paleta',
        detail: 'Entrar con mas contexto para la IA.',
        intent: 'style',
      },
    ],
    ctaLabel: 'Empezar el sprint',
  },
];

const FOCUS_RING_CLASS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]';
const SURFACE_CLASS = 'rounded-[28px] border border-white/12 bg-white/[0.045] backdrop-blur-xl';
const SECONDARY_SURFACE_CLASS = 'rounded-[24px] border border-white/12 bg-black/28 backdrop-blur';
const PRIMARY_BUTTON_CLASS = `inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.01] active:scale-[0.98] ${FOCUS_RING_CLASS}`;
const SECONDARY_BUTTON_CLASS = `inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white/84 transition hover:border-white/45 hover:text-white ${FOCUS_RING_CLASS}`;
const OPTION_BUTTON_CLASS = `w-full rounded-[22px] border border-white/12 bg-white/[0.03] px-4 py-4 text-left transition hover:border-white/30 hover:bg-white/[0.07] ${FOCUS_RING_CLASS}`;
const STEP_BUTTON_CLASS = `inline-flex items-center justify-center rounded-full border border-white/12 px-4 py-2 text-sm font-medium transition hover:border-white/35 hover:bg-white/[0.08] ${FOCUS_RING_CLASS}`;

const CONCIERGE_CHAT_LINES = [
  'Stylist: Hola. No hace falta que me expliques todo.',
  'Stylist: Decime que te pesa mas cuando te vestis.',
  'Stylist: Yo te acomodo la entrada segun eso.',
];

const CONCIERGE_SELECTION_LINES = [
  'Stylist: Perfecto. Te voy a simplificar la entrada.',
  'Stylist: Elegi una sola necesidad y te llevo por ahi.',
  'Vos: Quiero una opcion que no me haga pensar demasiado.',
];

const SPRINT_METRICS = [
  { label: 'Tiempo para ordenar', value: '5 min' },
  { label: 'Friccion del primer paso', value: 'Baja' },
  { label: 'Promesa', value: 'Accion inmediata' },
];

function BeforeAfterCard({
  compareValue,
  onChange,
}: {
  compareValue: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className={`${SECONDARY_SURFACE_CLASS} p-3`}>
      <div className="mb-3 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/46">
        <span>Antes</span>
        <span>Despues</span>
      </div>

      <div className="relative aspect-[5/6] overflow-hidden rounded-[22px] bg-black/45">
        <img
          src="/images/demo/before.jpg"
          alt="Antes del cambio de look"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - compareValue}% 0 0)` }}
        >
          <img
            src="/images/demo/after.jpg"
            alt="Despues del cambio de look"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div
          className="absolute inset-y-0 z-10 w-px bg-white/80 shadow-[0_0_0_1px_rgba(255,255,255,0.18)]"
          style={{ left: `calc(${compareValue}% - 0.5px)` }}
        />
        <div
          className="absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 -translate-x-1/2 items-center justify-center rounded-full border border-white/20 bg-black/75 text-white shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
          style={{ left: `${compareValue}%` }}
        >
          <span className="text-lg leading-none">↔</span>
        </div>
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 rounded-2xl border border-white/10 bg-black/58 px-3 py-2 text-xs leading-5 text-white/82 backdrop-blur">
          La primera impresion vende el resultado antes de explicar la app.
        </div>
      </div>

      <div className="mt-4 px-1">
        <input
          type="range"
          min={15}
          max={85}
          value={compareValue}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label="Comparar antes y despues editorial"
          className="h-2 w-full cursor-ew-resize appearance-none rounded-full bg-white/14 accent-white"
        />
      </div>
    </div>
  );
}

function ProgressPills({ activeStep }: { activeStep: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Paso ${activeStep + 1} de 3`}>
      {[0, 1, 2].map((stepIndex) => (
        <span
          key={stepIndex}
          className={`h-1.5 rounded-full transition-all ${
            stepIndex <= activeStep ? 'w-10 bg-white' : 'w-6 bg-white/18'
          }`}
        />
      ))}
    </div>
  );
}

function TemplateSection({
  config,
  currentStep,
  selectedOptionId,
  onStepChange,
  onSelectOption,
  onAuth,
  sectionRef,
  compareValue,
  onCompareChange,
}: {
  config: TemplateConfig;
  currentStep: number;
  selectedOptionId: string | null;
  onStepChange: (nextStep: number) => void;
  onSelectOption: (optionId: string) => void;
  onAuth: (mode: 'signup' | 'login') => void;
  sectionRef: React.RefObject<HTMLElement | null>;
  compareValue?: number;
  onCompareChange?: (value: number) => void;
}) {
  const selectedOption = config.options.find((option) => option.id === selectedOptionId) ?? null;
  const isFinalStep = currentStep === 2;

  const renderStepVisual = () => {
    if (config.id === 'editorial') {
      if (currentStep === 0) {
        return (
          <BeforeAfterCard
            compareValue={compareValue ?? 52}
            onChange={onCompareChange ?? (() => undefined)}
          />
        );
      }

      if (currentStep === 1) {
        return (
          <div className={`${SECONDARY_SURFACE_CLASS} p-4 sm:p-5`}>
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-white/48">
              <Sparkles className="h-4 w-4" />
              Resultado deseado
            </div>
            <div className="grid gap-3">
              {config.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectOption(option.id)}
                  className={`${OPTION_BUTTON_CLASS} ${
                    selectedOptionId === option.id ? 'border-white/60 bg-white/[0.11]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{option.label}</p>
                      <p className="mt-1 text-sm text-white/64">{option.detail}</p>
                    </div>
                    {selectedOptionId === option.id ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      }
    }

    if (config.id === 'concierge') {
      return (
        <div className={`${SECONDARY_SURFACE_CLASS} p-4 sm:p-5`}>
          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-white/48">
            <MessageCircle className="h-4 w-4" />
            Concierge flow
          </div>
          <div className="space-y-3">
            {(currentStep === 0 ? CONCIERGE_CHAT_LINES : CONCIERGE_SELECTION_LINES).map((line, index) => (
              <div
                key={`${config.id}-${currentStep}-${index}`}
                className={`max-w-[92%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                  index === 2 ? 'ml-auto bg-white text-black' : 'bg-white/[0.07] text-white/84'
                }`}
              >
                {line}
              </div>
            ))}
          </div>
          {currentStep === 1 ? (
            <div className="mt-4 grid gap-3">
              {config.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectOption(option.id)}
                  className={`${OPTION_BUTTON_CLASS} ${
                    selectedOptionId === option.id ? 'border-white/60 bg-white/[0.11]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{option.label}</p>
                      <p className="mt-1 text-sm text-white/64">{option.detail}</p>
                    </div>
                    {selectedOptionId === option.id ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className={`${SECONDARY_SURFACE_CLASS} p-4 sm:p-5`}>
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-white/48">
          <ScanSearch className="h-4 w-4" />
          Sprint operativo
        </div>
        {currentStep === 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {SPRINT_METRICS.map((metric) => (
              <div key={metric.label} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {config.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectOption(option.id)}
                className={`${OPTION_BUTTON_CLASS} ${
                  selectedOptionId === option.id ? 'border-white/60 bg-white/[0.11]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{option.label}</p>
                    <p className="mt-1 text-sm text-white/64">{option.detail}</p>
                  </div>
                  {selectedOptionId === option.id ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      ref={sectionRef}
      id={`template-${config.id}`}
      data-testid={`onboarding-template-${config.id}`}
      aria-labelledby={`template-title-${config.id}`}
      className="relative scroll-mt-28"
    >
      <div className={`absolute inset-x-0 top-10 h-48 bg-gradient-to-r ${config.accentClass} blur-3xl`} />
      <div className={`relative ${SURFACE_CLASS} overflow-hidden px-5 py-6 sm:px-8 sm:py-8`}>
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />

        <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-white/48">
              <span>{config.kicker}</span>
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <span>{config.progressLabel}</span>
            </div>
            <h2 id={`template-title-${config.id}`} className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {config.title}
            </h2>
            <p className="mt-3 max-w-[52ch] text-sm leading-6 text-white/72 sm:text-base">
              {config.summary}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <ProgressPills activeStep={currentStep} />
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2].map((stepIndex) => (
                <button
                  key={stepIndex}
                  type="button"
                  onClick={() => onStepChange(stepIndex)}
                  aria-pressed={currentStep === stepIndex}
                  className={`${STEP_BUTTON_CLASS} ${
                    currentStep === stepIndex ? 'border-white/55 bg-white/[0.11] text-white' : 'text-white/68'
                  }`}
                >
                  Paso {stepIndex + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">Step copy</p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${config.id}-${currentStep}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    {config.stepTitles[currentStep]}
                  </h3>
                  <p className="mt-3 max-w-[48ch] text-sm leading-6 text-white/72 sm:text-base">
                    {config.stepDescriptions[currentStep]}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className={`${SECONDARY_SURFACE_CLASS} mt-5 p-4`}>
              <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">Decision snapshot</p>
              <p className="mt-3 text-sm leading-6 text-white/82">
                {selectedOption
                  ? `Entrada elegida: ${selectedOption.label}. ${selectedOption.detail}`
                  : 'Todavia no hay una decision tomada. El mock muestra como se sentiria avanzar en este template.'}
              </p>
              {isFinalStep ? (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => onAuth('signup')}
                    className={PRIMARY_BUTTON_CLASS}
                  >
                    Crear cuenta
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAuth('login')}
                    className={SECONDARY_BUTTON_CLASS}
                  >
                    Ya tengo cuenta
                  </button>
                </div>
              ) : (
                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onStepChange(Math.min(currentStep + 1, 2))}
                    disabled={currentStep === 1 && !selectedOption}
                    className={`${PRIMARY_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-35`}
                  >
                    Continuar
                  </button>
                  <span className="text-xs uppercase tracking-[0.22em] text-white/40">
                    {currentStep === 1 && !selectedOption ? 'Elegi una opcion para seguir' : config.ctaLabel}
                  </span>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${config.id}-visual-${currentStep}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {renderStepVisual()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default function OnboardingMockGallery() {
  const navigate = useNavigate();
  const [editorialStep, setEditorialStep] = useState(0);
  const [conciergeStep, setConciergeStep] = useState(0);
  const [sprintStep, setSprintStep] = useState(0);
  const [editorialChoice, setEditorialChoice] = useState<string | null>(null);
  const [conciergeChoice, setConciergeChoice] = useState<string | null>(null);
  const [sprintChoice, setSprintChoice] = useState<string | null>(null);
  const [compareValue, setCompareValue] = useState(52);

  const sectionRefs = {
    editorial: useRef<HTMLElement | null>(null),
    concierge: useRef<HTMLElement | null>(null),
    sprint: useRef<HTMLElement | null>(null),
  };

  useEffect(() => {
    analytics.trackEvent('onboarding_mock_viewed', {
      source: 'onboarding_mock',
      template_count: TEMPLATE_CONFIGS.length,
    });
  }, []);

  useEffect(() => {
    analytics.trackEvent('onboarding_mock_step_viewed', {
      template: 'editorial',
      step_number: editorialStep + 1,
    });
  }, [editorialStep]);

  useEffect(() => {
    analytics.trackEvent('onboarding_mock_step_viewed', {
      template: 'concierge',
      step_number: conciergeStep + 1,
    });
  }, [conciergeStep]);

  useEffect(() => {
    analytics.trackEvent('onboarding_mock_step_viewed', {
      template: 'sprint',
      step_number: sprintStep + 1,
    });
  }, [sprintStep]);

  const selectedIntents = useMemo<Record<TemplateId, PublicEntryIntent>>(
    () => ({
      editorial:
        TEMPLATE_CONFIGS[0].options.find((option) => option.id === editorialChoice)?.intent ?? 'look',
      concierge:
        TEMPLATE_CONFIGS[1].options.find((option) => option.id === conciergeChoice)?.intent ?? 'style',
      sprint:
        TEMPLATE_CONFIGS[2].options.find((option) => option.id === sprintChoice)?.intent ?? 'closet',
    }),
    [conciergeChoice, editorialChoice, sprintChoice],
  );

  const scrollToTemplate = (templateId: TemplateId) => {
    sectionRefs[templateId].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    analytics.trackEvent('onboarding_mock_nav_click', {
      template: templateId,
    });
  };

  const openAuth = (templateId: TemplateId, mode: 'signup' | 'login') => {
    const intent = selectedIntents[templateId];
    setPendingPublicEntryIntent(intent);
    markPublicEntryAuthOpened(intent);
    analytics.trackEvent('onboarding_mock_cta_click', {
      template: templateId,
      mode,
      intent,
    });
    navigate(`/?auth=${mode}`);
  };

  const getAllowedStep = (selectedOptionId: string | null, nextStep: number) => {
    if (nextStep <= 1) return nextStep;
    return selectedOptionId ? 2 : 1;
  };

  return (
    <main
      aria-label="Onboarding mock gallery"
      className="min-h-dvh bg-[#05060a] text-white"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-16 top-0 h-[26rem] w-[26rem] rounded-full bg-[#8b4d39]/24 blur-[140px]" />
        <div className="absolute right-[-10%] top-[22rem] h-[32rem] w-[32rem] rounded-full bg-[#3f5f73]/18 blur-[160px]" />
        <div className="absolute bottom-[-8rem] left-[24%] h-[28rem] w-[28rem] rounded-full bg-[#395247]/18 blur-[150px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 pb-20 pt-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06]">
              <OjoDeLocaLogo className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Exploracion interna</p>
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Onboarding mock gallery
              </h1>
            </div>
          </div>

          <div className="max-w-xl text-sm leading-6 text-white/65">
            Tres propuestas de onboarding para comparar conversion con criterios comparables:
            misma estructura, distinto tono de entrada.
          </div>
        </header>

        <div className="sticky top-0 z-30 mt-5 border-b border-white/10 bg-[#05060a]/88 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_CONFIGS.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => scrollToTemplate(template.id)}
                className={`${SECONDARY_BUTTON_CLASS} !px-4 !py-2`}
              >
                {template.title}
              </button>
            ))}
          </div>
        </div>

        <section className="grid gap-5 py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">Comparacion vertical</p>
            <h2 className="mt-3 max-w-[14ch] text-[clamp(2.6rem,7vw,5.6rem)] font-semibold leading-[0.92] tracking-tight text-white">
              Tres formas de entrar, una sola pregunta de fondo.
            </h2>
          </div>

          <div className={`${SURFACE_CLASS} p-5 text-sm leading-6 text-white/72`}>
            <p>
              La pagina no reemplaza el flujo actual. Sirve para revisar narrativa, friccion y CTA con una
              comparacion limpia. Cada template termina en auth real y conserva una intencion estable:
              editorial apunta a look, concierge a style y sprint a closet.
            </p>
          </div>
        </section>

        <div className="space-y-8">
          <TemplateSection
            config={TEMPLATE_CONFIGS[0]}
            currentStep={editorialStep}
            selectedOptionId={editorialChoice}
            onStepChange={(nextStep) => setEditorialStep(getAllowedStep(editorialChoice, nextStep))}
            onSelectOption={setEditorialChoice}
            onAuth={(mode) => openAuth('editorial', mode)}
            sectionRef={sectionRefs.editorial}
            compareValue={compareValue}
            onCompareChange={setCompareValue}
          />

          <TemplateSection
            config={TEMPLATE_CONFIGS[1]}
            currentStep={conciergeStep}
            selectedOptionId={conciergeChoice}
            onStepChange={(nextStep) => setConciergeStep(getAllowedStep(conciergeChoice, nextStep))}
            onSelectOption={setConciergeChoice}
            onAuth={(mode) => openAuth('concierge', mode)}
            sectionRef={sectionRefs.concierge}
          />

          <TemplateSection
            config={TEMPLATE_CONFIGS[2]}
            currentStep={sprintStep}
            selectedOptionId={sprintChoice}
            onStepChange={(nextStep) => setSprintStep(getAllowedStep(sprintChoice, nextStep))}
            onSelectOption={setSprintChoice}
            onAuth={(mode) => openAuth('sprint', mode)}
            sectionRef={sectionRefs.sprint}
          />
        </div>
      </div>
    </main>
  );
}
