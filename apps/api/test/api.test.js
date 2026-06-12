import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

function createMemoryStorage() {
  const records = new Map();
  return {
    async saveAnalysis(analysis) {
      const id = `analysis-${records.size + 1}`;
      const record = { id, createdAt: new Date().toISOString(), analysis };
      records.set(id, record);
      return record;
    },
    async listAnalyses() {
      return [...records.values()].map((record) => ({
        id: record.id,
        createdAt: record.createdAt,
        files: record.analysis.files.length,
        findings: record.analysis.findings.length,
        overall: record.analysis.overall
      }));
    },
    async getAnalysis(id) {
      const record = records.get(id);
      if (!record) {
        const error = new Error('not found');
        error.code = 'ENOENT';
        throw error;
      }
      return record;
    }
  };
}

test('health endpoint responds', async () => {
  const app = createApp({ storage: createMemoryStorage() });
  const response = await request(app).get('/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('creates and retrieves analysis from JSON source files', async () => {
  const app = createApp({ storage: createMemoryStorage() });
  const createResponse = await request(app)
    .post('/api/analyses')
    .send({
      files: [
        {
          name: 'payment-service/app.js',
          text: 'const password = "sample-secret"; fetch("http://inventory-service/reserve");'
        }
      ]
    });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.analysis.findings.length, 2);

  const id = createResponse.body.id;
  const getResponse = await request(app).get(`/api/analyses/${id}`);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.id, id);

  const reportResponse = await request(app).get(`/api/analyses/${id}/report.md`);
  assert.equal(reportResponse.status, 200);
  assert.match(reportResponse.text, /Architecture Review Report/);
});

test('rejects empty analysis request', async () => {
  const app = createApp({ storage: createMemoryStorage() });
  const response = await request(app).post('/api/analyses').send({ files: [] });
  assert.equal(response.status, 400);
});
