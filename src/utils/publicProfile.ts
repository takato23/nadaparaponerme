export function isEmailLike(value: string | null | undefined): boolean {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function getEmailLocalPart(value: string | null | undefined): string | null {
  const normalized = (value || '').trim();
  if (!isEmailLike(normalized)) return null;

  const localPart = normalized.split('@')[0]?.trim();
  return localPart || null;
}

export function getSafePublicDisplayName(
  displayName: string | null | undefined,
  username: string | null | undefined,
  fallback: string = 'Usuario'
): string {
  const normalizedDisplayName = displayName?.trim();
  if (normalizedDisplayName && !isEmailLike(normalizedDisplayName)) {
    return normalizedDisplayName;
  }

  const normalizedUsername = username?.trim();
  if (normalizedUsername && !isEmailLike(normalizedUsername)) {
    return normalizedUsername;
  }

  const emailLocalPart = getEmailLocalPart(normalizedDisplayName) || getEmailLocalPart(normalizedUsername);
  if (emailLocalPart) {
    return emailLocalPart;
  }

  return fallback;
}
