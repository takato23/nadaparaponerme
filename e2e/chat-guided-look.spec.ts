import { expect, Page, test } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5183';
const PIXEL_DATA_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const ENABLE_GUIDED_CHAT_E2E = process.env.PLAYWRIGHT_GUIDED_CHAT_E2E === 'true';

type GuidedScenario = 'happy' | 'insufficient' | 'timeout' | 'failed';
type GuidedCategory = 'top' | 'bottom' | 'shoes';
type GuidedStatus = 'idle' | 'collecting' | 'confirming' | 'generating' | 'generated' | 'cancelled' | 'error';

interface MockState {
  actionLog: string[];
  confirmGenerateCalls: number;
  creditsCharged: number;
}

const waitForAppLoad = async (page: Page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('main[role="main"]').first().waitFor({ state: 'attached' });
};

const setupFeatureFlags = async (page: Page) => {
  await page.addInitScript(() => {
    const existingRaw = localStorage.getItem('ojodeloca-feature-flags');
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    localStorage.setItem('ojodeloca-feature-flags', JSON.stringify({
      ...existing,
      useSupabaseAI: true,
      enableOnDemandClosetAI: false,
      enableGuidedLookCreationBackend: true,
    }));
  });
};

const ensureLoggedIn = async (page: Page) => {
  await page.goto(BASE_URL);
  await waitForAppLoad(page);

  const loginLink = page.locator('button:has-text("Ya tengo cuenta")').first();
  if (await loginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await loginLink.click();
    await page.waitForTimeout(500);
  }

  const onboardingLoginLink = page.locator('button:has-text("Ya tengo cuenta")').first();
  if (await onboardingLoginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await onboardingLoginLink.click();
    await page.waitForTimeout(500);
  }

  const emailInput = page.locator('input[type="email"]').first();
  if (await emailInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    const switchModeBtn = page.locator('button:has-text("¿Ya tienes cuenta? Inicia sesión")');
    if (await switchModeBtn.isVisible().catch(() => false)) {
      await switchModeBtn.click();
      await page.waitForTimeout(300);
    }

    await emailInput.fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
  }
};

const openStylistChat = async (page: Page) => {
  const chatButton = page.locator('text=Chat, text=Asistente, [data-testid="chat"]').first();
  await expect(chatButton).toBeVisible({ timeout: 15000 });
  await chatButton.click();
  await expect(page.locator('text=Estilista IA').first()).toBeVisible({ timeout: 10000 });
};

const sendMessage = async (page: Page, text: string) => {
  const input = page.locator('textarea[placeholder="Escribí tu mensaje..."]').first();
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(text);
  await input.press('Enter');
};

const setupChatStylistMock = async (page: Page, scenario: GuidedScenario): Promise<MockState> => {
  const state: MockState = {
    actionLog: [],
    confirmGenerateCalls: 0,
    creditsCharged: 0,
  };

  let status: GuidedStatus = 'idle';
  let collected: { occasion?: string; style?: string; category?: GuidedCategory; requestText?: string } = {};
  let generatedItem: any = null;
  let confirmationToken: string | null = null;
  let autosaveEnabled = false;
  const sessionId = 'mock-guided-session';

  const getMissingFields = () => {
    const missing: Array<'occasion' | 'style' | 'category'> = [];
    if (!collected.occasion) missing.push('occasion');
    if (!collected.style) missing.push('style');
    if (!collected.category) missing.push('category');
    return missing;
  };

  const getQuestion = (field: 'occasion' | 'style' | 'category') => {
    if (field === 'occasion') return 'Perfecto. ¿Para qué ocasión lo querés?';
    if (field === 'style') return 'Genial. ¿Qué estilo buscás?';
    return '¿Qué categoría querés crear? Elegí una: top, bottom o calzado.';
  };

  const parseCategory = (value: string): GuidedCategory | undefined => {
    const normalized = value.toLowerCase();
    if (normalized.includes('top')) return 'top';
    if (normalized.includes('bottom') || normalized.includes('pantal') || normalized.includes('falda')) return 'bottom';
    if (normalized.includes('calzado') || normalized.includes('zapa') || normalized.includes('shoe')) return 'shoes';
    return undefined;
  };

  const buildWorkflow = (overrides: Partial<any> = {}) => {
    const missingFields = getMissingFields();
    return {
      mode: 'guided_look_creation',
      sessionId,
      status,
      missingFields,
      collected,
      estimatedCostCredits: 2,
      requiresConfirmation: status === 'confirming',
      confirmationToken,
      generatedItem,
      autosaveEnabled,
      errorCode: null,
      ...overrides,
    };
  };

  await page.route('**/functions/v1/chat-stylist', async (route) => {
    const body = route.request().postDataJSON() as any;
    const workflow = body?.workflow;
    const action: string = workflow?.action || 'submit';
    state.actionLog.push(action);

    if (!workflow || workflow.mode !== 'guided_look_creation') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          role: 'assistant',
          content: 'Respuesta mock de chat legacy.',
          model: 'mock-legacy',
          credits_used: 1,
          cache_hit: false,
        }),
      });
    }

    const payload = workflow.payload || {};
    const inputMessage = String(payload.message || body.message || '').toLowerCase();
    if (typeof payload.autosaveEnabled === 'boolean') {
      autosaveEnabled = Boolean(payload.autosaveEnabled);
    }

    let content = '';
    let outfitSuggestion: any = null;
    let creditsUsed = 0;
    let errorCode: string | null = null;

    if (action === 'start') {
      status = 'collecting';
      collected = {};
      generatedItem = null;
      confirmationToken = null;
      content = 'Perfecto. ¿Para qué ocasión lo querés?';
    } else if (action === 'cancel') {
      status = 'cancelled';
      confirmationToken = null;
      content = 'Perfecto, cancelé la generación.';
    } else if (action === 'toggle_autosave') {
      if (status === 'generated') {
        content = autosaveEnabled
          ? 'Auto-guardado activado. La próxima prenda se guardará automáticamente.'
          : 'Auto-guardado desactivado. Vas a poder guardarla manualmente.';
      } else {
        const missing = getMissingFields();
        status = missing.length > 0 ? 'collecting' : 'confirming';
        content = missing.length > 0
          ? getQuestion(missing[0])
          : 'Esta generación cuesta 2 créditos. ¿Confirmás que la genere ahora?';
      }
    } else if (action === 'request_outfit') {
      status = 'generated';
      content = 'Te armé un outfit completo usando tu nueva prenda.';
      outfitSuggestion = {
        top_id: generatedItem?.metadata?.category === 'top' ? generatedItem.id : 'top-ai',
        bottom_id: generatedItem?.metadata?.category === 'bottom' ? generatedItem.id : 'bottom-ai',
        shoes_id: generatedItem?.metadata?.category === 'shoes' ? generatedItem.id : 'shoes-ai',
        explanation: 'Outfit sugerido con la nueva prenda.',
        confidence: 0.83,
        aiGeneratedItems: {
          top: {
            id: 'top-ai',
            imageDataUrl: PIXEL_DATA_URL,
            metadata: {
              category: 'top',
              subcategory: 'Top AI',
              color_primary: '#111111',
              vibe_tags: ['ai-generated'],
              seasons: ['spring'],
            },
            isAIGenerated: true,
          },
          bottom: {
            id: 'bottom-ai',
            imageDataUrl: PIXEL_DATA_URL,
            metadata: {
              category: 'bottom',
              subcategory: 'Bottom AI',
              color_primary: '#222222',
              vibe_tags: ['ai-generated'],
              seasons: ['spring'],
            },
            isAIGenerated: true,
          },
          shoes: {
            id: 'shoes-ai',
            imageDataUrl: PIXEL_DATA_URL,
            metadata: {
              category: 'shoes',
              subcategory: 'Shoes AI',
              color_primary: '#333333',
              vibe_tags: ['ai-generated'],
              seasons: ['spring'],
            },
            isAIGenerated: true,
          },
        },
      };
    } else if (action === 'confirm_generate') {
      state.confirmGenerateCalls += 1;
      if (generatedItem) {
        status = 'generated';
        content = 'Ya tenía tu prenda generada en esta sesión.';
      } else if (scenario === 'insufficient') {
        status = 'error';
        errorCode = 'INSUFFICIENT_CREDITS';
        content = 'No tenés créditos suficientes para generar esta prenda. Hacé upgrade o sumá créditos.';
      } else if (scenario === 'timeout') {
        status = 'error';
        errorCode = 'GENERATION_TIMEOUT';
        content = '⏱️ La generación tardó más de lo esperado. Probá de nuevo en unos segundos.';
      } else if (scenario === 'failed') {
        status = 'error';
        errorCode = 'GENERATION_FAILED';
        content = 'No pude generar la prenda. Probá de nuevo en unos segundos.';
      } else if (!confirmationToken || payload.confirmationToken !== confirmationToken) {
        status = 'error';
        errorCode = 'INVALID_CONFIRMATION';
        content = 'No pude validar la confirmación. Volvé a confirmar el costo para continuar.';
      } else {
        status = 'generated';
        confirmationToken = null;
        creditsUsed = 2;
        state.creditsCharged += 2;
        generatedItem = {
          id: 'guided-ai-item',
          imageDataUrl: PIXEL_DATA_URL,
          metadata: {
            category: collected.category || 'top',
            subcategory: 'Prenda IA',
            color_primary: '#111111',
            vibe_tags: ['ai-generated', collected.style || 'casual'],
            seasons: ['spring', 'summer', 'fall', 'winter'],
          },
          isAIGenerated: true,
          aiGenerationPrompt: 'mock prompt',
          saved_to_closet: false,
        };
        content = '¡Listo! Generé tu prenda y también te propuse un outfit completo usando esta prenda.';
        outfitSuggestion = {
          top_id: collected.category === 'top' ? generatedItem.id : 'top-ai',
          bottom_id: collected.category === 'bottom' ? generatedItem.id : 'bottom-ai',
          shoes_id: collected.category === 'shoes' ? generatedItem.id : 'shoes-ai',
          explanation: 'Outfit sugerido con la nueva prenda.',
          confidence: 0.84,
          aiGeneratedItems: {
            top: {
              id: 'top-ai',
              imageDataUrl: PIXEL_DATA_URL,
              metadata: { category: 'top', subcategory: 'Top AI', color_primary: '#111111', vibe_tags: ['ai-generated'], seasons: ['spring'] },
              isAIGenerated: true,
            },
            bottom: {
              id: 'bottom-ai',
              imageDataUrl: PIXEL_DATA_URL,
              metadata: { category: 'bottom', subcategory: 'Bottom AI', color_primary: '#222222', vibe_tags: ['ai-generated'], seasons: ['spring'] },
              isAIGenerated: true,
            },
            shoes: {
              id: 'shoes-ai',
              imageDataUrl: PIXEL_DATA_URL,
              metadata: { category: 'shoes', subcategory: 'Shoes AI', color_primary: '#333333', vibe_tags: ['ai-generated'], seasons: ['spring'] },
              isAIGenerated: true,
            },
          },
        };
      }
    } else {
      if (inputMessage.includes('oficina')) collected.occasion = 'oficina';
      if (inputMessage.includes('fiesta')) collected.occasion = 'fiesta';
      if (inputMessage.includes('elegante')) collected.style = 'elegante';
      if (inputMessage.includes('casual')) collected.style = 'casual';
      const parsedCategory = parseCategory(inputMessage);
      if (parsedCategory) collected.category = parsedCategory;
      if (typeof payload.occasion === 'string') collected.occasion = payload.occasion;
      if (typeof payload.style === 'string') collected.style = payload.style;
      if (typeof payload.category === 'string') collected.category = payload.category as GuidedCategory;
      if (!collected.requestText && inputMessage.trim().length > 0) {
        collected.requestText = inputMessage.trim();
      }

      const missing = getMissingFields();
      if (missing.length > 0) {
        status = 'collecting';
        content = getQuestion(missing[0]);
      } else {
        status = 'confirming';
        confirmationToken = 'mock-confirm-token';
        content = 'Tengo todo para generar tu prenda. Esta generación cuesta 2 créditos. ¿Confirmás que la genere ahora?';
      }
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        role: 'assistant',
        content,
        outfitSuggestion,
        model: 'guided-look-workflow',
        credits_used: creditsUsed,
        cache_hit: false,
        threadId: null,
        workflow: buildWorkflow({ errorCode }),
      }),
    });
  });

  return state;
};

const completeFlowUntilConfirmation = async (page: Page) => {
  await page.getByRole('button', { name: 'Crear prenda con IA (2 créditos)' }).click();
  await expect(page.getByText('¿Para qué ocasión lo querés?').first()).toBeVisible({ timeout: 10000 });
  await sendMessage(page, 'oficina');
  await expect(page.getByText('¿Qué estilo buscás?').first()).toBeVisible({ timeout: 10000 });
  await sendMessage(page, 'elegante');
  await expect(page.getByText('¿Qué categoría querés crear?').first()).toBeVisible({ timeout: 10000 });
  await sendMessage(page, 'top');
  await expect(page.getByText('Esta generación cuesta 2 créditos').first()).toBeVisible({ timeout: 10000 });
};

test.describe('Guided Look Chat Workflow', () => {
  test.skip(
    !ENABLE_GUIDED_CHAT_E2E,
    'Requiere entorno con login seeded estable. Activar con PLAYWRIGHT_GUIDED_CHAT_E2E=true.',
  );

  test('happy path: crea prenda desde chat y permite armar outfit', async ({ page }) => {
    await setupFeatureFlags(page);
    const state = await setupChatStylistMock(page, 'happy');
    await ensureLoggedIn(page);
    await openStylistChat(page);

    await completeFlowUntilConfirmation(page);
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.getByText('Prenda creada con IA').first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Armar outfit completo' }).click();
    await expect(page.getByRole('button', { name: 'Ver outfit completo' }).first()).toBeVisible({ timeout: 10000 });

    expect(state.actionLog).toContain('confirm_generate');
    expect(state.actionLog).toContain('request_outfit');
    expect(state.creditsCharged).toBe(2);
  });

  test('sin créditos: muestra error claro y CTA de upgrade', async ({ page }) => {
    await setupFeatureFlags(page);
    await setupChatStylistMock(page, 'insufficient');
    await ensureLoggedIn(page);
    await openStylistChat(page);

    await completeFlowUntilConfirmation(page);
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.getByText('No tenés créditos suficientes').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Ver planes' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('timeout de generación: muestra mensaje tipado', async ({ page }) => {
    await setupFeatureFlags(page);
    await setupChatStylistMock(page, 'timeout');
    await ensureLoggedIn(page);
    await openStylistChat(page);

    await completeFlowUntilConfirmation(page);
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.getByText('La generación tardó más de lo esperado').first()).toBeVisible({ timeout: 10000 });
  });

  test('fallo de edge/generación: muestra error y mantiene chat usable', async ({ page }) => {
    await setupFeatureFlags(page);
    await setupChatStylistMock(page, 'failed');
    await ensureLoggedIn(page);
    await openStylistChat(page);

    await completeFlowUntilConfirmation(page);
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.getByText('No pude generar la prenda').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('textarea[placeholder="Escribí tu mensaje..."]').first()).toBeVisible({ timeout: 10000 });
  });

  test('cancelación: cancela flujo guiado en estado de confirmación', async ({ page }) => {
    await setupFeatureFlags(page);
    await setupChatStylistMock(page, 'happy');
    await ensureLoggedIn(page);
    await openStylistChat(page);

    await completeFlowUntilConfirmation(page);
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.getByText('cancelé la generación').first()).toBeVisible({ timeout: 10000 });
  });

  test('doble confirm: no duplica cobro y recupera resultado previo', async ({ page }) => {
    await setupFeatureFlags(page);
    const state = await setupChatStylistMock(page, 'happy');
    await ensureLoggedIn(page);
    await openStylistChat(page);

    await completeFlowUntilConfirmation(page);
    const confirmButton = page.getByRole('button', { name: 'Confirmar' });
    await Promise.all([
      confirmButton.click(),
      confirmButton.click().catch(() => null),
    ]);

    await expect(page.getByText('Prenda creada con IA').first()).toBeVisible({ timeout: 15000 });
    expect(state.confirmGenerateCalls).toBeGreaterThan(0);
    expect(state.creditsCharged).toBe(2);
  });
});
