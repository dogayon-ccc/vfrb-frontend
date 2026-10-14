// src/pages/client/AccountSettings.jsx — settings hub: profile, photo & appearance, addresses, notifications, fabrics, billing, security.
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import axios from 'axios';
import { Card, Button, Field, NavIcon, ConfirmDialog } from '../../components/ui';
import EmptyState from '../../components/EmptyState';
import { ProfileSection, PasswordSection } from './settings/ProfileSection';
import BillingSection from './settings/BillingSection';
import HelpSection from './settings/HelpSection';
import FeedbackSection from './settings/FeedbackSection';
import LoadError from './settings/LoadError';
import { Notice as Toast, useFlash, useRecords, fieldErrors, RecordRow, DefaultToggle, Skeletons } from './settings/RecordKit';
import { phPhoneError, compactPhone, formatPhMobile, isPhMobile } from '../../utils/phPhone';
import ProfilePhotoField from '../../components/ProfilePhotoField';
import AppearanceField from '../../components/AppearanceField';
import { readUser } from '../../utils/authRoute';
import { USER_CHANGE_EVENT } from '../../utils/session';

// ── Shipping Addresses ───────────────────────────────────────────────────
const BLANK_ADDR = { label: '', recipient_name: '', contact_number: '', address_line: '', city: '', province: '', postal_code: '', is_default: false };
const ADDR_REQUIRED = { label: 'Label', recipient_name: 'Recipient name', contact_number: 'Contact number', address_line: 'Address line', city: 'City', province: 'Province' };
const postalError = (v) => (v && !/^\d{4}$/.test(String(v).trim()) ? 'Use the 4-digit postal code.' : '');
const addrBody = (a, over = {}) => ({ label: a.label.trim(), recipient_name: a.recipient_name.trim(), contact_number: compactPhone(a.contact_number),
  address_line: a.address_line.trim(), city: a.city.trim(), province: a.province.trim(), postal_code: a.postal_code?.trim() || null, is_default: !!a.is_default, ...over });

function AddressForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState({ ...BLANK_ADDR, ...initial, postal_code: initial?.postal_code ?? '' });
  const [errs, setErrs] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrs(e => ({ ...e, [k]: undefined })); };

  const save = async () => {
    const e = Object.fromEntries(Object.entries(ADDR_REQUIRED).filter(([k]) => !String(form[k] ?? '').trim()).map(([k, l]) => [k, `${l} is required.`]));
    if (!e.contact_number) { const p = phPhoneError(form.contact_number, { required: true }); if (p) e.contact_number = p; }
    if (postalError(form.postal_code)) e.postal_code = postalError(form.postal_code);
    setErrs(e);
    if (Object.keys(e).length) { setErr('Check the highlighted fields.'); return; }
    setSaving(true); setErr('');
    try {
      const { data } = form.shipping_id
        ? await axios.put(`/api/customer/shipping-addresses/${form.shipping_id}`, addrBody(form))
        : await axios.post('/api/customer/shipping-addresses', addrBody(form));
      onSaved(data);
    } catch (x) {
      setErrs(fieldErrors(x));
      setErr(x.response?.data?.message ?? 'Failed to save address.');
    } finally { setSaving(false); }
  };

  return (
    <Card title={form.shipping_id ? 'Edit Address' : 'New Address'}>
      <form noValidate onSubmit={e => { e.preventDefault(); save(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Label" value={form.label} onChange={e => set('label', e.target.value)} placeholder="e.g. Main Office, Warehouse" maxLength={50} error={errs.label} autoFocus/>
        <div className="acct-field-row">
          <Field label="Recipient Name" value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)} maxLength={100} autoComplete="name" error={errs.recipient_name}/>
          <Field label="Contact Number" value={form.contact_number} onChange={e => set('contact_number', e.target.value)} placeholder="09XX XXX XXXX" inputMode="tel" autoComplete="tel"
            onBlur={() => isPhMobile(form.contact_number) && set('contact_number', formatPhMobile(form.contact_number))}
            error={errs.contact_number || (form.contact_number && phPhoneError(form.contact_number)) || undefined}/>
        </div>
        <Field label="Address Line" value={form.address_line} onChange={e => set('address_line', e.target.value)} placeholder="Unit, building, street, barangay" maxLength={255} autoComplete="street-address" error={errs.address_line}/>
        <div className="acct-field-row">
          <Field label="City / Municipality" value={form.city} onChange={e => set('city', e.target.value)} maxLength={100} autoComplete="address-level2" error={errs.city}/>
          <Field label="Province" value={form.province} onChange={e => set('province', e.target.value)} maxLength={100} autoComplete="address-level1" error={errs.province}/>
        </div>
        <Field label="Postal Code (optional)" value={form.postal_code} onChange={e => set('postal_code', e.target.value)} inputMode="numeric" maxLength={4} autoComplete="postal-code"
          placeholder="e.g. 1770" error={errs.postal_code || postalError(form.postal_code) || undefined}/>
        <DefaultToggle checked={form.is_default} onChange={v => set('is_default', v)}>Use as my default delivery address</DefaultToggle>
        <Toast msg={err} type="error"/>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" fullWidth onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" fullWidth icon="save" loading={saving}>{saving ? 'Saving…' : 'Save Address'}</Button>
        </div>
      </form>
    </Card>
  );
}

function ShippingSection() {
  const { items: addrs, loading, failed, load } = useRecords('/api/customer/shipping-addresses');
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [msg, flash] = useFlash(); const [err, setErr] = useState('');

  const onSaved = () => { setEditing(null); setErr(''); flash('Address saved.'); load(); };
  const makeDefault = async (a) => {
    setBusyId(a.shipping_id); setErr('');
    try { await axios.put(`/api/customer/shipping-addresses/${a.shipping_id}`, addrBody(a, { is_default: true })); flash(`"${a.label}" is now your default address.`); await load(); }
    catch (x) { setErr(x.response?.data?.message ?? 'Could not change the default address.'); }
    finally { setBusyId(null); }
  };
  const doDelete = async (a) => {
    setBusyId(a.shipping_id); setErr('');
    try { await axios.delete(`/api/customer/shipping-addresses/${a.shipping_id}`); flash('Address removed.'); setConfirmDelete(null); await load(); }
    catch { setErr('Failed to delete address.'); setConfirmDelete(null); }
    finally { setBusyId(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Saved delivery addresses. Your default is filled in when you place an order.</p>
        {!editing && !failed && addrs.length > 0 && <Button variant="primary" icon="add" onClick={() => setEditing({})}>New Address</Button>}
      </div>
      <Toast msg={msg} type="success"/><Toast msg={err} type="error"/>
      {editing ? (
        <AddressForm initial={editing.shipping_id ? editing : null} onCancel={() => setEditing(null)} onSaved={onSaved}/>
      ) : loading ? <Skeletons/> : failed ? (
        <LoadError what="addresses" onRetry={load}/>
      ) : addrs.length === 0 ? (
        <EmptyState illustration="order" headline="No saved addresses" sub="Add a delivery address to speed up future orders."
          cta={{ label: '+ Add Address', onClick: () => setEditing({}) }}/>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {addrs.map(a => (
            <RecordRow key={a.shipping_id} title={a.label} isDefault={!!a.is_default} busy={busyId === a.shipping_id}
              onEdit={() => setEditing(a)} onDelete={() => setConfirmDelete(a)} onMakeDefault={() => makeDefault(a)}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>{a.recipient_name} · {formatPhMobile(a.contact_number) || a.contact_number}</p>
              <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: '2px 0 0', overflowWrap: 'anywhere' }}>
                {[a.address_line, a.city, a.province].filter(Boolean).join(', ')}{a.postal_code ? ` ${a.postal_code}` : ''}
              </p>
            </RecordRow>
          ))}
        </div>
      )}
      <ConfirmDialog open={!!confirmDelete} title={`Remove "${confirmDelete?.label ?? ''}"?`}
        body={confirmDelete?.is_default ? "This is your default address. You can pick another default afterwards. This can't be undone." : "This can't be undone."}
        confirmLabel="Remove" busy={busyId === confirmDelete?.shipping_id} onCancel={() => setConfirmDelete(null)} onConfirm={() => doDelete(confirmDelete)}/>
    </div>
  );
}

// ── Notification Preferences ─────────────────────────────────────────────

function NotificationsSection() {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    axios.get('/api/settings/notifications').then(r => setPrefs(r.data)).catch(() => setFailed(true));
  };
  useEffect(load, []);

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); setSaving(true); setErr('');
    try {
      await axios.patch('/api/settings/notifications', { [key]: next[key] });
      setMsg('Preferences updated.');
    } catch (e) {
      setPrefs(prefs); // rollback
      setErr(e.response?.data?.message ?? 'Failed to update. Please try again.');
    } finally { setSaving(false); }
  };

  if (failed) return <LoadError what="notification settings" onRetry={load}/>;
  if (!prefs) return <div className="acct-sk"/>;

  const Row = ({ k, label, live }) => {
    const on = !!prefs[k];
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{label}</p>
          {!live && <p style={{ fontSize: 11, color: 'var(--warning)', margin: '2px 0 0' }}>Email goes to a test inbox for now. Your preference is saved for when real delivery is on.</p>}
        </div>
        <button role="switch" aria-checked={on} aria-label={`Toggle ${label}`} onClick={() => toggle(k)} disabled={saving}
          style={{ width: 42, height: 24, borderRadius: 99, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            background: on ? 'var(--teal)' : 'var(--border)', position: 'relative', transition: 'background .18s', flexShrink: 0 }}>
          <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%',
            background: 'var(--bg-card)', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}/>
        </button>
      </div>
    );
  };

  return (
    <Card>
      <Row k="email_enabled" label="Email Notifications" live={prefs.email_provider_live}/>
      <Toast msg={msg} type="success"/><Toast msg={err} type="error"/>
    </Card>
  );
}

// ── Photo & Appearance ───────────────────────────────────────────────────
function AppearanceSection() {
  const [user, setUser] = useState(readUser);
  return (
    <Card>
      <ProfilePhotoField avatar={user.avatar} name={user.name} onChange={(avatar) => setUser((u) => ({ ...u, avatar }))}/>
      <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }}/>
      <AppearanceField userId={user.user_id}/>
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

  const [failed, setFailed] = useState(false);
  const load = () => {
    setLoading(true); setFailed(false);
    Promise.all([
      axios.get('/api/customer/fabric-preferences'),
      axios.get('/api/customer/materials-catalog'),
    ]).then(([p, c]) => {
      setPrefs(p.data ?? []);
      setCatalog((c.data?.materials ?? []).filter(m => m.category === 'Fabric'));
    }).catch(() => setFailed(true)).finally(() => setLoading(false));
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
        {!picking && !failed && catalog.length > 0 && <Button variant="primary" icon="add" onClick={() => setPicking(true)}>Add Fabric</Button>}
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
      ) : failed ? (
        <LoadError what="fabric preferences" onRetry={load}/>
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
      <ConfirmDialog open={!!confirmDelete} title={`Remove "${confirmDelete?.material?.material_name ?? ''}"?`} body="This can't be undone." confirmLabel="Remove" onCancel={() => setConfirmDelete(null)} onConfirm={() => doDelete(confirmDelete)}/>
    </div>
  );
}

// ── Page shell: settings hub (wireframe — profile card + section rows) ─────
const SECTIONS = [
  { id: 'profile',       label: 'Personal Information', hint: 'Name, contact, organization', icon: 'profile' },
  { id: 'shipping',      label: 'Shipping Addresses',   hint: 'Where your orders are delivered', icon: 'delivery' },
  { id: 'appearance',    label: 'Photo & Appearance',   hint: 'Profile photo, mode and accent colour', icon: 'camera' },
  { id: 'notifications', label: 'Notifications',        hint: 'Choose what you get notified about', icon: 'notifications' },
  { id: 'fabrics',       label: 'Preferred Fabrics',    hint: 'Fabrics staff should know about', icon: 'package' },
  { id: 'billing',       label: 'Billing Profiles',     hint: 'Invoice recipient details', icon: 'invoice' },
  { id: 'password',      label: 'Password & Security',  hint: 'Change or recover your password', icon: 'lock' },
  { id: 'help',          label: 'Help & Support',       hint: 'Guides and contact', icon: 'info' },
  { id: 'feedback',      label: 'Feedback',             hint: 'Report a bug or suggest an idea', icon: 'chat' },
];
const PANELS = {
  profile: ProfileSection, appearance: AppearanceSection, shipping: ShippingSection, notifications: NotificationsSection,
  fabrics: FabricsSection, billing: BillingSection, password: PasswordSection, help: HelpSection, feedback: FeedbackSection,
};

export default function AccountSettings() {
  const reduce = useReducedMotion();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab');
  const sec = SECTIONS.some(x => x.id === tab) ? tab : null;
  const setSec = (id) => setParams(id ? { tab: id } : {}, { replace: !id });
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
    // A new photo from the Photo & Appearance panel shows on the header card at once.
    const onUser = (e) => setMe(m => ({ ...m, avatar: e.detail?.avatar ?? null }));
    window.addEventListener(USER_CHANGE_EVENT, onUser);
    return () => window.removeEventListener(USER_CHANGE_EVENT, onUser);
  }, []);

  const active = wide ? (sec ?? 'profile') : sec;
  const open = (x) => setSec(x.id);
  const current = SECTIONS.find(x => x.id === active);
  const Panel = PANELS[active];

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
    <motion.section key={active} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : .18 }}
      aria-labelledby="acct-panel-h">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        {!wide && <button className="cx-btn cx-btn-s" style={{ minHeight: 40, padding: '0 12px' }} onClick={() => setSec(null)} aria-label="Back to settings list">←</button>}
        <h2 id="acct-panel-h" style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{current.label}</h2>
      </div>
      <Panel/>
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
          <div aria-hidden="true" style={{ width: 54, height: 54, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', overflow: 'hidden',
            background: 'linear-gradient(135deg,var(--teal),var(--teal-2))', color: 'var(--on-teal)', fontSize: 22, fontWeight: 800 }}>
            {me.avatar ? <img src={me.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : (me.name ?? '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.name ?? 'Client'}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.email ?? ''}</p>
          </div>
          {!wide && <button className="cx-btn cx-btn-s" style={{ minHeight: 44 }} onClick={() => setSec('profile')}>Edit Profile</button>}
        </div>
      )}

      {wide ? (
        <div className="acct-split"><div>{list}</div><div>{panel}</div></div>
      ) : sec ? panel : list}
    </div>
  );
}
