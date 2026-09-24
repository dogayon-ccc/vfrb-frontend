// Shared chrome for all auth pages — was duplicated 4x (Login/Register/ForgotPassword/ResetPassword).
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import logo from '../assets/company-logo.jpg';

const FONT = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif";

export const authInput = (focusedKey, current, error) => ({
  width: '100%', padding: '13px 16px', borderRadius: 12, fontSize: 14,
  color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none', boxSizing: 'border-box',
  fontFamily: FONT, transition: 'all .18s',
  border: `1.5px solid ${error ? 'var(--danger)' : focusedKey === current ? 'var(--teal)' : 'var(--border)'}`,
  boxShadow: error ? '0 0 0 3px rgba(229,62,62,.10)' : focusedKey === current ? '0 0 0 3px rgba(2,128,144,.12)' : 'none',
});

export default function AuthShell({ title, subtitle, maxWidth = 400, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px 20px', background: 'var(--bg)', fontFamily: FONT }}>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;} ::placeholder{color:var(--text-faint);} body{background:var(--bg);}`}</style>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}
        style={{ width: '100%', maxWidth }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <Link to="/" aria-label="Back to home" style={{ marginBottom: 18, lineHeight: 0 }}>
            <img src={logo} alt="VFRB Enterprise" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover',
              boxShadow: '0 2px 12px rgba(2,128,144,.18), 0 0 0 3px rgba(2,128,144,.08)' }}/>
          </Link>
          <h1 style={{ fontFamily: 'var(--font)', fontWeight: 800, fontSize: 30, color: 'var(--ink)', marginBottom: 8 }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>{subtitle}</div>}
        </div>
        {children}
      </motion.div>
    </div>
  );
}
