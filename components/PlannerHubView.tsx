import React, { useEffect, useMemo, useState } from 'react';
import type {
  ClothingItem,
  OutfitWearFeedback,
  SavedOutfit,
  ScheduledOutfitWithDetails,
  WeeklyWearInsights,
} from '../types';
import * as scheduleService from '../src/services/scheduleService';
import * as analytics from '../src/services/analyticsService';
import {
  buildFeedbackLookup,
  buildWeeklyFeedbackStylistPrompt,
  computeWeeklyWearInsights,
  getFeedbackForWeek,
} from '../src/services/outfitWearFeedbackService';
import Loader from './Loader';
import WearCheckinSheet from './WearCheckinSheet';

interface PlannerHubViewProps {
  closet: ClothingItem[];
  savedOutfits: SavedOutfit[];
  onOpenWeeklyPlanner: () => void;
  onOpenCalendarSync: () => void;
  onOpenWeatherOutfit: () => void;
  onOpenGapAnalysis: () => void;
  onOpenStylistWithPrompt?: (prompt: string) => void;
}

const plannerTheme = {
  '--planner-night': '#0a0c14',
  '--planner-paper': '#f7f1e8',
  '--planner-ink': '#1a1713',
  '--planner-muted': 'rgba(26, 23, 19, 0.66)',
  '--planner-mint': '#9ad4c0',
  '--planner-amber': '#f2c17f',
  '--planner-rose': '#efada7',
  '--planner-violet': '#9e89f7',
} as React.CSSProperties;

const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now);
  start.setDate(diff);
  return start.toISOString().split('T')[0];
};

export default function PlannerHubView({
  closet,
  savedOutfits,
  onOpenWeeklyPlanner,
  onOpenCalendarSync,
  onOpenWeatherOutfit,
  onOpenGapAnalysis,
  onOpenStylistWithPrompt,
}: PlannerHubViewProps) {
  const [weekSchedule, setWeekSchedule] = useState<ScheduledOutfitWithDetails[]>([]);
  const [feedbackEntries, setFeedbackEntries] = useState<OutfitWearFeedback[]>([]);
  const [weeklyInsights, setWeeklyInsights] = useState<WeeklyWearInsights | null>(null);
  const [selectedCheckin, setSelectedCheckin] = useState<{
    date: string;
    outfitId: string;
    label: string;
    feedback: OutfitWearFeedback | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    analytics.trackEvent('planner_used', { source: 'planner_tab', action: 'viewed' });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadWeek = async () => {
      setIsLoading(true);
      const weekStart = getWeekStart();

      try {
        const [scheduleData, weekFeedback] = await Promise.all([
          scheduleService.getWeekSchedule(weekStart),
          getFeedbackForWeek(weekStart),
        ]);

        if (!cancelled) {
          setWeekSchedule(scheduleData);
          setFeedbackEntries(weekFeedback);
          const nextInsights = computeWeeklyWearInsights(scheduleData, weekFeedback, weekStart);
          setWeeklyInsights(nextInsights);
          analytics.trackWeeklyWearInsightsViewed({ source_surface: 'planner', pending_count: nextInsights.pending_count });
        }
      } catch {
        if (!cancelled) {
          setWeekSchedule([]);
          setFeedbackEntries([]);
          setWeeklyInsights(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadWeek();

    return () => {
      cancelled = true;
    };
  }, []);

  const plannedDays = weekSchedule.length;
  const today = new Date().toISOString().split('T')[0];
  const todayLook = useMemo(
    () => weekSchedule.find((entry) => entry.date === today) ?? null,
    [today, weekSchedule],
  );
  const feedbackLookup = useMemo(() => buildFeedbackLookup(feedbackEntries), [feedbackEntries]);
  const todayFeedback = todayLook ? feedbackLookup[`${todayLook.date}::${todayLook.outfit_id}`] ?? null : null;
  const strongestLook = weeklyInsights?.strongest_outfit_id
    ? weekSchedule.find((entry) => entry.outfit_id === weeklyInsights.strongest_outfit_id) ?? null
    : null;
  const stylistPrompt = useMemo(() => buildWeeklyFeedbackStylistPrompt(
    weekSchedule.map((entry) => ({
      date: entry.date,
      outfit: entry.outfit,
      feedback: feedbackLookup[`${entry.date}::${entry.outfit_id}`] ?? null,
    })),
  ), [feedbackLookup, weekSchedule]);

  const handleFeedbackSaved = (nextFeedback: OutfitWearFeedback) => {
    const feedbackKey = `${nextFeedback.date}::${nextFeedback.outfit_id}`;

    setFeedbackEntries((current) => {
      const nextEntries = [
        ...current.filter((entry) => `${entry.date}::${entry.outfit_id}` !== feedbackKey),
        nextFeedback,
      ].sort((left, right) => left.date.localeCompare(right.date));

      setWeeklyInsights(computeWeeklyWearInsights(weekSchedule, nextEntries, getWeekStart()));
      return nextEntries;
    });
  };

  const actionCards = [
    {
      id: 'week',
      title: 'Semana completa',
      description: 'Arrastrá looks a los días y cerrá la semana en una sola sesión.',
      accent: 'var(--planner-mint)',
      cta: 'Abrir planner',
      onClick: () => {
        analytics.trackEvent('planner_used', { source: 'planner_tab', action: 'open_weekly_planner' });
        onOpenWeeklyPlanner();
      },
    },
    {
      id: 'calendar',
      title: 'Eventos reales',
      description: 'Traé el calendario para preparar outfits antes de salir corriendo.',
      accent: 'var(--planner-violet)',
      cta: 'Conectar calendario',
      onClick: () => {
        analytics.trackEvent('planner_used', { source: 'planner_tab', action: 'open_calendar_sync' });
        onOpenCalendarSync();
      },
    },
    {
      id: 'weather',
      title: 'Clima del día',
      description: 'Resuelve hoy rápido usando temperatura, ocasión y armario.',
      accent: 'var(--planner-amber)',
      cta: 'Ver outfit del día',
      onClick: () => {
        analytics.trackEvent('planner_used', { source: 'planner_tab', action: 'open_weather' });
        onOpenWeatherOutfit();
      },
    },
    {
      id: 'gaps',
      title: 'Faltantes reales',
      description: 'Comprá solo cuando el planner te muestre un agujero concreto.',
      accent: 'var(--planner-rose)',
      cta: 'Revisar gaps',
      onClick: () => {
        analytics.trackEvent('gap_viewed', { source: 'planner_tab' });
        onOpenGapAnalysis();
      },
    },
  ];

  return (
    <div
      className="relative min-h-full overflow-hidden text-[color:var(--planner-ink)]"
      style={plannerTheme}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(1000px circle at 12% 0%, rgba(154, 212, 192, 0.18), transparent 46%),
            radial-gradient(900px circle at 100% 12%, rgba(158, 137, 247, 0.14), transparent 42%),
            radial-gradient(1000px circle at 50% 100%, rgba(239, 173, 167, 0.18), transparent 58%),
            linear-gradient(180deg, #f7f0e7 0%, #fbf7f2 44%, #f3ece3 100%)
          `,
        }}
      />
      <div className="noise-overlay opacity-[0.04]" />
      <div className="absolute -left-20 top-14 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.52)_0%,_transparent_70%)] blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.38)_0%,_transparent_70%)] blur-3xl" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 md:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2.6rem] border border-white/65 bg-white/56 p-6 shadow-[0_24px_70px_rgba(24,24,27,0.12)] backdrop-blur-[24px] md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_42%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-black/8 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-[color:var(--planner-ink)]">
                <span className="h-2 w-2 rounded-full bg-[color:var(--planner-mint)]" />
                Planner
              </div>
              <h1 className="mt-5 max-w-3xl text-[clamp(2.6rem,6vw,4.8rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-[color:var(--planner-ink)]">
                El armario sirve más
                <span className="mt-1 block font-serif italic text-black/38">cuando también piensa en tiempo.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--planner-muted)]">
                Este espacio convierte looks guardados, clima, eventos y faltantes en una agenda usable. No es productividad genérica: es criterio vestido.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[2rem] border border-[#0c0c13]/14 bg-[#0e1018] p-5 text-white shadow-[0_18px_40px_rgba(10,11,16,0.22)]">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Panel vivo</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Prendas', value: closet.length, accent: 'var(--planner-mint)' },
                    { label: 'Looks', value: savedOutfits.length, accent: 'var(--planner-rose)' },
                    { label: 'Días listos', value: plannedDays, accent: 'var(--planner-amber)' },
                    { label: 'Hoy', value: todayLook?.outfit?.explanation ? 'Listo' : 'Vacío', accent: 'var(--planner-violet)' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">{item.label}</p>
                      <p className="mt-3 text-lg font-semibold" style={{ color: item.accent }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenWeeklyPlanner}
                className="rounded-[1.8rem] border border-white/70 bg-white/52 p-5 text-left shadow-[0_12px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/70"
              >
                <p className="text-[11px] uppercase tracking-[0.24em] text-black/42">Acción principal</p>
                <p className="mt-2 text-xl font-semibold text-[color:var(--planner-ink)]">Abrir planner semanal</p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--planner-muted)]">
                  Arrastrá looks, acomodá días y transformá el armario en una rutina visible.
                </p>
              </button>
            </div>
          </div>
        </section>
        <section className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
          <article className="rounded-[2.3rem] border border-white/65 bg-white/54 p-6 shadow-[0_18px_50px_rgba(24,24,27,0.1)] backdrop-blur-[22px]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-black/42">Hoy</p>
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--planner-ink)]">Loop de uso real</h2>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] ${todayFeedback?.status === 'worn' ? 'bg-emerald-100 text-emerald-700' : todayFeedback?.status === 'not_worn' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                {todayFeedback?.status === 'worn' ? 'Registrado: usado' : todayFeedback?.status === 'not_worn' ? 'Registrado: no usado' : 'Pendiente'}
              </span>
            </div>

            {todayLook ? (
              <div className="mt-5 rounded-[1.8rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(247,241,232,0.78))] p-5">
                <p className="text-sm font-semibold text-[color:var(--planner-ink)]">
                  {todayLook.outfit.name || todayLook.outfit.explanation || 'Look planificado para hoy'}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--planner-muted)]">
                  {todayFeedback?.status === 'worn'
                    ? 'Ya marcaste este look como usado. Ese dato ahora cuenta para futuras recomendaciones.'
                    : todayFeedback?.status === 'not_worn'
                      ? 'Ya quedó registrado que hoy no salió. Podés editarlo si querés corregir la señal.'
                      : 'Todavía falta cerrar el loop de hoy. Un check-in rápido le da verdad al planner.'}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="rounded-[1.2rem] border border-white/70 bg-white/75 px-4 py-3 text-sm shadow-[0_10px_20px_rgba(0,0,0,0.04)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/42">Fecha</p>
                    <p className="mt-1 font-semibold text-[color:var(--planner-ink)]">
                      {new Date(`${todayLook.date}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCheckin({
                      date: todayLook.date,
                      outfitId: todayLook.outfit_id,
                      label: todayLook.outfit.name || todayLook.outfit.explanation || 'Look planificado para hoy',
                      feedback: todayFeedback,
                    })}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0e1018] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(14,16,24,0.22)] transition hover:-translate-y-0.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">{todayFeedback ? 'edit' : 'bolt'}</span>
                    {todayFeedback ? 'Editar check-in' : 'Registrar ahora'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[1.8rem] border border-dashed border-black/10 bg-white/35 p-6 text-sm leading-6 text-[color:var(--planner-muted)]">
                Hoy todavía no hay look asignado. Cuando exista, el check-in va a aparecer acá y también dentro del planner semanal.
              </div>
            )}
          </article>

          <article className="rounded-[2.3rem] border border-[#0c0c13]/14 bg-[#0e1018] p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Resumen 7 días</p>
                <h2 className="mt-2 text-2xl font-semibold">Lo que sí estás usando</h2>
              </div>
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
                {weeklyInsights?.pending_count ?? 0} pendientes
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { label: 'Planeados', value: weeklyInsights?.planned_count ?? 0 },
                { label: 'Respondidos', value: weeklyInsights?.feedback_count ?? 0 },
                { label: 'Usados', value: weeklyInsights?.worn_count ?? 0 },
                { label: 'No usados', value: weeklyInsights?.not_worn_count ?? 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/42">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.7rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/42">Look más fuerte</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white">
                {strongestLook?.outfit.name || strongestLook?.outfit.explanation || 'Todavía no hay suficiente señal positiva'}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/62">
                {strongestLook
                  ? 'Es el look con mejor combinación entre uso real, confianza y comodidad en la semana.'
                  : 'Cuando empieces a responder check-ins, este bloque va a resaltar lo que más te funciona.'}
              </p>
            </div>

            {stylistPrompt && onOpenStylistWithPrompt && (
              <button
                type="button"
                onClick={() => onOpenStylistWithPrompt(stylistPrompt)}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white px-5 py-3 text-sm font-semibold text-[#0e1018] shadow-[0_16px_32px_rgba(255,255,255,0.14)] transition hover:-translate-y-0.5"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                Pedir variantes a Kumbi
              </button>
            )}
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <article className="rounded-[2.3rem] border border-white/65 bg-white/52 p-6 shadow-[0_18px_50px_rgba(24,24,27,0.1)] backdrop-blur-[22px]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-black/42">Esta semana</p>
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--planner-ink)]">Estado del tablero semanal</h2>
              </div>
            </div>

            {isLoading ? (
              <div className="flex min-h-[220px] items-center justify-center">
                <Loader />
              </div>
            ) : weekSchedule.length === 0 ? (
              <div className="mt-6 rounded-[1.8rem] border border-dashed border-black/10 bg-white/35 p-6 text-sm leading-6 text-[color:var(--planner-muted)]">
                Todavía no hay looks asignados. Empezá por guardar uno y después traelo al planner para que la semana ya arranque con estructura.
              </div>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {weekSchedule.slice(0, 6).map((entry, index) => (
                  <div
                    key={entry.id}
                    className="rounded-[1.8rem] border border-white/60 bg-white/45 p-4 shadow-[0_10px_26px_rgba(0,0,0,0.05)] backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-black/42">
                        {new Date(entry.date).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })}
                      </p>
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: index % 2 === 0 ? 'var(--planner-mint)' : 'var(--planner-rose)' }}
                      />
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--planner-ink)]">
                      {entry.outfit.explanation || 'Look guardado'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-[2.3rem] border border-[#0c0c13]/14 bg-[#0e1018] p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Qué resolver</p>
            <h2 className="mt-2 text-2xl font-semibold">Capas del planner</h2>
            <div className="mt-5 space-y-3">
              {actionCards.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  className="w-full rounded-[1.8rem] border border-white/10 bg-white/6 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/9"
                >
                  <p className="text-sm font-semibold" style={{ color: action.accent }}>{action.title}</p>
                  <p className="mt-1 text-sm leading-6 text-white/62">{action.description}</p>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
                    {action.cta}
                  </p>
                </button>
              ))}
            </div>
          </article>
        </section>
        <WearCheckinSheet
          isOpen={Boolean(selectedCheckin)}
          date={selectedCheckin?.date || today}
          outfitId={selectedCheckin?.outfitId || ''}
          contextLabel={selectedCheckin?.label || 'Look planificado'}
          feedback={selectedCheckin?.feedback || null}
          sourceSurface="planner"
          onClose={() => setSelectedCheckin(null)}
          onSaved={(nextFeedback) => {
            handleFeedbackSaved(nextFeedback);
            setSelectedCheckin(null);
          }}
        />
      </div>
    </div>
  );
}
