# Desktop App

AI Architecture Reviewer can ship as a desktop app through Electron without rewriting the product.

## Architecture

```text
Electron main process
  starts local Express API on 127.0.0.1:{dynamic-port}
  stores analysis data under the app userData folder
  opens the React web UI

Electron renderer
  reuses apps/web
  receives the local API URL through preload

Analyzer
  reuses apps/api and packages/analyzer-core
  runs background analysis jobs in worker threads
```

## Development

Install dependencies after cloning or after adding the desktop workspace:

```bash
npm install
```

Build the web UI first:

```bash
npm run build
```

Start the desktop shell:

```bash
npm run dev:desktop
```

For desktop development against the Vite dev server:

```bash
npm run dev
set AAR_DESKTOP_DEV_SERVER=http://127.0.0.1:5173
npm run dev:desktop
```

## Packaging

The initial Windows packaging command is:

```bash
npm run build:desktop
```

This uses `electron-builder` from `apps/desktop`.

## Production Hardening Still Needed

- Code signing for Windows/macOS.
- Auto-update channel.
- Installer branding/icons.
- Better packaged-path validation.
- Desktop crash logging.
- Optional native file picker integration.
- Security review for local API binding and preload surface.
