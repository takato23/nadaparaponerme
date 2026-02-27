import { removeBackground, Config } from '@imgly/background-removal';

const config: Config = {
    // Use a smaller model for faster client-side inference
    model: 'isnet_fp16',
    output: {
        format: 'image/webp',
        quality: 0.9,
    },
};

/**
 * Removes the background from an image URL or base64 Data URI.
 * Uses WasM client-side processing to ensure zero-cost infrastructure.
 * 
 * @param imageUrl The source image URL or Data URI
 * @returns A Promise that resolves to a Data URI of the image with a transparent background
 */
export async function removeImageBackground(imageUrl: string): Promise<string> {
    try {
        const imageBlob = await removeBackground(imageUrl, config);

        // Convert Blob to Base64 Data URI
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert blob to base64'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(imageBlob);
        });
    } catch (error) {
        console.error('Error removing background:', error);
        throw new Error('No se pudo remover el fondo de la imagen.');
    }
}
