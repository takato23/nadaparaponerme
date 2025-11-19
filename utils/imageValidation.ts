/**
 * Image Validation Utility
 *
 * Validates data URIs for images to prevent security vulnerabilities
 * including malicious file types, oversized files, and invalid formats.
 */

/**
 * Allowed MIME types for image uploads
 */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
] as const;

/**
 * Maximum file size in bytes (5MB)
 * This prevents DoS attacks through excessively large uploads
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validation result interface
 */
export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  mimeType?: string;
  sizeBytes?: number;
}

/**
 * Validates a data URI to ensure it's a safe image.
 *
 * Security checks performed:
 * - Valid data URI format
 * - Allowed image MIME type
 * - File size within limits
 * - Base64 encoding validation
 *
 * @param dataUri - The data URI string to validate (e.g., "data:image/png;base64,...")
 * @returns Validation result with error details if invalid
 *
 * @example
 * const result = validateImageDataUri(imageDataUrl);
 * if (!result.isValid) {
 *   console.error('Invalid image:', result.error);
 *   return;
 * }
 */
export function validateImageDataUri(dataUri: string): ImageValidationResult {
  // Check if input is a string
  if (typeof dataUri !== 'string') {
    return {
      isValid: false,
      error: 'La imagen debe ser una cadena de texto válida'
    };
  }

  // Check if it's a data URI
  if (!dataUri.startsWith('data:')) {
    return {
      isValid: false,
      error: 'La imagen debe ser un data URI válido (debe comenzar con "data:")'
    };
  }

  // Parse data URI format: data:[<mime type>][;base64],<data>
  const dataUriMatch = dataUri.match(/^data:([^;]+);base64,(.+)$/);

  if (!dataUriMatch) {
    return {
      isValid: false,
      error: 'Formato de data URI inválido. Debe ser: data:image/type;base64,data'
    };
  }

  const [, mimeType, base64Data] = dataUriMatch;

  // Validate MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType as any)) {
    return {
      isValid: false,
      error: `Tipo de imagen no permitido: ${mimeType}. Tipos permitidos: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      mimeType
    };
  }

  // Validate base64 encoding
  if (!isValidBase64(base64Data)) {
    return {
      isValid: false,
      error: 'Los datos de la imagen no están codificados correctamente en base64',
      mimeType
    };
  }

  // Calculate file size from base64 data
  // Base64 encoding increases size by ~33%, so actual size = (base64.length * 3) / 4
  const sizeBytes = Math.ceil((base64Data.length * 3) / 4);

  // Check file size
  if (sizeBytes > MAX_FILE_SIZE) {
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `La imagen es demasiado grande (${sizeMB}MB). Tamaño máximo permitido: ${maxMB}MB`,
      mimeType,
      sizeBytes
    };
  }

  // All validations passed
  return {
    isValid: true,
    mimeType,
    sizeBytes
  };
}

/**
 * Validates if a string is valid base64 encoding
 *
 * @param str - String to validate
 * @returns True if valid base64, false otherwise
 */
function isValidBase64(str: string): boolean {
  // Check for valid base64 characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

  if (!base64Regex.test(str)) {
    return false;
  }

  // Check if length is valid (must be multiple of 4)
  if (str.length % 4 !== 0) {
    return false;
  }

  // Try to decode to verify it's actually valid base64
  try {
    // In browser environment, use atob
    if (typeof atob !== 'undefined') {
      atob(str.substring(0, Math.min(str.length, 100))); // Test first 100 chars for performance
      return true;
    }

    // In Node environment, use Buffer
    if (typeof Buffer !== 'undefined') {
      Buffer.from(str.substring(0, Math.min(str.length, 100)), 'base64');
      return true;
    }

    return true; // Fallback if neither atob nor Buffer is available
  } catch (error) {
    return false;
  }
}

/**
 * Validates an array of image data URIs
 *
 * @param dataUris - Array of data URI strings to validate
 * @returns Array of validation results, one for each input
 *
 * @example
 * const results = validateMultipleImages([image1, image2, image3]);
 * const allValid = results.every(r => r.isValid);
 */
export function validateMultipleImages(dataUris: string[]): ImageValidationResult[] {
  if (!Array.isArray(dataUris)) {
    return [{
      isValid: false,
      error: 'El input debe ser un array de imágenes'
    }];
  }

  return dataUris.map(uri => validateImageDataUri(uri));
}

/**
 * Extracts metadata from a validated image data URI
 *
 * @param dataUri - Validated data URI string
 * @returns Image metadata including MIME type and size
 */
export function getImageMetadata(dataUri: string): { mimeType: string; sizeBytes: number } | null {
  const result = validateImageDataUri(dataUri);

  if (!result.isValid || !result.mimeType || !result.sizeBytes) {
    return null;
  }

  return {
    mimeType: result.mimeType,
    sizeBytes: result.sizeBytes
  };
}
