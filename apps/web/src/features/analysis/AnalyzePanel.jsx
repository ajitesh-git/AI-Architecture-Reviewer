import { Check, Play } from 'lucide-react';

export function AnalyzePanel({ analysis, sourceFiles, analyzing, progress, onAnalyze, runMode, setRunMode, apiStatus, error }) {
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
