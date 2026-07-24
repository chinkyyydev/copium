import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

/** Tiny JSON file persistence under the trader data dir. */

const filePath = (name: string) => path.join(config.dataDir, `${name}.json`);

export function loadJson<T>(name: string, fallback: T): T {
  try {
    return { ...fallback, ...JSON.parse(fs.readFileSync(filePath(name), 'utf8')) } as T;
  } catch {
    return fallback;
  }
}

export function saveJson(name: string, data: unknown): void {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const tmp = filePath(name) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath(name));
}

export function appendJsonl(name: string, record: unknown): void {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.appendFileSync(path.join(config.dataDir, `${name}.jsonl`), JSON.stringify(record) + '\n');
}

export function readJsonl<T>(name: string, lastN?: number): T[] {
  try {
    const lines = fs
      .readFileSync(path.join(config.dataDir, `${name}.jsonl`), 'utf8')
      .split('\n')
      .filter(Boolean);
    return (lastN ? lines.slice(-lastN) : lines).map((l) => JSON.parse(l) as T);
  } catch {
    return [];
  }
}
