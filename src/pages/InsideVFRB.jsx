import Photo from '../components/landing/Photo';
import Reveal from '../components/landing/Reveal';
import SitePage from '../components/site/SitePage';
import { Banner, Btn, Head, CtaBand } from '../components/site/parts';
import { CONTACT as C } from '../components/site/config';
import { P } from './landing/photos';

const STAGES = [
  { t: 'Pattern', d: 'Every order starts from a pattern made for each size.', photo: P.sewing1, pos: 'center', cap: 'Team preparing garments at a work table' },
  { t: 'Segregation', d: 'Pieces are sorted by size before they move on.' },
  { t: 'Cutting', d: 'Fabric is cut in layers on the cutting tables.' },
  { t: 'Sewing', d: 'Garments are sewn operation by operation along the line, each worker on one step.', photo: P.sewing4, pos: 'center', cap: 'The sewing line' },
  { t: 'Quality check', d: 'Finished pieces are checked against the measurements for their size. Pieces that fail go back for alteration.' },
  { t: 'Pressing', d: 'The finishing team presses the garments.' },
  { t: 'Packing', d: 'Pieces are counted per size and color, then packed and labeled by division for delivery.', photo: P.packed, pos: 'center', cap: 'Uniforms packed and labeled for delivery' },
];

export default function InsideVFRB() {
  return (
    <SitePage title="Inside VFRB">
      <Banner kicker="Inside VFRB" title="Where every uniform is made."
        lede="Real people, real machines and a production floor built around tailoring and garment manufacturing."
        photo={P.workers} pos="center 30%" />

      <section className="vs-sec" aria-labelledby="flow">
        <div className="vs-wrap">
          <Head kicker="The production flow" id="flow" title="Seven stages, from pattern to packing."
            lede={`Production is based in ${C.production}. Here is the path a uniform order follows.`} />
          <ol className="vs-stages">
            {STAGES.map((s, i) => (
              <Reveal as="li" key={s.t} className={`vs-stage${s.photo ? '' : ' vs-stage--text'}`}>
                <span className="vs-stage__n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <div className="vs-stack"><h3 className="vs-h3">{s.t}</h3><p>{s.d}</p></div>
                {s.photo && <Photo photo={s.photo} pos={s.pos} caption={s.cap} />}
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="vs-sec vs-tint" aria-labelledby="people">
        <div className="vs-wrap">
          <Head kicker="The people" id="people" title="A floor run by a family and its team." />
          <Reveal className="vs-team-grid">
            <Photo photo={P.sewing2} className="vs-wide" ratio="16 / 8" caption="Sewing team working by the window" />
            <Photo photo={P.sewing3} ratio="4 / 3" caption="Machine stations" />
            <Photo photo={P.workers} ratio="4 / 3" pos="center 30%" caption="The production team" />
            <Photo photo={P.embroidery} ratio="4 / 3" caption="Embroidery machines" />
          </Reveal>
        </div>
      </section>

      <CtaBand photo={P.sewing4} title="See what comes off the line."
        lede="Browse finished pieces, or start a uniform of your own.">
        <Btn to="/gallery" variant="mint">Open the gallery</Btn>
        <Btn to="/register" variant="ghost-light">Design your uniform</Btn>
      </CtaBand>
    </SitePage>
  );
}
