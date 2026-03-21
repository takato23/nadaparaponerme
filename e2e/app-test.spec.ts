import { expect, type Locator, Page, test } from '@playwright/test';

const DEMO_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const LOCAL_FEATURE_FLAGS = {
  useSupabaseAuth: false,
  useSupabaseCloset: false,
  useSupabaseOutfits: false,
  useSupabasePreferences: false,
  useSupabaseAI: true,
  enableHybridTryOn: false,
  enableGuidedLookCreationBackend: true,
};

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

async function waitForMain(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('main').first().waitFor({ state: 'visible' });
}

async function horizontalOverflowDelta(page: Page): Promise<number> {
  return page.evaluate(() => {
    const rootDelta = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const bodyDelta = document.body.scrollWidth - document.body.clientWidth;
    return Math.max(rootDelta, bodyDelta, 0);
  });
}

async function dragPointer(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
  steps = 12,
) {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps });
  await page.mouse.up();
}

async function dispatchPointerSequence(
  locator: Locator,
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  await locator.dispatchEvent('pointerdown', {
    bubbles: true,
    clientX: start.x,
    clientY: start.y,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
  });
  await locator.dispatchEvent('pointermove', {
    bubbles: true,
    clientX: start.x + ((end.x - start.x) * 0.45),
    clientY: start.y,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
  });
  await locator.dispatchEvent('pointermove', {
    bubbles: true,
    clientX: end.x,
    clientY: end.y,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
  });
  await locator.dispatchEvent('pointerup', {
    bubbles: true,
    clientX: end.x,
    clientY: end.y,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
  });
}

async function bootstrapSession(
  page: Page,
  options: { authenticated: boolean; hasOnboarded: boolean },
) {
  await page.addInitScript(
    ({ flags, authenticated, hasOnboarded, closet }) => {
      localStorage.setItem('ojodeloca-feature-flags', JSON.stringify(flags));
      localStorage.setItem('ojodeloca-is-authenticated', authenticated ? 'true' : 'false');
      localStorage.setItem('ojodeloca-has-onboarded', hasOnboarded ? 'true' : 'false');
      localStorage.setItem('studio-tutorial-completed', 'true');
      localStorage.setItem('ojodeloca-closet', JSON.stringify(closet));
      localStorage.setItem(
        'ojodeloca-consent-v1',
        JSON.stringify({
          analytics: false,
          ads: false,
          updatedAt: new Date().toISOString(),
          version: 1,
        }),
      );
    },
    {
      flags: LOCAL_FEATURE_FLAGS,
      authenticated: options.authenticated,
      hasOnboarded: options.hasOnboarded,
      closet: DEMO_CLOSET,
    },
  );
}

test.describe('App smoke', () => {
  test('renders landing for anonymous users', async ({ page }) => {
    await bootstrapSession(page, { authenticated: false, hasOnboarded: false });
    await page.goto('/');
    await waitForMain(page);

    await expect(page.locator('main[aria-label="Landing"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear cuenta e ir al armario' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ya tengo cuenta' })).toBeVisible();
  });

  test('protected routes still show landing for anonymous users', async ({ page }) => {
    await bootstrapSession(page, { authenticated: false, hasOnboarded: false });
    await page.goto('/studio');
    await waitForMain(page);

    await expect(page.locator('main[aria-label="Landing"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear cuenta e ir al armario' })).toBeVisible();
  });

  test('primary CTA opens auth inline with closet routing by default', async ({ page }) => {
    await bootstrapSession(page, { authenticated: false, hasOnboarded: false });
    await page.goto('/');
    await waitForMain(page);

    await page.getByRole('button', { name: 'Crear cuenta e ir al armario' }).click();
    await expect(page.getByRole('heading', { name: 'Crear Cuenta' })).toBeVisible();
    await expect(page.getByText('Entrás por')).toBeVisible();
    await expect(page.getByText('Cargar ropa').last()).toBeVisible();
  });

  test('stylist onboarding route resolves to the unified preview flow', async ({ page }) => {
    await bootstrapSession(page, { authenticated: false, hasOnboarded: false });
    await page.goto('/stylist-onboarding');
    await waitForMain(page);

    await expect(page).toHaveURL(/entry=preview/);
    await expect(page.locator('main[aria-label="Landing"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Entrá al dashboard desde tu armario.' })).toBeVisible();
  });

  test('selected intent is preserved when auth opens inline', async ({ page }) => {
    await bootstrapSession(page, { authenticated: false, hasOnboarded: false });
    await page.goto('/?entry=preview');
    await waitForMain(page);

    await page.getByRole('button', { name: 'Definir estilo' }).click();
    await page.getByRole('button', { name: 'Crear cuenta y seguir al perfil' }).click();

    await expect(page.getByRole('heading', { name: 'Crear Cuenta' })).toBeVisible();
    await expect(page.getByText('Entrás por')).toBeVisible();
    await expect(page.getByText('Definir estilo').last()).toBeVisible();
  });

  test('auth query opens inline auth on top of landing', async ({ page }) => {
    await bootstrapSession(page, { authenticated: false, hasOnboarded: false });
    await page.goto('/?auth=login');
    await waitForMain(page);

    await expect(page.locator('main[aria-label="Landing"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible();
  });

  test('lab quiz variant blocks CTA until final selection', async ({ page }) => {
    await page.goto('/onboarding-lab?v=quiz');
    await waitForMain(page);

    await page.getByRole('button', { name: 'Cargar armario' }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();

    await page.getByRole('button', { name: 'Rápido (1 click)' }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();

    const createButton = page.getByRole('button', { name: 'Crear cuenta' });
    const loginButton = page.getByRole('button', { name: 'Ya tengo cuenta' });
    await expect(createButton).toBeDisabled();
    await expect(loginButton).toBeDisabled();

    await page.getByRole('button', { name: 'Subir prendas ahora' }).click();
    await expect(createButton).toBeEnabled();
    await expect(loginButton).toBeEnabled();
  });

  test('mock onboarding route exposes three templates and sticky navigation', async ({ page }) => {
    await bootstrapSession(page, { authenticated: false, hasOnboarded: false });
    await page.goto('/onboarding-mock');
    await waitForMain(page);

    await expect(page.locator('main[aria-label="Onboarding mock gallery"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Onboarding mock gallery' })).toBeVisible();
    await expect(page.getByTestId('onboarding-template-editorial')).toBeVisible();
    await expect(page.getByTestId('onboarding-template-concierge')).toBeAttached();
    await expect(page.getByTestId('onboarding-template-sprint')).toBeAttached();

    await page.getByRole('button', { name: 'Closet sprint' }).click();
    await expect(page.getByRole('heading', { name: 'Closet sprint' })).toBeVisible();
  });

  test('mock editorial template keeps CTA gated until selection and opens signup auth', async ({ page }) => {
    await bootstrapSession(page, { authenticated: false, hasOnboarded: false });
    await page.goto('/onboarding-mock');
    await waitForMain(page);

    const editorial = page.getByTestId('onboarding-template-editorial');
    await editorial.getByRole('button', { name: 'Continuar' }).click();
    await expect(editorial.getByRole('button', { name: 'Continuar' })).toBeDisabled();

    await editorial.getByRole('button', { name: 'Quiero mi primer look armado' }).click();
    await expect(editorial.getByRole('button', { name: 'Continuar' })).toBeEnabled();
    await editorial.getByRole('button', { name: 'Continuar' }).click();
    await editorial.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByRole('heading', { name: 'Crear Cuenta' })).toBeVisible();
    await expect(page.getByText('Entrás por')).toBeVisible();
    await expect(page.getByText('Mi primer look').last()).toBeVisible();
  });

  test('mock concierge and sprint templates can reach their final CTAs', async ({ page }) => {
    await bootstrapSession(page, { authenticated: false, hasOnboarded: false });
    await page.goto('/onboarding-mock');
    await waitForMain(page);

    const concierge = page.getByTestId('onboarding-template-concierge');
    await concierge.getByRole('button', { name: 'Continuar' }).click();
    await expect(concierge.getByText('La conversacion detecta por donde te conviene entrar.')).toBeVisible();
    await concierge.getByRole('button', { name: 'Necesito resolver un look rapido' }).click({ force: true });
    await concierge.getByRole('button', { name: 'Continuar' }).click();
    await expect(concierge.getByRole('button', { name: 'Crear cuenta' })).toBeVisible();
    await expect(concierge.getByRole('button', { name: 'Ya tengo cuenta' })).toBeVisible();

    const sprint = page.getByTestId('onboarding-template-sprint');
    await sprint.getByRole('button', { name: 'Continuar' }).click();
    await sprint.getByRole('button', { name: 'Subir mis prendas primero' }).click();
    await sprint.getByRole('button', { name: 'Continuar' }).click();
    await expect(sprint.getByRole('button', { name: 'Crear cuenta' })).toBeVisible();
    await expect(sprint.getByRole('button', { name: 'Ya tengo cuenta' })).toBeVisible();
  });

  test('authenticated users can open studio and floating dock is hidden there', async ({ page }) => {
    await bootstrapSession(page, { authenticated: true, hasOnboarded: true });
    await page.goto('/studio');

    await expect(page.getByTestId('studio-root')).toBeVisible();
    await expect(page.getByTestId('studio-generate-bar')).toBeVisible();
    await expect(page.getByTestId('floating-dock')).toHaveCount(0);
  });

  test('lab header uses authenticated back label', async ({ page }) => {
    await bootstrapSession(page, { authenticated: true, hasOnboarded: true });
    await page.goto('/onboarding-lab?v=hero');
    await waitForMain(page);

    await expect(page.getByRole('button', { name: 'Ir al inicio' })).toBeVisible();
  });

  test('authenticated mobile routes do not introduce horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bootstrapSession(page, { authenticated: true, hasOnboarded: true });

    for (const route of ['/', '/armario', '/studio', '/actividad', '/perfil', '/onboarding-mock']) {
      await page.goto(route);
      await waitForMain(page);
      const main = page.locator('main').first();
      await expect(main).toBeVisible();

      const overflow = await horizontalOverflowDelta(page);
      expect(overflow).toBeLessThanOrEqual(1);
    }

    await page.goto('/perfil');
    await waitForMain(page);
    await expect(page.getByTestId('floating-dock')).toBeVisible();
    await expect(page.getByTestId('mobile-primary-shell')).toBeVisible();
  });

  test('mobile primary shell keeps dock visible and syncs through primary tabs including studio', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bootstrapSession(page, { authenticated: true, hasOnboarded: true });
    await page.goto('/');
    await waitForMain(page);

    const dock = page.getByTestId('floating-dock');
    const shell = page.getByTestId('mobile-primary-shell');
    await expect(dock).toBeVisible();
    await expect(shell).toBeVisible();

    const tabExpectations = [
      { label: 'Armario', url: '/armario' },
      { label: 'Studio', url: '/studio' },
      { label: 'Social', url: '/actividad' },
      { label: 'Perfil', url: '/perfil' },
      { label: 'Inicio', url: '/' },
    ];

    for (const tab of tabExpectations) {
      await dock.getByRole('button', { name: new RegExp(tab.label, 'i') }).click();
      await expect(page).toHaveURL(new RegExp(`${tab.url.replace('/', '\\/')}$`));
      await expect(dock.getByRole('button', { name: new RegExp(tab.label, 'i') })).toHaveAttribute('aria-current', 'page');
      await expect(dock).toBeVisible();
    }
  });

  test('mobile dock drag snaps to destination and updates aria-current', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bootstrapSession(page, { authenticated: true, hasOnboarded: true });
    await page.goto('/');
    await waitForMain(page);

    const dock = page.getByTestId('floating-dock');
    const dockRail = page.getByTestId('floating-dock-rail');
    const dockBox = await dockRail.boundingBox();
    expect(dockBox).not.toBeNull();

    const start = {
      x: dockBox!.x + (dockBox!.width * 0.1),
      y: dockBox!.y + (dockBox!.height * 0.5),
    };
    const end = {
      x: dockBox!.x + (dockBox!.width * 0.7),
      y: dockBox!.y + (dockBox!.height * 0.5),
    };

    await dispatchPointerSequence(dockRail, start, end);

    await expect(page).toHaveURL(/\/actividad$/);
    await expect(dock.getByRole('button', { name: /social/i })).toHaveAttribute('aria-current', 'page');
  });

  test('mobile content swipe advances pager and keeps dock synced', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bootstrapSession(page, { authenticated: true, hasOnboarded: true });
    await page.goto('/');
    await waitForMain(page);

    const shellViewport = page.getByTestId('mobile-primary-shell-viewport');
    const dock = page.getByTestId('floating-dock');
    const viewportBox = await shellViewport.boundingBox();
    expect(viewportBox).not.toBeNull();

    const start = {
      x: viewportBox!.x + (viewportBox!.width * 0.78),
      y: viewportBox!.y + Math.min(viewportBox!.height * 0.35, 260),
    };
    const end = {
      x: viewportBox!.x + (viewportBox!.width * 0.22),
      y: start.y,
    };

    await dragPointer(page, start, end, 14);

    await expect(page).toHaveURL(/\/armario$/);
    await expect(dock.getByRole('button', { name: /armario/i })).toHaveAttribute('aria-current', 'page');
  });
});
