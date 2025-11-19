/**
 * Regenerate signed URLs for existing clothing images
 *
 * Run this ONCE after deploying the signed URL fix to update all existing items
 */

import { supabase } from '../lib/supabase';

export async function regenerateAllImageUrls() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get all items
    const { data: items, error: fetchError } = await supabase
      .from('clothing_items')
      .select('id, image_url, thumbnail_url')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (fetchError) throw fetchError;

    console.log(`🔄 Regenerating URLs for ${items.length} items...`);

    for (const item of items) {
      // Extract path from old URL
      const imagePath = item.image_url.split('/clothing-images/')[1];
      const thumbnailPath = item.thumbnail_url.split('/clothing-images/')[1];

      // Generate new signed URLs (1 year expiration)
      const [imageUrlData, thumbnailUrlData] = await Promise.all([
        supabase.storage.from('clothing-images').createSignedUrl(imagePath, 31536000),
        supabase.storage.from('clothing-images').createSignedUrl(thumbnailPath, 31536000),
      ]);

      if (imageUrlData.error) {
        console.error(`❌ Failed to regenerate URL for item ${item.id}:`, imageUrlData.error);
        continue;
      }

      // Update database
      const { error: updateError } = await supabase
        .from('clothing_items')
        .update({
          image_url: imageUrlData.data.signedUrl,
          thumbnail_url: thumbnailUrlData.data?.signedUrl || item.thumbnail_url,
        })
        .eq('id', item.id);

      if (updateError) {
        console.error(`❌ Failed to update item ${item.id}:`, updateError);
      } else {
        console.log(`✅ Updated item ${item.id}`);
      }
    }

    console.log('🎉 URL regeneration complete!');
    return { success: true, count: items.length };
  } catch (error) {
    console.error('Failed to regenerate URLs:', error);
    throw error;
  }
}
