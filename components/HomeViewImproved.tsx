import React, { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type {
  ActiveWardrobeRecommendation,
  ClothingItem,
  OutfitWearFeedback,
  ScheduledOutfitWithDetails,
  WeatherData,
} from '../types';
import type { UseSubscriptionReturn } from '../hooks/useSubscription';
import { getCurrentWeather, getUserCity } from '../src/services/weatherService';
import { getTodaySchedule } from '../src/services/scheduleService';
import { getFeedbackForDate } from '../src/services/outfitWearFeedbackService';
import { useInteractionMetrics } from '../src/hooks/useInteractionMetrics';
import WearCheckinSheet from './WearCheckinSheet';

interface HomeViewImprovedProps {
  user: User | null;
  closet: ClothingItem[];
  savedOutfitCount: number;
  activeRecommendation?: ActiveWardrobeRecommendation | null;
  onAddItem: () => void;
  onStartBulkUpload: () => void;
  onStartLooksFirst: () => void;
  onNavigateToCloset: () => void;
  onNavigateToLooks: () => void;
  onOpenStylistChat: () => void;
  onOpenStylistWithPrompt?: (prompt: string) => void;
  onNavigateToPlanner: () => void;
  onNavigateToCommunity: () => void;
  onNavigateToActivity: () => void;
  onStartWeatherOutfit: () => void;
  onStartQuickLook: () => void;
  onStartDressMeToday: () => void;
  onStartPlanB: () => void;
  onStartBuildAroundItem: () => void;
  onStartGapAnalysis: () => void;
  onStartPremiumMirror: () => void;
  onStartPremiumStudio: () => void;
  subscription?: UseSubscriptionReturn;
  onShowPricing?: () => void;
}

const palette = {
  '--home-bg': '#e7ecef',
  '--home-card': 'rgba(255,255,255,0.5)',
  '--home-border': 'rgba(255,255,255,0.72)',
  '--home-ink': '#14343b',
  '--home-muted': 'rgba(20, 52, 59, 0.72)',
  '--home-mint': '#cae8ea',
  '--home-ice': '#dfe7ec',
  '--home-blush': '#ebe5e7',
} as React.CSSProperties;

type SurfaceTone = 'mint' | 'ice' | 'blush' | 'dark';

export default function HomeViewImproved({
  user,
  closet,
  savedOutfitCount,
  activeRecommendation,
  onAddItem,
  onStartBulkUpload,
  onStartLooksFirst,
  onNavigateToCloset,
  onNavigateToLooks,
  onOpenStylistChat,
  onOpenStylistWithPrompt,
  onNavigateToPlanner,
  onNavigateToCommunity,
  onNavigateToActivity,
  onStartWeatherOutfit,
  onStartQuickLook,
  onStartDressMeToday,
  onStartPlanB,
  onStartBuildAroundItem,
  onStartGapAnalysis,
  onStartPremiumMirror,
  onStartPremiumStudio,
  subscription,
  onShowPricing,
}: HomeViewImprovedProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<ScheduledOutfitWithDetails | null>(null);
  const [todayFeedback, setTodayFeedback] = useState<OutfitWearFeedback | null>(null);
  const [isTodayCheckinOpen, setIsTodayCheckinOpen] = useState(false);
  useInteractionMetrics('today');

  useEffect(() => {
    let cancelled = false;

    const loadWeather = async () => {
      try {
        const data = await getCurrentWeather(getUserCity());
        if (!cancelled) setWeather(data);
      } catch {
        if (!cancelled) setWeather(null);
      }
    };

    void loadWeather();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTodayFeedback = async () => {
      try {
        const schedule = await getTodaySchedule();
        if (cancelled) return;

        setTodaySchedule(schedule);

        if (!schedule) {
          setTodayFeedback(null);
          return;
        }

        const feedback = await getFeedbackForDate(schedule.date, schedule.outfit_id);
        if (!cancelled) setTodayFeedback(feedback);
      } catch {
        if (!cancelled) {
          setTodaySchedule(null);
          setTodayFeedback(null);
        }
      }
    };

    void loadTodayFeedback();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasCloset = closet.length > 0;
  const hasPremiumVisualAccess = subscription?.tier === 'pro' || subscription?.tier === 'premium';
  const kumbiUsageLabel = subscription
    ? subscription.aiGenerationsLimit === -1
      ? 'Kumbi ilimitado'
      : `${Math.max(0, subscription.aiGenerationsLimit - subscription.aiGenerationsUsed)} mensajes Kumbi`
    : undefined;
  const premiumPrimaryAction = hasPremiumVisualAccess ? onStartPremiumMirror : onShowPricing;
  const premiumSecondaryAction = hasPremiumVisualAccess ? onStartPremiumStudio : onShowPricing;
  const entryAction = hasCloset ? onNavigateToCloset : onStartBulkUpload;
  const entryLabel = hasCloset ? 'Entrar' : 'Cargar';
  const entryDescription = hasCloset
    ? 'Tu catálogo personal. Entendé tu estilo a fondo y encontrá al instante lo que buscás.'
    : 'Subí tus primeras prendas y dale vida a la magia de tu armario digital.';
  const looksPrimaryAction = savedOutfitCount > 0 ? onNavigateToLooks : onStartLooksFirst;
  const looksPrimaryCta = savedOutfitCount > 0 ? 'Abrir' : 'Subí 3 looks';
  const looksPrimaryDescription = savedOutfitCount > 0
    ? 'Tus combinaciones infalibles. Reutilizá lo que ya funciona y pedile a Kumbi variantes o cruces nuevos.'
    : 'Arrancá por 3 looks tuyos y dejá que Kumbi te devuelva combinaciones nuevas sin cargar todo tu placard.';
  const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'vos';

  const topStats = useMemo(
    () => [
      {
        label: weather ? `${weather.city}: ${weather.temp}°` : 'Clima',
        icon: 'partly_cloudy_day',
        action: onStartWeatherOutfit,
      },
      {
        label: `${closet.length} prendas`,
        icon: 'checkroom',
        action: onNavigateToCloset,
      },
      {
        label: `${savedOutfitCount} looks`,
        icon: 'style',
        action: onNavigateToLooks,
      },
    ],
    [closet.length, onNavigateToCloset, onNavigateToLooks, onStartWeatherOutfit, savedOutfitCount, weather],
  );

  const actionCards: Array<{
    title: string;
    description: string;
    cta: string;
    action?: (() => void) | undefined;
    tone: SurfaceTone;
    badge?: string;
    icon: string;
    large?: boolean;
  }> = [
    {
      title: 'Looks',
      description: looksPrimaryDescription,
      cta: looksPrimaryCta,
      action: looksPrimaryAction,
      tone: 'ice',
      badge: savedOutfitCount > 0 ? `${savedOutfitCount} guardados` : 'Nuevo',
      icon: 'style',
      large: true,
    },
    {
      title: 'Kumbi',
      description: 'Tomá esos looks reales y pedile a Kumbi variantes, combinaciones cruzadas o adaptación a otra ocasión.',
      cta: 'Abrir chat',
      action: onOpenStylistChat,
      tone: 'blush',
      badge: 'Incluido',
      icon: 'forum',
    },
    {
      title: 'Armario',
      description: entryDescription,
      cta: entryLabel,
      action: entryAction,
      tone: 'mint',
      badge: `${closet.length} prendas`,
      icon: 'checkroom',
    },
    {
      title: 'Comunidad',
      description: 'Inspirate con outfits reales, compartí tu estilo y descubrí nuevas formas de usar tu ropa.',
      cta: 'Entrar',
      action: onNavigateToCommunity,
      tone: 'blush',
      badge: 'Looks',
      icon: 'groups',
    },
  ];
  const looksCard = actionCards.find((card) => card.title === 'Looks');
  const kumbiCard = actionCards.find((card) => card.title === 'Kumbi');
  const closetCard = actionCards.find((card) => card.title === 'Armario');
  const communityCard = actionCards.find((card) => card.title === 'Comunidad');

  const quickActions = [
    { title: 'Subí 3 looks', action: onStartLooksFirst },
    { title: '1 look rápido', action: onStartQuickLook },
    { title: 'Vestime para hoy', action: onStartDressMeToday },
    { title: 'Plan B', action: onStartPlanB },
    { title: 'Con esto sí o sí', action: onStartBuildAroundItem },
  ];
  const desktopQuickActions = quickActions.slice(0, 4);
  const todayFeedbackState = todayFeedback?.status === 'worn'
    ? 'registrado-usado'
    : todayFeedback?.status === 'not_worn'
      ? 'registrado-no-usado'
      : 'pendiente';
  const todayFeedbackAccent = todayFeedback?.status === 'worn'
    ? 'text-emerald-600'
    : todayFeedback?.status === 'not_worn'
      ? 'text-rose-600'
      : 'text-amber-600';
  const todayFeedbackBadge = todayFeedback?.status === 'worn'
    ? 'Sí salió'
    : todayFeedback?.status === 'not_worn'
      ? 'No salió'
      : 'Pendiente';
  const todayFeedbackTitle = todayFeedback?.status === 'worn'
    ? 'El loop de hoy ya quedó aprendido.'
    : todayFeedback?.status === 'not_worn'
      ? 'Hoy también sirve si aprendemos por qué no funcionó.'
      : 'Cerrá el loop del look de hoy.';
  const todayFeedbackDescription = todayFeedback?.status === 'worn'
    ? 'Marcaste el look como usado. Ese dato ahora pesa para próximas recomendaciones.'
    : todayFeedback?.status === 'not_worn'
      ? 'Ya registraste que no salió. Podés editarlo si cambió algo.'
      : 'Un check-in rápido le da contexto real al planner y al stylist.';

  const cardToneClasses: Record<SurfaceTone, string> = {
    mint: 'bg-[linear-gradient(180deg,rgba(190,230,234,0.92),rgba(220,240,242,0.85))] text-[color:var(--home-ink)]',
    ice: 'bg-[linear-gradient(180deg,rgba(210,225,236,0.92),rgba(235,242,246,0.85))] text-[color:var(--home-ink)]',
    blush: 'bg-[linear-gradient(180deg,rgba(240,225,230,0.92),rgba(250,240,245,0.85))] text-[color:var(--home-ink)]',
    dark: 'bg-[#08111a] text-white',
  };

  return (
    <div className="relative min-h-full overflow-hidden text-[color:var(--home-ink)]" style={palette}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.62),transparent_36%),linear-gradient(180deg,#dfe7eb_0%,#eef2f3_100%)]" />
      <div className="noise-overlay opacity-[0.03]" />
      <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.65)_0%,_transparent_70%)] blur-3xl" />
      <div className="absolute -right-16 top-1/4 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(202,232,234,0.45)_0%,_transparent_72%)] blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-3 pb-[7.5rem] pt-3 md:gap-4 md:px-6 md:pb-6 md:pt-4">
        <div className="liquid-glass rounded-[2rem] px-4 py-3 md:px-5 md:py-4">
          <div className="flex items-center justify-between gap-3 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] md:items-center md:gap-3">
            <button
              type="button"
              onClick={onNavigateToActivity}
              aria-label="Abrir actividad"
              title="Abrir actividad"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/56 shadow-[0_10px_18px_rgba(0,0,0,0.05)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/72 md:h-14 md:w-14"
            >
              <span className="material-symbols-outlined text-[22px] text-[#2aa1a7]">apps</span>
            </button>
            <h1 className="flex-1 font-serif text-left text-[clamp(1.9rem,7vw,3.4rem)] font-semibold leading-none tracking-[-0.05em] text-[color:var(--home-ink)] md:text-[clamp(2.5rem,4.2vw,4.3rem)]">
              ¿Qué te ponés hoy?
            </h1>
            {topStats.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="hidden md:inline-flex items-center gap-2 rounded-full bg-white/48 px-3 py-2 text-xs font-medium text-[color:var(--home-muted)] shadow-[0_8px_16px_rgba(0,0,0,0.04)] backdrop-blur-xl"
              >
                <span className="material-symbols-outlined text-[18px] text-[#c78a1f]">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={onShowPricing}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/55 bg-white/42 px-3 py-2 text-xs font-medium text-[color:var(--home-muted)] shadow-[0_8px_16px_rgba(0,0,0,0.04)] backdrop-blur-xl"
            >
              <span className="material-symbols-outlined text-[18px]">event_note</span>
              Ver plan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:hidden">
          {topStats.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className="inline-flex min-w-0 items-center gap-1.5 rounded-[1.2rem] bg-white/48 px-2.5 py-2.5 text-[11px] font-medium text-[color:var(--home-muted)] shadow-[0_8px_16px_rgba(0,0,0,0.04)] backdrop-blur-xl"
            >
              <span className="material-symbols-outlined shrink-0 text-[16px] text-[#c78a1f]">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>

        {todaySchedule && (
          <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(250,246,240,0.72))] p-4 shadow-[0_18px_40px_rgba(18,24,27,0.08)] backdrop-blur-[24px] md:p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.7),transparent_42%)]" />
            <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/70 shadow-[0_10px_18px_rgba(0,0,0,0.05)]">
                    <span className="material-symbols-outlined text-[20px] text-[#c78a1f]">fact_check</span>
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[color:var(--home-muted)]">Look de hoy</p>
                    <p className={`text-sm font-semibold ${todayFeedbackAccent}`}>{todayFeedbackBadge}</p>
                  </div>
                </div>
                <h2 className="mt-3 text-[1.35rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--home-ink)]">
                  {todayFeedbackTitle}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--home-muted)]">
                  {todaySchedule.outfit.name || todaySchedule.outfit.explanation || 'Look planificado para hoy'}
                </p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--home-muted)]">
                  {todayFeedbackDescription}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="rounded-[1.4rem] border border-white/75 bg-white/62 px-4 py-3 text-sm shadow-[0_12px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--home-muted)]">Estado</p>
                  <p className="mt-1 font-semibold text-[color:var(--home-ink)]">{todayFeedbackState}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTodayCheckinOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5"
                >
                  <span className="material-symbols-outlined text-[18px]">{todayFeedback ? 'edit' : 'bolt'}</span>
                  {todayFeedback ? 'Editar check-in' : 'Registrar ahora'}
                </button>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3 md:hidden">
          {actionCards.map((card) => (
            <button
              key={card.title}
              type="button"
              onClick={card.action}
              className={`relative overflow-hidden rounded-[1.8rem] md:rounded-[2.5rem] border border-white/70 p-4 md:p-6 text-left shadow-[0_20px_40px_rgba(18,24,27,0.08)] backdrop-blur-[26px] transition hover:-translate-y-1 ${card.title === 'Armario' && !hasCloset ? 'bg-[linear-gradient(180deg,#08111a_0%,#14343b_48%,#2aa1a7_100%)] text-white shadow-[0_26px_54px_rgba(8,17,26,0.24)]' : cardToneClasses[card.tone]} ${card.large ? 'min-h-[190px] md:col-span-2 md:min-h-[250px]' : 'min-h-[190px] md:min-h-[220px]'}`}
            >
              {card.title === 'Armario' && (
                <img
                  src="/images/card-bg-armario.png"
                  alt=""
                  aria-hidden="true"
                  className={`absolute inset-0 h-full w-full object-cover ${hasCloset ? 'opacity-[0.13] blur-[1.5px]' : 'opacity-[0.10] blur-[2px]'}`}
                />
              )}
              {card.title === 'Looks' && (
                <img src="/images/card-bg-looks.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.15] blur-[1.5px]" />
              )}
              {card.title === 'Comunidad' && (
                <img src="/images/card-bg-comunidad.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.16] blur-[2px]" />
              )}
              {card.title === 'Kumbi' && (
                <img src="/images/card-bg-kumbi.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.18] blur-[1px]" />
              )}
              <div className={`absolute inset-0 z-0 ${card.title === 'Armario' && !hasCloset ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_40%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.58),transparent_38%)]'}`} />
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/54 shadow-[0_12px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                    <span className="material-symbols-outlined text-[22px]">{card.icon}</span>
                  </div>
                  {card.badge && (
                    <div className={`rounded-full px-2.5 py-1.5 text-[11px] font-medium shadow-[0_10px_18px_rgba(0,0,0,0.05)] backdrop-blur-xl ${card.title === 'Armario' && !hasCloset ? 'bg-white/18 text-white' : 'bg-white/56 text-[color:var(--home-muted)]'}`}>
                      {card.badge}
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <h2 className={`font-semibold leading-[0.92] tracking-[-0.05em] ${card.title === 'Armario' ? 'font-serif text-[clamp(1.45rem,5.8vw,2.4rem)]' : 'text-[clamp(1.2rem,4.5vw,1.8rem)]'}`}>
                    {card.title}
                  </h2>
                  <p className={`mt-2.5 max-w-sm text-[0.8rem] leading-5 ${card.title === 'Armario' && !hasCloset ? 'font-medium text-white/84' : 'font-medium text-[color:var(--home-muted)]'}`}>
                    {card.title === 'Armario' ? entryDescription : card.description}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between pt-5">
                  <span className={`text-sm ${card.title === 'Armario' && !hasCloset ? 'rounded-full bg-white px-4 py-2 font-semibold text-[#08111a] shadow-[0_12px_24px_rgba(8,17,26,0.22)]' : 'font-medium text-[color:var(--home-muted)]'}`}>{card.cta}</span>
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_12px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl ${card.title === 'Armario' && !hasCloset ? 'border-white/20 bg-white/16 text-white' : 'border-white/55 bg-white/28'}`}>
                    <span className="material-symbols-outlined text-[22px]">north_east</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 md:hidden">
          {quickActions.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={item.action}
              className={`${index % 2 === 0 ? 'bg-[#0a131d] text-white' : 'bg-white/58 text-[color:var(--home-ink)]'} rounded-[1.6rem] border border-white/65 px-4 py-4 text-left text-sm font-semibold shadow-[0_12px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl transition hover:-translate-y-0.5`}
            >
              {item.title}
            </button>
          ))}
        </div>

        <div className="hidden md:grid md:h-[min(700px,calc(100dvh-11rem))] md:grid-cols-12 md:grid-rows-[minmax(180px,0.86fr)_minmax(250px,1.08fr)_minmax(130px,0.62fr)] md:gap-4 lg:gap-5">
          <button
            type="button"
            onClick={looksCard?.action}
            className={`relative col-start-1 row-start-1 col-span-5 row-span-3 overflow-hidden rounded-[2.6rem] border p-6 lg:p-7 text-left backdrop-blur-[26px] transition hover:-translate-y-1 ${hasCloset ? `${cardToneClasses.mint} border-white/70 shadow-[0_20px_40px_rgba(18,24,27,0.08)]` : 'border-[#0e2431]/40 bg-[linear-gradient(180deg,#08111a_0%,#14343b_52%,#2aa1a7_100%)] text-white shadow-[0_28px_60px_rgba(8,17,26,0.26)]'}`}
          >
            <img src="/images/card-bg-looks.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.16] blur-[1.5px]" />
            <div className={`absolute inset-0 z-0 ${hasCloset ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.58),transparent_38%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_44%)]'}`} />
            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/54 shadow-[0_12px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                  <span className={`material-symbols-outlined text-[26px] ${hasCloset ? 'text-[#4a729e]' : 'text-white'}`}>style</span>
                </div>
                <div className={`rounded-full px-4 py-1.5 text-xs font-medium shadow-[0_10px_18px_rgba(0,0,0,0.05)] backdrop-blur-xl ${hasCloset ? 'bg-white/56 text-[color:var(--home-muted)]' : 'bg-white/16 text-white'}`}>
                  {looksCard?.badge || `${savedOutfitCount} guardados`}
                </div>
              </div>

              <div className="mt-4 lg:mt-6">
                <p className={`text-[10px] font-bold uppercase tracking-[0.24em] ${hasCloset ? 'text-[color:var(--home-muted)]' : 'text-white/62'}`}>Base diaria</p>
                <h2 className="mt-2 lg:mt-3 font-serif text-[clamp(2.2rem,4vw,4.4rem)] font-semibold leading-[0.88] tracking-[-0.06em]">
                  {looksCard?.title || 'Looks'}
                </h2>
                <p className={`mt-2 lg:mt-3 max-w-md text-[0.85rem] font-medium leading-5 lg:leading-6 ${hasCloset ? 'text-[color:var(--home-muted)]' : 'text-white/84'}`}>
                  {looksCard?.description || looksPrimaryDescription}
                </p>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-3 pt-5 lg:pt-6">
                <div className={`rounded-[1.4rem] px-4 py-3 backdrop-blur-xl border ${hasCloset ? 'bg-white/50 border-white/40' : 'bg-white/12 border-white/16'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${hasCloset ? 'text-[color:var(--home-muted)]' : 'text-white/62'}`}>Entrada</p>
                  <p className={`mt-1 lg:mt-2 text-base lg:text-lg font-semibold truncate ${hasCloset ? 'text-[color:var(--home-ink)]' : 'text-white'}`}>{looksCard?.cta || looksPrimaryCta}</p>
                </div>
                <div className={`rounded-[1.4rem] px-4 py-3 backdrop-blur-xl border ${hasCloset ? 'bg-white/42 border-white/40' : 'bg-white/10 border-white/14'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${hasCloset ? 'text-[color:var(--home-muted)]' : 'text-white/62'}`}>Siguiente</p>
                  <p className={`mt-1 lg:mt-2 text-base lg:text-lg font-semibold truncate ${hasCloset ? 'text-[color:var(--home-ink)]' : 'text-white'}`}>{closet.length} prendas listas</p>
                </div>
              </div>

              <div className="mt-3 lg:mt-4 flex items-center justify-between">
                <span className={`text-base lg:text-lg ${hasCloset ? 'font-medium text-[color:var(--home-muted)]' : 'rounded-full bg-white px-5 py-3 font-semibold text-[#08111a] shadow-[0_14px_28px_rgba(8,17,26,0.24)]'}`}>{looksCard?.cta || looksPrimaryCta}</span>
                <div className={`inline-flex h-12 w-12 lg:h-16 lg:w-16 items-center justify-center rounded-full border shadow-[0_12px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl ${hasCloset ? 'border-white/55 bg-white/28' : 'border-white/18 bg-white/12'}`}>
                  <span className="material-symbols-outlined text-[24px] lg:text-[32px]">north_east</span>
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={kumbiCard?.action}
            className={`relative col-start-6 row-start-1 col-span-3 row-span-1 overflow-hidden rounded-[2.4rem] border border-white/70 p-5 lg:p-6 text-left shadow-[0_20px_40px_rgba(18,24,27,0.08)] backdrop-blur-[26px] transition hover:-translate-y-1 ${cardToneClasses.ice}`}
          >
            <img src="/images/card-bg-kumbi.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.20] blur-[1px]" />
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.58),transparent_38%)]" />
            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex h-12 w-12 lg:h-14 lg:w-14 items-center justify-center rounded-full bg-white/54 shadow-[0_12px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                  <span className="material-symbols-outlined text-[24px] text-[#d65d70]">forum</span>
                </div>
                <div className="rounded-full bg-white/56 px-3 py-1.5 text-[10px] font-semibold text-[color:var(--home-muted)] shadow-[0_10px_18px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                  {kumbiCard?.badge || 'Incluido'}
                </div>
              </div>

              <div className="mt-3 lg:mt-5">
                <h2 className="text-[1.8rem] lg:text-[2.2rem] font-semibold leading-[0.92] tracking-[-0.05em]">{kumbiCard?.title || 'Kumbi'}</h2>
                <p className="mt-2 text-xs lg:text-sm font-medium leading-5 lg:leading-6 text-[color:var(--home-muted)]">
                  {kumbiCard?.description || 'Tomá esos looks reales y pedile a Kumbi variantes, combinaciones cruzadas o adaptación a otra ocasión.'}
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 lg:pt-5">
                <span className="text-sm lg:text-base font-medium text-[color:var(--home-muted)]">{kumbiCard?.cta || 'Abrir chat'}</span>
                <span className="material-symbols-outlined text-[24px] lg:text-[28px]">north_east</span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={closetCard?.action}
            className={`relative col-start-9 row-start-1 col-span-4 row-span-1 overflow-hidden rounded-[2.4rem] border border-white/70 p-5 lg:p-6 text-left shadow-[0_20px_40px_rgba(18,24,27,0.08)] backdrop-blur-[26px] transition hover:-translate-y-1 ${cardToneClasses.blush}`}
          >
            <img src="/images/card-bg-armario.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.25] blur-[1px]" />
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.58),transparent_38%)]" />
            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex h-12 w-12 lg:h-14 lg:w-14 items-center justify-center rounded-full bg-white/54 shadow-[0_12px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                  <span className="material-symbols-outlined text-[24px] text-[#2aa1a7]">checkroom</span>
                </div>
                <div className="rounded-full bg-white/56 px-3 py-1.5 text-[10px] font-semibold text-[color:var(--home-muted)] shadow-[0_10px_18px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                  {closetCard?.badge || `${closet.length} prendas`}
                </div>
              </div>

              <div className="mt-3 lg:mt-5">
                <h2 className="text-[1.8rem] lg:text-[2.2rem] font-semibold leading-[0.92] tracking-[-0.05em]">{closetCard?.title || 'Armario'}</h2>
                <p className="mt-2 max-w-sm text-xs lg:text-sm font-medium leading-5 lg:leading-6 text-[color:var(--home-muted)]">
                  {closetCard?.description || entryDescription}
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 lg:pt-5">
                <span className="text-sm lg:text-base font-medium text-[color:var(--home-muted)]">{closetCard?.cta || entryLabel}</span>
                <span className="material-symbols-outlined text-[24px] lg:text-[28px]">north_east</span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={activeRecommendation ? onNavigateToCloset : onOpenStylistChat}
            className="relative col-start-6 row-start-2 col-span-3 row-span-1 overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#08111a] p-5 lg:p-6 text-left shadow-[0_24px_48px_rgba(8,17,26,0.22)] transition hover:-translate-y-1"
          >
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(122,162,255,0.22),transparent_42%)]" />
            <div className="relative z-10 flex h-full flex-col">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/52">Radar</p>
                <p className="mt-3 lg:mt-4 text-[1.35rem] lg:text-[1.55rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white">
                {activeRecommendation ? activeRecommendation.reason : `${userName}, repetir mejor también es estilo.`}
              </p>
              <div className="mt-auto pt-3 lg:pt-5 text-xs lg:text-sm font-semibold text-[#8ca8ff]">
                {activeRecommendation ? 'Ir al armario' : 'Abrir Kumbi'}
              </div>
            </div>
          </button>

          <div className="liquid-glass relative overflow-hidden col-start-9 row-start-2 col-span-4 row-span-1 rounded-[2.4rem] p-5 lg:p-6">
            <img src="/images/card-bg-todoamano.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.22] blur-[1px]" />
            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[color:var(--home-muted)]">Atajos</p>
                  <p className="mt-1 lg:mt-2 text-xl lg:text-2xl font-semibold tracking-[-0.04em] text-[color:var(--home-ink)]">A un toque</p>
                </div>
                <div className="inline-flex h-12 w-12 lg:h-14 lg:w-14 items-center justify-center rounded-full bg-white/54 shadow-[0_12px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                  <span className="material-symbols-outlined text-[24px] text-[#2aa1a7]">dashboard_customize</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5 lg:mt-5 lg:gap-3">
                {desktopQuickActions.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={item.action}
                    className={`${index === 0 ? 'bg-[#0a131d] text-white' : 'bg-white/50 border border-white/65 text-[color:var(--home-ink)]'} flex min-h-[54px] items-center justify-center rounded-[1.4rem] px-3 py-3 text-center text-[11px] font-semibold leading-4 lg:min-h-[58px] lg:px-4 lg:py-3.5 lg:text-sm shadow-[0_12px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl transition hover:-translate-y-0.5`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={premiumSecondaryAction}
            className="liquid-glass relative overflow-hidden col-start-6 row-start-3 col-span-4 row-span-1 rounded-[2.4rem] p-5 lg:p-6 text-left transition hover:-translate-y-1 flex flex-col h-full"
          >
            <img src="/images/card-bg-visualpro.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.25] blur-[1px]" />
            <div className="relative z-10 w-full h-full flex flex-col">
              <div className="flex items-center justify-between mb-3 text-[color:var(--home-muted)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em]">Visual Pro</p>
                <span className="material-symbols-outlined text-[24px] text-[#e6a83c]">auto_awesome</span>
              </div>
                <p className="mt-1 lg:mt-2 text-[1.2rem] lg:text-[1.45rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[color:var(--home-ink)]">
                {hasPremiumVisualAccess ? 'Tu ropa en la mejor calidad.' : 'Llevá la facha al siguiente nivel.'}
              </p>
              <p className="mt-2 text-[0.75rem] font-medium leading-4 lg:leading-5 text-[color:var(--home-muted)]">
                {hasPremiumVisualAccess ? 'Aprovechá la magia de tus fotos de estudio.' : 'Activá Mirror y Studio para lucirte en serio.'}
              </p>
              <div className="mt-auto pt-3 text-sm font-medium text-[color:var(--home-muted)]">
                {hasPremiumVisualAccess ? 'Abrir Studio' : 'Ver plan'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={communityCard?.action}
            className={`relative col-start-10 row-start-3 col-span-3 row-span-1 overflow-hidden rounded-[2.4rem] border border-white/70 p-5 lg:p-6 text-left shadow-[0_20px_40px_rgba(18,24,27,0.08)] backdrop-blur-[26px] transition hover:-translate-y-1 flex flex-col h-full ${cardToneClasses.blush}`}
          >
            <img src="/images/card-bg-comunidad.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.28] blur-[1px]" />
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.58),transparent_38%)]" />
            <div className="relative z-10 flex h-full flex-col">
              <span className="material-symbols-outlined text-[26px] text-[#a57f92]">groups</span>
              <h2 className="mt-3 text-[1.45rem] lg:text-[1.7rem] font-semibold leading-[0.94] tracking-[-0.05em]">Comunidad</h2>
              <p className="mt-2 text-[0.75rem] font-medium leading-4 lg:leading-5 text-[color:var(--home-muted)]">
                Vibras reales. Mirá qué están usando los demás de verdad.
              </p>
              <div className="mt-auto pt-4 text-[0.8rem] lg:text-sm font-medium text-[color:var(--home-muted)]">Entrar</div>
            </div>
          </button>
        </div>
        <WearCheckinSheet
          isOpen={isTodayCheckinOpen && Boolean(todaySchedule)}
          date={todaySchedule?.date || new Date().toISOString().split('T')[0]}
          outfitId={todaySchedule?.outfit_id || ''}
          contextLabel={todaySchedule?.outfit.name || todaySchedule?.outfit.explanation || 'Look planificado para hoy'}
          feedback={todayFeedback}
          sourceSurface="home"
          onClose={() => setIsTodayCheckinOpen(false)}
          onSaved={(nextFeedback) => {
            setTodayFeedback(nextFeedback);
          }}
        />
      </div>
    </div>
  );
}
