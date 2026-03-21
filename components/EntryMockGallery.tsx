import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Palette, Play, Shirt, Sparkles, WandSparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OjoDeLocaLogo from './OjoDeLocaLogo';
import * as analytics from '../src/services/analyticsService';
import {
  markPublicEntryAuthOpened,
  setPendingPublicEntryIntent,
  type PublicEntryIntent,
} from '../src/services/publicEntryFlow';

type EntryVariantId = 'intent' | 'demo' | 'hybrid';

type EntryOption = {
  id: string;
  label: string;
  detail: string;
  intent: PublicEntryIntent;
  icon: React.ReactNode;
};

const OPTIONS: EntryOption[] = [
  {
    id: 'look',
    label: 'Armar un look ahora',
    detail: 'Entrar por el problema mas inmediato.',
    intent: 'look',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: 'closet',
    label: 'Subir mi armario',
    detail: 'Entrar por organizacion y base de datos personal.',
    intent: 'closet',
    icon: <Shirt className="h-4 w-4" />,
  },
  {
    id: 'style',
    label: 'Definir mi estilo',
    detail: 'Entrar por contexto, paleta y criterio.',
    intent: 'style',
    icon: <Palette className="h-4 w-4" />,
  },
];

const FOCUS_RING_CLASS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const DARK_FOCUS_RING_CLASS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c10]';

const openIntentFromChoice = (choiceId: string | null): PublicEntryIntent => {
  return OPTIONS.find((option) => option.id === choiceId)?.intent ?? 'look';
};

function IntentFirstCard({
  selectedChoice,
  onSelectChoice,
  onAuth,
}: {
  selectedChoice: string | null;
  onSelectChoice: (choiceId: string) => void;
  onAuth: (mode: 'signup' | 'login') => void;
}) {
  return (
    <section className="rounded-[36px] border border-[#e7ddcf] bg-[#f5efe6] p-6 text-[#161514] shadow-[0_40px_120px_rgba(40,24,12,0.08)] sm:p-8">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[#7b6a57]">
        <span>Entrada 1</span>
        <span className="h-1 w-1 rounded-full bg-[#9a846b]" />
        <span>Intent-first</span>
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div>
          <h2 className="max-w-[12ch] text-[clamp(2.4rem,6vw,4.8rem)] font-semibold leading-[0.92] tracking-tight">
            Entrá por lo que querés resolver.
          </h2>
          <p className="mt-4 max-w-[44ch] text-base leading-7 text-[#54483a]">
            Nada de onboarding formal. Elegís una intención y la app acomoda la entrada alrededor de eso.
          </p>

          <div className="mt-8 grid gap-3">
            {OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectChoice(option.id)}
                className={`rounded-[24px] border px-5 py-4 text-left transition ${FOCUS_RING_CLASS} ${
                  selectedChoice === option.id
                    ? 'border-[#171614] bg-[#171614] text-white'
                    : 'border-[#d5cabd] bg-white/70 text-[#171614] hover:border-[#171614] hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {option.icon}
                      <span>{option.label}</span>
                    </div>
                    <p className={`mt-2 text-sm leading-6 ${selectedChoice === option.id ? 'text-white/72' : 'text-[#6a5a49]'}`}>
                      {option.detail}
                    </p>
                  </div>
                  {selectedChoice === option.id ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] bg-[#171614] p-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/46">Preview del flujo</p>
          <div className="mt-5 space-y-3">
            <div className="rounded-[22px] bg-white/8 p-4">
              <p className="text-sm text-white/56">Si entrás por</p>
              <p className="mt-1 text-xl font-semibold">{OPTIONS.find((option) => option.id === selectedChoice)?.label ?? 'una intención concreta'}</p>
            </div>
            <div className="rounded-[22px] bg-white/8 p-4">
              <p className="text-sm text-white/56">La app te lleva directo a</p>
              <p className="mt-1 text-sm leading-6 text-white/84">
                {selectedChoice === 'closet'
                  ? 'armario digital'
                  : selectedChoice === 'style'
                    ? 'setup de perfil y estilo'
                    : 'generacion de looks y studio'}
              </p>
            </div>
            <div className="rounded-[22px] bg-[#efe7d8] p-4 text-[#171614]">
              <p className="text-sm font-medium">Se siente más producto que onboarding.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button type="button" onClick={() => onAuth('signup')} className={`rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.01] ${DARK_FOCUS_RING_CLASS}`}>
              Crear cuenta y entrar
            </button>
            <button type="button" onClick={() => onAuth('login')} className={`rounded-full border border-white/18 px-5 py-3 text-sm font-semibold text-white/82 transition hover:border-white/38 hover:text-white ${DARK_FOCUS_RING_CLASS}`}>
              Ya tengo cuenta
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoFirstCard({
  selectedChoice,
  onSelectChoice,
  onAuth,
}: {
  selectedChoice: string | null;
  onSelectChoice: (choiceId: string) => void;
  onAuth: (mode: 'signup' | 'login') => void;
}) {
  return (
    <section className="overflow-hidden rounded-[36px] bg-[#0d1016] text-white shadow-[0_40px_120px_rgba(6,8,14,0.45)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="relative min-h-[32rem] overflow-hidden p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(186,224,223,0.34),transparent_28%),radial-gradient(circle_at_88%_10%,rgba(255,196,153,0.18),transparent_24%),linear-gradient(180deg,#0d1016_0%,#0b0c10_100%)]" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-white/42">
              <span>Entrada 2</span>
              <span className="h-1 w-1 rounded-full bg-white/34" />
              <span>Demo-first</span>
            </div>
            <h2 className="mt-5 max-w-[10ch] text-[clamp(2.3rem,5vw,4.8rem)] font-semibold leading-[0.92] tracking-tight">
              Mostrame valor antes de pedirme nada.
            </h2>
            <p className="mt-4 max-w-[44ch] text-base leading-7 text-white/68">
              Primero ves una promesa concreta de producto. Después elegís por dónde entrar.
            </p>

            <div className="mt-8 rounded-[28px] border border-white/12 bg-white/[0.04] p-4 backdrop-blur">
              <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-white/42">
                <span>Antes</span>
                <span>Después</span>
              </div>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-black/45">
                <img src="/images/demo/before.jpg" alt="Antes demo-first" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-y-0 right-0 w-[52%] overflow-hidden">
                  <img src="/images/demo/after.jpg" alt="Despues demo-first" className="absolute inset-0 h-full w-full object-cover" />
                </div>
                <div className="absolute inset-y-0 right-[52%] w-px bg-white/80" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-6 sm:p-8 lg:border-l lg:border-t-0">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-white/42">
              <Play className="h-3.5 w-3.5" />
              Demo que vende
            </div>
            <p className="mt-4 text-lg font-semibold">La app ya se explica sola con un resultado visible.</p>
            <p className="mt-2 text-sm leading-6 text-white/64">
              En vez de onboarding, esto se siente como una prueba de valor comprimida.
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectChoice(option.id)}
                className={`rounded-[22px] border px-4 py-4 text-left transition ${DARK_FOCUS_RING_CLASS} ${
                  selectedChoice === option.id
                    ? 'border-white/55 bg-white/[0.12]'
                    : 'border-white/12 bg-white/[0.03] hover:border-white/28 hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {option.icon}
                      <span>{option.label}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/62">{option.detail}</p>
                  </div>
                  {selectedChoice === option.id ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button type="button" onClick={() => onAuth('signup')} className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#f3f0ea] px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.01] ${DARK_FOCUS_RING_CLASS}`}>
              Probar gratis ahora
              <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onAuth('login')} className={`rounded-full border border-white/18 px-5 py-3 text-sm font-semibold text-white/82 transition hover:border-white/38 hover:text-white ${DARK_FOCUS_RING_CLASS}`}>
              Ya tengo cuenta
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function HybridCard({
  selectedChoice,
  onSelectChoice,
  onAuth,
}: {
  selectedChoice: string | null;
  onSelectChoice: (choiceId: string) => void;
  onAuth: (mode: 'signup' | 'login') => void;
}) {
  return (
    <section className="rounded-[36px] border border-[#dce1e8] bg-white p-6 text-[#14161b] shadow-[0_40px_120px_rgba(12,20,36,0.08)] sm:p-8">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[#6d7583]">
        <span>Entrada 3</span>
        <span className="h-1 w-1 rounded-full bg-[#7f8796]" />
        <span>Landing-app híbrida</span>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div>
          <h2 className="max-w-[12ch] text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[0.94] tracking-tight">
            Una landing que ya te deja entrar por caminos reales.
          </h2>
          <p className="mt-4 max-w-[46ch] text-base leading-7 text-[#505765]">
            Mitad marketing, mitad producto. Hero corto, opciones claras, preview y CTA sin túnel de onboarding.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectChoice(option.id)}
                className={`rounded-[24px] border p-4 text-left transition ${FOCUS_RING_CLASS} ${
                  selectedChoice === option.id
                    ? 'border-[#171a21] bg-[#171a21] text-white'
                    : 'border-[#dde2e8] bg-[#f8fafc] hover:border-[#171a21] hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {option.icon}
                  <span>{option.label}</span>
                </div>
                <p className={`mt-3 text-sm leading-6 ${selectedChoice === option.id ? 'text-white/72' : 'text-[#697180]'}`}>
                  {option.detail}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-8 rounded-[28px] border border-[#e3e8ee] bg-[#f8fafc] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#758093]">Vista de producto</p>
                <p className="mt-2 text-lg font-semibold">Preview de entrada</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#5b6573]">
                <WandSparkles className="h-4 w-4" />
                live preview
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#8690a0]">Camino</p>
                <p className="mt-2 text-sm font-semibold">{OPTIONS.find((option) => option.id === selectedChoice)?.label ?? 'Entrada elegida'}</p>
              </div>
              <div className="rounded-[22px] bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#8690a0]">Sensación</p>
                <p className="mt-2 text-sm font-semibold">No parece onboarding</p>
              </div>
              <div className="rounded-[22px] bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#8690a0]">Promesa</p>
                <p className="mt-2 text-sm font-semibold">Entrar y usar</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-[30px] border border-[#e3e8ee] bg-[#171a21] p-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">CTA stack</p>
          <p className="mt-4 text-2xl font-semibold">Pocas palabras, caminos claros.</p>
          <p className="mt-3 text-sm leading-6 text-white/66">
            Este formato se parece más a una home que a un onboarding. Por eso suele sentirse más natural en webapp.
          </p>
          <div className="mt-6 space-y-3">
            <button type="button" onClick={() => onAuth('signup')} className={`w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.01] ${DARK_FOCUS_RING_CLASS}`}>
              Crear cuenta y entrar
            </button>
            <button type="button" onClick={() => onAuth('login')} className={`w-full rounded-full border border-white/18 px-5 py-3 text-sm font-semibold text-white/82 transition hover:border-white/38 hover:text-white ${DARK_FOCUS_RING_CLASS}`}>
              Ya tengo cuenta
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function EntryMockGallery() {
  const navigate = useNavigate();
  const [intentChoice, setIntentChoice] = useState<string | null>('look');
  const [demoChoice, setDemoChoice] = useState<string | null>('closet');
  const [hybridChoice, setHybridChoice] = useState<string | null>('style');

  useEffect(() => {
    analytics.trackEvent('entry_mock_viewed', {
      source: 'entry_mock',
    });
  }, []);

  const selectedIntentMap = useMemo<Record<EntryVariantId, PublicEntryIntent>>(
    () => ({
      intent: openIntentFromChoice(intentChoice),
      demo: openIntentFromChoice(demoChoice),
      hybrid: openIntentFromChoice(hybridChoice),
    }),
    [demoChoice, hybridChoice, intentChoice],
  );

  const openAuth = (variant: EntryVariantId, mode: 'signup' | 'login') => {
    const intent = selectedIntentMap[variant];
    setPendingPublicEntryIntent(intent);
    markPublicEntryAuthOpened(intent);
    analytics.trackEvent('entry_mock_cta_click', {
      variant,
      mode,
      intent,
    });
    navigate(`/?auth=${mode}`);
  };

  return (
    <main aria-label="Entry mock gallery" className="min-h-dvh bg-[#eef2f1] text-[#111]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-[-10%] top-0 h-[28rem] w-[28rem] rounded-full bg-[#e8c6bc] blur-[120px]" />
        <div className="absolute right-[-8%] top-[12rem] h-[32rem] w-[32rem] rounded-full bg-[#c4ddd8] blur-[140px]" />
        <div className="absolute bottom-[-6rem] left-[22%] h-[24rem] w-[24rem] rounded-full bg-[#e7dcc3] blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:px-8">
        <header className="rounded-[34px] border border-white/55 bg-white/60 px-5 py-5 backdrop-blur sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#171a21] text-white">
                <OjoDeLocaLogo className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#727c89]">Exploracion interna</p>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Entry flow mock gallery</h1>
              </div>
            </div>
            <p className="max-w-[48ch] text-sm leading-6 text-[#5c6573]">
              Esta vez no es “onboarding”. Son tres maneras de entrar a la app sin sensación de túnel:
              intención, demo y landing híbrida.
            </p>
          </div>
        </header>

        <section className="py-8">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#727c89]">Nueva dirección</p>
              <h2 className="mt-3 max-w-[11ch] text-[clamp(2.5rem,7vw,5.5rem)] font-semibold leading-[0.92] tracking-tight text-[#12161d]">
                Menos onboarding, más entrada a producto.
              </h2>
            </div>
            <div className="rounded-[30px] border border-white/60 bg-white/60 p-5 text-sm leading-6 text-[#5d6675] backdrop-blur">
              En los tres casos el foco es el mismo: mostrar valor rápido, dejar elegir camino y evitar la
              sensación de “primero completá esto, después te dejo usar”.
            </div>
          </div>
        </section>

        <div className="space-y-8">
          <IntentFirstCard
            selectedChoice={intentChoice}
            onSelectChoice={setIntentChoice}
            onAuth={(mode) => openAuth('intent', mode)}
          />
          <DemoFirstCard
            selectedChoice={demoChoice}
            onSelectChoice={setDemoChoice}
            onAuth={(mode) => openAuth('demo', mode)}
          />
          <HybridCard
            selectedChoice={hybridChoice}
            onSelectChoice={setHybridChoice}
            onAuth={(mode) => openAuth('hybrid', mode)}
          />
        </div>
      </div>
    </main>
  );
}
