import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

async function waitForJob(app, id) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await request(app).get(`/api/analysis-jobs/${id}`);
    assert.equal(response.status, 200);
    if (['completed', 'failed'].includes(response.body.status)) return response.body;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Job ${id} did not finish in time`);
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

test('creates analysis with external scanner findings', async () => {
  const app = createApp({ storage: createMemoryStorage() });
  const response = await request(app)
    .post('/api/analyses')
    .send({
      files: [
        {
          name: 'order-service/app.js',
          text: 'fetch("http://payment-service/api/payments");'
        }
      ],
      externalReports: [
        {
          findings: [
            {
              ruleId: 'adr-missing',
              severity: 'High',
              name: 'Missing Architecture Decision Record',
              where: 'docs/architecture.md',
              recommendation: 'Capture material architecture decisions as ADRs.'
            }
          ]
        }
      ]
    });

  assert.equal(response.status, 201);
  assert.ok(response.body.analysis.findings.some((finding) => finding.ruleId === 'adr-missing'));
});

test('creates analysis from multipart uploads with external findings', async () => {
  const app = createApp({ storage: createMemoryStorage() });
  const response = await request(app)
    .post('/api/analyses')
    .field('externalFindings', JSON.stringify([
      {
        ruleId: 'external-boundary-risk',
        severity: 'Medium',
        name: 'External Boundary Risk',
        where: 'uploaded-file',
        recommendation: 'Review the imported boundary risk.'
      }
    ]))
    .attach('files', Buffer.from('fetch("http://payment-service/api/payments");'), {
      filename: 'order-service/src/client.js',
      contentType: 'text/javascript'
    });

  assert.equal(response.status, 201);
  assert.ok(response.body.analysis.findings.some((finding) => finding.ruleId === 'external-boundary-risk'));
  assert.ok(response.body.analysis.dependencies.some((dependency) => dependency.to === 'payment-service'));
});

test('creates and completes background analysis job from multipart upload', async () => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aar-api-job-'));
  const app = createApp({ storageDir });
  const createResponse = await request(app)
    .post('/api/analysis-jobs')
    .attach('files', Buffer.from('fetch("http://payment-service/api/payments");'), {
      filename: 'order-service/src/client.js',
      contentType: 'text/javascript'
    });

  assert.equal(createResponse.status, 202);
  assert.equal(createResponse.body.status, 'queued');

  const finished = await waitForJob(app, createResponse.body.id);
  assert.equal(finished.status, 'completed');
  assert.equal(finished.progress, 100);

  const resultResponse = await request(app).get(`/api/analysis-jobs/${createResponse.body.id}/result`);
  assert.equal(resultResponse.status, 200);
  assert.ok(resultResponse.body.analysis.findings.length > 0);
  assert.ok(resultResponse.body.analysis.dependencies.some((dependency) => dependency.to === 'payment-service'));
  assert.equal(resultResponse.body.analysis.files[0].text, undefined);
});

test('paginates analysis findings dependencies and files', async () => {
  const app = createApp({ storage: createMemoryStorage() });
  const createResponse = await request(app)
    .post('/api/analyses')
    .send({
      files: [
        {
          name: 'order-service/src/client.js',
          text: 'fetch("http://payment-service/api"); fetch("http://inventory-service/api"); const password = "sample-secret";'
        },
        {
          name: 'payment-service/src/client.js',
          text: 'fetch("http://order-service/api");'
        }
      ]
    });

  assert.equal(createResponse.status, 201);
  assert.ok(createResponse.body.analysis.totals.findings >= createResponse.body.analysis.findings.length);

  const findingsResponse = await request(app).get(`/api/analyses/${createResponse.body.id}/findings?page=1&pageSize=1`);
  assert.equal(findingsResponse.status, 200);
  assert.equal(findingsResponse.body.items.length, 1);
  assert.ok(findingsResponse.body.total >= 1);

  const dependenciesResponse = await request(app).get(`/api/analyses/${createResponse.body.id}/dependencies?page=1&pageSize=1`);
  assert.equal(dependenciesResponse.status, 200);
  assert.equal(dependenciesResponse.body.items.length, 1);
  assert.ok(dependenciesResponse.body.total >= 1);

  const filesResponse = await request(app).get(`/api/analyses/${createResponse.body.id}/files?page=1&pageSize=1`);
  assert.equal(filesResponse.status, 200);
  assert.equal(filesResponse.body.items.length, 1);
  assert.equal(filesResponse.body.items[0].text, undefined);
});

test('rejects empty analysis request', async () => {
  const app = createApp({ storage: createMemoryStorage() });
  const response = await request(app).post('/api/analyses').send({ files: [] });
  assert.equal(response.status, 400);
});
