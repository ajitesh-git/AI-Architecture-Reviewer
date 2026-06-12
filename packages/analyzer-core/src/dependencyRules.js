import { createRuleFinding } from './findings.js';

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function serviceLike(value) {
  return /service|api|gateway|worker|backend|frontend/i.test(value);
}

function uniqueKey(parts) {
  return parts.map((part) => normalizeName(part)).join('::');
}

export function addCyclicDependencyFindings(findings, dependencies) {
  const edges = dependencies
    .filter((dependency) => ['call', 'module'].includes(dependency.type))
    .filter((dependency) => serviceLike(dependency.from) && serviceLike(dependency.to))
    .map((dependency) => ({ from: dependency.from, to: dependency.to, file: dependency.file }));

  const reported = new Set();
  edges.forEach((edge) => {
    const reverse = edges.find((candidate) => normalizeName(candidate.from) === normalizeName(edge.to) && normalizeName(candidate.to) === normalizeName(edge.from));
    if (!reverse) return;

    const key = [normalizeName(edge.from), normalizeName(edge.to)].sort().join('<->');
    if (reported.has(key)) return;
    reported.add(key);

    createRuleFinding(
      findings,
      'cyclic-service-dependency',
      `${edge.from} <-> ${edge.to}`,
      'High',
      'Medium',
      `Bidirectional dependency evidence found in ${edge.file || 'analysis'} and ${reverse.file || 'analysis'}.`
    );
  });
}

export function addStoredProcedureCouplingFindings(findings, dependencies) {
  const bySource = new Map();
  dependencies.forEach((dependency) => {
    if (!bySource.has(dependency.from)) bySource.set(dependency.from, []);
    bySource.get(dependency.from).push(dependency);
  });

  const reported = new Set();
  bySource.forEach((items, source) => {
    const procedureCalls = items.filter((dependency) => dependency.type === 'procedure');
    const datastores = [...new Set(items.filter((dependency) => dependency.type === 'datastore').map((dependency) => dependency.to))];
    if (procedureCalls.length === 0 || datastores.length < 2) return;

    const key = uniqueKey([source, ...datastores]);
    if (reported.has(key)) return;
    reported.add(key);

    createRuleFinding(
      findings,
      'stored-procedure-data-coupling',
      source,
      'High',
      'Medium',
      `Stored procedure calls are coupled to multiple data objects: ${datastores.slice(0, 5).join(', ')}.`
    );
  });
}

export function addDependencyRuleFindings(findings, dependencies) {
  addCyclicDependencyFindings(findings, dependencies);
  addStoredProcedureCouplingFindings(findings, dependencies);
}
