import type { ChatAttachment, StylistContextPayload, StylistSurface } from '../../types';

const PENDING_STYLIST_ENTRY_KEY = 'ojodeloca-pending-stylist-entry';
const ENTRY_TTL_MS = 1000 * 60 * 30;

export interface PendingStylistEntry {
  prompt: string;
  source?: string;
  surface?: StylistSurface;
  createdAt: number;
  contextPayload?: StylistContextPayload | null;
  attachments?: ChatAttachment[];
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function setPendingStylistEntry(entry: {
  prompt: string;
  source?: string;
  surface?: StylistSurface;
  contextPayload?: StylistContextPayload | null;
  attachments?: ChatAttachment[];
}): void {
  if (!isBrowser()) return;

  const normalizedPrompt = String(entry.prompt || '').trim();
  if (!normalizedPrompt) return;

  const payload: PendingStylistEntry = {
    prompt: normalizedPrompt,
    source: entry.source || 'contextual_surface',
    surface: entry.surface,
    createdAt: Date.now(),
    contextPayload: entry.contextPayload || null,
    attachments: Array.isArray(entry.attachments) ? entry.attachments : undefined,
  };

  try {
    window.localStorage.setItem(PENDING_STYLIST_ENTRY_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors and continue without seeded prompt.
  }
}

export function setPendingStylistPrompt(
  prompt: string,
  source = 'contextual_surface',
  surface?: StylistSurface,
  contextPayload?: StylistContextPayload | null,
  attachments?: ChatAttachment[],
): void {
  setPendingStylistEntry({
    prompt,
    source,
    surface,
    contextPayload: contextPayload || null,
    attachments,
  });
}

export function consumePendingStylistPrompt(): PendingStylistEntry | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(PENDING_STYLIST_ENTRY_KEY);
    if (!raw) return null;

    window.localStorage.removeItem(PENDING_STYLIST_ENTRY_KEY);

    const parsed = JSON.parse(raw) as Partial<PendingStylistEntry> | null;
    if (!parsed?.prompt || typeof parsed.prompt !== 'string') return null;

    const createdAt = Number(parsed.createdAt || 0);
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > ENTRY_TTL_MS) {
      return null;
    }

    return {
      prompt: parsed.prompt.trim(),
      source: typeof parsed.source === 'string' ? parsed.source : undefined,
      surface: typeof parsed.surface === 'string' ? parsed.surface as StylistSurface : undefined,
      createdAt,
      contextPayload: parsed.contextPayload && typeof parsed.contextPayload === 'object'
        ? parsed.contextPayload as StylistContextPayload
        : null,
      attachments: Array.isArray(parsed.attachments)
        ? parsed.attachments.filter((attachment): attachment is ChatAttachment =>
          attachment
          && (attachment.kind === 'reference_look' || attachment.kind === 'extractable_look')
          && typeof attachment.imageDataUrl === 'string')
        : [],
    };
  } catch {
    return null;
  }
}
