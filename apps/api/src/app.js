import path from 'node:path';
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

const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024;

async function expandUploadedFile(file) {
  const name = file.originalname || file.fieldname;
  if (/\.zip$/i.test(name)) {
    const zip = await JSZip.loadAsync(file.buffer);
    const files = [];
    for (const [entryName, entry] of Object.entries(zip.files)) {
      if (entry.dir || isIgnoredPath(entryName) || !isSupportedTextArtifact(entryName)) continue;
      const text = await entry.async('string').catch(() => '');
      if (text.length > MAX_TEXT_FILE_BYTES) continue;
      files.push(createSourceFile({ name: entryName, size: text.length, text }));
    }
    return files;
  }

  if (isIgnoredPath(name) || !isSupportedTextArtifact(name)) return [];
  if (file.size > MAX_TEXT_FILE_BYTES) return [];
  return [createSourceFile({ name, size: file.size, text: file.buffer.toString('utf8') })];
}

async function sourceFilesFromRequest(req) {
  if (Array.isArray(req.body?.files)) {
    return req.body.files.map((file) => createSourceFile(file));
  }

  if (req.files?.length) {
    const nested = await Promise.all(req.files.map(expandUploadedFile));
    return nested.flat();
  }

  return [];
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
  const storage = options.storage || createFileStorage(options.storageDir || path.resolve('storage'));

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
      res.status(201).json(record);
    } catch (error) {
      next(error);
    }
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
      res.json(await storage.getAnalysis(req.params.id));
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
