import type { CommunityUser } from '../types';

export const communityData: CommunityUser[] = [
  {
    id: 'friend_1',
    name: 'Micaela',
    username: '@micagomez',
    avatarUrl: 'https://images.pexels.com/photos/3762800/pexels-photo-3762800.jpeg?auto=compress&cs=tinysrgb&w=800',
    closet: [
      {
        id: 'mica_item_1',
        imageDataUrl: 'https://storage.googleapis.com/aistudio-hosting/images/codelab/NTN2P/friends/mica_1.jpg',
        metadata: {
          category: 'top',
          subcategory: 'blazer',
          color_primary: 'beige',
          vibe_tags: ['elegante', 'oficina', 'formal'],
          seasons: ['autumn', 'spring'],
        },
      },
      {
        id: 'mica_item_2',
        imageDataUrl: 'https://storage.googleapis.com/aistudio-hosting/images/codelab/NTN2P/friends/mica_2.jpg',
        metadata: {
          category: 'one-piece',
          subcategory: 'vestido',
          color_primary: 'negro',
          vibe_tags: ['noche', 'elegante', 'minimalista'],
          seasons: ['summer', 'spring'],
        },
      },
      {
        id: 'mica_item_3',
        imageDataUrl: 'https://storage.googleapis.com/aistudio-hosting/images/codelab/NTN2P/friends/mica_3.jpg',
        metadata: {
          category: 'shoes',
          subcategory: 'tacos',
          color_primary: 'negro',
          vibe_tags: ['formal', 'fiesta'],
          seasons: ['spring', 'summer', 'autumn'],
        },
      },
      {
        id: 'mica_item_4',
        imageDataUrl: 'https://storage.googleapis.com/aistudio-hosting/images/codelab/NTN2P/friends/mica_4.jpg',
        metadata: {
          category: 'bottom',
          subcategory: 'pollera',
          color_primary: 'blanco',
          vibe_tags: ['casual', 'verano'],
          seasons: ['summer'],
        },
      },
    ],
  },
  {
    id: 'friend_2',
    name: 'Cami',
    username: '@camialvarez',
    avatarUrl: 'https://images.pexels.com/photos/3772509/pexels-photo-3772509.jpeg?auto=compress&cs=tinysrgb&w=800',
    closet: [
      {
        id: 'cami_item_1',
        imageDataUrl: 'https://storage.googleapis.com/aistudio-hosting/images/codelab/NTN2P/friends/cami_1.jpg',
        metadata: {
          category: 'outerwear',
          subcategory: 'campera de cuero',
          color_primary: 'negro',
          vibe_tags: ['urbano', 'rocker', 'streetwear'],
          seasons: ['autumn', 'winter', 'spring'],
        },
      },
      {
        id: 'cami_item_2',
        imageDataUrl: 'https://storage.googleapis.com/aistudio-hosting/images/codelab/NTN2P/friends/cami_2.jpg',
        metadata: {
          category: 'top',
          subcategory: 'remera con estampa',
          color_primary: 'blanco',
          vibe_tags: ['casual', 'streetwear'],
          seasons: ['spring', 'summer', 'autumn'],
        },
      },
      {
        id: 'cami_item_3',
        imageDataUrl: 'https://storage.googleapis.com/aistudio-hosting/images/codelab/NTN2P/friends/cami_3.jpg',
        metadata: {
          category: 'bottom',
          subcategory: 'jeans rotos',
          color_primary: 'azul',
          vibe_tags: ['casual', 'urbano'],
          seasons: ['spring', 'summer', 'autumn', 'winter'],
        },
      },
      {
        id: 'cami_item_4',
        imageDataUrl: 'https://storage.googleapis.com/aistudio-hosting/images/codelab/NTN2P/friends/cami_4.jpg',
        metadata: {
          category: 'shoes',
          subcategory: 'botas',
          color_primary: 'negro',
          vibe_tags: ['urbano', 'rocker'],
          seasons: ['autumn', 'winter'],
        },
      },
    ],
  },
];
