import { ChevronRight, History } from 'lucide-react';

export function HistoryPanel({ history, loading, onRefresh, onOpen }) {
  return (
    <section className="panel history-panel">
      <div className="panel-title">
        <h2>Analysis History <span>{history.length}</span></h2>
        <button className="tool" onClick={onRefresh} disabled={loading}><History size={14} /> Refresh</button>
      </div>
      <div className="history-list">
        {history.slice(0, 6).map((item) => (
          <button className="history-row" onClick={() => onOpen(item.id)} key={item.id}>
            <span>
              <strong>{item.overall}/100</strong>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
            </span>
            <span>{item.files} files</span>
            <span>{item.findings} findings</span>
            <ChevronRight size={15} />
          </button>
        ))}
        {history.length === 0 && <p className="empty-note">Server-side scans will appear here after the API creates persisted analysis records.</p>}
      </div>
    </section>
  );
}
