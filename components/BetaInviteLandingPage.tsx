import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { joinWaitlist } from '../src/services/waitlistService';
import * as analytics from '../src/services/analyticsService';
import { useMatchMedia } from '../src/hooks/useMatchMedia';
import { redeemBetaEmailViaEdge } from '../src/services/edgeFunctionClient';

const Eye3D = lazy(() => import('./Eye3D'));
const LEGACY_WAITLIST_CODES = new Set(['BETA-H3GZLXUL']);

class SilentEyeBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: unknown) { console.warn('Beta Eye3D disabled after render error:', error); }
    render() {
        if (this.state.hasError) return null;
        return this.props.children;
    }
}

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

const palette = {
    '--home-bg': '#e7ecef',
    '--home-ink': '#14343b',
    '--home-muted': 'rgba(20, 52, 59, 0.82)',
    '--home-mint': '#cae8ea',
} as React.CSSProperties;

export default function BetaInviteLandingPage() {
    const location = useLocation();
    const prefersReducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)');
    const isSmallScreen = useMatchMedia('(max-width: 640px)');
    const [canRenderEye3D, setCanRenderEye3D] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitState, setSubmitState] = useState<'idle' | 'success' | 'error'>('idle');
    const [submitMessage, setSubmitMessage] = useState('');

    const { betaCode, utmCampaign } = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const beta = (params.get('beta') || '').trim().toUpperCase();
        const campaign = (params.get('utm_campaign') || '').trim().toLowerCase();

        return {
            betaCode: beta,
            utmCampaign: campaign,
        };
    }, [location.search]);

    const hasValidCode = betaCode.length >= 4;
    const forceWaitlistMode = LEGACY_WAITLIST_CODES.has(betaCode) || utmCampaign === 'beta_invite';
    const shouldUseManualLinkMode = hasValidCode && !forceWaitlistMode;
    const dpr: number | [number, number] = isSmallScreen ? [1, 1.2] : [1, 1.5];
    const blinkInterval = prefersReducedMotion ? 7200 : 4200;

    useEffect(() => {
        setCanRenderEye3D(supportsWebGL());
    }, []);

    const handlePointerMove = (event: React.PointerEvent) => {
        if (prefersReducedMotion) return;
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -(event.clientY / window.innerHeight) * 2 + 1;
        setMousePos({ x, y });
    };

    const handleWaitlistSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submitting) return;

        setSubmitting(true);
        setSubmitState('idle');
        setSubmitMessage('');

        try {
            const params = new URLSearchParams(location.search);
            const result = shouldUseManualLinkMode
                ? await redeemBetaEmailViaEdge(betaCode, email)
                : await joinWaitlist(email, {
                    source: params.get('utm_source') || 'instagram',
                    utm_source: params.get('utm_source'),
                    utm_medium: params.get('utm_medium'),
                    utm_campaign: params.get('utm_campaign'),
                    entry_path: location.pathname,
                    legacyBetaCode: hasValidCode ? betaCode : null,
                });

            if (result.success) {
                setSubmitState('success');
                setSubmitMessage(result.message);
                if (!shouldUseManualLinkMode) analytics.trackWaitlistSignup();
                setEmail('');
            } else {
                setSubmitState('error');
                setSubmitMessage(result.message);
            }
        } catch (error) {
            setSubmitState('error');
            setSubmitMessage(error instanceof Error ? error.message : 'No se pudo registrar la waitlist');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main
            className="relative box-border min-h-[100dvh] w-full overflow-hidden text-[color:var(--home-ink)] selection:bg-[#cae8ea] selection:text-[#14343b]"
            style={palette}
            onPointerMove={handlePointerMove}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.62),transparent_36%),linear-gradient(180deg,#dfe7eb_0%,#eef2f3_100%)] z-0" />
            <div className="noise-overlay opacity-[0.03] z-0" />
            <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.65)_0%,_transparent_70%)] blur-3xl z-0" />
            <div className="absolute -right-16 top-1/4 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(202,232,234,0.45)_0%,_transparent_72%)] blur-3xl z-0" />

            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none overflow-hidden">
                <div className="relative w-[150vw] h-[150vh] sm:w-[90vw] sm:h-[110vh] lg:w-[70vw] lg:h-[140vh] max-w-[1400px] opacity-90 mix-blend-multiply select-none translate-y-[5%] lg:translate-x-[12%] xl:translate-x-[8%]">
                    {canRenderEye3D ? (
                        <SilentEyeBoundary>
                            <Suspense fallback={null}>
                                <Eye3D
                                    variant="landing"
                                    blinkInterval={blinkInterval}
                                    reducedMotion={prefersReducedMotion}
                                    dpr={dpr}
                                    pointer={mousePos}
                                    className="absolute inset-0"
                                />
                            </Suspense>
                        </SilentEyeBoundary>
                    ) : null}
                </div>
            </div>

            <div className="relative z-20 flex min-h-[100dvh] box-border flex-col px-6 py-6 sm:px-10 lg:px-16 lg:py-10">
                <header className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/50 shadow-[0_10px_18px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                            <span className="text-[#14343b] font-serif text-2xl tracking-tighter italic font-bold">O.</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[color:var(--home-muted)]">Ojo de Loca Beta</span>
                    </div>

                    {shouldUseManualLinkMode && (
                        <div className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                            Link manual
                        </div>
                    )}
                </header>

                <div className="mt-auto flex w-full justify-center pb-2 sm:pb-6">
                    <div className="w-full max-w-xl rounded-[2.4rem] border border-white/80 bg-white/78 p-4 shadow-[0_30px_60px_rgba(20,52,59,0.1)] backdrop-blur-[28px] sm:p-5">
                        {shouldUseManualLinkMode ? (
                            <form onSubmit={handleWaitlistSubmit} className="space-y-3 text-center">
                                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[color:var(--home-muted)]">Link beta manual</p>
                                <p className="text-2xl font-black tracking-[0.16em] text-[color:var(--home-ink)]">{betaCode}</p>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="Mail"
                                    required
                                    className="w-full rounded-full border border-white/80 bg-white/80 px-4 py-3 text-sm text-[color:var(--home-ink)] outline-none transition focus:border-[#14343b]/30"
                                />
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex w-full items-center justify-center rounded-full bg-[color:var(--home-ink)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[0_15px_30px_rgba(20,52,59,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting ? 'Preparando cuenta...' : 'Dale, activame con este link'}
                                </button>
                                {submitMessage && (
                                    <p className={`text-center text-sm ${submitState === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>
                                        {submitMessage}
                                    </p>
                                )}
                            </form>
                        ) : (
                            <form onSubmit={handleWaitlistSubmit} className="space-y-3">
                                <div className="text-center">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[color:var(--home-muted)]">Beta privada</p>
                                    <h1 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[color:var(--home-ink)] sm:text-2xl">
                                        Dejame tu mail.
                                    </h1>
                                    {forceWaitlistMode && (
                                        <p className="mt-2 text-sm text-[color:var(--home-muted)]">
                                            Este acceso ahora entra por aprobación manual.
                                        </p>
                                    )}
                                </div>

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="Mail"
                                    required
                                    className="w-full rounded-full border border-white/80 bg-white/80 px-4 py-3 text-sm text-[color:var(--home-ink)] outline-none transition focus:border-[#14343b]/30"
                                />

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex w-full items-center justify-center rounded-full bg-[color:var(--home-ink)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[0_15px_30px_rgba(20,52,59,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting ? 'Guardando...' : 'Dale dejame probarla, no seas gato 🫦'}
                                </button>

                                {submitMessage && (
                                    <p className={`text-center text-sm ${submitState === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>
                                        {submitMessage}
                                    </p>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
