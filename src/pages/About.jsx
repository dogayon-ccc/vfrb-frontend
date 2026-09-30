import Photo from '../components/landing/Photo';
import Reveal from '../components/landing/Reveal';
import SitePage from '../components/site/SitePage';
import { Banner, Btn, Head, TextLink, Journey } from '../components/site/parts';
import { CONTACT as C } from '../components/site/config';
import { SERVE_LINE } from '../components/site/content';
import { P } from './landing/photos';

export default function About() {
  return (
    <SitePage title="About">
      <Banner kicker="About VFRB Enterprise" title="A family garment company, specialized in uniforms."
        lede="Serving offices, schools and institutions since 2000." photo={P.familyCourt} pos="center 40%" />

      <section className="vs-sec" aria-labelledby="story">
        <div className="vs-wrap vs-split">
          <Reveal className="vs-stack">
            <h2 className="vs-h2" id="story">Who we are</h2>
            <p className="vs-body">
              VFRB Enterprise, also known as Tailor Centre VFRB Manila, is a medium-scale, family-owned garment industry
              operating since 2000, specialized in corporate and company uniforms.
            </p>
            <p className="vs-body">The company is a sole proprietorship led by its owner, Fe Tiama Boitizon.</p>
          </Reveal>
          <Reveal delay={0.06}>
            <blockquote className="vs-quote">
              Our company caters all kinds of tailoring service and garments needs from local to international market
              ensuring high quality products and services.
            </blockquote>
          </Reveal>
        </div>
      </section>

      <section className="vs-sec vs-tint" aria-labelledby="glance">
        <div className="vs-wrap vs-split vs-split--wide-media">
          <Reveal><Photo photo={P.familyDinner} ratio="4 / 3" caption="The VFRB family and team" /></Reveal>
          <Reveal delay={0.06}>
            <h2 className="vs-h2" id="glance" style={{ marginBottom: 24 }}>At a glance</h2>
            <dl className="vs-dl">
              <div><dt>Also known as</dt><dd>Tailor Centre VFRB Manila</dd></div>
              <div><dt>Since</dt><dd>2000</dd></div>
              <div><dt>Ownership</dt><dd>Sole proprietorship, family-owned</dd></div>
              <div><dt>We serve</dt><dd>{SERVE_LINE}</dd></div>
              <div><dt>Locations</dt><dd>Bayanan, Muntinlupa City, and {C.other}</dd></div>
            </dl>
          </Reveal>
        </div>
      </section>

      <section className="vs-sec" aria-labelledby="visit">
        <div className="vs-wrap">
          <Head kicker="Contact" id="visit" title="Visit or reach VFRB." />
          <Reveal className="vs-split">
            <dl className="vs-dl">
              <div><dt>Address</dt><dd>{C.address[0]}, {C.address[1]}</dd></div>
              <div><dt>Phone</dt><dd><a href={C.phoneHref}>{C.phone}</a></dd></div>
              <div><dt>Email</dt><dd><a href={`mailto:${C.email}`}>{C.email}</a></dd></div>
              <div><dt>Facebook</dt><dd><a href={C.facebook} target="_blank" rel="noopener noreferrer">Tailor Centre VFRB Manila</a></dd></div>
            </dl>
            <div className="vs-stack">
              <p className="vs-body">Ready to order? Create an account and design your uniform, or message us directly.</p>
              <div className="vs-btns">
                <Btn to="/register">Design your uniform</Btn>
                <Btn href={C.map} variant="line" target="_blank" rel="noopener noreferrer">Open in Google Maps</Btn>
              </div>
              <TextLink to="/what-we-do">See what we make</TextLink>
            </div>
          </Reveal>
        </div>
      </section>
      <Journey current="/about" />
    </SitePage>
  );
}
