import { AlertTriangle, ChevronDown, ChevronRight, Download, Filter } from 'lucide-react';
import { downloadReport } from '../../services/reportDownload';

export function FindingsTable({ findings, analysis }) {
  const visible = findings.slice(0, 8);
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <h2>Anti-patterns <span>{findings.length}</span></h2>
        <div>
          <button className="tool"><Filter size={15} /> All Severities <ChevronDown size={14} /></button>
          <button className="tool" disabled={!analysis} onClick={() => downloadReport(analysis, 'json')}><Download size={14} /> JSON</button>
          <button className="tool" disabled={!analysis} onClick={() => downloadReport(analysis, 'markdown')}><Download size={14} /> Markdown</button>
        </div>
      </div>
      <table>
        <thead>
          <tr><th><input type="checkbox" /></th><th>Severity</th><th>Anti-pattern</th><th>Where</th><th>Impact</th><th>Confidence</th><th /></tr>
        </thead>
        <tbody>
          {visible.map((finding) => (
            <tr key={finding.id} title={finding.evidence}>
              <td><input type="checkbox" /></td>
              <td><span className={`severity ${finding.severity.toLowerCase()}`}><AlertTriangle size={13} />{finding.severity}</span></td>
              <td>{finding.name}</td>
              <td>{finding.where}</td>
              <td>{finding.impact}</td>
              <td>{finding.confidence}</td>
              <td><ChevronRight size={16} /></td>
            </tr>
          ))}
          {visible.length === 0 && <tr><td colSpan="7" className="empty-cell">No anti-patterns detected yet.</td></tr>}
        </tbody>
      </table>
      <div className="panel-foot"><span>{findings.length ? `1-${visible.length} of ${findings.length}` : '0 findings'}</span><button>View all findings <ChevronRight size={15} /></button></div>
    </section>
  );
}
