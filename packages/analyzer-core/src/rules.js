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

export function getRule(id) {
  return RULES.find((rule) => rule.id === id);
}
