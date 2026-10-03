// Public client guide. Describes the order workflow that is live in the portal today; update together with
// ORDER_STEPS (components/site/content.js) and the FAQ whenever the real workflow changes.
import SitePage from '../components/site/SitePage';
import Photo from '../components/landing/Photo';
import Reveal from '../components/landing/Reveal';
import { Btn, CtaBand } from '../components/site/parts';
import { P } from './landing/photos';

const STEPS = [
  { title: 'Create your design',
    desc: 'Start from an inspiration design or a blank garment in the Design Studio. Set the collar, sleeve, color, pockets, and logo, front and back, then save your design. When it\u2019s ready, continue to the Order Wizard to enter quantity, sizes, and delivery, then submit.',
    link: ['/register', 'Create an account'] },
  { title: 'AI reviews your materials',
    desc: 'Gemini AI looks at your garment type, quantity, and specs and recommends the categories of raw materials your order will need: fabric, trims, thread, accessories. You can review this on the AI Materials page before your order is finalized.' },
  { title: 'Accept and notify VFRB staff',
    desc: 'Once you\u2019re happy with the recommendation, accept it. This notifies the VFRB production team to prepare the exact materials for your order.' },
  { title: 'Your order enters production',
    desc: 'Your order moves through VFRB\u2019s 7-stage production line: Pattern, Segregation, Cutting, Sewing, QC, Pressing, Packing. Each stage only advances once the required quantity for that stage is complete.',
    link: ['/inside-vfrb', 'See the production floor'] },
  { title: 'Track progress anytime',
    desc: 'Open My Orders to see exactly which stage your order is on, with no need to call or visit to ask. Use Messages in your portal to reach VFRB staff about a specific order.' },
  { title: 'Payment and delivery',
    desc: 'Payment terms follow your order type, and VFRB staff will confirm the exact terms that apply to your order. Once production and payment are complete, your order is scheduled for delivery.' },
];

export default function Guide() {
  return (
    <SitePage title="Client Guide">
      <header className="vs-pagehead">
        <div className="vs-wrap">
          <p className="vs-kicker">Client guide</p>
          <h1 className="vs-h1" style={{ maxWidth: '20ch' }}>How ordering works, start to finish</h1>
          <p className="vs-lede">The order flow used in the VFRB Enterprise client portal, as it works today.</p>
        </div>
      </header>

      <section className="vs-sec vs-sec--tight" aria-label="Ordering steps">
        <div className="vs-wrap vs-guidegrid">
          <ol className="vs-guide">
            {STEPS.map((s) => (
              <li key={s.title}>
                <div>
                  <Reveal>
                    <h2>{s.title}</h2>
                    <p>{s.desc}</p>
                    {s.link && <div className="vs-btns"><Btn to={s.link[0]} variant="line">{s.link[1]}</Btn></div>}
                  </Reveal>
                </div>
              </li>
            ))}
          </ol>
          <aside className="vs-guideside" aria-label="Help">
            <Photo photo={P.packed} pos="center 40%" ratio="4 / 3" caption="Packed and labeled for delivery" />
            <div className="vs-card">
              <h2 className="vs-h3">Questions?</h2>
              <p>Use Messages in your portal to reach VFRB staff about a specific order, or check the FAQ for common questions.</p>
              <Btn to="/faq" variant="line">Open the FAQ</Btn>
            </div>
          </aside>
        </div>
      </section>

      <CtaBand photo={P.sewing2} pos="center" title="Ready to start your design?"
        lede="Create an account, open the Design Studio, and send your first brief to VFRB.">
        <Btn to="/register" variant="mint">Create an account</Btn>
        <Btn to="/login" variant="ghost-light">Log in</Btn>
      </CtaBand>
    </SitePage>
  );
}
