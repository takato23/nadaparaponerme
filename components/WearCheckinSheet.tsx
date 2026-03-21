import React, { useEffect, useMemo, useState } from 'react';
import type {
  OutfitWearFeedback,
  OutfitWearFeedbackSource,
  OutfitWearSkipReason,
  OutfitWearStatus,
} from '../types';
import {
  upsertWearFeedback,
} from '../src/services/outfitWearFeedbackService';
import {
  trackOutfitFeedbackEdited,
  trackOutfitFeedbackOpened,
  trackOutfitFeedbackSubmitted,
} from '../src/services/analyticsService';

type SaveMode = 'create' | 'edit';

interface WearCheckinSheetProps {
  isOpen: boolean;
  date: string;
  outfitId: string;
  contextLabel: string;
  feedback?: OutfitWearFeedback | null;
  sourceSurface: OutfitWearFeedbackSource;
  onClose: () => void;
  onSaved: (feedback: OutfitWearFeedback, mode: SaveMode) => void;
}

const skipReasonLabels: Record<OutfitWearSkipReason, string> = {
  weather: 'Clima',
  comfort: 'Comodidad',
  occasion: 'Ocasión',
  changed_mind: 'Cambié de idea',
};

function SegmentedBoolean({
  label,
  value,
  positiveLabel,
  negativeLabel,
  onChange,
}: {
  label: string;
  value: boolean | null;
  positiveLabel: string;
  negativeLabel: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded-[1.4rem] border border-black/10 bg-white/55 p-3 backdrop-blur-xl">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${value === true ? 'bg-[#0f172a] text-white shadow-[0_12px_24px_rgba(15,23,42,0.22)]' : 'bg-white text-slate-700 border border-black/10'}`}
        >
          {positiveLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${value === false ? 'bg-[#dbe4ff] text-slate-900 shadow-[0_10px_18px_rgba(59,130,246,0.14)]' : 'bg-white text-slate-700 border border-black/10'}`}
        >
          {negativeLabel}
        </button>
      </div>
    </div>
  );
}

export default function WearCheckinSheet({
  isOpen,
  date,
  outfitId,
  contextLabel,
  feedback,
  sourceSurface,
  onClose,
  onSaved,
}: WearCheckinSheetProps) {
  const [status, setStatus] = useState<OutfitWearStatus | null>(null);
  const [confidencePositive, setConfidencePositive] = useState<boolean | null>(null);
  const [comfortPositive, setComfortPositive] = useState<boolean | null>(null);
  const [skipReason, setSkipReason] = useState<OutfitWearSkipReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveMode: SaveMode = feedback ? 'edit' : 'create';
  const dateLabel = useMemo(
    () => new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' }),
    [date],
  );

  useEffect(() => {
    if (!isOpen) return;

    setStatus(feedback?.status || null);
    setConfidencePositive(feedback?.confidence_positive ?? null);
    setComfortPositive(feedback?.comfort_positive ?? null);
    setSkipReason(feedback?.skip_reason ?? null);
    setError(null);

    trackOutfitFeedbackOpened({
      source_surface: sourceSurface,
      mode: saveMode,
    });
  }, [feedback, isOpen, saveMode, sourceSurface]);

  if (!isOpen) return null;

  const canSave = status === 'worn'
    ? confidencePositive !== null && comfortPositive !== null
    : status === 'not_worn' && Boolean(skipReason);

  const handleSave = async () => {
    if (!canSave || isSaving || !status) return;

    setIsSaving(true);
    setError(null);

    try {
      const nextFeedback = await upsertWearFeedback({
        date,
        outfit_id: outfitId,
        status,
        confidence_positive: status === 'worn' ? confidencePositive : null,
        comfort_positive: status === 'worn' ? comfortPositive : null,
        skip_reason: status === 'not_worn' ? skipReason : null,
        source_surface: sourceSurface,
      });

      const analyticsPayload = {
        source_surface: sourceSurface,
        mode: saveMode,
        status,
        skip_reason: status === 'not_worn' ? skipReason ?? undefined : undefined,
      };

      if (saveMode === 'edit') {
        trackOutfitFeedbackEdited(analyticsPayload);
      } else {
        trackOutfitFeedbackSubmitted(analyticsPayload);
      }

      onSaved(nextFeedback, saveMode);
      onClose();
    } catch {
      setError('No se pudo guardar. Reintentá en un momento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(247,244,239,0.98),rgba(255,255,255,0.94))] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.28)] backdrop-blur-[28px] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-slate-500">
              Diario de uso
            </p>
            <h3 className="mt-2 text-2xl font-semibold leading-[0.95] tracking-[-0.04em] text-slate-950">
              {feedback ? 'Editá cómo te fue' : '¿Lo usaste de verdad?'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {contextLabel}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              {dateLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/70 text-slate-700 transition hover:bg-white"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-5 rounded-[1.6rem] border border-black/10 bg-white/60 p-4 backdrop-blur-xl">
          <p className="text-sm font-semibold text-slate-900">¿Lo usaste?</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setStatus('worn');
                setSkipReason(null);
              }}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${status === 'worn' ? 'bg-[#0f172a] text-white shadow-[0_14px_28px_rgba(15,23,42,0.22)]' : 'bg-white text-slate-700 border border-black/10'}`}
            >
              Sí, lo usé
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus('not_worn');
                setConfidencePositive(null);
                setComfortPositive(null);
              }}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${status === 'not_worn' ? 'bg-[#fee2e2] text-slate-900 shadow-[0_14px_28px_rgba(239,68,68,0.16)]' : 'bg-white text-slate-700 border border-black/10'}`}
            >
              No, no salió
            </button>
          </div>
        </div>

        {status === 'worn' && (
          <div className="mt-4 grid gap-3">
            <SegmentedBoolean
              label="¿Te sentiste bien con el look?"
              value={confidencePositive}
              positiveLabel="Sí, me quedó bien"
              negativeLabel="No del todo"
              onChange={setConfidencePositive}
            />
            <SegmentedBoolean
              label="¿Estuviste cómodo/a?"
              value={comfortPositive}
              positiveLabel="Sí, cómodo/a"
              negativeLabel="No tanto"
              onChange={setComfortPositive}
            />
          </div>
        )}

        {status === 'not_worn' && (
          <div className="mt-4 rounded-[1.4rem] border border-black/10 bg-white/55 p-4 backdrop-blur-xl">
            <p className="text-sm font-semibold text-slate-900">¿Qué lo frenó?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Object.entries(skipReasonLabels).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSkipReason(value as OutfitWearSkipReason)}
                  className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition ${skipReason === value ? 'bg-[#0f172a] text-white shadow-[0_14px_28px_rgba(15,23,42,0.22)]' : 'bg-white text-slate-700 border border-black/10'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs leading-5 text-slate-500">
            El check-in es privado y sirve para que la app te recomiende mejor.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/70"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="rounded-full bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.22)] transition disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSaving ? 'Guardando...' : feedback ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
