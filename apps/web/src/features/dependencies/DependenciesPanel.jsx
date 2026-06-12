import { Boxes, ChevronRight, Database, FileCode2, GitBranch, Workflow } from 'lucide-react';

const typeIcon = {
  call: Workflow,
  datastore: Database,
  module: Boxes,
  procedure: GitBranch
};

function formatLocation(dependency) {
  if (!dependency.file) return '-';
  return dependency.line ? `${dependency.file}:${dependency.line}` : dependency.file;
}

export function DependenciesPanel({ dependencies, total, onLoadMore, actionLabel = 'View more evidence' }) {
  const visible = dependencies;
  const hasMore = dependencies.length < total;
  return (
    <section className="panel dependencies-panel">
      <div className="panel-title">
        <h2>Dependencies <span>{total}</span></h2>
      </div>
      <table className="dependencies-table">
        <thead>
          <tr><th>Type</th><th>From</th><th>To</th><th>Evidence</th><th /></tr>
        </thead>
        <tbody>
          {visible.map((dependency, index) => {
            const Icon = typeIcon[dependency.type] || FileCode2;
            return (
              <tr key={`${dependency.from}-${dependency.to}-${dependency.type}-${index}`}>
                <td>
                  <span className={`dependency-type ${dependency.type}`}>
                    <Icon size={13} /> {dependency.type}
                  </span>
                </td>
                <td>{dependency.from}</td>
                <td>{dependency.to}</td>
                <td title={formatLocation(dependency)}>{formatLocation(dependency)}</td>
                <td><ChevronRight size={15} /></td>
              </tr>
            );
          })}
          {visible.length === 0 && <tr><td colSpan="5" className="empty-cell">Run analysis to infer module, service, database, and procedure dependencies.</td></tr>}
        </tbody>
      </table>
      <div className="panel-foot">
        <span>{total ? `1-${visible.length} of ${total}` : '0 dependencies'}</span>
        <button disabled={!hasMore && actionLabel === 'View more evidence'} onClick={onLoadMore}>{actionLabel} <ChevronRight size={15} /></button>
      </div>
    </section>
  );
}
