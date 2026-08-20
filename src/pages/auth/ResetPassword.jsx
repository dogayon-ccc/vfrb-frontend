// src/pages/auth/ResetPassword.jsx
// VFRB Enterprise — Reset Password (token from email link)
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import logo from '../../assets/company-logo.jpg';

const TEAL = '#02C39A';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params]  = useSearchParams();
  const [form,    setForm]    = useState({ token:'', email:'', password:'', password_confirmation:'' });
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    // Token and email come from query params in the email link
    const token = params.get('token') ?? '';
    const email = params.get('email') ?? '';
    setForm(f => ({ ...f, token, email }));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) {
      setError("Passwords don't match.");
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true); setError('');
    try {
      await axios.post('/api/password/reset', form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width:'100%', padding:'11px 14px', borderRadius:10,
    border:'1px solid rgba(255,255,255,0.1)',
    background:'rgba(255,255,255,0.05)', color:'#fff',
    fontSize:14, outline:'none', fontFamily:"'DM Sans',sans-serif",
  };

  return (
    <div style={{ minHeight:'100vh', background:'#06101a', display:'flex',
      alignItems:'center', justifyContent:'center', padding:'20px',
      fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}::placeholder{color:rgba(255,255,255,0.2);}`}</style>

      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <img src={logo} alt="VFRB" style={{ width:48, height:48, borderRadius:12,
            objectFit:'cover', border:`2px solid rgba(2,195,154,0.35)`, marginBottom:12 }}/>
          <h1 style={{ color:'#fff', fontSize:22, fontWeight:700 }}>Set New Password</h1>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, marginTop:4 }}>VFRB Enterprise</p>
        </div>

        <div style={{ background:'rgba(255,255,255,0.04)',
          border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:28 }}>
          {done ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:44, marginBottom:16 }}>🎉</div>
              <h2 style={{ color:TEAL, fontSize:18, fontWeight:700, marginBottom:8 }}>Password Updated!</h2>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:14, marginBottom:20 }}>
                Your password has been reset. Please log in with your new password.
              </p>
              <button onClick={() => navigate('/login')}
                style={{ padding:'12px 24px', borderRadius:10, border:'none',
                  background:`linear-gradient(135deg,#028090,${TEAL})`,
                  color:'#fff', fontSize:14, fontWeight:600,
                  cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              {error && (
                <div style={{ background:'rgba(239,68,68,0.1)',
                  border:'1px solid rgba(239,68,68,0.3)',
                  borderRadius:9, padding:'10px 14px', marginBottom:16,
                  color:'#fca5a5', fontSize:13 }}>
                  {error}
                </div>
              )}

              {[
                ['Email', 'email', 'email', 'your@email.com'],
                ['New Password', 'password', 'password', 'Min. 8 characters'],
                ['Confirm Password', 'password_confirmation', 'password', 'Repeat new password'],
              ].map(([label, key, type, ph]) => (
                <label key={key} style={{ display:'block', marginBottom:14 }}>
                  <span style={{ color:'rgba(255,255,255,0.55)', fontSize:12,
                    fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em',
                    display:'block', marginBottom:6 }}>{label}</span>
                  <input type={type} value={form[key]} placeholder={ph}
                    onChange={e => set(key, e.target.value)} required
                    style={inp}
                    onFocus={e => e.target.style.borderColor=TEAL}
                    onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
                </label>
              ))}

              <motion.button type="submit" disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale:.97 }}
                style={{ width:'100%', padding:'13px', borderRadius:11, border:'none',
                  background: loading ? 'rgba(2,195,154,0.4)' : `linear-gradient(135deg,#028090,${TEAL})`,
                  color:'#fff', fontSize:14, fontWeight:700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily:"'DM Sans',sans-serif" }}>
                {loading ? 'Updating…' : 'Update Password'}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}