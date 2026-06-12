# CLI

The CLI lets contributors and users run architecture analysis without opening the web app.

## Analyze A Folder

```bash
npm run analyze -- examples/sample-microservices --format markdown --out report.md
```

## Analyze A Zip

```bash
npm run analyze -- solution.zip --format json --out report.json
```

## Output To Console

```bash
npm run analyze -- examples/sample-microservices --format json
```

## Notes

- The CLI skips binary artifacts, dependency folders, build output, and files larger than 2 MB.
- Uploaded or scanned code is not executed.
- The CLI uses `packages/analyzer-core`, the same engine used by the web app.
