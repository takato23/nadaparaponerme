import { describe, expect, it } from 'vitest';
import { getForgottenItems, getAddedDate, formatDays } from '../utils/forgottenItems';
import type { ClothingItem } from '../types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-18T12:00:00.000Z');

function makeItem(overrides: Partial<ClothingItem> & { id: string }): ClothingItem {
  return {
    imageDataUrl: 'data:image/png;base64,xxx',
    metadata: {
      category: 'top',
      subcategory: 'remera',
      color_primary: 'negro',
      vibe_tags: [],
      seasons: [],
    },
    ...overrides,
  } as ClothingItem;
}

const iso = (msAgo: number) => new Date(NOW.getTime() - msAgo).toISOString();

describe('forgotten clothing engine', () => {
  it('flags items never worn and added long ago', () => {
    const closet = [
      makeItem({ id: 'a', added_at: iso(120 * DAY), times_worn: 0 }),
    ];
    const { items, neverWornCount } = getForgottenItems(closet, { now: NOW });
    expect(items).toHaveLength(1);
    expect(items[0].neverWorn).toBe(true);
    expect(items[0].reason).toBe('never_worn');
    expect(neverWornCount).toBe(1);
  });

  it('does NOT flag recently added items (grace period)', () => {
    const closet = [makeItem({ id: 'new', added_at: iso(3 * DAY), times_worn: 0 })];
    const { items } = getForgottenItems(closet, { now: NOW });
    expect(items).toHaveLength(0);
  });

  it('does NOT flag items worn recently', () => {
    const closet = [
      makeItem({ id: 'fresh', added_at: iso(200 * DAY), times_worn: 5, last_worn_at: iso(3 * DAY) }),
    ];
    const { items } = getForgottenItems(closet, { now: NOW });
    expect(items).toHaveLength(0);
  });

  it('flags items unworn for a long time', () => {
    const closet = [
      makeItem({ id: 'old', added_at: iso(400 * DAY), times_worn: 4, last_worn_at: iso(200 * DAY) }),
    ];
    const { items } = getForgottenItems(closet, { now: NOW });
    expect(items).toHaveLength(1);
    expect(items[0].daysSinceWorn).toBeGreaterThan(150);
  });

  it('ranks never-worn above rarely-worn for the same age', () => {
    const closet = [
      makeItem({ id: 'rare', added_at: iso(300 * DAY), times_worn: 2, last_worn_at: iso(300 * DAY) }),
      makeItem({ id: 'never', added_at: iso(300 * DAY), times_worn: 0 }),
    ];
    const { items } = getForgottenItems(closet, { now: NOW });
    expect(items[0].item.id).toBe('never');
  });

  it('downranks out-of-season items', () => {
    // June in southern hemisphere => winter. A summer item is out of season.
    const winterItem = makeItem({ id: 'win', added_at: iso(300 * DAY), times_worn: 0, metadata: { category: 'outerwear', subcategory: 'campera', color_primary: 'gris', vibe_tags: [], seasons: ['invierno'] } });
    const summerItem = makeItem({ id: 'sum', added_at: iso(300 * DAY), times_worn: 0, metadata: { category: 'top', subcategory: 'musculosa', color_primary: 'blanco', vibe_tags: [], seasons: ['verano'] } });
    const { items } = getForgottenItems([winterItem, summerItem], { now: NOW });
    const win = items.find((i) => i.item.id === 'win')!;
    const sum = items.find((i) => i.item.id === 'sum')!;
    expect(sum.outOfSeason).toBe(true);
    expect(win.outOfSeason).toBe(false);
    expect(win.score).toBeGreaterThan(sum.score);
  });

  it('excludes wishlist / virtual items', () => {
    const closet = [
      makeItem({ id: 'wish', added_at: iso(300 * DAY), times_worn: 0, status: 'wishlist' }),
    ];
    const { items, closetSize } = getForgottenItems(closet, { now: NOW });
    expect(items).toHaveLength(0);
    expect(closetSize).toBe(0);
  });

  it('derives added date from timestamp-based ids', () => {
    const ts = NOW.getTime() - 300 * DAY;
    const item = makeItem({ id: `virtual_${ts}` });
    const d = getAddedDate(item);
    expect(d?.getTime()).toBe(ts);
  });

  it('formats day spans in Spanish', () => {
    expect(formatDays(1)).toBe('1 día');
    expect(formatDays(14)).toBe('2 semanas');
    expect(formatDays(60)).toBe('2 meses');
    expect(formatDays(400)).toContain('1 año');
  });
});
