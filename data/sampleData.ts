import type { ClothingItem } from '../types';

export const sampleData: ClothingItem[] = [
  {
    id: 'sample_1',
    imageDataUrl: 'https://storage.googleapis.com/aistudio-hosting/images/codelab/NTN2P/sample_white_tshirt.jpg',
    metadata: {
      category: 'top',
      subcategory: 'remera blanca',
      color_primary: 'blanco',
      vibe_tags: ['casual', 'minimalista', 'basico'],
      seasons: ['spring', 'summer', 'autumn', 'winter'],
    },
  },
  {
    id: 'sample_2',
    imageDataUrl: 'https://storage.googleapis.com/aistudio-hosting/images/codelab/NTN2P/sample_blue_jeans.jpg',
    metadata: {
      category: 'bottom',
      subcategory: 'jeans azules',
      color_primary: 'azul',
      vibe_tags: ['casual', 'streetwear', 'cotidiano'],
      seasons: ['spring', 'summer', 'autumn', 'winter'],
    },
  },
  {
    id: 'sample_3',
    imageDataUrl: 'https://storage.googleapis.com/aistudio-hosting/images/codelab/NTN2P/sample_black_sneakers.jpg',
    metadata: {
      category: 'shoes',
      subcategory: 'zapatillas negras',
      color_primary: 'negro',
      vibe_tags: ['casual', 'urbano', 'comodo'],
      seasons: ['spring', 'summer', 'autumn', 'winter'],
    },
  },
];