import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Durable JSON file storage for the local adapter.
 *
 * The local adapter persists its entire state to a single JSON file so the
 * prototype keeps working data across server restarts. Writes are atomic
 * (write to a temp file, then rename) so a crash mid-write cannot corrupt the
 * previous snapshot.
 *
 * Limitations (documented):
 *  - Single JSON document: fine for prototype volumes, not for production scale.
 *  - No multi-process locking: two API instances writing concurrently can
 *    clobber each other. The local adapter is a single-process development tool.
 *  - Not transactional: a partially-applied mutation is still written as a
 *    whole document, but there is no rollback if the file system fails mid-write.
 */
export function createFileStore({ dataDir, file = 'boundary11.local.json' } = {}) {
  const dir = path.resolve(dataDir || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.data'));
  const filePath = path.join(dir, file);

  return {
    path: filePath,
    load() {
      let raw;
      try {
        raw = fs.readFileSync(filePath, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
      }
      return JSON.parse(raw);
    },
    save(state) {
      fs.mkdirSync(dir, { recursive: true });
      const tmp = `${filePath}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
      fs.renameSync(tmp, filePath);
    },
    reset() {
      try {
        fs.rmSync(filePath);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    },
  };
}