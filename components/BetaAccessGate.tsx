import { ArrowRight, Instagram, LogOut, Mail, Ticket } from 'lucide-react';

const INSTAGRAM_URL = 'https://instagram.com/ojodeloca.app';
const SUPPORT_EMAIL = 'soporte@ojodeloca.app';

interface BetaAccessGateProps {
  onLogout: () => void | Promise<void>;
}

export default function BetaAccessGate({ onLogout }: BetaAccessGateProps) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#05060a] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(58% 45% at 50% 42%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.00) 60%)',
            'radial-gradient(55% 45% at 18% 24%, rgba(236,72,153,0.18) 0%, rgba(236,72,153,0.00) 70%)',
            'radial-gradient(55% 45% at 80% 60%, rgba(59,130,246,0.16) 0%, rgba(59,130,246,0.00) 70%)',
            'linear-gradient(180deg, rgba(3,7,18,0.10) 0%, rgba(3,7,18,0.92) 100%)',
          ].join(','),
        }}
      />

      <div className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10">
        <section className="w-full max-w-xl rounded-3xl border border-white/12 bg-white/8 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/72">
            <Ticket className="h-3.5 w-3.5" />
            Beta cerrada
          </span>

          <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
            Entraste, pero el acceso a la app sigue siendo por invitación.
          </h1>

          <p className="mt-4 text-sm leading-7 text-white/72 sm:text-base">
            OJO DE LOCA está abriendo por tandas desde Instagram. Si todavía no te pasaron un link con código beta,
            podés seguir la cuenta o escribir a soporte para pedir acceso.
          </p>

          <div className="mt-6 rounded-2xl border border-white/12 bg-black/25 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/48">Qué hacer ahora</p>
            <ul className="mt-3 space-y-2 text-sm text-white/72">
              <li>1. Abrí el link beta que te pasaron y volvé a iniciar sesión.</li>
              <li>2. Si ya pagaste o ya te aprobaron acceso, escribí a soporte con tu email.</li>
              <li>3. Si querés cambiar de cuenta, cerrá sesión y entrá con la correcta.</li>
            </ul>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-white/90"
            >
              <Instagram className="h-4 w-4" />
              Seguir Instagram
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Mail className="h-4 w-4" />
              Pedir acceso
            </a>
          </div>

          <button
            type="button"
            onClick={() => void onLogout()}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión y probar otra cuenta
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </div>
    </main>
  );
}
