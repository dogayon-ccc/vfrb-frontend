// src/main.jsx — VFRB Enterprise Entry Point
import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import './main.css';            // Tailwind v4 + VFRB design tokens (@theme tokens)
import './styles/theme.css';    // :root CSS variables — colors, typography, spacing
import './styles/modals.css';   // Modal, overlay, shared utility classes
import './styles/responsive.css'; // Breakpoint overrides
import App from './App.jsx';

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
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14,
          background: '#f8fafc', padding: 24, textAlign: 'center',
          fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif",
        }}>
          <p style={{ fontSize: 40, margin: 0, opacity: .3 }}>⚠️</p>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0, maxWidth: 380 }}>
            The app hit an unexpected error and couldn't continue. Reloading
            the page usually fixes this.
          </p>
          <button onClick={() => window.location.reload()} style={{
            padding: '10px 22px', borderRadius: 10, border: 'none',
            background: '#028090', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
          }}>
            Reload Page
          </button>
        </div>
      );
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