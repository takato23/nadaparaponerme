/**
 * Generate placeholder image as base64 data URL
 * Replaces external services like via.placeholder.com
 */

export function generatePlaceholder(
  width: number = 300,
  height: number = 300,
  text: string = 'No Image',
  bgColor: string = '#e5e7eb',
  textColor: string = '#9ca3af'
): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="18"
        font-weight="500"
        fill="${textColor}"
      >${text}</text>
    </svg>
  `;

  // Convert SVG to base64 data URL
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Predefined placeholders
 */
export const PLACEHOLDERS = {
  noImage: generatePlaceholder(300, 300, 'Sin Imagen', '#e5e7eb', '#9ca3af'),
  error: generatePlaceholder(300, 300, 'Error al Cargar', '#fee2e2', '#ef4444'),
  loading: generatePlaceholder(300, 300, 'Cargando...', '#dbeafe', '#60a5fa'),
} as const;

/**
 * Check if URL is a broken external placeholder that should be replaced
 */
export function isBrokenPlaceholder(imageUrl: string | undefined | null): boolean {
  if (!imageUrl) return false;

  // Check for known broken placeholder services
  return imageUrl.includes('via.placeholder.com') ||
         imageUrl.includes('placeholder.it') ||
         imageUrl.includes('placeholdit.imgix.net') ||
         imageUrl.includes('placehold.it');
}

/**
 * Check if image is a real image (not a placeholder)
 */
export function isRealImage(imageDataUrl: string | undefined | null): boolean {
  if (!imageDataUrl) return false;

  // Reject placeholder URLs (via.placeholder.com, etc.)
  if (imageDataUrl.includes('placeholder.com')) return false;
  if (imageDataUrl.includes('placeholdit.imgix.net')) return false;

  // Check if it's an HTTP/HTTPS URL (external image)
  if (imageDataUrl.startsWith('http://') || imageDataUrl.startsWith('https://')) {
    // Valid external image URL (like Supabase Storage, Google Storage, etc.)
    return true;
  }

  // Check if it's a valid data URL
  if (!imageDataUrl.startsWith('data:image')) return false;

  // Reject SVG placeholders
  if (imageDataUrl.startsWith('data:image/svg+xml')) return false;

  // Reject URLs with text parameter (common in placeholder services)
  if (imageDataUrl.includes('text=')) return false;

  // Must be a real image format (jpeg, png, webp, etc.)
  return imageDataUrl.startsWith('data:image/jpeg') ||
         imageDataUrl.startsWith('data:image/png') ||
         imageDataUrl.startsWith('data:image/webp') ||
         imageDataUrl.startsWith('data:image/gif');
}

/**
 * Get the best available image URL from a clothing item
 * Handles the transition from localStorage (base64) to Supabase (URLs)
 *
 * Priority:
 * 1. image_url (Supabase Storage URL) - new format
 * 2. imageDataUrl (base64) - legacy format
 * 3. Fallback to placeholder
 */
export function getImageUrl(item: {
  image_url?: string | null;
  imageDataUrl?: string | null;
  thumbnail_url?: string | null;
}, preferThumbnail: boolean = false): string {
  // Try thumbnail first if preferred (for grid views)
  if (preferThumbnail && item.thumbnail_url && !isBrokenPlaceholder(item.thumbnail_url)) {
    return item.thumbnail_url;
  }

  // Try Supabase URL first (new format)
  if (item.image_url && !isBrokenPlaceholder(item.image_url)) {
    return item.image_url;
  }

  // Fallback to base64 (legacy format)
  if (item.imageDataUrl && isRealImage(item.imageDataUrl)) {
    return item.imageDataUrl;
  }

  // Return placeholder
  return PLACEHOLDERS.noImage;
}
