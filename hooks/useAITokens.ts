import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getProfileTokens } from '../src/services/profileService';
import { supabase } from '../src/lib/supabase';

const TOKENS_FALLBACK_COLUMNS = [
  'ai_tokens_balance',
  'tokens_balance',
  'ai_tokens',
  'styling_coins',
  'coin_balance',
] as const;

type ProfileRecord = Record<string, unknown>;

type BalanceColumn = (typeof TOKENS_FALLBACK_COLUMNS)[number];

const findTokenColumn = (profile: ProfileRecord): BalanceColumn | null => {
  for (const column of TOKENS_FALLBACK_COLUMNS) {
    const value = profile[column];
    if (typeof value === 'number' || typeof value === 'string') {
      return column;
    }
  }

  return null;
};

export function useAITokens() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBalance = useCallback(async () => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const tokens = await getProfileTokens(user.id);
    setBalance(tokens);
    setLoading(false);
  }, [user]);

  const deductTokens = useCallback(async (amount: number): Promise<boolean> => {
    if (!user || balance === null || balance < amount) return false;

    try {
      // Optimistic update
      setBalance(prev => (prev !== null ? prev - amount : null));

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        await refreshBalance();
        return false;
      }

      const tokenColumn = data ? findTokenColumn(data as ProfileRecord) : null;
      if (!tokenColumn) {
        await refreshBalance();
        return true;
      }

      const currentValue = Number(data[tokenColumn]);
      if (!Number.isFinite(currentValue)) {
        await refreshBalance();
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ [tokenColumn]: currentValue - amount })
        .eq('id', user.id);

      if (error) {
        // Revert on failure
        await refreshBalance();
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error deducting tokens:', e);
      await refreshBalance();
      return false;
    }
  }, [user, balance, refreshBalance]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  return { balance, loading, refreshBalance, deductTokens };
}
