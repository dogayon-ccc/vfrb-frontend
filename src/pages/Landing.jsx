import Photo from '../components/landing/Photo';
import Reveal from '../components/landing/Reveal';
import SitePage from '../components/site/SitePage';
import { Btn, Head, TextLink, Accordion } from '../components/site/parts';
import { PRODUCTS, UNIFORM_TYPES, ORDER_FAQS } from '../components/site/content';
import { MIN_ORDER_QTY } from '../utils/orderQuantity';
import { P, GALLERY } from './landing/photos';

const STEPS = [
  ['Design', 'Create and save your uniform in the VFRB Design Studio.'],
  ['Order in bulk', `Open the Order Wizard from your saved design. Enter sizes, quantity (minimum ${MIN_ORDER_QTY} pieces) and the date you need it by.`],
  ['VFRB confirms and produces', 'VFRB reviews your order and date, then confirms it. Your uniforms move through the production floor, from pattern to packing.'],
  ['Delivery and invoice', 'Your uniforms are delivered, and the invoice and payment receipts are kept in your customer account.'],
];

const WORK = [P.embroidery, P.sublimationTee, P.printing, P.sublimationPolo, P.tees, P.sewing3, P.packed, P.ecobag]
  .map(photo => GALLERY.find(g => g.photo === photo));

export default function Landing() {
  return (
    <SitePage title="Company uniforms made in Muntinlupa">
      <section className="vs-hero">
        <div className="vs-wrap">
          <div className="vs-hero__grid">
            <div className="vs-hero__copy">
              <p className="vs-kicker" style={{ margin: 0 }}>VFRB Enterprise, Muntinlupa City</p>
              <h1 className="vs-h1">Company uniforms, made by <span className="vs-mark">one family</span> since 2000.</h1>
              <p className="vs-lede">
                VFRB Enterprise, also known as Tailor Centre VFRB Manila, is a medium-scale, family-owned garment
                industry specialized in corporate and company uniforms.
              </p>
              <div className="vs-btns"><Btn to="/login">Design your uniform</Btn></div>
            </div>
            <div className="vs-hero__media">
              <div className="vs-sticker" aria-hidden="true"><span>Since</span><b>2000</b></div>
              <Photo photo={P.sewing4} instant hover={false} pos="18% center" className="vs-hero__main" ratio="auto" sizes="(min-width: 900px) 50vw, 100vw" />
              <Photo photo={P.uniforms} instant hover={false} pos="28% center" className="vs-hero__inset" ratio="4 / 3" sizes="(min-width: 900px) 23vw, 46vw" />
            </div>
          </div>
        </div>
      </section>

      <section className="vs-sec vs-tint" aria-labelledby="how">
        <div className="vs-wrap vs-split vs-split--sticky">
          <Reveal className="vs-stack">
            <p className="vs-kicker">How it works</p>
            <h2 className="vs-h2" id="how">From your design to your door, in four steps.</h2>
            <TextLink to="/guide">Read the customer guide</TextLink>
          </Reveal>
          <Reveal delay={0.06}>
            <ol className="vs-flow">
              {STEPS.map(([t, d], i) => <li key={t}><em>{i + 1}</em><h3>{t}</h3><p>{d}</p></li>)}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="vs-sec" aria-labelledby="work">
        <div className="vs-wrap">
          <Head kicker="Our work" id="work" title="Made on our own floor, packed for delivery." />
          <Reveal className="vs-strip">
            {WORK.map(g => <Photo key={g.caption} photo={g.photo} pos={g.pos} caption={g.caption} ratio="3 / 4" sizes="(min-width: 900px) 25vw, 50vw" />)}
          </Reveal>
          <div style={{ marginTop: 20 }}><TextLink to="/gallery">Open the full gallery</TextLink></div>
        </div>
      </section>

      <section className="vs-sec vs-tint" aria-labelledby="types">
        <div className="vs-wrap">
          <Head kicker="Uniform types" id="types" title="Uniforms for every kind of team." />
          <Reveal as="ul" className="vs-types">
            {UNIFORM_TYPES.map(t => <li key={t}>{t}</li>)}
          </Reveal>
          <ul className="vs-serve" style={{ marginTop: 20 }} aria-label="Garments VFRB makes">
            {PRODUCTS.map(x => <li key={x}>{x}</li>)}
          </ul>
        </div>
      </section>

      <section className="vs-sec" aria-labelledby="faq">
        <div className="vs-wrap vs-faqgrid">
          <Reveal className="vs-stack">
            <p className="vs-kicker">FAQ</p>
            <h2 className="vs-h2" id="faq">Before you order</h2>
            <p className="vs-body">Not answered here? See the full FAQ or contact VFRB.</p>
            <div className="vs-btns">
              <TextLink to="/faq">More questions</TextLink>
              <TextLink to="/about#contact">Contact VFRB</TextLink>
            </div>
          </Reveal>
          <Accordion items={ORDER_FAQS} />
        </div>
      </section>
    </SitePage>
  );
}
