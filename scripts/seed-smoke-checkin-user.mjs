import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const smokeEmail = process.argv[2] || process.env.SMOKE_CHECKIN_EMAIL || 'smoke.checkin.demo@ojodeloca.dev';
const smokePassword = process.argv[3] || process.env.SMOKE_CHECKIN_PASSWORD || 'Smoke12345!';
const smokeUsername = 'smoke_checkin_demo';

if (!supabaseUrl || !anonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local');
}

const client = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function toIsoDate(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}

async function getOrCreateSmokeUser() {
  const signInResult = await client.auth.signInWithPassword({
    email: smokeEmail,
    password: smokePassword,
  });

  if (!signInResult.error && signInResult.data.user) {
    return signInResult.data.user;
  }

  const signUpResult = await client.auth.signUp({
    email: smokeEmail,
    password: smokePassword,
    options: {
      data: {
        username: smokeUsername,
        display_name: 'Smoke Checkin Demo',
        full_name: 'Smoke Checkin Demo',
      },
    },
  });
  if (signUpResult.error) throw signUpResult.error;

  const retrySignIn = await client.auth.signInWithPassword({
    email: smokeEmail,
    password: smokePassword,
  });
  if (retrySignIn.error || !retrySignIn.data.user) {
    throw retrySignIn.error || new Error('No pude abrir sesión con el usuario smoke.');
  }

  return retrySignIn.data.user;
}

async function seed() {
  const user = await getOrCreateSmokeUser();
  const userId = user.id;

  await client.from('outfit_wear_feedback').delete().eq('user_id', userId);
  await client.from('outfit_schedule').delete().eq('user_id', userId);
  await client.from('outfits').delete().eq('user_id', userId);
  await client.from('clothing_items').delete().eq('user_id', userId);

  const { data: items, error: itemsError } = await client.from('clothing_items').insert([
    {
      user_id: userId,
      name: 'Smoke Remera Blanca',
      category: 'top',
      subcategory: 'Remera',
      color_primary: '#FFFFFF',
      image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop',
      thumbnail_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop',
      ai_metadata: { vibe_tags: ['Casual'], seasons: ['Todo el año'] },
      status: 'owned',
      link_mode: 'copy',
      source_ref: { originType: 'smoke_seed' },
    },
    {
      user_id: userId,
      name: 'Smoke Jeans Rectos',
      category: 'bottom',
      subcategory: 'Jeans',
      color_primary: '#4A6FA5',
      image_url: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=600&h=600&fit=crop',
      thumbnail_url: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=300&h=300&fit=crop',
      ai_metadata: { vibe_tags: ['Casual'], seasons: ['Todo el año'] },
      status: 'owned',
      link_mode: 'copy',
      source_ref: { originType: 'smoke_seed' },
    },
    {
      user_id: userId,
      name: 'Smoke Zapatillas Neutras',
      category: 'shoes',
      subcategory: 'Zapatillas',
      color_primary: '#1C1C1C',
      image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop',
      thumbnail_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop',
      ai_metadata: { vibe_tags: ['Casual'], seasons: ['Todo el año'] },
      status: 'owned',
      link_mode: 'copy',
      source_ref: { originType: 'smoke_seed' },
    },
  ]).select('id');
  if (itemsError) throw itemsError;

  const itemIds = (items || []).map((item) => item.id);

  const { data: outfit, error: outfitError } = await client.from('outfits').insert({
    user_id: userId,
    name: 'Smoke Look Diario',
    description: 'Look seed para validar planner y diario de uso.',
    clothing_item_ids: itemIds,
    source: 'manual',
    ai_generated: false,
    ai_reasoning: 'Look seed para smoke test del planner.',
  }).select('id').single();
  if (outfitError) throw outfitError;

  const yesterday = toIsoDate(-1);
  const today = toIsoDate(0);
  const tomorrow = toIsoDate(1);

  const { error: scheduleError } = await client.from('outfit_schedule').insert([
    { user_id: userId, date: yesterday, outfit_id: outfit.id },
    { user_id: userId, date: today, outfit_id: outfit.id },
    { user_id: userId, date: tomorrow, outfit_id: outfit.id },
  ]);
  if (scheduleError) throw scheduleError;

  const { error: feedbackError } = await client.from('outfit_wear_feedback').insert({
    user_id: userId,
    date: yesterday,
    outfit_id: outfit.id,
    status: 'worn',
    confidence_positive: true,
    comfort_positive: true,
    source_surface: 'planner',
  });
  if (feedbackError) throw feedbackError;

  console.log(JSON.stringify({
    email: smokeEmail,
    password: smokePassword,
    userId,
    outfitId: outfit.id,
    seededDates: { yesterday, today, tomorrow },
  }, null, 2));
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
