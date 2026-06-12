export function PageHeader({ title, description, metrics = [], actions = null }) {
  return (
    <header className="page-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {metrics.length > 0 && (
        <dl className="page-metrics">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
