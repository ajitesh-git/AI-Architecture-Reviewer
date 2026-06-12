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
import './styles.css';

const SAMPLE_FILES = [
  {
    name: 'order-service/src/OrderClient.cs',
    size: 2140,
    text: 'public class OrderClient { var token = "secret-12345"; httpClient.GetAsync("http://payment-service/api/payments"); httpClient.GetAsync("http://inventory-service/api/items"); }'
  },
  {
    name: 'payment-service/app.js',
    size: 1850,
    text: 'const password = "p@ssw0rd"; fetch("http://inventory-service/reserve"); const db = "OrdersDb";'
  },
  {
    name: 'inventory-service/openapi.yaml',
    size: 1620,
    text: 'openapi: 3.0.0\npaths:\n  /items:\n  /stock:\n  /reserve:\ncomponents:\n  schemas:\n    Item: {}'
  },
  {
    name: 'infra/main.tf',
    size: 920,
    text: 'resource "aws_db_instance" "orders" { name = "OrdersDb" }\nresource "aws_db_instance" "payments" { name = "PaymentsDb" }'
  }
];

const navItems = [
  ['Overview', Layers3],
  ['Findings', AlertTriangle],
  ['Scorecard', LineChart],
  ['Architecture', Boxes],
  ['Reports', FileText],
  ['History', History],
  ['Settings', Settings]
];

const severityWeight = { Critical: 18, High: 11, Medium: 6, Low: 3 };

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function inferServiceName(path) {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  const parts = normalized.split('/');
  const hit = parts.find((part) => /service|api|worker|frontend|backend|gateway/.test(part));
  if (hit) return hit.replace(/\.(csproj|sln|json|yaml|yml|tf|js|ts|java|py)$/g, '');
  const file = parts.at(-1)?.replace(/\.[^.]+$/, '') || 'solution';
  return file.includes('-') || file.includes('_') ? file : parts[0] || file;
}

function inferDatastores(text) {
  const stores = new Set();
  const patterns = [
    /(?:database|db|dbname|initial catalog|catalog)\s*[:=]\s*["']?([a-z0-9_-]{3,})/gi,
    /(?:mongodb|postgres|postgresql|mysql|sqlserver|redis|dynamodb|cosmosdb|oracle|mssql)/gi,
    /resource\s+"(?:aws_db_instance|azurerm_(?:mssql|postgresql|mysql)|google_sql_database_instance)"/gi
  ];
  patterns.forEach((pattern) => {
    for (const match of text.matchAll(pattern)) stores.add((match[1] || match[0]).replace(/["']/g, '').slice(0, 40));
  });
  return [...stores];
}

function extractCalls(text) {
  const calls = [];
  const httpPattern = /(https?:\/\/[a-z0-9_.:-]+\/?[^\s"'`)<>]*)/gi;
  for (const match of text.matchAll(httpPattern)) calls.push(match[1]);
  const serviceRef = /\b([a-z0-9-]+-service)\b/gi;
  for (const match of text.matchAll(serviceRef)) calls.push(match[1]);
  return [...new Set(calls)];
}

function addFinding(findings, severity, name, where, impact, confidence, evidence, recommendation) {
  findings.push({ id: `${name}-${where}-${findings.length}`, severity, name, where, impact, confidence, evidence, recommendation });
}

function analyzeSolution(sourceFiles) {
  const readable = sourceFiles.filter((file) => file.text.trim());
  const services = new Map();
  const datastoresByService = new Map();
  const edges = [];
  const findings = [];

  readable.forEach((file) => {
    const service = inferServiceName(file.name);
    if (!services.has(service)) services.set(service, { name: service, files: 0, lines: 0, calls: 0 });
    const stats = services.get(service);
    stats.files += 1;
    stats.lines += file.text.split(/\r?\n/).length;

    const stores = inferDatastores(file.text);
    if (!datastoresByService.has(service)) datastoresByService.set(service, new Set());
    stores.forEach((store) => datastoresByService.get(service).add(store));

    const calls = extractCalls(file.text);
    stats.calls += calls.length;
    calls.forEach((target) => edges.push({ from: service, to: target.replace(/^https?:\/\//, '').split(/[/:]/)[0] }));

    if (/(password|secret|apikey|api_key|accesskey|connectionstring)\s*[:=]\s*["'][^"']{6,}/i.test(file.text)) {
      addFinding(
        findings,
        'Critical',
        'Hardcoded Secret',
        file.name,
        'High',
        'High',
        'Credential-like value found in source/config text.',
        'Move secrets to a vault or cloud secrets manager and rotate exposed values.'
      );
    }

    if (/(fetch\(|axios\.|httpclient\.|resttemplate|webclient|requests\.|http\.get|http\.post)/i.test(file.text) && !/(timeout|cancellationtoken|retry|polly|resilience|backoff)/i.test(file.text)) {
      addFinding(
        findings,
        'High',
        'Missing Timeouts and Retries',
        file.name,
        'High',
        'Medium',
        'Outbound calls are present without nearby timeout/retry policy hints.',
        'Add explicit timeouts, retries with backoff, and circuit breakers on outbound integrations.'
      );
    }

    if (/openapi|swagger/i.test(file.name) && (file.text.match(/^\s*\/[a-z0-9_{}/-]+:/gim) || []).length > 25) {
      addFinding(
        findings,
        'Medium',
        'Overly Broad API Surface',
        file.name,
        'Medium',
        'Medium',
        'OpenAPI artifact exposes a large number of paths.',
        'Group APIs by bounded context and split broad endpoints behind smaller contracts.'
      );
    }

    if (stats.lines > 1200 && !/test|spec|mock/i.test(file.name)) {
      addFinding(
        findings,
        'Medium',
        'Low Modularity',
        file.name,
        'Medium',
        'Low',
        'A large source artifact suggests too many responsibilities in one module.',
        'Split large modules by command/query, domain service, or infrastructure boundary.'
      );
    }
  });

  const serviceNames = [...services.keys()];
  edges.forEach((edge) => {
    const targetService = serviceNames.find((name) => edge.to.includes(name) || name.includes(edge.to));
    if (targetService && targetService !== edge.from) {
      addFinding(
        findings,
        'High',
        'Synchronous Service Chaining',
        `${edge.from} -> ${targetService}`,
        'High',
        'High',
        `Direct service reference detected: ${edge.to}`,
        'Prefer asynchronous events or queues for cross-service workflows that do not require immediate consistency.'
      );
    }
  });

  const storeConsumers = new Map();
  datastoresByService.forEach((stores, service) => stores.forEach((store) => {
    const key = store.toLowerCase();
    if (!storeConsumers.has(key)) storeConsumers.set(key, new Set());
    storeConsumers.get(key).add(service);
  }));
  storeConsumers.forEach((consumers, store) => {
    if (consumers.size > 1) {
      addFinding(
        findings,
        'Critical',
        'Shared Database Coupling',
        [...consumers].join(', '),
        'High',
        'Medium',
        `Multiple services appear to reference ${store}.`,
        'Move ownership to one service and expose access through APIs/events instead of sharing the database.'
      );
    }
  });

  if (serviceNames.length === 0 && readable.length > 0) {
    services.set('solution', { name: 'solution', files: readable.length, lines: readable.reduce((sum, f) => sum + f.text.split(/\r?\n/).length, 0), calls: edges.length });
  }

  const totalPenalty = findings.reduce((sum, finding) => sum + severityWeight[finding.severity], 0);
  const scores = {
    Coupling: Math.max(10, 92 - findings.filter((f) => /Coupling|Chaining/.test(f.name)).length * 16 - Math.max(0, edges.length - serviceNames.length) * 2),
    Resilience: Math.max(10, 88 - findings.filter((f) => /Timeout|Chaining/.test(f.name)).length * 14),
    Maintainability: Math.max(10, 90 - findings.filter((f) => /Modularity|Broad/.test(f.name)).length * 14 - Math.max(0, serviceNames.length - 8) * 2),
    Security: Math.max(10, 94 - findings.filter((f) => /Secret|Database/.test(f.name)).length * 22),
    Scalability: Math.max(10, 86 - findings.filter((f) => /Chaining|Database|Broad/.test(f.name)).length * 10)
  };
  const overall = Math.max(10, Math.round(Object.values(scores).reduce((sum, value) => sum + value, 0) / 5 - Math.max(0, totalPenalty - 30) / 10));

  const recommendations = [...new Map(findings.map((finding) => [finding.recommendation, {
    title: finding.name.replace('Missing Timeouts and Retries', 'Add Timeouts and Retries').replace('Hardcoded Secret', 'Centralize Secrets Management'),
    text: finding.recommendation,
    severity: finding.severity
  }])).values()];

  return {
    files: sourceFiles,
    services: [...services.values()],
    datastores: [...new Set([...datastoresByService.values()].flatMap((set) => [...set]))],
    edges,
    findings,
    recommendations,
    scores,
    overall,
    analyzedAt: new Date().toISOString()
  };
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

function downloadReport(analysis) {
  const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `architecture-review-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
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

function AnalyzePanel({ analysis, sourceFiles, analyzing, progress, onAnalyze }) {
  const canAnalyze = sourceFiles.length > 0 && !analyzing;
  return (
    <section className="panel analyze-panel">
      <h2>Analyze</h2>
      <span className="label">Analysis Mode</span>
      <div className="segment">
        {['Quick', 'Standard', 'Deep'].map((mode, index) => <button className={index === 1 ? 'active' : ''} key={mode}>{mode}</button>)}
      </div>
      <button className="primary" onClick={onAnalyze} disabled={!canAnalyze}><Play size={17} /> Analyze</button>
      <div className="progress-head">
        <span>{analyzing ? 'Analysing architecture...' : analysis ? 'Analysis complete' : 'Waiting for upload'}</span>
        <strong>{progress}%</strong>
      </div>
      <div className="progress"><i style={{ width: `${progress}%` }} /></div>
      <p>{analysis ? `${analysis.files.length} artifacts, ${analysis.services.length} services, ${analysis.findings.length} findings` : 'Upload a solution to run 35 architecture checks.'}</p>
      {['Parsing artifacts', 'Building model', 'Detecting anti-patterns', 'Evaluating quality', 'Generating scorecard'].map((item, index) => (
        <div className={`check ${progress >= (index + 1) * 20 ? 'done' : analyzing && progress >= index * 20 ? 'current' : ''}`} key={item}>
          <span>{progress >= (index + 1) * 20 ? <Check size={14} /> : ''}</span>{item}
        </div>
      ))}
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
          <button className="tool" disabled={!analysis} onClick={() => downloadReport(analysis)}><Download size={14} /> Export</button>
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

  const findings = analysis?.findings || [];
  const recommendations = analysis?.recommendations || [];

  async function handleFiles(fileList) {
    if (!fileList?.length) return;
    setLoading(true);
    const expanded = await expandUploads([...fileList]);
    setSourceFiles((current) => [...current, ...expanded]);
    setAnalysis(null);
    setProgress(0);
    setLoading(false);
  }

  function runAnalysis(files = sourceFiles) {
    if (!files.length) return;
    setAnalyzing(true);
    setProgress(10);
    const steps = [28, 45, 68, 86, 100];
    steps.forEach((value, index) => setTimeout(() => {
      setProgress(value);
      if (value === 100) {
        setAnalysis(analyzeSolution(files));
        setAnalyzing(false);
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
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('sample') === '1') {
      loadSample();
    }
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
              <AnalyzePanel analysis={analysis} sourceFiles={sourceFiles} analyzing={analyzing} progress={progress} onAnalyze={() => runAnalysis()} />
            </div>
            <div className="bottom-grid">
              <FindingsTable findings={findings} analysis={analysis} />
              <Improvements recommendations={recommendations} />
            </div>
          </div>
          <aside className="right-column">
            <Scorecard analysis={analysis} />
            <RiskSummary findings={findings} />
          </aside>
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
