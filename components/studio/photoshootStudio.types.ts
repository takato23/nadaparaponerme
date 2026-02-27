import type {
  ClothingItem,
  ClothingSlot,
  GenerationFit,
  GenerationPreset,
  SlotSelection,
} from '../../types';
import { CATEGORY_TO_SLOT } from '../../types';

export interface PhotoshootStudioProps {
  closet: ClothingItem[];
}

export interface GeneratedImageRecord {
  image: string;
  slots: string[];
  model: string;
  quality?: 'flash' | 'pro';
  view?: 'front' | 'back' | 'side';
  useFaceRefs?: boolean;
  preset: GenerationPreset;
  keepPose: boolean;
  faceRefsUsed: number;
  customScene?: string;
  selfieUrl: string;
  timestamp: number;
  itemIds: Record<string, string>;
  renderHash?: string;
  surface?: 'studio' | 'mirror';
  cacheHit?: boolean;
  id?: string;
}

export type FilterStatus = 'all' | 'owned' | 'virtual';

export type StudioLocationState = {
  tab?: 'owned' | 'virtual';
  selectedItemId?: string;
  preselectedItemIds?: string[];
  fromMirror?: boolean;
  useVirtualModel?: boolean;
} | null;

export interface StudioGenerationPayload {
  activeBaseImage: string;
  slots: Record<string, string>;
  slotItems: Array<{ slot: ClothingSlot; item: ClothingItem; fit: GenerationFit }>;
  slotFits: Record<string, GenerationFit>;
  slotItemIds: Record<string, string>;
}

export interface StudioCachePrecheckInput extends StudioGenerationPayload {
  presetId: GenerationPreset;
  customScene: string;
  generationQuality: 'flash' | 'pro';
  generationView: 'front' | 'back' | 'side';
  keepPose: boolean;
  useFaceRefs: boolean;
}

export const DIGITAL_TWIN_STORAGE_KEY = 'ojodeloca-digital-twin';
export const DIGITAL_TWIN_SOURCE_IMAGE_KEY = 'ojodeloca-digital-twin-source-image';
export const STUDIO_GENERATION_STATE_KEY = 'studio-generation-state';
export const DEFAULT_VIRTUAL_MODEL_IMAGE = '/images/demo/before.svg';
export const DEFAULT_BASE_PREVIEW_ASPECT = 4 / 5;

export const FILTERS: Array<{ id: FilterStatus; label: string }> = [
  { id: 'all', label: 'Todo' },
  { id: 'owned', label: 'Mi armario' },
  { id: 'virtual', label: 'Prestadas' },
];

export const QUICK_CATEGORIES: Array<{ id: string; label: string; icon: string }> = [
  { id: 'top', label: 'Remera/Top', icon: '👕' },
  { id: 'bottom', label: 'Pantalón/Falda', icon: '👖' },
  { id: 'one_piece', label: 'Vestido/Enterito', icon: '👗' },
  { id: 'outerwear', label: 'Campera/Abrigo', icon: '🧥' },
  { id: 'shoes', label: 'Zapatos', icon: '👟' },
];

export function getValidSlotsForItem(item: ClothingItem): ClothingSlot[] {
  const category = item.metadata?.category || 'top';
  return CATEGORY_TO_SLOT[category] || ['top_base'];
}

export function hasMinimumCoverage(slots: Map<ClothingSlot, SlotSelection>): boolean {
  return slots.size > 0;
}
