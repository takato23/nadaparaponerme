import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/api';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

// Create Supabase client with TypeScript types
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-application-name': 'no-tengo-nada-para-ponerme',
    },
  },
});

// Handle auth errors globally
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('✅ Auth token refreshed successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('👋 User signed out');
  }
});

// Clear invalid auth state on initialization
(async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      // Silently clear auth state if refresh token is invalid (expected behavior)
      if (error.message.includes('Refresh Token') || error.status === 400) {
        await supabase.auth.signOut();
        // Clear all auth-related localStorage items
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
      } else {
        console.warn('⚠️ Auth session error:', error.message);
      }
    }
  } catch (err) {
    // Suppress initialization errors - auth state will be fresh
  }
})();

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
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
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
