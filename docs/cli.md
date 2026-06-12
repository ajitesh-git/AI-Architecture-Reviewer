# CLI

The CLI lets contributors and users run architecture analysis without opening the web app.

## Analyze A Folder

```bash
npm run analyze -- examples/sample-microservices --format markdown --out report.md
```

## Analyze A Zip

```bash
npm run analyze -- solution.zip --format json --out report.json
```

## Merge External Scanner Findings

```bash
npm run analyze -- solution.zip --external-report semgrep.json --format markdown --out report.md
```

`--external-report` accepts JSON output from generic AI Architecture Reviewer findings, Semgrep-like `results`, Spectral-like `results`, and Checkov-like `failed_checks`. You can pass the flag more than once.

Generic format:

```json
{
  "findings": [
    {
      "ruleId": "adr-missing",
      "severity": "High",
      "name": "Missing Architecture Decision Record",
      "where": "docs/architecture.md",
      "evidence": "No ADR found for payment provider decision.",
      "recommendation": "Capture the payment provider decision in an ADR."
    }
  ]
}
```

## Output To Console

```bash
npm run analyze -- examples/sample-microservices --format json
```

## Notes

- The CLI skips binary artifacts, dependency folders, build output, and files larger than 2 MB.
- Uploaded or scanned code is not executed.
- The CLI uses `packages/analyzer-core`, the same engine used by the web app.
