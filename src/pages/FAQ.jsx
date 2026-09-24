// src/pages/FAQ.jsx
// VFRB Enterprise — FAQ
//
// SCOPE NOTE (do not remove): this page intentionally contains ONLY
// technical/workflow FAQs that are already confirmed-real in the system.
// It does NOT answer business-policy questions (pricing, minimum order
// quantity, turnaround/lead time, refund/cancellation policy) because no
// real VFRB business answer exists for those yet. Adding invented answers
// here would be worse than leaving them out — flagged to Dave for real
// input before publishing.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MarketingNav from '../components/MarketingNav';
import Footer from '../components/Footer';

const T = { teal: 'var(--teal)', accent: 'var(--teal-2)', dark: 'var(--bg-surface)' };

const FAQS = [
  {
    q: 'How do I place an order?',
    a: 'Sign in to your customer account, then either use the Design Studio to configure your garment visually, or go to New Order and submit your specifications directly. Both paths lead to the same order review and submission flow.',
  },
  {
    q: 'Do I have to use the Design Studio, or can I order without it?',
    a: 'The Design Studio is optional. You can place an order without it — New Order lets you enter garment type, sizes, quantity, and color directly.',
  },
  {
    q: 'How does AI Material Recommendation work?',
    a: 'After you submit your order specs, Gemini AI reviews the garment type, quantity, and details, then recommends the categories of raw materials the order is expected to need (for example: fabric, collar lining, buttons, thread, labels). You review this on the AI Materials page and accept it, which notifies VFRB staff to prepare materials. Exact quantities for every material are still confirmed by VFRB\u2019s production team.',
  },
  {
    q: 'Why do some materials show "not yet configured" on my AI recommendation?',
    a: 'VFRB is still finalizing exact usage rates for some materials (only fabric has a confirmed rate right now). Those items still appear so you know they\u2019re part of your order — the quantity will be confirmed by staff once the rate is set.',
  },
  {
    q: 'How do I track my order\u2019s production status?',
    a: 'Open My Orders and select your order. You\u2019ll see which of the 7 production stages it\u2019s currently on, updated in real time by VFRB staff.',
  },
  {
    q: 'What are the 7 production stages?',
    a: 'Pattern → Segregation → Cutting → Sewing → QC → Pressing → Packing. An order only moves to the next stage once the required quantity for the current stage is finished.',
  },
  {
    q: 'How will I know when my order moves to the next stage?',
    a: 'Your order status updates automatically in My Orders as VFRB staff log progress on the floor. Check back anytime — no need to call to ask.',
  },
  {
    q: 'Can I message VFRB staff about my order?',
    a: 'Yes. Use Messages in your customer portal to reach VFRB staff directly about a specific order.',
  },
  {
    q: 'I signed up with Google — is my account different from an email account?',
    a: 'No. Customers can self-register with either email or Google, and both create the same type of customer account with the same access.',
  },
  {
    q: 'Can suppliers log in to this system?',
    a: 'No. There is no supplier login or supplier portal. Suppliers are managed internally by VFRB staff as reference records only.',
  },
];

function FAQItem({ q, a, open, onToggle }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(15,23,42,0.07)' }}>
      <button onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, background: 'none', border: 'none', cursor: 'pointer', padding: '20px 0',
          textAlign: 'left', color: 'var(--ink)', fontFamily: 'var(--font)',
        }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{q}</span>
        <span style={{
          flexShrink: 0, color: T.accent, fontSize: 18, fontWeight: 300,
          transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s',
        }}>
          +
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <p style={{ color: 'rgba(15,23,42,0.5)', fontSize: 14, lineHeight: 1.7, paddingBottom: 20 }}>
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <div style={{ fontFamily: 'var(--font)', background: T.dark, color: 'var(--ink)', minHeight: '100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        body{margin:0;background:${T.dark};}
        .faq-wrap { padding:48px 18px 32px; }
        @media (min-width:640px) { .faq-wrap { padding:64px 24px 40px; } }
      `}</style>

      <MarketingNav/>

      <div className="faq-wrap" style={{ maxWidth: 760, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p style={{ color: T.accent, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            FAQ
          </p>
          <h1 style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, marginBottom: 14, lineHeight: 1.15 }}>
            Frequently asked questions
          </h1>
          <p style={{ color: 'rgba(15,23,42,0.5)', fontSize: 15, lineHeight: 1.7, maxWidth: 600 }}>
            Answers about how the ordering, design, and tracking system works.
          </p>
        </motion.div>

        <div style={{
          marginTop: 28, padding: '14px 18px', borderRadius: 12,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
        }}>
          <p style={{ fontSize: 13, color: 'rgba(15,23,42,0.6)', lineHeight: 1.6 }}>
            Note: questions about pricing, minimum order quantity, lead/turnaround time, and payment or
            cancellation policy aren\u2019t listed here yet — those need VFRB\u2019s confirmed business answers
            before publishing. Please contact VFRB Enterprise directly for those details in the meantime.
          </p>
        </div>

        <div style={{ marginTop: 24 }}>
          {FAQS.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}/>
          ))}
        </div>
      </div>

      <Footer light/>
    </div>
  );
}
