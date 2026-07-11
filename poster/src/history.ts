import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { HISTORY_PATH } from './paths.js';

export interface HistoryEntry {
  text: string;
  category: string;
  publishedAt: string;
  tweetId?: string;
}

function load(): HistoryEntry[] {
  if (!existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf8')) as HistoryEntry[];
  } catch {
    return [];
  }
}

function save(entries: HistoryEntry[]): void {
  mkdirSync(dirname(HISTORY_PATH), { recursive: true });
  writeFileSync(HISTORY_PATH, JSON.stringify(entries, null, 2));
}

export function recordPublished(entry: HistoryEntry): void {
  const entries = load();
  entries.push(entry);
  save(entries);
}

/** The last N posted texts — fed to the generator so it avoids repeating itself. */
export function recentTexts(n = 50): string[] {
  return load()
    .slice(-n)
    .map((e) => e.text);
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

/** Rough duplicate check against history (exact-ish match after normalization). */
export function isDuplicate(text: string): boolean {
  const target = normalize(text);
  return load().some((e) => normalize(e.text) === target);
}
