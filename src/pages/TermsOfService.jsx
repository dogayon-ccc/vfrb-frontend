// src/pages/TermsOfService.jsx — Terms of Service, grounded in the Ma'am Fe interview + locked system rules.
import { motion } from 'framer-motion';
import MarketingNav from '../components/MarketingNav';
import Footer from '../components/Footer';

const T = { teal: 'var(--teal)', accent: 'var(--teal-2)', dark: 'var(--bg-surface)' };

const SECTIONS = [
  {
    title: '1. Bulk orders only',
    body: `VFRB Enterprise accepts bulk garment orders only. The minimum
    order quantity is 100 pieces per order. Individual or single-piece
    orders are not accepted.`,
  },
  {
    title: '2. Order specifications and production',
    body: `Once you submit an order, VFRB will produce your garment to
    the exact specifications you provided (garment type, size breakdown,
    color, collar/sleeve/pocket style, and design). Because production
    is made to your specific order, orders cannot be returned once
    accepted into production — you will be responsible for payment in
    full for the order as specified.`,
  },
  {
    title: '3. Quality control',
    body: `Every order goes through VFRB's internal quality control
    process before delivery, to confirm the finished garment meets the
    specifications you provided.`,
  },
  {
    title: '4. Delivery timelines',
    body: `VFRB will coordinate your delivery date with you directly.
    In the rare case of a delay, VFRB's typical maximum delay is two
    days, and any delay will be communicated to you in advance. If a
    delay is not acceptable to you, VFRB may arrange overtime production
    to meet the original delivery date where possible. Delivery delays
    do not entitle you to a discount on the order total.`,
  },
  {
    title: '5. Payment terms',
    body: `Payment terms depend on your order type and will be confirmed
    with you by VFRB staff at the time of order confirmation. Payment is
    required in full for the agreed order total.`,
  },
  {
    title: '6. AI material recommendations',
    body: `The material-type recommendations shown for your order are
    generated to assist VFRB's production planning and are provided as
    a general guide to material categories — not a quotation, price
    estimate, or guarantee of final material selection. Final material
    sourcing decisions are made by VFRB's production team.`,
  },
  {
    title: '7. Account responsibilities',
    body: `You are responsible for providing accurate order
    specifications and contact information, and for keeping your account
    password confidential. VFRB staff and manager accounts are created
    only by an existing VFRB manager — there is no public registration
    path for staff accounts.`,
  },
  {
    title: '8. Changes to these terms',
    body: `If these terms change, the updated version will be posted on
    this page with a revised date below.`,
  },
];

export default function TermsOfService() {
  return (
    <div style={{ fontFamily: 'var(--font)', background: T.dark, color: 'var(--ink)', minHeight: '100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;} body{margin:0;background:${T.dark};}
        .tos-wrap { padding:48px 18px 32px; }
        @media (min-width:640px) { .tos-wrap { padding:64px 24px 40px; } }
      `}</style>

      <MarketingNav/>

      <div className="tos-wrap" style={{ maxWidth: 800, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p style={{ color: T.accent, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Legal
          </p>
          <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'clamp(28px,4vw,42px)', margin: '0 0 8px' }}>
            Terms of Service
          </h1>
          <p style={{ color: 'rgba(15,23,42,0.5)', fontSize: 13, margin: '0 0 40px' }}>
            Last updated: August 28, 2026
          </p>

          {SECTIONS.map((s, i) => (
            <div key={i} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{s.title}</h2>
              <p style={{ color: 'rgba(15,23,42,0.75)', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {s.body}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      <Footer light/>
    </div>
  );
}
