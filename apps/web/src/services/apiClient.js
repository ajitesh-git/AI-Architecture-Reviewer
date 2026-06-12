export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

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
