# External Analyzer Imports

AI Architecture Reviewer has deterministic built-in architecture heuristics, but real product use needs to combine those results with specialist scanners. The analyzer core now supports imported findings so teams can merge security, IaC, API contract, and policy checks into one architecture scorecard.

## Supported Shapes

- Generic `findings` array with `ruleId`, `severity`, `name`, `where`, `evidence`, and `recommendation`.
- Semgrep-like `results` with `check_id`, `path`, and `extra`.
- Spectral-like `results` arrays with `code`, `path`, `message`, and numeric `severity`.
- Checkov-like `results.failed_checks`.

## Web App

Upload scanner JSON in the Scanner Reports panel after uploading solution artifacts. Server mode sends imported findings to the API. Local mode scores the same findings in the browser.

## CLI

```bash
npm run analyze -- solution.zip --external-report semgrep.json --external-report checkov.json --format markdown --out report.md
```

## API

```json
{
  "files": [
    {
      "name": "service/app.js",
      "text": "fetch(\"http://inventory-service/reserve\");"
    }
  ],
  "externalReports": [
    {
      "findings": [
        {
          "ruleId": "adr-missing",
          "severity": "High",
          "name": "Missing Architecture Decision Record",
          "where": "docs/architecture.md",
          "recommendation": "Capture material architecture decisions as ADRs."
        }
      ]
    }
  ]
}
```

## Why This Matters

This is the practical path for reducing today's analyzer limitation without pretending one heuristic engine can understand every stack. The product can now start as an architecture reviewer and become an orchestration layer for more specialized analyzers.
