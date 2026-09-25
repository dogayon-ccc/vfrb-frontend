// src/pages/client/BillingProfiles.jsx — saved invoice-recipient details.
// Backend (BillingProfileController) was fully built with no frontend page consuming it — this closes that gap.
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Card, Button, Field, Badge, NavIcon } from '../../components/ui';
import EmptyState from '../../components/EmptyState';

function Toast({ msg, type }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }} role="status" aria-live="polite"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px',
            borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 700, marginTop: 12,
            background: type === 'error' ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            color: type === 'error' ? '#dc2626' : '#16a34a' }}>
          <NavIcon name={type === 'error' ? 'error' : 'success'} size={14}/>
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const BLANK = { billing_name: '', tin: '', billing_address: '', billing_email: '', is_default: false };

function ProfileForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial ?? BLANK);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.billing_name.trim() || !form.billing_address.trim()) {
      setErr('Billing name and address are required.'); return;
    }
    setSaving(true); setErr('');
    try {
      const body = { billing_name: form.billing_name, tin: form.tin || null,
        billing_address: form.billing_address, billing_email: form.billing_email || null,
        is_default: !!form.is_default };
      const { data } = form.billing_id
        ? await axios.put(`/api/customer/billing-profiles/${form.billing_id}`, body)
        : await axios.post('/api/customer/billing-profiles', body);
      onSaved(data);
    } catch (e) {
      setErr(e.response?.data?.message ?? 'Failed to save billing profile.');
    } finally { setSaving(false); }
  };

  return (
    <Card title={form.billing_id ? 'Edit Billing Profile' : 'New Billing Profile'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Billing Name" value={form.billing_name} onChange={e => set('billing_name', e.target.value)}
          placeholder="e.g. VFRB Client / Company Name"/>
        <Field label="TIN (optional)" value={form.tin} onChange={e => set('tin', e.target.value)}
          placeholder="000-000-000-000"/>
        <Field label="Billing Address" value={form.billing_address} onChange={e => set('billing_address', e.target.value)}
          placeholder="Full billing address"/>
        <Field label="Billing Email (optional)" type="email" value={form.billing_email}
          onChange={e => set('billing_email', e.target.value)} placeholder="billing@company.com"/>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!form.is_default} onChange={e => set('is_default', e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--teal)' }}/>
          Set as default billing profile
        </label>

        <Toast msg={err} type="error"/>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" fullWidth onClick={onCancel}>Cancel</Button>
          <Button variant="primary" fullWidth icon="save" loading={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ProfileRow({ p, onEdit, onDelete }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)',
      background: 'var(--bg-card)', display: 'flex', alignItems: 'flex-start', gap: 12,
      justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', margin: 0 }}>{p.billing_name}</p>
          {!!p.is_default && <Badge tone="teal">Default</Badge>}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>{p.billing_address}</p>
        {(p.tin || p.billing_email) && (
          <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '4px 0 0' }}>
            {p.tin && `TIN ${p.tin}`}{p.tin && p.billing_email && ' · '}{p.billing_email}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onEdit(p)} aria-label={`Edit ${p.billing_name}`}
          style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 9,
            padding: 8, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', minWidth: 44, minHeight: 44,
            alignItems: 'center', justifyContent: 'center' }}>
          <NavIcon name="edit" size={14}/>
        </button>
        <button onClick={() => onDelete(p)} aria-label={`Delete ${p.billing_name}`}
          style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 9,
            padding: 8, cursor: 'pointer', color: 'var(--danger)', display: 'flex', minWidth: 44, minHeight: 44,
            alignItems: 'center', justifyContent: 'center' }}>
          <NavIcon name="delete" size={14}/>
        </button>
      </div>
    </div>
  );
}

export default function BillingProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null); // null = list view, {} = new, {...} = edit
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => {
    setLoading(true);
    axios.get('/api/customer/billing-profiles')
      .then(r => setProfiles(r.data ?? []))
      .catch(() => setErr('Could not load billing profiles. Please refresh.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const onSaved = () => { setEditing(null); setMsg('Billing profile saved.'); load(); };

  const doDelete = async (p) => {
    try {
      await axios.delete(`/api/customer/billing-profiles/${p.billing_id}`);
      setMsg('Billing profile removed.'); setConfirmDelete(null); load();
    } catch { setErr('Failed to delete billing profile.'); setConfirmDelete(null); }
  };

  const SK = { borderRadius: 12, height: 68,
    background: 'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)',
    backgroundSize: '400px', animation: 'sk 1.4s infinite' };

  return (
    <div style={{ width: '100%', maxWidth: 720, marginInline: 'auto' }}>
      <style>{`@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(18px,3vw,22px)', fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>
            Billing Profiles
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
            Saved invoice-recipient details for your orders — not a payment method.
          </p>
        </div>
        {!editing && profiles.length > 0 && (
          <Button variant="primary" icon="add" onClick={() => setEditing({})}>New Profile</Button>
        )}
      </div>

      <Toast msg={msg} type="success"/>
      <Toast msg={err} type="error"/>

      {editing ? (
        <ProfileForm initial={editing.billing_id ? editing : null} onCancel={() => setEditing(null)} onSaved={onSaved}/>
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map(i => <div key={i} style={SK}/>)}
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState illustration="order" headline="No billing profiles yet"
          sub="Add a billing profile so your invoices always go to the right name and address."
          cta={{ label: '+ Add Billing Profile', onClick: () => setEditing({}) }}/>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {profiles.map(p => (
            <ProfileRow key={p.billing_id} p={p} onEdit={setEditing} onDelete={setConfirmDelete}/>
          ))}
        </div>
      )}

      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="alertdialog" aria-modal="true" aria-labelledby="del-title"
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 500 }}
            onClick={() => setConfirmDelete(null)}>
            <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 22, maxWidth: 360, width: '100%' }}>
              <p id="del-title" style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', margin: '0 0 8px' }}>
                Delete "{confirmDelete.billing_name}"?
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 18px' }}>
                This billing profile will be permanently removed. This can't be undone.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="ghost" fullWidth onClick={() => setConfirmDelete(null)}>Cancel</Button>
                <Button variant="danger" fullWidth onClick={() => doDelete(confirmDelete)}>Delete</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
