import { getRule } from './rules.js';

export function createRuleFinding(findings, ruleId, where, impact, confidence, evidence, override = {}) {
  const rule = getRule(ruleId);
  findings.push({
    id: `${ruleId}-${where}-${findings.length}`,
    ruleId,
    severity: rule.severity,
    name: rule.name,
    where,
    impact,
    confidence,
    evidence,
    recommendation: rule.recommendation,
    source: 'built-in',
    ...override
  });
}

export function createExternalFinding(finding, index) {
  const ruleId = finding.ruleId || finding.code || `external-${index}`;
  const where = finding.where || finding.path || finding.file || 'external report';
  const source = finding.source || 'external';
  return {
    id: finding.id || `${source}-${ruleId}-${where}-${index}`,
    ruleId,
    severity: finding.severity || 'Medium',
    name: finding.name || finding.title || ruleId,
    where,
    impact: finding.impact || 'Medium',
    confidence: finding.confidence || 'Medium',
    evidence: finding.evidence || finding.message || 'Imported from external analyzer output.',
    recommendation: finding.recommendation || finding.guideline || 'Review this externally detected issue and update the architecture or implementation.',
    source
  };
}
