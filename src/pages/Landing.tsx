import { lazy, Suspense, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';
import SitePage from '../components/site/SitePage';
import Reveal from '../components/landing/Reveal';
import InkLayers from '../components/landing/InkLayers';
import MaskLines from '../components/landing/MaskLines';
import SectionHead from '../components/landing/SectionHead';
import { Btn } from '../components/site/parts';
import { CONTACT as C } from '../components/site/config';
import useParallax from '../hooks/useParallax';
import useMedia from '../hooks/useMedia';
import { MIN_ORDER_QTY } from '../utils/orderQuantity';
import PatternReveal from './landing/PatternReveal';
import MarqueeBand from './landing/MarqueeBand';
import CategoryCards from './landing/CategoryCards';
import ProductionLine from './landing/ProductionLine';
import FabricStage from './landing/FabricStage';
import BentoGrid from './landing/BentoGrid';
import DeckNav, { type DeckSlide } from './landing/DeckNav';
import { FIND_UNIFORM, PHASES } from '../components/site/content';
import '../styles/landing.css';
import '../styles/landing-ink.css';
import '../styles/rog-chrome.css';

type Step = readonly [title: string, text: string];

const STEPS: Step[] = [
  ['Design', 'Build and save your uniform in the VFRB Design Studio: garment, colours, logo and text.'],
  ['Order', `Order from a saved design with sizes, quantity (minimum ${MIN_ORDER_QTY} pieces) and the date you need. VFRB replies with a proposal and a delivery date for you to accept.`],
  ['Track', 'Follow the status of your order from your account and message the VFRB team.'],
  ['Receive', 'Pick up your uniforms or have them delivered. The invoice and payment receipts stay in your account.'],
];

const TITLE = ['Custom uniforms,', 'made smarter.'];
const MARQUEE = ['School uniforms', 'Scrubs', 'Corporate wear', 'Hospitality', 'Workwear', `Bulk orders from ${MIN_ORDER_QTY} pieces`];
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

const SLIDES: readonly DeckSlide[] = [
  { id: 'home', label: 'Welcome' }, { id: 'how', label: 'How it works' }, { id: 'stage', label: 'Templates in 3D', bar: false },
  { id: 'teams', label: 'Your team' }, { id: 'line', label: 'On the floor' }, { id: 'explore', label: 'Explore VFRB' }, { id: 'contact', label: 'Contact' },
];

// The pattern renders first and stays the fallback; on wide screens without reduced motion HeroLive runs the full 3D gate.
const HeroLive = lazy(() => import('./landing/HeroLive').catch(() => ({ default: () => null })));

export default function Landing() {
  const hero = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() ?? false;
  const live3d = useMedia('(min-width:960px) and (prefers-reduced-motion:no-preference)');
  useParallax(hero, reduce);
  return (
    <SitePage title="Company uniforms made in Muntinlupa" tone="ink" lean>
      {createPortal(<div className="lp-progress lp-progress--ink" aria-hidden="true" />, document.body)}
      <InkLayers />

      <div className="lp-top" id="home">
        <div className="vfrb-weave lp-weave" aria-hidden="true" />
        <section ref={hero} className="lp-hero vs-wrap" aria-labelledby="lp-title">
          <div className="lp-hero__copy">
            <p className="lp-eyebrow">Family-made in Muntinlupa since 2000</p>
            <MaskLines as="h1" id="lp-title" className="vs-h1" lines={TITLE} />
            <p className="lp-lede">Design your uniform in the VFRB Studio, order in bulk and follow it from the cutting table to your door. VFRB sets up accounts for schools, hospitals and companies.</p>
            <div className="vs-btns">
              <Btn to="/login" variant="mint">Sign in</Btn>
              <Btn to="/login#request-access" variant="ghost-light">Request access</Btn>
            </div>
          </div>
          <div className="lp-visual">
            <PatternReveal />
            {live3d && <Suspense fallback={null}><HeroLive host={hero} /></Suspense>}
          </div>
        </section>

        <div className="vs-wrap lp-foot">
          <a className="lp-cue" href="#how"><span>Scroll to enter</span><span className="lp-cue__track" aria-hidden="true"><i /></span></a>
        </div>
      </div>

      <MarqueeBand words={MARQUEE} reduce={reduce} />

      <section className="vs-sec vs-wrap" id="how" aria-labelledby="lp-how">
        <SectionHead label="How it works" aside="Design to delivery" />
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

      <section className="vs-sec vs-tint" id="teams" aria-labelledby="lp-cats">
        <div className="vs-wrap">
          <SectionHead label="Your team" aside="Studio templates" />
          <h2 className="vs-h2 lp-h2" id="lp-cats">Start from your kind of team</h2>
          <p className="vs-body lp-sub">Each opens the Studio at that category&rsquo;s templates. You sign in first.</p>
          <CategoryCards />
        </div>
      </section>


      <ProductionLine />

      <section className="vs-sec vs-wrap lp-explore" id="explore" aria-labelledby="lp-explore">
        <SectionHead label="Explore" aside="Gallery, family, services" />
        <h2 className="vs-h2 lp-h2" id="lp-explore">See the work, meet the family</h2>
        <BentoGrid />
      </section>

      <section className="vs-sec vs-wrap lp-contact" id="contact" aria-labelledby="lp-contact">
        <SectionHead label="Contact" aside="Talk first" />
        <h2 className="vs-h2 lp-h2" id="lp-contact">Rather talk first?</h2>
        <p className="vs-body lp-sub">Call or message VFRB and an administrator can set up your account.</p>
        <ul className="lp-contact__list">
          {CONTACTS.map(([k, href, v], i) => (
            <li key={k} style={{ '--i': i }}><a href={href} {...(href.startsWith('http') && { target: '_blank', rel: 'noopener noreferrer' })}><small>{k}</small>{v}</a></li>
          ))}
        </ul>
      </section>

      <DeckNav slides={SLIDES} />
    </SitePage>
  );
}
