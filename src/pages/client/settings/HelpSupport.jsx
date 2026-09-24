// src/pages/client/settings/HelpSupport.jsx
// Static content — real VFRB contact details, same facts used in Footer.jsx.
// No backend needed; nothing here is user data.
import { useNavigate } from 'react-router-dom';
import Card from '../../../components/ui/Card';
import { NavIcon } from '../../../components/ui/icons';

const FONT = 'var(--font)';

const ROWS = [
  ['location', 'Address', '#31 San Guillermo St., Bayanan, Muntinlupa City, Philippines 1772'],
  ['phone', 'Phone', '0921 791 6259'],
  ['email', 'Email', 'vfrb.enterprise@gmail.com'],
];

export default function HelpSupport() {
  const nav = useNavigate();
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => nav('/settings')} aria-label="Back to Account Settings"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-muted)' }}>
          <NavIcon name="back" size={20}/>
        </button>
        <h1 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Help & Support</h1>
      </div>

      <Card title="Contact VFRB Enterprise">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ROWS.map(([icon, label, value]) => (
            <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <NavIcon name={icon} size={16} color="var(--teal)" style={{ marginTop: 1 }}/>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em',
                  color: 'var(--text-muted)', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 13, color: 'var(--ink)', margin: '3px 0 0' }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 16, textAlign: 'center' }}>
        For order-specific questions, use Messages instead — it goes straight to VFRB staff handling your order.
      </p>
    </div>
  );
}
