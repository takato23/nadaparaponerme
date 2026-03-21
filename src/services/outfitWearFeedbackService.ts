import type {
  OutfitWearFeedback,
  OutfitWearFeedbackSource,
  OutfitWearSkipReason,
  OutfitWearStatus,
  SavedOutfit,
  ScheduledOutfitWithDetails,
  WeeklyWearInsights,
} from '../../types';
import { supabase } from '../lib/supabase';
import { recordStylistEvent } from './stylistMemoryService';

type OutfitWearFeedbackRow = {
  id: string;
  user_id: string;
  date: string;
  outfit_id: string;
  status: OutfitWearStatus;
  confidence_positive: boolean | null;
  comfort_positive: boolean | null;
  skip_reason: OutfitWearSkipReason | null;
  source_surface: OutfitWearFeedbackSource;
  created_at: string;
  updated_at: string;
};

type OutfitWearFeedbackInsert = {
  user_id: string;
  date: string;
  outfit_id: string;
  status: OutfitWearStatus;
  confidence_positive?: boolean | null;
  comfort_positive?: boolean | null;
  skip_reason?: OutfitWearSkipReason | null;
  source_surface: OutfitWearFeedbackSource;
};

type ScheduleSummaryRow = {
  date: string;
  outfit_id: string;
};

type WeeklyPromptEntry = {
  date: string;
  outfit: SavedOutfit;
  feedback: OutfitWearFeedback | null;
};

const DAYS_IN_WEEK = 7;

function toIsoDate(value: Date): string {
  return value.toISOString().split('T')[0];
}

function getWeekRange(startDate: string) {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + (DAYS_IN_WEEK - 1));

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
}

function isMissingTableError(error: any): boolean {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || '').toLowerCase();
  return code === 'PGRST205' || code === '42P01' || message.includes('outfit_wear_feedback');
}

function normalizeFeedbackRow(row: OutfitWearFeedbackRow): OutfitWearFeedback {
  return {
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    outfit_id: row.outfit_id,
    status: row.status,
    confidence_positive: row.confidence_positive,
    comfort_positive: row.comfort_positive,
    skip_reason: row.skip_reason,
    source_surface: row.source_surface,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

function scoreFeedback(feedback: OutfitWearFeedback | null | undefined): number {
  if (!feedback || feedback.status !== 'worn') return -1;
  return 1 + (feedback.confidence_positive ? 1 : 0) + (feedback.comfort_positive ? 1 : 0);
}

function getOutfitSummary(outfit: SavedOutfit): string {
  const base = outfit.name || outfit.explanation || outfit.description || 'Look guardado';
  return String(base).trim().slice(0, 120);
}

export function buildOutfitWearFeedbackKey(date: string, outfitId: string): string {
  return `${date}::${outfitId}`;
}

export function buildFeedbackLookup(feedbackEntries: OutfitWearFeedback[]): Record<string, OutfitWearFeedback> {
  return feedbackEntries.reduce<Record<string, OutfitWearFeedback>>((acc, entry) => {
    acc[buildOutfitWearFeedbackKey(entry.date, entry.outfit_id)] = entry;
    return acc;
  }, {});
}

export function computeWeeklyWearInsights(
  scheduleEntries: Array<Pick<ScheduledOutfitWithDetails, 'date' | 'outfit_id'>>,
  feedbackEntries: OutfitWearFeedback[],
  startDate: string,
): WeeklyWearInsights {
  const { startDate: normalizedStart, endDate } = getWeekRange(startDate);
  const feedbackLookup = buildFeedbackLookup(feedbackEntries);

  let wornCount = 0;
  let notWornCount = 0;
  let strongestOutfitId: string | null = null;
  let strongestScore = -1;

  for (const scheduleEntry of scheduleEntries) {
    const feedback = feedbackLookup[buildOutfitWearFeedbackKey(scheduleEntry.date, scheduleEntry.outfit_id)];
    const score = scoreFeedback(feedback);

    if (feedback?.status === 'worn') wornCount += 1;
    if (feedback?.status === 'not_worn') notWornCount += 1;

    if (score > strongestScore) {
      strongestScore = score;
      strongestOutfitId = score >= 0 ? scheduleEntry.outfit_id : strongestOutfitId;
    }
  }

  const plannedCount = scheduleEntries.length;
  const feedbackCount = wornCount + notWornCount;

  return {
    start_date: normalizedStart,
    end_date: endDate,
    planned_count: plannedCount,
    feedback_count: feedbackCount,
    worn_count: wornCount,
    not_worn_count: notWornCount,
    pending_count: Math.max(0, plannedCount - feedbackCount),
    strongest_outfit_id: strongestOutfitId,
    strongest_score: strongestScore >= 0 ? strongestScore : undefined,
  };
}

export function buildWeeklyFeedbackStylistPrompt(entries: WeeklyPromptEntry[]): string | null {
  const positiveEntries = entries.filter((entry) => (
    entry.feedback?.status === 'worn'
    && entry.feedback.confidence_positive === true
    && entry.feedback.comfort_positive === true
  ));

  if (positiveEntries.length === 0) return null;

  const lines = positiveEntries
    .slice(0, 3)
    .map((entry) => `- ${entry.date}: ${getOutfitSummary(entry.outfit)}`)
    .join('\n');

  return [
    'Armame más looks como los que marqué usados, cómodos y que me quedaron bien esta semana.',
    'Quiero repetir la lógica del look, no copiarlo literal.',
    'Referencias fuertes:',
    lines,
  ].join('\n');
}

export async function getFeedbackForDate(date: string, outfitId?: string): Promise<OutfitWearFeedback | null> {
  const userId = await getCurrentUserId();

  try {
    let query = supabase
      .from('outfit_wear_feedback')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);

    if (outfitId) {
      query = query.eq('outfit_id', outfitId);
    }

    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? normalizeFeedbackRow(data as OutfitWearFeedbackRow) : null;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

export async function getFeedbackForWeek(startDate: string): Promise<OutfitWearFeedback[]> {
  const userId = await getCurrentUserId();
  const { startDate: normalizedStart, endDate } = getWeekRange(startDate);

  try {
    const { data, error } = await supabase
      .from('outfit_wear_feedback')
      .select('*')
      .eq('user_id', userId)
      .gte('date', normalizedStart)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return (data || []).map((row: OutfitWearFeedbackRow) => normalizeFeedbackRow(row));
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function upsertWearFeedback(input: {
  date: string;
  outfit_id: string;
  status: OutfitWearStatus;
  confidence_positive?: boolean | null;
  comfort_positive?: boolean | null;
  skip_reason?: OutfitWearSkipReason | null;
  source_surface: OutfitWearFeedbackSource;
}): Promise<OutfitWearFeedback> {
  const userId = await getCurrentUserId();

  const payload: OutfitWearFeedbackInsert = {
    user_id: userId,
    date: input.date,
    outfit_id: input.outfit_id,
    status: input.status,
    confidence_positive: input.status === 'worn' ? input.confidence_positive ?? null : null,
    comfort_positive: input.status === 'worn' ? input.comfort_positive ?? null : null,
    skip_reason: input.status === 'not_worn' ? input.skip_reason ?? null : null,
    source_surface: input.source_surface,
  };

  const { data, error } = await supabase
    .from('outfit_wear_feedback')
    .upsert(payload, { onConflict: 'user_id,date,outfit_id' })
    .select('*')
    .single();

  if (error) throw error;

  const normalized = normalizeFeedbackRow(data as OutfitWearFeedbackRow);

  try {
    await recordStylistEvent({
      surface: input.source_surface === 'home' ? 'home' : 'planner',
      action: input.status === 'worn' ? 'wore' : 'did_not_wear',
      suggestion_json: {
        outfit_id: input.outfit_id,
        date: input.date,
        status: input.status,
        confidence_positive: normalized.confidence_positive ?? null,
        comfort_positive: normalized.comfort_positive ?? null,
        skip_reason: normalized.skip_reason ?? null,
        source_surface: input.source_surface,
      },
    });
  } catch {
    // keep feedback persistence as the primary action
  }

  return normalized;
}

export async function getWeeklyWearInsights(startDate: string): Promise<WeeklyWearInsights> {
  const userId = await getCurrentUserId();
  const { startDate: normalizedStart, endDate } = getWeekRange(startDate);

  const [{ data: scheduleData, error: scheduleError }, feedbackEntries] = await Promise.all([
    supabase
      .from('outfit_schedule')
      .select('date, outfit_id')
      .eq('user_id', userId)
      .gte('date', normalizedStart)
      .lte('date', endDate)
      .order('date', { ascending: true }),
    getFeedbackForWeek(normalizedStart),
  ]);

  if (scheduleError) throw scheduleError;

  return computeWeeklyWearInsights(
    (scheduleData || []) as ScheduleSummaryRow[],
    feedbackEntries,
    normalizedStart,
  );
}
