/**
 * Photo Quality Validation Utility
 *
 * Performs basic quality checks on images to help users take better photos
 * for AI analysis. These checks help prevent wasted API credits on poor quality images.
 */

/**
 * Minimum recommended image dimensions
 */
const MIN_WIDTH = 400;
const MIN_HEIGHT = 400;

/**
 * Minimum file size (indicates potential compression issues or blank images)
 */
const MIN_FILE_SIZE = 20 * 1024; // 20KB

/**
 * Quality warning interface
 */
export interface PhotoQualityResult {
  isAcceptable: boolean;
  warnings: string[];
  metadata: {
    width?: number;
    height?: number;
    sizeBytes?: number;
    brightness?: number;
  };
}

/**
 * Analyzes image quality and returns warnings
 *
 * @param dataUrl - Base64 encoded image data URL
 * @returns Promise with quality assessment and warnings
 */
export async function analyzePhotoQuality(dataUrl: string): Promise<PhotoQualityResult> {
  const warnings: string[] = [];
  const metadata: PhotoQualityResult['metadata'] = {};

  try {
    // Calculate file size from base64
    const base64Match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (base64Match) {
      const base64Data = base64Match[2];
      const sizeBytes = Math.ceil((base64Data.length * 3) / 4);
      metadata.sizeBytes = sizeBytes;

      // Check for very small file size
      if (sizeBytes < MIN_FILE_SIZE) {
        warnings.push('La imagen es muy pequeña o de baja calidad');
      }
    }

    // Load image to get dimensions and analyze pixels
    const imageAnalysis = await analyzeImage(dataUrl);

    metadata.width = imageAnalysis.width;
    metadata.height = imageAnalysis.height;
    metadata.brightness = imageAnalysis.brightness;

    // Check minimum dimensions
    if (imageAnalysis.width < MIN_WIDTH || imageAnalysis.height < MIN_HEIGHT) {
      warnings.push(`Resolución muy baja (${imageAnalysis.width}×${imageAnalysis.height}px). Recomendado: mínimo ${MIN_WIDTH}×${MIN_HEIGHT}px`);
    }

    // Check brightness (very dark images)
    if (imageAnalysis.brightness !== undefined && imageAnalysis.brightness < 30) {
      warnings.push('La imagen está muy oscura. Intenta con mejor iluminación');
    }

    // Check if image is too bright (overexposed/flash)
    if (imageAnalysis.brightness !== undefined && imageAnalysis.brightness > 240) {
      warnings.push('La imagen está sobreexpuesta. Evita usar flash directo');
    }

    // Check aspect ratio (extremely elongated images may be problematic)
    const aspectRatio = imageAnalysis.width / imageAnalysis.height;
    if (aspectRatio > 3 || aspectRatio < 0.33) {
      warnings.push('La proporción de la imagen es inusual. Intenta centrar mejor la prenda');
    }

  } catch (error) {
    console.error('Error analyzing photo quality:', error);
    // Don't block the user if analysis fails
    warnings.push('No se pudo analizar la calidad de la imagen');
  }

  // Image is acceptable if there are no critical warnings
  // (we allow images with warnings to proceed, just inform the user)
  const isAcceptable = true;

  return {
    isAcceptable,
    warnings,
    metadata
  };
}

/**
 * Loads image and extracts basic quality metrics
 */
function analyzeImage(dataUrl: string): Promise<{
  width: number;
  height: number;
  brightness?: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // Create canvas to analyze pixels
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({
            width: img.width,
            height: img.height
          });
          return;
        }

        // Use smaller sample size for performance (sample center area)
        const sampleSize = 100;
        canvas.width = sampleSize;
        canvas.height = sampleSize;

        // Draw scaled image to canvas
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        // Get pixel data from center region (25% of image)
        const regionSize = Math.floor(sampleSize * 0.5);
        const regionStart = Math.floor(sampleSize * 0.25);
        const imageData = ctx.getImageData(regionStart, regionStart, regionSize, regionSize);
        const pixels = imageData.data;

        // Calculate average brightness (luminance)
        let totalBrightness = 0;
        const pixelCount = pixels.length / 4;

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          // Use perceived luminance formula
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          totalBrightness += brightness;
        }

        const avgBrightness = totalBrightness / pixelCount;

        resolve({
          width: img.width,
          height: img.height,
          brightness: Math.round(avgBrightness)
        });
      } catch (error) {
        // If canvas analysis fails, still return dimensions
        resolve({
          width: img.width,
          height: img.height
        });
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = dataUrl;
  });
}

/**
 * Quick validation (dimensions only, no pixel analysis)
 * Useful for fast checks without the overhead of canvas operations
 */
export async function quickPhotoCheck(dataUrl: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const img = new Image();

    return new Promise((resolve) => {
      img.onload = () => {
        if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
          resolve({
            valid: false,
            error: `Imagen muy pequeña (${img.width}×${img.height}px)`
          });
        } else {
          resolve({ valid: true });
        }
      };

      img.onerror = () => {
        resolve({
          valid: false,
          error: 'Error al cargar la imagen'
        });
      };

      img.src = dataUrl;
    });
  } catch (error) {
    return {
      valid: false,
      error: 'Error al validar la imagen'
    };
  }
}

/**
 * Get user-friendly tips based on warnings
 */
export function getTipsForWarnings(warnings: string[]): string[] {
  const tips: string[] = [];

  if (warnings.some(w => w.includes('oscura'))) {
    tips.push('Acércate a una ventana con luz natural');
  }

  if (warnings.some(w => w.includes('sobreexpuesta') || w.includes('flash'))) {
    tips.push('Desactiva el flash y usa luz indirecta');
  }

  if (warnings.some(w => w.includes('resolución') || w.includes('pequeña'))) {
    tips.push('Acércate más a la prenda o usa la cámara trasera');
  }

  if (warnings.some(w => w.includes('proporción'))) {
    tips.push('Asegúrate de capturar la prenda completa y centrada');
  }

  return tips;
}
