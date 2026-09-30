import Photo from '../components/landing/Photo';
import Reveal from '../components/landing/Reveal';
import SitePage from '../components/site/SitePage';
import { Banner, Head, TextLink, Journey } from '../components/site/parts';
import { CONTACT as C } from '../components/site/config';
import { PEOPLE, PLACES } from '../components/site/content';
import { P } from './landing/photos';

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
            {PEOPLE.map((o, i) => (
              <Reveal key={o.name} className="vs-owner" delay={i * 0.06}>
                <Photo photo={o.photo} pos="center 25%" ratio="1 / 1" />
                <div><h3>{o.name}</h3><b>{o.role}</b><span>{o.line}</span></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="vs-sec vs-tint" aria-labelledby="tm">
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

      <section className="vs-sec vs-sec--tight" aria-labelledby="where">
        <div className="vs-wrap vs-split">
          <Reveal className="vs-stack">
            <h2 className="vs-h2" id="where">Where to find us</h2>
            <dl className="vs-dl">
              <div><dt>{PLACES[0][1]}</dt><dd>{C.address[0]}, {C.address[1]}</dd></div>
              <div><dt>{PLACES[1][1]}</dt><dd>{C.other}</dd></div>
            </dl>
          </Reveal>
          <Reveal className="vs-stack" delay={0.06}>
            <p className="vs-body">Questions about an order or a visit? Contact details are on the About page.</p>
            <TextLink to="/about#visit">Contact VFRB</TextLink>
          </Reveal>
        </div>
      </section>
      <Journey current="/our-team" />
    </SitePage>
  );
}
