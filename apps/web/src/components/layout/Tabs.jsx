export function Tabs({ tab, setTab }) {
  return (
    <div className="tabs">
      {['Overview', 'Findings', 'Scorecard'].map((item) => (
        <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>
      ))}
    </div>
  );
}
