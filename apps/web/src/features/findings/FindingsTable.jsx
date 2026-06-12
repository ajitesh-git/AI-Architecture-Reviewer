import { AlertTriangle, ChevronDown, ChevronRight, Download, Filter } from 'lucide-react';
import { downloadReport } from '../../services/reportDownload';

export function FindingsTable({ findings, total, analysis, selectedFindingId, onSelectFinding, onLoadMore, actionLabel = 'View more findings' }) {
  const visible = findings;
  const hasMore = findings.length < total;
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <h2>Anti-patterns <span>{total}</span></h2>
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
            <tr
              className={selectedFindingId === finding.id ? 'selected-row' : ''}
              key={finding.id}
              title={finding.evidence}
              onClick={() => onSelectFinding(finding)}
            >
              <td><input type="checkbox" /></td>
              <td><span className={`severity ${finding.severity.toLowerCase()}`}><AlertTriangle size={13} />{finding.severity}</span></td>
              <td>{finding.name}</td>
              <td>{finding.where}</td>
              <td>{finding.impact}</td>
              <td>{finding.confidence}</td>
              <td><button className="row-action" aria-label={`Open ${finding.name}`}><ChevronRight size={16} /></button></td>
            </tr>
          ))}
          {visible.length === 0 && <tr><td colSpan="7" className="empty-cell">No anti-patterns detected yet.</td></tr>}
        </tbody>
      </table>
      <div className="panel-foot">
        <span>{total ? `1-${visible.length} of ${total}` : '0 findings'}</span>
        <button disabled={!hasMore && actionLabel === 'View more findings'} onClick={onLoadMore}>{actionLabel} <ChevronRight size={15} /></button>
      </div>
    </section>
  );
}
