import { expect, Page, test } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
});

const LOCAL_FEATURE_FLAGS = {
  useSupabaseAuth: false,
  useSupabaseCloset: false,
  useSupabaseOutfits: false,
  useSupabaseAI: true,
  useSupabasePreferences: false,
  autoMigration: false,
  enableHybridTryOn: false,
};

const DEMO_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const DEMO_SELFIE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9bWJ8AAAAASUVORK5CYII=';
const DEMO_CLOSET = [
  {
    id: 'e2e-top-1',
    imageDataUrl: DEMO_IMAGE,
    status: 'owned',
    metadata: {
      category: 'top',
      subcategory: 'Remera',
      color_primary: 'negro',
      vibe_tags: ['casual'],
      seasons: ['all'],
    },
  },
  {
    id: 'e2e-bottom-1',
    imageDataUrl: DEMO_IMAGE,
    status: 'owned',
    metadata: {
      category: 'bottom',
      subcategory: 'Pantalon',
      color_primary: 'azul',
      vibe_tags: ['casual'],
      seasons: ['all'],
    },
  },
  {
    id: 'e2e-shoes-1',
    imageDataUrl: DEMO_IMAGE,
    status: 'owned',
    metadata: {
      category: 'shoes',
      subcategory: 'Zapatillas',
      color_primary: 'blanco',
      vibe_tags: ['casual'],
      seasons: ['all'],
    },
  },
];

async function bootstrapLocalSession(page: Page, options: { selfie?: boolean } = {}) {
  await page.addInitScript(
    ({ flags, closet, selfie }) => {
      localStorage.setItem('ojodeloca-feature-flags', JSON.stringify(flags));
      localStorage.setItem('ojodeloca-is-authenticated', 'true');
      localStorage.setItem('ojodeloca-has-onboarded', 'true');
      localStorage.setItem(
        'ojodeloca-consent-v1',
        JSON.stringify({
          analytics: false,
          ads: false,
          updatedAt: new Date().toISOString(),
          version: 1,
        }),
      );
      localStorage.setItem('studio-tutorial-completed', 'true');
      localStorage.setItem('ojodeloca-closet', JSON.stringify(closet));

      if (selfie) {
        localStorage.setItem('studio-user-selfie', selfie);
      } else {
        localStorage.removeItem('studio-user-selfie');
      }
    },
    { flags: LOCAL_FEATURE_FLAGS, closet: DEMO_CLOSET, selfie: options.selfie ? DEMO_SELFIE : null },
  );
}

async function openStudio(page: Page, options: { selfie?: boolean } = {}) {
  await bootstrapLocalSession(page, options);
  await page.goto('/studio');
  await expect(page.getByTestId('studio-root')).toBeVisible();
}

async function selectTopBottomShoes(page: Page) {
  const cards = page.getByTestId('studio-item-card');

  await cards.nth(0).tap();
  await page.getByRole('button', { name: /Top base/i }).tap();
  await cards.nth(1).tap();
  await cards.nth(2).tap();
}

test('mobile tap on Generar opens compatibility step after selecting top, bottom and shoes', async ({ page }) => {
  await openStudio(page, { selfie: true });
  await selectTopBottomShoes(page);

  const generateButton = page.getByRole('button', { name: /Generar/i }).first();
  await expect(generateButton).toBeVisible();
  await generateButton.tap();

  await expect(page.getByRole('heading', { name: '¿Tu foto es de cuerpo completo?' })).toBeVisible();
  await expect(page.getByText(/Seleccionaste pantalón\/falda y calzado\./i)).toBeVisible();
});

test('studio shows visible feedback when touch generate is blocked before slot selection is confirmed', async ({ page }) => {
  await openStudio(page);

  await page.getByTestId('studio-item-card').first().tap();
  await page.getByRole('button', { name: /Generar/i }).first().tap();

  await expect(page.getByText('Seleccioná al menos 1 prenda para probar.')).toBeVisible();
});
