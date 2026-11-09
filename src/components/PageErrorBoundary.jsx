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
import BrandedStatus from './BrandedStatus';

// Aug 30 2026 hardening — verified live-production bug (Railway log):
// after a redeploy, a browser tab holding the OLD index.html tries to
// lazy-load a route chunk (Messages/Orders/OrderWizard/AIMaterials —
// all React.lazy() in App.jsx) by its OLD hashed filename. That file no
// longer exists on the server, Railway's static host falls back to
// index.html for the missing asset path, and the browser rejects it for
// MIME mismatch ("Expected a JavaScript module, got text/html").
//
// Before this fix, componentDidCatch just set hasError=true and showed
// "Try Again" — clicking it re-ran the exact same broken import and
// failed again, a genuine dead end with no way out except a manual
// reload the person was never told to do. Confirmed by reading the
// component: no code path anywhere did a hard reload.
//
// Fix: detect the specific chunk-load-failure signature and force a
// real page reload (which fetches the current index.html + current
// chunk manifest), instead of a React state reset. Loop-guarded via
// sessionStorage so a genuine network outage doesn't reload forever —
// same fail-safe-once pattern already used for Gemini key rotation.
const CHUNK_ERROR_PATTERN =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i;

export function isChunkLoadError(error) {
  return !!error && typeof error.message === 'string' && CHUNK_ERROR_PATTERN.test(error.message);
}

class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[PageErrorBoundary] Page crashed:', error, info);

    if (isChunkLoadError(error)) {
      const RELOAD_KEY = 'vfrb_chunk_reload_at';
      const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      const now = Date.now();
      // Only auto-reload once per 10s window — if it fails again right
      // after reloading, it's a real outage, not a stale-deploy race,
      // so stop and show the fallback UI instead of reload-looping.
      if (now - lastReload > 10_000) {
        sessionStorage.setItem(RELOAD_KEY, String(now));
        window.location.reload();
      }
    }
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
      const chunk = this.state.isChunkError;
      return <BrandedStatus inline title={chunk ? 'This page was updated' : 'This page ran into a problem'}
        body={chunk ? 'The app was updated on the server. Reload the page to get the latest version.'
          : 'The rest of the app is still working. Try this page again, or go back home.'}
        action={chunk ? 'Reload page' : 'Try again'}
        onAction={() => chunk ? window.location.reload() : this.setState({ hasError: false, isChunkError: false })}/>;
    }
    return this.props.children;
  }
}

export default PageErrorBoundary;
