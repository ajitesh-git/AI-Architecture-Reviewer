import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAMPLE_FILES,
  analyzeSolution,
  createMarkdownReport,
  extractCalls,
  inferServiceName,
  isIgnoredPath,
  isSupportedTextArtifact,
  normalizeExternalReport
} from '../src/index.js';

test('infers service name from common path segments', () => {
  assert.equal(inferServiceName('src/order-service/OrderClient.cs'), 'order-service');
});

test('extracts service calls from URLs and service references', () => {
  const calls = extractCalls('fetch("http://payment-service/api"); inventory-service.reserve();');
  assert.ok(calls.includes('http://payment-service/api'));
  assert.ok(calls.includes('inventory-service'));
});

test('analyzes sample solution and returns findings and scores', () => {
  const analysis = analyzeSolution(SAMPLE_FILES);
  assert.equal(analysis.files.length, 4);
  assert.ok(analysis.services.length >= 3);
  assert.ok(analysis.findings.some((finding) => finding.ruleId === 'hardcoded-secret'));
  assert.ok(analysis.findings.some((finding) => finding.ruleId === 'missing-timeouts-and-retries'));
  assert.ok(analysis.overall > 0);
});

test('creates markdown report', () => {
  const report = createMarkdownReport(analyzeSolution(SAMPLE_FILES));
  assert.match(report, /# Architecture Review Report/);
  assert.match(report, /## Scorecard/);
  assert.match(report, /Hardcoded Secret|Centralize Secrets Management/);
});

test('identifies ignored and unsupported artifacts', () => {
  assert.equal(isIgnoredPath('node_modules/pkg/index.js'), true);
  assert.equal(isIgnoredPath('src/index.js'), false);
  assert.equal(isSupportedTextArtifact('diagram.png'), false);
  assert.equal(isSupportedTextArtifact('infra/main.tf'), true);
});

test('imports external analyzer findings into scorecard', () => {
  const externalFindings = normalizeExternalReport({
    results: [
      {
        check_id: 'semgrep.javascript.express.security.audit.express-open-redirect',
        path: 'apps/api/src/routes.js',
        extra: {
          severity: 'ERROR',
          message: 'Possible open redirect from user-controlled input.',
          metadata: {
            impact: 'High',
            confidence: 'Medium',
            recommendation: 'Validate redirect targets against an allow list.'
          }
        }
      }
    ]
  }, 'semgrep');

  const analysis = analyzeSolution(SAMPLE_FILES, { externalFindings });
  const imported = analysis.findings.find((finding) => finding.source === 'semgrep');

  assert.equal(imported.severity, 'Critical');
  assert.equal(imported.where, 'apps/api/src/routes.js');
  assert.match(imported.evidence, /open redirect/);
  assert.ok(analysis.recommendations.some((recommendation) => recommendation.source === 'semgrep'));
});
