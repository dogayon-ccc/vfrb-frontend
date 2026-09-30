import { Link } from 'react-router-dom';
import Photo from '../components/landing/Photo';
import Reveal from '../components/landing/Reveal';
import SitePage from '../components/site/SitePage';
import { Btn, Head, TextLink, CtaBand } from '../components/site/parts';
import { P } from './landing/photos';

const FACTS = [
  ['Since 2000', 'Family-owned garment industry'],
  ['Bayanan, Muntinlupa', 'Head office'],
  ['Sto. Tomas, Batangas', 'Production'],
  ['Offices and schools', 'Corporate and institutional clients'],
];

const SERVICES = [
  { to: '/what-we-do', photo: P.uniforms, pos: '30% center', title: 'Company uniforms',
    text: 'Custom tailoring and garment manufacturing for polo shirts, campaign shirts, caps and jackets, made to order.' },
  { to: '/what-we-do#embroidery', photo: P.embroidery, pos: 'center', title: 'Computerized embroidery',
    text: 'Logos, emblems and patches stitched by computerized embroidery machines.' },
  { to: '/what-we-do#printing', photo: P.printing, pos: '35% center', title: 'Printing and sublimation',
    text: 'Silk screen printing and full sublimation for shirts, polos and jerseys.' },
];

const EMBROIDERY = [
  ['Digitizing', 'Your logo or artwork is converted into a stitch file the machine can read.'],
  ['Hooping', 'The garment or patch fabric is secured in a hoop so it stays flat while it is stitched.'],
  ['Stitching', 'The computerized machine stitches the design onto the piece.'],
];

const STEPS = [
  ['Choose a garment', 'Start from polo, scrubs, pants, skirt or shorts.'],
  ['Set the details', 'Pick collar, sleeve, colors and pockets, and place your logo in the Design Studio.'],
  ['Review the materials', 'The system suggests the types of raw materials your order needs. VFRB staff confirm the exact quantities.'],
  ['Send it to VFRB', 'Your design and specifications go straight to the production team. No cart, no payment form.'],
];

export default function Landing() {
  return (
    <SitePage title="Company uniforms made in Muntinlupa">
      <section className="vs-hero">
        <div className="vs-wrap">
          <div className="vs-hero__grid">
            <div className="vs-hero__copy">
              <h1 className="vs-h1">Company uniforms, made by one family since 2000.</h1>
              <p className="vs-lede">
                VFRB Enterprise, also known as Tailor Centre VFRB Manila, is a medium-scale, family-owned garment
                industry in Bayanan, Muntinlupa City, specialized in corporate and company uniforms.
              </p>
              <div className="vs-btns">
                <Btn to="/register">Design your uniform</Btn>
                <Btn to="/gallery" variant="line">See the work</Btn>
              </div>
            </div>
            <div className="vs-hero__media">
              <Photo photo={P.sewing4} instant hover={false} pos="18% center" className="vs-hero__main" ratio="auto" />
              <Photo photo={P.uniforms} instant hover={false} pos="28% center" className="vs-hero__inset" ratio="4 / 3" />
            </div>
          </div>
          <ul className="vs-facts" style={{ marginTop: 'clamp(28px,4vw,52px)' }}>
            {FACTS.map(([b, s]) => <li key={b}><b>{b}</b><span>{s}</span></li>)}
          </ul>
        </div>
      </section>

      <section className="vs-sec" aria-labelledby="svc">
        <div className="vs-wrap">
          <Head kicker="What we do" id="svc" title="Tailoring, embroidery and printing under one company."
            lede="Made for local offices, corporate clients, schools and institutional organizations." />
          <Reveal className="vs-svc">
            {SERVICES.map(s => (
              <Link key={s.title} to={s.to}>
                <Photo photo={s.photo} pos={s.pos} ratio="auto" style={{ minHeight: 200 }} />
                <div className="vs-svc__body">
                  <h3 className="vs-h3">{s.title}</h3>
                  <p>{s.text}</p>
                  <span className="vs-svc__go">Read more</span>
                </div>
              </Link>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="vs-sec vs-dark" aria-labelledby="emb">
        <div className="vs-wrap vs-split vs-split--wide-media">
          <Reveal>
            <Photo photo={P.embroidery} ratio="4 / 3" pos="center" hover={false}
              caption="Computerized embroidery machines at VFRB" />
          </Reveal>
          <Reveal className="vs-stack" delay={0.08}>
            <p className="vs-kicker">Computerized embroidery</p>
            <h2 className="vs-h2" id="emb">Your logo, stitched on every piece.</h2>
            <p className="vs-lede">From digitizing to the final stitch, embroidery for corporate branding, apparel and fashion, and personalization.</p>
            <ol className="vs-steps">
              {EMBROIDERY.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}
            </ol>
            <TextLink to="/what-we-do#embroidery">See the embroidery details</TextLink>
          </Reveal>
        </div>
      </section>

      <section className="vs-sec" aria-labelledby="inside">
        <div className="vs-wrap vs-split">
          <Reveal className="vs-stack">
            <p className="vs-kicker">Inside VFRB</p>
            <h2 className="vs-h2" id="inside">Real people, real machines, one production floor.</h2>
            <p className="vs-body">
              Every uniform moves through pattern, cutting, sewing, quality checks, pressing and packing before it
              leaves for delivery. Take a look at the floor where it happens.
            </p>
            <TextLink to="/inside-vfrb">Tour the production floor</TextLink>
          </Reveal>
          <Reveal className="vs-mosaic" delay={0.06}>
            <Photo photo={P.workers} pos="center 30%" ratio="auto" caption="The VFRB production team" />
            <Photo photo={P.sewing1} ratio="4 / 3" />
            <Photo photo={P.sewing3} ratio="4 / 3" />
          </Reveal>
        </div>
      </section>

      <section className="vs-sec vs-tint" aria-labelledby="samples">
        <div className="vs-wrap">
          <Head kicker="Samples" id="samples" title="Finished pieces, packed for delivery." />
          <Reveal className="vs-strip">
            <Photo photo={P.tees} pos="center" caption="Screen-printed shirts" />
            <Photo photo={P.sublimationPolo} pos="30% center" caption="Full sublimation polo" />
            <Photo photo={P.uniforms} pos="30% center" caption="Embroidered emblems" />
            <Photo photo={P.packed} pos="center" caption="Packed and labeled" />
          </Reveal>
          <div style={{ marginTop: 20 }}><TextLink to="/gallery">Open the full gallery</TextLink></div>
        </div>
      </section>

      <section className="vs-sec" aria-labelledby="order">
        <div className="vs-wrap vs-split">
          <Reveal className="vs-stack">
            <p className="vs-kicker">Order online</p>
            <h2 className="vs-h2" id="order">Design it first, then send it to us.</h2>
            <p className="vs-body">
              Registered customers use the VFRB Design Studio to build a uniform and hand the full brief to our team.
              Registration is free.
            </p>
            <div className="vs-btns"><Btn to="/register">Create an account</Btn><Btn to="/guide" variant="line">Read the customer guide</Btn></div>
          </Reveal>
          <Reveal delay={0.06}>
            <ol className="vs-flow">
              {STEPS.map(([t, d], i) => <li key={t}><em>{i + 1}</em><h3>{t}</h3><p>{d}</p></li>)}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="vs-sec vs-tint" aria-labelledby="fam">
        <div className="vs-wrap vs-split">
          <Reveal className="vs-portrait-pair">
            <div><Photo photo={P.fe} pos="center 25%" /><b>Fe Tiama Boitizon</b><span>Owner, VFRB Enterprise</span></div>
            <div><Photo photo={P.roxanne} pos="center 25%" /><b>Roxanne Boitizon Baddiri</b><span>Daughter of Ma&#8217;am Fe</span></div>
          </Reveal>
          <Reveal className="vs-stack" delay={0.06}>
            <p className="vs-kicker">VFRB Family</p>
            <h2 className="vs-h2" id="fam">Family-run, from the first stitch to the last delivery.</h2>
            <p className="vs-body">VFRB Enterprise is a sole proprietorship led by Fe Tiama Boitizon. Meet the family and the team behind the company.</p>
            <TextLink to="/our-team">Meet the VFRB Family</TextLink>
          </Reveal>
        </div>
      </section>

      <CtaBand photo={P.sewing2} pos="center" title="Ready to put your name on a uniform?"
        lede="Create a free account, design your uniform, and send the brief to VFRB.">
        <Btn to="/register" variant="mint">Create a free account</Btn>
        <Btn to="/about" variant="ghost-light">Read our story</Btn>
      </CtaBand>
    </SitePage>
  );
}
