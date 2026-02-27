import { expect, Page, test } from '@playwright/test';

const STUDIO_VIEWPORTS = [
  { name: 'iphone-se', width: 320, height: 568 },
  { name: 'iphone-12', width: 375, height: 812 },
  { name: 'iphone-14-pro', width: 390, height: 844 },
  { name: 'iphone-14-pro-max', width: 430, height: 932 },
];

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
];

async function bootstrapLocalSession(page: Page) {
  await page.addInitScript(
    ({ flags, closet }) => {
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
        })
      );
      localStorage.setItem('studio-tutorial-completed', 'true');
      localStorage.setItem('ojodeloca-closet', JSON.stringify(closet));
    },
    { flags: LOCAL_FEATURE_FLAGS, closet: DEMO_CLOSET }
  );
}

for (const viewport of STUDIO_VIEWPORTS) {
  test(`studio mobile layout is stable (${viewport.name})`, async ({ page }) => {
    const overflowWarnings: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning' && msg.text().includes('[studio][overflow-detected]')) {
        overflowWarnings.push(msg.text());
      }
    });

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await bootstrapLocalSession(page);
    await page.goto('/studio');

    await expect(page.getByTestId('studio-root')).toBeVisible();

    const overflowDelta = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflowDelta).toBe(0);

    const quickCard = page.getByTestId('studio-quick-card');
    const firstItemCard = page.getByTestId('studio-item-card').first();
    await expect(quickCard).toBeVisible();
    await expect(firstItemCard).toBeVisible();

    await expect
      .poll(async () => {
        const quickWidth = (await quickCard.boundingBox())?.width ?? 0;
        const firstItemWidth = (await firstItemCard.boundingBox())?.width ?? 0;
        return Math.abs(quickWidth - firstItemWidth);
      })
      .toBeLessThanOrEqual(2);

    const basePreview = page.getByTestId('studio-base-preview');
    const generateBar = page.getByTestId('studio-generate-bar');
    await expect(basePreview).toBeVisible();
    await expect(generateBar).toBeVisible();

    const baseHeight = (await basePreview.boundingBox())?.height ?? 0;
    const miniCardHeight = (await quickCard.boundingBox())?.height ?? 0;
    expect(baseHeight).toBeGreaterThan(miniCardHeight);

    const generateButton = generateBar.getByRole('button', { name: /Generar/i });
    await generateButton.scrollIntoViewIfNeeded();
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toBeInViewport();
    await generateButton.click();

    await expect(page.getByTestId('floating-dock')).toHaveCount(0);
    expect(overflowWarnings).toHaveLength(0);
  });
}
