import { useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import Button from './ui/Button';

// Hidden in the Studio so a reload can never drop an unsaved design; it reappears on the next route.
export default function UpdatePrompt() {
  const { pathname } = useLocation();
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();
  if (!needRefresh || pathname.startsWith('/design-studio')) return null;
  // workbox skips its own reload for updates found >60s after load, so reload on takeover here.
  const refresh = () => {
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    updateServiceWorker(true);
  };
  return (
    <div className="cx-toast cx-update" role="status" aria-live="polite">
      <span>New version available.</span>
      <Button size="md" onClick={refresh}>Refresh</Button>
      <Button size="md" variant="ghost" style={{ color: 'inherit' }} onClick={() => setNeedRefresh(false)}>Later</Button>
    </div>
  );
}
