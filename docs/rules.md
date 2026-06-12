# Rule Model

Rules identify architecture risks from uploaded artifacts.

## Rule Shape

```json
{
  "id": "missing-timeouts",
  "name": "Missing Timeouts and Retries",
  "severity": "High",
  "category": "resilience",
  "signals": ["outbound HTTP calls", "no timeout keyword nearby"],
  "recommendation": "Add explicit timeouts, retries with backoff, and circuit breakers."
}
```

## Current MVP Rules

- `hardcoded-secret`
- `missing-timeouts-and-retries`
- `synchronous-service-chaining`
- `shared-database-coupling`
- `cyclic-service-dependency`
- `stored-procedure-data-coupling`
- `overly-broad-api-surface`
- `low-modularity`

The executable MVP rule metadata is exported from `packages/analyzer-core`. The root `rules/` directory is reserved for shareable rule packs as the product grows.

## Future Rule Types

- Additional language-aware AST rules
- IaC rules using Checkov/tfsec style checks
- Kubernetes rules
- OpenAPI contract rules
- Additional dependency graph rules
- Organization-specific custom rules
