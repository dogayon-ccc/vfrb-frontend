import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const SITE_URL = 'https://vfrb-frontend.vercel.app';
const DEFAULT_DESC = 'VFRB Enterprise makes bulk custom uniforms for offices, schools and institutions in Bayanan, Muntinlupa. Design in the Studio, order and track production online.';

// Public routes only; keep in step with public/sitemap.xml. Private routes get the default text and noindex.
export const PUBLIC_META = {
  '/':            ['Company uniforms made in Muntinlupa | VFRB Enterprise', DEFAULT_DESC],
  '/login':       ['Sign in', 'Sign in to the VFRB Enterprise customer portal to design, order and track bulk uniforms.'],
  '/guide':       ['How ordering works', 'The VFRB ordering flow from design to delivery, as it works in the customer portal today.'],
  '/faq':         ['FAQ', 'How designing, ordering and tracking work in the VFRB customer portal.'],
  '/about':       ['About', 'A family garment business serving offices, schools and institutions since 2000.'],
  '/what-we-do':  ['What we do', 'Uniform tailoring, computerized embroidery for logos, emblems and patches, printing and sublimation.'],
  '/inside-vfrb': ['Inside VFRB', 'Real people, real machines and a production floor built around tailoring and garment manufacturing.'],
  '/gallery':     ['Gallery', 'Embroidery, printing, sublimation, packed orders and the production team, all photographed at VFRB.'],
  '/our-team':    ['VFRB Family', 'A medium-scale, family-owned garment business specialized in corporate and company uniforms.'],
  '/privacy':     ['Privacy Policy', 'How VFRB Enterprise collects, uses and protects personal data under the Data Privacy Act of 2012.'],
  '/terms':       ['Terms of Service', 'The terms for bulk uniform orders placed through the VFRB Enterprise customer portal.'],
};

const setCanonical = (href) => {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', 'canonical'); document.head.appendChild(el); }
  el.setAttribute('href', href);
};

const setMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content);
};

// Per-route title, description, Open Graph and Twitter tags; index.html holds the same defaults for crawlers without JS.
export default function RouteMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    const hit = PUBLIC_META[path];
    const title = hit ? (path === '/' ? hit[0] : `${hit[0]} | VFRB Enterprise`) : 'VFRB Enterprise';
    const desc = hit ? hit[1] : DEFAULT_DESC;
    if (hit) document.title = title;
    setMeta('name', 'description', desc);
    setMeta('name', 'robots', hit ? 'index, follow' : 'noindex, nofollow');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', SITE_URL + path);
    setCanonical(SITE_URL + path);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', desc);
  }, [pathname]);
  return null;
}
