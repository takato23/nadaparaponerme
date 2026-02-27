import { supabase } from '../lib/supabase';

const MEMORY_CACHE_KEY = 'ojodeloca-stylist-memory-cache';
const PENDING_EVENTS_KEY = 'ojodeloca-stylist-pending-events';

export type StylistMemoryRecord = {
  user_id: string;
  tone_preference?: string | null;
  last_profile_json?: Record<string, any> | null;
  liked_tags?: string[] | null;
  disliked_tags?: string[] | null;
  updated_at?: string;
};

export type StylistEventAction = 'accepted' | 'rejected' | 'generated' | 'saved';

export type StylistEventInput = {
  thread_id?: string | null;
  surface?: 'studio' | 'closet';
  prompt?: string | null;
  suggestion_json?: Record<string, any> | null;
  action: StylistEventAction;
  created_at?: string;
};

type PendingEvent = StylistEventInput & { user_id: string };

function readMemoryCache(): StylistMemoryRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MEMORY_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StylistMemoryRecord;
  } catch {
    return null;
  }
}

function writeMemoryCache(value: StylistMemoryRecord | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!value) {
      localStorage.removeItem(MEMORY_CACHE_KEY);
      return;
    }
    localStorage.setItem(MEMORY_CACHE_KEY, JSON.stringify(value));
  } catch {
    // no-op
  }
}

function readPendingEvents(): PendingEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingEvents(events: PendingEvent[]) {
  if (typeof window === 'undefined') return;
  try {
    if (events.length === 0) {
      localStorage.removeItem(PENDING_EVENTS_KEY);
      return;
    }
    localStorage.setItem(PENDING_EVENTS_KEY, JSON.stringify(events));
  } catch {
    // no-op
  }
}

export async function getStylistMemory(): Promise<StylistMemoryRecord | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return readMemoryCache();

  try {
    const { data, error } = await supabase
      .from('stylist_memory')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const memory = data as StylistMemoryRecord;
      writeMemoryCache(memory);
      return memory;
    }
  } catch {
    // fallback below
  }

  return readMemoryCache();
}

export async function upsertStylistMemory(
  update: Partial<Omit<StylistMemoryRecord, 'user_id' | 'updated_at'>>
): Promise<void> {
  const cached = readMemoryCache();
  const merged = { ...cached, ...update } as StylistMemoryRecord;
  writeMemoryCache(merged);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    await supabase
      .from('stylist_memory')
      .upsert({
        user_id: user.id,
        tone_preference: merged.tone_preference || null,
        last_profile_json: merged.last_profile_json || null,
        liked_tags: merged.liked_tags || [],
        disliked_tags: merged.disliked_tags || [],
      }, { onConflict: 'user_id' });
  } catch {
    // keep local cache only
  }
}

export async function recordStylistEvent(event: StylistEventInput): Promise<void> {
  const payload = {
    thread_id: event.thread_id || null,
    surface: event.surface || 'studio',
    prompt: event.prompt || null,
    suggestion_json: event.suggestion_json || null,
    action: event.action,
    created_at: event.created_at || new Date().toISOString(),
  };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    const { error } = await supabase
      .from('stylist_events')
      .insert({
        user_id: user.id,
        ...payload,
      });
    if (error) throw error;
  } catch {
    const pending = readPendingEvents();
    pending.push({ user_id: user.id, ...payload });
    writePendingEvents(pending.slice(-100));
  }
}

export async function flushPendingStylistEvents(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const pending = readPendingEvents();
  if (pending.length === 0) return;

  const ownEvents = pending.filter((event) => event.user_id === user.id);
  if (ownEvents.length === 0) return;

  try {
    const { error } = await supabase
      .from('stylist_events')
      .insert(ownEvents.map((event) => ({
        user_id: user.id,
        thread_id: event.thread_id || null,
        surface: event.surface || 'studio',
        prompt: event.prompt || null,
        suggestion_json: event.suggestion_json || null,
        action: event.action,
        created_at: event.created_at || new Date().toISOString(),
      })));
    if (error) throw error;

    const remaining = pending.filter((event) => event.user_id !== user.id);
    writePendingEvents(remaining);
  } catch {
    // keep queue
  }
}
