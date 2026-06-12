# Architecture

AI Architecture Reviewer is designed as a local-first analyzer that can grow into a full platform.

## Current MVP

```text
Browser
  React UI
  Upload / zip expansion
  Heuristic analyzer
  Scorecard engine
  JSON export
```

All analysis runs in the browser. This keeps the initial project simple, private, and easy to run.

## Target Platform

```text
Web App -> API -> Analysis Queue -> Worker Pool
                       |
                       +-> Static analyzers
                       +-> Rule engine
                       +-> Graph engine
                       +-> Optional AI recommendation provider

PostgreSQL stores users, projects, analyses, findings, and scorecards.
Object storage stores uploaded packages and generated reports.
Redis backs queue/cache behavior.
```

## Package Direction

Future versions should extract analyzer logic from `apps/web/src/main.jsx` into:

```text
packages/analyzer-core/
packages/shared-types/
packages/report-generator/
```

This will allow the same analysis engine to run in-browser, in a backend worker, or in a CLI.
