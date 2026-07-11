import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { QUEUE_ROOT } from './paths.js';

export type Status = 'pending' | 'approved' | 'published' | 'rejected';
const DIRS: Status[] = ['pending', 'approved', 'published', 'rejected'];

export interface Draft {
  id: string;
  text: string;
  category: string;
  source: 'generated' | 'stub' | 'manual';
  createdAt: string;
  status: Status;
  tweetId?: string;
  /** Set once the Discord bot has posted a review card for this draft. */
  discordMessageId?: string;
}

function dir(status: Status): string {
  const d = join(QUEUE_ROOT, status);
  mkdirSync(d, { recursive: true });
  return d;
}

function pathFor(status: Status, id: string): string {
  return join(dir(status), `${id}.json`);
}

/** Short, human-friendly id (first 8 chars of a uuid). */
function newId(): string {
  return randomUUID().slice(0, 8);
}

export function createDraft(input: Omit<Draft, 'id' | 'createdAt' | 'status'>): Draft {
  const draft: Draft = {
    id: newId(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    ...input,
  };
  writeFileSync(pathFor('pending', draft.id), JSON.stringify(draft, null, 2));
  return draft;
}

export function list(status: Status): Draft[] {
  const d = dir(status);
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(d, f), 'utf8')) as Draft;
      } catch {
        return null; // file mid-write or corrupt; skip this pass
      }
    })
    .filter((x): x is Draft => x !== null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Find a draft by id in any status directory. */
export function find(id: string): { draft: Draft; status: Status } | undefined {
  for (const status of DIRS) {
    const p = pathFor(status, id);
    if (existsSync(p)) {
      return { draft: JSON.parse(readFileSync(p, 'utf8')) as Draft, status };
    }
  }
  return undefined;
}

/** Move a draft to a new status, updating its fields. */
export function move(id: string, to: Status, patch: Partial<Draft> = {}): Draft {
  const found = find(id);
  if (!found) throw new Error(`No draft with id ${id}`);
  const { draft, status: from } = found;
  const updated: Draft = { ...draft, ...patch, status: to };
  writeFileSync(pathFor(to, id), JSON.stringify(updated, null, 2));
  if (from !== to) unlinkSync(pathFor(from, id));
  return updated;
}
