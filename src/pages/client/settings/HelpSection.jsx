import { Link } from 'react-router-dom';
import { NavIcon } from '../../../components/ui/icons';

const CONTACT = [
  { icon: 'phone', label: 'Phone', value: '0921 791 6259', href: 'tel:09217916259' },
  { icon: 'email', label: 'Email', value: 'vfrb.enterprise@gmail.com', href: 'mailto:vfrb.enterprise@gmail.com' },
  { icon: 'location', label: 'Address', value: '#31 San Guillermo St., Bayanan, Muntinlupa City 1772',
    href: 'https://www.google.com/maps/search/?api=1&query=31+San+Guillermo+St+Bayanan+Muntinlupa' },
];

const GUIDES = [
  { to: '/guide', icon: 'designStudio', label: 'How ordering works', hint: 'Design, order, track' },
  { to: '/faq', icon: 'info', label: 'FAQ', hint: 'Common questions' },
  { to: '/terms', icon: 'checklist', label: 'Terms of Service', hint: 'Order and payment terms' },
  { to: '/privacy', icon: 'lock', label: 'Privacy Policy', hint: 'How your data is handled' },
];

const Row = ({ as: As = 'a', icon, label, hint, ...rest }) => (
  <As className="hs-item" {...rest}>
    <span className="hs-ico"><NavIcon name={icon} size={16} /></span>
    <span className="hs-txt"><b>{label}</b><small>{hint}</small></span>
    <NavIcon name="chevronRight" size={16} color="var(--text-faint)" />
  </As>
);

export default function HelpSection() {
  return (
    <div>
      <div className="hs-grid">
        <section className="cx-card hs-hero" aria-labelledby="hs-order-h">
          <span className="hs-ico hs-ico-lg"><NavIcon name="messages" size={22} /></span>
          <div>
            <h2 id="hs-order-h">Question about an order?</h2>
            <p>Messages go straight to the VFRB staff handling that order, with your design and status attached.</p>
          </div>
          <Link to="/messages" className="cx-btn cx-btn-p">Open Messages</Link>
        </section>

        <section className="cx-card" aria-labelledby="hs-contact-h">
          <div className="cx-card-h"><h2 id="hs-contact-h">Contact VFRB Enterprise</h2></div>
          {CONTACT.map(c => (
            <Row key={c.label} icon={c.icon} label={c.value} hint={c.label} href={c.href}
              {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})} />
          ))}
        </section>

        <section className="cx-card" aria-labelledby="hs-guides-h">
          <div className="cx-card-h"><h2 id="hs-guides-h">Guides and policies</h2></div>
          {GUIDES.map(g => <Row key={g.to} as={Link} to={g.to} icon={g.icon} label={g.label} hint={g.hint} />)}
        </section>
      </div>
    </div>
  );
}
