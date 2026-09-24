// Dev-only harness: renders the repo's own DesignStudio3D with a cfg injected via window.__set().
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import DesignStudio3D from '../../src/pages/client/DesignStudio3D';

function App() {
  const [s, set] = useState({ cfg: {}, overlays: null });
  window.__set = (cfg, overlays = null) => set({ cfg, overlays });
  return <DesignStudio3D cfg={s.cfg} overlays={s.overlays} />;
}
createRoot(document.getElementById('root')).render(<App />);
window.__ready = true;
