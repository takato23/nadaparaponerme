/**
 * FORGOTTEN CLOTHING ENGINE ("Ropa Olvidada")
 *
 * A deterministic, dependency-free heuristic that detects which closet items
 * have been forgotten — never worn or unworn for a long time.
 *
 * WHY A LOCAL ENGINE (the "old phone" path):
 * This runs entirely on the device with plain arithmetic. It needs no network,
 * no API key and no AI model, so it is instant, free and private and works the
 * same on a 5-year-old phone as on a brand-new one. Cloud AI (Gemini) is layered
 * ON TOP of this — only to enrich the result with styling tips — never to decide
 * what is forgotten. That keeps the core feature reliable everywhere.
 *
 * SCORING (0-100, higher = more forgotten / higher priority to revive):
 *  - Time component: how long since the item was last worn (or added if never worn)
 *  - Wear component: never worn > worn once or twice > worn but long ago
 *  - Season component: out-of-season items are downranked (it is normal not to
 *    wear a winter coat in summer — that does not mean it is "forgotten")
 */

import type {
  ClothingItem,
  ForgottenItem,
  ForgottenItemsSummary,
  ForgottenItemsOptions,
  ForgottenReason,
} from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_OPTIONS: Required<Omit<ForgottenItemsOptions, 'now'>> = {
  gracePeriodDays: 14,        // items added < 14 days ago are too new to be "forgotten"
  forgottenThresholdDays: 45, // start counting after ~6 weeks unworn
  respectSeason: true,
};

/**
 * Best-effort extraction of when an item was added.
 * Prefers an explicit `added_at`, then falls back to the timestamp embedded in
 * legacy IDs (which are `Date.now()`-based, sometimes with a prefix).
 */
export function getAddedDate(item: ClothingItem): Date | null {
  if (item.added_at) {
    const d = new Date(item.added_at);
    if (!isNaN(d.getTime())) return d;
  }
  // Extract the longest run of digits from the id and treat it as a ms timestamp.
  const match = String(item.id).match(/\d{10,}/);
  if (match) {
    const ts = Number(match[0]);
    // Plausible range: after 2001-09 and not absurdly in the future.
    if (ts > 1_000_000_000_000 && ts < Date.now() + DAY_MS) {
      return new Date(ts);
    }
  }
  return null;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));
}

/** Map a month (0-11) to a season name matching the metadata vocabulary. */
function currentSeasons(now: Date): string[] {
  // Southern hemisphere (app is Argentina-focused) + tolerant matching.
  const m = now.getMonth(); // 0 = Jan
  if (m === 11 || m <= 1) return ['verano', 'summer'];
  if (m >= 2 && m <= 4) return ['otoño', 'otono', 'autumn', 'fall'];
  if (m >= 5 && m <= 7) return ['invierno', 'winter'];
  return ['primavera', 'spring'];
}

function isOutOfSeason(item: ClothingItem, now: Date): boolean {
  const seasons = (item.metadata?.seasons || []).map((s) => s.toLowerCase());
  if (seasons.length === 0) return false; // unknown season → assume year-round
  // "all year" style tags are never out of season.
  if (seasons.some((s) => /todo|all|year|todas|cualquier/.test(s))) return false;
  const current = currentSeasons(now);
  return !seasons.some((s) => current.some((c) => s.includes(c) || c.includes(s)));
}

/**
 * Evaluate a single item. Returns null when the item is NOT forgotten
 * (too new, or worn recently enough).
 */
export function evaluateItem(
  item: ClothingItem,
  now: Date,
  opts: Required<Omit<ForgottenItemsOptions, 'now'>>,
): ForgottenItem | null {
  const timesWorn = item.times_worn ?? 0;
  const neverWorn = timesWorn === 0 || !item.last_worn_at;

  const addedDate = getAddedDate(item);
  const addedDaysAgo = addedDate ? daysBetween(addedDate, now) : null;

  // Grace period: brand-new items can't be "forgotten" yet.
  if (addedDaysAgo !== null && addedDaysAgo < opts.gracePeriodDays) {
    return null;
  }

  // Reference date = last worn, or when it was added if never worn.
  const lastWorn = item.last_worn_at ? new Date(item.last_worn_at) : null;
  const referenceDate =
    lastWorn && !isNaN(lastWorn.getTime()) ? lastWorn : addedDate;

  // No usable date at all → can't judge, treat as not forgotten.
  if (!referenceDate) return null;

  const daysSinceReference = daysBetween(referenceDate, now);
  const daysSinceWorn = lastWorn ? daysSinceReference : null;

  // Not enough time has passed to be considered forgotten.
  if (daysSinceReference < opts.forgottenThresholdDays) {
    return null;
  }

  // --- Time component (0-60) ---
  // Ramp from threshold up to threshold + 180 days.
  const span = 180;
  const overdue = daysSinceReference - opts.forgottenThresholdDays;
  const timeScore = Math.min(60, (overdue / span) * 60);

  // --- Wear component (0-40) ---
  let wearScore: number;
  let reason: ForgottenReason;
  if (neverWorn) {
    wearScore = 40;
    reason = 'never_worn';
  } else if (timesWorn <= 2) {
    wearScore = 22;
    reason = 'rarely_worn';
  } else {
    wearScore = 10;
    reason = 'long_unworn';
  }

  let score = timeScore + wearScore;

  // --- Season component ---
  const outOfSeason = opts.respectSeason && isOutOfSeason(item, now);
  if (outOfSeason) {
    score *= 0.55; // expected dormancy, lower the urgency but still surface it
  }

  score = Math.round(Math.max(0, Math.min(100, score)));

  const reasonLabel = buildReasonLabel(reason, daysSinceWorn, outOfSeason);

  return {
    item,
    score,
    daysSinceWorn,
    neverWorn,
    outOfSeason,
    addedDaysAgo,
    reason,
    reasonLabel,
  };
}

function buildReasonLabel(
  reason: ForgottenReason,
  daysSinceWorn: number | null,
  outOfSeason: boolean,
): string {
  let base: string;
  if (reason === 'never_worn') {
    base = 'Nunca usada';
  } else if (daysSinceWorn !== null) {
    base = `Sin usar hace ${formatDays(daysSinceWorn)}`;
  } else {
    base = 'Sin usar hace mucho';
  }
  return outOfSeason ? `${base} · fuera de temporada` : base;
}

/** Human friendly "hace X" formatting in Spanish. */
export function formatDays(days: number): string {
  if (days < 7) return `${days} día${days === 1 ? '' : 's'}`;
  if (days < 30) {
    const w = Math.round(days / 7);
    return `${w} semana${w === 1 ? '' : 's'}`;
  }
  if (days < 365) {
    const m = Math.round(days / 30);
    return `${m} mes${m === 1 ? '' : 'es'}`;
  }
  const y = Math.floor(days / 365);
  const rem = Math.round((days % 365) / 30);
  return rem > 0 ? `${y} año${y === 1 ? '' : 's'} y ${rem} mes${rem === 1 ? '' : 'es'}` : `${y} año${y === 1 ? '' : 's'}`;
}

/**
 * Main entry point: returns the forgotten items (sorted, most forgotten first)
 * plus aggregate stats. Only considers items the user actually owns.
 */
export function getForgottenItems(
  closet: ClothingItem[],
  options: ForgottenItemsOptions = {},
): ForgottenItemsSummary {
  const now = options.now ?? new Date();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const owned = closet.filter(
    (it) => !it.status || it.status === 'owned' || it.status === 'quick',
  );

  const forgotten: ForgottenItem[] = [];
  for (const item of owned) {
    const evaluated = evaluateItem(item, now, opts);
    if (evaluated) forgotten.push(evaluated);
  }

  forgotten.sort((a, b) => b.score - a.score);

  const neverWornCount = forgotten.filter((f) => f.neverWorn).length;
  const closetSize = owned.length;

  return {
    items: forgotten,
    totalForgotten: forgotten.length,
    closetSize,
    forgottenPercentage:
      closetSize > 0 ? Math.round((forgotten.length / closetSize) * 100) : 0,
    neverWornCount,
  };
}
