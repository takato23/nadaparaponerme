import { describe, expect, it } from 'vitest';

import { buildLocalDevBillingSummary, buildPlanFeatureBullets, getPlanPriceLabel } from '../src/services/billingCatalogService';

describe('billingCatalogService', () => {
  it('builds a visible local-dev catalog fallback for pricing surfaces', () => {
    const summary = buildLocalDevBillingSummary(new Date('2026-03-12T12:00:00.000Z'));

    expect(summary.current.plan?.code).toBe('free');
    expect(summary.catalog.map((plan) => plan.code)).toEqual(['free', 'plus', 'pro']);
    expect(summary.catalog.every((plan) => plan.visible)).toBe(true);
    expect(summary.usage.buckets?.kumbi_messages.monthly_limit).toBe(100);
  });

  it('keeps seeded display prices for paid plans', () => {
    const summary = buildLocalDevBillingSummary(new Date('2026-03-12T12:00:00.000Z'));
    const plusPlan = summary.catalog.find((plan) => plan.code === 'plus');

    expect(plusPlan).toBeTruthy();
    expect(getPlanPriceLabel(plusPlan!, 'ARS')).toBe('AR$ 7.990/mes');
    expect(getPlanPriceLabel(plusPlan!, 'USD')).toBe('US$ 7.99/month');
  });

  it('includes analysis allowances in public plan bullets', () => {
    const summary = buildLocalDevBillingSummary(new Date('2026-03-12T12:00:00.000Z'));
    const freePlan = summary.catalog.find((plan) => plan.code === 'free');
    const proPlan = summary.catalog.find((plan) => plan.code === 'pro');

    expect(freePlan).toBeTruthy();
    expect(proPlan).toBeTruthy();
    expect(buildPlanFeatureBullets(freePlan!)).toContain('50 análisis de prendas por mes');
    expect(buildPlanFeatureBullets(proPlan!)).toContain('400 análisis de prendas por mes');
  });
});
