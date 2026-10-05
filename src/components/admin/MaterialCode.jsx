export default function MaterialCode({ code }) {
  if (!code) return null;
  return (
    <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 4, background: 'var(--surface-2, #eef3f3)', color: 'var(--text-subtle)', fontSize: 11, fontWeight: 600, fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' }}>
      {code}
    </span>
  );
}
