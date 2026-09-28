// src/pages/client/AccountSettings.jsx — Shipping Addresses, Notification Preferences, Preferred Fabrics.
// All three backends already existed with zero frontend consuming them — same gap class as BillingProfiles.jsx.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="vfrb-row-card" style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)',
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
            cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', minWidth: 44, minHeight: 44,
            alignItems: 'center', justifyContent: 'center' }}>
          <NavIcon name="edit" size={14}/>
        </button>
        <button onClick={() => onDelete(a)} aria-label={`Delete ${a.label}`}
          style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 9, padding: 8,
            cursor: 'pointer', color: 'var(--danger)', display: 'flex', minWidth: 44, minHeight: 44,
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
            <div key={p.preference_id} className="vfrb-row-card" style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)',
              background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', margin: 0 }}>{p.material?.material_name ?? 'Fabric'}</p>
                {p.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>{p.notes}</p>}
              </div>
              <button onClick={() => setConfirmDelete(p)} aria-label={`Remove ${p.material?.material_name ?? 'fabric'}`}
                style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 9, padding: 8,
                  cursor: 'pointer', color: 'var(--danger)', display: 'flex', minWidth: 44, minHeight: 44,
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

// ── Page shell: settings hub (wireframe — profile card + section rows) ─────
const SECTIONS = [
  { id: 'profile',       label: 'Personal Information', hint: 'Name, contact, organization', icon: 'profile',       to: '/profile' },
  { id: 'shipping',      label: 'Shipping Addresses',   hint: 'Where your orders are delivered', icon: 'delivery' },
  { id: 'notifications', label: 'Notifications',        hint: 'Choose what you get notified about', icon: 'notifications' },
  { id: 'fabrics',       label: 'Preferred Fabrics',    hint: 'Fabrics staff should know about', icon: 'package' },
  { id: 'billing',       label: 'Billing Profiles',     hint: 'Invoice recipient details', icon: 'orders', to: '/billing' },
  { id: 'password',      label: 'Change Password',      hint: 'Update your sign-in password', icon: 'settings', to: '/profile' },
  { id: 'help',          label: 'Help & Support',       hint: 'Guides and contact', icon: 'notifications', to: '/help' },
];

export default function AccountSettings() {
  const nav = useNavigate();
  const [sec, setSec] = useState(null);            // mobile: null = list view
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width:900px)').matches);
  const [me, setMe] = useState(() => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; } });

  useEffect(() => {
    const mq = window.matchMedia('(min-width:900px)');
    const h = e => setWide(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  useEffect(() => {
    axios.get('/api/customer/profile').then(r => setMe(m => ({ ...m, ...(r.data?.user ?? r.data ?? {}) }))).catch(() => {});
  }, []);

  const active = wide ? (sec && !SECTIONS.find(x => x.id === sec)?.to ? sec : 'shipping') : sec;
  const open = (x) => x.to ? nav(x.to) : setSec(x.id);
  const current = SECTIONS.find(x => x.id === active);

  const list = (
    <nav aria-label="Account settings sections" className="cx-card" style={{ overflow: 'hidden' }}>
      {SECTIONS.map(x => {
        const on = wide && active === x.id;
        return (
          <button key={x.id} className="cx-row" onClick={() => open(x)} aria-current={on ? 'page' : undefined}
            style={{ background: on ? 'var(--teal-50)' : undefined, minHeight: 60, borderLeft: on ? '3px solid var(--teal)' : '3px solid transparent' }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', flexShrink: 0,
              background: on ? 'var(--teal)' : 'var(--bg-surface)', color: on ? '#fff' : 'var(--teal)' }}>
              <NavIcon name={x.icon} size={16} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{x.label}</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-subtle)', marginTop: 1 }}>{x.hint}</span>
            </span>
            <span aria-hidden="true" style={{ color: 'var(--text-faint)', fontSize: 18 }}>›</span>
          </button>
        );
      })}
    </nav>
  );

  const panel = current && (
    <motion.section key={active} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .18 }}
      aria-labelledby="acct-panel-h">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        {!wide && <button className="cx-btn cx-btn-s" style={{ minHeight: 40, padding: '0 12px' }} onClick={() => setSec(null)} aria-label="Back to settings list">←</button>}
        <h2 id="acct-panel-h" style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{current.label}</h2>
      </div>
      {active === 'shipping' && <ShippingSection/>}
      {active === 'notifications' && <NotificationsSection/>}
      {active === 'fabrics' && <FabricsSection/>}
    </motion.section>
  );

  return (
    <div className="cx-page">
      <style>{`
        .acct-field-row { display:grid; grid-template-columns:1fr; gap:12px; }
        .acct-sk { border-radius:12px; height:68px; background:linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%); background-size:400px; animation:acct-sk 1.4s infinite; }
        @keyframes acct-sk { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .vfrb-row-card { transition: border-color .18s, box-shadow .18s; }
        .vfrb-row-card:hover { border-color: var(--teal); box-shadow: 0 2px 10px rgba(2,128,144,.08); }
        .acct-split { display:grid; grid-template-columns:1fr; gap:18px; }
        @media (min-width:640px) { .acct-field-row { grid-template-columns:1fr 1fr; } }
        @media (min-width:900px) { .acct-split { grid-template-columns:320px minmax(0,1fr); align-items:start; } }
      `}</style>

      {(wide || !sec) && (
        <div className="cx-head"><div><h1>Account Settings</h1><p>Your profile, delivery, notifications and preferences.</p></div></div>
      )}

      {(wide || !sec) && (
        <div className="cx-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', marginBottom: 16 }}>
          <div aria-hidden="true" style={{ width: 54, height: 54, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
            background: 'linear-gradient(135deg,var(--teal),var(--teal-2))', color: '#fff', fontSize: 22, fontWeight: 800 }}>
            {(me.name ?? '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.name ?? 'Client'}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.email ?? ''}</p>
          </div>
          <button className="cx-btn cx-btn-s" style={{ minHeight: 38 }} onClick={() => nav('/profile')}>Edit Profile</button>
        </div>
      )}

      {wide ? (
        <div className="acct-split"><div>{list}</div><div>{panel}</div></div>
      ) : sec ? panel : list}
    </div>
  );
}
