// Public FAQ. Workflow answers match the live portal; ordering facts come from ORDER_FAQS so Home and FAQ never drift.
import SitePage from '../components/site/SitePage';
import { Btn, TextLink, Accordion } from '../components/site/parts';
import Reveal from '../components/landing/Reveal';
import { ORDER_FAQS } from '../components/site/content';

const FAQS = [
  { q: 'How do I place an order?',
    a: 'Sign in to your customer account and create your design in the Design Studio. Save it, then continue to the Order Wizard to enter quantity, sizes, and delivery details, and submit your order.' },
  { q: 'Do I need to create a design before ordering?',
    a: 'Yes. Orders start from a saved design, so VFRB receives your exact garment configuration. The Order Wizard then collects quantity, sizes, and delivery details without asking you to re-enter the design.' },
  ...ORDER_FAQS,
  { q: 'How does AI Material Recommendation work?',
    a: 'After you submit your order specs, Gemini AI reviews the garment type, quantity, and details, then recommends the categories of raw materials the order is expected to need, such as fabric, collar lining, buttons, thread, and labels. You review this on the AI Materials page and accept it, which notifies the VFRB team to prepare materials. Exact quantities for every material are confirmed by the VFRB production team.' },
  { q: 'How do I track my order\u2019s status?',
    a: 'Open My Orders and select your order. You\u2019ll see whether it is Pending, Confirmed, Completed or Cancelled. Once VFRB schedules delivery, the delivery date and tracking appear on the same page.' },
  { q: 'Can I message the VFRB team about my order?',
    a: 'Yes. Use Messages in your customer portal to reach the VFRB team directly about a specific order.' },
  { q: 'How do I get a customer account?',
    a: 'VFRB creates customer accounts for you. Once yours is set up, sign in with your email and password, or with Google if it uses the same email.' },
];

export default function FAQ() {
  return (
    <SitePage title="FAQ">
      <header className="vs-pagehead">
        <div className="vs-wrap">
          <p className="vs-kicker">FAQ</p>
          <h1 className="vs-h1" style={{ maxWidth: '18ch' }}>Frequently asked questions</h1>
          <p className="vs-lede">How designing, ordering, and tracking work in the VFRB customer portal.</p>
        </div>
      </header>

      <section className="vs-sec vs-sec--tight" aria-label="Questions and answers">
        <div className="vs-wrap vs-faqgrid">
          <Reveal className="vs-faqaside">
            <h2>Need something else?</h2>
            <p>VFRB prices each order individually. For anything not covered here, contact VFRB.</p>
            <TextLink to="/about#contact">Contact details</TextLink>
            <Btn to="/guide" variant="line">Read the customer guide</Btn>
          </Reveal>
          <Accordion items={FAQS} />
        </div>
      </section>
    </SitePage>
  );
}
