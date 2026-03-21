import type { InferredLook, InferredLookContext, LookAnalysisResult, LookUploadSession, SavedLookContext } from '../../types';

const STORAGE_KEY = 'ojodeloca-inferred-look-sessions';
const MAX_STORED_SESSIONS = 8;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readSessions(): LookUploadSession[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as LookUploadSession[] : [];
  } catch {
    return [];
  }
}

function writeSessions(sessions: LookUploadSession[]): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_STORED_SESSIONS)));
  } catch {
    // Ignore storage failures.
  }
}

export function getLookUploadSessions(): LookUploadSession[] {
  return readSessions();
}

export function getLatestLookUploadSession(): LookUploadSession | null {
  return readSessions()[0] || null;
}

export function saveLookUploadSession(session: LookUploadSession): LookUploadSession {
  const existing = readSessions().filter((entry) => entry.id !== session.id);
  const nextSessions = [session, ...existing];
  writeSessions(nextSessions);
  return session;
}

export function createLookUploadSession(input: {
  source: LookUploadSession['source'];
  imageDataUrls: string[];
  analysis: LookAnalysisResult;
}): LookUploadSession {
  const now = new Date().toISOString();
  const sessionId = crypto.randomUUID();

  const looks: InferredLook[] = input.imageDataUrls.map((imageDataUrl, index) => {
    const analyzed = input.analysis.looks[index];
    return {
      id: crypto.randomUUID(),
      session_id: sessionId,
      name: `Look ${index + 1}`,
      image_data_url: imageDataUrl,
      summary: analyzed?.summary || 'Look subido para reinterpretar con Kumbi.',
      occasion: analyzed?.occasion || null,
      style_tags: analyzed?.style_tags || [],
      palette: analyzed?.palette || [],
      dominant_pieces: analyzed?.dominant_pieces || [],
      confidence: analyzed?.confidence || 0.6,
      created_at: now,
    };
  });

  const session: LookUploadSession = {
    id: sessionId,
    source: input.source,
    status: 'analyzed',
    looks,
    cross_suggestions: input.analysis.cross_suggestions || [],
    adaptation_tip: input.analysis.adaptation_tip || null,
    created_at: now,
    updated_at: now,
  };

  return saveLookUploadSession(session);
}

export function buildSavedLookContextFromInferredLook(look: InferredLook): SavedLookContext {
  return {
    id: look.id,
    name: look.name || 'Look detectado',
    occasion: look.occasion || null,
    reference_summary: look.summary,
    tags: look.style_tags,
  };
}

export function buildInferredLookContext(look: InferredLook): InferredLookContext {
  return {
    id: look.id,
    session_id: look.session_id,
    name: look.name,
    summary: look.summary,
    image_data_url: look.image_data_url,
    occasion: look.occasion || null,
    style_tags: look.style_tags,
    palette: look.palette,
    dominant_pieces: look.dominant_pieces,
    confidence: look.confidence,
  };
}
