import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAMPLE_FILES,
  analyzeSolution,
  createMarkdownReport,
  extractCalls,
  inferServiceName
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
