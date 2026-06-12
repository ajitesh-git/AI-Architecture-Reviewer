import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
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

test('CLI merges external analyzer report', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aar-cli-'));
  const externalReportPath = path.join(tempDir, 'external.json');
  fs.writeFileSync(externalReportPath, JSON.stringify({
    findings: [
      {
        ruleId: 'adr-missing',
        severity: 'High',
        name: 'Missing Architecture Decision Record',
        where: 'docs/architecture.md',
        evidence: 'No ADR found for payment provider decision.',
        recommendation: 'Capture the payment provider decision in an ADR.'
      }
    ]
  }), 'utf8');

  const result = spawnSync(process.execPath, [cliPath, samplePath, '--external-report', externalReportPath, '--format', 'json'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.findings.some((finding) => finding.ruleId === 'adr-missing'));
});
