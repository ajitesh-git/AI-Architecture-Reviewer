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
- `overly-broad-api-surface`
- `low-modularity`

## Future Rule Types

- Language-aware AST rules
- IaC rules using Checkov/tfsec style checks
- Kubernetes rules
- OpenAPI contract rules
- Dependency graph rules
- Organization-specific custom rules
