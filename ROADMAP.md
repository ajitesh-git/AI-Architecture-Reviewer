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
