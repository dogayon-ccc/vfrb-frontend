import { Button } from '../../../components/ui';
import { NavIcon } from '../../../components/ui/icons';

export default function LoadError({ what, onRetry }) {
  return (
    <div role="alert" className="cx-card" style={{ padding: 22, textAlign: 'center' }}>
      <span aria-hidden="true" style={{ color: 'var(--danger)', display: 'inline-flex' }}><NavIcon name="error" size={22}/></span>
      <p style={{ fontWeight: 800, fontSize: 14, margin: '8px 0 4px', color: 'var(--ink)' }}>Unable to load {what}</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>Check your connection and try again.</p>
      <Button variant="primary" onClick={onRetry}>Retry</Button>
    </div>
  );
}
