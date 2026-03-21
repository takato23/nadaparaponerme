import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { InferredLookContext, LookUploadSession, SavedLookContext } from '../../types';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { ROUTES } from '../../src/routes';
import { analyzeLooksFromPhotos } from '../../src/services/aiService';
import {
  buildInferredLookContext,
  buildSavedLookContextFromInferredLook,
  createLookUploadSession,
  getLatestLookUploadSession,
} from '../../src/services/inferredLooksService';
import { compressImage } from '../../src/lib/supabase';

interface LooksFirstUploaderProps {
  autoOpen?: boolean;
  onSessionCreated?: (session: LookUploadSession) => void;
  onOpenWithKumbi: (options: {
    prompt: string;
    selectedLook: SavedLookContext;
    selectedInferredLook: InferredLookContext;
    lookUploadSessionId: string;
  }) => void;
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export default function LooksFirstUploader({
  autoOpen = false,
  onSessionCreated,
  onOpenWithKumbi,
}: LooksFirstUploaderProps) {
  const navigate = useNavigate();
  const enableLooksFirstUpload = useFeatureFlag('enableLooksFirstUpload');
  const enableAnalyzeLookEntry = useFeatureFlag('enableAnalyzeLookEntry');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [session, setSession] = useState<LookUploadSession | null>(() => getLatestLookUploadSession());
  const guideSteps = [
    { icon: 'photo_library', title: '1. Subí 3 looks', detail: 'Uno casual, uno repetido y uno más jugado.' },
    { icon: 'frame_inspect', title: '2. Te leo patrones', detail: 'Detecto siluetas, combinaciones y piezas que más repetís.' },
    { icon: 'chat', title: '3. Seguís con Kumbi', detail: 'Usás esos looks como base sin cargar todo el placard.' },
  ];

  const canAnalyze = draftImages.length === 3 && !isAnalyzing;
  const ctaLabel = session ? 'Analizar otros 3 looks' : 'Subí 3 looks tuyos';

  const handlePickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files).slice(0, 3);
    if (files.length > 3) {
      toast('Voy a usar solo las primeras 3 fotos para este análisis.');
    }

    try {
      const nextImages = await Promise.all(selectedFiles.map(async (file) => {
        const compressed = await compressImage(file, 1440, 0.82);
        return readFileAsDataUrl(compressed);
      }));
      setDraftImages(nextImages);
    } catch (error) {
      console.error('Error preparing look upload:', error);
      toast.error('No pude preparar esas fotos.');
    }
  };

  const handleAnalyze = async () => {
    if (!canAnalyze) return;

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeLooksFromPhotos(draftImages);
      const created = createLookUploadSession({
        source: 'saved_looks',
        imageDataUrls: draftImages,
        analysis,
      });
      setSession(created);
      setDraftImages([]);
      onSessionCreated?.(created);
      toast.success('Tus looks ya tienen una primera lectura.');
    } catch (error: any) {
      toast.error(error?.message || 'No pude analizar tus looks.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const looksGrid = useMemo(() => session?.looks || [], [session]);

  if (!enableLooksFirstUpload) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-[26px] border border-white/60 bg-white/85 shadow-[0_24px_58px_-36px_rgba(74,51,27,0.42)] backdrop-blur-xl">
      <div className="border-b border-[#eadfce] bg-[linear-gradient(180deg,rgba(255,250,244,0.96),rgba(251,244,235,0.88))] px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[#8c8178]">Looks first</p>
            <h2 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] text-[#2d241d] sm:text-[1.8rem]">
              Arrancá por cómo ya te vestís.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5f554d]">Tres fotos, una lectura rápida y ya podés trabajar desde looks reales tuyos.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-[18px] bg-[#171411] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2b221b] disabled:cursor-not-allowed disabled:opacity-60"
                autoFocus={autoOpen}
                disabled={!enableAnalyzeLookEntry}
              >
                {enableAnalyzeLookEntry ? ctaLabel : 'Carga de looks pausada'}
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center rounded-[18px] bg-[#171411] px-3.5 py-3 text-white transition hover:bg-[#2b221b] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Sacar foto con la cámara"
                title="Sacar foto"
                disabled={!enableAnalyzeLookEntry}
              >
                <span className="material-symbols-outlined text-xl">photo_camera</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.BULK_UPLOAD)}
              className="rounded-[18px] border border-[#dccfc0] bg-white px-4 py-3 text-sm font-semibold text-[#544a42] transition hover:bg-[#faf4ec]"
            >
              Prefiero subir prendas
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 md:grid-cols-3">
          {guideSteps.map((step) => (
            <div
              key={step.title}
              className="flex items-start gap-3 rounded-[18px] border border-[#eadfce] bg-[#fff9f3] px-3.5 py-3"
            >
              <span className="material-symbols-outlined mt-0.5 text-[18px] text-[#a65a2c]">{step.icon}</span>
              <div>
                <p className="text-sm font-semibold text-[#2d241d]">{step.title}</p>
                <p className="mt-1 text-xs leading-5 text-[#6c6157]">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {!enableAnalyzeLookEntry && (
          <div className="mt-4 rounded-[18px] border border-[#eadfce] bg-[#fff9f3] px-4 py-3 text-sm text-[#5f554d]">
            El análisis automático de looks está pausado. Mientras tanto, seguí cargando prendas manualmente desde tu armario.
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
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

      <div className="px-5 py-5">
        {draftImages.length > 0 && (
          <div className="mb-5 rounded-[22px] border border-[#eadfce] bg-[#fff9f3] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#2d241d]">Tus 3 looks para analizar</p>
                <p className="text-xs text-[#6c6157]">Ideal si se ve cuerpo entero o al menos la silueta completa.</p>
              </div>
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                disabled={!canAnalyze}
                className="rounded-[18px] bg-[#c76332] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b25628] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAnalyzing ? 'Analizando...' : 'Analizar 3 looks'}
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {draftImages.map((imageDataUrl, index) => (
                <div key={`draft-${index}`} className="overflow-hidden rounded-[20px] border border-[#eadfce] bg-white">
                  <img src={imageDataUrl} alt={`Look ${index + 1}`} className="h-44 w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {session && (
          <div className="space-y-5">
            <div className="rounded-[22px] border border-[#eadfce] bg-[#fffaf5] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#8c8178]">Primer valor</p>
              <p className="mt-2 text-sm leading-6 text-[#5f554d]">
                {session.adaptation_tip || 'Kumbi ya puede trabajar sobre estos looks: reinterpretarlos, mezclar ideas y adaptarlos a otras ocasiones.'}
              </p>
              {session.cross_suggestions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {session.cross_suggestions.map((suggestion) => (
                    <span
                      key={suggestion}
                      className="rounded-full border border-[#dccfc0] bg-white px-3 py-1.5 text-xs font-semibold text-[#544a42]"
                    >
                      {suggestion}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {looksGrid.map((look, index) => {
                const selectedLook = buildSavedLookContextFromInferredLook(look);
                const selectedInferredLook = buildInferredLookContext(look);
                return (
                  <article
                    key={look.id}
                    className="overflow-hidden rounded-[24px] border border-white/60 bg-white/90 shadow-[0_18px_40px_-30px_rgba(74,51,27,0.35)]"
                  >
                    <img src={look.image_data_url} alt={look.name || `Look ${index + 1}`} className="h-56 w-full object-cover" />
                    <div className="space-y-4 p-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#8c8178]">{look.occasion || `Look ${index + 1}`}</p>
                        <p className="mt-2 text-sm leading-6 text-[#3e342c]">{look.summary}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {look.style_tags.slice(0, 3).map((tag) => (
                          <span key={`${look.id}-${tag}`} className="rounded-full border border-[#dfe8eb] bg-[#f3f8fa] px-2.5 py-1 text-[11px] font-semibold text-[#2d5f64]">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#8c8178]">Piezas dominantes</p>
                        <p className="text-sm text-[#5f554d]">{look.dominant_pieces.join(' · ')}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenWithKumbi({
                          prompt: `Tomá este look que subí y ayudame a crear variantes nuevas. Resumen: ${look.summary}. Piezas dominantes: ${look.dominant_pieces.join(', ')}. Tags: ${look.style_tags.join(', ')}.`,
                          selectedLook,
                          selectedInferredLook,
                          lookUploadSessionId: session.id,
                        })}
                        className="w-full rounded-[18px] bg-[#c76332] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#b25628]"
                      >
                        Usar con Kumbi
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate(ROUTES.BULK_UPLOAD)}
                className="rounded-[18px] border border-[#dccfc0] bg-white px-4 py-3 text-sm font-semibold text-[#544a42] transition hover:bg-[#faf4ec]"
              >
                Refinar prendas para mejorar precisión
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-[18px] border border-[#dccfc0] bg-[#fff9f3] px-4 py-3 text-sm font-semibold text-[#544a42] transition hover:bg-[#fff2e3]"
              >
                Volver a subir 3 looks
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
