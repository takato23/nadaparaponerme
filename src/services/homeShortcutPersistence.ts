import type { FitResult } from '../../types';

export type HomeShortcutIntent =
  | 'quick-look'
  | 'dress-me-today'
  | 'plan-b'
  | 'build-around-item'
  | 'weather-look';

export interface HomeShortcutSnapshot {
  intent: HomeShortcutIntent;
  requestId?: string | null;
  selectedItemId?: string | null;
  lastResult?: FitResult | null;
  updatedAt: number;
}

const PREFIX = 'ojodeloca-home-shortcut';

const buildKey = (intent: HomeShortcutIntent) => `${PREFIX}-${intent}`;

function readSnapshot(intent: HomeShortcutIntent): HomeShortcutSnapshot {
  return {
    intent,
    requestId: null,
    selectedItemId: null,
    lastResult: null,
    updatedAt: 0,
  };
}

export function getShortcutSnapshot(intent: HomeShortcutIntent): HomeShortcutSnapshot {
  try {
    const raw = localStorage.getItem(buildKey(intent));
    if (!raw) return readSnapshot(intent);
    const parsed = JSON.parse(raw) as Partial<HomeShortcutSnapshot>;
    return {
      intent,
      requestId: parsed.requestId ?? null,
      selectedItemId: parsed.selectedItemId ?? null,
      lastResult: parsed.lastResult ?? null,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
  } catch {
    return readSnapshot(intent);
  }
}

export function saveShortcutSnapshot(intent: HomeShortcutIntent, updates: Partial<HomeShortcutSnapshot>): HomeShortcutSnapshot {
  const next = {
    ...getShortcutSnapshot(intent),
    ...updates,
    intent,
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(buildKey(intent), JSON.stringify(next));
  } catch {
    // noop
  }

  return next;
}

export function clearShortcutSnapshot(intent: HomeShortcutIntent): void {
  try {
    localStorage.removeItem(buildKey(intent));
  } catch {
    // noop
  }
}

export function clearShortcutRequestId(intent: HomeShortcutIntent): void {
  saveShortcutSnapshot(intent, { requestId: null });
}

export function readShortcutRequestId(intent: HomeShortcutIntent): string | null {
  return getShortcutSnapshot(intent).requestId ?? null;
}

export function persistShortcutRequestId(intent: HomeShortcutIntent, requestId: string | null): HomeShortcutSnapshot {
  return saveShortcutSnapshot(intent, { requestId });
}

export function readShortcutSelectedItemId(intent: HomeShortcutIntent): string | null {
  return getShortcutSnapshot(intent).selectedItemId ?? null;
}

export function persistShortcutSelectedItemId(intent: HomeShortcutIntent, selectedItemId: string | null): HomeShortcutSnapshot {
  return saveShortcutSnapshot(intent, { selectedItemId });
}

export function readShortcutResult(intent: HomeShortcutIntent): FitResult | null {
  return getShortcutSnapshot(intent).lastResult ?? null;
}

export function persistShortcutResult(intent: HomeShortcutIntent, result: FitResult | null): HomeShortcutSnapshot {
  return saveShortcutSnapshot(intent, { lastResult: result });
}
