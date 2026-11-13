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

export default function AssetsPanel({ tab, cfg, logo, shapes, onInspo, onShowcase }: any) {
  return (
    <div className="ds-assets">
      <div className="ds-assets-body" role="tabpanel" id="ds-add-panel">
        {tab === 'logo' && <LogoAssets cfg={cfg} logo={logo}/>}
        {tab === 'shapes' && <ShapesPanel {...shapes}/>}
        {tab === 'templates' && <Templates onInspo={onInspo} onShowcase={onShowcase}/>}
      </div>
    </div>
  );
}
