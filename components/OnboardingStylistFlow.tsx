import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shirt, WandSparkles } from 'lucide-react';
import OjoDeLocaLogo from './OjoDeLocaLogo';

const ONBOARDING_SEEN_KEY = 'ojodeloca-has-onboarded';

const DEMO_IMAGES = {
  before: '/images/demo/before.jpg',
  after: '/images/demo/after.jpg',
};

const FOCUS_RING_CLASS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]';
const SURFACE_CARD_CLASS = 'rounded-2xl border border-white/[0.16] bg-white/[0.05] backdrop-blur-sm';
const PRIMARY_BUTTON_CLASS = `w-full py-3.5 bg-white text-black font-bold text-base sm:text-lg rounded-2xl shadow-[0_20px_60px_rgba(255,255,255,0.22)] hover:scale-[1.01] transition ${FOCUS_RING_CLASS}`;
const SECONDARY_BUTTON_CLASS = `w-full py-3 rounded-2xl border border-white/20 text-white/85 hover:text-white hover:border-white/40 transition ${FOCUS_RING_CLASS}`;

export const OnboardingStylistFlow = () => {
  const navigate = useNavigate();
  const [compareValue, setCompareValue] = useState(0);

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

  return (
    <div data-onboarding-root className="fixed inset-0 z-[9999] bg-[#05060a] text-white overflow-y-auto">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-20 w-[380px] h-[380px] bg-rose-500/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-20 right-[-8%] w-[420px] h-[420px] bg-sky-500/20 rounded-full blur-[140px]" />
      </div>

      <div className="relative mx-auto min-h-full w-full max-w-3xl px-4 sm:px-8 py-4 sm:py-6 flex flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <OjoDeLocaLogo className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/55">No Tengo Nada</p>
              <p className="text-lg font-bold">Armario Digital</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => goToAuth('login')}
            className={`text-sm text-white/75 hover:text-white transition ${FOCUS_RING_CLASS}`}
          >
            Ya tengo cuenta
          </button>
        </header>

        <section className="mt-6 flex-1 flex flex-col">
          <h1 className="text-[clamp(1.9rem,7vw,3.1rem)] font-semibold leading-[0.98] max-w-[12ch]">
            Reconectá con la ropa que ya tenés
          </h1>

          <p className="mt-2 text-sm sm:text-base text-white/78 max-w-[44ch]">
            Subí tus prendas, organizalas y armá tu primer look sin perder tiempo.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm ${SURFACE_CARD_CLASS}`}>
              <Shirt className="w-4 h-4" />
              Subí tu ropa
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm ${SURFACE_CARD_CLASS}`}>
              <WandSparkles className="w-4 h-4" />
              Primer look
            </span>
          </div>

          <div className="mt-5">
            <article className={`p-2.5 ${SURFACE_CARD_CLASS}`}>
              <div className="relative rounded-xl overflow-hidden bg-black/35 h-[42vh] min-h-[260px] max-h-[520px]">
                <img
                  src={DEMO_IMAGES.before}
                  alt="Armario"
                  className="absolute inset-0 w-full h-full object-contain object-center"
                />

                <div
                  className="absolute inset-y-0 left-0 overflow-hidden transition-[width] duration-200 ease-out"
                  style={{ width: `${compareValue}%` }}
                >
                  <img
                    src={DEMO_IMAGES.after}
                    alt="Look guardado"
                    className="absolute inset-0 w-full h-full object-contain object-center"
                  />
                </div>

                <div
                  className="pointer-events-none absolute inset-y-0 transition-[left] duration-200 ease-out"
                  style={{ left: `calc(${compareValue}% - 1px)` }}
                >
                  <div className="h-full w-[2px] bg-white/90 shadow-[0_0_24px_rgba(255,255,255,0.45)]" />
                  <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 rounded-full border border-white/80 bg-black/70 backdrop-blur flex items-center justify-center text-[11px] font-bold">
                    ↔
                  </div>
                </div>

                <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/75 text-[10px] font-semibold uppercase tracking-[0.2em]">
                  Armario
                </span>
                <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/75 text-[10px] font-semibold uppercase tracking-[0.2em]">
                  Look
                </span>
              </div>

              <div className="mt-3 px-1">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={compareValue}
                  onChange={(event) => setCompareValue(Number(event.target.value))}
                  aria-label="Deslizar para comparar antes y después"
                  className="h-1.5 w-full cursor-ew-resize appearance-none rounded-full bg-white/25 accent-white [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,255,255,0.2)] [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white"
                />
              </div>
            </article>
          </div>

          <div className="mt-5 grid gap-2.5 pb-[max(env(safe-area-inset-bottom),8px)]">
            <button
              type="button"
              onClick={() => goToAuth('login')}
              className={PRIMARY_BUTTON_CLASS}
            >
              Ir a iniciar sesión
            </button>

            <button
              type="button"
              onClick={() => goToAuth('signup')}
              className={SECONDARY_BUTTON_CLASS}
            >
              Crear cuenta
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
