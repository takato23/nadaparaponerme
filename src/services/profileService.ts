import { supabase } from '../lib/supabase';
import { logger } from '../../utils/logger';

export async function getProfileVisibility(userId: string): Promise<boolean> {
  try {
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

export async function updateProfileVisibility(userId: string, isPublic: boolean): Promise<void> {
  try {
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
