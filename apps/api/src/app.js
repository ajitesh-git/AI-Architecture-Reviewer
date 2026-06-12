import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import JSZip from 'jszip';
import {
  analyzeSolution,
  createJsonReport,
  createMarkdownReport,
  createSourceFile,
  isIgnoredPath,
  isSupportedTextArtifact,
  normalizeExternalReport
} from '@ai-architecture-reviewer/analyzer-core';
import { createFileStorage } from './storage.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 500
  }
});

const jobUploadDir = path.resolve('storage/uploads');
fs.mkdirSync(jobUploadDir, { recursive: true });
const jobUpload = multer({
  storage: multer.diskStorage({
    destination: jobUploadDir,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}-${file.originalname || file.fieldname}`)
  }),
  limits: {
    fileSize: 250 * 1024 * 1024,
    files: 50
  }
});

const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024;

function createIngestionBudget() {
  return { files: 0, textBytes: 0, skipped: 0 };
}

function canIncludeTextArtifact(size, budget) {
  if (size > MAX_TEXT_FILE_BYTES) return false;
  return true;
}

function includeSourceFile(file, budget) {
  budget.files += 1;
  budget.textBytes += file.size || file.text?.length || 0;
  return file;
}

function createResponseRecord(record) {
  return {
    ...record,
    analysis: {
      ...record.analysis,
      files: record.analysis.files.map((file) => ({
        name: file.name,
        size: file.size
      }))
    }
  };
}

function createAnalysisJobStore() {
  const jobs = new Map();
  return {
    create() {
      const now = new Date().toISOString();
      const job = {
        id: crypto.randomUUID(),
        status: 'queued',
        progress: 0,
        stage: 'Queued',
        createdAt: now,
        updatedAt: now
      };
      jobs.set(job.id, job);
      return job;
    },
    get(id) {
      return jobs.get(id);
    },
    patch(id, patch) {
      const current = jobs.get(id);
      if (!current) return null;
      const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
      jobs.set(id, next);
      return next;
    }
  };
}

function createJobResponse(job) {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    analysisId: job.analysisId,
    error: job.error
  };
}

async function readUploadedBuffer(file) {
  if (file.buffer) return file.buffer;
  if (file.path) return fsPromises.readFile(file.path);
  return Buffer.alloc(0);
}

async function expandUploadedFile(file, budget) {
  const name = file.originalname || file.fieldname;
  if (/\.zip$/i.test(name)) {
    const zip = await JSZip.loadAsync(await readUploadedBuffer(file));
    const files = [];
    for (const [entryName, entry] of Object.entries(zip.files)) {
      if (entry.dir || isIgnoredPath(entryName) || !isSupportedTextArtifact(entryName)) continue;
      const estimatedSize = entry._data?.uncompressedSize || 0;
      if (estimatedSize && !canIncludeTextArtifact(estimatedSize, budget)) {
        budget.skipped += 1;
        continue;
      }
      const text = await entry.async('string').catch(() => '');
      if (!canIncludeTextArtifact(text.length, budget)) {
        budget.skipped += 1;
        continue;
      }
      files.push(includeSourceFile(createSourceFile({ name: entryName, size: text.length, text }), budget));
    }
    return files;
  }

  if (isIgnoredPath(name) || !isSupportedTextArtifact(name)) return [];
  if (!canIncludeTextArtifact(file.size, budget)) {
    budget.skipped += 1;
    return [];
  }
  return [includeSourceFile(createSourceFile({ name, size: file.size, text: (await readUploadedBuffer(file)).toString('utf8') }), budget)];
}

async function sourceFilesFromRequest(req) {
  if (Array.isArray(req.body?.files)) {
    return req.body.files.map((file) => createSourceFile(file));
  }

  if (req.files?.length) {
    const budget = createIngestionBudget();
    const nested = [];
    for (const file of req.files) {
      nested.push(await expandUploadedFile(file, budget));
    }
    return nested.flat();
  }

  return [];
}

function cloneUploadFiles(files = []) {
  return files.map((file) => ({
    fieldname: file.fieldname,
    originalname: file.originalname,
    path: file.path,
    size: file.size
  }));
}

async function cleanupUploadFiles(files = []) {
  await Promise.all(files
    .filter((file) => file.path)
    .map((file) => fsPromises.unlink(file.path).catch(() => {})));
}

function cloneBodyFiles(files = []) {
  return files.map((file) => ({ ...file }));
}

function externalFindingsFromRequest(req) {
  const rawFindings = typeof req.body?.externalFindings === 'string'
    ? JSON.parse(req.body.externalFindings)
    : req.body?.externalFindings;
  const rawReports = typeof req.body?.externalReports === 'string'
    ? JSON.parse(req.body.externalReports)
    : req.body?.externalReports;
  const directFindings = Array.isArray(rawFindings) ? rawFindings : [];
  const reports = Array.isArray(rawReports) ? rawReports : [];
  return [
    ...directFindings,
    ...reports.flatMap((report, index) => normalizeExternalReport(report, `external-report-${index + 1}`))
  ];
}

export function createApp(options = {}) {
  const app = express();
  const storageDir = options.storageDir || path.resolve('storage');
  const storage = options.storage || createFileStorage(storageDir);
  const jobs = options.jobs || createAnalysisJobStore();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'ai-architecture-reviewer-api' });
  });

  app.post('/api/analyses', upload.array('files'), async (req, res, next) => {
    try {
      const sourceFiles = await sourceFilesFromRequest(req);
      if (!sourceFiles.length) {
        res.status(400).json({ error: 'No supported source files were provided.' });
        return;
      }

      const externalFindings = externalFindingsFromRequest(req);
      const analysis = analyzeSolution(sourceFiles, { externalFindings });
      const record = await storage.saveAnalysis(analysis);
      res.status(201).json(createResponseRecord(record));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/analysis-jobs', jobUpload.array('files'), async (req, res, next) => {
    try {
      const job = jobs.create();
      const externalFindings = externalFindingsFromRequest(req);
      const bodyFiles = Array.isArray(req.body?.files) ? cloneBodyFiles(req.body.files) : [];
      const uploadFiles = cloneUploadFiles(req.files);

      res.status(202).json(createJobResponse(job));

      const worker = new Worker(new URL('./analysisWorker.js', import.meta.url), {
        workerData: { bodyFiles, externalFindings, storageDir, uploadFiles }
      });
      worker.on('message', (patch) => jobs.patch(job.id, patch));
      worker.on('error', (error) => jobs.patch(job.id, { status: 'failed', progress: 100, stage: 'Failed', error: error.message }));
      worker.on('exit', (code) => {
        const latest = jobs.get(job.id);
        if (code !== 0 && latest?.status !== 'failed') {
          jobs.patch(job.id, { status: 'failed', progress: 100, stage: 'Failed', error: `Worker exited with code ${code}` });
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/analysis-jobs/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Analysis job not found.' });
      return;
    }
    res.json(createJobResponse(job));
  });

  app.get('/api/analysis-jobs/:id/result', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Analysis job not found.' });
      return;
    }
    if (job.status !== 'completed') {
      res.status(409).json(createJobResponse(job));
      return;
    }
    res.json(job.result);
  });

  app.get('/api/analyses', async (_req, res, next) => {
    try {
      res.json(await storage.listAnalyses());
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/analyses/:id', async (req, res, next) => {
    try {
      res.json(createResponseRecord(await storage.getAnalysis(req.params.id)));
    } catch (error) {
      if (error.code === 'ENOENT') res.status(404).json({ error: 'Analysis not found.' });
      else next(error);
    }
  });

  app.get('/api/analyses/:id/report.:format', async (req, res, next) => {
    try {
      const record = await storage.getAnalysis(req.params.id);
      if (req.params.format === 'md') {
        res.type('text/markdown').send(createMarkdownReport(record.analysis));
        return;
      }
      if (req.params.format === 'json') {
        res.type('application/json').send(createJsonReport(record.analysis));
        return;
      }
      res.status(400).json({ error: 'Supported report formats are json and md.' });
    } catch (error) {
      if (error.code === 'ENOENT') res.status(404).json({ error: 'Analysis not found.' });
      else next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    res.status(500).json({ error: error.message });
  });

  return app;
}
