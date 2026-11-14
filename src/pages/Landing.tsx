import { lazy, Suspense, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';
import SitePage from '../components/site/SitePage';
import Photo from '../components/landing/Photo';
import Reveal from '../components/landing/Reveal';
import InkLayers from '../components/landing/InkLayers';
import MaskLines from '../components/landing/MaskLines';
import SectionHead from '../components/landing/SectionHead';
import ArrowLink from '../components/landing/ArrowLink';
import { Btn } from '../components/site/parts';
import { CONTACT as C } from '../components/site/config';
import useParallax from '../hooks/useParallax';
import { MIN_ORDER_QTY } from '../utils/orderQuantity';
import { P } from './landing/photos';
import PatternReveal from './landing/PatternReveal';
import MarqueeBand from './landing/MarqueeBand';
import CategoryCards from './landing/CategoryCards';
import ProductionLine from './landing/ProductionLine';
import FabricStage from './landing/FabricStage';
import { FIND_UNIFORM, PHASES } from '../components/site/content';
import '../styles/landing.css';
import '../styles/landing-ink.css';

type Step = readonly [title: string, text: string, short: string];

const STEPS: Step[] = [
  ['Design', 'Build and save your uniform in the VFRB Design Studio: garment, colours, logo and text.', 'Garment, colours, logo and text.'],
  ['Order', `Order from a saved design with sizes, quantity (minimum ${MIN_ORDER_QTY} pieces) and the date you need. VFRB replies with a proposal and a delivery date for you to accept.`, 'Sizes, quantity and the date you need.'],
  ['Track', 'Follow the status of your order from your account and message the VFRB team.', 'Follow your order from your account.'],
  ['Receive', 'Pick up your uniforms or have them delivered. The invoice and payment receipts stay in your account.', 'Pickup or delivery, invoice in your account.'],
];

const TITLE = ['Custom uniforms,', 'made smarter.'];
const MARQUEE = ['School uniforms', 'Scrubs', 'Corporate wear', 'Hospitality', 'Workwear', 'Made in Muntinlupa since 2000'];
const FACTS: [number, string][] = [
  [new Date().getFullYear() - 2000, 'years making uniforms in Muntinlupa'],
  [PHASES.flatMap(p => p.stages).length, 'production stations, tracked one by one'],
  [MIN_ORDER_QTY, 'pieces minimum per order'],
  [FIND_UNIFORM.length, 'uniform categories to start from'],
];

const CONTACTS: [string, string, string][] = [
  ['Call', C.phoneHref, C.phone],
  ['Email', `mailto:${C.email}`, C.email],
  ['Message', C.facebook, 'Facebook page'],
  ['Visit', C.map, `${C.address[0]}, ${C.address[1]}`],
];

// The pattern renders first and stays the fallback; on wide screens without reduced motion HeroLive runs the full 3D gate.
const HeroLive = lazy(() => import('./landing/HeroLive').catch(() => ({ default: () => null })));

export default function Landing() {
  const hero = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() ?? false;
  useParallax(hero, reduce);
  return (
    <SitePage title="Company uniforms made in Muntinlupa" tone="ink">
      {createPortal(<div className="lp-progress lp-progress--ink" aria-hidden="true" />, document.body)}
      <InkLayers />

      <div className="lp-top">
        <section ref={hero} className="lp-hero vs-wrap" aria-labelledby="lp-title">
          <div className="lp-hero__copy">
            <p className="lp-eyebrow"><span className="lp-eyebrow__dot" aria-hidden="true" />Family-made in Muntinlupa since 2000</p>
            <MaskLines as="h1" id="lp-title" className="vs-h1" lines={TITLE} />
            <p className="lp-lede">Design your uniform in the VFRB Studio, order in bulk and follow it from the cutting table to your door. VFRB sets up accounts for schools, hospitals and companies.</p>
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

        <div className="vs-wrap lp-foot">
          <a className="lp-cue" href="#how"><span>Scroll to enter</span><span className="lp-cue__track" aria-hidden="true"><i /></span></a>
          <ol className="lp-chips" aria-label="How ordering works">
            {STEPS.map(([t, , short], i) => (
              <li key={t} style={{ '--i': i }}>
                <a href="#how"><span className="lp-chips__n">{String(i + 1).padStart(2, '0')}</span><span className="lp-chips__tx"><b>{t}</b><small>{short}</small></span></a>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <MarqueeBand words={MARQUEE} reduce={reduce} />

      <section className="vs-sec vs-wrap" id="how" aria-labelledby="lp-how">
        <SectionHead n="01" label="How it works" aside="Design to delivery" />
        <h2 className="vs-h2 lp-h2" id="lp-how">From design to delivery</h2>
        <ol className="lp-steps">
          {STEPS.map(([t, d], i) => <Reveal as="li" key={t} delay={i * 0.04} style={{ '--i': i }}><span aria-hidden="true">{i + 1}</span><h3>{t}</h3><p>{d}</p></Reveal>)}
        </ol>
        <ul className="lp-facts">
          {FACTS.map(([n, label]) => (
            <li key={label}><b className="lp-facts__n" style={{ '--to': n }}><span>{n}</span></b><span>{label}</span></li>
          ))}
        </ul>
      </section>

      <FabricStage />

      <section className="vs-sec vs-tint" aria-labelledby="lp-cats">
        <div className="vs-wrap">
          <SectionHead n="02" label="Your team" aside="Studio templates" />
          <h2 className="vs-h2 lp-h2" id="lp-cats">Start from your kind of team</h2>
          <p className="vs-body lp-sub">Each opens the Studio at that category&rsquo;s templates. You sign in first.</p>
          <CategoryCards />
        </div>
      </section>

      <section className="vs-sec vs-dark lp-floor" aria-labelledby="lp-floor">
        <div className="vs-wrap">
          <SectionHead n="03" label="The floor" aside="Bayanan, Muntinlupa" />
          <div className="lp-floor__grid">
            <Reveal className="lp-floor__copy">
              <h2 className="vs-h2" id="lp-floor">Cut, sewn and packed on our own floor</h2>
              <p className="vs-lede">Every order is made by the VFRB team in Bayanan, Muntinlupa, from the pattern table to the packed box.</p>
              <ArrowLink to="/gallery">See more of our work</ArrowLink>
            </Reveal>
            <div className="lp-floor__photos">
              <Photo photo={P.sewing4} className="lp-floor__a" ratio="4 / 5" pos="20% center" hover={false} caption="The sewing line" sizes="(min-width: 960px) 30vw, 60vw" />
              <Photo photo={P.embroidery} className="lp-floor__b" ratio="1 / 1" hover={false} caption="Embroidery" sizes="(min-width: 960px) 20vw, 40vw" />
              <Photo photo={P.packed} className="lp-floor__c" ratio="3 / 4" hover={false} caption="Packed by division" sizes="(min-width: 960px) 20vw, 40vw" />
            </div>
          </div>
        </div>
      </section>

      <ProductionLine />

      <section className="vs-sec vs-wrap lp-contact" id="contact" aria-labelledby="lp-contact">
        <SectionHead n="05" label="Contact" aside="Talk first" />
        <h2 className="vs-h2 lp-h2" id="lp-contact">Rather talk first?</h2>
        <p className="vs-body lp-sub">Call or message VFRB and an administrator can set up your account.</p>
        <ul className="lp-contact__list">
          {CONTACTS.map(([k, href, v], i) => (
            <li key={k} style={{ '--i': i }}><a href={href} {...(href.startsWith('http') && { target: '_blank', rel: 'noopener noreferrer' })}><small>{k}</small>{v}</a></li>
          ))}
        </ul>
      </section>
    </SitePage>
  );
}
