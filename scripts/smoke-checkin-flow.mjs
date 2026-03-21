import { config as loadEnv } from 'dotenv';
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local') });

const baseUrl = process.argv[2] || process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const email = process.argv[3] || process.env.SMOKE_CHECKIN_EMAIL || 'smoke.checkin.demo@ojodeloca.dev';
const password = process.argv[4] || process.env.SMOKE_CHECKIN_PASSWORD || 'Smoke12345!';

async function clickIfVisible(page, name) {
  const button = page.getByRole('button', { name });
  if (await button.count()) {
    await button.first().click();
    return true;
  }
  return false;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

try {
  await page.goto(baseUrl, { waitUntil: 'load', timeout: 30000 });
  await clickIfVisible(page, 'Aceptar');
  await clickIfVisible(page, 'Ya tengo cuenta');
  await page.waitForTimeout(800);
  await clickIfVisible(page, '¿Ya tienes cuenta? Inicia sesión');
  await page.waitForTimeout(500);

  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Contraseña').fill(password);

  const submitCandidates = ['Iniciar sesión', 'Entrar', 'Ingresar'];
  let submitted = false;
  for (const candidate of submitCandidates) {
    submitted = await clickIfVisible(page, candidate);
    if (submitted) break;
  }
  if (!submitted) {
    await page.locator('form').first().evaluate((form) => form.requestSubmit());
  }

  await page.waitForTimeout(3000);

  const homeText = await page.locator('body').innerText();
  if (!homeText.includes('Registrar ahora') && !homeText.includes('Editar check-in')) {
    throw new Error('No llegué al home autenticado o no apareció el CTA del check-in.');
  }

  await page.goto(`${baseUrl}/planificador`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);

  const plannerText = await page.locator('body').innerText();
  const plannerTextLower = plannerText.toLowerCase();
  if (!plannerTextLower.includes('loop de uso real')) throw new Error('PlannerHub no muestra el bloque de check-in.');
  if (!plannerTextLower.includes('resumen 7 días')) throw new Error('PlannerHub no muestra el resumen semanal.');
  if (!plannerTextLower.includes('pedir variantes a kumbi')) throw new Error('PlannerHub no muestra CTA al stylist con feedback positivo.');

  await page.getByRole('button', { name: 'Registrar ahora' }).first().click();
  await page.getByRole('button', { name: 'Sí, lo usé' }).click();
  await page.getByRole('button', { name: 'Sí, me quedó bien' }).click();
  await page.getByRole('button', { name: 'Sí, cómodo/a' }).click();
  await page.getByRole('button', { name: 'Guardar' }).click();
  await page.waitForTimeout(1200);

  const afterSaveText = await page.locator('body').innerText();
  if (!afterSaveText.includes('Editar check-in')) throw new Error('No actualizó el estado del check-in después de guardar.');

  await page.getByRole('button', { name: 'Abrir planner semanal' }).click();
  await page.waitForTimeout(1200);

  const weeklyPlannerText = await page.locator('body').innerText();
  if (!weeklyPlannerText.includes('Futuro')) throw new Error('El planner semanal no está diferenciando la fecha futura.');

  await mkdir(resolve(process.cwd(), 'output/playwright'), { recursive: true });
  await page.screenshot({ path: resolve(process.cwd(), 'output/playwright/smoke-checkin-flow.png'), fullPage: true });

  console.log(JSON.stringify({
    baseUrl,
    email,
    result: 'ok',
    screenshot: 'output/playwright/smoke-checkin-flow.png',
  }, null, 2));
} finally {
  await browser.close();
}
