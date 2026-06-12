#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import JSZip from 'jszip';
import {
  analyzeSolution,
  createJsonReport,
  createMarkdownReport,
  createSourceFile,
  isIgnoredPath,
  isSupportedTextArtifact
} from '@ai-architecture-reviewer/analyzer-core';

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function usage() {
  return `AI Architecture Reviewer CLI

Usage:
  npm run analyze -- <path> [--format json|markdown] [--out report.json|report.md]

Examples:
  npm run analyze -- examples/sample-microservices --format markdown --out report.md
  npm run analyze -- solution.zip --format json
`;
}

function parseArgs(argv) {
  const args = [...argv];
  const options = { format: 'json', out: null, target: null };
  while (args.length) {
    const arg = args.shift();
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--format') options.format = args.shift();
    else if (arg === '--out') options.out = args.shift();
    else if (!options.target) options.target = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  if (!['json', 'markdown'].includes(options.format)) {
    throw new Error('--format must be json or markdown');
  }
  return options;
}

async function collectPath(targetPath, rootPath = targetPath) {
  const stats = await fs.stat(targetPath);
  if (stats.isDirectory()) {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const nested = [];
    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);
      const relative = path.relative(rootPath, fullPath);
      if (isIgnoredPath(relative)) continue;
      nested.push(...await collectPath(fullPath, rootPath));
    }
    return nested;
  }

  const relativeName = path.relative(rootPath, targetPath) || path.basename(targetPath);
  if (!isSupportedTextArtifact(relativeName) || stats.size > MAX_FILE_BYTES) return [];

  const text = await fs.readFile(targetPath, 'utf8').catch(() => '');
  return [createSourceFile({ name: relativeName.replace(/\\/g, '/'), size: stats.size, text })];
}

async function collectZip(targetPath) {
  const buffer = await fs.readFile(targetPath);
  const zip = await JSZip.loadAsync(buffer);
  const files = [];
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir || isIgnoredPath(name) || !isSupportedTextArtifact(name)) continue;
    const text = await entry.async('string').catch(() => '');
    if (text.length > MAX_FILE_BYTES) continue;
    files.push(createSourceFile({ name, size: text.length, text }));
  }
  return files;
}

async function collectSourceFiles(target) {
  const commandRoot = process.env.INIT_CWD || process.cwd();
  const resolved = path.isAbsolute(target) ? target : path.resolve(commandRoot, target);
  if (/\.zip$/i.test(resolved)) return collectZip(resolved);
  return collectPath(resolved);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.target) {
    process.stdout.write(usage());
    process.exit(options.help ? 0 : 1);
  }

  const sourceFiles = await collectSourceFiles(options.target);
  if (!sourceFiles.length) {
    throw new Error('No supported text artifacts found to analyze.');
  }

  const analysis = analyzeSolution(sourceFiles);
  const report = options.format === 'markdown'
    ? createMarkdownReport(analysis)
    : createJsonReport(analysis);

  if (options.out) {
    const commandRoot = process.env.INIT_CWD || process.cwd();
    const outputPath = path.isAbsolute(options.out) ? options.out : path.resolve(commandRoot, options.out);
    await fs.writeFile(outputPath, report, 'utf8');
    process.stdout.write(`Wrote ${options.format} report to ${options.out}\n`);
  } else {
    process.stdout.write(`${report}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n\n${usage()}`);
  process.exit(1);
});
