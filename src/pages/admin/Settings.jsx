import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { NavIcon } from '../../components/ui/icons';
import { checkUpload } from '../../utils/fileCheck';
import { PageHeader, Panel, Banner, Toast, useToast, SkeletonRows } from '../../components/admin/AdminUI';

function getIsManager() {
  try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}').role === 'manager'; } catch { return false; }
}

const NOTIFY = [
  { key: 'email_enabled', live: 'email_provider_live', label: 'Email notifications', icon: 'email', note: 'Order updates, AI recommendations ready, and account alerts.',
    warn: 'No production email provider is connected yet — this saves your preference but no real email is sent.' },
  { key: 'sms_enabled', live: 'sms_provider_live', label: 'SMS notifications', icon: 'phone', note: 'Text alerts for urgent order or delivery updates.',
    warn: 'No SMS provider is connected — this reserves the setting for when one is added.' },
];

const Field = ({ label, id, children }) => (<div><label className="adm-field" htmlFor={id}>{label}</label>{children}</div>);

export default function Settings() {
  const isManager = getIsManager();
  const [company, setCompany] = useState({ company_name: '', logo_url: null, address: '', contact_number: '', contact_email: '' });
  const [saved, setSaved] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyErr, setCompanyErr] = useState(false);
  const [companyBusy, setCompanyBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [prefs, setPrefs] = useState({ email_enabled: true, sms_enabled: false, email_provider_live: false, sms_provider_live: false });
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [toast, setToast] = useToast();
  const fileRef = useRef(null);

  const loadCompany = () => {
    setCompanyLoading(true); setCompanyErr(false);
    axios.get('/api/admin/settings/company').then((r) => { setCompany(r.data); setSaved(r.data); })
      .catch(() => setCompanyErr(true)).finally(() => setCompanyLoading(false));
  };
  useEffect(() => {
    loadCompany();
    axios.get('/api/settings/notifications').then((r) => setPrefs(r.data))
      .catch(() => setToast({ msg: 'Could not load notification preferences.', type: 'error' })).finally(() => setPrefsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (k, v) => setCompany((c) => ({ ...c, [k]: v }));
  const dirty = saved && ['company_name', 'address', 'contact_number', 'contact_email'].some((k) => (company[k] ?? '') !== (saved[k] ?? ''));

  const saveCompany = async () => {
    setCompanyBusy(true);
    try {
      await axios.patch('/api/admin/settings/company', {
        company_name: company.company_name, address: company.address,
        contact_number: company.contact_number, contact_email: company.contact_email,
      });
      setSaved(company); setToast({ msg: 'Company settings saved.', type: 'success' });
    } catch (e) { setToast({ msg: e.response?.data?.message ?? 'Save failed.', type: 'error' }); }
    finally { setCompanyBusy(false); }
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    const bad = await checkUpload(file, { kinds: ['png', 'jpg', 'webp'], maxBytes: 2 * 1048576 });
    if (bad) { setToast({ msg: bad, type: 'error' }); if (fileRef.current) fileRef.current.value = ''; return; }
    const prevUrl = company.logo_url;
    setField('logo_url', URL.createObjectURL(file));
    setLogoBusy(true);
    try {
      const fd = new FormData(); fd.append('logo', file);
      const r = await axios.post('/api/admin/settings/company/logo', fd, { headers: { 'Content-Type': undefined } });
      setField('logo_url', r.data.logo_url); setSaved((s) => ({ ...s, logo_url: r.data.logo_url }));
      setToast({ msg: 'Logo uploaded.', type: 'success' });
    } catch (e) { setField('logo_url', prevUrl); setToast({ msg: e.response?.data?.message ?? 'Logo upload failed.', type: 'error' }); }
    finally { setLogoBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const togglePref = async (key) => {
    const prev = prefs[key];
    setPrefs((p) => ({ ...p, [key]: !prev })); setPrefsBusy(true);
    try { await axios.patch('/api/settings/notifications', { [key]: !prev }); }
    catch (e) { setPrefs((p) => ({ ...p, [key]: prev })); setToast({ msg: e.response?.data?.message ?? 'Could not save preference.', type: 'error' }); }
    finally { setPrefsBusy(false); }
  };

  const ro = !isManager;
  const bind = (k) => ({ id: `set-${k}`, className: 'adm-input', value: company[k] ?? '', disabled: ro, onChange: (e) => setField(k, e.target.value) });

  return (
    <>
      <Toast toast={toast} />
      <PageHeader title="System Settings" sub={isManager ? 'Company identity, your notification preferences, and user management.' : 'View only — a manager can edit company settings.'} />
      {ro && <Banner tone="info" icon="lock">You have view access. Company info and the logo can only be changed by a manager.</Banner>}

      <div className="set-layout">
        <nav className="set-nav" aria-label="Settings sections">
          <a href="#set-company"><NavIcon name="settings" size={15} color="currentColor" /> Company</a>
          <a href="#set-notify"><NavIcon name="notifications" size={15} color="currentColor" /> Notifications</a>
          {isManager && <a href="#set-users"><NavIcon name="users" size={15} color="currentColor" /> Users</a>}
        </nav>

        <div className="adm-stack">
          <div id="set-company" className="set-anchor">
            <Panel title="Company info & branding" action={dirty && isManager ? <span className="adm-pill" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>Unsaved changes</span> : null}>
              <p className="adm-sub" style={{ marginTop: -6 }}>VFRB Enterprise's identity, shown across the admin and customer portals.</p>
              {companyLoading ? <SkeletonRows rows={4} h={40} /> : companyErr ? (
                <Banner tone="warn" icon="warning" action={<button className="adm-btn" onClick={loadCompany}>Retry</button>}>Could not load company settings.</Banner>
              ) : (
                <>
                  <div className="set-logo">
                    <div className="set-logo-box">
                      {company.logo_url ? <img src={company.logo_url} alt="Company logo" /> : <span>No logo</span>}
                    </div>
                    <div>
                      <div className="adm-field">Logo</div>
                      {isManager ? (
                        <>
                          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => uploadLogo(e.target.files?.[0])} />
                          <button className="adm-btn" onClick={() => fileRef.current?.click()} disabled={logoBusy}>
                            <NavIcon name={logoBusy ? 'loading' : 'upload'} size={14} color="currentColor" /> {logoBusy ? 'Uploading…' : 'Change logo'}
                          </button>
                          <p className="adm-sub" style={{ margin: '6px 0 0' }}>PNG, JPG or WebP · max 2 MB</p>
                        </>
                      ) : <p className="adm-sub" style={{ margin: 0 }}>Only a manager can change the logo.</p>}
                    </div>
                  </div>
                  <div className="set-form">
                    <Field label="Company name" id="set-company_name"><input {...bind('company_name')} /></Field>
                    <Field label="Address" id="set-address"><input {...bind('address')} placeholder="31 San Guillermo St., Bayanan, Muntinlupa City" /></Field>
                    <div className="adm-grid-2">
                      <Field label="Contact number" id="set-contact_number"><input {...bind('contact_number')} inputMode="tel" placeholder="09XXXXXXXXX" /></Field>
                      <Field label="Contact email" id="set-contact_email"><input {...bind('contact_email')} type="email" placeholder="hello@vfrbenterprise.com" /></Field>
                    </div>
                  </div>
                  {isManager && (
                    <div className="adm-actionbar" style={{ marginTop: 18 }}>
                      <button className="adm-btn primary" onClick={saveCompany} disabled={companyBusy || !dirty}>{companyBusy ? 'Saving…' : 'Save changes'}</button>
                      {dirty && <button className="adm-btn" onClick={() => setCompany(saved)} disabled={companyBusy}>Discard</button>}
                    </div>
                  )}
                </>
              )}
            </Panel>
          </div>

          <div id="set-notify" className="set-anchor">
            <Panel title="Notification preferences">
              <p className="adm-sub" style={{ marginTop: -6 }}>Your own preferences — they apply only to your account.</p>
              {prefsLoading ? <SkeletonRows rows={2} h={64} /> : NOTIFY.map((row, i) => {
                const live = prefs[row.live]; const on = !!prefs[row.key];
                return (
                  <div key={row.key} className="set-pref" style={{ borderTop: i ? '1px solid var(--bg-surface)' : 'none' }}>
                    <span className="set-pref-ico"><NavIcon name={row.icon} size={18} color="currentColor" /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <b style={{ fontSize: 13 }}>{row.label}</b>
                        {!live && <span className="adm-pill" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>Not yet active</span>}
                      </div>
                      <p className="adm-sub" style={{ margin: '2px 0 0' }}>{row.note}</p>
                      {!live && <p style={{ fontSize: 11, color: 'var(--warning-text)', margin: '3px 0 0' }}>{row.warn}</p>}
                    </div>
                    <button role="switch" aria-checked={on} aria-label={row.label} className={`set-switch${on ? ' on' : ''}`} disabled={prefsBusy} onClick={() => togglePref(row.key)}><i /></button>
                  </div>
                );
              })}
            </Panel>
          </div>

          {isManager && (
            <div id="set-users" className="set-anchor">
              <Panel title="User management">
                <p className="adm-sub" style={{ marginTop: -6 }}>Create and manage staff and manager accounts.</p>
                <Link to="/admin/users" className="adm-btn" style={{ textDecoration: 'none' }}><NavIcon name="users" size={14} color="currentColor" /> Open user management</Link>
              </Panel>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
