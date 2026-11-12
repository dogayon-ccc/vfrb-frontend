// src/main.jsx — VFRB Enterprise Entry Point
import './utils/safeStorage';
import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './main.css';            // Tailwind v4 + VFRB design tokens (@theme tokens)
import './styles/theme.css';    // :root CSS variables — colors, typography, spacing
import './styles/modals.css';   // Modal, overlay, shared utility classes
import './styles/customer.css'; // Customer portal kit
import './styles/responsive.css'; // Breakpoint overrides
import './styles/premium.css';    // Client portal premium layer (scoped to .cm-shell)
import './styles/refresh.css';    // UI refresh: type scale, serif titles, solid actions (delete this line to undo)
import './styles/tokens-v2.css';   // L4 foundation tokens + fonts (new names only)
import './styles/enterprise.css';  // layout fixes, quieter elevation, print
import './styles/motion-app.css';  // spring tokens + overlay entrances
import App from './App';
import { isChunkLoadError } from './components/PageErrorBoundary';
import BrandedStatus from './components/BrandedStatus';

// After a deploy, a tab still running the old shell (served by the PWA worker)
// asks for chunk hashes that no longer exist. Reload once to pick up the new
// build; the session flag stops a loop if the chunk is genuinely unreachable.
const RELOAD_FLAG = 'vfrb_chunk_reload';
function reloadForNewBuild() {
  if (window.location.pathname.startsWith('/design-studio')) return false; // never drop an unsaved design
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false;
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch { return false; }
  window.location.reload();
  return true;
}
window.addEventListener('vite:preloadError', (e) => { if (reloadForNewBuild()) e.preventDefault(); });
// Loaded fine: re-arm so the next deploy can self-heal too.
setTimeout(() => { try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* storage blocked */ } }, 15000);

// ── Top-level error boundary ──────────────────────────────────────────────
// FIX (BUG-007 hardening): before this, nothing anywhere in the app caught
// an uncaught render/commit error — a single crash (e.g. the Design Studio
// removeChild race) unmounted the entire React tree and left a blank white
// page with no visible message and no way to recover except a manual
// reload. This does NOT fix any specific bug on its own; it's a safety net
// so any *future* uncaught error degrades to an inline message instead of
// a silent blank screen. Deliberately has no external deps (no router, no
// design tokens import) so it can never itself fail to render.
class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[RootErrorBoundary] Uncaught error:', error, info);
    if (isChunkLoadError(error)) reloadForNewBuild();
  }
  render() {
    if (this.state.hasError) {
      return <BrandedStatus title="Something went wrong" body="The app hit an unexpected error. Reloading the page usually fixes this."
        action="Reload page" onAction={() => window.location.reload()}/>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <App/>
    </RootErrorBoundary>
  </StrictMode>
);