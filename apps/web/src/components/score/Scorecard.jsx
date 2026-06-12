import { ScoreRing } from './ScoreRing';

export function Scorecard({ analysis }) {
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
