function getDesktopApiBaseUrl() {
  const searchParams = new URLSearchParams(globalThis.location?.search || '');
  return globalThis.desktopConfig?.apiBaseUrl || searchParams.get('aarApiBaseUrl');
}

export const API_BASE_URL = getDesktopApiBaseUrl()
  || import.meta.env.VITE_API_BASE_URL
  || 'http://127.0.0.1:8080';

export async function createServerAnalysis(sourceFiles, externalFindings = []) {
  const response = await fetch(`${API_BASE_URL}/api/analyses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: sourceFiles, externalFindings })
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Analysis API returned ${response.status}`);
  }
  return response.json();
}

export async function createServerUploadAnalysis(uploadFiles, externalFindings = []) {
  const body = new FormData();
  uploadFiles.forEach((file) => body.append('files', file, file.webkitRelativePath || file.name));
  if (externalFindings.length) {
    body.append('externalFindings', JSON.stringify(externalFindings));
  }

  const response = await fetch(`${API_BASE_URL}/api/analyses`, {
    method: 'POST',
    body
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Analysis API returned ${response.status}`);
  }
  return response.json();
}

export async function createAnalysisJobFromUploads(uploadFiles, externalFindings = []) {
  const body = new FormData();
  uploadFiles.forEach((file) => body.append('files', file, file.webkitRelativePath || file.name));
  if (externalFindings.length) {
    body.append('externalFindings', JSON.stringify(externalFindings));
  }

  const response = await fetch(`${API_BASE_URL}/api/analysis-jobs`, {
    method: 'POST',
    body
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Analysis job API returned ${response.status}`);
  }
  return response.json();
}

export async function createAnalysisJobFromSources(sourceFiles, externalFindings = []) {
  const response = await fetch(`${API_BASE_URL}/api/analysis-jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: sourceFiles, externalFindings })
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Analysis job API returned ${response.status}`);
  }
  return response.json();
}

export async function fetchAnalysisJob(id) {
  const response = await fetch(`${API_BASE_URL}/api/analysis-jobs/${id}`);
  if (!response.ok) throw new Error(`Analysis job API returned ${response.status}`);
  return response.json();
}

export async function fetchAnalysisJobResult(id) {
  const response = await fetch(`${API_BASE_URL}/api/analysis-jobs/${id}/result`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Analysis job result API returned ${response.status}`);
  }
  return response.json();
}

export async function fetchAnalysisHistory() {
  const response = await fetch(`${API_BASE_URL}/api/analyses`);
  if (!response.ok) throw new Error(`History API returned ${response.status}`);
  return response.json();
}

export async function fetchAnalysisRecord(id) {
  const response = await fetch(`${API_BASE_URL}/api/analyses/${id}`);
  if (!response.ok) throw new Error(`Analysis API returned ${response.status}`);
  return response.json();
}

export async function fetchAnalysisFindings(id, page = 1, pageSize = 50) {
  const response = await fetch(`${API_BASE_URL}/api/analyses/${id}/findings?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) throw new Error(`Findings API returned ${response.status}`);
  return response.json();
}

export async function fetchAnalysisDependencies(id, page = 1, pageSize = 50) {
  const response = await fetch(`${API_BASE_URL}/api/analyses/${id}/dependencies?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) throw new Error(`Dependencies API returned ${response.status}`);
  return response.json();
}
