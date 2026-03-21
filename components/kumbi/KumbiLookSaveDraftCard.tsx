import React from 'react';
import type { ChatSaveLookDraft, ClothingItem, LookFolder } from '../../types';
import { parseLookDraftTagsInput } from '../../src/services/kumbiLookSaveDraft';
import { getPreferredClothingImage } from '../../src/utils/closetImages';

interface KumbiLookSaveDraftCardProps {
  draft: ChatSaveLookDraft;
  pieces: Array<{ label: string; item: ClothingItem }>;
  folders: LookFolder[];
  onChange: (patch: Partial<ChatSaveLookDraft>) => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
}

export default function KumbiLookSaveDraftCard({
  draft,
  pieces,
  folders,
  onChange,
  onSave,
  onCancel,
}: KumbiLookSaveDraftCardProps) {
  const disabled = draft.status === 'saving' || draft.status === 'saved';

  return (
    <div className="mt-3 rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(223,231,236,0.72))] p-4 dark:border-slate-600 dark:bg-[#111827]">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-rounded text-sm text-[#2aa1a7]">bookmark_added</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#2d5f64] dark:text-violet-300">
          Guardar look en biblioteca
        </span>
      </div>

      <div className={`grid gap-3 mb-4 ${pieces.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
        {pieces.map(({ label, item }) => (
          <div key={`${label}-${item.id}`} className="space-y-1.5">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 ring-1 ring-gray-200 dark:ring-gray-600">
              <img src={getPreferredClothingImage(item)} alt={label} className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-center text-gray-500 dark:text-gray-300 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {draft.error && (
        <div className="mb-3 rounded-xl border border-[#f0c5c5] bg-[#fff1f1] px-3 py-2 text-xs text-[#8b3f3f]">
          {draft.error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c8178]">
          Nombre
          <input
            value={draft.name}
            onChange={(event) => onChange({ name: event.target.value, error: null })}
            disabled={disabled}
            className="mt-2 w-full rounded-[14px] border border-[#e7d7c9] bg-[#fbf8f4] px-3 py-2 text-sm font-medium text-[#3e342c] outline-none focus:border-[#d2b89d] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c8178]">
          Ocasión
          <input
            value={draft.occasion || ''}
            onChange={(event) => onChange({ occasion: event.target.value, error: null })}
            disabled={disabled}
            className="mt-2 w-full rounded-[14px] border border-[#e7d7c9] bg-[#fbf8f4] px-3 py-2 text-sm font-medium text-[#3e342c] outline-none focus:border-[#d2b89d] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c8178]">
          Carpeta
          <select
            value={draft.folderId || ''}
            onChange={(event) => onChange({ folderId: event.target.value || null, error: null })}
            disabled={disabled}
            className="mt-2 w-full rounded-[14px] border border-[#e7d7c9] bg-[#fbf8f4] px-3 py-2 text-sm font-medium text-[#3e342c] outline-none focus:border-[#d2b89d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Sin carpeta</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c8178]">
          Tags
          <input
            value={draft.tags.join(', ')}
            onChange={(event) => onChange({ tags: parseLookDraftTagsInput(event.target.value), error: null })}
            disabled={disabled}
            placeholder="casual, oficina, noche"
            className="mt-2 w-full rounded-[14px] border border-[#e7d7c9] bg-[#fbf8f4] px-3 py-2 text-sm font-medium text-[#3e342c] outline-none focus:border-[#d2b89d] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </div>

      <label className="block mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#8c8178]">
        Nota corta
        <textarea
          value={draft.note || ''}
          onChange={(event) => onChange({ note: event.target.value, error: null })}
          disabled={disabled}
          rows={3}
          className="mt-2 w-full resize-none rounded-[14px] border border-[#e7d7c9] bg-[#fbf8f4] px-3 py-2 text-sm font-medium text-[#3e342c] outline-none focus:border-[#d2b89d] disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={disabled}
          className="rounded-xl bg-[#14343b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#102830] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {draft.status === 'saving' ? 'Guardando...' : draft.status === 'saved' ? 'Guardado en Looks' : 'Confirmar guardado'}
        </button>
        {draft.status !== 'saved' && (
          <button
            type="button"
            onClick={onCancel}
            disabled={draft.status === 'saving'}
            className="rounded-xl border border-white/70 bg-white/56 px-4 py-2 text-sm font-semibold text-[#14343b] transition-colors hover:bg-white/82 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-700/60 dark:text-violet-300 dark:hover:bg-violet-900/30"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
