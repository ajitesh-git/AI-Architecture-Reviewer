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
import {
  API_BASE_URL,
  createAnalysisJobFromSources,
  createAnalysisJobFromUploads,
  fetchAnalysisHistory,
  fetchAnalysisDependencies,
  fetchAnalysisFindings,
  fetchAnalysisJob,
  fetchAnalysisJobResult,
  fetchAnalysisRecord
} from './services/apiClient';
import { readExternalReports } from './services/externalReports';
import { createUploadPreviews, expandUploads } from './services/uploadReader';

export function App() {
  const [tab, setTab] = useState('Overview');
  const [sourceFiles, setSourceFiles] = useState([]);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [externalReports, setExternalReports] = useState([]);
  const [externalFindings, setExternalFindings] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [findingPage, setFindingPage] = useState(1);
  const [dependencyPage, setDependencyPage] = useState(1);
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
  const findingTotal = analysis?.totals?.findings ?? findings.length;
  const dependencyTotal = analysis?.totals?.dependencies ?? dependencies.length;

  function applyAnalysisRecord(record) {
    setAnalysis(record.analysis);
    setAnalysisId(record.id);
    setFindingPage(1);
    setDependencyPage(1);
    setSelectedFindingId(record.analysis.findings[0]?.id || null);
  }

  async function handleFiles(fileList) {
    if (!fileList?.length) return;
    setLoading(true);
    const selectedFiles = [...fileList];
    const hasZip = selectedFiles.some((file) => /\.zip$/i.test(file.name));
    const expanded = hasZip ? createUploadPreviews(selectedFiles) : await expandUploads(selectedFiles);
    setUploadFiles((current) => [...current, ...selectedFiles]);
    setSourceFiles((current) => [...current, ...expanded]);
    setAnalysis(null);
    setAnalysisId(null);
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
      setAnalysisId(null);
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
      applyAnalysisRecord(record);
      setSourceFiles(record.analysis.files);
      setProgress(100);
      setApiStatus(`Loaded server analysis ${record.id}`);
    } catch (err) {
      setError(`Could not load analysis: ${err.message}`);
    }
  }

  function completeLocalAnalysis(files, importedFindings = externalFindings) {
    const nextAnalysis = analyzeSolution(files, { externalFindings: importedFindings });
    setAnalysis(nextAnalysis);
    setAnalysisId(null);
    setFindingPage(1);
    setDependencyPage(1);
    setSelectedFindingId(nextAnalysis.findings[0]?.id || null);
    setApiStatus('Completed locally in browser');
    return nextAnalysis;
  }

  async function waitForAnalysisJob(jobId) {
    let latest = await fetchAnalysisJob(jobId);
    while (!['completed', 'failed'].includes(latest.status)) {
      setProgress(latest.progress || 20);
      setApiStatus(`${latest.stage || 'Analyzing'} (${latest.status})`);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      latest = await fetchAnalysisJob(jobId);
    }

    setProgress(latest.progress || 100);
    setApiStatus(`${latest.stage || latest.status}`);
    if (latest.status === 'failed') {
      throw new Error(latest.error || 'Analysis job failed.');
    }
    return fetchAnalysisJobResult(jobId);
  }

  async function runAnalysis(files = sourceFiles, importedFindings = externalFindings, serverUploadFiles = uploadFiles) {
    if (!files.length) return;
    setAnalyzing(true);
    setError('');
    setProgress(15);

    try {
      if (runMode === 'server') {
        setProgress(20);
        setApiStatus('Creating analysis job');
        const job = serverUploadFiles.length
          ? await createAnalysisJobFromUploads(serverUploadFiles, importedFindings)
          : await createAnalysisJobFromSources(files, importedFindings);
        setApiStatus(`Queued analysis job ${job.id}`);
        const record = await waitForAnalysisJob(job.id);
        setProgress(85);
        applyAnalysisRecord(record);
        setApiStatus(`Saved server analysis ${record.id}`);
        await refreshHistory();
      } else {
        setProgress(55);
        const localFiles = files.some((file) => file.text?.trim())
          ? files
          : await expandUploads(serverUploadFiles);
        completeLocalAnalysis(localFiles, importedFindings);
      }
      setProgress(100);
    } catch (err) {
      if (runMode === 'server') {
        setError(`Server analysis failed: ${err.message}. Showing local result instead.`);
        completeLocalAnalysis(files, importedFindings);
        setProgress(100);
      } else {
        setError(`Local analysis failed: ${err.message}`);
        setProgress(0);
      }
    } finally {
      setAnalyzing(false);
    }
  }

  function loadSample() {
    setSourceFiles(SAMPLE_FILES);
    setUploadFiles([]);
    setExternalReports([]);
    setExternalFindings([]);
    setAnalysis(null);
    setAnalysisId(null);
    setSelectedFindingId(null);
    setProgress(0);
    setTimeout(() => runAnalysis(SAMPLE_FILES, [], []), 50);
  }

  function clearAll() {
    setSourceFiles([]);
    setUploadFiles([]);
    setExternalReports([]);
    setExternalFindings([]);
    setAnalysis(null);
    setAnalysisId(null);
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

  async function loadMoreFindings() {
    if (!analysisId || findings.length >= findingTotal) return;
    const nextPage = findingPage + 1;
    const page = await fetchAnalysisFindings(analysisId, nextPage, 50);
    setAnalysis((current) => ({
      ...current,
      findings: [...(current?.findings || []), ...page.items]
    }));
    setFindingPage(nextPage);
  }

  async function loadMoreDependencies() {
    if (!analysisId || dependencies.length >= dependencyTotal) return;
    const nextPage = dependencyPage + 1;
    const page = await fetchAnalysisDependencies(analysisId, nextPage, 50);
    setAnalysis((current) => ({
      ...current,
      dependencies: [...(current?.dependencies || []), ...page.items]
    }));
    setDependencyPage(nextPage);
  }

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
                  setAnalysisId(null);
                  setSelectedFindingId(null);
                  setProgress(0);
                }} />
              </div>
              <ArchitectureView analysis={analysis} />
              <AnalyzePanel analysis={analysis} sourceFiles={sourceFiles} analyzing={analyzing} progress={progress} onAnalyze={() => runAnalysis()} runMode={runMode} setRunMode={setRunMode} apiStatus={apiStatus} error={error} />
            </div>
            <div className="bottom-grid">
              <FindingsTable findings={findings} total={findingTotal} analysis={analysis} selectedFindingId={selectedFinding?.id} onSelectFinding={(finding) => setSelectedFindingId(finding.id)} onLoadMore={loadMoreFindings} />
              <Improvements recommendations={recommendations} />
              <DependenciesPanel dependencies={dependencies} total={dependencyTotal} onLoadMore={loadMoreDependencies} />
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
