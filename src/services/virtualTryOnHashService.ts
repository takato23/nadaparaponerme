import type { TryOnRenderHashInput } from '../../types';

const TRYON_HASH_VERSION = 1;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = canonicalize(obj[key]);
    }
    return out;
  }
  return value;
}

function toSortedEntries(record: Record<string, string> | undefined): Array<[string, string]> {
  if (!record) return [];
  return Object.entries(record)
    .filter(([key, value]) => key.trim().length > 0 && String(value).trim().length > 0)
    .sort(([a], [b]) => a.localeCompare(b));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildTryOnRenderHash(input: TryOnRenderHashInput): Promise<string> {
  const payload = canonicalize({
    version: input.version ?? TRYON_HASH_VERSION,
    surface: input.surface,
    userFingerprint: input.userFingerprint,
    slotItemIds: toSortedEntries(input.slotItemIds),
    preset: input.preset,
    customScene: (input.customScene || '').trim(),
    quality: input.quality,
    view: input.view,
    keepPose: Boolean(input.keepPose),
    useFaceRefs: Boolean(input.useFaceRefs),
    slotFits: toSortedEntries(input.slotFits as Record<string, string> | undefined),
    faceRefsSignature: input.faceRefsSignature || '',
  });

  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return toHex(digest);
}
