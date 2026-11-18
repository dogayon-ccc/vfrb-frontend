import { forwardRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import '../styles/transitions.css';

// The single link/navigate entry point. A navigation slides: deeper paths forward, shallower paths (and Home) back.
// Browsers without View Transitions, and visitors who prefer reduced motion, get an instant navigation (no transition at all).
// BrowserRouter ignores the viewTransition prop, so the transition is wrapped by hand.
const canMorph = () => typeof document !== 'undefined' && 'startViewTransition' in document && !matchMedia('(prefers-reduced-motion: reduce)').matches;
const depth = (p: unknown) => (typeof p === 'string' ? p.split(/[?#]/)[0].split('/').filter(Boolean).length : 1);

export function useViewNavigate() {
  const navigate = useNavigate();
  return useCallback((to: any, opts?: any) => {
    if (!canMorph()) return navigate(to, opts);
    document.documentElement.dataset.nav = to === '/' || depth(to) < depth(location.pathname) ? 'back' : 'forward';
    (document as any).startViewTransition(() => flushSync(() => navigate(to, opts)));
  }, [navigate]);
}

const withTransition = (Comp: any) => forwardRef(function ViewAware({ to, onClick, ...rest }: any, ref) {
  const go = useViewNavigate();
  const onNav = (e: any) => {
    onClick?.(e);
    const plain = !e.defaultPrevented && e.button === 0 && !rest.target && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
    if (!plain || typeof to !== 'string') return;
    e.preventDefault();
    go(to, { replace: rest.replace, state: rest.state });
  };
  return <Comp ref={ref} to={to} onClick={onNav} {...rest} />;
});

export const ViewLink = withTransition(Link);
export const ViewNavLink = withTransition(NavLink);
