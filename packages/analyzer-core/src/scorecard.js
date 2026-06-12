const severityWeight = { Critical: 18, High: 11, Medium: 6, Low: 3 };

export function calculateScores({ findings, edges, serviceCount }) {
  const totalPenalty = findings.reduce((sum, finding) => sum + (severityWeight[finding.severity] || 6), 0);
  const dimensions = {
    Coupling: Math.max(10, 92 - findings.filter((f) => /Coupling|Chaining|Dependency|Boundary/i.test(f.name)).length * 16 - Math.max(0, edges.length - serviceCount) * 2),
    Resilience: Math.max(10, 88 - findings.filter((f) => /Timeout|Chaining|Retry|Circuit|Availability/i.test(f.name)).length * 14),
    Maintainability: Math.max(10, 90 - findings.filter((f) => /Modularity|Broad|Complex|Duplicate|Maintain/i.test(f.name)).length * 14 - Math.max(0, serviceCount - 8) * 2),
    Security: Math.max(10, 94 - findings.filter((f) => /Secret|Database|Security|Auth|Token|Credential/i.test(f.name)).length * 22),
    Scalability: Math.max(10, 86 - findings.filter((f) => /Chaining|Database|Broad|Queue|Scale|Performance/i.test(f.name)).length * 10)
  };
  return {
    dimensions,
    overall: Math.max(10, Math.round(Object.values(dimensions).reduce((sum, value) => sum + value, 0) / 5 - Math.max(0, totalPenalty - 30) / 10))
  };
}
