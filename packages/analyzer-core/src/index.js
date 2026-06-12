export const SAMPLE_FILES = [
  {
    name: 'order-service/src/OrderClient.cs',
    size: 2140,
    text: 'public class OrderClient { var token = "secret-12345"; httpClient.GetAsync("http://payment-service/api/payments"); httpClient.GetAsync("http://inventory-service/api/items"); }'
  },
  {
    name: 'payment-service/app.js',
    size: 1850,
    text: 'const password = "p@ssw0rd"; fetch("http://inventory-service/reserve"); const db = "OrdersDb";'
  },
  {
    name: 'inventory-service/openapi.yaml',
    size: 1620,
    text: 'openapi: 3.0.0\npaths:\n  /items:\n  /stock:\n  /reserve:\ncomponents:\n  schemas:\n    Item: {}'
  },
  {
    name: 'infra/main.tf',
    size: 920,
    text: 'resource "aws_db_instance" "orders" { name = "OrdersDb" }\nresource "aws_db_instance" "payments" { name = "PaymentsDb" }'
  }
];

export const RULES = [
  {
    id: 'hardcoded-secret',
    name: 'Hardcoded Secret',
    severity: 'Critical',
    category: 'security',
    recommendation: 'Move secrets to a vault or cloud secrets manager and rotate exposed values.'
  },
  {
    id: 'missing-timeouts-and-retries',
    name: 'Missing Timeouts and Retries',
    severity: 'High',
    category: 'resilience',
    recommendation: 'Add explicit timeouts, retries with backoff, and circuit breakers on outbound integrations.'
  },
  {
    id: 'synchronous-service-chaining',
    name: 'Synchronous Service Chaining',
    severity: 'High',
    category: 'coupling',
    recommendation: 'Prefer asynchronous events or queues for cross-service workflows that do not require immediate consistency.'
  },
  {
    id: 'shared-database-coupling',
    name: 'Shared Database Coupling',
    severity: 'Critical',
    category: 'coupling',
    recommendation: 'Move ownership to one service and expose access through APIs/events instead of sharing the database.'
  },
  {
    id: 'overly-broad-api-surface',
    name: 'Overly Broad API Surface',
    severity: 'Medium',
    category: 'maintainability',
    recommendation: 'Group APIs by bounded context and split broad endpoints behind smaller contracts.'
  },
  {
    id: 'low-modularity',
    name: 'Low Modularity',
    severity: 'Medium',
    category: 'maintainability',
    recommendation: 'Split large modules by command/query, domain service, or infrastructure boundary.'
  }
];

const severityWeight = { Critical: 18, High: 11, Medium: 6, Low: 3 };

function getRule(id) {
  return RULES.find((rule) => rule.id === id);
}

export function inferServiceName(path) {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  const parts = normalized.split('/');
  const hit = parts.find((part) => /service|api|worker|frontend|backend|gateway/.test(part));
  if (hit) return hit.replace(/\.(csproj|sln|json|yaml|yml|tf|js|ts|java|py)$/g, '');
  const file = parts.at(-1)?.replace(/\.[^.]+$/, '') || 'solution';
  return file.includes('-') || file.includes('_') ? file : parts[0] || file;
}

export function inferDatastores(text) {
  const stores = new Set();
  const patterns = [
    /(?:database|db|dbname|initial catalog|catalog)\s*[:=]\s*["']?([a-z0-9_-]{3,})/gi,
    /(?:mongodb|postgres|postgresql|mysql|sqlserver|redis|dynamodb|cosmosdb|oracle|mssql)/gi,
    /resource\s+"(?:aws_db_instance|azurerm_(?:mssql|postgresql|mysql)|google_sql_database_instance)"/gi
  ];
  patterns.forEach((pattern) => {
    for (const match of text.matchAll(pattern)) stores.add((match[1] || match[0]).replace(/["']/g, '').slice(0, 40));
  });
  return [...stores];
}

export function extractCalls(text) {
  const calls = [];
  const httpPattern = /(https?:\/\/[a-z0-9_.:-]+\/?[^\s"'`)<>]*)/gi;
  for (const match of text.matchAll(httpPattern)) calls.push(match[1]);
  const serviceRef = /\b([a-z0-9-]+-service)\b/gi;
  for (const match of text.matchAll(serviceRef)) calls.push(match[1]);
  return [...new Set(calls)];
}

function addFinding(findings, ruleId, where, impact, confidence, evidence, override = {}) {
  const rule = getRule(ruleId);
  findings.push({
    id: `${ruleId}-${where}-${findings.length}`,
    ruleId,
    severity: rule.severity,
    name: rule.name,
    where,
    impact,
    confidence,
    evidence,
    recommendation: rule.recommendation,
    ...override
  });
}

export function analyzeSolution(sourceFiles) {
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
      addFinding(findings, 'hardcoded-secret', file.name, 'High', 'High', 'Credential-like value found in source/config text.');
    }

    if (/(fetch\(|axios\.|httpclient\.|resttemplate|webclient|requests\.|http\.get|http\.post)/i.test(file.text) && !/(timeout|cancellationtoken|retry|polly|resilience|backoff)/i.test(file.text)) {
      addFinding(findings, 'missing-timeouts-and-retries', file.name, 'High', 'Medium', 'Outbound calls are present without nearby timeout/retry policy hints.');
    }

    if (/openapi|swagger/i.test(file.name) && (file.text.match(/^\s*\/[a-z0-9_{}/-]+:/gim) || []).length > 25) {
      addFinding(findings, 'overly-broad-api-surface', file.name, 'Medium', 'Medium', 'OpenAPI artifact exposes a large number of paths.');
    }

    if (stats.lines > 1200 && !/test|spec|mock/i.test(file.name)) {
      addFinding(findings, 'low-modularity', file.name, 'Medium', 'Low', 'A large source artifact suggests too many responsibilities in one module.');
    }
  });

  const serviceNames = [...services.keys()];
  edges.forEach((edge) => {
    const targetService = serviceNames.find((name) => edge.to.includes(name) || name.includes(edge.to));
    if (targetService && targetService !== edge.from) {
      addFinding(
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
      addFinding(
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

export function calculateScores({ findings, edges, serviceCount }) {
  const totalPenalty = findings.reduce((sum, finding) => sum + severityWeight[finding.severity], 0);
  const dimensions = {
    Coupling: Math.max(10, 92 - findings.filter((f) => /Coupling|Chaining/.test(f.name)).length * 16 - Math.max(0, edges.length - serviceCount) * 2),
    Resilience: Math.max(10, 88 - findings.filter((f) => /Timeout|Chaining/.test(f.name)).length * 14),
    Maintainability: Math.max(10, 90 - findings.filter((f) => /Modularity|Broad/.test(f.name)).length * 14 - Math.max(0, serviceCount - 8) * 2),
    Security: Math.max(10, 94 - findings.filter((f) => /Secret|Database/.test(f.name)).length * 22),
    Scalability: Math.max(10, 86 - findings.filter((f) => /Chaining|Database|Broad/.test(f.name)).length * 10)
  };
  return {
    dimensions,
    overall: Math.max(10, Math.round(Object.values(dimensions).reduce((sum, value) => sum + value, 0) / 5 - Math.max(0, totalPenalty - 30) / 10))
  };
}

export function createRecommendations(findings) {
  return [...new Map(findings.map((finding) => [finding.recommendation, {
    title: finding.name
      .replace('Missing Timeouts and Retries', 'Add Timeouts and Retries')
      .replace('Hardcoded Secret', 'Centralize Secrets Management'),
    text: finding.recommendation,
    severity: finding.severity
  }])).values()];
}

export function createJsonReport(analysis) {
  return JSON.stringify(analysis, null, 2);
}

export function createMarkdownReport(analysis) {
  const scoreRows = Object.entries(analysis.scores)
    .map(([name, score]) => `| ${name} | ${score}/100 |`)
    .join('\n');
  const findingRows = analysis.findings
    .map((finding) => `| ${finding.severity} | ${finding.name} | ${finding.where} | ${finding.recommendation} |`)
    .join('\n');
  const recommendationRows = analysis.recommendations
    .map((recommendation) => `- **${recommendation.title}** (${recommendation.severity}): ${recommendation.text}`)
    .join('\n');

  return `# Architecture Review Report

Generated: ${analysis.analyzedAt}

## Summary

- Artifacts analyzed: ${analysis.files.length}
- Services inferred: ${analysis.services.length}
- Datastores inferred: ${analysis.datastores.length}
- Findings: ${analysis.findings.length}
- Overall score: ${analysis.overall}/100

## Scorecard

| Dimension | Score |
| --- | --- |
${scoreRows}

## Findings

| Severity | Finding | Where | Recommendation |
| --- | --- | --- | --- |
${findingRows || '| - | No findings | - | - |'}

## Recommendations

${recommendationRows || 'No recommendations generated.'}
`;
}
