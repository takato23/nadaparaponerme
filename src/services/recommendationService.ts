import type {
  ActiveWardrobeRecommendation,
  RecommendationScoreBreakdown,
  StylistRecommendedItemCandidate,
} from '../../types';
import { supabase } from '../lib/supabase';
import {
  trackStylistRecommendationConfirmed,
  trackStylistRecommendationDismissed,
  trackStylistRecommendationExpired,
  trackStylistRecommendationRejected,
} from './analyticsService';

const ACTIVE_RECOMMENDATION_KEY = 'ojodeloca-active-recommendation';
const BLOCKED_ITEMS_KEY = 'ojodeloca-recommendation-blocks';
const DEFAULT_EXPIRATION_HOURS = 48;

type RecommendationBlockRecord = {
  item_id: string;
  block_until: string;
};

const isBrowser = (): boolean => typeof window !== 'undefined';

function nowIso(): string {
  return new Date().toISOString();
}

function addHours(base: Date, hours: number): string {
  return new Date(base.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function addDays(base: Date, days: number): string {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function parseScoreBreakdown(value: unknown): RecommendationScoreBreakdown {
  const payload = typeof value === 'object' && value ? value as Record<string, unknown> : {};

  const normalize = (input: unknown): number => {
    const parsed = Number(input);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(1, parsed));
  };

  return {
    colorimetry: normalize(payload.colorimetry),
    occasion_style: normalize(payload.occasion_style),
    season_climate: normalize(payload.season_climate),
    usage: normalize(payload.usage),
  };
}

function normalizeRecommendationRow(
  row: any,
  fallbackUserId = 'local-user',
): ActiveWardrobeRecommendation | null {
  if (!row || typeof row !== 'object') return null;

  const itemId = String(row.item_id || '').trim();
  const recommendationId = String(row.id || '').trim();
  const expiresAt = String(row.expires_at || '').trim();
  const status = String(row.status || '').trim();

  if (!itemId || !recommendationId || !expiresAt) return null;
  if (status !== 'active' && status !== 'dismissed' && status !== 'applied' && status !== 'expired') return null;

  return {
    id: recommendationId,
    user_id: String(row.user_id || fallbackUserId),
    item_id: itemId,
    thread_id: row.thread_id ? String(row.thread_id) : null,
    reason: String(row.reason || ''),
    score_total: Number(row.score_total || 0),
    score_breakdown: parseScoreBreakdown(row.score_breakdown),
    status,
    expires_at: expiresAt,
    created_at: String(row.created_at || nowIso()),
    updated_at: String(row.updated_at || nowIso()),
  };
}

function readLocalActiveRecommendation(): ActiveWardrobeRecommendation | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_RECOMMENDATION_KEY);
    if (!raw) return null;
    return normalizeRecommendationRow(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocalActiveRecommendation(value: ActiveWardrobeRecommendation | null): void {
  if (!isBrowser()) return;
  try {
    if (!value) {
      window.localStorage.removeItem(ACTIVE_RECOMMENDATION_KEY);
      return;
    }
    window.localStorage.setItem(ACTIVE_RECOMMENDATION_KEY, JSON.stringify(value));
  } catch {
    // keep best effort
  }
}

function readLocalBlocks(): RecommendationBlockRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(BLOCKED_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const itemId = String((entry as any).item_id || '').trim();
        const blockUntil = String((entry as any).block_until || '').trim();
        if (!itemId || !blockUntil) return null;
        return { item_id: itemId, block_until: blockUntil };
      })
      .filter(Boolean) as RecommendationBlockRecord[];
  } catch {
    return [];
  }
}

function writeLocalBlocks(entries: RecommendationBlockRecord[]): void {
  if (!isBrowser()) return;
  try {
    if (!entries.length) {
      window.localStorage.removeItem(BLOCKED_ITEMS_KEY);
      return;
    }
    window.localStorage.setItem(BLOCKED_ITEMS_KEY, JSON.stringify(entries));
  } catch {
    // keep best effort
  }
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

function isExpired(isoDate: string): boolean {
  const expiresAt = Date.parse(isoDate);
  if (!Number.isFinite(expiresAt)) return true;
  return expiresAt <= Date.now();
}

function buildActiveRecommendation(
  candidate: StylistRecommendedItemCandidate,
  userId: string,
  threadId?: string | null,
): ActiveWardrobeRecommendation {
  const createdAt = nowIso();

  return {
    id: `local_reco_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    item_id: candidate.item_id,
    thread_id: threadId || null,
    reason: candidate.reason,
    score_total: candidate.score_total,
    score_breakdown: parseScoreBreakdown(candidate.score_breakdown),
    status: 'active',
    expires_at: addHours(new Date(), DEFAULT_EXPIRATION_HOURS),
    created_at: createdAt,
    updated_at: createdAt,
  };
}

export async function getActiveRecommendation(): Promise<ActiveWardrobeRecommendation | null> {
  const localRecommendation = readLocalActiveRecommendation();

  if (localRecommendation && isExpired(localRecommendation.expires_at)) {
    writeLocalActiveRecommendation(null);
    trackStylistRecommendationExpired({
      source: 'chat',
      item_id: localRecommendation.item_id,
      thread_id: localRecommendation.thread_id || undefined,
      expires_in_hours: 0,
    });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    const fallback = readLocalActiveRecommendation();
    return fallback && !isExpired(fallback.expires_at) ? fallback : null;
  }

  try {
    const { data, error } = await (supabase.from('stylist_item_recommendations') as any)
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const normalized = normalizeRecommendationRow(data, userId);
    if (!normalized) {
      writeLocalActiveRecommendation(null);
      return null;
    }

    if (isExpired(normalized.expires_at)) {
      await (supabase.from('stylist_item_recommendations') as any)
        .update({ status: 'expired', updated_at: nowIso() })
        .eq('id', normalized.id)
        .eq('user_id', userId);

      trackStylistRecommendationExpired({
        source: 'chat',
        item_id: normalized.item_id,
        thread_id: normalized.thread_id || undefined,
        expires_in_hours: 0,
      });

      writeLocalActiveRecommendation(null);
      return null;
    }

    writeLocalActiveRecommendation(normalized);
    return normalized;
  } catch {
    const fallback = readLocalActiveRecommendation();
    return fallback && !isExpired(fallback.expires_at) ? fallback : null;
  }
}

export async function confirmRecommendation(
  candidate: StylistRecommendedItemCandidate,
  threadId?: string | null,
): Promise<ActiveWardrobeRecommendation> {
  const userId = (await getCurrentUserId()) || 'local-user';
  const localRecord = buildActiveRecommendation(candidate, userId, threadId);

  try {
    if (userId !== 'local-user') {
      await (supabase.from('stylist_item_recommendations') as any)
        .update({ status: 'dismissed', updated_at: nowIso() })
        .eq('user_id', userId)
        .eq('status', 'active');

      const { data, error } = await (supabase.from('stylist_item_recommendations') as any)
        .insert({
          user_id: userId,
          item_id: candidate.item_id,
          thread_id: threadId || null,
          reason: candidate.reason,
          score_total: candidate.score_total,
          score_breakdown: candidate.score_breakdown,
          status: 'active',
          expires_at: addHours(new Date(), DEFAULT_EXPIRATION_HOURS),
        })
        .select('*')
        .single();

      if (error) throw error;

      const normalized = normalizeRecommendationRow(data, userId);
      if (normalized) {
        writeLocalActiveRecommendation(normalized);
        trackStylistRecommendationConfirmed({
          source: 'chat',
          item_id: normalized.item_id,
          thread_id: normalized.thread_id || undefined,
          score_total: normalized.score_total,
          expires_in_hours: DEFAULT_EXPIRATION_HOURS,
        });
        return normalized;
      }
    }
  } catch {
    // fallback to local record below
  }

  writeLocalActiveRecommendation(localRecord);
  trackStylistRecommendationConfirmed({
    source: 'chat',
    item_id: localRecord.item_id,
    thread_id: localRecord.thread_id || undefined,
    score_total: localRecord.score_total,
    expires_in_hours: DEFAULT_EXPIRATION_HOURS,
  });
  return localRecord;
}

export async function dismissRecommendation(recommendationId: string): Promise<void> {
  const userId = await getCurrentUserId();

  if (userId) {
    try {
      await (supabase.from('stylist_item_recommendations') as any)
        .update({ status: 'dismissed', updated_at: nowIso() })
        .eq('id', recommendationId)
        .eq('user_id', userId);
    } catch {
      // fallback handled with local state below
    }
  }

  const localRecommendation = readLocalActiveRecommendation();
  if (localRecommendation && localRecommendation.id === recommendationId) {
    trackStylistRecommendationDismissed({
      source: 'chat',
      item_id: localRecommendation.item_id,
      thread_id: localRecommendation.thread_id || undefined,
      score_total: localRecommendation.score_total,
    });
  }
  writeLocalActiveRecommendation(null);
}

export async function blockItem(itemId: string, days = 30): Promise<void> {
  const blockUntil = addDays(new Date(), Math.max(1, days));
  const userId = await getCurrentUserId();

  if (userId) {
    try {
      await (supabase.from('stylist_recommendation_blocks') as any)
        .upsert({
          user_id: userId,
          item_id: itemId,
          block_until: blockUntil,
        }, { onConflict: 'user_id,item_id' });
    } catch {
      // fallback to local storage below
    }
  }

  const existing = readLocalBlocks().filter((entry) => !isExpired(entry.block_until) && entry.item_id !== itemId);
  existing.push({ item_id: itemId, block_until: blockUntil });
  writeLocalBlocks(existing);

  trackStylistRecommendationRejected({
    source: 'chat',
    item_id: itemId,
  });
}

export async function getBlockedItemIds(): Promise<string[]> {
  const localBlocks = readLocalBlocks().filter((entry) => !isExpired(entry.block_until));
  writeLocalBlocks(localBlocks);

  const userId = await getCurrentUserId();
  if (!userId) {
    return Array.from(new Set(localBlocks.map((entry) => entry.item_id)));
  }

  try {
    const { data, error } = await (supabase.from('stylist_recommendation_blocks') as any)
      .select('item_id, block_until')
      .eq('user_id', userId)
      .gt('block_until', nowIso());

    if (error) throw error;

    const remoteBlocks: RecommendationBlockRecord[] = Array.isArray(data)
      ? data.map((entry: any) => ({
        item_id: String(entry.item_id || ''),
        block_until: String(entry.block_until || ''),
      })).filter((entry) => Boolean(entry.item_id && entry.block_until))
      : [];

    const merged = [...localBlocks, ...remoteBlocks]
      .filter((entry) => !isExpired(entry.block_until));

    writeLocalBlocks(merged);

    return Array.from(new Set(merged.map((entry) => entry.item_id)));
  } catch {
    return Array.from(new Set(localBlocks.map((entry) => entry.item_id)));
  }
}

export const recommendationStorageKeys = {
  ACTIVE_RECOMMENDATION_KEY,
  BLOCKED_ITEMS_KEY,
};
