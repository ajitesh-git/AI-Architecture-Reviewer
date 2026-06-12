# AI Architecture Reviewer

AI Architecture Reviewer is an open-source, local-first application for reviewing software architecture. Upload source/config artifacts or a `.zip` solution package, run analysis in the browser, detect architecture anti-patterns, receive improvement suggestions, and export a scorecard report.

## Current Status

This repository starts with a working web MVP:

- Upload multiple files or `.zip` archives.
- Parse source, IaC, OpenAPI, YAML, JSON, and configuration artifacts locally in the browser.
- Infer services, datastore references, and service-to-service calls.
- Produce compact AST summaries for C#, SQL/T-SQL/proc, TypeScript, JavaScript, and JSON files.
- Detect architecture anti-patterns with deterministic heuristics.
- Merge findings from external scanners or policy tools into the same scorecard.
- Generate risk counts, recommendations, and scorecard dimensions.
- Export analysis as JSON or Markdown.

No backend or AI provider is required for the MVP.

The repository now also includes a backend API for server-side analysis and persisted scan history.

## Quick Start

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173
```

To build the production app:

```bash
npm run build
```

## API Usage

Start the backend service:

```bash
npm run dev:api
```

Analyze JSON source artifacts:

```bash
curl -X POST http://127.0.0.1:8080/api/analyses \
  -H "Content-Type: application/json" \
  -d "{\"files\":[{\"name\":\"payment-service/app.js\",\"text\":\"const password = \\\"sample-secret\\\";\"}]}"
```

Analyze a zip upload:

```bash
curl -F "files=@solution.zip" http://127.0.0.1:8080/api/analyses
```

## Web + API Mode

The web app can run analysis in two modes:

- `Server`: sends parsed artifacts to `VITE_API_BASE_URL`, persists the scan, and shows analysis history.
- `Local`: runs analysis fully in the browser.

Start both services in separate terminals:

```bash
npm run dev:api
npm run dev
```

Set a custom API URL with:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8080 npm run dev
```

## CLI Usage

Analyze a local folder or `.zip` file from the terminal:

```bash
npm run analyze -- examples/sample-microservices --format markdown --out report.md
```

Merge external analyzer output into the architecture report:

```bash
npm run analyze -- solution.zip --external-report semgrep.json --format markdown --out report.md
```

Supported formats:

- `json`
- `markdown`

If `--out` is omitted, the report is printed to stdout.

## Repository Layout

```text
apps/
  web/                  React + Vite web application
  api/                  Express API for server-side analysis and persisted history
  cli/                  Node CLI for local folder and zip analysis
packages/
  analyzer-core/        Reusable analyzer, scoring, rules, reports, tests
docs/
  architecture.md        Product architecture and extension plan
  ast.md                 Supported language AST extraction
  external-analyzers.md  External scanner import formats
  frontend.md            Web app file boundaries
  rules.md               Anti-pattern rule model
  scoring.md             Scorecard model
examples/
  sample-microservices/  Example solution for testing uploads
rules/
  architecture/          Initial rule metadata
docker/
  web.Dockerfile         Static web image
```

## Supported Inputs

The MVP reads text-like architecture and engineering artifacts:

- `.zip` files
- Source files such as `.cs`, `.js`, `.ts`, `.java`, `.py`
- OpenAPI/Swagger files
- YAML/JSON/XML config
- Terraform and cloud templates
- PlantUML or architecture diagrams as text

Binary files are skipped during zip expansion.

## Initial Anti-Patterns

- Hardcoded secrets
- Missing timeouts and retries
- Synchronous service chaining
- Shared database coupling
- Overly broad API surfaces
- Low modularity in large source artifacts

See [docs/rules.md](docs/rules.md) for the rule model.

## Privacy

The current MVP performs analysis locally in the browser. Uploaded code is not sent to a server or AI provider.

Future AI integrations should be opt-in, provider-configurable, and documented clearly.

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
