import { useEffect } from 'react';

// One tab title per page so screen readers announce where a route change landed.
export default function usePageTitle(title) {
  useEffect(() => {
    if (!title) return undefined;
    document.title = `${title} | VFRB Enterprise`;
    return () => { document.title = 'VFRB Enterprise'; };
  }, [title]);
}
