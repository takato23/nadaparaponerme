export type PublicEntryIntent = 'closet' | 'look' | 'style';
export type PublicEntryStage = 'hero' | 'preview';

type PendingPublicEntryState = {
  authActive: boolean;
  intent: PublicEntryIntent | null;
  updatedAt: string;
};

const STORAGE_KEY = 'ojodeloca-public-entry-state';

const readState = (): PendingPublicEntryState => {
  if (typeof window === 'undefined') {
    return {
      authActive: false,
      intent: null,
      updatedAt: new Date(0).toISOString(),
    };
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        authActive: false,
        intent: null,
        updatedAt: new Date(0).toISOString(),
      };
    }

    const parsed = JSON.parse(raw) as Partial<PendingPublicEntryState>;
    return {
      authActive: parsed.authActive === true,
      intent: parsed.intent === 'closet' || parsed.intent === 'look' || parsed.intent === 'style'
        ? parsed.intent
        : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return {
      authActive: false,
      intent: null,
      updatedAt: new Date(0).toISOString(),
    };
  }
};

const writeState = (state: PendingPublicEntryState) => {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures
  }
};

export const getPublicEntryStageFromSearch = (search: string): PublicEntryStage => {
  const params = new URLSearchParams(search);
  return params.get('entry') === 'preview' ? 'preview' : 'hero';
};

export const setPendingPublicEntryIntent = (intent: PublicEntryIntent | null) => {
  const current = readState();
  writeState({
    ...current,
    intent,
    updatedAt: new Date().toISOString(),
  });
};

export const getPendingPublicEntryIntent = (): PublicEntryIntent | null => readState().intent;

export const markPublicEntryAuthOpened = (intent?: PublicEntryIntent | null) => {
  writeState({
    authActive: true,
    intent: intent ?? readState().intent,
    updatedAt: new Date().toISOString(),
  });
};

export const isPublicEntryAuthPending = (): boolean => readState().authActive;

export const clearPublicEntryState = () => {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
};

export const clearPublicEntryAuthPending = () => {
  const current = readState();
  writeState({
    ...current,
    authActive: false,
    updatedAt: new Date().toISOString(),
  });
};
