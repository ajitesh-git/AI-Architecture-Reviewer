# Frontend Structure

The web app is organized by responsibility instead of putting product behavior in one file.

```text
apps/web/src/
  App.jsx                    state orchestration and page composition
  main.jsx                   React render entrypoint
  components/
    layout/                  shell, rail, top bar, tabs
    score/                   reusable scorecard primitives
  features/
    analysis/                analysis controls and execution status
    architecture/            architecture graph preview
    dependencies/            dependency evidence table
    findings/                findings table and risk summary
                              finding detail panel and selected finding workflow
    history/                 persisted server scan history
    recommendations/         improvement recommendation panel
    upload/                  solution upload and external scanner report panels
  services/
    apiClient.js             backend API calls
    externalReports.js       scanner report parsing and finding normalization
    reportDownload.js        JSON/Markdown browser exports
    uploadReader.js          browser file and zip expansion
  utils/
    format.js                shared formatting helpers
```

New UI work should land in the relevant feature folder. Cross-feature behavior should go into `services/`, shared display primitives into `components/`, and domain analysis logic into `packages/analyzer-core`.

## External Scanner Reports

The web app lets users upload scanner JSON separately from solution artifacts. Reports are parsed in `services/externalReports.js`, normalized by `packages/analyzer-core`, and sent to the API as `externalFindings` in server mode. Local mode passes the same findings directly into the browser analyzer.
