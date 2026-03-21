export function isEmailLike(value: string | null | undefined): boolean {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
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

  return fallback;
}
