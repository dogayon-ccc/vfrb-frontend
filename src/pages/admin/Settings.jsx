import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { NavIcon } from '../../components/ui/icons';
import { checkUpload } from '../../utils/fileCheck';
import { PageHeader, Panel, Banner, Toast, useToast, SkeletonRows, Meter } from '../../components/admin/AdminUI';
import RecommendationGuidancePanel from '../../components/admin/RecommendationGuidancePanel';
import AiQualityPanel from '../../components/admin/AiQualityPanel';
import { PASSWORD_RULE_TEXT, passwordOk, passwordLevel, levelLabel } from '../../utils/passwordRules';
import ProfilePhotoField from '../../components/ProfilePhotoField';
import AppearanceField from '../../components/AppearanceField';
import { readUser } from '../../utils/authRoute';
import { isAdmin, isStation, STATION_SETTINGS } from '../../utils/jobAccess';

const UserManagement = lazy(() => import('./UserManagement'));

const NOTIFY = [
  { key: 'email_enabled', live: 'email_provider_live', label: 'Email notifications', icon: 'email', note: 'Order updates, AI recommendations ready, and account alerts.',
    warn: 'The mail server is a test inbox, so no real email is sent yet. Your preference is saved for when VFRB connects its mail provider.' },
];

// The owner cannot read company, AI or user settings from the API; these three are their own account.
const OWNER_TABS = ['profile', 'notify', 'password'];

const Field = ({ label, id, children }) => (<div><label className="adm-field" htmlFor={id}>{label}</label>{children}</div>);

const BLANK_PW = { current_password: '', password: '', password_confirmation: '' };
// The signed-in admin's own password (PUT /api/account/password; same rules as customers).
function PasswordPanel({ setToast }) {
  const [pw, setPw] = useState(BLANK_PW);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = k => e => { setPw(f => ({ ...f, [k]: e.target.value })); setErr(''); };
  const level = passwordLevel(pw.password);
  const save = async () => {
    if (!pw.current_password) return setErr('Enter your current password.');
    if (!passwordOk(pw.password)) return setErr(PASSWORD_RULE_TEXT);
    if (pw.password !== pw.password_confirmation) return setErr('The new passwords do not match.');
    setBusy(true);
    try { await axios.put('/api/account/password', pw); setPw(BLANK_PW); setToast({ msg: 'Password changed.', type: 'success' }); }
    catch (e) { setErr(e.response?.data?.message ?? 'Could not change the password.'); }
    finally { setBusy(false); }
  };
  return (
    <Panel title="Password" subtitle={PASSWORD_RULE_TEXT}
      action={<button className="adm-btn primary" onClick={save} disabled={busy}>{busy ? 'Changing…' : 'Change password'}</button>}>
      <div className="set-form">
        <Field label="Current password" id="pw-current"><input id="pw-current" className="adm-input" type="password" autoComplete="current-password" value={pw.current_password} onChange={set('current_password')} /></Field>
        <div className="set-grid">
          <Field label="New password" id="pw-new"><input id="pw-new" className="adm-input" type="password" autoComplete="new-password" value={pw.password} onChange={set('password')} aria-describedby="pw-strength" /></Field>
          <Field label="Confirm new password" id="pw-confirm"><input id="pw-confirm" className="adm-input" type="password" autoComplete="new-password" value={pw.password_confirmation} onChange={set('password_confirmation')} /></Field>
        </div>
        {pw.password && (
          <div id="pw-strength" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}><Meter pct={level * 25} tone={level >= 4 ? 'ok' : undefined} label="Password strength" /></div>
            <span className="adm-sub" style={{ margin: 0, minWidth: 48 }}>{levelLabel(level)}</span>
          </div>
        )}
        {err && <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--danger-text)' }}>{err}</p>}
      </div>
    </Panel>
  );
}

// The signed-in admin's own email and username (PUT /api/account/login). An email is what makes Forgot password work.
function SignInPanel({ me, onSaved, setToast }) {
  const [form, setForm] = useState({ email: me.email ?? '', username: me.username ?? '', current_password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setErr(''); };
  const save = async () => {
    if (!form.current_password) return setErr('Enter your current password to save.');
    setBusy(true);
    try {
      // Only what changed, so a stale browser copy can never overwrite the saved email or username.
      const body = { current_password: form.current_password };
      ['email', 'username'].forEach((k) => { if (form[k].trim() !== (me[k] ?? '')) body[k] = form[k]; });
      const r = await axios.put('/api/account/login', body);
      onSaved(r.data); setForm(f => ({ ...f, current_password: '' })); setToast({ msg: 'Sign-in details saved.', type: 'success' });
    } catch (e) { setErr(e.response?.data?.message ?? 'Could not save your sign-in details.'); }
    finally { setBusy(false); }
  };
  const sendLink = async () => {
    setBusy(true);
    try { await axios.post('/api/password/forgot', { email: me.email }); setToast({ msg: `Reset link sent to ${me.email}.`, type: 'success' }); }
    catch (e) { setErr(e.response?.data?.message ?? 'Could not send the reset link.'); }
    finally { setBusy(false); }
  };
  return (
    <Panel title="Sign-in details" subtitle="Sign in with your email or your username."
      action={<button className="adm-btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save details'}</button>}>
      <div className="set-form">
        {!me.email && <Banner tone="warn" icon="warning">No email on this account. Add one to reset a forgotten password yourself and to get email notifications. Without it, only a manager can reset your password.</Banner>}
        <div className="set-grid">
          <Field label="Email (optional)" id="me-email"><input id="me-email" className="adm-input" type="email" autoComplete="email" value={form.email} onChange={set('email')} /></Field>
          <Field label="Username" id="me-username"><input id="me-username" className="adm-input" autoComplete="username" value={form.username} onChange={set('username')} /></Field>
        </div>
        <Field label="Current password" id="me-current"><input id="me-current" className="adm-input" type="password" autoComplete="current-password" value={form.current_password} onChange={set('current_password')} /></Field>
        {err && <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--danger-text)' }}>{err}</p>}
        {me.email && <div><button type="button" className="adm-btn" onClick={sendLink} disabled={busy}>Email me a reset link</button></div>}
      </div>
    </Panel>
  );
}

export default function Settings() {
  const [company, setCompany] = useState({ company_name: '', logo_url: null, address: '', contact_number: '', contact_email: '' });
  const [saved, setSaved] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyErr, setCompanyErr] = useState(false);
  const [companyBusy, setCompanyBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [prefs, setPrefs] = useState({ email_enabled: true, email_provider_live: false });
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [toast, setToast] = useToast();
  const [me, setMe] = useState(readUser);
  const fileRef = useRef(null);
  const station = isStation();
  const owner = me.role === 'owner';
  const saveMe = (patch) => setMe((u) => { const next = { ...u, ...patch }; localStorage.setItem('vfrb_user', JSON.stringify(next)); return next; });

  const loadCompany = () => {
    setCompanyLoading(true); setCompanyErr(false);
    axios.get('/api/admin/settings/company').then((r) => { setCompany(r.data); setSaved(r.data); })
      .catch(() => setCompanyErr(true)).finally(() => setCompanyLoading(false));
  };
  // The browser copy of the account can be older than a manager's edit.
  useEffect(() => {
    axios.get('/api/user').then((r) => saveMe({ email: r.data.email, username: r.data.username })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (station) return;
    if (!owner) loadCompany();
    axios.get('/api/settings/notifications').then((r) => setPrefs(r.data))
      .catch(() => setToast({ msg: 'Could not load notification preferences.', type: 'error' })).finally(() => setPrefsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (k, v) => setCompany((c) => ({ ...c, [k]: v }));
  const dirty = saved && ['company_name', 'address', 'contact_number', 'contact_email'].some((k) => String(company[k] ?? '').trim() !== String(saved[k] ?? '').trim());

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

  const bind = (k) => ({ id: `set-${k}`, className: 'adm-input', value: company[k] ?? '', autoComplete: 'off', onChange: (e) => setField(k, e.target.value) });
  // Saved value is empty: say so, so an example placeholder is never mistaken for real data.
  const unset = (k) => !String(saved?.[k] ?? '').trim() && !String(company[k] ?? '').trim()
    ? <span className="set-unset">{k === 'address' ? 'Not set yet: invoices and receipts print the old default address.' : 'Not set yet: left off invoices and receipts.'}</span> : null;

  const sections = [
    ['company', 'settings', 'Company'], ['profile', 'profile', 'Your profile'], ['notify', 'notifications', 'Notifications'],
    ['password', 'lock', 'Sign-in & security'], ['ai', 'ai', 'AI guidance'], ['users', 'users', 'User Management'],
  ].filter(([k]) => !station || STATION_SETTINGS.includes(k)).filter(([k]) => !owner || OWNER_TABS.includes(k)).filter(([k]) => k !== 'users' || isAdmin());
  // One section at a time; ?tab= keeps it linkable and Back-able.
  const [params, setParams] = useSearchParams();
  const tab = sections.some(([k]) => k === params.get('tab')) ? params.get('tab') : sections[0][0];
  const pick = (k) => setParams(k === 'company' ? {} : { tab: k });
  const onTabKey = (e) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const n = sections[(sections.findIndex(([k]) => k === tab) + step + sections.length) % sections.length][0];
    pick(n); document.getElementById(`set-tab-${n}`)?.focus();
  };
  // Fade only the edge that has more tabs past it, so no label is ever hidden at the end of the strip.
  const navRef = useRef(null);
  const [fade, setFade] = useState('none');
  const measure = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const left = el.scrollLeft > 2, right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setFade(left && right ? 'both' : left ? 'left' : right ? 'right' : 'none');
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);
  useEffect(() => {
    document.getElementById(`set-tab-${tab}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }, [tab]);

  const saveActions = dirty && (
    <div className="set-save">
      <span className="set-tag warn">Unsaved changes</span>
      <button className="adm-btn" onClick={() => setCompany(saved)} disabled={companyBusy}>Discard</button>
      <button className="adm-btn primary" onClick={saveCompany} disabled={companyBusy}>{companyBusy ? 'Saving…' : 'Save changes'}</button>
    </div>
  );

  return (
    <div className="set-wrap">
      <Toast toast={toast} />
      <PageHeader title="Settings" />

      <div className="set-layout">
        <nav ref={navRef} className="set-nav" data-fade={fade} onScroll={measure} role="tablist" aria-label="Settings sections" onKeyDown={onTabKey}>
          {sections.map(([k, icon, label]) => (
            <button key={k} id={`set-tab-${k}`} type="button" role="tab" aria-selected={tab === k} aria-controls="set-panel" tabIndex={tab === k ? 0 : -1}
              className={tab === k ? 'on' : undefined} onClick={() => pick(k)}>
              <NavIcon name={icon} size={16} color="currentColor" /> {label}
            </button>
          ))}
        </nav>

        <div className="set-main" id="set-panel" role="tabpanel" aria-labelledby={`set-tab-${tab}`}>
          {tab === 'company' && (
            <Panel title="Company info & branding" subtitle="VFRB Enterprise's identity, shown across the admin and customer portals." action={saveActions || null}>
              {companyLoading ? <SkeletonRows rows={4} h={40} /> : companyErr ? (
                <Banner tone="warn" icon="warning" action={<button className="adm-btn" onClick={loadCompany}>Retry</button>}>Could not load company settings.</Banner>
              ) : (
                <div className="set-company">
                  <div className="set-logo">
                    <div className="set-logo-box">
                      {company.logo_url ? <img src={company.logo_url} alt="Company logo" /> : <span>No logo</span>}
                    </div>
                    <div>
                      <div className="adm-field">Logo</div>
                      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => uploadLogo(e.target.files?.[0])} />
                      <button className="adm-btn" onClick={() => fileRef.current?.click()} disabled={logoBusy}>
                        <NavIcon name={logoBusy ? 'loading' : 'upload'} size={14} color="currentColor" /> {logoBusy ? 'Uploading…' : company.logo_url ? 'Change logo' : 'Upload logo'}
                      </button>
                      <p className="adm-sub" style={{ margin: '6px 0 0' }}>PNG, JPG or WebP · max 2 MB</p>
                    </div>
                  </div>
                  <div className="set-form">
                    <div className="set-grid three">
                      <Field label="Company name" id="set-company_name"><input {...bind('company_name')} /></Field>
                      <Field label="Contact number" id="set-contact_number"><input {...bind('contact_number')} inputMode="tel" placeholder="e.g. 0917 123 4567" />{unset('contact_number')}</Field>
                      <Field label="Contact email" id="set-contact_email"><input {...bind('contact_email')} type="email" placeholder="e.g. hello@vfrbenterprise.com" />{unset('contact_email')}</Field>
                    </div>
                    <Field label="Address" id="set-address"><input {...bind('address')} placeholder="e.g. 31 San Guillermo St., Bayanan, Muntinlupa City" />{unset('address')}</Field>
                  </div>
                </div>
              )}
            </Panel>
          )}
          {tab === 'company' && saveActions && <div className="set-save-sticky">{saveActions}</div>}

          {tab === 'profile' && (
            <Panel title="Your profile" subtitle="Your photo, display mode and accent colour. They apply only to your account.">
              <div className="set-two">
                <ProfilePhotoField avatar={me.avatar} name={me.name} onChange={(avatar) => setMe((u) => ({ ...u, avatar }))} />
                <AppearanceField userId={me.user_id} />
              </div>
            </Panel>
          )}

          {tab === 'notify' && (
            <Panel title="Notifications" subtitle="How the system reaches you. Applies only to your account.">
              {!me.email && <Banner tone="warn" icon="warning" action={<button className="adm-btn" onClick={() => pick('password')}>Add an email</button>}>This account has no email, so no email notifications can reach you.</Banner>}
              {prefsLoading ? <SkeletonRows rows={1} h={64} /> : NOTIFY.map((row, i) => {
                const live = prefs[row.live]; const on = !!prefs[row.key] && !!me.email;
                return (
                  <div key={row.key} className="set-pref" style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                    <span className="set-pref-ico"><NavIcon name={row.icon} size={18} color="currentColor" /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="set-pref-head">
                        <b>{row.label}</b>
                        {!live && <span className="set-tag warn">Not yet active</span>}
                      </div>
                      <p className="adm-sub" style={{ margin: '2px 0 0' }}>{row.note}</p>
                      {!live && <p className="set-pref-warn">{row.warn}</p>}
                    </div>
                    <button role="switch" aria-checked={on} aria-label={row.label} className={`set-switch${on ? ' on' : ''}`} disabled={prefsBusy || !me.email} onClick={() => togglePref(row.key)}><i /></button>
                  </div>
                );
              })}
            </Panel>
          )}

          {tab === 'password' && (
            <div className="set-two">
              <SignInPanel key={`${me.email}|${me.username}`} me={me} onSaved={saveMe} setToast={setToast} />
              <PasswordPanel setToast={setToast} />
            </div>
          )}

          {tab === 'ai' && <RecommendationGuidancePanel setToast={setToast} />}
          {tab === 'ai' && <AiQualityPanel />}

          {tab === 'users' && <Suspense fallback={<SkeletonRows rows={5} h={48} />}><UserManagement embedded /></Suspense>}
        </div>
      </div>
    </div>
  );
}
