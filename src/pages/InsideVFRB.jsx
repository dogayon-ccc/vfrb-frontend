import Photo from '../components/landing/Photo';
import Reveal from '../components/landing/Reveal';
import SitePage from '../components/site/SitePage';
import { Banner, Head, Journey } from '../components/site/parts';
import { PHASES } from '../components/site/content';
import { P } from './landing/photos';

export default function InsideVFRB() {
  return (
    <SitePage title="Inside VFRB">
      <Banner kicker="Inside VFRB" title="Where every uniform is made."
        lede="Real people, real machines and a production floor built around tailoring and garment manufacturing."
        photo={P.workers} pos="center 30%" />

      <section className="vs-sec" aria-labelledby="flow">
        <div className="vs-wrap">
          <Head kicker="The production flow" id="flow" title="Seven stages, from pattern to packing."
            lede="An order only moves to the next stage once the required quantity for the current stage is finished." />
          <div className="vs-phases">
            {PHASES.map((ph, i) => (
              <Reveal key={ph.id} className={`vs-phase${i % 2 ? ' vs-phase--flip' : ''}`}>
                <div>
                  <div className="vs-phase__title"><h3 className="vs-h3">{ph.title}</h3><span>{ph.stages.length === 1 ? 'Stage' : 'Stages'}</span></div>
                  <ol className="vs-stagelist">
                    {ph.stages.map(([t, d]) => <li key={t}><h4 className="vs-h4">{t}</h4><p>{d}</p></li>)}
                  </ol>
                </div>
                <div className={`vs-phase__media${ph.photos.length > 1 ? ' vs-phase__media--pair' : ''}`}>
                  {ph.photos.map(([photo, pos, cap]) => <Photo key={cap} photo={photo} pos={pos} caption={cap} ratio="4 / 3" />)}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="vs-sec vs-tint" aria-labelledby="people">
        <div className="vs-wrap">
          <Head kicker="The people" id="people" title="A floor run by a family and its team." />
          <Reveal className="vs-team-grid">
            <Photo photo={P.sewing2} className="vs-wide" ratio="16 / 8" caption="Sewing team working by the window" />
            <Photo photo={P.workers} ratio="4 / 3" pos="center 30%" caption="The production team" />
            <Photo photo={P.embroidery} ratio="4 / 3" caption="Embroidery machines" />
            <Photo photo={P.sewing1} ratio="4 / 3" caption="Preparing garments" />
          </Reveal>
        </div>
      </section>
      <Journey current="/inside-vfrb" />
    </SitePage>
  );
}
