import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export function createFileStorage(rootDir) {
  const analysesDir = path.join(rootDir, 'analyses');

  async function ensure() {
    await fs.mkdir(analysesDir, { recursive: true });
  }

  return {
    async saveAnalysis(analysis) {
      await ensure();
      const id = crypto.randomUUID();
      const record = {
        id,
        createdAt: new Date().toISOString(),
        analysis
      };
      await fs.writeFile(path.join(analysesDir, `${id}.json`), JSON.stringify(record, null, 2), 'utf8');
      return record;
    },

    async listAnalyses() {
      await ensure();
      const entries = await fs.readdir(analysesDir).catch(() => []);
      const records = await Promise.all(entries
        .filter((entry) => entry.endsWith('.json'))
        .map(async (entry) => {
          const raw = await fs.readFile(path.join(analysesDir, entry), 'utf8');
          return JSON.parse(raw);
        }));
      return records
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((record) => ({
          id: record.id,
          createdAt: record.createdAt,
          files: record.analysis.files.length,
          findings: record.analysis.findings.length,
          overall: record.analysis.overall
        }));
    },

    async getAnalysis(id) {
      await ensure();
      const raw = await fs.readFile(path.join(analysesDir, `${id}.json`), 'utf8');
      return JSON.parse(raw);
    }
  };
}
