export function createJsonReport(analysis) {
  return JSON.stringify(analysis, null, 2);
}

export function createMarkdownReport(analysis) {
  const scoreRows = Object.entries(analysis.scores)
    .map(([name, score]) => `| ${name} | ${score}/100 |`)
    .join('\n');
  const findingRows = analysis.findings
    .map((finding) => `| ${finding.severity} | ${finding.name} | ${finding.where} | ${finding.recommendation} |`)
    .join('\n');
  const recommendationRows = analysis.recommendations
    .map((recommendation) => `- **${recommendation.title}** (${recommendation.severity}): ${recommendation.text}`)
    .join('\n');

  return `# Architecture Review Report

Generated: ${analysis.analyzedAt}

## Summary

- Artifacts analyzed: ${analysis.files.length}
- Services inferred: ${analysis.services.length}
- Datastores inferred: ${analysis.datastores.length}
- Findings: ${analysis.findings.length}
- Overall score: ${analysis.overall}/100

## Scorecard

| Dimension | Score |
| --- | --- |
${scoreRows}

## Findings

| Severity | Finding | Where | Recommendation |
| --- | --- | --- | --- |
${findingRows || '| - | No findings | - | - |'}

## Recommendations

${recommendationRows || 'No recommendations generated.'}
`;
}
