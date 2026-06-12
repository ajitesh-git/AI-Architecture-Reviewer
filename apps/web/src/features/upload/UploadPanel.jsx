import { useRef } from 'react';
import { Check, CloudUpload, FileCode2, FileText, Search, Trash2, Upload } from 'lucide-react';
import { formatBytes } from '../../utils/format';

export function UploadPanel({ sourceFiles, onFiles, onSample, onClear, loading }) {
  const inputRef = useRef(null);
  const shownFiles = sourceFiles.slice(0, 8);
  return (
    <section className="panel upload-panel">
      <div className="panel-title">
        <h2>Upload Solution</h2>
        <button className="icon-btn" aria-label="Search files"><Search size={16} /></button>
      </div>
      <input ref={inputRef} className="file-input" type="file" multiple onChange={(event) => onFiles(event.target.files)} />
      <button
        className={`dropzone ${sourceFiles.length ? 'loaded' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onFiles(event.dataTransfer.files);
        }}
      >
        <CloudUpload size={36} />
        <strong>{sourceFiles.length ? `${sourceFiles.length} artifacts loaded` : 'Drag and drop architecture files here'}</strong>
        <span>Reads code, diagrams, YAML, JSON, Terraform, OpenAPI, Cloud templates, and .zip files locally in your browser.</span>
        <em>{loading ? 'Reading...' : sourceFiles.length ? 'Add More Files' : 'Browse Files'}</em>
      </button>
      <div className="sample-actions">
        <button onClick={onSample}><Upload size={15} /> Load Sample</button>
        <button onClick={onClear}><Trash2 size={15} /> Clear All</button>
      </div>
      <div className="file-list">
        {shownFiles.map((file) => {
          const Icon = /\.(cs|js|ts|java|py|tf|yaml|yml|json|xml|puml)$/i.test(file.name) ? FileCode2 : FileText;
          return (
            <div className="file-row" key={file.name}>
              <Icon size={17} />
              <span title={file.name}>{file.name}</span>
              <small>{formatBytes(file.size)}</small>
              <Check size={16} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
