import { Boxes, Minus } from 'lucide-react';
import { navItems } from './navigation';

export function LeftRail({ findingCount }) {
  return (
    <aside className="rail">
      <div className="brand-mark"><Boxes size={22} /></div>
      <nav>
        {navItems.map(([label, Icon], index) => (
          <button className={index === 0 ? 'active' : ''} key={label}>
            <span className="nav-icon">
              <Icon size={20} />
              {label === 'Findings' && findingCount > 0 && <b>{findingCount}</b>}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <button className="collapse"><Minus size={18} /><span>Collapse</span></button>
    </aside>
  );
}
