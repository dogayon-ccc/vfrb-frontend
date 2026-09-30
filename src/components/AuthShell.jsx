// Shared chrome for all auth pages — was duplicated 4x (Login/Register/ForgotPassword/ResetPassword).
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import logo from '../assets/company-logo.jpg';
import { NavIcon } from './ui/icons';

const FONT = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif";

export const authInput = (focusedKey, current, error) => ({
  width: '100%', padding: '13px 16px', borderRadius: 12, fontSize: 14,
  color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none', boxSizing: 'border-box',
  fontFamily: FONT, transition: 'all .18s',
  border: `1.5px solid ${error ? 'var(--danger)' : focusedKey === current ? 'var(--teal)' : 'var(--border)'}`,
  boxShadow: error ? '0 0 0 3px rgba(229,62,62,.10)' : focusedKey === current ? '0 0 0 3px rgba(2,128,144,.12)' : 'none',
});

const POINTS = [
  { icon: 'designStudio', t: 'Design', d: 'Build your uniform visually in the Studio' },
  { icon: 'checklist',    t: 'Order',  d: 'Bulk quantities, sizes and delivery in four steps' },
  { icon: 'messages',     t: 'Track',  d: 'Follow production and message VFRB staff' },
];

const CSS = `
.au{position:relative;min-height:100vh;display:grid;grid-template-columns:minmax(0,1fr);background:linear-gradient(160deg,#ecfeff 0%,#f0fdfa 45%,#f8fafc 100%);font-family:${FONT};overflow:hidden}
.au *,.au *::before,.au *::after{box-sizing:border-box}
.au ::placeholder{color:var(--text-faint)}
.au-blob{position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none;will-change:transform}
.au>.au-b1{width:420px;height:420px;background:#02c39a;top:-120px;right:-80px;opacity:.5;animation:au-b1 16s ease-in-out infinite alternate}
.au>.au-b2{width:360px;height:360px;background:#028090;bottom:-140px;left:30%;opacity:.3;animation:au-b2 20s ease-in-out infinite alternate}
.au-art{position:relative;z-index:1;overflow:hidden;min-height:170px;background:linear-gradient(140deg,#014f5a 0%,#028090 55%,#02c39a 120%)}
.au-a1{width:300px;height:300px;background:#02c39a;top:-90px;right:-60px;opacity:.5;filter:blur(48px);animation:au-b1 14s ease-in-out infinite alternate}
.au-a2{width:260px;height:260px;background:#7dd3fc;bottom:-100px;left:-60px;opacity:.28;filter:blur(48px);animation:au-b2 18s ease-in-out infinite alternate}
.au-stitch{position:absolute;inset:0;width:100%;height:100%;opacity:.45}
.au-stitch path{fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-dasharray:6 12;animation:au-dash 14s linear infinite}
.au-art-in{position:relative;z-index:1;height:100%;display:flex;flex-direction:column;justify-content:center;gap:18px;padding:28px 24px;color:#fff}
.au-art h2{font-size:clamp(22px,3.4vw,38px);font-weight:800;line-height:1.15;margin:0;max-width:16ch}
.au-pts{display:none;flex-direction:column;gap:12px;margin:0;padding:0;list-style:none}
.au-pt{display:flex;gap:12px;align-items:center;padding:14px 16px;border-radius:16px;background:rgba(255,255,255,.12);backdrop-filter:blur(14px) saturate(140%);-webkit-backdrop-filter:blur(14px) saturate(140%);border:1px solid rgba(255,255,255,.28);box-shadow:0 8px 28px rgba(1,79,90,.25),inset 0 1px 0 rgba(255,255,255,.35);max-width:360px;animation:au-float 6s ease-in-out infinite}
.au-pt:nth-child(2){animation-delay:-2s;margin-left:24px}
.au-pt:nth-child(3){animation-delay:-4s}
.au-pt b{display:block;font-size:14px}
.au-pt small{font-size:12px;opacity:.88}
.au-form{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;padding:28px 20px 40px}
.au-card{width:100%;padding:28px 24px;border-radius:24px;background:rgba(255,255,255,.66);backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);border:1px solid rgba(255,255,255,.75);box-shadow:0 20px 60px rgba(2,128,144,.14),inset 0 1px 0 #fff}
.au-card button[type=submit]{position:relative;overflow:hidden}
.au-card button[type=submit]::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.28) 50%,transparent 70%);transform:translateX(-120%);transition:transform .6s ease}
.au-card button[type=submit]:hover::after{transform:translateX(120%)}
.au-art::before{content:"";position:absolute;inset:0;z-index:0;background-image:radial-gradient(rgba(255,255,255,.22) 1.2px,transparent 1.2px);background-size:26px 26px;mask-image:radial-gradient(ellipse at 60% 50%,#000 20%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse at 60% 50%,#000 20%,transparent 75%)}
.au-mock{display:none;position:absolute;z-index:1;right:9%;top:50%;width:270px;transform:translateY(-50%);animation:au-float 7s ease-in-out infinite}
.au-canvas{position:relative;padding:26px;border-radius:24px;background:rgba(255,255,255,.14);backdrop-filter:blur(16px) saturate(150%);-webkit-backdrop-filter:blur(16px) saturate(150%);border:1px solid rgba(255,255,255,.32);box-shadow:0 24px 60px rgba(1,47,56,.35),inset 0 1px 0 rgba(255,255,255,.4)}
.au-sel{position:absolute;inset:14px;pointer-events:none;background:linear-gradient(90deg,#fff 50%,transparent 0) 0 0/12px 1.5px repeat-x,linear-gradient(90deg,#fff 50%,transparent 0) 0 100%/12px 1.5px repeat-x,linear-gradient(0deg,#fff 50%,transparent 0) 0 0/1.5px 12px repeat-y,linear-gradient(0deg,#fff 50%,transparent 0) 100% 0/1.5px 12px repeat-y;animation:au-ants .9s linear infinite}
.au-h{position:absolute;width:9px;height:9px;background:#fff;border:1.5px solid #02c39a;border-radius:2px}
.au-h:nth-child(1){top:-5px;left:-5px}.au-h:nth-child(2){top:-5px;right:-5px}.au-h:nth-child(3){bottom:-5px;left:-5px}.au-h:nth-child(4){bottom:-5px;right:-5px}
.au-shirt{display:block;width:100%;height:auto;filter:drop-shadow(0 10px 18px rgba(0,0,0,.28))}
.au-shirt .body{animation:au-fill 12s ease-in-out infinite}
.au-sw{display:flex;justify-content:center;gap:10px;margin-top:16px}
.au-sw i{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.7);animation:au-ring 12s ease-in-out infinite}
.au-sw i:nth-child(1){background:#1e3a5f}.au-sw i:nth-child(2){background:#028090;animation-delay:-9s}.au-sw i:nth-child(3){background:#7f1d1d;animation-delay:-6s}.au-sw i:nth-child(4){background:#166534;animation-delay:-3s}
.au-tag{position:absolute;left:-28px;bottom:-18px;padding:8px 14px;border-radius:999px;background:#fff;color:#014f5a;font:700 12px/1 ui-sans-serif,system-ui,sans-serif;box-shadow:0 10px 26px rgba(1,47,56,.3);display:flex;gap:6px;align-items:center}
@media(min-width:1200px){.au-mock{display:block}}
@keyframes au-fill{0%,20%{fill:#1e3a5f}25%,45%{fill:#028090}50%,70%{fill:#7f1d1d}75%,95%{fill:#166534}100%{fill:#1e3a5f}}
@keyframes au-ring{0%,20%{transform:scale(1.25);border-color:#fff}25%,100%{transform:scale(1);border-color:rgba(255,255,255,.7)}}
@keyframes au-ants{to{background-position:12px 0,-12px 100%,0 12px,100% -12px}}
@media(prefers-reduced-motion:reduce){.au-mock,.au-shirt .body,.au-sw i,.au-sel{animation:none}}
@media(min-width:900px){
  .au{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr)}
  .au-art{min-height:100vh}
  .au-art-in{padding:56px}
  .au-pts{display:flex}
  .au-form{padding:48px}
  .au-card{padding:36px 32px}
}
@keyframes au-b1{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(-60px,50px,0) scale(1.15)}}
@keyframes au-b2{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(70px,-40px,0) scale(1.1)}}
@keyframes au-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes au-dash{to{stroke-dashoffset:-360}}
@media(prefers-reduced-motion:reduce){.au-blob,.au-pt,.au-stitch path{animation:none}.au-card button[type=submit]::after{display:none}}
`;

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: .32, ease: 'easeOut' } } };

export default function AuthShell({ title, subtitle, maxWidth = 400, children }) {
  return (
    <div className="au">
      <style>{CSS}</style>
      <div className="au-blob au-b1" aria-hidden="true"/><div className="au-blob au-b2" aria-hidden="true"/>
      <aside className="au-art" aria-hidden="true">
        <div className="au-blob au-a1"/><div className="au-blob au-a2"/>
        <svg className="au-stitch" viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice"><path d="M-20 700 C 150 560, 260 820, 420 640 S 600 420, 640 500"/><path d="M-20 250 C 120 120, 300 340, 460 180 S 600 60, 640 120" style={{ animationDuration: '20s' }}/></svg>
        <div className="au-art-in">
          <motion.h2 initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .45 }}>
            Custom uniforms, made smarter.
          </motion.h2>
          <ul className="au-pts">
            {POINTS.map((p, i) => (
              <motion.li key={p.t} className="au-pt" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: .25 + i * .12, duration: .35 }}>
                <NavIcon name={p.icon} size={20} color="#fff"/>
                <span><b>{p.t}</b><small>{p.d}</small></span>
              </motion.li>
            ))}
          </ul>
        </div>
        <div className="au-mock">
          <div className="au-canvas">
            <span className="au-sel"><b className="au-h"/><b className="au-h"/><b className="au-h"/><b className="au-h"/></span>
            <svg className="au-shirt" viewBox="0 0 200 190">
              <path className="body" d="M62 22 L86 12 Q100 30 114 12 L138 22 L184 56 L162 92 L142 80 L142 178 L58 178 L58 80 L38 92 L16 56 Z"/>
              <path d="M16 56 L38 92 L58 80 L62 22 Z M184 56 L162 92 L142 80 L138 22 Z" fill="rgba(0,0,0,.14)"/>
              <path d="M86 12 Q100 30 114 12 L108 8 Q100 20 92 8 Z" fill="rgba(255,255,255,.85)"/>
              <rect x="112" y="52" width="16" height="16" rx="2" fill="#d4b06a"/>
            </svg>
            <div className="au-sw"><i/><i/><i/><i/></div>
            <span className="au-tag"><NavIcon name="designStudio" size={14} color="#014f5a"/> Live preview</span>
          </div>
        </div>
      </aside>

      <main className="au-form">
        <motion.div className="au-card" style={{ maxWidth }} initial="hidden" animate="show"
          variants={{ show: { transition: { staggerChildren: .07 } } }}>
          <motion.div variants={item} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
            <Link to="/" aria-label="Back to home" style={{ marginBottom: 16, lineHeight: 0 }}>
              <img src={logo} alt="VFRB Enterprise" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover',
                boxShadow: '0 2px 12px rgba(2,128,144,.18), 0 0 0 3px rgba(2,128,144,.08)' }}/>
            </Link>
            <h1 style={{ fontFamily: 'var(--font)', fontWeight: 800, fontSize: 30, color: 'var(--ink)', margin: '0 0 8px' }}>{title}</h1>
            {subtitle && <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>{subtitle}</div>}
          </motion.div>
          <motion.div variants={item}>{children}</motion.div>
        </motion.div>
      </main>
    </div>
  );
}
