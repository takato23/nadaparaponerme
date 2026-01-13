import { supabase } from '../lib/supabase';

export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account');
  if (error) {
    throw error;
  }
  if (!data?.success) {
    throw new Error(data?.error || 'No se pudo eliminar la cuenta');
  }
}
