import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Card, Button, Field, Badge, NavIcon } from '../../../components/ui';
import { Skeleton, useToast, fmtDate } from '../../../components/customer/kit';


export function ProfileSection() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, show] = useToast();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    axios.get('/api/customer/profile')
      .then(r => setForm(r.data?.user ?? r.data ?? {}))
      .catch(() => show('Could not load your profile. Please refresh.', 'error'))
      .finally(() => setLoading(false));
  }, [show]);

  const save = async () => {
    setSaving(true);
    try {
      await axios.put('/api/customer/profile', {
        name: form.name, contact_number: form.contact_number, address: form.address,
        organization_name: form.organization_name, client_type: form.client_type,
      });
      const u = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
      localStorage.setItem('vfrb_user', JSON.stringify({ ...u, name: form.name }));
      show('Profile updated.');
    } catch (e) {
      show(e.response?.data?.message ?? 'Failed to update profile.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="st-stack">
      <Card title="Account Information">
        {loading ? (
          <div className="st-stack">{[1, 2, 3, 4].map(i => <Skeleton key={i} h={44} />)}</div>
        ) : (
          <div className="st-stack">
            <div className="st-2col">
              <Field label="Full Name" value={form.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="Your full name" />
              <Field label="Email Address" value={form.email ?? ''} disabled />
              <Field label="Contact Number" value={form.contact_number ?? ''} onChange={e => set('contact_number', e.target.value)} placeholder="09XXXXXXXXX" />
            </div>
            <Field label="Organization / School Name" value={form.organization_name ?? ''} onChange={e => set('organization_name', e.target.value)} placeholder="e.g. Southville International School" />
            <Field label="Address" value={form.address ?? ''} onChange={e => set('address', e.target.value)} placeholder="City, Province" />
            <Button variant="primary" fullWidth icon="save" loading={saving} onClick={save}>{saving ? 'Saving' : 'Save Profile'}</Button>
          </div>
        )}
      </Card>

      <Card tone="subtle" padding="sm">
        <div className="st-meta">
          <span>Member since <b>{fmtDate(form.created_at, { year: 'numeric', month: 'long', day: 'numeric' })}</b></span>
          {form.email_verified_at
            ? <Badge tone="success" icon="success">Email verified</Badge>
            : <Badge tone="warning" icon="warning">Email not verified</Badge>}
        </div>
      </Card>
      {toast}
    </div>
  );
}

function PwField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <Field label={label} type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} style={{ paddingRight: 48 }} />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}
        className="st-eye"><NavIcon name={show ? 'hide' : 'show'} size={16} /></button>
    </div>
  );
}

const BLANK = { current_password: '', password: '', password_confirmation: '' };

export function PasswordSection() {
  const [pw, setPw] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [toast, show] = useToast();
  const on = (k) => (e) => setPw(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (pw.password !== pw.password_confirmation) return show('Passwords do not match.', 'error');
    if (pw.password.length < 8) return show('Password must be at least 8 characters.', 'error');
    setSaving(true);
    try {
      await axios.put('/api/customer/profile/password', pw);
      setPw(BLANK); show('Password changed.');
    } catch (e) {
      show(e.response?.data?.message ?? 'Failed to change password.', 'error');
    } finally { setSaving(false); }
  };

  const level = pw.password.length < 4 ? 1 : pw.password.length < 8 ? 2 : 4;
  return (
    <div className="st-stack">
      <Card title="Change Password">
        <div className="st-stack">
          <PwField label="Current Password" value={pw.current_password} onChange={on('current_password')} placeholder="Enter current password" />
          <PwField label="New Password" value={pw.password} onChange={on('password')} placeholder="Minimum 8 characters" />
          <PwField label="Confirm New Password" value={pw.password_confirmation} onChange={on('password_confirmation')} placeholder="Repeat new password" />
          {pw.password && (
            <div className="st-meter" aria-live="polite">
              {[1, 2, 3, 4].map(i => <i key={i} data-on={i <= level} data-l={level} />)}
              <span>{level === 1 ? 'Weak' : level === 2 ? 'Fair' : 'Strong'}</span>
            </div>
          )}
          <Button variant="primary" fullWidth icon="lock" loading={saving} onClick={save}>{saving ? 'Changing' : 'Change Password'}</Button>
        </div>
      </Card>
      <Card tone="subtle" padding="sm">
        <p className="st-privt" style={{ margin: 0 }}>Can't remember your current password? <Link to="/forgot-password" state={{ from: '/settings?tab=password' }} style={{ color: 'var(--teal)', fontWeight: 700 }}>Reset it by email</Link>.</p>
      </Card>
      <Card title="Google Sign-In">
        <p className="st-privt" style={{ margin: 0 }}>You can sign in with Google on the login page using the same email as this account. Connection status will appear here once VFRB enables account linking.</p>
      </Card>
      <Card title="Close Account">
        <p className="st-privt" style={{ margin: '0 0 12px' }}>To close your account or remove your data, message VFRB staff.</p>
        <Link to="/messages" className="cx-btn cx-btn-s" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>Message VFRB</Link>
      </Card>
      <Card tone="subtle" padding="sm">
        <p className="st-priv"><NavIcon name="lock" size={13} /> Data Privacy (RA 10173)</p>
        <p className="st-privt">Your information is used only to process your orders and communicate with VFRB Enterprise. Passwords are encrypted, and your data is never shared with third parties.</p>
      </Card>
      {toast}
    </div>
  );
}
