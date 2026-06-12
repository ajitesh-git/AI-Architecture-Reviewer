import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import JSZip from 'jszip';
import {
  AlertTriangle,
  Bell,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CloudUpload,
  Database,
  Download,
  FileCode2,
  FileText,
  Filter,
  GitBranch,
  History,
  Layers3,
  LineChart,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload
} from 'lucide-react';
import {
  SAMPLE_FILES,
  analyzeSolution,
  createJsonReport,
  createMarkdownReport
} from '@ai-architecture-reviewer/analyzer-core';
import './styles.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

const navItems = [
  ['Overview', Layers3],
  ['Findings', AlertTriangle],
  ['Scorecard', LineChart],
  ['Architecture', Boxes],
  ['Reports', FileText],
  ['History', History],
  ['Settings', Settings]
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readFileAsText(file) {
  try {
    return await file.text();
  } catch {
    return '';
  }
}

async function expandUploads(fileList) {
  const files = [];
  for (const file of fileList) {
    if (/\.zip$/i.test(file.name)) {
      const zip = await JSZip.loadAsync(file);
      for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        if (/\.(png|jpg|jpeg|gif|webp|ico|pdf|dll|exe|bin|lock|woff2?)$/i.test(name)) continue;
        const text = await entry.async('string').catch(() => '');
        files.push({ name, size: text.length, text });
      }
    } else {
      files.push({ name: file.webkitRelativePath || file.name, size: file.size, text: await readFileAsText(file) });
    }
  }
  return files;
}

function downloadReport(analysis, format) {
  const isMarkdown = format === 'markdown';
  const blob = new Blob(
    [isMarkdown ? createMarkdownReport(analysis) : createJsonReport(analysis)],
    { type: isMarkdown ? 'text/markdown' : 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `architecture-review-${Date.now()}.${isMarkdown ? 'md' : 'json'}`;
  link.click();
  URL.revokeObjectURL(url);
}

async function createServerAnalysis(sourceFiles) {
  const response = await fetch(`${API_BASE_URL}/api/analyses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: sourceFiles })
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Analysis API returned ${response.status}`);
  }
  return response.json();
}

async function fetchAnalysisHistory() {
  const response = await fetch(`${API_BASE_URL}/api/analyses`);
  if (!response.ok) throw new Error(`History API returned ${response.status}`);
  return response.json();
}

async function fetchAnalysisRecord(id) {
  const response = await fetch(`${API_BASE_URL}/api/analyses/${id}`);
  if (!response.ok) throw new Error(`Analysis API returned ${response.status}`);
  return response.json();
}

function ScoreRing({ value, label }) {
  const tone = value < 55 ? 'poor' : value < 70 ? 'fair' : 'good';
  return (
    <div className="score-row">
      <span>{label}</span>
      <div className="ring-wrap">
        <div className={`ring ${tone}`} style={{ '--score': `${value * 3.6}deg` }} />
        <strong>{value}</strong>
        <small>/100</small>
        <em>{tone === 'poor' ? 'Poor' : tone === 'fair' ? 'Fair' : 'Good'}</em>
      </div>
    </div>
  );
}

function LeftRail({ findingCount }) {
  return (
    <aside className="rail">
      <div className="brand-mark"><Boxes size={22} /></div>
      <nav>
        {navItems.map(([label, Icon], index) => (
          <button className={index === 0 ? 'active' : ''} key={label}>
            <span className="nav-icon">
              <Icon size={20} />
              {label === 'Findings' && findingCount > 0 && <b>{findingCount}</b>}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <button className="collapse"><Minus size={18} /><span>Collapse</span></button>
    </aside>
  );
}

function TopBar({ analysis }) {
  const project = analysis?.services?.[0]?.name || 'Upload a solution';
  const version = analysis ? `${analysis.files.length} artifacts analyzed` : 'No analysis yet';
  return (
    <header className="topbar">
      <h1>AI Architecture Reviewer</h1>
      <label>Project<button className="select">{project}<ChevronDown size={16} /></button></label>
      <label>Version<button className="select">{version}<ChevronDown size={16} /></button></label>
      <div className="top-actions">
        <button aria-label="Help"><CircleHelp size={20} /></button>
        <button aria-label="Notifications" className="dot"><Bell size={20} /></button>
        <button className="avatar">AK</button>
        <button aria-label="Account menu"><ChevronDown size={16} /></button>
      </div>
    </header>
  );
}

function Tabs({ tab, setTab }) {
  return (
    <div className="tabs">
      {['Overview', 'Findings', 'Scorecard'].map((item) => (
        <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>
      ))}
    </div>
  );
}

function UploadPanel({ sourceFiles, onFiles, onSample, onClear, loading }) {
  const inputRef = useRef(null);
  const shownFiles = sourceFiles.slice(0, 8);
  return (
    <section className="panel upload-panel">
      <div className="panel-title">
        <h2>Upload Solution</h2>
        <button className="icon-btn" aria-label="Search files"><Search size={16} /></button>
      </div>
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        multiple
        onChange={(event) => onFiles(event.target.files)}
      />
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

function ArchitectureView({ analysis }) {
  const services = analysis?.services?.slice(0, 6) || [];
  const datastores = analysis?.datastores?.slice(0, 3) || [];
  return (
    <section className="panel arch-panel">
      <div className="panel-title"><h2>Architecture View</h2></div>
      <div className="mode-tabs">
        {['System Context', 'Containers', 'Components', 'Deployment'].map((mode, index) => (
          <button className={index === 1 ? 'active' : ''} key={mode}>{mode}</button>
        ))}
      </div>
      <div className="canvas dynamic-canvas">
        <div className="legend">
          <span><i className="solid" /> Service</span>
          <span><i className="dash" /> Call</span>
          <span><i className="store" /> Data Store</span>
          <span><i className="risk" /> Finding</span>
        </div>
        {services.length === 0 && <div className="empty-graph">Upload a solution and run analysis to build the architecture map.</div>}
        {services.map((service, index) => (
          <div className="node graph-node" style={{ '--x': `${22 + (index % 3) * 28}%`, '--y': `${132 + Math.floor(index / 3) * 96}px` }} key={service.name}>
            {service.name}<small>{service.files} files</small>
          </div>
        ))}
        {datastores.map((store, index) => (
          <div className="db graph-db" style={{ '--x': `${25 + index * 26}%`, '--y': '322px' }} key={store}>{store}</div>
        ))}
        <svg className="links" viewBox="0 0 720 430" preserveAspectRatio="none">
          {services.slice(0, 5).map((_, index) => <path key={index} d={`M${170 + index * 82} 185 L${210 + index * 70} 315`} className={index % 2 ? 'dash' : ''} />)}
          {analysis?.findings?.slice(0, 2).map((_, index) => <path key={`risk-${index}`} d={`M${280 + index * 100} 210 L${350 + index * 50} 210`} className="risk" />)}
        </svg>
        <div className="zoom"><button><Minus size={15} /></button><span>{services.length || 0} services</span><button><Plus size={15} /></button></div>
      </div>
    </section>
  );
}

function AnalyzePanel({ analysis, sourceFiles, analyzing, progress, onAnalyze, runMode, setRunMode, apiStatus, error }) {
  const canAnalyze = sourceFiles.length > 0 && !analyzing;
  return (
    <section className="panel analyze-panel">
      <h2>Analyze</h2>
      <span className="label">Analysis Mode</span>
      <div className="segment">
        {['Quick', 'Standard', 'Deep'].map((mode, index) => <button className={index === 1 ? 'active' : ''} key={mode}>{mode}</button>)}
      </div>
      <span className="label">Execution</span>
      <div className="segment execution-segment">
        {['Server', 'Local'].map((mode) => (
          <button className={runMode === mode.toLowerCase() ? 'active' : ''} onClick={() => setRunMode(mode.toLowerCase())} key={mode}>{mode}</button>
        ))}
      </div>
      <button className="primary" onClick={onAnalyze} disabled={!canAnalyze}><Play size={17} /> Analyze</button>
      <div className="progress-head">
        <span>{analyzing ? 'Analysing architecture...' : analysis ? 'Analysis complete' : 'Waiting for upload'}</span>
        <strong>{progress}%</strong>
      </div>
      <div className="progress"><i style={{ width: `${progress}%` }} /></div>
      <p>{analysis ? `${analysis.files.length} artifacts, ${analysis.services.length} services, ${analysis.findings.length} findings` : 'Upload a solution to run 35 architecture checks.'}</p>
      <p className={`api-status ${error ? 'error' : ''}`}>{error || apiStatus}</p>
      {['Parsing artifacts', 'Building model', 'Detecting anti-patterns', 'Evaluating quality', 'Generating scorecard'].map((item, index) => (
        <div className={`check ${progress >= (index + 1) * 20 ? 'done' : analyzing && progress >= index * 20 ? 'current' : ''}`} key={item}>
          <span>{progress >= (index + 1) * 20 ? <Check size={14} /> : ''}</span>{item}
        </div>
      ))}
    </section>
  );
}

function HistoryPanel({ history, loading, onRefresh, onOpen }) {
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

function FindingsTable({ findings, analysis }) {
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

function Improvements({ recommendations }) {
  const icons = [Boxes, Database, ShieldCheck, RotateCcw, LineChart];
  return (
    <section className="panel rec-panel">
      <div className="panel-title"><h2>Suggested Improvements <span>{recommendations.length}</span></h2></div>
      {recommendations.slice(0, 6).map((rec, index) => {
        const Icon = icons[index % icons.length];
        return (
          <div className="rec-row" key={rec.text}>
            <div className={`rec-icon tone-${index}`}><Icon size={18} /></div>
            <strong>{rec.title}</strong>
            <p>{rec.text}</p>
            <button>{rec.severity}</button>
          </div>
        );
      })}
      {recommendations.length === 0 && <p className="empty-note">Run analysis to generate improvement recommendations.</p>}
      <button className="link">View all recommendations <ChevronRight size={15} /></button>
    </section>
  );
}

function Scorecard({ analysis }) {
  const scores = analysis?.scores || { Coupling: 0, Resilience: 0, Maintainability: 0, Security: 0, Scalability: 0 };
  const overall = analysis?.overall || 0;
  const tone = overall < 55 ? 'poor' : overall < 70 ? 'fair' : 'good';
  return (
    <section className="panel scorecard">
      <h2>Architecture Scorecard</h2>
      {Object.entries(scores).map(([label, value]) => <ScoreRing key={label} label={label} value={value} />)}
      <div className="overall">
        <span>Overall Score</span>
        <div className="ring-wrap big">
          <div className={`ring ${tone}`} style={{ '--score': `${overall * 3.6}deg` }} />
          <strong>{overall}</strong><small>/100</small><em>{tone === 'poor' ? 'Poor' : tone === 'fair' ? 'Fair' : 'Good'}</em>
        </div>
      </div>
    </section>
  );
}

function RiskSummary({ findings }) {
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

function App() {
  const [tab, setTab] = useState('Overview');
  const [sourceFiles, setSourceFiles] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [runMode, setRunMode] = useState('server');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState(`Server: ${API_BASE_URL}`);
  const [error, setError] = useState('');

  const findings = analysis?.findings || [];
  const recommendations = analysis?.recommendations || [];

  async function handleFiles(fileList) {
    if (!fileList?.length) return;
    setLoading(true);
    const expanded = await expandUploads([...fileList]);
    setSourceFiles((current) => [...current, ...expanded]);
    setAnalysis(null);
    setProgress(0);
    setError('');
    setLoading(false);
  }

  async function refreshHistory() {
    setHistoryLoading(true);
    setError('');
    try {
      setHistory(await fetchAnalysisHistory());
      setApiStatus(`Connected: ${API_BASE_URL}`);
    } catch (err) {
      setError(`API unavailable: ${err.message}`);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openHistoryRecord(id) {
    setError('');
    try {
      const record = await fetchAnalysisRecord(id);
      setAnalysis(record.analysis);
      setSourceFiles(record.analysis.files);
      setProgress(100);
      setApiStatus(`Loaded server analysis ${record.id}`);
    } catch (err) {
      setError(`Could not load analysis: ${err.message}`);
    }
  }

  function completeLocalAnalysis(files) {
    setAnalysis(analyzeSolution(files));
    setAnalyzing(false);
    setApiStatus('Completed locally in browser');
  }

  function runAnalysis(files = sourceFiles) {
    if (!files.length) return;
    setAnalyzing(true);
    setError('');
    setProgress(10);
    const steps = [28, 45, 68, 86, 100];
    steps.forEach((value, index) => setTimeout(() => {
      setProgress(value);
      if (value === 100) {
        if (runMode === 'server') {
          createServerAnalysis(files)
            .then((record) => {
              setAnalysis(record.analysis);
              setApiStatus(`Saved server analysis ${record.id}`);
              return refreshHistory();
            })
            .catch((err) => {
              setError(`Server analysis failed: ${err.message}`);
              completeLocalAnalysis(files);
            })
            .finally(() => setAnalyzing(false));
        } else {
          completeLocalAnalysis(files);
        }
      }
    }, 240 + index * 260));
  }

  function loadSample() {
    setSourceFiles(SAMPLE_FILES);
    setAnalysis(null);
    setProgress(0);
    setTimeout(() => runAnalysis(SAMPLE_FILES), 50);
  }

  function clearAll() {
    setSourceFiles([]);
    setAnalysis(null);
    setProgress(0);
    setAnalyzing(false);
    setError('');
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('sample') === '1') {
      loadSample();
    }
    refreshHistory();
  }, []);

  return (
    <main className="app">
      <LeftRail findingCount={findings.length} />
      <div className="workspace">
        <TopBar analysis={analysis} />
        <Tabs tab={tab} setTab={setTab} />
        <div className="content">
          <div className="main-column">
            <div className="top-grid">
              <UploadPanel sourceFiles={sourceFiles} onFiles={handleFiles} onSample={loadSample} onClear={clearAll} loading={loading} />
              <ArchitectureView analysis={analysis} />
              <AnalyzePanel analysis={analysis} sourceFiles={sourceFiles} analyzing={analyzing} progress={progress} onAnalyze={() => runAnalysis()} runMode={runMode} setRunMode={setRunMode} apiStatus={apiStatus} error={error} />
            </div>
            <div className="bottom-grid">
              <FindingsTable findings={findings} analysis={analysis} />
              <Improvements recommendations={recommendations} />
            </div>
          </div>
          <aside className="right-column">
            <Scorecard analysis={analysis} />
            <RiskSummary findings={findings} />
            <HistoryPanel history={history} loading={historyLoading} onRefresh={refreshHistory} onOpen={openHistoryRecord} />
          </aside>
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
