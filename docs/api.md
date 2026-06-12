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

### List Analyses

```http
GET /api/analyses
```

### Get Analysis

```http
GET /api/analyses/:id
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
