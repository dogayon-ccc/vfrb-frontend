import { useState } from 'react';
import { NavIcon } from '../../../components/ui/icons';
import LogoAssets from './LogoAssets';
import ShapesPanel from './ShapesPanel';

function Templates({ onInspo, onShowcase }: any) {
  return (
    <div className="ds-stack">
      <button type="button" className="ds-card" onClick={onInspo}>
        <NavIcon name="ai" size={20}/>
        <span><strong>Inspiration</strong><small>Real VFRB uniform photos. Filter by category, piece, gender and sleeve.</small></span>
      </button>
      <button type="button" className="ds-card" onClick={onShowcase}>
        <NavIcon name="image" size={20}/>
        <span><strong>Community showcase</strong><small>Approved designs from other customers to start from.</small></span>
      </button>
    </div>
  );
}

function Layouts({ list = [], onPlace }: any) {
  const [done, setDone] = useState<string | null>(null);
  if (!list.length) return <p className="ds-note">No ready-made layouts for this garment side yet.</p>;
  return (
    <div className="ds-stack" aria-label="Ready-made layouts">
      <p className="ds-note">Each layout adds ordinary layers you can recolour, resize, rotate, duplicate and delete. Placement follows the garment part, not a printed size.</p>
      {list.map(l => (
        <button key={l.id} type="button" className="ds-card" onClick={() => { onPlace(l); setDone(l.id); }}>
          <NavIcon name="shapes" size={20}/>
          <span><strong>{l.name}</strong><small>{done === l.id ? 'Added as layers' : l.note}</small></span>
        </button>
      ))}
    </div>
  );
}

export default function AssetsPanel({ tab, cfg, logo, shapes, layouts, onInspo, onShowcase }: any) {
  return (
    <div className="ds-assets">
      <div className="ds-assets-body" role="tabpanel" id="ds-add-panel">
        {tab === 'logo' && <LogoAssets cfg={cfg} logo={logo}/>}
        {tab === 'shapes' && <ShapesPanel {...shapes}/>}
        {tab === 'layouts' && <Layouts {...layouts}/>}
        {tab === 'templates' && <Templates onInspo={onInspo} onShowcase={onShowcase}/>}
      </div>
    </div>
  );
}
