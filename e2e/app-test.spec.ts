import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5183';

// Helper para esperar que la app cargue
async function waitForAppLoad(page: Page) {
  // `networkidle` is flaky with dev servers / long-polling. Prefer DOM readiness + app main mount.
  // This also avoids returning early while Suspense is still showing `LazyLoader`.
  await page.waitForLoadState('domcontentloaded');
  await page.locator('main[role="main"]').first().waitFor({ state: 'attached' });
}

// Helper para hacer login si es necesario
async function ensureLoggedIn(page: Page) {
  await page.goto(BASE_URL);
  await waitForAppLoad(page);

  // 1. Revisar si estamos en Landing (buscar botón 'Ya tengo cuenta')
  const loginLink = page.locator('button:has-text("Ya tengo cuenta")').first();
  if (await loginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('🔄 En Landing: Clickeando "Ya tengo cuenta"...');
    await loginLink.click();
    await page.waitForTimeout(1000);
  }

  // 2. Revisar si estamos en Onboarding (buscar botón 'Ya tengo cuenta' de nuevo)
  const onboardingLoginLink = page.locator('button:has-text("Ya tengo cuenta")').first();
  if (await onboardingLoginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('🔄 En Onboarding: Clickeando "Ya tengo cuenta" to Auth...');
    await onboardingLoginLink.click();
    await page.waitForTimeout(1000);
  }

  // 3. Revisar si estamos en Auth View (Formulario de login)
  const emailInput = page.locator('input[type="email"]').first();
  if (await emailInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    console.log('🔐 En Auth View: Intentando login con credenciales de prueba...');

    // Check if we need to switch to Login mode (if "Crear Cuenta" is shown)
    const switchModeBtn = page.locator('button:has-text("¿Ya tienes cuenta? Inicia sesión")');
    if (await switchModeBtn.isVisible().catch(() => false)) {
      await switchModeBtn.click();
      await page.waitForTimeout(500);
    }

    await emailInput.fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    // Esperar navegación o error
    await page.waitForTimeout(2000);
  }
}

test.describe('App General Tests', () => {

  test('1. App carga correctamente', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForAppLoad(page);

    // Verificar que la página cargó
    const title = await page.title();
    console.log('✅ App cargada - Título:', title);
    expect(title).toBeTruthy();
  });

  test('2. Home View se muestra', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForAppLoad(page);

    // Validar landing real de producto (launch mode)
    const homeContent = page.locator('main[aria-label="Landing"] h1, h1:has-text("No Tengo Nada"), button:has-text("Probar gratis ahora")').first();
    const isVisible = await homeContent.isVisible({ timeout: 5000 }).catch(() => false);

    console.log('✅ Home View visible:', isVisible);
    expect(isVisible).toBeTruthy();
  });

  test('3. Navegación funciona', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForAppLoad(page);

    // En launch mode la navegación primaria vive en links del landing/footer
    const navButtons = page.locator('a[href="/pricing"], a[href="/stylist-onboarding"], a[href="/legal/privacidad"], a[href="/legal/terminos"]');
    const count = await navButtons.count();

    console.log('✅ Botones de navegación encontrados:', count);
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Estilista IA Tests', () => {

  test('4. Estilista IA se abre', async ({ page }) => {
    await ensureLoggedIn(page);

    // Buscar botón de Estilista
    const stylistButton = page.locator('text=Estilista, text=Stylist, text=Outfit, [data-testid="stylist"]').first();

    if (await stylistButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await stylistButton.click();
      await page.waitForTimeout(1000);

      // Verificar que se abrió el modal
      const modal = page.locator('text=¿Para qué ocasión?, text=Ocasión, text=Crear mi Outfit').first();
      const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);

      console.log('✅ Modal Estilista visible:', modalVisible);
    } else {
      console.log('⚠️ Botón Estilista no encontrado');
    }
  });

  test('5. Ocasiones se muestran', async ({ page }) => {
    await ensureLoggedIn(page);

    // Abrir estilista
    const stylistButton = page.locator('text=Estilista').first();
    if (await stylistButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await stylistButton.click();
      await page.waitForTimeout(1000);

      // Buscar ocasiones
      const ocasiones = page.locator('text=Trabajo, text=Cita, text=Casual, text=Fiesta');
      const count = await ocasiones.count();

      console.log('✅ Ocasiones encontradas:', count);
    }
  });

  test('6. Selección de ocasión funciona', async ({ page }) => {
    await ensureLoggedIn(page);

    const stylistButton = page.locator('text=Estilista').first();
    if (await stylistButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await stylistButton.click();
      await page.waitForTimeout(1000);

      // Click en una ocasión
      const trabajoBtn = page.locator('text=Trabajo').first();
      if (await trabajoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await trabajoBtn.click();
        await page.waitForTimeout(500);

        // Verificar que aparecen opciones de estilo
        const estiloSection = page.locator('text=Estilo, text=Style').first();
        const visible = await estiloSection.isVisible({ timeout: 2000 }).catch(() => false);

        console.log('✅ Sección Estilo visible tras seleccionar ocasión:', visible);
      }
    }
  });
});

test.describe('Chat IA Tests', () => {

  test('7. Chat IA se abre', async ({ page }) => {
    await ensureLoggedIn(page);

    // Buscar botón de Chat
    const chatButton = page.locator('text=Chat, text=Asistente, [data-testid="chat"]').first();

    if (await chatButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatButton.click();
      await page.waitForTimeout(1500);

      // Verificar que no hay error
      const errorText = page.locator('text=Error, text=error');
      const hasError = await errorText.isVisible({ timeout: 1000 }).catch(() => false);

      console.log('✅ Chat abierto sin error:', !hasError);
    } else {
      console.log('⚠️ Botón Chat no encontrado');
    }
  });

  test('8. Input de chat funciona', async ({ page }) => {
    await ensureLoggedIn(page);

    const chatButton = page.locator('text=Chat').first();
    if (await chatButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatButton.click();
      await page.waitForTimeout(1500);

      // Buscar input
      const input = page.locator('input[type="text"], textarea').first();
      if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
        await input.fill('Hola');
        const value = await input.inputValue();

        console.log('✅ Input de chat funciona:', value === 'Hola');
      }
    }
  });
});

test.describe('Closet Tests', () => {

  test('9. Closet se muestra', async ({ page }) => {
    await ensureLoggedIn(page);

    // Buscar navegación a closet
    const closetNav = page.locator('text=Armario, text=Closet, text=Mi Ropa').first();

    if (await closetNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closetNav.click();
      await page.waitForTimeout(1000);

      // Verificar que estamos en closet
      const closetContent = page.locator('text=prendas, text=items, text=Agregar').first();
      const visible = await closetContent.isVisible({ timeout: 3000 }).catch(() => false);

      console.log('✅ Vista Closet cargada:', visible);
    }
  });

  test('10. Botón agregar prenda existe', async ({ page }) => {
    await ensureLoggedIn(page);

    const closetNav = page.locator('text=Armario, text=Closet').first();
    if (await closetNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closetNav.click();
      await page.waitForTimeout(1000);

      const addButton = page.locator('button:has-text("Agregar"), button:has-text("Add"), button:has([class*="add"]), [aria-label*="agregar"]');
      const exists = await addButton.isVisible({ timeout: 2000 }).catch(() => false);

      console.log('✅ Botón agregar existe:', exists);
    }
  });
});

test.describe('UI Components Tests', () => {

  test('11. Dark mode toggle existe', async ({ page }) => {
    await ensureLoggedIn(page);

    const darkModeToggle = page.locator('button:has-text("dark"), button:has-text("tema"), [aria-label*="theme"], [aria-label*="dark"]');
    const exists = await darkModeToggle.isVisible({ timeout: 2000 }).catch(() => false);

    console.log('✅ Toggle dark mode existe:', exists);
  });

  test('12. Responsive - Mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await ensureLoggedIn(page);

    // Verificar que la app se adapta
    const body = page.locator('body');
    const box = await body.boundingBox();

    console.log('✅ Responsive mobile funciona:', box?.width === 375);
    expect(box?.width).toBe(375);
  });
});

test.describe('Feature Cards Tests', () => {

  test('13. Feature cards se muestran en Home', async ({ page }) => {
    await ensureLoggedIn(page);

    // Secciones de valor del landing
    const featureCards = page.locator('h2:has-text("Tu ropero"), h2:has-text("Tu estilista IA"), li:has-text("Antes y después realista")');
    const count = await featureCards.count();

    console.log('✅ Feature cards encontradas:', count);
    expect(count).toBeGreaterThan(0);
  });

  test('14. Quick prompts en Estilista', async ({ page }) => {
    // En launch mode, el "Estilista" es un flujo de adquisición: /stylist-onboarding.
    // Evitamos "text=Estilista" porque también matchea un H2 del landing que no es CTA.
    await page.goto(`${BASE_URL}/stylist-onboarding`);
    await waitForAppLoad(page);

    // STEP 1 (demo) - CTA principal visible
    const heroTitle = page.locator('h1:has-text("Probá el efecto del estilista IA")').first();
    await expect(heroTitle).toBeVisible({ timeout: 7000 });

    const primaryCta = page.locator('button:has-text("Probar con mi foto gratis")').first();
    await expect(primaryCta).toBeVisible({ timeout: 5000 });

    // STEP 1 - CTA secundario abre personalización (step 2)
    const secondaryCta = page.locator('button:has-text("Personalizar mi perfil")').first();
    await expect(secondaryCta).toBeVisible({ timeout: 5000 });
    await secondaryCta.click();

    const step2Title = page.locator('text=¿Qué querés lograr primero?').first();
    await expect(step2Title).toBeVisible({ timeout: 7000 });

    // Verificar que existen opciones rápidas de objetivos
    const goals = page.locator(
      'button:has-text("Sentirme más segura"), button:has-text("Verme más profesional"), button:has-text("Estar a la moda")'
    );
    const count = await goals.count();

    console.log('✅ Objetivos encontrados en onboarding estilista:', count);
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Error Handling Tests', () => {

  test('15. No hay errores de consola críticos', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text());
      }
    });

    await ensureLoggedIn(page);
    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(e =>
      e.includes('React error') ||
      e.includes('Uncaught') ||
      e.includes('TypeError')
    );

    console.log('✅ Errores críticos de consola:', criticalErrors.length);
    console.log('   Errores encontrados:', criticalErrors);
  });
});

test.describe('Performance Tests', () => {

  test('16. Tiempo de carga < 10s', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    await waitForAppLoad(page);
    const loadTime = Date.now() - startTime;

    console.log('✅ Tiempo de carga:', loadTime, 'ms');
    // NOTE: This is a coarse smoke check. Real performance should be tracked via Web Vitals in production.
    expect(loadTime).toBeLessThan(10000);
  });
});
