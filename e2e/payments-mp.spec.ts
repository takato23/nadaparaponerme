import { expect, test } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5183';

const RUN_PAYMENTS_E2E = String(process.env.RUN_PAYMENTS_E2E || '').toLowerCase() === 'true';
const PAYMENTS_ENABLED = String(process.env.VITE_PAYMENTS_ENABLED || '').toLowerCase() === 'true';

const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL || '';
const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD || '';

test.describe('Payments (MercadoPago) E2E', () => {
  test.skip(!RUN_PAYMENTS_E2E, 'Set RUN_PAYMENTS_E2E=true to enable payments E2E tests');
  test.skip(!PAYMENTS_ENABLED, 'Set VITE_PAYMENTS_ENABLED=true so the dev server enables checkout');
  test.skip(!E2E_USER_EMAIL || !E2E_USER_PASSWORD, 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD');

  test('upgrade redirects to MercadoPago checkout', async ({ page }) => {
    // Login via Auth flow (Supabase)
    await page.goto(`${BASE_URL}/?auth=login`, { waitUntil: 'networkidle' });
    await page.getByPlaceholder('Email').fill(E2E_USER_EMAIL);
    await page.getByPlaceholder('Contraseña').fill(E2E_USER_PASSWORD);
    await page.getByRole('button', { name: /^entrar$/i }).click();

    // Navigate to pricing page
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /planes y precios/i })).toBeVisible();

    // Click the first enabled "Mejorar Plan" CTA (tier depends on current subscription)
    const ctas = page.locator('button:has-text("Mejorar Plan")');
    const ctaCount = await ctas.count();
    expect(ctaCount).toBeGreaterThan(0);

    let clicked = false;
    for (let i = 0; i < ctaCount; i++) {
      const cta = ctas.nth(i);
      if (await cta.isEnabled()) {
        await cta.click();
        clicked = true;
        break;
      }
    }

    expect(clicked).toBeTruthy();

    // MercadoPago Checkout Pro redirect
    await page.waitForURL(/mercadopago/i, { timeout: 30_000 });
    expect(page.url().toLowerCase()).toContain('mercadopago');
  });
});

