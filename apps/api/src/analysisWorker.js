import fsPromises from 'node:fs/promises';
import { parentPort, workerData } from 'node:worker_threads';
import JSZip from 'jszip';
import {
  analyzeSolution,
  createSourceFile,
  isIgnoredPath,
  isSupportedTextArtifact
} from '@ai-architecture-reviewer/analyzer-core';
import { createFileStorage } from './storage.js';

const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024;

function post(patch) {
  parentPort.postMessage(patch);
}

function canIncludeTextArtifact(size) {
  return size <= MAX_TEXT_FILE_BYTES;
}

async function expandUploadedFile(file) {
  const name = file.originalname || file.fieldname;
  if (/\.zip$/i.test(name)) {
    const zip = await JSZip.loadAsync(await fsPromises.readFile(file.path));
    const files = [];
    const entries = Object.entries(zip.files);
    let scanned = 0;
    for (const [entryName, entry] of entries) {
      scanned += 1;
      if (scanned % 250 === 0) {
        post({ status: 'running', progress: Math.min(50, 15 + Math.round((scanned / entries.length) * 35)), stage: `Scanning ${scanned}/${entries.length} zip entries` });
      }
      if (entry.dir || isIgnoredPath(entryName) || !isSupportedTextArtifact(entryName)) continue;
      const estimatedSize = entry._data?.uncompressedSize || 0;
      if (estimatedSize && !canIncludeTextArtifact(estimatedSize)) continue;
      const text = await entry.async('string').catch(() => '');
      if (!canIncludeTextArtifact(text.length)) continue;
      files.push(createSourceFile({ name: entryName, size: text.length, text }));
    }
    return files;
  }

  if (isIgnoredPath(name) || !isSupportedTextArtifact(name) || !canIncludeTextArtifact(file.size)) return [];
  return [createSourceFile({ name, size: file.size, text: (await fsPromises.readFile(file.path)).toString('utf8') })];
}

async function cleanupUploadFiles(files = []) {
  await Promise.all(files
    .filter((file) => file.path)
    .map((file) => fsPromises.unlink(file.path).catch(() => {})));
}

async function run() {
  const { bodyFiles, externalFindings, storageDir, uploadFiles } = workerData;
  try {
    post({ status: 'running', progress: 10, stage: 'Preparing files' });
    const nested = [];
    if (bodyFiles.length) {
      nested.push(bodyFiles.map((file) => createSourceFile(file)));
    }
    for (const file of uploadFiles) {
      post({ status: 'running', progress: 15, stage: `Expanding ${file.originalname || file.fieldname}` });
      nested.push(await expandUploadedFile(file));
    }

    const sourceFiles = nested.flat();
    if (!sourceFiles.length) {
      post({ status: 'failed', progress: 100, stage: 'Failed', error: 'No supported source files were provided.' });
      return;
    }

    post({ status: 'running', progress: 60, stage: `Analyzing ${sourceFiles.length} files` });
    const analysis = analyzeSolution(sourceFiles, { externalFindings });
    post({ status: 'running', progress: 90, stage: 'Saving result' });
    const record = await createFileStorage(storageDir).saveAnalysis(analysis);
    post({
      status: 'completed',
      progress: 100,
      stage: 'Completed',
      analysisId: record.id
    });
  } catch (error) {
    post({ status: 'failed', progress: 100, stage: 'Failed', error: error.message });
  } finally {
    await cleanupUploadFiles(workerData.uploadFiles);
  }
}

run();
