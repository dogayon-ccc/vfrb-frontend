import Photo from '../components/landing/Photo';
import Reveal from '../components/landing/Reveal';
import SitePage from '../components/site/SitePage';
import { Banner, Btn, Head, TextLink, CtaBand } from '../components/site/parts';
import { CONTACT as C } from '../components/site/config';
import { P } from './landing/photos';

const MAKE = ['Company uniforms', 'Polo shirts', 'Campaign shirts', 'Caps', 'Jackets', 'Patches'];
const SERVE = ['Local offices', 'Corporate clients', 'Schools', 'Institutional organizations'];
const EMB = [
  ['Digitizing', 'Your logo or artwork is converted into a stitch file the embroidery machine can read.'],
  ['Hooping', 'The fabric is secured in a hoop so it holds flat and steady during stitching.'],
  ['Stitching', 'The computerized machine stitches the digitized design onto the garment or patch.'],
];
const EMB_USES = ['Corporate branding', 'Apparel and fashion', 'Personalization'];
const JUMP = [['Uniforms', 'uniforms'], ['Embroidery', 'embroidery'], ['Printing', 'printing'], ['Print Authority', 'print-authority']];

export default function WhatWeDo() {
  return (
    <SitePage title="What We Do">
      <Banner kicker="What we do" title="Tailoring, embroidery and printing in one place."
        lede="Custom tailoring, garment manufacturing and finishing for offices, schools and institutions."
        photo={P.uniforms} pos="30% center">
        <nav className="vs-jump" aria-label="On this page" style={{ marginTop: 6 }}>
          {JUMP.map(([l, id]) => <a key={id} href={`#${id}`} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }}>{l}</a>)}
        </nav>
      </Banner>

      <section className="vs-sec vs-block" id="uniforms" aria-labelledby="u-t">
        <div className="vs-wrap vs-split">
          <Reveal className="vs-stack">
            <p className="vs-kicker">Tailoring and manufacturing</p>
            <h2 className="vs-h2" id="u-t">Company uniforms, cut and sewn to order.</h2>
            <p className="vs-body">
              VFRB handles custom tailoring, garment manufacturing and finishing in one company.
            </p>
            <ul className="vs-chips" aria-label="What we make">{MAKE.map(m => <li key={m}>{m}</li>)}</ul>
            <p className="vs-body" style={{ marginTop: 22 }}>Who we serve: {SERVE.join(', ').toLowerCase()}.</p>
            <TextLink to="/inside-vfrb">See how a uniform is made</TextLink>
          </Reveal>
          <Reveal delay={0.06}><Photo photo={P.sewing3} ratio="4 / 3" caption="Sewing stations at VFRB" /></Reveal>
        </div>
      </section>

      <section className="vs-sec vs-dark vs-block" id="embroidery" aria-labelledby="e-t">
        <div className="vs-wrap">
          <div className="vs-split vs-split--wide-media">
            <Reveal><Photo photo={P.embroidery} ratio="4 / 3" hover={false} caption="Rows of computerized embroidery machines" /></Reveal>
            <Reveal className="vs-stack" delay={0.06}>
              <p className="vs-kicker">Computerized embroidery</p>
              <h2 className="vs-h2" id="e-t">From artwork to the final stitch.</h2>
              <p className="vs-lede">
                VFRB runs computerized embroidery for company logos, emblems and patches. Every job follows the same three steps.
              </p>
              <ol className="vs-steps">
                {EMB.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}
              </ol>
            </Reveal>
          </div>
          <div className="vs-split" style={{ marginTop: 'clamp(36px,5vw,64px)' }}>
            <Reveal className="vs-stack">
              <h3 className="vs-h3">What embroidery is used for</h3>
              <ul className="vs-uses" aria-label="Embroidery uses">{EMB_USES.map(u => <li key={u}>{u}</li>)}</ul>
              <p className="vs-lede" style={{ fontSize: 16 }}>
                Corporate branding: your company logo on uniforms. Apparel and fashion: embroidered detail on garments.
                Personalization: names and marks on individual pieces.
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <Photo photo={P.uniforms} ratio="16 / 9" pos="30% center" caption="Embroidered emblem patches on a shirt and blazer" />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="vs-sec vs-block" id="printing" aria-labelledby="p-t">
        <div className="vs-wrap">
          <Head kicker="Printing" id="p-t" title="Silk screen printing and full sublimation." />
          <Reveal className="vs-split">
            <div className="vs-stack">
              <h3 className="vs-h3">Silk screen printing</h3>
              <p className="vs-body">Screen-printed logos and lettering on shirts and uniforms.</p>
              <Photo photo={P.printing} ratio="3 / 2" pos="35% center" caption="Silk screen printing on yellow shirts" />
            </div>
            <div className="vs-stack">
              <h3 className="vs-h3">Full sublimation</h3>
              <p className="vs-body">Customized full-sublimation polos and jerseys.</p>
              <Photo photo={P.sublimationPolo} ratio="3 / 2" caption="Full sublimation polo, front and back" />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="vs-sec vs-tint vs-block" id="print-authority" aria-labelledby="pa-t">
        <div className="vs-wrap">
          <Reveal className="vs-card vs-card--split">
            <Photo photo={P.printAuthority} ratio="592 / 707" hover={false} style={{ maxWidth: 240, width: '100%' }} />
            <div className="vs-stack">
              <p className="vs-kicker">Print Authority by VFRB Enterprise</p>
              <h2 className="vs-h2" id="pa-t">Customized prints for events, promotions and teams.</h2>
              <p className="vs-body">
                Full sublimation, silk screen printing and computerized embroidery, with made-to-order uniforms. Bulk orders
                are accepted, with Muntinlupa and Batangas branches.
              </p>
              <div className="vs-btns">
                <Btn href={`mailto:${C.printEmail}`} variant="line">{C.printEmail}</Btn>
                <Btn href={C.printPhoneHref} variant="line">{C.printPhone}</Btn>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand photo={P.workers} pos="center 30%" title="Tell us what your team needs to wear."
        lede="Create a free account to design a uniform, or contact VFRB directly.">
        <Btn to="/register" variant="mint">Design your uniform</Btn>
        <Btn to="/about" variant="ghost-light">Contact details</Btn>
      </CtaBand>
    </SitePage>
  );
}
