import { normalizeExternalReport } from '@ai-architecture-reviewer/analyzer-core';

async function readJson(file) {
  const text = await file.text();
  return JSON.parse(text);
}

export async function readExternalReports(fileList) {
  const reports = [];
  const findings = [];

  for (const file of fileList) {
    const parsed = await readJson(file);
    const source = file.name.replace(/\.[^.]+$/, '') || 'external-report';
    const normalizedFindings = normalizeExternalReport(parsed, source);
    reports.push({
      name: file.name,
      size: file.size,
      source,
      findings: normalizedFindings.length
    });
    findings.push(...normalizedFindings);
  }

  return { reports, findings };
}
