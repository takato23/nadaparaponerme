import type { ChatSaveLookDraft, StructuredOutfitSuggestion, StylistSurface } from '../../types';

function slugTag(value: string): string | null {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim();

  if (!normalized) return null;
  const compact = normalized.split(/\s+/).slice(0, 3).join('-');
  return compact || null;
}

function dedupeTags(tags: Array<string | null | undefined>, max = 3): string[] {
  const unique = new Set<string>();
  for (const tag of tags) {
    const normalized = slugTag(tag || '');
    if (!normalized || unique.has(normalized)) continue;
    unique.add(normalized);
    if (unique.size >= max) break;
  }
  return Array.from(unique);
}

function deriveName(
  outfit: StructuredOutfitSuggestion,
  occasion?: string | null,
  messageContent?: string,
): string {
  if (occasion?.trim()) {
    return `Look ${occasion.trim()}`;
  }
  if (outfit.look_goal === 'reference_recreation') {
    return 'Look inspirado';
  }
  if (messageContent?.trim()) {
    const compact = messageContent.trim().replace(/\s+/g, ' ').slice(0, 32);
    if (compact) return compact;
  }
  return 'Look de Kumbi';
}

export function deriveSaveLookDraft(params: {
  outfit: StructuredOutfitSuggestion;
  assistantContent?: string;
  surface?: StylistSurface;
  suggestedOccasion?: string | null;
}): ChatSaveLookDraft {
  const occasion = params.suggestedOccasion?.trim() || null;

  return {
    status: 'editing',
    name: deriveName(params.outfit, occasion, params.assistantContent),
    occasion,
    folderId: null,
    tags: dedupeTags([
      occasion,
      params.outfit.look_goal === 'reference_recreation' ? 'referencia' : 'kumbi',
      params.surface && params.surface !== 'kumbi' ? params.surface : null,
      ...(params.outfit.styling_notes || []).slice(0, 2),
    ]),
    note: null,
    error: null,
    outfitSuggestion: params.outfit,
  };
}

export function parseLookDraftTagsInput(input: string): string[] {
  return dedupeTags(
    input
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    3,
  );
}
