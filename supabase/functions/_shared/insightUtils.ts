export type InsightType = 'mix' | 'chat' | 'report';

const textEncoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(input));
  return bytesToHex(new Uint8Array(digest));
}

export function normalizeClosetForHash(closet: any[]): any[] {
  return (closet || [])
    .map((item) => ({
      id: String(item?.id || ''),
      category: item?.category || item?.metadata?.category || null,
      subcategory: item?.subcategory || item?.metadata?.subcategory || null,
      color_primary: item?.color_primary || item?.metadata?.color_primary || null,
      tags: item?.tags || item?.metadata?.vibe_tags || [],
      seasons: item?.ai_metadata?.seasons || item?.metadata?.seasons || [],
      ai_status: item?.ai_status || null,
      ai_metadata_version: item?.ai_metadata_version ?? 0,
      updated_at: item?.updated_at || null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function buildClosetHash(closet: any[]): Promise<string> {
  return sha256Hex(JSON.stringify(normalizeClosetForHash(closet)));
}

export async function buildPromptHash(prompt: string): Promise<string> {
  return sha256Hex((prompt || '').trim().toLowerCase());
}

export function sanitizeIdempotencyKey(key: unknown): string | null {
  if (typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (!trimmed) return null;
  if (trimmed.length > 120) return null;
  if (!/^[a-zA-Z0-9._:-]+$/.test(trimmed)) return null;
  return trimmed;
}

export function parseClothingStoragePath(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;

  const cleaned = imageUrl.trim();
  if (!cleaned) return null;

  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    return cleaned.replace(/^\/+/, '');
  }

  const patterns = [
    '/storage/v1/object/public/clothing-images/',
    '/storage/v1/object/sign/clothing-images/',
    '/storage/v1/object/authenticated/clothing-images/',
    '/storage/v1/object/clothing-images/',
  ];

  for (const marker of patterns) {
    const idx = cleaned.indexOf(marker);
    if (idx >= 0) {
      return cleaned.slice(idx + marker.length).split('?')[0];
    }
  }

  const fallback = cleaned.match(/\/clothing-images\/(.+?)(\?.*)?$/);
  if (fallback?.[1]) {
    return fallback[1];
  }

  return null;
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const mimeType = blob.type || 'image/jpeg';
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const base64 = bytesToBase64(bytes);
  return `data:${mimeType};base64,${base64}`;
}
