# API

The API provides the first server-side product backbone for AI Architecture Reviewer.

## Start

```bash
npm run dev:api
```

Default URL:

```text
http://127.0.0.1:8080
```

## Endpoints

### Health

```http
GET /health
```

### Create Analysis

JSON source files:

```http
POST /api/analyses
Content-Type: application/json

{
  "files": [
    {
      "name": "payment-service/app.js",
      "text": "const password = \"sample-secret\";"
    }
  ]
}
```

Multipart upload:

```bash
curl -F "files=@solution.zip" http://127.0.0.1:8080/api/analyses
```

### Create Background Analysis Job

Large repositories should use the job API. The request returns immediately with a job id, then the UI or client polls status until the result is ready.

```bash
curl -F "files=@solution.zip" http://127.0.0.1:8080/api/analysis-jobs
```

```http
GET /api/analysis-jobs/:id
GET /api/analysis-jobs/:id/result
```

Job statuses:

- `queued`
- `running`
- `completed`
- `failed`

The job result endpoint returns a lightweight summary with the first page of findings, dependencies, and files. Use the paginated analysis endpoints for larger result sets.

With external analyzer findings:

```http
POST /api/analyses
Content-Type: application/json

{
  "files": [
    {
      "name": "payment-service/app.js",
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

The API also accepts `externalFindings` when callers already normalized findings. `externalReports` supports generic findings plus Semgrep-like, Spectral-like, and Checkov-like JSON shapes.

### List Analyses

```http
GET /api/analyses
```

### Get Analysis

```http
GET /api/analyses/:id
GET /api/analyses/:id/summary
GET /api/analyses/:id/findings?page=1&pageSize=50
GET /api/analyses/:id/dependencies?page=1&pageSize=50
GET /api/analyses/:id/files?page=1&pageSize=50
```

### Export Report

```http
GET /api/analyses/:id/report.json
GET /api/analyses/:id/report.md
```

## Persistence

The default development storage writes JSON records under `storage/analyses`. This is intentionally simple for the open-source MVP. The next production step is replacing it with PostgreSQL plus object storage.

## Web Client

The React app uses the API when `Server` execution mode is selected. Configure the API base URL with:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8080
```

If the API is unavailable, the web app can still run local browser analysis.
