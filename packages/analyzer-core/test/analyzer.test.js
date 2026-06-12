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
  assert.ok(analysis.dependencies.some((dependency) => dependency.type === 'call'));
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

test('parses AST summaries for supported language set', () => {
  const files = [
    { name: 'src/Orders.cs', text: 'using System; namespace Sales; public class Orders { public void Save() { Console.WriteLine("ok"); } }' },
    { name: 'db/report.sql', text: 'SELECT o.Id FROM dbo.Orders o JOIN dbo.Customers c ON c.Id = o.CustomerId;' },
    { name: 'db/reconcile.tsql', text: 'CREATE OR ALTER PROC dbo.Reconcile AS BEGIN UPDATE dbo.Accounts SET Balance = 0; END' },
    { name: 'db/load.proc', text: 'CREATE PROCEDURE load_orders AS SELECT * FROM orders;' },
    { name: 'web/app.ts', text: 'import { api } from "./api"; interface Order { id: string } export function load() { return api.get(); }' },
    { name: 'web/app.js', text: 'const http = require("http"); class Server { start() { listen(); } }' },
    { name: 'config/app.json', text: '{"service":{"name":"orders","ports":[80,443]}}' }
  ];

  const analysis = analyzeSolution(files);
  const byFile = new Map(analysis.asts.map((ast) => [ast.file, ast]));

  assert.equal(byFile.get('src/Orders.cs').language, 'csharp');
  assert.equal(byFile.get('db/report.sql').language, 'sql');
  assert.equal(byFile.get('db/reconcile.tsql').language, 'tsql');
  assert.equal(byFile.get('db/load.proc').language, 'procedure-sql');
  assert.equal(byFile.get('web/app.ts').language, 'typescript');
  assert.equal(byFile.get('web/app.js').language, 'javascript');
  assert.equal(byFile.get('config/app.json').language, 'json');
  assert.ok(byFile.get('config/app.json').summary.properties >= 3);
  assert.ok(byFile.get('web/app.ts').nodes.some((node) => node.type === 'InterfaceDeclaration'));
  assert.ok(byFile.get('db/load.proc').nodes.some((node) => node.type === 'ProcedureDeclaration'));
});

test('uses AST nodes to infer architecture dependencies', () => {
  const analysis = analyzeSolution([
    {
      name: 'order-service/src/client.ts',
      text: 'import paymentClient from "../payment-service/client"; export function submit() { return paymentClient.reserve(); }'
    },
    {
      name: 'billing-service/db/reconcile.proc',
      text: 'CREATE PROCEDURE dbo.Reconcile AS BEGIN EXEC dbo.LoadInvoices; SELECT * FROM dbo.InvoiceLedger; END'
    },
    {
      name: 'catalog-service/src/CatalogClient.cs',
      text: 'public class CatalogClient { public void Sync() { PaymentServiceClient.Reserve(); } }'
    }
  ]);

  assert.ok(analysis.dependencies.some((item) => item.type === 'module' && item.to === 'payment-service'));
  assert.ok(analysis.dependencies.some((item) => item.type === 'procedure' && item.to === 'dbo.LoadInvoices'));
  assert.ok(analysis.dependencies.some((item) => item.type === 'datastore' && item.to === 'dbo.InvoiceLedger'));
  assert.ok(analysis.datastores.includes('dbo.InvoiceLedger'));
  assert.ok(analysis.edges.some((edge) => edge.from === 'order-service' && edge.to === 'payment-service'));
});
