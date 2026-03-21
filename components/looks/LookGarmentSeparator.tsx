import React, { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { ClothingItem, ClothingItemMetadata } from '../../types';
import { separateLookGarments } from '../../src/services/aiService';
import {
  buildReviewableLookGarmentItems,
  saveReviewedLookGarments,
  type ReviewableLookGarmentItem,
} from '../../src/services/lookGarmentSeparationService';
import { compressImage } from '../../src/lib/supabase';
import * as analytics from '../../src/services/analyticsService';
import LookGarmentReviewPanel from './LookGarmentReviewPanel';

interface LookGarmentSeparatorProps {
  closet: ClothingItem[];
  onClosetSync: (items: ClothingItem[]) => void;
  useSupabaseCloset: boolean;
  collapsed?: boolean;
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No pude leer la foto.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function buildLocalItem(id: string, imageDataUrl: string, metadata: ClothingItemMetadata): ClothingItem {
  return {
    id,
    imageDataUrl,
    metadata,
    status: 'owned',
    aiStatus: 'ready',
  };
}

export default function LookGarmentSeparator({
  closet,
  onClosetSync,
  useSupabaseCloset,
  collapsed = false,
}: LookGarmentSeparatorProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [sourceImageDataUrl, setSourceImageDataUrl] = useState<string | null>(null);
  const [isSeparating, setIsSeparating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewableLookGarmentItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(!collapsed);

  const selectedCount = useMemo(
    () => reviewItems.filter((item) => item.selected).length,
    [reviewItems],
  );

  const hasWorkingState = Boolean(sourceImageDataUrl || reviewItems.length > 0 || isSeparating || isSaving);

  const resetState = () => {
    setSourceImageDataUrl(null);
    setReviewItems([]);
    setWarnings([]);
    setSummary(null);
    setError(null);
  };

  const handlePickFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 1600, 0.84);
      const imageDataUrl = await readFileAsDataUrl(compressed);
      setSourceImageDataUrl(imageDataUrl);
      setReviewItems([]);
      setWarnings([]);
      setSummary(null);
      setError(null);
    } catch (nextError) {
      console.error('Error preparing look separation image:', nextError);
      setError('No pude preparar esa foto.');
    }
  };

  const handleSeparate = async () => {
    if (!sourceImageDataUrl || isSeparating) return;

    setIsSeparating(true);
    setError(null);

    try {
      const rawResult = await separateLookGarments(sourceImageDataUrl);
      const items = await buildReviewableLookGarmentItems(sourceImageDataUrl, rawResult);
      const normalizedWarnings = Array.isArray(rawResult?.warnings)
        ? rawResult.warnings.filter((warning): warning is string => typeof warning === 'string' && warning.trim().length > 0)
        : [];

      setWarnings(normalizedWarnings);
      setSummary(typeof rawResult?.summary === 'string' ? rawResult.summary : null);
      setReviewItems(items);

      if (items.length === 0) {
        setError('No pude separar prendas claras en esta foto. Igual podés seguir usando el look como referencia.');
        toast('No encontré prendas claras para separar.');
        return;
      }

      toast.success(`Encontré ${items.length} ${items.length === 1 ? 'prenda' : 'prendas'} para revisar.`);
    } catch (nextError: any) {
      console.error('Error separating look garments:', nextError);
      setError(nextError?.message || 'No pude separar las prendas de este look.');
    } finally {
      setIsSeparating(false);
    }
  };

  const handleMetadataChange = <K extends keyof ClothingItemMetadata>(
    itemId: string,
    field: K,
    value: ClothingItemMetadata[K],
  ) => {
    setReviewItems((prev) => prev.map((item) => (
      item.id === itemId
        ? { ...item, metadata: { ...item.metadata, [field]: value } }
        : item
    )));
  };

  const handleToggleItem = (itemId: string) => {
    setReviewItems((prev) => prev.map((item) => (
      item.id === itemId
        ? { ...item, selected: !item.selected }
        : item
    )));
  };

  const handleSaveSelected = async () => {
    if (selectedCount === 0) {
      toast('Elegí al menos una prenda para guardar.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (useSupabaseCloset) {
        const updatedCloset = await saveReviewedLookGarments(reviewItems);
        const ownedCount = updatedCloset.filter((item) => (item.status || 'owned') === 'owned').length;
        onClosetSync(updatedCloset);
        analytics.trackOwnedItemAdded(ownedCount);
        if (ownedCount >= 8) {
          analytics.trackFirstEightItemsReached(ownedCount);
        }
      } else {
        const localItems = reviewItems
          .filter((item) => item.selected)
          .map((item, index) => buildLocalItem(
            `look-garment-${Date.now()}-${index + 1}`,
            item.imageDataUrl,
            item.metadata,
          ));
        onClosetSync([...localItems, ...closet]);
        analytics.trackOwnedItemAdded(
          closet.filter((item) => (item.status || 'owned') === 'owned').length + localItems.length,
        );
      }

      toast.success(selectedCount === 1 ? 'Prenda guardada en tu armario.' : 'Prendas guardadas en tu armario.');
      resetState();
    } catch (nextError: any) {
      console.error('Error saving separated garments:', nextError);
      setError(nextError?.message || 'No pude guardar esas prendas ahora.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[26px] border border-white/60 bg-white/85 shadow-[0_24px_58px_-36px_rgba(74,51,27,0.42)] backdrop-blur-xl">
      <div className="border-b border-[#eadfce] bg-[linear-gradient(180deg,rgba(255,250,244,0.96),rgba(251,244,235,0.88))] px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <p className="text-[11px] uppercase tracking-[0.26em] text-[#8c8178]">Extra</p>
              <span className="rounded-full bg-[#fff4e8] px-2.5 py-1 text-[10px] font-semibold text-[#9a5a22]">
                Para sumar prendas al armario
              </span>
            </div>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#2d241d]">
              ¿Querés sacar prendas desde una foto de look?
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-[#5f554d]">
              Subís una sola foto, revisás lo detectado y guardás lo que sirve.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="rounded-[18px] border border-[#dccfc0] bg-white px-4 py-3 text-sm font-semibold text-[#544a42] transition hover:bg-[#faf4ec]"
            >
              {isExpanded ? 'Ocultar separador' : 'Abrir separador'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsExpanded(true);
                galleryInputRef.current?.click();
              }}
              className="rounded-[18px] bg-[#171411] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2b221b]"
            >
              Elegir foto
            </button>
          </div>
        </div>

        {!isExpanded && (
          <div className="mt-3 flex flex-wrap gap-2">
            {['1 foto', 'Revisás recortes', 'Guardás solo lo útil'].map((item) => (
              <span
                key={item}
                className="rounded-full border border-[#eadfce] bg-[#fff9f3] px-3 py-1.5 text-xs font-medium text-[#5f554d]"
              >
                {item}
              </span>
            ))}
          </div>
        )}

        {isExpanded && (
          <div className="mt-4 rounded-[18px] border border-[#eadfce] bg-[#fff9f3] px-4 py-3 text-sm text-[#5f554d]">
            Si la ropa está puesta, tapada o superpuesta, la precisión puede bajar. Para máxima precisión, sigue siendo mejor una foto por prenda.
          </div>
        )}

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handlePickFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            void handlePickFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {(isExpanded || hasWorkingState) && (
        <div className="space-y-4 px-5 py-5">
        {sourceImageDataUrl && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="overflow-hidden rounded-[24px] border border-[#eadfce] bg-[#fffaf5]">
              <img src={sourceImageDataUrl} alt="Look subido" className="h-full min-h-[320px] w-full object-cover" />
            </div>

            <div className="space-y-4 rounded-[24px] border border-[#eadfce] bg-[#fffaf5] p-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#8c8178]">Paso siguiente</p>
                <h3 className="mt-2 text-lg font-semibold text-[#2d241d]">Separar prendas</h3>
                <p className="mt-2 text-sm leading-6 text-[#5f554d]">
                  Voy a detectar las prendas principales visibles y te las dejo listas para revisar antes de guardarlas.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleSeparate()}
                  disabled={isSeparating}
                  className="rounded-[18px] bg-[#c76332] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b25628] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSeparating ? 'Separando...' : 'Separar prendas'}
                </button>
                <button
                  type="button"
                  onClick={resetState}
                  className="rounded-[18px] border border-[#dccfc0] bg-white px-4 py-2.5 text-sm font-semibold text-[#544a42] transition hover:bg-[#faf4ec]"
                >
                  Cambiar foto
                </button>
              </div>

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

              {error && (
                <div className="rounded-[18px] border border-[#f0c5c5] bg-[#fff1f1] px-4 py-3 text-sm text-[#8b3f3f]">
                  {error}
                  <p className="mt-2 text-xs text-[#8b3f3f]">
                    Esta foto igual no rompe nada: podés cambiarla o seguir con el resto de Looks.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {reviewItems.length > 0 && (
          <LookGarmentReviewPanel
            items={reviewItems}
            saveState={isSaving ? 'saving' : 'idle'}
            onSaveSelected={handleSaveSelected}
            onRetry={handleSeparate}
            onToggleItem={handleToggleItem}
            onMetadataChange={handleMetadataChange}
            saveLabel={selectedCount === reviewItems.length ? 'Guardar todas' : `Guardar ${selectedCount}`}
          />
        )}
        </div>
      )}
    </section>
  );
}
