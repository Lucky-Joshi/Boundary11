import { createDemoProvider } from './demoProvider.js';
import { createFileStore } from './fileStore.js';
import { env } from '../config/env.js';

/**
 * Durable local adapter.
 *
 * Same repository interface as the demo provider, but every mutation is
 * persisted to a JSON file on disk (see fileStore.js for storage and its
 * documented limitations). This is the default development mode and is what
 * keeps demo orders, inventory adjustments and accounts between restarts.
 *
 * mode reports 'local' so health endpoints and logs never pretend a real
 * database is connected.
 */
export function createLocalProvider({ dataDir } = {}) {
  const storage = createFileStore({ dataDir: dataDir || env.localDataDir });
  const provider = createDemoProvider({ storage, mode: 'local' });

  // Expose the backing store so tools/tests can inspect or reset it.
  provider._store = storage;
  return provider;
}