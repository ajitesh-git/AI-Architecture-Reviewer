# AI Architecture Reviewer

AI Architecture Reviewer is an open-source, local-first application for reviewing software architecture. Upload source/config artifacts or a `.zip` solution package, run analysis in the browser, detect architecture anti-patterns, receive improvement suggestions, and export a scorecard report.

## Current Status

This repository starts with a working web MVP:

- Upload multiple files or `.zip` archives.
- Parse source, IaC, OpenAPI, YAML, JSON, and configuration artifacts locally in the browser.
- Infer services, datastore references, and service-to-service calls.
- Detect architecture anti-patterns with deterministic heuristics.
- Generate risk counts, recommendations, and scorecard dimensions.
- Export analysis as JSON or Markdown.

No backend or AI provider is required for the MVP.

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

## Repository Layout

```text
apps/
  web/                  React + Vite web application
packages/
  analyzer-core/        Reusable analyzer, scoring, rules, reports, tests
docs/
  architecture.md        Product architecture and extension plan
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
