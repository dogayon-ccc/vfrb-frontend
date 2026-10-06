import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { storageBlocked } from '../utils/safeStorage';
import { readAuth, isSignedIn } from '../utils/authRoute';

// Only signed-in pages depend on storage surviving a reload, so public pages stay quiet.
export default function StorageNotice() {
  useLocation();
  const [dismissed, setDismissed] = useState(false);
  if (!storageBlocked || dismissed || !isSignedIn(readAuth())) return null;
  return (
    <div role="status" data-storage-bar style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 2147483000, padding: '10px 16px', background: '#7c2d12', color: '#fff', font: '600 13px/1.4 system-ui,sans-serif', textAlign: 'center' }}>
      <span>Your browser is blocking site storage. You can keep working, but you will be signed out when you reload or close this tab.</span>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss storage warning"
        style={{ marginLeft: 12, minHeight: 32, padding: '0 12px', border: '1px solid #fff', borderRadius: 6, background: 'transparent', color: '#fff', font: 'inherit', cursor: 'pointer' }}>Dismiss</button>
    </div>
  );
}
