import { useEffect, useState } from 'react';
import { SAMPLE_FILES, analyzeSolution } from '@ai-architecture-reviewer/analyzer-core';
import { LeftRail } from './components/layout/LeftRail';
import { Tabs } from './components/layout/Tabs';
import { TopBar } from './components/layout/TopBar';
import { Scorecard } from './components/score/Scorecard';
import { AnalyzePanel } from './features/analysis/AnalyzePanel';
import { ArchitectureView } from './features/architecture/ArchitectureView';
import { DependenciesPanel } from './features/dependencies/DependenciesPanel';
import { FindingDetailPanel } from './features/findings/FindingDetailPanel';
import { FindingsTable } from './features/findings/FindingsTable';
import { RiskSummary } from './features/findings/RiskSummary';
import { HistoryPanel } from './features/history/HistoryPanel';
import { Improvements } from './features/recommendations/Improvements';
import { ExternalReportsPanel } from './features/upload/ExternalReportsPanel';
import { UploadPanel } from './features/upload/UploadPanel';
import { API_BASE_URL, createServerAnalysis, fetchAnalysisHistory, fetchAnalysisRecord } from './services/apiClient';
import { readExternalReports } from './services/externalReports';
import { expandUploads } from './services/uploadReader';

export function App() {
  const [tab, setTab] = useState('Overview');
  const [sourceFiles, setSourceFiles] = useState([]);
  const [externalReports, setExternalReports] = useState([]);
  const [externalFindings, setExternalFindings] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [runMode, setRunMode] = useState('server');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState(`Server: ${API_BASE_URL}`);
  const [error, setError] = useState('');
  const [selectedFindingId, setSelectedFindingId] = useState(null);

  const findings = analysis?.findings || [];
  const recommendations = analysis?.recommendations || [];
  const dependencies = analysis?.dependencies || [];
  const selectedFinding = findings.find((finding) => finding.id === selectedFindingId) || findings[0] || null;

  async function handleFiles(fileList) {
    if (!fileList?.length) return;
    setLoading(true);
    const expanded = await expandUploads([...fileList]);
    setSourceFiles((current) => [...current, ...expanded]);
    setAnalysis(null);
    setProgress(0);
    setError('');
    setSelectedFindingId(null);
    setLoading(false);
  }

  async function handleExternalReports(fileList) {
    if (!fileList?.length) return;
    setLoading(true);
    setError('');
    try {
      const imported = await readExternalReports([...fileList]);
      setExternalReports((current) => [...current, ...imported.reports]);
      setExternalFindings((current) => [...current, ...imported.findings]);
      setAnalysis(null);
      setSelectedFindingId(null);
      setProgress(0);
    } catch (err) {
      setError(`Could not read scanner report: ${err.message}`);
    } finally {
      setLoading(false);
    }
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
      setSelectedFindingId(record.analysis.findings[0]?.id || null);
      setProgress(100);
      setApiStatus(`Loaded server analysis ${record.id}`);
    } catch (err) {
      setError(`Could not load analysis: ${err.message}`);
    }
  }

  function completeLocalAnalysis(files, importedFindings = externalFindings) {
    const nextAnalysis = analyzeSolution(files, { externalFindings: importedFindings });
    setAnalysis(nextAnalysis);
    setSelectedFindingId(nextAnalysis.findings[0]?.id || null);
    setAnalyzing(false);
    setApiStatus('Completed locally in browser');
  }

  function runAnalysis(files = sourceFiles, importedFindings = externalFindings) {
    if (!files.length) return;
    setAnalyzing(true);
    setError('');
    setProgress(10);
    const steps = [28, 45, 68, 86, 100];
    steps.forEach((value, index) => setTimeout(() => {
      setProgress(value);
      if (value === 100) {
        if (runMode === 'server') {
          createServerAnalysis(files, importedFindings)
            .then((record) => {
              setAnalysis(record.analysis);
              setSelectedFindingId(record.analysis.findings[0]?.id || null);
              setApiStatus(`Saved server analysis ${record.id}`);
              return refreshHistory();
            })
            .catch((err) => {
              setError(`Server analysis failed: ${err.message}`);
              completeLocalAnalysis(files, importedFindings);
            })
            .finally(() => setAnalyzing(false));
        } else {
          completeLocalAnalysis(files, importedFindings);
        }
      }
    }, 240 + index * 260));
  }

  function loadSample() {
    setSourceFiles(SAMPLE_FILES);
    setExternalReports([]);
    setExternalFindings([]);
    setAnalysis(null);
    setSelectedFindingId(null);
    setProgress(0);
    setTimeout(() => runAnalysis(SAMPLE_FILES), 50);
  }

  function clearAll() {
    setSourceFiles([]);
    setExternalReports([]);
    setExternalFindings([]);
    setAnalysis(null);
    setSelectedFindingId(null);
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
              <div className="ingest-column">
                <UploadPanel sourceFiles={sourceFiles} onFiles={handleFiles} onSample={loadSample} onClear={clearAll} loading={loading} />
                <ExternalReportsPanel externalReports={externalReports} externalFindings={externalFindings} onReports={handleExternalReports} onClear={() => {
                  setExternalReports([]);
                  setExternalFindings([]);
                  setAnalysis(null);
                  setSelectedFindingId(null);
                  setProgress(0);
                }} />
              </div>
              <ArchitectureView analysis={analysis} />
              <AnalyzePanel analysis={analysis} sourceFiles={sourceFiles} analyzing={analyzing} progress={progress} onAnalyze={() => runAnalysis()} runMode={runMode} setRunMode={setRunMode} apiStatus={apiStatus} error={error} />
            </div>
            <div className="bottom-grid">
              <FindingsTable findings={findings} analysis={analysis} selectedFindingId={selectedFinding?.id} onSelectFinding={(finding) => setSelectedFindingId(finding.id)} />
              <Improvements recommendations={recommendations} />
              <DependenciesPanel dependencies={dependencies} />
            </div>
          </div>
          <aside className="right-column">
            <Scorecard analysis={analysis} />
            <FindingDetailPanel analysis={analysis} finding={selectedFinding} />
            <RiskSummary findings={findings} />
            <HistoryPanel history={history} loading={historyLoading} onRefresh={refreshHistory} onOpen={openHistoryRecord} />
          </aside>
        </div>
      </div>
    </main>
  );
}
