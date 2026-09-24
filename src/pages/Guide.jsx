// src/pages/Guide.jsx
// VFRB Enterprise — Customer Guide
//
// Explains the ALREADY-BUILT, verified order workflow only. Nothing here
// describes a feature that isn't actually live. If a future feature is
// added, this page must be updated alongside it — don't get ahead of the
// real system.
import { motion } from 'framer-motion';
import MarketingNav from '../components/MarketingNav';
import Footer from '../components/Footer';

const T = { teal: 'var(--teal)', accent: 'var(--teal-2)', dark: 'var(--bg-surface)' };

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
    desc: 'Your order moves through VFRB\u2019s real 7-stage production line: Pattern → Segregation → Cutting → Sewing → QC → Pressing → Packing. Each stage only advances once the required quantity for that stage is complete.',
  },
  {
    n: '05',
    title: 'Track progress anytime',
    desc: 'Open My Orders to see exactly which stage your order is on, in real time — no need to call or visit to ask.',
  },
  {
    n: '06',
    title: 'Payment & delivery',
    desc: 'Payment terms follow your order type — VFRB staff will confirm the exact terms that apply to your order. Once production and payment are complete, your order is scheduled for delivery.',
  },
];

export default function Guide() {
  return (
    <div style={{ fontFamily: 'var(--font)', background: T.dark, color: 'var(--ink)', minHeight: '100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        body{margin:0;background:${T.dark};}
        .gd-wrap { padding:48px 18px 32px; }
        .gd-step { gap:14px; padding:20px 0; }
        .gd-badge { width:38px; height:38px; font-size:13px; }
        @media (min-width:640px) {
          .gd-wrap { padding:64px 24px 40px; }
          .gd-step { gap:20px; padding:24px 0; }
          .gd-badge { width:44px; height:44px; font-size:14px; }
        }
      `}</style>

      <MarketingNav/>

      <div className="gd-wrap" style={{ maxWidth: 800, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p style={{ color: T.accent, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Customer Guide
          </p>
          <h1 style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, marginBottom: 14, lineHeight: 1.15 }}>
            How ordering works, start to finish
          </h1>
          <p style={{ color: 'rgba(15,23,42,0.5)', fontSize: 15, lineHeight: 1.7, maxWidth: 600 }}>
            This walks through the real order flow used in the VFRB Enterprise portal, exactly as it works today.
          </p>
        </motion.div>

        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {STEPS.map((s, i) => (
            <motion.div key={s.n}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="gd-step"
              style={{
                display: 'flex',
                borderBottom: i < STEPS.length - 1 ? '1px solid rgba(15,23,42,0.07)' : 'none',
              }}>
              <div className="gd-badge" style={{
                flexShrink: 0, borderRadius: 12,
                background: 'rgba(2,195,154,0.1)', border: '1px solid rgba(2,195,154,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.accent, fontWeight: 700, fontFamily: 'monospace',
              }}>
                {s.n}
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{s.title}</h3>
                <p style={{ color: 'rgba(15,23,42,0.5)', fontSize: 14, lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{
          marginTop: 48, padding: '20px 24px', borderRadius: 14,
          background: 'rgba(2,195,154,0.06)', border: '1px solid rgba(2,195,154,0.2)',
        }}>
          <p style={{ fontSize: 13, color: 'rgba(15,23,42,0.55)', lineHeight: 1.7 }}>
            Questions about a specific order? Use <strong style={{ color: 'var(--ink)' }}>Messages</strong> in your portal to reach
            VFRB staff directly, or check the <a href="/faq" style={{ color: T.accent }}>FAQ</a> for common questions.
          </p>
        </div>
      </div>

      <Footer light/>
    </div>
  );
}
