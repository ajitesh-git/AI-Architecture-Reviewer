export function createRecommendations(findings) {
  return [...new Map(findings.map((finding) => [finding.recommendation, {
    title: finding.name
      .replace('Missing Timeouts and Retries', 'Add Timeouts and Retries')
      .replace('Hardcoded Secret', 'Centralize Secrets Management'),
    text: finding.recommendation,
    severity: finding.severity,
    source: finding.source || 'built-in'
  }])).values()];
}
