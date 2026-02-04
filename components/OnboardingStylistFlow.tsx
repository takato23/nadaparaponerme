import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Sparkles, Heart, Briefcase, Star, PartyPopper, Target, Palette, UserRound } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';
import OjoDeLocaLogo from './OjoDeLocaLogo';

// Types
// Demo-first onboarding for pre-login acquisition.
type OnboardingStep = 'demo' | 'style_goals' | 'body_shape' | 'color_season' | 'cta';

type StylistDraft = {
  bodyShape: string;
  colorSeason: string;
  goals: string[];
};

const DRAFT_STORAGE_KEY = 'ojodeloca-stylist-draft';
const ONBOARDING_SEEN_KEY = 'ojodeloca-has-onboarded';

const DEMO_IMAGES = {
  before: '/images/demo/before.jpg',
  after: '/images/demo/after.jpg',
};
const DEMO_ITEMS = {
  top: '/images/demo/items/top.jpg',
  bottom: '/images/demo/items/bottom.jpg',
};

const BODY_SHAPES = [
  { id: 'hourglass', label: 'Reloj de Arena', image: '/images/onboarding/hourglass.png' },
  { id: 'triangle', label: 'Triángulo', image: '/images/onboarding/triangle.png' },
  { id: 'inverted_triangle', label: 'Triángulo Invertido', image: '/images/onboarding/inverted_triangle.png' },
  { id: 'rectangle', label: 'Rectángulo', image: '/images/onboarding/rectangle.png' },
  { id: 'oval', label: 'Oval', image: '/images/onboarding/oval.png' }
];

const SEASONS = [
  { id: 'spring', label: 'Primavera', colors: ['#ff9a9e', '#fad0c4', '#a18cd1'] },
  { id: 'summer', label: 'Verano', colors: ['#a1c4fd', '#c2e9fb', '#fbc2eb'] },
  { id: 'autumn', label: 'Otoño', colors: ['#d4fc79', '#96e6a1', '#84fab0'] },
  { id: 'winter', label: 'Invierno', colors: ['#0f172a', '#1f2937', '#334155'] },
];

const STYLE_GOALS = [
  { id: 'confidence', label: 'Sentirme más segura', icon: Heart, color: 'from-pink-500 to-rose-500' },
  { id: 'professional', label: 'Verme más profesional', icon: Briefcase, color: 'from-sky-500 to-indigo-500' },
  { id: 'trendy', label: 'Estar a la moda', icon: Star, color: 'from-amber-500 to-orange-500' },
  { id: 'express', label: 'Expresar mi personalidad', icon: PartyPopper, color: 'from-purple-500 to-fuchsia-500' },
  { id: 'optimize', label: 'Optimizar mi armario', icon: Target, color: 'from-emerald-500 to-teal-500' },
];

export const OnboardingStylistFlow = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>('demo');
  const [demoMode, setDemoMode] = useState<'before' | 'after'>('after');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useLocalStorage<StylistDraft>(DRAFT_STORAGE_KEY, {
    bodyShape: '',
    colorSeason: '',
    goals: [],
  });

  const stepOrder: OnboardingStep[] = ['demo', 'style_goals', 'body_shape', 'color_season', 'cta'];
  const stepIndex = useMemo(() => stepOrder.indexOf(step), [step, stepOrder]);

  const markOnboardingSeen = () => {
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    } catch {
      // ignore storage errors
    }
  };

  const goToAuth = (mode: 'signup' | 'login') => {
    markOnboardingSeen();
    navigate(`/?auth=${mode}`);
  };

  const handleNext = () => {
    const nextIndex = Math.min(stepIndex + 1, stepOrder.length - 1);
    setStep(stepOrder[nextIndex]);
  };

  const handleSkipToCTA = () => setStep('cta');

  const handleDemoSwitch = (mode: 'before' | 'after') => {
    if (mode === demoMode) return;
    if (mode === 'after') {
      setIsGenerating(true);
      window.setTimeout(() => {
        setIsGenerating(false);
        setDemoMode('after');
      }, 900);
      return;
    }
    setDemoMode('before');
  };

  const toggleGoal = (goalId: string) => {
    setDraft((prev) => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter((goal) => goal !== goalId)
        : [...prev.goals, goalId],
    }));
  };

  const updateDraft = (key: keyof StylistDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const summaryItems = useMemo(() => {
    const labels: string[] = [];
    const goalLabels = STYLE_GOALS.filter((goal) => draft.goals.includes(goal.id)).map((goal) => goal.label);
    if (goalLabels.length > 0) labels.push(`Objetivos: ${goalLabels.join(', ')}`);

    if (draft.bodyShape) {
      const shape = BODY_SHAPES.find((item) => item.id === draft.bodyShape);
      if (shape) labels.push(`Cuerpo: ${shape.label}`);
    }

    if (draft.colorSeason) {
      const season = SEASONS.find((item) => item.id === draft.colorSeason);
      if (season) labels.push(`Paleta: ${season.label}`);
    }

    return labels;
  }, [draft]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#05060a] text-white flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-16 w-[380px] h-[380px] bg-fuchsia-500/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 right-[-10%] w-[420px] h-[420px] bg-sky-500/20 rounded-full blur-[140px]" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(60% 50% at 50% 40%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 60%)',
        }} />
      </div>

      <div className="relative w-full max-w-xl px-5 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <OjoDeLocaLogo className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/50">No Tengo Nada</p>
              <p className="text-lg font-bold">Estilista IA</p>
            </div>
          </div>
          <button
            onClick={() => goToAuth('login')}
            className="text-sm text-white/70 hover:text-white transition"
          >
            Ya tengo cuenta
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {stepOrder.map((item, index) => (
            <div
              key={item}
              className={`h-1.5 rounded-full transition-all ${index <= stepIndex ? 'bg-white/70 w-8' : 'bg-white/10 w-3'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: DEMO */}
          {step === 'demo' && (
            <motion.div
              key="demo"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs uppercase tracking-[0.2em] text-white/70">
                  <Sparkles className="w-3.5 h-3.5" />
                  Demo sin costo
                </div>
                <h1 className="text-3xl font-semibold leading-tight">
                  Probá el efecto del estilista IA en segundos
                </h1>
                <p className="text-white/70">
                  Mirá un antes y después realista. Cuando quieras, subís tu foto y la IA respeta tu pose y tu estilo.
                </p>
              </div>

              <div className="bg-white/6 border border-white/10 rounded-3xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => handleDemoSwitch('before')}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${demoMode === 'before'
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white/70 hover:text-white'}`}
                  >
                    Antes
                  </button>
                  <button
                    onClick={() => handleDemoSwitch('after')}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${demoMode === 'after'
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white/70 hover:text-white'}`}
                  >
                    Después
                  </button>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-black/30 h-[52vh] max-h-[520px] min-h-[340px] p-2">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={demoMode}
                      src={demoMode === 'before' ? DEMO_IMAGES.before : DEMO_IMAGES.after}
                      alt={demoMode === 'before' ? 'Demo antes' : 'Demo después'}
                      initial={{ opacity: 0.4, scale: 1.02 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      className="absolute inset-0 w-full h-full object-contain object-center"
                    />
                  </AnimatePresence>

                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 text-[11px] font-semibold uppercase tracking-[0.35em]">
                    {demoMode === 'before' ? 'Antes' : 'Después'}
                  </span>

                  {demoMode === 'after' && !isGenerating && (
                    <div className="absolute bottom-3 left-3 flex gap-2 text-[11px]">
                      <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20">Top aplicado</span>
                      <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20">Bottom aplicado</span>
                    </div>
                  )}

                  <AnimatePresence>
                    {isGenerating && (
                      <motion.div
                        key="generating"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm"
                      >
                        <div className="w-14 h-14 rounded-full border border-white/30 flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold">Aplicando prenda...</p>
                          <p className="text-xs text-white/60">Respetando pose y textura</p>
                        </div>
                        <div className="w-40 h-1 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            className="h-full bg-white"
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 0.9, ease: 'linear', repeat: Infinity }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: demoMode === 'after' && !isGenerating ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      backgroundImage: 'linear-gradient(120deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0) 60%)',
                    }}
                  />
                </div>

                <div className="mt-4 space-y-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50">Prendas elegidas</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2.5">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10">
                        <img src={DEMO_ITEMS.top} alt="Prenda superior" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Camisa</p>
                        <p className="text-xs text-white/60">Prenda superior</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2.5">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10">
                        <img src={DEMO_ITEMS.bottom} alt="Prenda inferior" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Pollera</p>
                        <p className="text-xs text-white/60">Prenda inferior</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-white/70">
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-center">Pose intacta</div>
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-center">Look realista</div>
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-center">Listo en 60s</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => goToAuth('signup')}
                  className="w-full py-4 bg-white text-black font-bold text-lg rounded-2xl shadow-[0_20px_60px_rgba(255,255,255,0.25)] hover:scale-[1.01] transition"
                >
                  Probar con mi foto
                </button>
                <button
                  onClick={handleNext}
                  className="w-full py-3 rounded-2xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition"
                >
                  Personalizar mi perfil (opcional)
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: STYLE GOALS */}
          {step === 'style_goals' && (
            <WizardStep
              key="style_goals"
              title="¿Qué querés lograr primero?"
              subtitle="Esto nos ayuda a personalizar las sugerencias cuando crees tu cuenta."
              onNext={handleNext}
              onSkip={handleSkipToCTA}
              canProceed={draft.goals.length > 0}
            >
              <div className="space-y-3">
                {STYLE_GOALS.map((goal) => {
                  const Icon = goal.icon;
                  const isSelected = draft.goals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      onClick={() => toggleGoal(goal.id)}
                      className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${isSelected
                        ? 'border-white bg-white/10'
                        : 'border-white/10 hover:border-white/30 bg-white/5'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${goal.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-medium flex-1 text-left">{goal.label}</span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center"
                        >
                          <Check className="w-4 h-4" />
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>
            </WizardStep>
          )}

          {/* STEP 3: BODY SHAPE */}
          {step === 'body_shape' && (
            <WizardStep
              key="body_shape"
              title="¿Cómo describirías tu cuerpo?"
              subtitle="Opcional. Podés saltarlo y completarlo después."
              onNext={handleNext}
              onSkip={handleSkipToCTA}
              canProceed={!!draft.bodyShape}
            >
              <div className="grid grid-cols-2 gap-4">
                {BODY_SHAPES.map((shape) => (
                  <button
                    key={shape.id}
                    onClick={() => updateDraft('bodyShape', shape.id)}
                    className={`relative overflow-hidden group transition-all duration-300 rounded-2xl border-2 flex flex-col items-center ${draft.bodyShape === shape.id
                      ? 'border-white shadow-xl shadow-white/10 scale-[1.02]'
                      : 'border-white/10 hover:border-white/30 bg-white/5'}`}
                  >
                    <div className="w-full aspect-[3/4] bg-white p-3">
                      <img
                        src={shape.image}
                        alt={shape.label}
                        className="w-full h-full object-contain mix-blend-multiply opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <div className={`w-full p-3 text-center transition-colors ${draft.bodyShape === shape.id
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-white/70'}`}
                    >
                      <span className="text-sm">{shape.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </WizardStep>
          )}

          {/* STEP 4: COLOR SEASON */}
          {step === 'color_season' && (
            <WizardStep
              key="color_season"
              title="¿Qué paleta te ilumina más?"
              subtitle="Opcional. Lo podés ajustar más adelante."
              onNext={() => setStep('cta')}
              onSkip={handleSkipToCTA}
              canProceed={!!draft.colorSeason}
            >
              <div className="grid grid-cols-1 gap-4">
                {SEASONS.map((season) => (
                  <button
                    key={season.id}
                    onClick={() => updateDraft('colorSeason', season.id)}
                    className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${draft.colorSeason === season.id
                      ? 'border-white bg-white/10'
                      : 'border-white/10 hover:border-white/30 bg-white/5'}`}
                  >
                    <span className="font-medium">{season.label}</span>
                    <div className="flex gap-2">
                      {season.colors.map((c) => (
                        <div key={c} className="w-6 h-6 rounded-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </WizardStep>
          )}

          {/* STEP 5: CTA */}
          {step === 'cta' && (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Palette className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Listo para personalizar tu estilo</h2>
                  <p className="text-white/70">Creá tu cuenta para guardar tu perfil y empezar a probar looks.</p>
                </div>
              </div>

              {summaryItems.length > 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 text-sm text-white/70">
                  {summaryItems.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white/70 flex items-center gap-3">
                  <UserRound className="w-5 h-5" />
                  <span>Podés completar tu perfil más adelante, sin apuro.</span>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => goToAuth('signup')}
                  className="w-full py-4 bg-white text-black font-bold text-lg rounded-2xl shadow-[0_20px_60px_rgba(255,255,255,0.25)] hover:scale-[1.01] transition"
                >
                  Crear cuenta y empezar
                </button>
                <button
                  onClick={() => goToAuth('login')}
                  className="w-full py-3 rounded-2xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition"
                >
                  Ya tengo cuenta
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Sub-components
interface WizardStepProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onNext: () => void;
  onSkip?: () => void;
  canProceed: boolean;
}

const WizardStep = ({ title, subtitle, children, onNext, onSkip, canProceed }: WizardStepProps) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="space-y-6"
  >
    <div>
      <h2 className="text-2xl font-semibold mb-2">{title}</h2>
      <p className="text-white/70">{subtitle}</p>
    </div>
    <div className="max-h-[50vh] overflow-y-auto pr-2">
      {children}
    </div>
    <div className="space-y-3">
      <button
        onClick={onNext}
        disabled={!canProceed}
        className={`w-full py-4 font-bold text-lg rounded-2xl transition-all flex items-center justify-center gap-2 ${canProceed
          ? 'bg-white text-black shadow-[0_18px_50px_rgba(255,255,255,0.25)] hover:scale-[1.01]'
          : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </button>
      {onSkip && (
        <button
          onClick={onSkip}
          className="w-full py-3 rounded-2xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition"
        >
          Saltar por ahora
        </button>
      )}
    </div>
  </motion.div>
);
