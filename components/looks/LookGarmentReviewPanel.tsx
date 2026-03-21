import React, { useMemo } from 'react';
import type { ClothingItemMetadata, ReviewableLookGarmentItem } from '../../types';

interface LookGarmentReviewPanelProps {
  items: ReviewableLookGarmentItem[];
  title?: string;
  description?: string;
  summary?: string | null;
  warnings?: string[];
  sourceImageDataUrl?: string | null;
  sourceImageAlt?: string;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  saveError?: string | null;
  saveLabel?: string;
  retryLabel?: string;
  onSaveSelected?: () => void | Promise<void>;
  onRetry?: () => void | Promise<void>;
  onToggleItem: (itemId: string) => void;
  onMetadataChange: (
    itemId: string,
    field: keyof ClothingItemMetadata,
    value: string,
  ) => void;
}

export default function LookGarmentReviewPanel({
  items,
  title = 'Revisá las prendas detectadas',
  description = 'Podés descartar, corregir nombre, categoría o color y guardar varias juntas.',
  summary,
  warnings = [],
  sourceImageDataUrl,
  sourceImageAlt = 'Look subido',
  saveState = 'idle',
  saveError,
  saveLabel,
  retryLabel = 'Reintentar detección',
  onSaveSelected,
  onRetry,
  onToggleItem,
  onMetadataChange,
}: LookGarmentReviewPanelProps) {
  const selectedCount = useMemo(
    () => items.filter((item) => item.selected).length,
    [items],
  );

  const resolvedSaveLabel = saveLabel
    || (saveState === 'saved'
      ? 'Guardadas en armario'
      : selectedCount === items.length
        ? 'Guardar todas'
        : `Guardar ${selectedCount}`);

  const disableEdits = saveState === 'saving' || saveState === 'saved';

  return (
    <div className="space-y-4 rounded-[24px] border border-[#eadfce] bg-[#fffaf5] p-4">
      {sourceImageDataUrl && (
        <div className="overflow-hidden rounded-[22px] border border-[#eadfce] bg-white">
          <img
            src={sourceImageDataUrl}
            alt={sourceImageAlt}
            className="h-56 w-full object-cover"
          />
        </div>
      )}

      {summary && (
        <div className="rounded-[18px] border border-[#eadfce] bg-white px-4 py-3 text-sm text-[#5f554d]">
          {summary}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-[18px] border border-[#f1d2c2] bg-[#fff4ee] px-4 py-3 text-sm text-[#7a4b32]">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}

      {saveError && (
        <div className="rounded-[18px] border border-[#f0c5c5] bg-[#fff1f1] px-4 py-3 text-sm text-[#8b3f3f]">
          {saveError}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#8c8178]">Revisión antes de guardar</p>
          <h3 className="mt-2 text-lg font-semibold text-[#2d241d]">{title}</h3>
          <p className="mt-1 text-sm text-[#5f554d]">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {onSaveSelected && (
            <button
              type="button"
              onClick={() => void onSaveSelected()}
              disabled={saveState === 'saving' || saveState === 'saved'}
              className="rounded-[18px] bg-[#171411] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2b221b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saveState === 'saving' ? 'Guardando...' : resolvedSaveLabel}
            </button>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={() => void onRetry()}
              disabled={saveState === 'saving'}
              className="rounded-[18px] border border-[#dccfc0] bg-white px-4 py-2.5 text-sm font-semibold text-[#544a42] transition hover:bg-[#faf4ec] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retryLabel}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.id}
            className={`overflow-hidden rounded-[22px] border bg-white shadow-[0_18px_40px_-32px_rgba(74,51,27,0.25)] ${
              item.selected ? 'border-[#eadfce]' : 'border-[#f0d5d5] opacity-70'
            }`}
          >
            <div className="grid gap-0 md:grid-cols-[160px_minmax(0,1fr)]">
              <img src={item.imageDataUrl} alt={item.metadata.subcategory} className="h-full min-h-[180px] w-full object-cover" />

              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#8c8178]">Prenda detectada</p>
                    <p className="mt-1 text-sm font-semibold text-[#2d241d]">{item.metadata.subcategory}</p>
                    {typeof item.confidence === 'number' && (
                      <p className="mt-1 text-xs text-[#7a6d62]">
                        Confianza {Math.round(item.confidence * 100)}%
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleItem(item.id)}
                    disabled={disableEdits}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      item.selected
                        ? 'bg-[#171411] text-white'
                        : 'bg-[#f5e2e2] text-[#8b3f3f]'
                    }`}
                  >
                    {item.selected ? 'Guardar' : 'Descartada'}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c8178]">
                    Categoría
                    <select
                      value={item.metadata.category}
                      onChange={(event) => onMetadataChange(item.id, 'category', event.target.value)}
                      disabled={disableEdits}
                      className="mt-2 w-full rounded-[14px] border border-[#e7d7c9] bg-[#fbf8f4] px-3 py-2 text-sm font-medium text-[#3e342c] outline-none focus:border-[#d2b89d] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="shoes">Calzado</option>
                      <option value="outerwear">Abrigo</option>
                      <option value="one-piece">Vestido / enterito</option>
                      <option value="accessory">Accesorio</option>
                    </select>
                  </label>

                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c8178]">
                    Color
                    <input
                      value={item.metadata.color_primary}
                      onChange={(event) => onMetadataChange(item.id, 'color_primary', event.target.value)}
                      disabled={disableEdits}
                      className="mt-2 w-full rounded-[14px] border border-[#e7d7c9] bg-[#fbf8f4] px-3 py-2 text-sm font-medium text-[#3e342c] outline-none placeholder:text-[#9a8f84] focus:border-[#d2b89d] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                </div>

                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#8c8178]">
                  Nombre / subcategoría
                  <input
                    value={item.metadata.subcategory}
                    onChange={(event) => onMetadataChange(item.id, 'subcategory', event.target.value)}
                    disabled={disableEdits}
                    className="mt-2 w-full rounded-[14px] border border-[#e7d7c9] bg-[#fbf8f4] px-3 py-2 text-sm font-medium text-[#3e342c] outline-none placeholder:text-[#9a8f84] focus:border-[#d2b89d] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
