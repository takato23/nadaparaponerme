import { ClothingItemMetadata } from '../../types';

interface GenerationTemplate {
    name: string;
    category: string;
    subcategory: string;
    color: string;
    vibe_tags: string[];
    seasons: string[];
    imageUrl: string; // External image URL (stock photos)
}

// Templates with stock clothing images from Unsplash (royalty-free)
const WARDROBE_TEMPLATES: GenerationTemplate[] = [
    {
        name: 'Camiseta Blanca Básica',
        category: 'top',
        subcategory: 'T-Shirt',
        color: '#FFFFFF',
        vibe_tags: ['casual', 'basic', 'minimalist'],
        seasons: ['spring', 'summer', 'autumn', 'winter'],
        imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop'
    },
    {
        name: 'Jeans Clásicos',
        category: 'bottom',
        subcategory: 'Jeans',
        color: '#2B3E50',
        vibe_tags: ['casual', 'versatile', 'classic'],
        seasons: ['spring', 'autumn', 'winter'],
        imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=500&fit=crop'
    },
    {
        name: 'Vestido Negro',
        category: 'one-piece',
        subcategory: 'Dress',
        color: '#000000',
        vibe_tags: ['formal', 'elegant', 'night'],
        seasons: ['spring', 'summer'],
        imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=500&fit=crop'
    },
    {
        name: 'Zapatillas Blancas',
        category: 'shoes',
        subcategory: 'Sneakers',
        color: '#FFFFFF',
        vibe_tags: ['casual', 'sporty', 'comfortable'],
        seasons: ['spring', 'summer', 'autumn', 'winter'],
        imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=500&fit=crop'
    },
    {
        name: 'Chaqueta de Cuero',
        category: 'outerwear',
        subcategory: 'Leather Jacket',
        color: '#3E2723',
        vibe_tags: ['edgy', 'night', 'autumn'],
        seasons: ['autumn', 'winter'],
        imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=500&fit=crop'
    },
    {
        name: 'Camisa Azul',
        category: 'top',
        subcategory: 'Shirt',
        color: '#90CAF9',
        vibe_tags: ['work', 'smart-casual', 'office'],
        seasons: ['spring', 'summer', 'autumn'],
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=500&fit=crop'
    },
    {
        name: 'Pantalón Chino',
        category: 'bottom',
        subcategory: 'Chinos',
        color: '#D7CCC8',
        vibe_tags: ['smart-casual', 'office', 'versatile'],
        seasons: ['spring', 'summer', 'autumn'],
        imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=500&fit=crop'
    },
    {
        name: 'Sweater Gris',
        category: 'top',
        subcategory: 'Sweater',
        color: '#9E9E9E',
        vibe_tags: ['casual', 'cozy', 'autumn'],
        seasons: ['autumn', 'winter'],
        imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=500&fit=crop'
    },
    {
        name: 'Botas Negras',
        category: 'shoes',
        subcategory: 'Boots',
        color: '#212121',
        vibe_tags: ['edgy', 'winter', 'night'],
        seasons: ['autumn', 'winter'],
        imageUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=400&h=500&fit=crop'
    },
    {
        name: 'Blazer Azul Marino',
        category: 'outerwear',
        subcategory: 'Blazer',
        color: '#1A237E',
        vibe_tags: ['formal', 'work', 'elegant'],
        seasons: ['spring', 'autumn', 'winter'],
        imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=500&fit=crop'
    }
];

export interface GeneratedItemData {
    imageDataUrl: string;
    metadata: ClothingItemMetadata;
}

export async function generateWardrobeItem(index: number): Promise<GeneratedItemData> {
    const template = WARDROBE_TEMPLATES[index % WARDROBE_TEMPLATES.length];

    // For external URLs, we just use them directly as imageDataUrl
    // The app will load them as regular image sources
    const imageDataUrl = template.imageUrl;

    const metadata: ClothingItemMetadata = {
        category: template.category,
        subcategory: template.subcategory,
        color_primary: template.color,
        vibe_tags: template.vibe_tags,
        seasons: template.seasons || [],
        description: `Prenda de prueba: ${template.name}`,
    };

    return { imageDataUrl, metadata };
}

export const TOTAL_GENERATED_ITEMS = WARDROBE_TEMPLATES.length;
