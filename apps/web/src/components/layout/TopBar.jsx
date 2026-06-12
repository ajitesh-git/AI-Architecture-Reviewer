import { Bell, ChevronDown, CircleHelp } from 'lucide-react';

export function TopBar({ analysis }) {
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
