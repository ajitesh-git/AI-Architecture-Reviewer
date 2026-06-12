import { useRef } from 'react';
import { FileJson, ScanSearch, Trash2, Upload } from 'lucide-react';
import { formatBytes } from '../../utils/format';

export function ExternalReportsPanel({ externalReports, externalFindings, onReports, onClear }) {
  const inputRef = useRef(null);
  return (
    <section className="panel external-panel">
      <div className="panel-title">
        <h2>Scanner Reports <span>{externalFindings.length}</span></h2>
        <button className="icon-btn" aria-label="Add scanner reports" onClick={() => inputRef.current?.click()}>
          <Upload size={15} />
        </button>
      </div>
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        multiple
        accept="application/json,.json"
        onChange={(event) => onReports(event.target.files)}
      />
      <button
        className={`report-dropzone ${externalReports.length ? 'loaded' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onReports(event.dataTransfer.files);
        }}
      >
        <ScanSearch size={28} />
        <strong>{externalReports.length ? `${externalReports.length} reports merged` : 'Add scanner JSON'}</strong>
        <span>{externalFindings.length ? `${externalFindings.length} external findings will be scored` : 'Semgrep, Spectral, Checkov, or generic findings JSON'}</span>
      </button>
      <div className="report-actions">
        <button onClick={onClear} disabled={!externalReports.length}><Trash2 size={14} /> Clear Reports</button>
      </div>
      <div className="report-list">
        {externalReports.slice(0, 5).map((report) => (
          <div className="report-row" key={`${report.name}-${report.size}`}>
            <FileJson size={16} />
            <span title={report.name}>{report.name}</span>
            <small>{report.findings} findings</small>
            <small>{formatBytes(report.size)}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
