import { createRuleFinding } from './findings.js';
import { extractCalls, inferDatastores, inferServiceName } from './graphInference.js';
import { normalizeExternalFindings } from './externalFindings.js';
import { calculateScores } from './scorecard.js';
import { createRecommendations } from './recommendations.js';

export function analyzeSolution(sourceFiles, options = {}) {
  const readable = sourceFiles.filter((file) => file.text?.trim());
  const services = new Map();
  const datastoresByService = new Map();
  const edges = [];
  const findings = [];

  readable.forEach((file) => {
    const service = inferServiceName(file.name);
    if (!services.has(service)) services.set(service, { name: service, files: 0, lines: 0, calls: 0 });
    const stats = services.get(service);
    stats.files += 1;
    stats.lines += file.text.split(/\r?\n/).length;

    const stores = inferDatastores(file.text);
    if (!datastoresByService.has(service)) datastoresByService.set(service, new Set());
    stores.forEach((store) => datastoresByService.get(service).add(store));

    const calls = extractCalls(file.text);
    stats.calls += calls.length;
    calls.forEach((target) => edges.push({ from: service, to: target.replace(/^https?:\/\//, '').split(/[/:]/)[0] }));

    if (/(password|secret|apikey|api_key|accesskey|connectionstring)\s*[:=]\s*["'][^"']{6,}/i.test(file.text)) {
      createRuleFinding(findings, 'hardcoded-secret', file.name, 'High', 'High', 'Credential-like value found in source/config text.');
    }

    if (/(fetch\(|axios\.|httpclient\.|resttemplate|webclient|requests\.|http\.get|http\.post)/i.test(file.text) && !/(timeout|cancellationtoken|retry|polly|resilience|backoff)/i.test(file.text)) {
      createRuleFinding(findings, 'missing-timeouts-and-retries', file.name, 'High', 'Medium', 'Outbound calls are present without nearby timeout/retry policy hints.');
    }

    if (/openapi|swagger/i.test(file.name) && (file.text.match(/^\s*\/[a-z0-9_{}/-]+:/gim) || []).length > 25) {
      createRuleFinding(findings, 'overly-broad-api-surface', file.name, 'Medium', 'Medium', 'OpenAPI artifact exposes a large number of paths.');
    }

    if (stats.lines > 1200 && !/test|spec|mock/i.test(file.name)) {
      createRuleFinding(findings, 'low-modularity', file.name, 'Medium', 'Low', 'A large source artifact suggests too many responsibilities in one module.');
    }
  });

  const serviceNames = [...services.keys()];
  edges.forEach((edge) => {
    const targetService = serviceNames.find((name) => edge.to.includes(name) || name.includes(edge.to));
    if (targetService && targetService !== edge.from) {
      createRuleFinding(
        findings,
        'synchronous-service-chaining',
        `${edge.from} -> ${targetService}`,
        'High',
        'High',
        `Direct service reference detected: ${edge.to}`
      );
    }
  });

  const storeConsumers = new Map();
  datastoresByService.forEach((stores, service) => stores.forEach((store) => {
    const key = store.toLowerCase();
    if (!storeConsumers.has(key)) storeConsumers.set(key, new Set());
    storeConsumers.get(key).add(service);
  }));
  storeConsumers.forEach((consumers, store) => {
    if (consumers.size > 1) {
      createRuleFinding(
        findings,
        'shared-database-coupling',
        [...consumers].join(', '),
        'High',
        'Medium',
        `Multiple services appear to reference ${store}.`
      );
    }
  });

  if (serviceNames.length === 0 && readable.length > 0) {
    services.set('solution', {
      name: 'solution',
      files: readable.length,
      lines: readable.reduce((sum, file) => sum + file.text.split(/\r?\n/).length, 0),
      calls: edges.length
    });
  }

  const importedFindings = normalizeExternalFindings(options.externalFindings || [], 'external');
  findings.push(...importedFindings);

  const scores = calculateScores({ findings, edges, serviceCount: services.size });
  const recommendations = createRecommendations(findings);

  return {
    files: sourceFiles,
    services: [...services.values()],
    datastores: [...new Set([...datastoresByService.values()].flatMap((set) => [...set]))],
    edges,
    findings,
    recommendations,
    scores: scores.dimensions,
    overall: scores.overall,
    analyzedAt: new Date().toISOString()
  };
}
