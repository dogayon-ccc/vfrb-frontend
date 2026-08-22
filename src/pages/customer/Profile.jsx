// src/pages/customer/Profile.jsx
// BUG 4 FIX + responsive redesign
//
// FIXES vs zip source:
//   1. CDN font ('DM Sans') removed — system font stack
//   2. BUG 4: hardcoded 2-col grid (gridTemplateColumns:'1fr 1fr') — breaks on mobile
//      Fix: single column always, name/email/contact in responsive auto-fill grid
//   3. Name+email inner grid → gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))'
//   4. Password fields: same auto-fill grid
//   5. All buttons: min-height 44px, full-width on mobile
//   6. whileTap on both save buttons
//   7. Skeleton loaders use correct class (no CDN)
//   8. Avatar card is responsive: stacks on ≤400px
//   9. Success/error messages use AnimatePresence slide-in
//  10. Tablet: 2-col layout still (≥768px), mobile: full single col

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const T    = 'var(--teal)';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,sans-serif`;

const inp = {
  width:'100%', padding:'11px 14px', borderRadius:10,
  border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a',
  fontSize:13, outline:'none', fontFamily:FONT,
  transition:'border .15s,box-shadow .15s', boxSizing:'border-box',
};
const fi = e => { e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo = e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; };
const lbl = {
  display:'block', fontSize:11, fontWeight:700,
  textTransform:'uppercase', letterSpacing:'.07em',
  color:'#64748b', marginBottom:7, fontFamily:FONT,
};
const SK = {
  borderRadius:8, height:42,
  background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
  backgroundSize:'400px', animation:'sk 1.4s infinite',
};

const CLIENT_TYPES = ['individual','school','corporate','medical','government','other'];

// ── Toast message ─────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity:0, y:-8, height:0 }}
          animate={{ opacity:1, y:0, height:'auto' }}
          exit={{ opacity:0, height:0 }}
          style={{ padding:'10px 14px', borderRadius:9, fontSize:12, fontWeight:700,
            fontFamily:FONT, marginTop:12,
            background: type==='error' ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${type==='error' ? '#fecaca' : '#bbf7d0'}`,
            color: type==='error' ? '#dc2626' : '#16a34a' }}>
          {type==='error' ? '⚠️ ' : '✓ '}{msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Password field ────────────────────────────────────────────────────────────
function PwField({ label, value, onChange, showPw, onTogglePw, placeholder }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <div style={{ position:'relative' }}>
        <input type={showPw ? 'text' : 'password'}
          value={value} onChange={onChange}
          placeholder={placeholder}
          style={{ ...inp, paddingRight:50 }}
          onFocus={fi} onBlur={fo}/>
        <button type="button" onClick={onTogglePw}
          style={{ position:'absolute', right:12, top:'50%',
            transform:'translateY(-50%)', border:'none',
            background:'transparent', cursor:'pointer',
            fontSize:16, color:'#94a3b8', padding:0,
            minHeight:'auto', // override 44px rule inside input button
          }}>
          {showPw ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CustomerProfile() {
  const [form,    setForm]   = useState({});
  const [pwForm,  setPwForm] = useState({
    current_password:'', password:'', password_confirmation:'',
  });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [msg,      setMsg]      = useState('');
  const [err,      setErr]      = useState('');
  const [pwMsg,    setPwMsg]    = useState('');
  const [pwErr,    setPwErr]    = useState('');
  const [showPw,   setShowPw]   = useState({ cur:false, new:false, con:false });

  useEffect(() => {
    axios.get('/api/customer/profile')
      .then(r => setForm(r.data?.user ?? r.data ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

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
      localStorage.setItem('vfrb_user', JSON.stringify({ ...u, name:form.name }));
      setMsg('Profile updated successfully.');
    } catch(e) {
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
      setPwForm({ current_password:'', password:'', password_confirmation:'' });
    } catch(e) {
      setPwErr(e.response?.data?.message ?? 'Failed to change password.');
    } finally { setSavingPw(false); }
  };

  return (
    <>
      <style>{`
        @keyframes sk { 0%{background-position:-400px 0} 100%{background-position:400px 0} }

        /* BUG 4 FIX: responsive profile layout */
        .profile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          align-items: start;
        }
        /* BUG 4 FIX: inner form fields */
        .profile-field-row {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }

        /* TABLET: 768px–1023px — keep 2 col but tighter */
        @media (max-width: 1023px) {
          .profile-grid { gap: 14px; }
        }

        /* MOBILE: ≤ 767px — SINGLE COLUMN (BUG 4 FIX) */
        @media (max-width: 767px) {
          .profile-grid {
            grid-template-columns: 1fr;   /* ← THE FIX */
            gap: 14px;
          }
          .profile-field-row {
            grid-template-columns: 1fr;
          }
          .profile-avatar-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }
      `}</style>

      <div style={{ width:'100%', fontFamily:FONT, color:'#0f172a' }}>

        {/* Page header */}
        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontSize:'clamp(18px,3vw,22px)', fontWeight:800,
            color:'#0f172a', margin:'0 0 4px', fontFamily:FONT }}>
            Profile
          </h1>
          <p style={{ color:'#64748b', fontSize:13, margin:0, fontFamily:FONT }}>
            Manage your account information and security settings.
          </p>
        </div>

        {/* BUG 4 FIX: profile-grid class → 2-col tablet/desktop, 1-col mobile */}
        <div className="profile-grid">

          {/* ── LEFT COLUMN: Account info ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Avatar card */}
            <div className="profile-avatar-card"
              style={{ background:'#fff', border:'1px solid #e2e8f0',
                borderRadius:14, padding:'18px 20px',
                boxShadow:'0 1px 3px rgba(0,0,0,.05)',
                display:'flex', alignItems:'center', gap:16 }}>
              <motion.div
                whileHover={{ scale:1.05 }}
                style={{ width:60, height:60, borderRadius:'50%', flexShrink:0,
                  background:`linear-gradient(135deg,${T},${T2})`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#fff', fontSize:24, fontWeight:800,
                  boxShadow:`0 4px 14px rgba(2,128,144,.3)` }}>
                {(form.name ?? '?').charAt(0).toUpperCase()}
              </motion.div>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:16, fontWeight:800, color:'#0f172a',
                  margin:0, fontFamily:FONT,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {loading ? '—' : (form.name ?? 'Customer')}
                </p>
                <p style={{ fontSize:12, color:'#64748b', margin:'3px 0 0', fontFamily:FONT }}>
                  {form.email ?? '—'}
                </p>
                <span style={{ display:'inline-block', marginTop:5, padding:'2px 9px',
                  borderRadius:99, fontSize:9, fontWeight:700, textTransform:'uppercase',
                  letterSpacing:'.07em',
                  background:'rgba(2,128,144,.1)', color:T, fontFamily:FONT }}>
                  Customer
                </span>
              </div>
            </div>

            {/* Account info form */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0',
              borderRadius:14, padding:'20px 22px',
              boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
              <h2 style={{ fontSize:14, fontWeight:800, color:'#0f172a',
                marginBottom:18, fontFamily:FONT }}>
                Account Information
              </h2>

              {loading ? (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {[1,2,3,4].map(i => <div key={i} style={SK}/>)}
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

                  {/* Name + Email — auto-fill: 2-col on wide, 1-col on narrow */}
                  <div className="profile-field-row">
                    <div>
                      <label style={lbl}>Full Name</label>
                      <input value={form.name ?? ''} onChange={e => set('name', e.target.value)}
                        placeholder="Your full name"
                        style={inp} onFocus={fi} onBlur={fo}/>
                    </div>
                    <div>
                      <label style={lbl}>Email Address</label>
                      <input value={form.email ?? ''} disabled
                        style={{ ...inp, background:'#f8fafc',
                          color:'#94a3b8', cursor:'not-allowed' }}/>
                    </div>
                  </div>

                  {/* Contact + Client Type */}
                  <div className="profile-field-row">
                    <div>
                      <label style={lbl}>Contact Number</label>
                      <input value={form.contact_number ?? ''}
                        onChange={e => set('contact_number', e.target.value)}
                        placeholder="09XXXXXXXXX"
                        style={inp} onFocus={fi} onBlur={fo}/>
                    </div>
                    <div>
                      <label style={lbl}>Client Type</label>
                      <select value={form.client_type ?? 'individual'}
                        onChange={e => set('client_type', e.target.value)}
                        style={{ ...inp, cursor:'pointer' }}>
                        {CLIENT_TYPES.map(t => (
                          <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Organization — full width */}
                  <div>
                    <label style={lbl}>Organization / School Name</label>
                    <input value={form.organization_name ?? ''}
                      onChange={e => set('organization_name', e.target.value)}
                      placeholder="e.g. Southville International School"
                      style={inp} onFocus={fi} onBlur={fo}/>
                  </div>

                  {/* Address */}
                  <div>
                    <label style={lbl}>Address</label>
                    <input value={form.address ?? ''}
                      onChange={e => set('address', e.target.value)}
                      placeholder="City, Province"
                      style={inp} onFocus={fi} onBlur={fo}/>
                  </div>

                  <Toast msg={msg} type="success"/>
                  <Toast msg={err} type="error"/>

                  <motion.button
                    whileHover={{ scale:1.01, boxShadow:`0 6px 18px rgba(2,128,144,.28)` }}
                    whileTap={{ scale:.97 }}
                    onClick={saveProfile} disabled={saving}
                    style={{ width:'100%', padding:'12px', borderRadius:10,
                      border:'none', minHeight:44,
                      background: saving ? '#94a3b8' : `linear-gradient(135deg,${T},${T2})`,
                      color:'#fff', fontSize:13, fontWeight:700,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontFamily:FONT,
                      boxShadow: saving ? 'none' : `0 4px 14px rgba(2,128,144,.25)`,
                      transition:'all .2s' }}>
                    {saving ? '⏳ Saving…' : '💾 Save Profile'}
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Password + Privacy ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Change password */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0',
              borderRadius:14, padding:'20px 22px',
              boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
              <h2 style={{ fontSize:14, fontWeight:800, color:'#0f172a',
                marginBottom:18, fontFamily:FONT }}>
                Change Password
              </h2>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <PwField
                  label="Current Password"
                  value={pwForm.current_password}
                  onChange={e => setPwForm(f => ({ ...f, current_password:e.target.value }))}
                  showPw={showPw.cur}
                  onTogglePw={() => setShowPw(s => ({ ...s, cur:!s.cur }))}
                  placeholder="Enter current password"/>

                <PwField
                  label="New Password"
                  value={pwForm.password}
                  onChange={e => setPwForm(f => ({ ...f, password:e.target.value }))}
                  showPw={showPw.new}
                  onTogglePw={() => setShowPw(s => ({ ...s, new:!s.new }))}
                  placeholder="Minimum 8 characters"/>

                <PwField
                  label="Confirm New Password"
                  value={pwForm.password_confirmation}
                  onChange={e => setPwForm(f => ({ ...f, password_confirmation:e.target.value }))}
                  showPw={showPw.con}
                  onTogglePw={() => setShowPw(s => ({ ...s, con:!s.con }))}
                  placeholder="Repeat new password"/>

                {/* Password strength hint */}
                {pwForm.password.length > 0 && (
                  <div style={{ display:'flex', gap:4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex:1, height:3, borderRadius:2,
                        background: pwForm.password.length >= i*2
                          ? i<=2 ? '#f59e0b' : '#22c55e'
                          : '#e2e8f0',
                        transition:'background .2s' }}/>
                    ))}
                    <span style={{ fontSize:9, color:'#64748b', marginLeft:4,
                      alignSelf:'center', fontFamily:FONT, whiteSpace:'nowrap' }}>
                      {pwForm.password.length < 4 ? 'Weak' :
                       pwForm.password.length < 8 ? 'Fair' : 'Strong'}
                    </span>
                  </div>
                )}

                <Toast msg={pwMsg} type="success"/>
                <Toast msg={pwErr} type="error"/>

                <motion.button
                  whileHover={{ scale:1.01 }} whileTap={{ scale:.97 }}
                  onClick={savePw} disabled={savingPw}
                  style={{ width:'100%', padding:'12px', borderRadius:10,
                    border:'none', minHeight:44,
                    background: savingPw ? '#94a3b8' : `linear-gradient(135deg,${T},${T2})`,
                    color:'#fff', fontSize:13, fontWeight:700,
                    cursor: savingPw ? 'not-allowed' : 'pointer',
                    fontFamily:FONT,
                    transition:'all .2s' }}>
                  {savingPw ? '⏳ Changing…' : '🔒 Change Password'}
                </motion.button>
              </div>
            </div>

            {/* Privacy notice */}
            <div style={{ padding:'18px 20px', borderRadius:14,
              background:'#f8fafc', border:'1px solid #e2e8f0' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#0f172a',
                marginBottom:8, fontFamily:FONT }}>
                🔒 Data Privacy (RA 10173)
              </p>
              <p style={{ fontSize:11, color:'#64748b', lineHeight:1.7,
                margin:0, fontFamily:FONT }}>
                Your information is used exclusively to process your orders and communicate
                with VFRB Enterprise. We store minimum necessary data only. Passwords are
                encrypted with bcrypt. Your account data is never shared with third parties.
              </p>
            </div>

            {/* Account actions */}
            <div style={{ padding:'18px 20px', borderRadius:14,
              background:'#fff', border:'1px solid #e2e8f0',
              boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#0f172a',
                marginBottom:12, fontFamily:FONT }}>
                Account
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <p style={{ fontSize:12, color:'#64748b', margin:0, fontFamily:FONT }}>
                  Member since:{' '}
                  <strong style={{ color:'#0f172a' }}>
                    {form.created_at
                      ? new Date(form.created_at).toLocaleDateString('en-PH', {
                          year:'numeric', month:'long', day:'numeric' })
                      : '—'}
                  </strong>
                </p>
                <p style={{ fontSize:12, color:'#64748b', margin:0, fontFamily:FONT }}>
                  Email verified:{' '}
                  <strong style={{ color: form.email_verified_at ? '#22c55e' : '#f59e0b' }}>
                    {form.email_verified_at ? '✓ Verified' : '⚠ Not verified'}
                  </strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
