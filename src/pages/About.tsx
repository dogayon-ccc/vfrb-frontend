import Photo from '../components/landing/Photo';
import Reveal from '../components/landing/Reveal';
import MapCard from '../components/site/MapCard';
import SitePage from '../components/site/SitePage';
import { Banner, Head, Journey } from '../components/site/parts';
import { CONTACT as C } from '../components/site/config';
import { SERVE } from '../components/site/content';
import { P } from './landing/photos';

export default function About() {
  return (
    <SitePage title="About" tone="ink" deck>
      <Banner kicker="About VFRB Enterprise" title="A family garment company, specialized in uniforms."
        lede="Serving offices, schools and institutions since 2000." photo={P.familyCourt} pos="center 40%" />

      <section className="vs-sec" id="story-sec" data-slide="Who we are" aria-labelledby="story">
        <div className="vs-wrap vs-split">
          <Reveal className="vs-stack">
            <h2 className="vs-h2" id="story">Who we are</h2>
            <ul className="vs-serve" aria-label="Who VFRB makes uniforms for">{SERVE.map(x => <li key={x}>{x}</li>)}</ul>
            <p className="vs-body">
              VFRB Enterprise, also known as Tailor Centre VFRB Manila, is a medium-scale, family-owned garment industry
              operating since 2000, specialized in corporate and company uniforms.
            </p>
            <p className="vs-body">The company is a sole proprietorship led by its owner, Fe Tiama Boitizon.</p>
          </Reveal>
          <Reveal delay={0.06} className="vs-stack">
            <Photo photo={P.familyDinner} ratio="4 / 3" caption="The VFRB family and team" />
            <blockquote className="vs-quote">
              Our company caters all kinds of tailoring service and garments needs from local to international market
              ensuring high quality products and services.
            </blockquote>
          </Reveal>
        </div>
      </section>


      <section className="vs-sec vs-tint" id="contact" data-slide="Visit us" aria-labelledby="contact-title">
        <div className="vs-wrap">
          <Head kicker="Contact" id="contact-title" title="Visit or reach VFRB." />
          <Reveal className="vs-split">
            <dl className="vs-dl">
              <div><dt>Address</dt><dd>{C.address[0]}, {C.address[1]}</dd></div>
              <div><dt>Second location</dt><dd>{C.other}</dd></div>
              <div><dt>Phone</dt><dd><a href={C.phoneHref}>{C.phone}</a></dd></div>
              <div><dt>Email</dt><dd><a href={`mailto:${C.email}`}>{C.email}</a></dd></div>
              <div><dt>Facebook</dt><dd><a href={C.facebook} target="_blank" rel="noopener noreferrer">Tailor Centre VFRB Manila</a></dd></div>
            </dl>
            <div className="vs-stack">
              <MapCard />
            </div>
          </Reveal>
        </div>
      </section>
      <Journey current="/about" />
    </SitePage>
  );
}
