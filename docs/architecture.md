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

## Current Backend Slice

`apps/api` is the first product backend. It supports:

- `POST /api/analyses` for JSON and multipart uploads
- `.zip` expansion
- server-side analyzer execution through `packages/analyzer-core`
- persisted JSON scan records
- analysis history
- JSON and Markdown report endpoints

## Package Direction

Analyzer logic now lives in `packages/analyzer-core` so the same engine can be reused by the browser app, a future backend worker, or a CLI.

```text
packages/analyzer-core/
packages/shared-types/
packages/report-generator/
```

Future packages should add shared API contracts and report rendering beyond the current JSON/Markdown exports.
