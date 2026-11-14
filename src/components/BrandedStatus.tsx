// Branded full-page or inline status (404, crash). Inline styles and a plain link only, so it renders even when the router or CSS failed.
const NAVY = '#1B2A4A', TEAL = '#028090', CHALK = '#F4F5F2', KRAFT = '#C9A27A';
const SANS = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif";

export default function BrandedStatus({ code, title, body, action, onAction, inline = false }: any) {
  const btn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, padding: '0 20px', borderRadius: 10,
    fontSize: 14, fontWeight: 700, fontFamily: SANS, textDecoration: 'none', cursor: 'pointer' };
  const Wrap = inline ? 'div' : 'main';
  return (
    <Wrap style={{ minHeight: inline ? 320 : '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, boxSizing: 'border-box', background: inline ? 'transparent' : NAVY, fontFamily: SANS }}>
      <div role="alert" style={{ width: '100%', maxWidth: 440, background: CHALK, borderRadius: 16, padding: '28px 20px', boxSizing: 'border-box',
        textAlign: 'center', borderTop: `4px solid ${inline ? TEAL : KRAFT}` }}>
        <img src="/pwa-192x192.png" alt="VFRB Enterprise seal" width="64" height="64" style={{ borderRadius: '50%', display: 'block', margin: '0 auto 12px' }} />
        {code && <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: '#046A78' }}>{code}</p>}
        <h1 style={{ margin: '0 0 8px', fontFamily: 'var(--rg-sans, ui-sans-serif, system-ui, sans-serif)', fontStyle: 'italic', fontWeight: 800, fontSize: 28, lineHeight: 1.15, color: NAVY }}>{title}</h1>
        <p style={{ margin: '0 0 20px', fontSize: 15, lineHeight: 1.55, color: '#3D4A63', overflowWrap: 'anywhere' }}>{body}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {action && <button type="button" onClick={onAction} style={{ ...btn, border: 0, background: TEAL, color: '#fff' }}>{action}</button>}
          <a href="/" style={{ ...btn, border: `1px solid ${NAVY}`, background: action ? 'transparent' : NAVY, color: action ? NAVY : '#fff' }}>Back to home</a>
        </div>
      </div>
    </Wrap>
  );
}
