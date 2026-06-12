import { AlertTriangle, CheckCircle2, ClipboardList, FileCode2, ShieldAlert } from 'lucide-react';

const severityCopy = {
  Critical: 'Needs immediate architecture attention',
  High: 'Prioritize in the next remediation cycle',
  Medium: 'Plan remediation with normal backlog work',
  Low: 'Track as cleanup or hardening work'
};

function findSourceSnippet(analysis, finding) {
  const file = analysis?.files?.find((item) => item.name === finding?.where);
  if (!file?.text) return null;
  const lines = file.text.split(/\r?\n/).slice(0, 8);
  return lines.join('\n').slice(0, 700);
}

export function FindingDetailPanel({ analysis, finding }) {
  if (!finding) {
    return (
      <section className="panel finding-detail">
        <h2>Finding Details</h2>
        <div className="empty-detail">
          <ClipboardList size={28} />
          <p>Select a finding to review evidence, impact, and recommended remediation.</p>
        </div>
      </section>
    );
  }

  const snippet = findSourceSnippet(analysis, finding);

  return (
    <section className="panel finding-detail">
      <div className="detail-heading">
        <span className={`severity ${finding.severity.toLowerCase()}`}><AlertTriangle size={13} />{finding.severity}</span>
        <h2>{finding.name}</h2>
        <p>{severityCopy[finding.severity]}</p>
      </div>

      <div className="detail-grid">
        <div>
          <span>Impact</span>
          <strong>{finding.impact}</strong>
        </div>
        <div>
          <span>Confidence</span>
          <strong>{finding.confidence}</strong>
        </div>
        <div>
          <span>Rule</span>
          <strong>{finding.ruleId || 'custom'}</strong>
        </div>
      </div>

      <div className="detail-section">
        <h3><ShieldAlert size={16} /> Evidence</h3>
        <p>{finding.evidence}</p>
      </div>

      <div className="detail-section">
        <h3><CheckCircle2 size={16} /> Recommended Improvement</h3>
        <p>{finding.recommendation}</p>
      </div>

      <div className="detail-section">
        <h3><FileCode2 size={16} /> Location</h3>
        <code>{finding.where}</code>
        {snippet && <pre>{snippet}</pre>}
      </div>
    </section>
  );
}
