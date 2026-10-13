// Billing profiles: saved invoice-recipient details (not a payment method). /api/customer/billing-profiles, scoped to the signed-in customer.
import { useState } from 'react';
import axios from 'axios';
import { Card, Button, Field, ConfirmDialog } from '../../../components/ui';
import EmptyState from '../../../components/EmptyState';
import LoadError from './LoadError';
import { Notice, useFlash, useRecords, fieldErrors, RecordRow, DefaultToggle, Skeletons } from './RecordKit';

const BLANK = { billing_name: '', tin: '', billing_address: '', billing_email: '', is_default: false };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const tinDigits = (v) => String(v ?? '').replace(/\D/g, '');
// BIR TIN: 9 digits, optionally with a 3- or 5-digit branch code.
const tinError = (v) => (v && (/[^\d\s-]/.test(v) || ![9, 12, 14].includes(tinDigits(v).length)) ? 'Use the 9-digit TIN, with the branch code if you have one (000-000-000-000).' : '');
const formatTin = (v) => { const d = tinDigits(v); return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9)].filter(Boolean).join('-'); };
const body = (p, over = {}) => ({ billing_name: p.billing_name.trim(), tin: p.tin ? formatTin(p.tin) : null, billing_address: p.billing_address.trim(),
  billing_email: p.billing_email?.trim() || null, is_default: !!p.is_default, ...over });

function ProfileForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState({ ...BLANK, ...initial, tin: initial?.tin ?? '', billing_email: initial?.billing_email ?? '' });
  const [errs, setErrs] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrs(e => ({ ...e, [k]: undefined })); };

  const save = async () => {
    const e = {};
    if (!form.billing_name.trim()) e.billing_name = 'Billing name is required.';
    if (!form.billing_address.trim()) e.billing_address = 'Billing address is required.';
    if (tinError(form.tin)) e.tin = tinError(form.tin);
    if (form.billing_email && !EMAIL.test(form.billing_email.trim())) e.billing_email = 'Enter a valid email address.';
    setErrs(e);
    if (Object.keys(e).length) { setErr('Check the highlighted fields.'); return; }
    setSaving(true); setErr('');
    try {
      const { data } = form.billing_id
        ? await axios.put(`/api/customer/billing-profiles/${form.billing_id}`, body(form))
        : await axios.post('/api/customer/billing-profiles', body(form));
      onSaved(data);
    } catch (x) {
      setErrs(fieldErrors(x));
      setErr(x.response?.data?.message ?? 'Failed to save billing profile.');
    } finally { setSaving(false); }
  };

  return (
    <Card title={form.billing_id ? 'Edit Billing Profile' : 'New Billing Profile'}>
      <form noValidate onSubmit={e => { e.preventDefault(); save(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Billing Name" value={form.billing_name} onChange={e => set('billing_name', e.target.value)} maxLength={150}
          placeholder="Registered name of the person or company" autoComplete="organization" error={errs.billing_name} autoFocus/>
        <Field as="textarea" label="Billing Address" value={form.billing_address} onChange={e => set('billing_address', e.target.value)} maxLength={255}
          rows={2} placeholder="As it should appear on the invoice" error={errs.billing_address} style={{ resize: 'vertical' }}/>
        <div className="acct-field-row">
          <Field label="TIN (optional)" value={form.tin} onChange={e => set('tin', e.target.value)} inputMode="numeric" maxLength={20}
            onBlur={() => form.tin && !tinError(form.tin) && set('tin', formatTin(form.tin))}
            placeholder="000-000-000-000" error={errs.tin || tinError(form.tin) || undefined}/>
          <Field label="Billing Email (optional)" type="email" value={form.billing_email} onChange={e => set('billing_email', e.target.value)} maxLength={100}
            placeholder="billing@company.com" autoComplete="email" error={errs.billing_email} hint={!errs.billing_email ? 'Invoices and receipts can go here.' : undefined}/>
        </div>
        <DefaultToggle checked={form.is_default} onChange={v => set('is_default', v)}>Use as my default billing profile</DefaultToggle>
        <Notice msg={err} type="error"/>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" fullWidth onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" fullWidth icon="save" loading={saving}>{saving ? 'Saving…' : 'Save Profile'}</Button>
        </div>
      </form>
    </Card>
  );
}

export default function BillingSection() {
  const { items: profiles, loading, failed, load } = useRecords('/api/customer/billing-profiles');
  const [editing, setEditing] = useState(null); // null = list, {} = new, {...} = edit
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [msg, flash] = useFlash(); const [err, setErr] = useState('');

  const onSaved = () => { setEditing(null); setErr(''); flash('Billing profile saved.'); load(); };
  const makeDefault = async (p) => {
    setBusyId(p.billing_id); setErr('');
    try { await axios.put(`/api/customer/billing-profiles/${p.billing_id}`, body(p, { is_default: true })); flash(`"${p.billing_name}" is now your default.`); await load(); }
    catch (x) { setErr(x.response?.data?.message ?? 'Could not change the default profile.'); }
    finally { setBusyId(null); }
  };
  const doDelete = async (p) => {
    setBusyId(p.billing_id); setErr('');
    try { await axios.delete(`/api/customer/billing-profiles/${p.billing_id}`); flash('Billing profile removed.'); setConfirmDelete(null); await load(); }
    catch { setErr('Failed to delete billing profile.'); setConfirmDelete(null); }
    finally { setBusyId(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Who your invoices are made out to. This is not a payment method.</p>
        {!editing && !failed && profiles.length > 0 && <Button variant="primary" icon="add" onClick={() => setEditing({})}>New Profile</Button>}
      </div>
      <Notice msg={msg} type="success"/><Notice msg={err} type="error"/>

      <div style={{ marginTop: 12 }}>
        {editing ? (
          <ProfileForm initial={editing.billing_id ? editing : null} onCancel={() => setEditing(null)} onSaved={onSaved}/>
        ) : loading ? <Skeletons/> : failed ? (
          <LoadError what="billing profiles" onRetry={load}/>
        ) : profiles.length === 0 ? (
          <EmptyState illustration="select-thread" headline="No billing profiles yet"
            sub="Add a billing profile so your invoices always go to the right name and address."
            cta={{ label: '+ Add Billing Profile', onClick: () => setEditing({}) }}/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {profiles.map(p => (
              <RecordRow key={p.billing_id} title={p.billing_name} isDefault={!!p.is_default} busy={busyId === p.billing_id}
                onEdit={() => setEditing(p)} onDelete={() => setConfirmDelete(p)} onMakeDefault={() => makeDefault(p)}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', overflowWrap: 'anywhere', whiteSpace: 'pre-line' }}>{p.billing_address}</p>
                {(p.tin || p.billing_email) && (
                  <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: '4px 0 0', overflowWrap: 'anywhere' }}>
                    {p.tin && `TIN ${p.tin}`}{p.tin && p.billing_email && ' · '}{p.billing_email}
                  </p>
                )}
              </RecordRow>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog open={!!confirmDelete} title={`Delete "${confirmDelete?.billing_name ?? ''}"?`}
        body={confirmDelete?.is_default ? "This is your default billing profile. Past invoices keep their details. This can't be undone." : "Past invoices keep their details. This can't be undone."}
        confirmLabel="Delete" busy={busyId === confirmDelete?.billing_id} onCancel={() => setConfirmDelete(null)} onConfirm={() => doDelete(confirmDelete)}/>
    </div>
  );
}
