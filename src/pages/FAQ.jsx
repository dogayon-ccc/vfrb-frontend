// Public FAQ. Only workflow answers that match the live system; business-policy answers
// (pricing, minimum order, lead time, payment, cancellation) are NOT invented here, visitors are sent to VFRB contact details.
import { useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import SitePage from '../components/site/SitePage';
import { Btn } from '../components/site/parts';
import Reveal from '../components/landing/Reveal';
import { CONTACT as C } from '../components/site/config';

const FAQS = [
  { q: 'How do I place an order?',
    a: 'Sign in to your client account and create your design in the Design Studio. Save it, then continue to the Order Wizard to enter quantity, sizes, and delivery details, and submit your order.' },
  { q: 'Do I need to create a design before ordering?',
    a: 'Yes. Orders start from a saved design, so VFRB receives your exact garment configuration. The Order Wizard then collects quantity, sizes, and delivery details without asking you to re-enter the design.' },
  { q: 'How does AI Material Recommendation work?',
    a: 'After you submit your order specs, Gemini AI reviews the garment type, quantity, and details, then recommends the categories of raw materials the order is expected to need, such as fabric, collar lining, buttons, thread, and labels. You review this on the AI Materials page and accept it, which notifies VFRB staff to prepare materials. Exact quantities for every material are confirmed by the VFRB production team.' },
  { q: 'How do I track my order\u2019s production status?',
    a: 'Open My Orders and select your order. You\u2019ll see which of the 7 production stages it\u2019s currently on, updated by VFRB staff.' },
  { q: 'What are the 7 production stages?',
    a: 'Pattern, Segregation, Cutting, Sewing, QC, Pressing, Packing. An order only moves to the next stage once the required quantity for the current stage is finished.' },
  { q: 'How will I know when my order moves to the next stage?',
    a: 'Your order status updates in My Orders as VFRB staff log progress on the floor. Check back anytime to see where it stands.' },
  { q: 'Can I message VFRB staff about my order?',
    a: 'Yes. Use Messages in your client portal to reach VFRB staff directly about a specific order.' },
  { q: 'I signed up with Google. Is my account different from an email account?',
    a: 'No. Clients can self-register with either email or Google, and both create the same type of client account with the same access.' },
];

function Item({ item, open, onToggle, onKey, btnRef, reduce }) {
  const id = useId();
  return (
    <div className="vs-acc__item">
      <h3 className="vs-acc__q">
        <button type="button" ref={btnRef} className="vs-acc__btn" id={`${id}-b`} aria-expanded={open} aria-controls={`${id}-p`}
          onClick={onToggle} onKeyDown={onKey}>
          <span>{item.q}</span><span className="vs-acc__icon" aria-hidden="true" />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="p" id={`${id}-p`} role="region" aria-labelledby={`${id}-b`} className="vs-acc__panel"
            initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: [0.2, 0.7, 0.2, 1] }} style={{ overflow: 'hidden' }}>
            <p>{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState(0);
  const refs = useRef([]);
  const reduce = useReducedMotion();

  const onKey = (i) => (e) => {
    const last = FAQS.length - 1;
    const to = e.key === 'ArrowDown' ? (i === last ? 0 : i + 1) : e.key === 'ArrowUp' ? (i === 0 ? last : i - 1)
      : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
    if (to === null) return;
    e.preventDefault();
    refs.current[to]?.focus();
  };

  return (
    <SitePage title="FAQ">
      <header className="vs-pagehead">
        <div className="vs-wrap">
          <p className="vs-kicker">FAQ</p>
          <h1 className="vs-h1" style={{ maxWidth: '18ch' }}>Frequently asked questions</h1>
          <p className="vs-lede">How designing, ordering, and tracking work in the VFRB client portal.</p>
        </div>
      </header>

      <section className="vs-sec vs-sec--tight" aria-label="Questions and answers">
        <div className="vs-wrap vs-faqgrid">
          <Reveal className="vs-faqaside">
            <h2>Need something else?</h2>
            <p>For pricing, minimum order quantity, lead time, and payment terms, please contact VFRB directly.</p>
            <a className="vs-aside-link vs-link" href={C.phoneHref}>{C.phone}</a>
            <a className="vs-aside-link vs-link" href={`mailto:${C.email}`}>{C.email}</a>
            <Btn to="/guide" variant="line">Read the client guide</Btn>
          </Reveal>
          <div className="vs-acc">
            {FAQS.map((item, i) => (
              <Item key={item.q} item={item} open={openIdx === i} reduce={reduce}
                btnRef={(el) => { refs.current[i] = el; }} onKey={onKey(i)}
                onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} />
            ))}
          </div>
        </div>
      </section>
    </SitePage>
  );
}
