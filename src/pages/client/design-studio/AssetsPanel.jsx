import { NavIcon } from '../../../components/ui/icons';
import LogoAssets from './LogoAssets';
import ShapesPanel from './ShapesPanel';

const TABS = [
  { id: 'logo',      label: 'Logo',      icon: 'logo' },
  { id: 'shapes',    label: 'Shapes',    icon: 'shapes' },
  { id: 'templates', label: 'Templates', icon: 'ai' },
];

function Templates({ onInspo, onShowcase }) {
  return (
    <div className="ds-stack">
      <button type="button" className="ds-card" onClick={onInspo}>
        <NavIcon name="ai" size={20}/>
        <span><strong>Inspiration</strong><small>Starter designs in Philippine institutional colors.</small></span>
      </button>
      <button type="button" className="ds-card" onClick={onShowcase}>
        <NavIcon name="image" size={20}/>
        <span><strong>Community showcase</strong><small>Approved designs from other clients to start from.</small></span>
      </button>
    </div>
  );
}

export default function AssetsPanel({ tab, setTab, cfg, logo, shapes, onInspo, onShowcase }) {
  return (
    <div className="ds-assets">
      <div className="ds-seg" role="tablist" aria-label="Asset type">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            <NavIcon name={t.icon} size={14}/>{t.label}
          </button>
        ))}
      </div>
      <div className="ds-assets-body" role="tabpanel">
        {tab === 'logo' && <LogoAssets cfg={cfg} logo={logo}/>}
        {tab === 'shapes' && <ShapesPanel {...shapes}/>}
        {tab === 'templates' && <Templates onInspo={onInspo} onShowcase={onShowcase}/>}
      </div>
    </div>
  );
}
