export function ScoreRing({ value, label }) {
  const tone = value < 55 ? 'poor' : value < 70 ? 'fair' : 'good';
  return (
    <div className="score-row">
      <span>{label}</span>
      <div className="ring-wrap">
        <div className={`ring ${tone}`} style={{ '--score': `${value * 3.6}deg` }} />
        <strong>{value}</strong>
        <small>/100</small>
        <em>{tone === 'poor' ? 'Poor' : tone === 'fair' ? 'Fair' : 'Good'}</em>
      </div>
    </div>
  );
}
