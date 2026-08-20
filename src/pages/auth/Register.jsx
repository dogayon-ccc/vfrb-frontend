// src/pages/auth/Register.jsx
// VFRB Enterprise — Customer Self-Registration
//
// FIX (Aug 3 2026): this file used to be a copy of a manager-only staff
// creation form. App.jsx imported it as "CustomerRegister" and mounted it
// at the public /register route — but its actual behavior was to check
// localStorage.vfrb_user.role === 'manager' and instantly redirect anyone
// else to /admin. A real customer visiting /register to sign up would be
// silently bounced with no explanation. That staff-creation functionality
// already exists properly in UserManagement.jsx's CreateUserModal (manager-
// only, POST /api/admin/users) — so the old form was deleted as redundant
// rather than relocated. This is the real replacement, built against the
// actual working endpoint: POST /api/register (AuthController::register —
// verified fields: name, email, password, password_confirmation,
// contact_number, organization_name, client_type).
//
// Visual pattern matches Login.jsx (dark theme, split-panel layout) for
// consistency across the auth flow.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import logo from '../../assets/company-logo.jpg';

const TEAL = '#02C39A';

const CLIENT_TYPES = [
  { id: 'individual', label: 'Individual',   icon: '👤' },
  { id: 'school',     label: 'School',       icon: '🏫' },
  { id: 'medical',    label: 'Medical / Hospital', icon: '🏥' },
  { id: 'corporate',  label: 'Corporate / Business', icon: '🏢' },
];

const pwStrength = (p) => {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};
const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];

export default function CustomerRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', password: '', password_confirmation: '',
    contact_number: '', organization_name: '', client_type: 'individual',
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const [focused, setFocused] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const strength = pwStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (form.password !== form.password_confirmation) {
      setErrors({ password_confirmation: ['Passwords do not match.'] });
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post('/api/register', form);
      localStorage.setItem('vfrb_token', data.token);
      localStorage.setItem('vfrb_user', JSON.stringify(data.user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const verified = data.user?.email_verified_at || isLocalhost;
      navigate(verified ? '/customer' : '/verify-email');
    } catch (err) {
      setErrors(err.response?.data?.errors ?? { general: [err.response?.data?.message ?? 'Registration failed. Please try again.'] });
    } finally {
      setLoading(false);
    }
  };

  const inp = (name) => ({
    width: '100%', padding: '12px 16px', borderRadius: 11, fontSize: 14,
    color: '#fff', background: 'rgba(255,255,255,0.05)', outline: 'none',
    border: `1.5px solid ${focused === name ? TEAL : 'rgba(255,255,255,0.1)'}`,
    boxShadow: focused === name ? `0 0 0 3px rgba(2,195,154,0.12)` : 'none',
    transition: 'all .2s', boxSizing: 'border-box',
    fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif",
  });

  const firstError = (field) => errors?.[field]?.[0];

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::placeholder{color:rgba(255,255,255,0.22);}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        body{background:#06101a;margin:0;}
        .ll{width:48%;display:flex;flex-direction:column;justify-content:space-between;padding:52px;background:linear-gradient(145deg,#06101a 0%,#071e1a 40%,#023a2f 80%,#025a47 100%);position:relative;overflow:hidden;flex-shrink:0;}
        .lr{flex:1;display:flex;align-items:center;justify-content:center;padding:40px 44px;background:#08150f;overflow-y:auto;}
        @media(max-width:860px){.ll{display:none!important;}.lr{padding:32px 24px;}}
      `}</style>

      <div style={{ minHeight:'100vh', display:'flex', fontFamily:"ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif", color:'#fff', background:'#06101a' }}>

        <motion.div className="ll" initial={{ opacity:0, x:-24 }} animate={{ opacity:1, x:0 }} transition={{ duration:.7 }}>
          <div style={{ position:'absolute', top:'-15%', right:'-20%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(2,195,154,0.12),transparent 70%)', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', bottom:'-10%', left:'-10%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(2,195,154,0.08),transparent 70%)', pointerEvents:'none' }}/>
          <div style={{ display:'flex', alignItems:'center', gap:12, position:'relative', zIndex:1 }}>
            <img src={logo} alt="VFRB" style={{ width:40, height:40, borderRadius:10, objectFit:'cover', border:`2px solid rgba(2,195,154,0.4)` }}/>
            <div>
              <p style={{ color:'#fff', fontWeight:700, fontSize:14 }}>VFRB Enterprise</p>
              <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, marginTop:2 }}>Uniform Manufacturing</p>
            </div>
          </div>
          <motion.div initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }} transition={{ delay:.3, duration:.8 }} style={{ position:'relative', zIndex:1 }}>
            <h1 style={{ fontFamily:"Georgia,'Times New Roman',serif", fontSize:'clamp(32px,3vw,46px)', fontWeight:700, color:'#fff', lineHeight:1.1, marginBottom:18 }}>
              Design it once,<br/>
              <span style={{ background:`linear-gradient(135deg,${TEAL},#028090)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>we'll take it from there.</span>
            </h1>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:14.5, lineHeight:1.72, maxWidth:320 }}>
              Create your account to submit uniform designs, get AI-assisted material
              recommendations, and track production from cutting to delivery.
            </p>
          </motion.div>
          <p style={{ color:'rgba(255,255,255,0.2)', fontSize:11, position:'relative', zIndex:1 }}>Araos · Espeja · Llanto · Ogayon · CCC BSIT 2026</p>
        </motion.div>

        <motion.div className="lr" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:.5 }}>
          <div style={{ width:'100%', maxWidth:420 }}>

            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:.2 }} style={{ marginBottom:24 }}>
              <h2 style={{ fontFamily:"Georgia,'Times New Roman',serif", fontSize:30, fontWeight:700, color:'#fff', marginBottom:6 }}>Create your account</h2>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14 }}>
                Already have one?{' '}
                <Link to="/login" style={{ color:TEAL, textDecoration:'none', fontWeight:600 }}>Sign in →</Link>
              </p>
            </motion.div>

            <AnimatePresence>
              {firstError('general') && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                  style={{ borderRadius:11, padding:'12px 16px', marginBottom:18, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
                  ⚠ {firstError('general')}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:8 }}>
                  Full Name / Institution Contact
                </label>
                <input required value={form.name} onChange={e => set('name', e.target.value)}
                  onFocus={() => setFocused('name')} onBlur={() => setFocused('')}
                  placeholder="Juan Dela Cruz" style={inp('name')}/>
                {firstError('name') && <p style={{ color:'#fca5a5', fontSize:11, marginTop:5 }}>{firstError('name')}</p>}
              </div>

              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:8 }}>
                  Email Address
                </label>
                <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                  placeholder="you@email.com" style={inp('email')}/>
                {firstError('email') && <p style={{ color:'#fca5a5', fontSize:11, marginTop:5 }}>{firstError('email')}</p>}
              </div>

              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:8 }}>
                  Account Type
                </label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {CLIENT_TYPES.map(ct => (
                    <button key={ct.id} type="button" onClick={() => set('client_type', ct.id)}
                      style={{ padding:'10px 12px', borderRadius:10, textAlign:'left', cursor:'pointer',
                        background: form.client_type === ct.id ? 'rgba(2,195,154,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${form.client_type === ct.id ? TEAL : 'rgba(255,255,255,0.08)'}`,
                        color:'#fff', fontSize:12.5, fontFamily:"ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif" }}>
                      {ct.icon} {ct.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.client_type !== 'individual' && (
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:8 }}>
                    Organization Name
                  </label>
                  <input value={form.organization_name} onChange={e => set('organization_name', e.target.value)}
                    onFocus={() => setFocused('organization_name')} onBlur={() => setFocused('')}
                    placeholder="e.g. Holy Redeemer School of Calamba" style={inp('organization_name')}/>
                </div>
              )}

              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:8 }}>
                  Contact Number
                </label>
                <input value={form.contact_number} onChange={e => set('contact_number', e.target.value)}
                  onFocus={() => setFocused('contact_number')} onBlur={() => setFocused('')}
                  placeholder="09XXXXXXXXX" style={inp('contact_number')}/>
              </div>

              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:8 }}>
                  Password
                </label>
                <div style={{ position:'relative' }}>
                  <input type={showPw ? 'text' : 'password'} required value={form.password}
                    onChange={e => set('password', e.target.value)}
                    onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
                    placeholder="At least 8 characters" style={inp('password')}/>
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:12 }}>
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
                {form.password && (
                  <div style={{ display:'flex', gap:4, marginTop:8, alignItems:'center' }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ height:3, flex:1, borderRadius:2,
                        background: i <= strength ? STRENGTH_COLOR[strength] : 'rgba(255,255,255,0.1)' }}/>
                    ))}
                    <span style={{ fontSize:10, color:STRENGTH_COLOR[strength] || 'rgba(255,255,255,0.3)', marginLeft:6, minWidth:40 }}>
                      {STRENGTH_LABEL[strength]}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:8 }}>
                  Confirm Password
                </label>
                <input type={showPw ? 'text' : 'password'} required value={form.password_confirmation}
                  onChange={e => set('password_confirmation', e.target.value)}
                  onFocus={() => setFocused('password_confirmation')} onBlur={() => setFocused('')}
                  placeholder="Re-enter password" style={inp('password_confirmation')}/>
                {(firstError('password_confirmation')) && (
                  <p style={{ color:'#fca5a5', fontSize:11, marginTop:5 }}>{firstError('password_confirmation')}</p>
                )}
              </div>

              <motion.button whileHover={{ scale:1.01 }} whileTap={{ scale:.98 }}
                type="submit" disabled={loading}
                style={{ width:'100%', padding:'13px', borderRadius:11, border:'none', marginTop:6,
                  background: loading ? 'rgba(2,195,154,0.4)' : `linear-gradient(135deg,${TEAL},#028090)`,
                  color:'#06101a', fontSize:14, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily:"ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif" }}>
                {loading ? 'Creating account…' : 'Create Account'}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    </>
  );
}
