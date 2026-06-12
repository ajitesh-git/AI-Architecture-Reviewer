import { useEffect, useState } from 'react';
import { SAMPLE_FILES, analyzeSolution } from '@ai-architecture-reviewer/analyzer-core';
import { LeftRail } from './components/layout/LeftRail';
import { PageHeader } from './components/layout/PageHeader';
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
  const [activePage, setActivePage] = useState('Overview');
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
  const overviewFindings = findings.slice(0, 6);
  const overviewDependencies = dependencies.slice(0, 6);
  const primaryTab = ['Overview', 'Findings', 'Scorecard'].includes(activePage) ? activePage : '';
  const showRightColumn = activePage === 'Overview';
  const architectureCount = analysis?.services?.length || 0;
  const astParsed = analysis?.astSummary?.parsed || 0;
  const astTotal = analysis?.astSummary?.total || sourceFiles.length || 0;

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

  function clearExternalReports() {
    setExternalReports([]);
    setExternalFindings([]);
    setAnalysis(null);
    setAnalysisId(null);
    setSelectedFindingId(null);
    setProgress(0);
  }

  function navigateToPage(page) {
    setActivePage(page);
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('sample') === '1') {
      loadSample();
    }
    refreshHistory();
  }, []);

  useEffect(() => {
    document.querySelector('.content')?.scrollTo({ top: 0, left: 0 });
  }, [activePage]);

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

  const uploadAndAnalyze = (
    <div className="top-grid">
      <div className="ingest-column">
        <UploadPanel sourceFiles={sourceFiles} onFiles={handleFiles} onSample={loadSample} onClear={clearAll} loading={loading} />
        <ExternalReportsPanel externalReports={externalReports} externalFindings={externalFindings} onReports={handleExternalReports} onClear={clearExternalReports} />
      </div>
      <ArchitectureView analysis={analysis} />
      <AnalyzePanel analysis={analysis} sourceFiles={sourceFiles} analyzing={analyzing} progress={progress} onAnalyze={() => runAnalysis()} runMode={runMode} setRunMode={setRunMode} apiStatus={apiStatus} error={error} />
    </div>
  );

  const pageContent = {
    Overview: (
      <>
        {uploadAndAnalyze}
        <div className="bottom-grid overview-grid">
          <FindingsTable
            findings={overviewFindings}
            total={findingTotal}
            analysis={analysis}
            selectedFindingId={selectedFinding?.id}
            onSelectFinding={(finding) => setSelectedFindingId(finding.id)}
            onLoadMore={() => navigateToPage('Findings')}
            actionLabel="Open Findings"
          />
          <Improvements recommendations={recommendations.slice(0, 6)} />
          <DependenciesPanel
            dependencies={overviewDependencies}
            total={dependencyTotal}
            onLoadMore={() => navigateToPage('Architecture')}
            actionLabel="Open Architecture"
          />
        </div>
      </>
    ),
    Findings: (
      <div className="page-stack">
        <PageHeader
          title="Findings"
          description="Review anti-patterns, scanner issues, impact, evidence, and remediation guidance."
          metrics={[
            ['Loaded', findings.length],
            ['Total', findingTotal],
            ['Selected', selectedFinding ? selectedFinding.severity : '-']
          ]}
        />
        <div className="page-grid findings-page">
          <FindingsTable
            findings={findings}
            total={findingTotal}
            analysis={analysis}
            selectedFindingId={selectedFinding?.id}
            onSelectFinding={(finding) => setSelectedFindingId(finding.id)}
            onLoadMore={loadMoreFindings}
          />
          <FindingDetailPanel analysis={analysis} finding={selectedFinding} />
        </div>
      </div>
    ),
    Scorecard: (
      <div className="page-stack">
        <PageHeader
          title="Scorecard"
          description="Compare architecture quality across coupling, resilience, maintainability, security, and scalability."
          metrics={[
            ['Overall', analysis ? `${analysis.overall}/100` : '0/100'],
            ['Findings', findingTotal],
            ['Recommendations', recommendations.length]
          ]}
        />
        <div className="page-grid scorecard-page">
          <Scorecard analysis={analysis} />
          <RiskSummary findings={findings} />
          <Improvements recommendations={recommendations} />
        </div>
      </div>
    ),
    Architecture: (
      <div className="page-stack">
        <PageHeader
          title="Architecture"
          description="Inspect inferred services, containers, data stores, calls, and dependency evidence."
          metrics={[
            ['Services', architectureCount],
            ['Dependencies', dependencyTotal],
            ['AST parsed', `${astParsed}/${astTotal}`]
          ]}
        />
        <ArchitectureView analysis={analysis} />
        <DependenciesPanel dependencies={dependencies} total={dependencyTotal} onLoadMore={loadMoreDependencies} />
      </div>
    ),
    Reports: (
      <div className="page-stack narrow-page">
        <PageHeader
          title="Reports"
          description="Attach scanner reports so external security and quality findings are scored with architecture results."
          metrics={[
            ['Reports', externalReports.length],
            ['Imported findings', externalFindings.length],
            ['Artifacts', sourceFiles.length]
          ]}
        />
        <ExternalReportsPanel externalReports={externalReports} externalFindings={externalFindings} onReports={handleExternalReports} onClear={clearExternalReports} />
      </div>
    ),
    History: (
      <div className="page-stack narrow-page">
        <PageHeader
          title="History"
          description="Open persisted server-side analyses and compare previous architecture review runs."
          metrics={[
            ['Saved runs', history.length],
            ['Status', historyLoading ? 'Refreshing' : 'Ready'],
            ['Current', analysisId ? 'Server' : analysis ? 'Local' : '-']
          ]}
        />
        <HistoryPanel history={history} loading={historyLoading} onRefresh={refreshHistory} onOpen={openHistoryRecord} />
      </div>
    ),
    Settings: (
      <div className="page-stack narrow-page">
        <PageHeader
          title="Settings"
          description="Review runtime configuration used by the current browser or desktop session."
          metrics={[
            ['Execution', runMode === 'server' ? 'Server' : 'Local'],
            ['Artifacts', sourceFiles.length],
            ['Progress', `${progress}%`]
          ]}
        />
        <section className="panel settings-panel">
          <h2>Settings</h2>
          <div className="settings-list">
            <div><span>API endpoint</span><strong>{API_BASE_URL}</strong></div>
            <div><span>Default execution</span><strong>{runMode === 'server' ? 'Server' : 'Local browser'}</strong></div>
            <div><span>Loaded artifacts</span><strong>{sourceFiles.length}</strong></div>
          </div>
        </section>
      </div>
    )
  };

  return (
    <main className="app">
      <LeftRail findingCount={findingTotal} activeItem={activePage} onNavigate={navigateToPage} />
      <div className="workspace">
        <TopBar analysis={analysis} />
        <Tabs tab={primaryTab} setTab={navigateToPage} />
        <div className={`content ${showRightColumn ? '' : 'single-column'}`}>
          <div className="main-column">
            {pageContent[activePage] || pageContent.Overview}
          </div>
          {showRightColumn && (
            <aside className="right-column">
              <Scorecard analysis={analysis} />
              <FindingDetailPanel analysis={analysis} finding={selectedFinding} />
              <RiskSummary findings={findings} />
              <HistoryPanel history={history} loading={historyLoading} onRefresh={refreshHistory} onOpen={openHistoryRecord} />
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}
