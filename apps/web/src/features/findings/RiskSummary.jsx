import { AlertTriangle, ChevronRight } from 'lucide-react';

export function RiskSummary({ findings }) {
  const counts = ['Critical', 'High', 'Medium', 'Low'].map((label) => [label, findings.filter((f) => f.severity === label).length, label.toLowerCase()]);
  return (
    <section className="panel risk-summary">
      <h2>Risk Summary</h2>
      {counts.map(([label, value, tone]) => (
        <button className={tone} key={label}>
          <AlertTriangle size={20} /><span>{label}</span><strong>{value}</strong><ChevronRight size={16} />
        </button>
      ))}
      <div className="total"><span>Total Findings</span><strong>{findings.length}</strong></div>
    </section>
  );
}
