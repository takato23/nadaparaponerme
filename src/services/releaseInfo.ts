export function getCurrentReleaseIdentifier(): string {
  if (typeof document === 'undefined') return 'unknown-release';

  const script = document.querySelector('script[type="module"][src]') as HTMLScriptElement | null;
  const src = script?.getAttribute('src') || '';
  const match = src.match(/(index-[A-Za-z0-9_-]+\.js)/);
  return match?.[1] || src || 'unknown-release';
}

export function stampReleaseIdentifier(): string {
  const releaseId = getCurrentReleaseIdentifier();
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.appRelease = releaseId;
  }
  return releaseId;
}
