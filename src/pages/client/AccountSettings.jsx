// src/pages/client/AccountSettings.jsx — Shipping Addresses, Notification Preferences, Preferred Fabrics.
// All three backends already existed with zero frontend consuming them — same gap class as BillingProfiles.jsx.
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

// ── Shipping Addresses ───────────────────────────────────────────────────
const BLANK_ADDR = { label: '', recipient_name: '', contact_number: '', address_line: '', city: '', province: '', postal_code: '', is_default: false };

function AddressForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial ?? BLANK_ADDR);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.label.trim() || !form.recipient_name.trim() || !form.contact_number.trim() || !form.address_line.trim() || !form.city.trim() || !form.province.trim()) {
      setErr('Please fill in all required fields.'); return;
    }
    setSaving(true); setErr('');
    try {
      const body = { label: form.label, recipient_name: form.recipient_name, contact_number: form.contact_number,
        address_line: form.address_line, city: form.city, province: form.province,
        postal_code: form.postal_code || null, is_default: !!form.is_default };
      const { data } = form.shipping_id
        ? await axios.put(`/api/customer/shipping-addresses/${form.shipping_id}`, body)
        : await axios.post('/api/customer/shipping-addresses', body);
      onSaved(data);
    } catch (e) {
      setErr(e.response?.data?.message ?? 'Failed to save address.');
    } finally { setSaving(false); }
  };

  return (
    <Card title={form.shipping_id ? 'Edit Address' : 'New Address'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Label" value={form.label} onChange={e => set('label', e.target.value)} placeholder="e.g. Main Office, Warehouse"/>
        <div className="acct-field-row">
          <Field label="Recipient Name" value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)}/>
          <Field label="Contact Number" value={form.contact_number} onChange={e => set('contact_number', e.target.value)} placeholder="09XXXXXXXXX"/>
        </div>
        <Field label="Address Line" value={form.address_line} onChange={e => set('address_line', e.target.value)} placeholder="Street, barangay, building"/>
        <div className="acct-field-row">
          <Field label="City" value={form.city} onChange={e => set('city', e.target.value)}/>
          <Field label="Province" value={form.province} onChange={e => set('province', e.target.value)}/>
        </div>
        <Field label="Postal Code (optional)" value={form.postal_code} onChange={e => set('postal_code', e.target.value)}/>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!form.is_default} onChange={e => set('is_default', e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--teal)' }}/>
          Set as default address
        </label>
        <Toast msg={err} type="error"/>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" fullWidth onClick={onCancel}>Cancel</Button>
          <Button variant="primary" fullWidth icon="save" loading={saving} onClick={save}>{saving ? 'Saving…' : 'Save Address'}</Button>
        </div>
      </div>
    </Card>
  );
}

function AddressRow({ a, onEdit, onDelete }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)',
      display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', margin: 0 }}>{a.label}</p>
          {!!a.is_default && <Badge tone="teal">Default</Badge>}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>{a.recipient_name} · {a.contact_number}</p>
        <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: '2px 0 0' }}>
          {a.address_line}, {a.city}, {a.province}{a.postal_code ? ` ${a.postal_code}` : ''}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onEdit(a)} aria-label={`Edit ${a.label}`}
          style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 9, padding: 8,
            cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', minWidth: 36, minHeight: 36,
            alignItems: 'center', justifyContent: 'center' }}>
          <NavIcon name="edit" size={14}/>
        </button>
        <button onClick={() => onDelete(a)} aria-label={`Delete ${a.label}`}
          style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 9, padding: 8,
            cursor: 'pointer', color: 'var(--danger)', display: 'flex', minWidth: 36, minHeight: 36,
            alignItems: 'center', justifyContent: 'center' }}>
          <NavIcon name="delete" size={14}/>
        </button>
      </div>
    </div>
  );
}

function ShippingSection() {
  const [addrs, setAddrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    axios.get('/api/customer/shipping-addresses').then(r => setAddrs(r.data ?? []))
      .catch(() => setErr('Could not load addresses.')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const onSaved = () => { setEditing(null); setMsg('Address saved.'); load(); };
  const doDelete = async (a) => {
    try { await axios.delete(`/api/customer/shipping-addresses/${a.shipping_id}`); setMsg('Address removed.'); setConfirmDelete(null); load(); }
    catch { setErr('Failed to delete address.'); setConfirmDelete(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Saved delivery addresses for your orders.</p>
        {!editing && addrs.length > 0 && <Button variant="primary" icon="add" onClick={() => setEditing({})}>New Address</Button>}
      </div>
      <Toast msg={msg} type="success"/><Toast msg={err} type="error"/>
      {editing ? (
        <AddressForm initial={editing.shipping_id ? editing : null} onCancel={() => setEditing(null)} onSaved={onSaved}/>
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1, 2].map(i => <div key={i} className="acct-sk"/>)}</div>
      ) : addrs.length === 0 ? (
        <EmptyState illustration="order" headline="No saved addresses" sub="Add a delivery address to speed up future orders."
          cta={{ label: '+ Add Address', onClick: () => setEditing({}) }}/>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {addrs.map(a => <AddressRow key={a.shipping_id} a={a} onEdit={setEditing} onDelete={setConfirmDelete}/>)}
        </div>
      )}
      <ConfirmModal item={confirmDelete} label={confirmDelete?.label} onCancel={() => setConfirmDelete(null)} onConfirm={() => doDelete(confirmDelete)}/>
    </div>
  );
}

// ── Notification Preferences ─────────────────────────────────────────────
function NotificationsSection() {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

  useEffect(() => {
    axios.get('/api/settings/notifications').then(r => setPrefs(r.data))
      .catch(() => setErr('Could not load notification settings.'));
  }, []);

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); setSaving(true); setErr('');
    try {
      await axios.patch('/api/settings/notifications', { [key]: next[key] });
      setMsg('Preferences updated.');
    } catch {
      setPrefs(prefs); // rollback
      setErr('Failed to update. Please try again.');
    } finally { setSaving(false); }
  };

  if (!prefs) return <div className="acct-sk"/>;

  const Row = ({ k, label, live }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{label}</p>
        {!live && <p style={{ fontSize: 11, color: 'var(--warning)', margin: '2px 0 0' }}>Not live yet — no provider configured. Your preference is still saved.</p>}
      </div>
      <button role="switch" aria-checked={prefs[k]} aria-label={`Toggle ${label}`} onClick={() => toggle(k)} disabled={saving}
        style={{ width: 42, height: 24, borderRadius: 99, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
          background: prefs[k] ? 'var(--teal)' : 'var(--border)', position: 'relative', transition: 'background .18s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 3, left: prefs[k] ? 21 : 3, width: 18, height: 18, borderRadius: '50%',
          background: '#fff', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}/>
      </button>
    </div>
  );

  return (
    <Card>
      <Row k="email_enabled" label="Email Notifications" live={prefs.email_provider_live}/>
      <Row k="sms_enabled" label="SMS Notifications" live={prefs.sms_provider_live}/>
      <Toast msg={msg} type="success"/><Toast msg={err} type="error"/>
    </Card>
  );
}

// ── Preferred Fabrics ─────────────────────────────────────────────────────
function FabricsSection() {
  const [prefs, setPrefs] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      axios.get('/api/customer/fabric-preferences'),
      axios.get('/api/customer/materials-catalog'),
    ]).then(([p, c]) => {
      setPrefs(p.data ?? []);
      setCatalog((c.data?.materials ?? []).filter(m => m.category === 'Fabric'));
    }).catch(() => setErr('Could not load fabric preferences.')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const add = async () => {
    if (!selectedId) { setErr('Choose a fabric first.'); return; }
    try {
      await axios.post('/api/customer/fabric-preferences', { material_id: Number(selectedId), notes: notes || null });
      setMsg('Fabric preference added.'); setPicking(false); setSelectedId(''); setNotes(''); load();
    } catch (e) { setErr(e.response?.data?.message ?? 'Failed to add.'); }
  };

  const doDelete = async (p) => {
    try { await axios.delete(`/api/customer/fabric-preferences/${p.preference_id}`); setMsg('Removed.'); setConfirmDelete(null); load(); }
    catch { setErr('Failed to remove.'); setConfirmDelete(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Fabrics you prefer for future orders — VFRB staff can see these when reviewing your requests.</p>
        {!picking && catalog.length > 0 && <Button variant="primary" icon="add" onClick={() => setPicking(true)}>Add Fabric</Button>}
      </div>
      <Toast msg={msg} type="success"/><Toast msg={err} type="error"/>

      {picking && (
        <Card title="Add Preferred Fabric" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field as="select" label="Fabric" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">Select a fabric…</option>
              {catalog.map(m => <option key={m.material_id} value={m.material_id}>{m.material_name} ({m.unit})</option>)}
            </Field>
            <Field as="textarea" label="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Preferred for scrub tops"/>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" fullWidth onClick={() => { setPicking(false); setSelectedId(''); setNotes(''); }}>Cancel</Button>
              <Button variant="primary" fullWidth icon="save" onClick={add}>Add</Button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="acct-sk"/>
      ) : prefs.length === 0 && !picking ? (
        <EmptyState illustration="order" headline="No preferred fabrics yet" sub="Add fabrics you like so staff know your preferences for future orders."
          cta={{ label: '+ Add Fabric', onClick: () => setPicking(true) }}/>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {prefs.map(p => (
            <div key={p.preference_id} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)',
              background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', margin: 0 }}>{p.material?.material_name ?? 'Fabric'}</p>
                {p.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>{p.notes}</p>}
              </div>
              <button onClick={() => setConfirmDelete(p)} aria-label={`Remove ${p.material?.material_name ?? 'fabric'}`}
                style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 9, padding: 8,
                  cursor: 'pointer', color: 'var(--danger)', display: 'flex', minWidth: 36, minHeight: 36,
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <NavIcon name="delete" size={14}/>
              </button>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal item={confirmDelete} label={confirmDelete?.material?.material_name} onCancel={() => setConfirmDelete(null)} onConfirm={() => doDelete(confirmDelete)}/>
    </div>
  );
}

function ConfirmModal({ item, label, onCancel, onConfirm }) {
  return (
    <AnimatePresence>
      {item && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          role="alertdialog" aria-modal="true" aria-labelledby="acct-del-title"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 500 }}
          onClick={onCancel}>
          <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 22, maxWidth: 360, width: '100%' }}>
            <p id="acct-del-title" style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', margin: '0 0 8px' }}>Remove "{label}"?</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 18px' }}>This can't be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" fullWidth onClick={onCancel}>Cancel</Button>
              <Button variant="danger" fullWidth onClick={onConfirm}>Remove</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Page shell with tabs ──────────────────────────────────────────────────
const TABS = [
  { id: 'shipping', label: 'Shipping Addresses' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'fabrics', label: 'Preferred Fabrics' },
];

export default function AccountSettings() {
  const [tab, setTab] = useState('shipping');

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .acct-field-row { display:grid; grid-template-columns:1fr; gap:12px; }
        .acct-sk { border-radius:12px; height:68px; background:linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%); background-size:400px; animation:acct-sk 1.4s infinite; }
        @keyframes acct-sk { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @media (min-width:640px) { .acct-field-row { grid-template-columns:1fr 1fr; } }
      `}</style>

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 'clamp(18px,3vw,22px)', fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Account Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Manage delivery addresses, notification preferences, and fabric preferences.</p>
      </div>

      <div role="tablist" aria-label="Account settings sections"
        style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} id={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
            style={{ padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', color: tab === t.id ? 'var(--teal)' : 'var(--text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--teal)' : '2px solid transparent', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'shipping' && <ShippingSection/>}
        {tab === 'notifications' && <NotificationsSection/>}
        {tab === 'fabrics' && <FabricsSection/>}
      </div>
    </div>
  );
}
