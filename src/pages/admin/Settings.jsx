// src/pages/admin/Settings.jsx
// System Settings (Aug 21 2026 session).
//
// SCOPE (confirmed with Dave):
//   1. Company info + branding — manager can edit, staff view only.
//      Logo is a REAL file upload (multipart), not a text field.
//   2. Notification preferences — every user manages their OWN row.
//      email_enabled / sms_enabled are stored honestly but NEITHER
//      channel has a real provider behind it yet in this build:
//        - Mailtrap is a SANDBOX inbox only — no real email reaches
//          a customer or staff member's real inbox right now.
//        - No SMS gateway is configured anywhere in this codebase.
//      Both toggles are labeled "Not yet active" per Dave's explicit
//      instruction — do not remove that label without a real provider
//      being wired up and confirmed.
//   3. User/role shortcuts — just links to the existing /admin/users
//      page. No new user-management logic lives here.
//
// PERMISSION PATTERN — reuses the exact idiom already used in
// PhysicalCount.jsx / UserManagement.jsx (localStorage 'vfrb_user',
// role === 'manager'), not a new mechanism. Route itself is NOT
// wrapped in <RequireManager> (unlike Suppliers/Users) because staff
// DO have view access here — only the edit affordances are gated
// inside this component, matching the reconcile-button pattern in
// PhysicalCount.jsx.

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';

const T    = '#028090';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;
const inp  = { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:13, outline:'none', fontFamily:FONT, transition:'border .15s, box-shadow .15s', boxSizing:'border-box' };
const inpDisabled = { ...inp, background:'#f8fafc', color:'#64748b', cursor:'not-allowed' };
const fi   = e => { e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo   = e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; };
const lbl  = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#64748b', marginBottom:7, fontFamily:FONT };
const card = { background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, boxShadow:'0 1px 3px rgba(0,0,0,.05)', padding:'22px 24px' };

// NOTE (Aug 22 2026 fix): user/isManager used to be declared here at module
// scope. Since this page is lazy-loaded, that code only ran ONCE per browser
// tab, on first import — so switching accounts (manager -> staff) within the
// same tab without a hard reload left isManager permanently stuck at
// whatever the FIRST login's role was. Confirmed in production: a staff
// login inherited a manager's edit rights because manager had opened this
// page first in the same tab. Fixed by moving the read inside the
// component (getIsManager()) so it's re-evaluated on every mount — do not
// hoist this back to module scope.
function getIsManager() {
  try {
    return (JSON.parse(localStorage.getItem('vfrb_user') || '{}').role) === 'manager';
  } catch { return false; }
}


function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  const bg = type === 'error' ? '#E53E3E' : T;
  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
      style={{ position:'fixed', bottom:24, right:24, background:bg, color:'#fff', padding:'12px 18px', borderRadius:12, fontSize:13, fontWeight:600, fontFamily:FONT, boxShadow:'0 8px 24px rgba(0,0,0,.15)', zIndex:400 }}>
      {msg}
    </motion.div>
  );
}

function NotConfiguredBadge() {
  return (
    <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.05em', color:'#B45309', background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:999, padding:'3px 9px', whiteSpace:'nowrap' }}>
      Not yet active
    </span>
  );
}

export default function Settings() {
  // Read fresh on every mount — see getIsManager() note above for why this
  // can't be a module-level constant.
  const isManager = getIsManager();

  const [company, setCompany] = useState({ company_name:'', logo_url:null, address:'', contact_number:'', contact_email:'' });
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyBusy, setCompanyBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);

  const [prefs, setPrefs] = useState({ email_enabled:true, sms_enabled:false, email_provider_live:false, sms_provider_live:false });
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsBusy, setPrefsBusy] = useState(false);

  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    axios.get('/api/admin/settings/company')
      .then(r => setCompany(r.data))
      .catch(() => setToast({ msg:'Could not load company settings.', type:'error' }))
      .finally(() => setCompanyLoading(false));

    axios.get('/api/settings/notifications')
      .then(r => setPrefs(r.data))
      .catch(() => setToast({ msg:'Could not load notification preferences.', type:'error' }))
      .finally(() => setPrefsLoading(false));
  }, []);

  const setField = (k, v) => setCompany(c => ({ ...c, [k]: v }));

  const saveCompany = async () => {
    setCompanyBusy(true);
    try {
      await axios.patch('/api/admin/settings/company', {
        company_name: company.company_name,
        address: company.address,
        contact_number: company.contact_number,
        contact_email: company.contact_email,
      });
      setToast({ msg:'Company settings saved.', type:'success' });
    } catch (e) {
      setToast({ msg: e.response?.data?.message ?? 'Save failed.', type:'error' });
    } finally { setCompanyBusy(false); }
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    const prevUrl = company.logo_url;
    // Optimistic preview — instant swap, rollback on failure.
    const localPreview = URL.createObjectURL(file);
    setField('logo_url', localPreview);
    setLogoBusy(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const r = await axios.post('/api/admin/settings/company/logo', fd, {
        headers: { 'Content-Type': undefined }, // let axios/browser set the multipart boundary
      });
      setField('logo_url', r.data.logo_url);
      setToast({ msg:'Logo uploaded.', type:'success' });
    } catch (e) {
      setField('logo_url', prevUrl);
      setToast({ msg: e.response?.data?.message ?? 'Logo upload failed.', type:'error' });
    } finally { setLogoBusy(false); }
  };

  const togglePref = async (key) => {
    const prev = prefs[key];
    setPrefs(p => ({ ...p, [key]: !prev })); // optimistic
    setPrefsBusy(true);
    try {
      await axios.patch('/api/settings/notifications', { [key]: !prev });
    } catch (e) {
      setPrefs(p => ({ ...p, [key]: prev })); // rollback
      setToast({ msg: e.response?.data?.message ?? 'Could not save preference.', type:'error' });
    } finally { setPrefsBusy(false); }
  };

  return (
    <div style={{ maxWidth:760, margin:'0 auto', display:'flex', flexDirection:'column', gap:22, fontFamily:FONT }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', margin:'0 0 4px' }}>System Settings</h1>
        <p style={{ fontSize:13, color:'#64748b', margin:0 }}>
          {isManager ? 'Company branding, notification preferences, and user management shortcuts.' : 'View-only — company settings can be edited by a manager.'}
        </p>
      </div>

      {/* ── Company Info + Branding ─────────────────────────────────── */}
      <div style={card}>
        <h2 style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:'0 0 4px' }}>Company Info & Branding</h2>
        <p style={{ fontSize:12, color:'#94a3b8', margin:'0 0 18px' }}>VFRB Enterprise's own identity — shown across the admin and customer portals.</p>

        {companyLoading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[1,2,3].map(i => <div key={i} style={{ height:38, borderRadius:10, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite' }}/>)}
          </div>
        ) : (
          <>
            {/* Logo */}
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
              <div style={{ width:72, height:72, borderRadius:14, border:'1px solid #e2e8f0', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
                {company.logo_url
                  ? <img src={company.logo_url} alt="Company logo" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : <span style={{ fontSize:11, color:'#cbd5e1', fontWeight:700 }}>No logo</span>}
              </div>
              <div>
                <label style={lbl}>Logo</label>
                {isManager ? (
                  <>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display:'none' }}
                      onChange={e => uploadLogo(e.target.files?.[0])}/>
                    <button onClick={() => fileRef.current?.click()} disabled={logoBusy}
                      style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${T}`, background:'#fff', color:T, fontWeight:700, fontSize:12, cursor: logoBusy ? 'wait' : 'pointer', fontFamily:FONT }}>
                      {logoBusy ? 'Uploading…' : 'Change Logo'}
                    </button>
                    <p style={{ fontSize:11, color:'#94a3b8', margin:'6px 0 0' }}>PNG, JPG, or WebP · max 2MB</p>
                  </>
                ) : (
                  <p style={{ fontSize:12, color:'#94a3b8', margin:0 }}>Only a manager can change the logo.</p>
                )}
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={lbl}>Company Name</label>
                <input value={company.company_name ?? ''} disabled={!isManager}
                  onChange={e => setField('company_name', e.target.value)}
                  style={isManager ? inp : inpDisabled} onFocus={isManager ? fi : undefined} onBlur={isManager ? fo : undefined}/>
              </div>
              <div>
                <label style={lbl}>Address</label>
                <input value={company.address ?? ''} disabled={!isManager}
                  onChange={e => setField('address', e.target.value)} placeholder="31 San Guillermo St., Bayanan, Muntinlupa City"
                  style={isManager ? inp : inpDisabled} onFocus={isManager ? fi : undefined} onBlur={isManager ? fo : undefined}/>
              </div>
              <div className="set-contact-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>Contact Number</label>
                  <input value={company.contact_number ?? ''} disabled={!isManager}
                    onChange={e => setField('contact_number', e.target.value)} placeholder="09XXXXXXXXX"
                    style={isManager ? inp : inpDisabled} onFocus={isManager ? fi : undefined} onBlur={isManager ? fo : undefined}/>
                </div>
                <div>
                  <label style={lbl}>Contact Email</label>
                  <input value={company.contact_email ?? ''} disabled={!isManager}
                    onChange={e => setField('contact_email', e.target.value)} placeholder="hello@vfrbenterprise.com"
                    style={isManager ? inp : inpDisabled} onFocus={isManager ? fi : undefined} onBlur={isManager ? fo : undefined}/>
                </div>
              </div>
            </div>

            {isManager && (
              <button onClick={saveCompany} disabled={companyBusy}
                style={{ marginTop:18, padding:'11px 22px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${T},${T2})`, color:'#fff', fontWeight:700, fontSize:13, cursor: companyBusy ? 'wait' : 'pointer', fontFamily:FONT }}>
                {companyBusy ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Notification Preferences ────────────────────────────────── */}
      <div style={card}>
        <h2 style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:'0 0 4px' }}>Notification Preferences</h2>
        <p style={{ fontSize:12, color:'#94a3b8', margin:'0 0 18px' }}>Your own preferences — applies only to your account.</p>

        {prefsLoading ? (
          <div style={{ height:76, borderRadius:10, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite' }}/>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {[
              { key:'email_enabled', label:'Email Notifications', live:prefs.email_provider_live, note:'Order updates, AI recommendations ready, and account alerts.' },
              { key:'sms_enabled',   label:'SMS Notifications',   live:prefs.sms_provider_live,   note:'Text alerts for urgent order or delivery updates.' },
            ].map((row, i) => (
              <div key={row.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderTop: i>0 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ minWidth:0, paddingRight:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>{row.label}</span>
                    {!row.live && <NotConfiguredBadge/>}
                  </div>
                  <p style={{ fontSize:11.5, color:'#94a3b8', margin:0 }}>{row.note}</p>
                  {!row.live && (
                    <p style={{ fontSize:11, color:'#B45309', margin:'3px 0 0' }}>
                      {row.key === 'email_enabled'
                        ? 'No production email provider is connected yet — this saves your preference but no real email is sent.'
                        : 'No SMS provider is connected — this reserves the setting for when one is added.'}
                    </p>
                  )}
                </div>
                {/* MOBILE AUDIT FIX (Aug 22): the visible pill is 44×26 —
                    below the project's 44px touch-target minimum on the
                    vertical axis. Rather than grow the pill itself (which
                    would change its look), the BUTTON is now the 44×44 hit
                    area and the pill is a centered inner element, same
                    visual size as before. */}
                <button onClick={() => togglePref(row.key)} disabled={prefsBusy}
                  style={{ flexShrink:0, width:44, height:44, padding:0, border:'none',
                    background:'transparent', cursor: prefsBusy ? 'wait' : 'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ width:44, height:26, borderRadius:999, position:'relative',
                    background: prefs[row.key] ? T : '#e2e8f0', transition:'background .15s' }}>
                    <motion.span animate={{ x: prefs[row.key] ? 20 : 2 }} transition={{ type:'spring', stiffness:500, damping:30 }}
                      style={{ position:'absolute', top:2, width:22, height:22, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── User & Role Shortcuts ───────────────────────────────────── */}
      {isManager && (
        <div style={card}>
          <h2 style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:'0 0 4px' }}>User Management</h2>
          <p style={{ fontSize:12, color:'#94a3b8', margin:'0 0 16px' }}>Manage staff and manager accounts.</p>
          <Link to="/admin/users" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:10, border:'1px solid #e2e8f0', color:'#0f172a', fontWeight:700, fontSize:13, textDecoration:'none', fontFamily:FONT }}>
            👥 Go to User Management →
          </Link>
        </div>
      )}

      <AnimatePresence>
        {toast && <Toast key={toast.msg+toast.type} msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}
      </AnimatePresence>

      {/* MOBILE AUDIT FIX (Aug 22): Contact Number / Contact Email were a
          hardcoded 2-column grid with no mobile override anywhere in this
          file, unlike every other 2-col form grid in the app (which uses
          the .adm-grid-2 convention already stacking at ≤767px). Native
          input text-scroll kept it from visually breaking, but it was
          inconsistent and cramped. Stacks to 1 column at ≤767px, same as
          every other form grid in the codebase. */}
      <style>{`
        @media (max-width: 767px) {
          .set-contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}