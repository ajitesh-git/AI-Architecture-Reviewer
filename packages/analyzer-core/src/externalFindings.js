import { createExternalFinding } from './findings.js';

const severityByNumber = {
  0: 'Critical',
  1: 'High',
  2: 'Medium',
  3: 'Low',
  4: 'Low'
};

function normalizeSeverity(value) {
  if (value === undefined || value === null || value === '') return 'Medium';
  if (typeof value === 'number') return severityByNumber[value] || 'Medium';
  const normalized = String(value).toLowerCase();
  if (['critical', 'error'].includes(normalized)) return 'Critical';
  if (['high', 'warning', 'warn'].includes(normalized)) return 'High';
  if (['medium', 'moderate'].includes(normalized)) return 'Medium';
  if (['low', 'info', 'informational'].includes(normalized)) return 'Low';
  return 'Medium';
}

function normalizeGenericFinding(finding, source, index) {
  return createExternalFinding({
    id: finding.id,
    source: finding.source || source,
    ruleId: finding.ruleId || finding.checkId || finding.code,
    severity: normalizeSeverity(finding.severity),
    name: finding.name || finding.title || finding.message,
    where: finding.where || finding.path || finding.file,
    impact: finding.impact,
    confidence: finding.confidence,
    evidence: finding.evidence || finding.message,
    recommendation: finding.recommendation || finding.guideline
  }, index);
}

function normalizeSemgrepResult(result, source, index) {
  return createExternalFinding({
    source,
    ruleId: result.check_id,
    severity: normalizeSeverity(result.extra?.severity),
    name: result.extra?.metadata?.shortlink || result.check_id,
    where: result.path,
    impact: result.extra?.metadata?.impact,
    confidence: result.extra?.metadata?.confidence,
    evidence: result.extra?.message || result.extra?.lines,
    recommendation: result.extra?.metadata?.fix || result.extra?.metadata?.recommendation
  }, index);
}

function normalizeSpectralResult(result, source, index) {
  return createExternalFinding({
    source,
    ruleId: result.code,
    severity: normalizeSeverity(result.severity),
    name: result.code || result.message,
    where: Array.isArray(result.path) ? result.path.join('.') : result.path,
    evidence: result.message,
    recommendation: result.documentationUrl ? `Review ${result.documentationUrl} and update the API contract.` : undefined
  }, index);
}

function normalizeCheckovResult(result, source, index) {
  return createExternalFinding({
    source,
    ruleId: result.check_id,
    severity: normalizeSeverity(result.severity || 'High'),
    name: result.check_name,
    where: result.file_path,
    evidence: result.check_name,
    recommendation: result.guideline
  }, index);
}

export function normalizeExternalFindings(findings = [], source = 'external') {
  return findings.map((finding, index) => normalizeGenericFinding(finding, source, index));
}

export function normalizeExternalReport(report, source = 'external') {
  if (!report) return [];
  if (Array.isArray(report)) {
    return report.map((result, index) => normalizeSpectralResult(result, source, index));
  }
  if (Array.isArray(report.findings)) {
    return normalizeExternalFindings(report.findings, source);
  }
  if (Array.isArray(report.results)) {
    return report.results.map((result, index) => {
      if (result.check_id || result.extra) return normalizeSemgrepResult(result, source, index);
      return normalizeSpectralResult(result, source, index);
    });
  }
  if (Array.isArray(report.results?.failed_checks)) {
    return report.results.failed_checks.map((result, index) => normalizeCheckovResult(result, source, index));
  }
  return [];
}
