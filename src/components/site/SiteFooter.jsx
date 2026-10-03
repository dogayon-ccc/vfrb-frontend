import { ViewLink as Link } from '../ViewLink';
import '../../styles/site.css';
import logo from '../../assets/company-logo.jpg';
import { NAV, CONTACT as C } from './config';

export default function SiteFooter() {
  return (
    <footer className="vs vs-footer vs-dark">
      <div className="vs-wrap">
        <div className="vs-footer__grid">
          <div>
            <div className="vs-footer__brand">
              <img src={logo} alt="" width="44" height="44" />
              <span><b>VFRB Enterprise</b><small>Custom Uniforms. Smarter Solutions.</small></span>
            </div>
            <address>
              {C.address[0]}<br />{C.address[1]}<br />Also in {C.other}
            </address>
            <div className="vs-footer__contact">
              <a href={C.phoneHref}>{C.phone}</a><br />
              <a href={`mailto:${C.email}`}>{C.email}</a><br />
              <a href={C.facebook} target="_blank" rel="noopener noreferrer">Facebook page</a>
            </div>
          </div>
          <nav aria-label="Company">
            <h2>Company</h2>
            <ul>{NAV.map(n => <li key={n.to}><Link to={n.to}>{n.label}</Link></li>)}</ul>
          </nav>
          <nav aria-label="Clients">
            <h2>Clients</h2>
            <ul>
              <li><Link to="/register">Create an account</Link></li>
              <li><Link to="/login">Log in</Link></li>
              <li><Link to="/guide">Client guide</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
            </ul>
          </nav>
        </div>
        <div className="vs-footer__legal">
          <p>© {new Date().getFullYear()} VFRB Enterprise · Created by <Link to="/group-60">Group 60</Link></p>
          <nav aria-label="Legal"><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms of Service</Link></nav>
        </div>
      </div>
    </footer>
  );
}
