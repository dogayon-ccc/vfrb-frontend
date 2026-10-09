// Dev-only harness: renders the repo's own DesignStudio3D with a cfg injected via window.__set().
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import DesignStudio3D from '../../src/pages/client/DesignStudio3D';

function App() {
  const query = new URLSearchParams(location.search);
  const initial = {
    garment: query.get('garment') ?? 'Pants',
    sleeve: query.get('sleeve'), fit: query.get('fit') ?? 'unisex',
    colors: { body: query.get('color') ?? '#274c77' },
    patterns: query.get('pattern') ? { body: query.get('pattern') } : {},
  };
  const [s, set] = useState({ cfg: initial, overlays: null });
  window.__set = (cfg, overlays = null) => set({ cfg, overlays });
  return <DesignStudio3D cfg={s.cfg} overlays={s.overlays} />;
}
createRoot(document.getElementById('root')).render(<App />);
window.__ready = true;
