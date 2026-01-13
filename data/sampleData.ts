/**
 * Sample Data - Demo Closet Items
 * 
 * Pre-loaded clothing items for testing and demo purposes.
 * Images use Unsplash URLs that are reliable and high-quality.
 */

import type { ClothingItem } from '../types';

export const sampleData: ClothingItem[] = [
    // ===== TOPS (4 items) =====
    {
        id: 'demo-top-1',
        imageDataUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
        metadata: {
            category: 'top',
            subcategory: 'Remera',
            color_primary: '#FFFFFF',
            description: 'Remera blanca básica de algodón',
            vibe_tags: ['Casual', 'Minimalista', 'Básico'],
            seasons: ['Primavera', 'Verano', 'Todo el año'],
            neckline: 'Cuello redondo',
            sleeve_type: 'Manga corta'
        },
        status: 'owned'
    },
    {
        id: 'demo-top-2',
        imageDataUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop',
        metadata: {
            category: 'top',
            subcategory: 'Camisa',
            color_primary: '#4A90D9',
            description: 'Camisa celeste de vestir',
            vibe_tags: ['Formal', 'Trabajo', 'Clásico'],
            seasons: ['Todo el año'],
            neckline: 'Cuello clásico',
            sleeve_type: 'Manga larga'
        },
        status: 'owned'
    },
    {
        id: 'demo-top-3',
        imageDataUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=400&fit=crop',
        metadata: {
            category: 'top',
            subcategory: 'Sweater',
            color_primary: '#2D2D2D',
            description: 'Sweater negro de lana',
            vibe_tags: ['Casual', 'Trabajo', 'Chic'],
            seasons: ['Otoño', 'Invierno'],
            neckline: 'Cuello redondo',
            sleeve_type: 'Manga larga'
        },
        status: 'owned'
    },
    {
        id: 'demo-top-4',
        imageDataUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop',
        metadata: {
            category: 'top',
            subcategory: 'Blazer',
            color_primary: '#1A1A2E',
            description: 'Blazer azul marino estructurado',
            vibe_tags: ['Formal', 'Trabajo', 'Chic'],
            seasons: ['Otoño', 'Invierno', 'Primavera'],
            neckline: 'Solapa',
            sleeve_type: 'Manga larga'
        },
        status: 'owned'
    },

    // ===== BOTTOMS (4 items) =====
    {
        id: 'demo-bottom-1',
        imageDataUrl: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=400&h=400&fit=crop',
        metadata: {
            category: 'bottom',
            subcategory: 'Jeans',
            color_primary: '#4A6FA5',
            description: 'Jeans azul clásico corte recto',
            vibe_tags: ['Casual', 'Streetwear', 'Básico'],
            seasons: ['Todo el año']
        },
        status: 'owned'
    },
    {
        id: 'demo-bottom-2',
        imageDataUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop',
        metadata: {
            category: 'bottom',
            subcategory: 'Pantalón',
            color_primary: '#1C1C1C',
            description: 'Pantalón negro de vestir',
            vibe_tags: ['Formal', 'Trabajo', 'Clásico'],
            seasons: ['Todo el año']
        },
        status: 'owned'
    },
    {
        id: 'demo-bottom-3',
        imageDataUrl: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&h=400&fit=crop',
        metadata: {
            category: 'bottom',
            subcategory: 'Shorts',
            color_primary: '#C4A484',
            description: 'Shorts beige casual',
            vibe_tags: ['Casual', 'Verano', 'Relajado'],
            seasons: ['Verano', 'Primavera']
        },
        status: 'owned'
    },
    {
        id: 'demo-bottom-4',
        imageDataUrl: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400&h=400&fit=crop',
        metadata: {
            category: 'bottom',
            subcategory: 'Falda',
            color_primary: '#2D2D2D',
            description: 'Falda negra midi',
            vibe_tags: ['Chic', 'Formal', 'Fiesta'],
            seasons: ['Todo el año']
        },
        status: 'owned'
    },

    // ===== SHOES (3 items) =====
    {
        id: 'demo-shoes-1',
        imageDataUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
        metadata: {
            category: 'shoes',
            subcategory: 'Zapatillas',
            color_primary: '#E74C3C',
            description: 'Zapatillas deportivas rojas',
            vibe_tags: ['Casual', 'Deportivo', 'Streetwear'],
            seasons: ['Todo el año']
        },
        status: 'owned'
    },
    {
        id: 'demo-shoes-2',
        imageDataUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=400&h=400&fit=crop',
        metadata: {
            category: 'shoes',
            subcategory: 'Botines',
            color_primary: '#5D4E37',
            description: 'Botines de cuero marrón',
            vibe_tags: ['Casual', 'Chic', 'Boho'],
            seasons: ['Otoño', 'Invierno', 'Primavera']
        },
        status: 'owned'
    },
    {
        id: 'demo-shoes-3',
        imageDataUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop',
        metadata: {
            category: 'shoes',
            subcategory: 'Tacos',
            color_primary: '#1C1C1C',
            description: 'Stilettos negros clásicos',
            vibe_tags: ['Formal', 'Fiesta', 'Chic'],
            seasons: ['Todo el año']
        },
        status: 'owned'
    },

    // ===== ACCESSORIES (2 items) =====
    {
        id: 'demo-acc-1',
        imageDataUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
        metadata: {
            category: 'accessory',
            subcategory: 'Reloj',
            color_primary: '#C0C0C0',
            description: 'Reloj plateado minimalista',
            vibe_tags: ['Minimalista', 'Clásico', 'Trabajo'],
            seasons: ['Todo el año']
        },
        status: 'owned'
    },
    {
        id: 'demo-acc-2',
        imageDataUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
        metadata: {
            category: 'accessory',
            subcategory: 'Cartera',
            color_primary: '#8B4513',
            description: 'Cartera de cuero marrón',
            vibe_tags: ['Casual', 'Chic', 'Boho'],
            seasons: ['Todo el año']
        },
        status: 'owned'
    }
];

// Export helper to check if demo data is loaded
export const isDemoDataLoaded = (closet: ClothingItem[]): boolean => {
    return closet.some(item => item.id.startsWith('demo-'));
};

// Export helper to get demo item count
export const getDemoItemCount = (closet: ClothingItem[]): number => {
    return closet.filter(item => item.id.startsWith('demo-')).length;
};

// Export helper to remove demo items
export const removeDemoItems = (closet: ClothingItem[]): ClothingItem[] => {
    return closet.filter(item => !item.id.startsWith('demo-'));
};