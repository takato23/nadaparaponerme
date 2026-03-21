type LookAttachment = {
  kind: string;
  imageDataUrl: string;
};

const LOOK_EXTRACTION_INTENT_REGEX = /\b(guarda(?:me|r)?|suma(?:me|r)?|carga(?:me|r)?|separa(?:me|r)?|extrae|saca(?:me|r)?|pas(a|ame)?).*(prendas?|ropa|look|armario|closet)\b|\b(prendas?|ropa).*(armario|closet|guarda|carga|suma)\b/i;

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function isLookGarmentExtractionIntent(message: string): boolean {
  const normalized = normalizeForMatch(message || '');
  return LOOK_EXTRACTION_INTENT_REGEX.test(normalized);
}

export function resolveLookGarmentExtractionAttachment(
  attachments: LookAttachment[],
  message: string,
): LookAttachment | null {
  const explicitAttachment = attachments.find((attachment) => attachment.kind === 'extractable_look');
  if (explicitAttachment) return explicitAttachment;

  if (!isLookGarmentExtractionIntent(message)) return null;
  return attachments.find((attachment) => attachment.kind === 'reference_look') || null;
}
