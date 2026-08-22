// src/pages/Guide.jsx
// VFRB Enterprise — Customer Guide
//
// Explains the ALREADY-BUILT, verified order workflow only. Nothing here
// describes a feature that isn't actually live. If a future feature is
// added, this page must be updated alongside it — don't get ahead of the
// real system.
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/company-logo.jpg';
import Footer from '../components/Footer';

const T = { teal: '#028090', accent: '#02C39A', dark: '#06101a' };

const STEPS = [
  {
    n: '01',
    title: 'Create your design',
    desc: "Use the Design Studio to configure your garment — collar, sleeve, color, pockets, and logo, front and back — or place a manual order without the studio if you already know your specs.",
  },
  {
    n: '02',
    title: 'AI reviews your materials',
    desc: 'Gemini AI looks at your garment type, quantity, and specs and recommends the categories of raw materials your order will need (fabric, trims, thread, accessories). You can review this on the AI Materials page before your order is finalized.',
  },
  {
    n: '03',
    title: 'Accept & notify VFRB staff',
    desc: 'Once you\u2019re happy with the recommendation, accept it. This notifies VFRB\u2019s production team to prepare the exact materials for your order.',
  },
  {
    n: '04',
    title: 'Order enters production',
    desc: 'Your order moves through VFRB\u2019s real 7-stage production line: Pattern \u2192 Segregation \u2192 Cutting \u2192 Sewing \u2192 QC \u2192 Pressing \u2192 Packing. Each stage only advances once the required quantity for that stage is complete.',
  },
  {
    n: '05',
    title: 'Track progress anytime',
    desc: 'Open My Orders to see exactly which stage your order is on, in real time \u2014 no need to call or visit to ask.',
  },
  {
    n: '06',
    title: 'Payment & delivery',
    desc: 'Payment terms follow your order type \u2014 VFRB staff will confirm the exact terms that apply to your order. Once production and payment are complete, your order is scheduled for delivery.',
  },
];

function Header() {
  const navigate = useNavigate();
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(6,16,26,0.97)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{
        maxWidth: 1000, margin: '0 auto', padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <button onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}>
          <img src={logo} alt="VFRB" style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'cover', border: '2px solid rgba(2,195,154,0.35)' }}/>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: "Georgia,'Times New Roman',serif" }}>VFRB Enterprise</span>
        </button>
        <button onClick={() => navigate('/')}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, padding: '8px 16px',
            borderRadius: 9, cursor: 'pointer', fontFamily: 'var(--font)' }}>
          ← Back to Home
        </button>
      </div>
    </div>
  );
}

export default function Guide() {
  return (
    <div style={{ fontFamily: 'var(--font)', background: T.dark, color: '#fff', minHeight: '100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        body{margin:0;background:${T.dark};}
      `}</style>

      <Header/>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 24px 40px' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p style={{ color: T.accent, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Customer Guide
          </p>
          <h1 style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, marginBottom: 14, lineHeight: 1.15 }}>
            How ordering works, start to finish
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.7, maxWidth: 600 }}>
            This walks through the real order flow used in the VFRB Enterprise portal, exactly as it works today.
          </p>
        </motion.div>

        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {STEPS.map((s, i) => (
            <motion.div key={s.n}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              style={{
                display: 'flex', gap: 20, padding: '24px 0',
                borderBottom: i < STEPS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}>
              <div style={{
                flexShrink: 0, width: 44, height: 44, borderRadius: 12,
                background: 'rgba(2,195,154,0.1)', border: '1px solid rgba(2,195,154,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.accent, fontWeight: 700, fontSize: 14, fontFamily: 'monospace',
              }}>
                {s.n}
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{s.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{
          marginTop: 48, padding: '20px 24px', borderRadius: 14,
          background: 'rgba(2,195,154,0.06)', border: '1px solid rgba(2,195,154,0.2)',
        }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
            Questions about a specific order? Use <strong style={{ color: '#fff' }}>Messages</strong> in your portal to reach
            VFRB staff directly, or check the <a href="/faq" style={{ color: T.accent }}>FAQ</a> for common questions.
          </p>
        </div>
      </div>

      <Footer/>
    </div>
  );
}
