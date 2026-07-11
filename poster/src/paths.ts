import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Where the queue + history live. Defaults to the project folder (local dev).
 * In the cloud, set COPIUM_DATA_DIR to a persistent volume mount (e.g. /data)
 * so drafts and post history survive restarts and redeploys.
 */
const ROOT = process.env.COPIUM_DATA_DIR ? resolve(process.env.COPIUM_DATA_DIR) : join(__dirname, '..');

export const QUEUE_ROOT = join(ROOT, 'queue');
export const PENDING_DIR = join(QUEUE_ROOT, 'pending');
export const DATA_DIR = join(ROOT, 'data');
export const HISTORY_PATH = join(DATA_DIR, 'history.json');
