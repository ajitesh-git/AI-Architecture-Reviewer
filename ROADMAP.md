# Roadmap

## v0.1 Local MVP

- Browser-based upload and `.zip` analysis
- Architecture anti-pattern detection
- Scorecard generation
- Recommendation generation
- JSON report export
- Sample solution and GitHub-ready project structure

## v0.2 Analyzer Core

- Move analyzer logic into a shared package
- Add unit tests for rules and scoring
- Add rule registry and rule metadata
- Add Markdown report export
- Improve graph extraction

Status: in progress. `packages/analyzer-core` now owns the MVP analyzer, rule metadata, scoring helpers, sample data, JSON export, Markdown export, and baseline tests.

Additional progress: `apps/cli` now runs the shared analyzer against local folders or zip files and can output JSON or Markdown reports.

Additional progress: `apps/api` now provides server-side analysis, multipart/JSON ingestion, persisted scan records, analysis history, and JSON/Markdown report endpoints.

Additional progress: `apps/web` can now run server-side analysis through the API, show persisted analysis history, and fall back to local analysis if the API is unavailable.

## v0.3 Backend Worker

- Add API service
- Add background worker
- Add PostgreSQL persistence
- Add object storage abstraction
- Add analysis history

## v0.4 Integrations

- GitHub repository import
- GitLab repository import
- Azure DevOps repository import
- Jira/Azure Boards ticket creation

## v0.5 AI-Assisted Review

- Optional AI provider interface
- OpenAI/Azure OpenAI/Ollama adapters
- RAG over architecture standards
- AI-generated ADR suggestions
