import { Minus, Plus } from 'lucide-react';

export function ArchitectureView({ analysis }) {
  const services = analysis?.services?.slice(0, 6) || [];
  const datastores = analysis?.datastores?.slice(0, 3) || [];
  return (
    <section className="panel arch-panel">
      <div className="panel-title"><h2>Architecture View</h2></div>
      <div className="mode-tabs">
        {['System Context', 'Containers', 'Components', 'Deployment'].map((mode, index) => (
          <button className={index === 1 ? 'active' : ''} key={mode}>{mode}</button>
        ))}
      </div>
      <div className="canvas dynamic-canvas">
        <div className="legend">
          <span><i className="solid" /> Service</span>
          <span><i className="dash" /> Call</span>
          <span><i className="store" /> Data Store</span>
          <span><i className="risk" /> Finding</span>
        </div>
        {services.length === 0 && <div className="empty-graph">Upload a solution and run analysis to build the architecture map.</div>}
        {services.map((service, index) => (
          <div className="node graph-node" style={{ '--x': `${22 + (index % 3) * 28}%`, '--y': `${132 + Math.floor(index / 3) * 96}px` }} key={service.name}>
            {service.name}<small>{service.files} files</small>
          </div>
        ))}
        {datastores.map((store, index) => (
          <div className="db graph-db" style={{ '--x': `${25 + index * 26}%`, '--y': '322px' }} key={store}>{store}</div>
        ))}
        <svg className="links" viewBox="0 0 720 430" preserveAspectRatio="none">
          {services.slice(0, 5).map((_, index) => <path key={index} d={`M${170 + index * 82} 185 L${210 + index * 70} 315`} className={index % 2 ? 'dash' : ''} />)}
          {analysis?.findings?.slice(0, 2).map((_, index) => <path key={`risk-${index}`} d={`M${280 + index * 100} 210 L${350 + index * 50} 210`} className="risk" />)}
        </svg>
        <div className="zoom"><button><Minus size={15} /></button><span>{services.length || 0} services</span><button><Plus size={15} /></button></div>
      </div>
    </section>
  );
}
