// src/pages/auth/ForgotPassword.jsx
// VFRB Enterprise — Forgot Password (sends email via Mailtrap)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import logo from '../../assets/company-logo.jpg';

const TEAL = '#02C39A';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true); setError('');
    try {
      await axios.post('/api/password/forgot', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#06101a', display:'flex',
      alignItems:'center', justifyContent:'center', padding:'20px',
      fontFamily:'var(--font)' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;}`}</style>

      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        style={{ width:'100%', maxWidth:400 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <img src={logo} alt="VFRB" style={{ width:48, height:48, borderRadius:12,
            objectFit:'cover', border:`2px solid rgba(2,195,154,0.35)`,
            marginBottom:12 }}/>
          <h1 style={{ color:'#fff', fontSize:22, fontWeight:700 }}>Reset Password</h1>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, marginTop:4 }}>
            VFRB Enterprise
          </p>
        </div>

        <div style={{ background:'rgba(255,255,255,0.04)',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:20, padding:28 }}>

          {sent ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:44, marginBottom:16 }}>📧</div>
              <h2 style={{ color:TEAL, fontSize:18, fontWeight:700, marginBottom:8 }}>
                Check your email!
              </h2>
              <p style={{ color:'rgba(255,255,255,0.55)', fontSize:14, lineHeight:1.7,
                marginBottom:20 }}>
                A password reset link has been sent to{' '}
                <strong style={{ color:'#fff' }}>{email}</strong>.
                Check your inbox in Mailtrap.
              </p>
              <p style={{ color:'rgba(255,255,255,0.35)', fontSize:12, marginBottom:20 }}>
                The link expires in 60 minutes.
              </p>
              <button onClick={() => navigate('/login')}
                style={{ padding:'12px 24px', borderRadius:10, border:'none',
                  background:`linear-gradient(135deg,#028090,${TEAL})`,
                  color:'#fff', fontSize:14, fontWeight:600,
                  cursor:'pointer', fontFamily:'var(--font)' }}>
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <p style={{ color:'rgba(255,255,255,0.55)', fontSize:13, lineHeight:1.7,
                marginBottom:20 }}>
                Enter your registered email address and we'll send you a password reset link.
              </p>

              {error && (
                <div style={{ background:'rgba(239,68,68,0.1)',
                  border:'1px solid rgba(239,68,68,0.3)',
                  borderRadius:9, padding:'10px 14px', marginBottom:16,
                  color:'#fca5a5', fontSize:13 }}>
                  {error}
                </div>
              )}

              <label style={{ display:'block', marginBottom:16 }}>
                <span style={{ color:'rgba(255,255,255,0.55)', fontSize:12,
                  fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em',
                  display:'block', marginBottom:6 }}>
                  Email Address
                </span>
                <input
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{ width:'100%', padding:'11px 14px', borderRadius:10,
                    border:'1px solid rgba(255,255,255,0.1)',
                    background:'rgba(255,255,255,0.05)', color:'#fff',
                    fontSize:14, outline:'none', fontFamily:'var(--font)' }}
                  onFocus={e => e.target.style.borderColor=TEAL}
                  onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
              </label>

              <motion.button type="submit" disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale:.97 }}
                style={{ width:'100%', padding:'13px', borderRadius:11, border:'none',
                  background: loading ? 'rgba(2,195,154,0.4)' : `linear-gradient(135deg,#028090,${TEAL})`,
                  color:'#fff', fontSize:14, fontWeight:700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily:'var(--font)', marginBottom:14 }}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </motion.button>

              <button type="button" onClick={() => navigate('/login')}
                style={{ width:'100%', padding:'11px', borderRadius:10,
                  background:'none', border:'1px solid rgba(255,255,255,0.1)',
                  color:'rgba(255,255,255,0.5)', fontSize:13, cursor:'pointer',
                  fontFamily:'var(--font)' }}>
                ← Back to Login
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}