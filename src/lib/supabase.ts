import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseUrl = String(rawSupabaseUrl || '').trim().replace(/\/+$/, '');
const supabaseAnonKey = String(rawSupabaseAnonKey || '').trim();
const placeholderSupabaseUrl = 'https://placeholder.supabase.co';
const placeholderSupabaseAnonKey = 'placeholder-anon-key';
export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

// Debug: Log environment variables (in development only)
if (import.meta.env.DEV) {
  console.log('🔍 Supabase Environment Check:');
  console.log('  URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('  Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  if (String(rawSupabaseAnonKey || '') !== supabaseAnonKey) {
    console.warn('⚠️ VITE_SUPABASE_ANON_KEY had surrounding whitespace; sanitized at runtime.');
  }
}

if (!hasSupabaseEnv) {
  console.warn(
    'Missing Supabase environment variables. Falling back to a disabled Supabase client; backend-powered features will stay off until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.'
  );
}

// TEMP: use broad client typing until DB schema types are fully regenerated.
// Current custom schema file drifts from the live DB and breaks builds with `never`.
export const supabase: any = createClient<any>(
  hasSupabaseEnv ? supabaseUrl : placeholderSupabaseUrl,
  hasSupabaseEnv ? supabaseAnonKey : placeholderSupabaseAnonKey,
  {
  auth: {
    persistSession: hasSupabaseEnv,
    autoRefreshToken: hasSupabaseEnv,
    detectSessionInUrl: true,
  },
});

// Handle auth errors globally
if (hasSupabaseEnv) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log('✅ Auth token refreshed successfully');
    } else if (event === 'SIGNED_OUT') {
      console.log('👋 User signed out');
    }
  });
}

// NOTE: auth session bootstrap runs in hooks/useAuth singleton.
// Keeping it centralized prevents parallel getSession/getUser lock contention.

// Helper functions for common operations

/**
 * Upload image to storage bucket
 */
export async function uploadImage(
  bucket: 'clothing-images' | 'avatars' | 'outfit-shares',
  path: string,
  file: File
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw error;

  // Get public URL (works for all public buckets)
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Delete image from storage bucket
 */
export async function deleteImage(
  bucket: 'clothing-images' | 'avatars' | 'outfit-shares',
  path: string
) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
}

/**
 * Convert base64 data URL to File object
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) throw new Error('Invalid data URL');

  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}

/**
 * Check if browser supports WebP format
 */
function supportsWebP(): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const result = canvas.toDataURL('image/webp');
    return typeof result === 'string' && result.indexOf('data:image/webp') === 0;
  } catch {
    return false;
  }
}

// Cache WebP support check
const webpSupported = typeof document !== 'undefined' ? supportsWebP() : false;

/**
 * Compress image before upload
 * Uses WebP format when available (30% smaller files), falls back to JPEG
 */
export async function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if needed
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Use WebP if supported (30% smaller files), otherwise JPEG
        const format = webpSupported ? 'image/webp' : 'image/jpeg';
        const extension = webpSupported ? '.webp' : '.jpg';
        const filename = file.name.replace(/\.[^.]+$/, extension);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            const compressedFile = new File([blob], filename, {
              type: format,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          format,
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

/**
 * Create thumbnail from image
 */
export async function createThumbnail(file: File, maxSize = 300): Promise<File> {
  return compressImage(file, maxSize, 0.75);
}
