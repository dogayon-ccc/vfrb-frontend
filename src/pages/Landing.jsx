import { lazy, Suspense, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import SitePage from '../components/site/SitePage';
import Photo from '../components/landing/Photo';
import Reveal from '../components/landing/Reveal';
import { Btn, TextLink } from '../components/site/parts';
import { CONTACT as C } from '../components/site/config';
import useParallax from '../hooks/useParallax';
import { MIN_ORDER_QTY } from '../utils/orderQuantity';
import { P } from './landing/photos';
import PatternReveal from './landing/PatternReveal';
import CategoryCards from './landing/CategoryCards';
import '../styles/landing.css';

const STEPS = [
  ['Design', 'Build and save your uniform in the VFRB Design Studio: garment, colours, logo and text.'],
  ['Order', `Order from a saved design with sizes, quantity (minimum ${MIN_ORDER_QTY} pieces) and the date you need. VFRB replies with a proposal and a delivery date for you to accept.`],
  ['Track', 'Follow the status of your order from your account and message the VFRB team.'],
  ['Receive', 'Pick up your uniforms or have them delivered. The invoice and payment receipts stay in your account.'],
];

const CONTACTS = [
  ['Call', C.phoneHref, C.phone],
  ['Email', `mailto:${C.email}`, C.email],
  ['Message', C.facebook, 'Facebook page'],
  ['Visit', C.map, `${C.address[0]}, ${C.address[1]}`],
];

// The pattern renders first and stays the fallback; on wide screens without reduced motion HeroLive runs the full 3D gate.
const HeroLive = lazy(() => import('./landing/HeroLive').catch(() => ({ default: () => null })));

export default function Landing() {
  const hero = useRef(null);
  useParallax(hero, useReducedMotion());
  return (
    <SitePage title="Company uniforms made in Muntinlupa">
      <section ref={hero} className="lp-hero vs-wrap" aria-labelledby="lp-title">
        <div className="lp-hero__copy">
          <h1 className="vs-h1" id="lp-title">Custom uniforms, made smarter.</h1>
          <p className="lp-lede">Design your uniform in the VFRB Studio, order in bulk and follow it from the cutting table to your door. VFRB sets up accounts for schools, hospitals and companies. Family-made in Muntinlupa since 2000.</p>
          <div className="vs-btns">
            <Btn to="/login" variant="mint">Sign in</Btn>
            <Btn to="/login#request-access" variant="ghost-light">Request access</Btn>
          </div>
        </div>
        <div className="lp-visual">
          <PatternReveal />
          {matchMedia('(min-width:960px) and (prefers-reduced-motion:no-preference)').matches && <Suspense fallback={null}><HeroLive host={hero} /></Suspense>}
        </div>
      </section>

      <section className="vs-sec vs-wrap" aria-labelledby="lp-how">
        <h2 className="vs-h2" id="lp-how">From design to delivery</h2>
        <ol className="lp-steps">
          {STEPS.map(([t, d], i) => <Reveal as="li" key={t} delay={i * 0.04}><span aria-hidden="true">{i + 1}</span><h3>{t}</h3><p>{d}</p></Reveal>)}
        </ol>
      </section>

      <section className="vs-sec vs-tint" aria-labelledby="lp-cats">
        <div className="vs-wrap">
          <h2 className="vs-h2" id="lp-cats">Start from your kind of team</h2>
          <p className="vs-body lp-sub">Each opens the Studio at that category&rsquo;s templates. You sign in first.</p>
          <CategoryCards />
        </div>
      </section>

      <section className="vs-sec vs-dark lp-floor" aria-labelledby="lp-floor">
        <div className="vs-wrap lp-floor__grid">
          <Reveal className="lp-floor__copy">
            <h2 className="vs-h2" id="lp-floor">Cut, sewn and packed on our own floor</h2>
            <p className="vs-lede">Every order is made by the VFRB team in Bayanan, Muntinlupa, from the pattern table to the packed box.</p>
            <TextLink to="/gallery">See more of our work</TextLink>
          </Reveal>
          <div className="lp-floor__photos">
            <Photo photo={P.sewing4} className="lp-floor__a" ratio="4 / 5" pos="20% center" hover={false} caption="The sewing line" sizes="(min-width: 960px) 30vw, 60vw" />
            <Photo photo={P.embroidery} className="lp-floor__b" ratio="1 / 1" hover={false} caption="Embroidery" sizes="(min-width: 960px) 20vw, 40vw" />
            <Photo photo={P.packed} className="lp-floor__c" ratio="3 / 4" hover={false} caption="Packed by division" sizes="(min-width: 960px) 20vw, 40vw" />
          </div>
        </div>
      </section>

      <section className="vs-sec vs-wrap lp-contact" id="contact" aria-labelledby="lp-contact">
        <h2 className="vs-h2" id="lp-contact">Rather talk first?</h2>
        <p className="vs-body lp-sub">Call or message VFRB and an administrator can set up your account.</p>
        <ul className="lp-contact__list">
          {CONTACTS.map(([k, href, v]) => (
            <li key={k}><a href={href} {...(href.startsWith('http') && { target: '_blank', rel: 'noopener noreferrer' })}><small>{k}</small>{v}</a></li>
          ))}
        </ul>
      </section>
    </SitePage>
  );
}
