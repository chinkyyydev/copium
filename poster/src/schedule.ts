import { config } from './config.js';

/**
 * Posting slots from brand/04-social-media-strategy.md. Each slot has a
 * preferred category bias. `run` uses the current local hour to decide which
 * slot is active and biases category selection accordingly.
 *
 * Wire this to a real scheduler (Windows Task Scheduler / cron / GitHub Actions)
 * that invokes `npm run run` at each slot time.
 */

export interface Slot {
  id: string;
  /** Local hour (0–23) the slot opens. */
  hour: number;
  label: string;
  /** Category ids this slot prefers; run picks randomly from these. */
  categories: string[];
}

// 12 posts/day, one every 2 hours. Each slot biases category selection by the
// time of day (gremlin energy overnight, gm/sincere in the morning, main jokes
// midday, series content in the evening).
export const SLOTS: Slot[] = [
  { id: 'h00', hour: 0, label: 'midnight trenches', categories: ['degen', 'memecoin', 'ct'] },
  { id: 'h02', hour: 2, label: '2am chart-staring', categories: ['degen', 'bags', 'optimism'] },
  { id: 'h04', hour: 4, label: '4am void', categories: ['degen', 'internet', 'ai'] },
  { id: 'h06', hour: 6, label: 'early rise', categories: ['sincere', 'optimism', 'market'] },
  { id: 'h08', hour: 8, label: 'gm ritual', categories: ['market', 'optimism', 'degen'] },
  { id: 'h10', hour: 10, label: 'mid-morning', categories: ['memecoin', 'hype', 'ct'] },
  { id: 'h12', hour: 12, label: 'main joke of the day', categories: ['memecoin', 'bags', 'market'] },
  { id: 'h14', hour: 14, label: 'early afternoon', categories: ['hype', 'ct', 'internet'] },
  { id: 'h16', hour: 16, label: 'afternoon reactive', categories: ['reaction', 'market', 'hype'] },
  { id: 'h18', hour: 18, label: 'evening series', categories: ['bags', 'motivation', 'ai'] },
  { id: 'h20', hour: 20, label: 'prime evening', categories: ['memecoin', 'motivation', 'advice'] },
  { id: 'h22', hour: 22, label: 'late night', categories: ['ct', 'degen', 'internet'] },
];

/** Current local hour in the configured timezone. */
export function currentHour(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === 'hour')?.value ?? '0';
  return parseInt(h, 10) % 24;
}

/** The slot whose hour is closest at/behind the current hour. */
export function activeSlot(hour = currentHour()): Slot {
  // Sort by hour, pick the latest slot whose hour <= current hour; wrap to gremlin overnight.
  const sorted = [...SLOTS].sort((a, b) => a.hour - b.hour);
  let chosen = sorted[sorted.length - 1]; // default: last of day
  for (const s of sorted) {
    if (s.hour <= hour) chosen = s;
  }
  return chosen;
}

/** Pick a category id for a slot (random among its preferred categories). */
export function categoryForSlot(slot: Slot): string {
  return slot.categories[Math.floor(Math.random() * slot.categories.length)];
}
