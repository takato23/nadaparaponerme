/**
 * Image Compression Utilities
 *
 * Intelligent image compression for faster AI analysis and reduced bandwidth.
 * Optimized for clothing images with quality preservation.
 */

export interface CompressionResult {
  compressedDataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: { width: number; height: number };
  processingTime: number;
}

export interface CompressionOptions {
  maxWidth?: number;      // Default: 1200px (optimal for Gemini Vision)
  maxHeight?: number;     // Default: 1200px
  quality?: number;       // Default: 0.85 (85% quality, good balance)
  format?: 'jpeg' | 'webp'; // Default: 'jpeg' (better compatibility)
  maintainAspectRatio?: boolean; // Default: true
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.85,
  format: 'jpeg',
  maintainAspectRatio: true,
};

/**
 * Compress a data URL image
 *
 * @param dataUrl - Base64 data URL of the image
 * @param options - Compression options
 * @returns Compression result with metrics
 */
export async function compressDataUrl(
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const startTime = performance.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img;
        const originalWidth = width;
        const originalHeight = height;

        if (opts.maintainAspectRatio) {
          // Maintain aspect ratio while fitting within max dimensions
          if (width > opts.maxWidth || height > opts.maxHeight) {
            const widthRatio = opts.maxWidth / width;
            const heightRatio = opts.maxHeight / height;
            const ratio = Math.min(widthRatio, heightRatio);

            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }
        } else {
          width = Math.min(width, opts.maxWidth);
          height = Math.min(height, opts.maxHeight);
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Get compressed data URL
        const mimeType = opts.format === 'webp' ? 'image/webp' : 'image/jpeg';
        const compressedDataUrl = canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
              const compressedDataUrl = reader.result as string;
              const processingTime = performance.now() - startTime;

              // Calculate sizes and metrics
              const originalSize = Math.ceil((dataUrl.length * 3) / 4); // Approximate base64 size
              const compressedSize = Math.ceil((compressedDataUrl.length * 3) / 4);
              const compressionRatio = originalSize > 0
                ? Math.round((1 - compressedSize / originalSize) * 100)
                : 0;

              resolve({
                compressedDataUrl,
                originalSize,
                compressedSize,
                compressionRatio,
                dimensions: { width, height },
                processingTime: Math.round(processingTime),
              });
            };
            reader.onerror = () => reject(new Error('Failed to read compressed blob'));
            reader.readAsDataURL(blob);
          },
          mimeType,
          opts.quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Compress multiple data URLs in parallel
 *
 * @param dataUrls - Array of base64 data URLs
 * @param options - Compression options
 * @returns Array of compression results
 */
export async function compressMultipleDataUrls(
  dataUrls: string[],
  options: CompressionOptions = {}
): Promise<CompressionResult[]> {
  return Promise.all(
    dataUrls.map(dataUrl => compressDataUrl(dataUrl, options))
  );
}

/**
 * Get optimal compression settings based on image size
 *
 * @param dataUrl - Base64 data URL
 * @returns Recommended compression options
 */
export function getOptimalCompressionOptions(dataUrl: string): CompressionOptions {
  const sizeInBytes = Math.ceil((dataUrl.length * 3) / 4);
  const sizeInMB = sizeInBytes / (1024 * 1024);

  // Small images (<1MB): Minimal compression
  if (sizeInMB < 1) {
    return {
      maxWidth: 1920,
      quality: 0.95,
    };
  }

  // Medium images (1-3MB): Balanced compression
  if (sizeInMB < 3) {
    return {
      maxWidth: 1200,
      quality: 0.85,
    };
  }

  // Large images (3-5MB): Aggressive compression
  if (sizeInMB < 5) {
    return {
      maxWidth: 1200,
      quality: 0.75,
    };
  }

  // Very large images (>5MB): Maximum compression
  return {
    maxWidth: 1000,
    quality: 0.70,
  };
}

/**
 * Format file size for display
 *
 * @param bytes - Size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Validate image data URL
 *
 * @param dataUrl - Base64 data URL
 * @returns Whether the data URL is valid
 */
export function isValidImageDataUrl(dataUrl: string): boolean {
  return /^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(dataUrl);
}

/**
 * Extract image format from data URL
 *
 * @param dataUrl - Base64 data URL
 * @returns Image format or null
 */
export function getImageFormat(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:image\/([^;]+);base64,/);
  return match ? match[1] : null;
}
