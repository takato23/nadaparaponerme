import { supabase } from '../lib/supabase';
import { logger } from '../../utils/logger';

const TOKEN_COLUMN_CANDIDATES = [
  'ai_tokens_balance',
  'tokens_balance',
  'ai_tokens',
  'styling_coins',
  'coin_balance',
] as const;

type ProfileRecord = Record<string, unknown>;

const isUuid = (value: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const extractTokenBalance = (profile: ProfileRecord): number | null => {
  for (const key of TOKEN_COLUMN_CANDIDATES) {
    const value = profile[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

type SupabaseErrorLike = {
  code?: unknown;
  message?: string;
  details?: string;
};

const isMissingColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const anyError = error as SupabaseErrorLike;
  const raw = [anyError.code, anyError.message, anyError.details]
    .map((value) => String(value ?? ''))
    .join(' ')
    .toLowerCase();

  return anyError.code === '42703' || /column .* does not exist/.test(raw);
};

export async function getProfileVisibility(userId: string): Promise<boolean> {
  try {
    if (!isUuid(userId)) return false;

    const { data, error } = await supabase
      .from('profiles')
      .select('is_public')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return Boolean(data?.is_public);
  } catch (error) {
    logger.error('Failed to load profile visibility:', error);
    return false;
  }
}

export async function getProfileTokens(userId: string): Promise<number | null> {
  try {
    if (!isUuid(userId)) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (!data) return null;

    return extractTokenBalance(data as ProfileRecord);
  } catch (error) {
    if (!isMissingColumnError(error)) {
      logger.error('Failed to load profile tokens balance:', error);
    }
    return null;
  }
}

export async function updateProfileVisibility(userId: string, isPublic: boolean): Promise<void> {
  try {
    if (!isUuid(userId)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ is_public: isPublic })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    logger.error('Failed to update profile visibility:', error);
    throw error;
  }
}
