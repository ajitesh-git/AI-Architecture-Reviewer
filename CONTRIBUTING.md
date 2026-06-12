# Contributing

Thanks for helping improve AI Architecture Reviewer.

## Development Setup

```bash
npm install
npm run dev
```

The current MVP is a local-first React application in `apps/web`.

## Good First Contributions

- Add architecture anti-pattern rules.
- Improve scorecard formulas.
- Add sample projects under `examples/`.
- Improve parsing for specific languages or frameworks.
- Add tests around analyzer behavior.
- Improve accessibility and responsive UI.

## Pull Request Checklist

- Keep uploads and sample artifacts free of secrets.
- Add or update docs when changing rules or scoring.
- Run `npm run build` before opening a PR.
- Keep rule behavior deterministic unless explicitly adding an opt-in AI provider.

## Rule Contributions

Rules should include:

- Name
- Description
- Severity
- Detection signal
- Evidence shown to the user
- Recommendation
- Scorecard dimensions affected

See `rules/architecture/initial-rules.json`.
