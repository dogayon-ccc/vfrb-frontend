// src/components/PageErrorBoundary.jsx
// Page-level error boundary (Aug 23 2026 — Option C hardening).
//
// main.jsx already has a RootErrorBoundary wrapping the ENTIRE app — a
// good safety net, but it means a crash in any single page (e.g. a bad
// render in the Design Studio, or a chart component choking on unexpected
// data) still unmounts everything, including the sidebar and navigation.
// The person loses their way back, not just the broken page.
//
// This component wraps just the routed page content (<Outlet/> inside
// each layout), so a crash degrades to "this page broke" INSIDE the
// content area, while the sidebar/topbar/nav around it stay fully usable
// — the person can navigate away without a full reload.
//
// Deliberately minimal, no external deps beyond React itself, matching
// the same reasoning as RootErrorBoundary: a boundary that itself might
// fail to render defeats the purpose.

import { Component } from 'react';

const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;

class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[PageErrorBoundary] Page crashed:', error, info);
  }

  // Reset when the route changes, so navigating away and back to a
  // *different* page doesn't stay stuck on the old error state.
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12, padding: '60px 24px',
          textAlign: 'center', fontFamily: FONT, minHeight: 320,
        }}>
          <p style={{ fontSize: 34, margin: 0, opacity: .35 }}>⚠️</p>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            This page ran into a problem
          </h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0, maxWidth: 380 }}>
            The rest of the app is still working — use the sidebar to go
            somewhere else, or try reloading just this page.
          </p>
          <button onClick={() => this.setState({ hasError: false })} style={{
            padding: '9px 20px', borderRadius: 10, border: 'none',
            background: '#028090', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: FONT,
          }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default PageErrorBoundary;
