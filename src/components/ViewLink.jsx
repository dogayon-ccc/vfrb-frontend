import { forwardRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import '../styles/transitions.css';

// BrowserRouter ignores the viewTransition prop, so wrap navigation by hand.
const canMorph = () => 'startViewTransition' in document && !matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useViewNavigate() {
  const navigate = useNavigate();
  return useCallback((to, opts) => {
    if (!canMorph()) return navigate(to, opts);
    document.startViewTransition(() => flushSync(() => navigate(to, opts)));
  }, [navigate]);
}

const withTransition = (Comp) => forwardRef(function ViewAware({ to, onClick, ...rest }, ref) {
  const go = useViewNavigate();
  const onNav = (e) => {
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
