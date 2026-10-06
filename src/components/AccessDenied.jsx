import { Link } from 'react-router-dom';

export default function AccessDenied({ what = 'This page', to = '/admin/dashboard', back = 'Back to dashboard' }) {
  return (
    <div role="alert" style={{ maxWidth: 520, margin: '64px auto', padding: '0 20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 8px', color: 'var(--ink, #0f172a)' }}>You don't have access to this page</h1>
      <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted, #475569)' }}>
        {what} is limited to a different role or job function. If you need it, ask a VFRB manager to update your account.
      </p>
      <Link to={to} className="adm-btn primary" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 18px' }}>{back}</Link>
    </div>
  );
}
