import { useCallback } from 'react';
import toast from 'react-hot-toast';
import type { Dispatch, SetStateAction } from 'react';
import type { FaceReference } from '../../../src/services/faceReferenceService';
import {
  getCachedTryOnRender,
  recordTryOnCacheHit,
  saveRenderImageToStorage,
  upsertTryOnCacheEntry,
} from '../../../src/services/virtualTryOnCacheService';
import { buildTryOnRenderHash } from '../../../src/services/virtualTryOnHashService';
import * as analytics from '../../../src/services/analyticsService';
import type {
  GeneratedImageRecord,
  StudioCachePrecheckInput,
  StudioGenerationPayload,
} from '../photoshootStudio.types';
import { STUDIO_GENERATION_STATE_KEY } from '../photoshootStudio.types';

interface UseStudioCacheParams {
  enableHybridTryOn: boolean;
  userId?: string;
  setGeneratedImages: Dispatch<SetStateAction<GeneratedImageRecord[]>>;
}

interface ExecuteStudioCachePrecheckInput extends StudioCachePrecheckInput {
  faceRefs: FaceReference[];
}

export function useStudioCache({
  enableHybridTryOn,
  userId,
  setGeneratedImages,
}: UseStudioCacheParams) {
  const executeStudioCachePrecheck = useCallback(
    async (input: ExecuteStudioCachePrecheckInput): Promise<{ cacheHit: boolean; renderHash?: string }> => {
      if (!(enableHybridTryOn && userId)) {
        return { cacheHit: false };
      }

      try {
        const faceRefsSig = input.faceRefs.map((ref) => `${ref.id}:${ref.updated_at}`).join('|') || null;
        const renderHash = await buildTryOnRenderHash({
          version: 1,
          surface: 'studio',
          userFingerprint: userId,
          slotItemIds: input.slotItemIds,
          preset: input.presetId,
          customScene: input.presetId === 'custom' ? input.customScene : '',
          quality: input.generationQuality,
          view: input.generationView,
          keepPose: input.keepPose,
          useFaceRefs: input.useFaceRefs,
          slotFits: input.slotFits,
          faceRefsSignature: faceRefsSig,
        });

        const analyticsBase = {
          surface: 'studio' as const,
          quality: input.generationQuality,
          preset: input.presetId,
          slot_count: input.slotItems.length,
        };

        const cached = await getCachedTryOnRender(renderHash);
        if (cached) {
          const cacheHitImage: GeneratedImageRecord = {
            image: cached.image_url,
            slots: Object.keys(input.slots),
            model: cached.model,
            quality: input.generationQuality,
            view: input.generationView,
            useFaceRefs: input.useFaceRefs,
            preset: input.presetId,
            keepPose: input.keepPose,
            faceRefsUsed: input.useFaceRefs ? input.faceRefs.length : 0,
            customScene: input.presetId === 'custom' ? input.customScene : undefined,
            selfieUrl: input.activeBaseImage,
            timestamp: Date.now(),
            itemIds: input.slotItemIds,
            renderHash,
            surface: 'studio',
            cacheHit: true,
          };

          setGeneratedImages((prev) => [cacheHitImage, ...prev]);
          analytics.trackTryOnCacheHit({
            ...analyticsBase,
            model: cached.model,
          });
          void recordTryOnCacheHit(renderHash);
          localStorage.removeItem(STUDIO_GENERATION_STATE_KEY);
          toast.success('Look recuperado del cache');
          return { cacheHit: true, renderHash };
        }

        analytics.trackTryOnCacheMiss(analyticsBase);
        return { cacheHit: false, renderHash };
      } catch (error) {
        console.error('Studio cache pre-check failed:', error);
        return { cacheHit: false };
      }
    },
    [enableHybridTryOn, userId, setGeneratedImages],
  );

  const persistStudioCacheEntry = useCallback(
    async (image: GeneratedImageRecord, faceRefs: FaceReference[]) => {
      if (!(enableHybridTryOn && userId)) return;
      if (!image.renderHash || image.cacheHit) return;

      const faceRefsSig = faceRefs.map((ref) => `${ref.id}:${ref.updated_at}`).join('|') || null;

      try {
        const stored = await saveRenderImageToStorage(image.image, userId, image.renderHash);
        await upsertTryOnCacheEntry({
          renderHash: image.renderHash,
          storagePath: stored.storagePath,
          sourceSurface: 'studio',
          quality: image.quality || 'pro',
          preset: image.preset,
          view: image.view || 'front',
          keepPose: image.keepPose,
          useFaceRefs: image.useFaceRefs !== false,
          slotSignature: image.itemIds,
          faceRefsSignature: faceRefsSig,
          model: image.model,
        });
      } catch (error) {
        console.error('Failed to persist studio cache:', error);
      }
    },
    [enableHybridTryOn, userId],
  );

  const buildStudioCacheInput = useCallback(
    (
      payload: StudioGenerationPayload,
      extra: {
        faceRefs: FaceReference[];
        presetId: ExecuteStudioCachePrecheckInput['presetId'];
        customScene: string;
        generationQuality: ExecuteStudioCachePrecheckInput['generationQuality'];
        generationView: ExecuteStudioCachePrecheckInput['generationView'];
        keepPose: boolean;
        useFaceRefs: boolean;
      },
    ): ExecuteStudioCachePrecheckInput => ({
      ...payload,
      ...extra,
    }),
    [],
  );

  return {
    executeStudioCachePrecheck,
    persistStudioCacheEntry,
    buildStudioCacheInput,
  };
}
