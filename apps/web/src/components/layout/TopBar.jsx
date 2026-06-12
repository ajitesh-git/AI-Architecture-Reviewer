import { ChevronDown } from 'lucide-react';

export function TopBar({ analysis }) {
  const project = analysis?.services?.[0]?.name || 'Upload a solution';
  const version = analysis ? `${analysis.files.length} artifacts analyzed` : 'No analysis yet';
  return (
    <header className="topbar">
      <h1>AI Architecture Reviewer</h1>
      <label>Project<button className="select">{project}<ChevronDown size={16} /></button></label>
      <label>Version<button className="select">{version}<ChevronDown size={16} /></button></label>
    </header>
  );
}
