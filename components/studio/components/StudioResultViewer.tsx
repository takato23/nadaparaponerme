import { GENERATION_PRESETS } from '../../../types';
import { GenerationLoader } from '../GenerationLoader';
import type { GeneratedImageRecord } from '../photoshootStudio.types';

interface StudioResultViewerProps {
  isGenerating: boolean;
  activeBaseImage: string | null;
  generatedImages: GeneratedImageRecord[];
  onSelectImage: (image: GeneratedImageRecord) => void;
  onGenerateNow: () => void;
  canGenerate: boolean;
  isSaving: boolean;
  onSaveLook: (image: GeneratedImageRecord) => void;
  onOpenSavedLooks: () => void;
}

export function StudioResultViewer({
  isGenerating,
  activeBaseImage,
  generatedImages,
  onSelectImage,
  onGenerateNow,
  canGenerate,
  isSaving,
  onSaveLook,
  onOpenSavedLooks,
}: StudioResultViewerProps) {
  return (
    <aside className="hidden lg:flex flex-col fixed right-0 top-0 bottom-0 w-96 bg-white/80 backdrop-blur-xl border-l border-white/60 z-20">
      <div className="p-4 border-b border-white/60">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--studio-ink-muted)]">
          Preview
        </h2>
      </div>

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        {isGenerating ? (
          <div className="h-full flex items-center justify-center min-h-[400px]">
            <div className="w-full max-w-[280px]">
              <GenerationLoader userImage={activeBaseImage} />
            </div>
          </div>
        ) : generatedImages.length > 0 ? (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden shadow-lg">
              <img
                src={generatedImages[0].image}
                alt="Último look"
                className="w-full aspect-[3/4] object-cover cursor-pointer"
                onClick={() => onSelectImage(generatedImages[0])}
              />
              <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/90 text-white">
                  Nano 3.1
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/90 text-gray-700 text-xs font-semibold">
                  {GENERATION_PRESETS.find((preset) => preset.id === generatedImages[0].preset)?.label ||
                    generatedImages[0].preset}
                </span>
              </div>
              <div className="absolute bottom-2 left-2 flex gap-1">
                {generatedImages[0].keepPose && (
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-500/90 text-white text-xs font-semibold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-xs">person_pin</span>
                    Pose
                  </span>
                )}
                {generatedImages[0].faceRefsUsed > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-green-500/90 text-white text-xs font-semibold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-xs">face</span>
                    {generatedImages[0].faceRefsUsed}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onGenerateNow}
                disabled={isGenerating || !canGenerate}
                className="py-2 px-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                title="Generar otra versión"
              >
                <span className="material-symbols-outlined text-sm">autorenew</span>
              </button>
              <button
                onClick={() => onSelectImage(generatedImages[0])}
                className="py-2 px-3 rounded-lg bg-white border border-gray-200 text-xs font-semibold flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">compare</span>
              </button>
              <button
                onClick={() => onSaveLook(generatedImages[0])}
                disabled={isSaving}
                className="flex-1 py-2 rounded-lg bg-[color:var(--studio-ink)] text-white text-xs font-semibold flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                {isSaving ? '...' : 'Guardar'}
              </button>
            </div>

            {generatedImages.length > 1 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-[color:var(--studio-ink-muted)] mb-2">
                  Anteriores ({generatedImages.length - 1})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {generatedImages.slice(1, 7).map((generatedImage, index) => (
                    <button
                      key={index}
                      onClick={() => onSelectImage(generatedImage)}
                      className="aspect-[3/4] rounded-lg overflow-hidden border border-white/50 relative group"
                    >
                      <img src={generatedImage.image} alt={`Look ${index + 2}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1 p-1">
                        <span className="text-[8px] text-white font-semibold">
                          {GENERATION_PRESETS.find((preset) => preset.id === generatedImage.preset)?.label ||
                            generatedImage.preset}
                        </span>
                        <div className="flex gap-1">
                          {generatedImage.keepPose && (
                            <span className="material-symbols-outlined text-blue-300 text-xs">person_pin</span>
                          )}
                          {generatedImage.faceRefsUsed > 0 && (
                            <span className="material-symbols-outlined text-green-300 text-xs">face</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-[color:var(--studio-ink-muted)]">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-30">image</span>
            <p className="text-sm">
              Tu look generado
              <br />
              aparecerá aquí
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/60">
        <button
          onClick={onOpenSavedLooks}
          className="w-full py-2.5 rounded-lg border border-[color:var(--studio-ink-muted)]/30 text-sm font-medium text-[color:var(--studio-ink-muted)] hover:bg-white/50 transition flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">photo_library</span>
          Ver armario de looks
        </button>
      </div>
    </aside>
  );
}
