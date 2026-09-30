import Photo from '../components/landing/Photo';
import Reveal from '../components/landing/Reveal';
import SitePage from '../components/site/SitePage';
import { Banner, Btn, Head, TextLink, CtaBand } from '../components/site/parts';
import { CONTACT as C } from '../components/site/config';
import { P } from './landing/photos';

const OWNERS = [
  { photo: P.fe, name: 'Fe Tiama Boitizon', role: 'Owner', line: 'VFRB Enterprise, sole proprietorship' },
  { photo: P.roxanne, name: 'Roxanne Boitizon Baddiri', role: 'Daughter of Ma\u2019am Fe', line: 'VFRB Enterprise family' },
];
const MAKE = ['Custom tailoring', 'Garment manufacturing', 'Computerized embroidery', 'Company uniforms', 'Polo shirts', 'Campaign shirts', 'Caps', 'Jackets', 'Patches'];
const SERVE = ['Local offices', 'Corporate clients', 'Schools', 'Institutional organizations'];

export default function Team() {
  return (
    <SitePage title="VFRB Family">
      <Banner kicker="VFRB Family" title="The family behind VFRB Enterprise."
        lede="A medium-scale, family-owned garment industry, specialized in corporate and company uniforms."
        photo={P.familyCourt} pos="center 40%" />

      <section className="vs-sec" aria-labelledby="own">
        <div className="vs-wrap">
          <Head kicker="Ownership" id="own" title="Meet the family." />
          <div className="vs-owners">
            {OWNERS.map((o, i) => (
              <Reveal key={o.name} className="vs-owner" delay={i * 0.06}>
                <Photo photo={o.photo} pos="center 25%" ratio="1 / 1" />
                <div><h3>{o.name}</h3><b>{o.role}</b><span>{o.line}</span></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="vs-sec vs-tint" aria-labelledby="mk">
        <div className="vs-wrap vs-split">
          <Reveal className="vs-stack">
            <h2 className="vs-h2" id="mk">What we make</h2>
            <ul className="vs-chips">{MAKE.map(m => <li key={m}>{m}</li>)}</ul>
          </Reveal>
          <Reveal className="vs-stack" delay={0.06}>
            <h2 className="vs-h2">Who we serve</h2>
            <ul className="vs-chips">{SERVE.map(m => <li key={m}>{m}</li>)}</ul>
            <p className="vs-body" style={{ marginTop: 18 }}>{C.address[0]}, {C.address[1]}</p>
            <TextLink to="/about">Contact details</TextLink>
          </Reveal>
        </div>
      </section>

      <section className="vs-sec" aria-labelledby="tm">
        <div className="vs-wrap">
          <Head kicker="The team" id="tm" title="Family, staff and the production floor." />
          <Reveal className="vs-team-grid">
            <Photo photo={P.familyDinner} className="vs-wide" ratio="16 / 9" pos="center 40%" caption="The VFRB family and team" />
            <Photo photo={P.workers} ratio="4 / 3" pos="center 30%" caption="Production team" />
            <Photo photo={P.sewing4} ratio="4 / 3" caption="Sewing line" />
            <Photo photo={P.sewing2} ratio="4 / 3" caption="At work" />
          </Reveal>
        </div>
      </section>

      <CtaBand photo={P.familyDinner} pos="center 40%" title="Work with a family that sews for you.">
        <Btn to="/register" variant="mint">Design your uniform</Btn>
        <Btn to="/inside-vfrb" variant="ghost-light">Tour the production floor</Btn>
      </CtaBand>
    </SitePage>
  );
}
