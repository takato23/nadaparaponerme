import { expect, test } from '@playwright/test';

const RUN_PROD_SMOKE = String(process.env.RUN_PROD_SMOKE || '').toLowerCase() === 'true';
const PROD_URL = process.env.PROD_URL || 'https://no-tengo-nada-para-ponerme.vercel.app';

test.describe('Launch smoke test (production)', () => {
  test.skip(!RUN_PROD_SMOKE, 'Set RUN_PROD_SMOKE=true to run against production');

  test('landing shows updated conversion CTA', async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'networkidle' });

    await expect(page.getByRole('button', { name: /probar gratis ahora/i })).toBeVisible();
    await expect(page.getByText(/no requiere tarjeta de crédito/i)).toBeVisible();
  });

  test('mobile onboarding starts in "Antes" and keeps CTA visible', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    await page.goto(`${PROD_URL}/stylist-onboarding`, { waitUntil: 'networkidle' });

    await expect(page.getByRole('button', { name: /^antes$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^después$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /probar con mi foto gratis/i })).toBeVisible();

    // Ensure default selected tab is "Antes"
    const beforeClass = await page.getByRole('button', { name: /^antes$/i }).getAttribute('class');
    expect(beforeClass || '').toContain('bg-white');

    await page.getByRole('button', { name: /personalizar mi perfil/i }).click();
    await expect(page.getByRole('button', { name: /continuar/i })).toBeVisible();

    await context.close();
  });
});
