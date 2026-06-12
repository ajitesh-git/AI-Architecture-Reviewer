import { Boxes, ChevronRight, Database, LineChart, RotateCcw, ShieldCheck } from 'lucide-react';

const icons = [Boxes, Database, ShieldCheck, RotateCcw, LineChart];

export function Improvements({ recommendations }) {
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
