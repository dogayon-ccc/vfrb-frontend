import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import logo from '../../assets/company-logo.jpg';

const TEAL = '#02C39A';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const resetSuccess = location.state?.resetSuccess === true;

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [focused, setFocused] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post('/api/login', form);
      if (data.user.role === 'manager' || data.user.role === 'staff') {
        setError('Staff accounts must use the Admin Portal at /admin/login.');
        return;
      }
      localStorage.setItem('vfrb_token', data.token);
      localStorage.setItem('vfrb_user', JSON.stringify(data.user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      // Dev bypass: on localhost skip email verification gate so team can test
      // In production this will correctly redirect unverified users
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const verified = data.user.email_verified_at || isLocalhost;
      navigate(verified ? '/customer' : '/verify-email');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const inp = (name) => ({
    width: '100%', padding: '12px 16px', borderRadius: 11, fontSize: 14,
    color: '#fff', background: 'rgba(255,255,255,0.05)', outline: 'none',
    border: `1.5px solid ${focused === name ? TEAL : 'rgba(255,255,255,0.1)'}`,
    boxShadow: focused === name ? `0 0 0 3px rgba(2,195,154,0.12)` : 'none',
    transition: 'all .2s', boxSizing: 'border-box', fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif",
  });

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
              Order uniforms,<br/>
              <span style={{ background:`linear-gradient(135deg,${TEAL},#028090)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>track every step.</span>
            </h1>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:14.5, lineHeight:1.72, maxWidth:320 }}>
              VFRB Enterprise — quality uniform manufacturing for schools, corporate clients, and medical institutions.
            </p>
          </motion.div>
          <p style={{ color:'rgba(255,255,255,0.2)', fontSize:11, position:'relative', zIndex:1 }}>Araos · Espeja · Llanto · Ogayon · CCC BSIT 2026</p>
        </motion.div>

        <motion.div className="lr" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:.5 }}>
          <div style={{ width:'100%', maxWidth:400 }}>

            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:.2 }} style={{ marginBottom:28 }}>
              <h2 style={{ fontFamily:"Georgia,'Times New Roman',serif", fontSize:30, fontWeight:700, color:'#fff', marginBottom:6 }}>Welcome back</h2>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14 }}>
                No account?{' '}
                <Link to="/register" style={{ color:TEAL, textDecoration:'none', fontWeight:600 }}>Register here →</Link>
              </p>
            </motion.div>

            <AnimatePresence>
              {resetSuccess && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                  style={{ borderRadius:11, padding:'12px 16px', marginBottom:18, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', color:'#86efac', fontSize:13 }}>
                  ✅ Password reset successfully. Please sign in.
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                  style={{ borderRadius:11, padding:'12px 16px', marginBottom:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
                  ⚠ {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button onClick={() => { window.location.href = '/auth/google/redirect'; }}
              style={{ width:'100%', padding:'12px', borderRadius:11, border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.04)', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:20, fontFamily:"ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif" }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)' }}/>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>or sign in with email</span>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)' }}/>
            </div>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:8 }}>Email Address</label>
                <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                  placeholder="you@email.com" style={inp('email')}/>
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <label style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)' }}>Password</label>
                  <Link to="/forgot-password" style={{ fontSize:12, color:'rgba(2,195,154,0.7)', textDecoration:'none', fontWeight:500 }}
                    onMouseEnter={e => e.currentTarget.style.color=TEAL} onMouseLeave={e => e.currentTarget.style.color='rgba(2,195,154,0.7)'}>
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position:'relative' }}>
                  <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={e => set('password', e.target.value)}
                    onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
                    placeholder="••••••••" style={{ ...inp('pw'), paddingRight:52 }}/>
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(255,255,255,0.3)', fontSize:12, cursor:'pointer', fontFamily:"ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif" }}>
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <motion.button type="submit" disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01, y: loading ? 0 : -1 }} whileTap={{ scale:.98 }}
                style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', color:'#000', fontWeight:700, fontSize:14, cursor: loading ? 'not-allowed' : 'pointer', background: loading ? 'rgba(2,195,154,0.5)' : `linear-gradient(135deg,${TEAL},#028090)`, boxShadow: loading ? 'none' : '0 4px 20px rgba(2,195,154,0.3)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: loading ? .7 : 1, transition:'all .2s', fontFamily:"ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif" }}>
                {loading
                  ? <><svg style={{ animation:'spin .8s linear infinite', width:16, height:16 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>Signing in…</>
                  : 'Sign In →'}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    </>
  );
}