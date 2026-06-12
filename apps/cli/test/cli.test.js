import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.resolve(testDir, '../src/index.js');
const samplePath = path.resolve(repoRoot, 'examples/sample-microservices');

test('CLI analyzes sample directory as markdown', () => {
  const result = spawnSync(process.execPath, [cliPath, samplePath, '--format', 'markdown'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /# Architecture Review Report/);
  assert.match(result.stdout, /Hardcoded Secret|Missing Timeouts/);
});

test('CLI prints usage for missing target', () => {
  const result = spawnSync(process.execPath, [cliPath], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Usage:/);
});
