// src/pages/client/Profile.jsx — account info, password change, privacy notice.
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Card, Button, Field, Badge, NavIcon } from '../../components/ui';

const CLIENT_TYPES = ['individual', 'school', 'corporate', 'medical', 'government', 'other'];

// ── Toast message ───────────────────────────────────────────────────────
function Toast({ msg, type }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 700,
            marginTop: 12,
            background: type === 'error' ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            color: type === 'error' ? '#dc2626' : '#16a34a',
          }}>
          <NavIcon name={type === 'error' ? 'error' : 'success'} size={14} />
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Password field with show/hide toggle ────────────────────────────────
function PwField({ label, value, onChange, showPw, onTogglePw, placeholder }) {
  return (
    <div style={{ position: 'relative' }}>
      <Field
        label={label}
        type={showPw ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={onTogglePw}
        aria-label={showPw ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute', right: 12, top: 33, border: 'none',
          background: 'transparent', cursor: 'pointer', padding: 4,
          color: 'var(--text-faint)', display: 'flex',
        }}>
        <NavIcon name={showPw ? 'hide' : 'show'} size={16} />
      </button>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────
export default function CustomerProfile() {
  const [form, setForm]         = useState({});
  const [pwForm, setPwForm]     = useState({ current_password: '', password: '', password_confirmation: '' });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [msg, setMsg]           = useState('');
  const [err, setErr]           = useState('');
  const [pwMsg, setPwMsg]       = useState('');
  const [pwErr, setPwErr]       = useState('');
  const [showPw, setShowPw]     = useState({ cur: false, new: false, con: false });

  useEffect(() => {
    axios.get('/api/customer/profile')
      .then(r => setForm(r.data?.user ?? r.data ?? {}))
      .catch(() => setErr('Could not load your profile. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveProfile = async () => {
    setSaving(true); setMsg(''); setErr('');
    try {
      await axios.put('/api/customer/profile', {
        name:              form.name,
        contact_number:    form.contact_number,
        address:           form.address,
        organization_name: form.organization_name,
        client_type:       form.client_type,
      });
      const u = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
      localStorage.setItem('vfrb_user', JSON.stringify({ ...u, name: form.name }));
      setMsg('Profile updated successfully.');
    } catch (e) {
      setErr(e.response?.data?.message ?? 'Failed to update profile.');
    } finally { setSaving(false); }
  };

  const savePw = async () => {
    if (pwForm.password !== pwForm.password_confirmation) {
      setPwErr('Passwords do not match.'); return;
    }
    if (pwForm.password.length < 8) {
      setPwErr('Password must be at least 8 characters.'); return;
    }
    setSavingPw(true); setPwMsg(''); setPwErr('');
    try {
      await axios.put('/api/customer/profile/password', pwForm);
      setPwMsg('Password changed successfully.');
      setPwForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (e) {
      setPwErr(e.response?.data?.message ?? 'Failed to change password.');
    } finally { setSavingPw(false); }
  };

  const SK = {
    borderRadius: 8, height: 42,
    background: 'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)',
    backgroundSize: '400px', animation: 'sk 1.4s infinite',
  };

  return (
    <>
      <style>{`
        .profile-grid { display:grid; grid-template-columns:1fr; gap:14px; }
        .profile-field-row { display:grid; grid-template-columns:1fr; gap:12px; }
        .profile-avatar-card { flex-direction:column; align-items:flex-start; gap:12px; }
        @media (min-width:768px) {
          .profile-grid { gap:14px; }
          .profile-field-row { grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); }
          .profile-avatar-card { flex-direction:row; align-items:center; }
        }
        @media (min-width:1024px) {
          .profile-grid { grid-template-columns:1fr 1fr; gap:16px; align-items:start; }
        }
      `}</style>

      <div style={{ width: '100%' }}>

        {/* Page header */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 'clamp(18px,3vw,22px)', fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>
            Profile
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
            Manage your account information and security settings.
          </p>
        </div>

        <div className="profile-grid">

          {/* ── LEFT COLUMN: Account info ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Avatar card */}
            <Card padding="sm">
              <div className="profile-avatar-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  style={{
                    width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,var(--teal),var(--teal-2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 24, fontWeight: 800,
                    boxShadow: '0 4px 14px rgba(2,128,144,.3)',
                  }}>
                  {(form.name ?? '?').charAt(0).toUpperCase()}
                </motion.div>
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontSize: 16, fontWeight: 800, color: 'var(--ink)', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {loading ? '—' : (form.name ?? 'Client')}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                    {form.email ?? '—'}
                  </p>
                  <div style={{ marginTop: 6 }}>
                    <Badge tone="info">Client</Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Account info form */}
            <Card title="Account Information">
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3, 4].map(i => <div key={i} style={SK} />)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  <div className="profile-field-row">
                    <Field label="Full Name" value={form.name ?? ''}
                      onChange={e => set('name', e.target.value)}
                      placeholder="Your full name" />
                    <Field label="Email Address" value={form.email ?? ''} disabled />
                  </div>

                  <div className="profile-field-row">
                    <Field label="Contact Number" value={form.contact_number ?? ''}
                      onChange={e => set('contact_number', e.target.value)}
                      placeholder="09XXXXXXXXX" />
                    <Field as="select" label="Client Type" value={form.client_type ?? 'individual'}
                      onChange={e => set('client_type', e.target.value)}>
                      {CLIENT_TYPES.map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </Field>
                  </div>

                  <Field label="Organization / School Name" value={form.organization_name ?? ''}
                    onChange={e => set('organization_name', e.target.value)}
                    placeholder="e.g. Southville International School" />

                  <Field label="Address" value={form.address ?? ''}
                    onChange={e => set('address', e.target.value)}
                    placeholder="City, Province" />

                  <Toast msg={msg} type="success" />
                  <Toast msg={err} type="error" />

                  <Button variant="primary" fullWidth icon="save" loading={saving} onClick={saveProfile}>
                    {saving ? 'Saving…' : 'Save Profile'}
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* ── RIGHT COLUMN: Password + Privacy ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <Card title="Change Password">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <PwField label="Current Password" value={pwForm.current_password}
                  onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
                  showPw={showPw.cur} onTogglePw={() => setShowPw(s => ({ ...s, cur: !s.cur }))}
                  placeholder="Enter current password" />
                <PwField label="New Password" value={pwForm.password}
                  onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))}
                  showPw={showPw.new} onTogglePw={() => setShowPw(s => ({ ...s, new: !s.new }))}
                  placeholder="Minimum 8 characters" />
                <PwField label="Confirm New Password" value={pwForm.password_confirmation}
                  onChange={e => setPwForm(f => ({ ...f, password_confirmation: e.target.value }))}
                  showPw={showPw.con} onTogglePw={() => setShowPw(s => ({ ...s, con: !s.con }))}
                  placeholder="Repeat new password" />

                {pwForm.password.length > 0 && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: pwForm.password.length >= i * 2
                          ? (i <= 2 ? 'var(--warning)' : 'var(--success)')
                          : 'var(--border)',
                        transition: 'background .2s',
                      }} />
                    ))}
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4, alignSelf: 'center', whiteSpace: 'nowrap' }}>
                      {pwForm.password.length < 4 ? 'Weak' : pwForm.password.length < 8 ? 'Fair' : 'Strong'}
                    </span>
                  </div>
                )}

                <Toast msg={pwMsg} type="success" />
                <Toast msg={pwErr} type="error" />

                <Button variant="primary" fullWidth icon="lock" loading={savingPw} onClick={savePw}>
                  {savingPw ? 'Changing…' : 'Change Password'}
                </Button>
              </div>
            </Card>

            {/* Privacy notice */}
            <Card tone="subtle" padding="sm">
              <p style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px',
              }}>
                <NavIcon name="lock" size={13} />
                Data Privacy (RA 10173)
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                Your information is used exclusively to process your orders and communicate
                with VFRB Enterprise. We store minimum necessary data only. Passwords are
                encrypted with bcrypt. Your account data is never shared with third parties.
              </p>
            </Card>

            {/* Account actions */}
            <Card padding="sm">
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', margin: '0 0 12px' }}>
                Account
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  Member since:{' '}
                  <strong style={{ color: 'var(--ink)' }}>
                    {form.created_at
                      ? new Date(form.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
                      : '—'}
                  </strong>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Email verified:</span>
                  {form.email_verified_at
                    ? <Badge tone="success" icon="success">Verified</Badge>
                    : <Badge tone="warning" icon="warning">Not verified</Badge>}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
