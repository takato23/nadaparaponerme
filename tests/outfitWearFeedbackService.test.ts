// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetUser,
  mockFrom,
  recordStylistEvent,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  recordStylistEvent: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  },
}));

vi.mock('../src/services/stylistMemoryService', () => ({
  recordStylistEvent,
}));

import {
  buildWeeklyFeedbackStylistPrompt,
  computeWeeklyWearInsights,
  getWeeklyWearInsights,
  upsertWearFeedback,
} from '../src/services/outfitWearFeedbackService';

function createFeedbackUpsertChain(result: any) {
  const chain: any = {};
  chain.upsert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(async () => result);
  return chain;
}

function createWeekQueryChain(result: any) {
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.lte = vi.fn(() => chain);
  chain.order = vi.fn(async () => result);
  return chain;
}

describe('outfitWearFeedbackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('hace upsert de feedback y registra evento de stylist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'outfit_wear_feedback') {
        return createFeedbackUpsertChain({
          data: {
            id: 'feedback-1',
            user_id: 'user-1',
            date: '2026-03-18',
            outfit_id: 'outfit-1',
            status: 'worn',
            confidence_positive: true,
            comfort_positive: false,
            skip_reason: null,
            source_surface: 'planner',
            created_at: '2026-03-18T10:00:00.000Z',
            updated_at: '2026-03-18T10:00:00.000Z',
          },
          error: null,
        });
      }

      throw new Error(`unexpected table ${table}`);
    });

    const feedback = await upsertWearFeedback({
      date: '2026-03-18',
      outfit_id: 'outfit-1',
      status: 'worn',
      confidence_positive: true,
      comfort_positive: false,
      source_surface: 'planner',
    });

    expect(feedback.status).toBe('worn');
    expect(feedback.confidence_positive).toBe(true);
    expect(recordStylistEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: 'wore',
      surface: 'planner',
    }));
  });

  it('calcula insights semanales con pendientes y look más fuerte', () => {
    const insights = computeWeeklyWearInsights(
      [
        { date: '2026-03-16', outfit_id: 'outfit-a' },
        { date: '2026-03-17', outfit_id: 'outfit-b' },
        { date: '2026-03-18', outfit_id: 'outfit-c' },
      ] as any,
      [
        {
          id: 'fb-1',
          user_id: 'user-1',
          date: '2026-03-16',
          outfit_id: 'outfit-a',
          status: 'worn',
          confidence_positive: true,
          comfort_positive: true,
          skip_reason: null,
          source_surface: 'planner',
        },
        {
          id: 'fb-2',
          user_id: 'user-1',
          date: '2026-03-17',
          outfit_id: 'outfit-b',
          status: 'not_worn',
          confidence_positive: null,
          comfort_positive: null,
          skip_reason: 'weather',
          source_surface: 'planner',
        },
      ],
      '2026-03-16',
    );

    expect(insights.planned_count).toBe(3);
    expect(insights.feedback_count).toBe(2);
    expect(insights.worn_count).toBe(1);
    expect(insights.not_worn_count).toBe(1);
    expect(insights.pending_count).toBe(1);
    expect(insights.strongest_outfit_id).toBe('outfit-a');
  });

  it('arma prompt del stylist solo con feedback totalmente positivo', () => {
    const prompt = buildWeeklyFeedbackStylistPrompt([
      {
        date: '2026-03-16',
        outfit: { id: 'a', top_id: '1', bottom_id: '2', shoes_id: '3', explanation: 'Look negro con blazer' },
        feedback: {
          id: 'fb-1',
          user_id: 'user-1',
          date: '2026-03-16',
          outfit_id: 'a',
          status: 'worn',
          confidence_positive: true,
          comfort_positive: true,
          skip_reason: null,
          source_surface: 'planner',
        },
      },
      {
        date: '2026-03-17',
        outfit: { id: 'b', top_id: '4', bottom_id: '5', shoes_id: '6', explanation: 'Look casual' },
        feedback: {
          id: 'fb-2',
          user_id: 'user-1',
          date: '2026-03-17',
          outfit_id: 'b',
          status: 'worn',
          confidence_positive: true,
          comfort_positive: false,
          skip_reason: null,
          source_surface: 'planner',
        },
      },
    ] as any);

    expect(prompt).toContain('Look negro con blazer');
    expect(prompt).not.toContain('Look casual');
  });

  it('obtiene insights semanales desde schedule y feedback persistidos', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'outfit_schedule') {
        return createWeekQueryChain({
          data: [
            { date: '2026-03-16', outfit_id: 'outfit-a' },
            { date: '2026-03-17', outfit_id: 'outfit-b' },
          ],
          error: null,
        });
      }

      if (table === 'outfit_wear_feedback') {
        return createWeekQueryChain({
          data: [
            {
              id: 'fb-1',
              user_id: 'user-1',
              date: '2026-03-16',
              outfit_id: 'outfit-a',
              status: 'worn',
              confidence_positive: true,
              comfort_positive: true,
              skip_reason: null,
              source_surface: 'planner',
              created_at: '2026-03-16T10:00:00.000Z',
              updated_at: '2026-03-16T10:00:00.000Z',
            },
          ],
          error: null,
        });
      }

      throw new Error(`unexpected table ${table}`);
    });

    const insights = await getWeeklyWearInsights('2026-03-16');

    expect(insights.planned_count).toBe(2);
    expect(insights.feedback_count).toBe(1);
    expect(insights.pending_count).toBe(1);
    expect(insights.strongest_outfit_id).toBe('outfit-a');
  });
});
