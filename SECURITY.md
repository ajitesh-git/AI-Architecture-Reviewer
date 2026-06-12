# Security Policy

## Reporting Vulnerabilities

Please report security issues privately by opening a GitHub security advisory or contacting the maintainers through the repository security contact once configured.

Do not disclose vulnerabilities publicly until maintainers have had time to investigate and release a fix.

## Handling Uploaded Code

The MVP runs analysis locally in the browser and does not upload code to a backend.

Future server-side analysis must follow these principles:

- Do not execute uploaded code.
- Isolate analysis workers.
- Apply file size and scan time limits.
- Block zip path traversal.
- Redact secrets in UI, logs, and reports.
- Make AI provider usage opt-in.
- Document data retention and deletion behavior.
