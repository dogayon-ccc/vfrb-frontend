import { Link } from 'react-router-dom';
import Reveal from '../landing/Reveal';
import Photo from '../landing/Photo';

export function Btn({ to, href, variant = 'primary', className = '', children, ...rest }) {
  const cls = `vs-btn vs-btn--${variant} ${className}`;
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{children}</a>;
  return <button type="button" className={cls} {...rest}>{children}</button>;
}

export function TextLink({ to, href, children, ...rest }) {
  return to ? <Link to={to} className="vs-link" {...rest}>{children}</Link>
    : <a href={href} className="vs-link" {...rest}>{children}</a>;
}

export function Head({ kicker, title, lede, id }) {
  return (
    <Reveal className="vs-head">
      <div>
        {kicker && <p className="vs-kicker">{kicker}</p>}
        <h2 className="vs-h2" id={id}>{title}</h2>
      </div>
      {lede && <p className="vs-lede">{lede}</p>}
    </Reveal>
  );
}

export function Banner({ kicker, title, lede, photo, pos = 'center', children }) {
  return (
    <header className="vs-banner">
      <div className="vs-banner__bg"><Photo photo={photo} instant hover={false} pos={pos} ratio="auto" radius={0} /></div>
      <div className="vs-wrap">
        {kicker && <p className="vs-kicker">{kicker}</p>}
        <h1 className="vs-h1" style={{ maxWidth: '22ch' }}>{title}</h1>
        {lede && <p className="vs-lede">{lede}</p>}
        {children}
      </div>
    </header>
  );
}

export function PlainHead({ kicker, title, lede }) {
  return (
    <header className="vs-wrap vs-plain-head">
      {kicker && <p className="vs-kicker" style={{ marginBottom: 0 }}>{kicker}</p>}
      <h1 className="vs-h1" style={{ maxWidth: '16ch' }}>{title}</h1>
      {lede && <p className="vs-lede">{lede}</p>}
    </header>
  );
}

export function CtaBand({ photo, pos, title, lede, children }) {
  return (
    <section className="vs-cta vs-dark vs-sec" aria-labelledby="cta-title">
      <div className="vs-cta__bg"><Photo photo={photo} hover={false} pos={pos} ratio="auto" radius={0} style={{ height: '100%' }} /></div>
      <Reveal className="vs-wrap vs-stack">
        <h2 className="vs-h2" id="cta-title" style={{ maxWidth: '20ch' }}>{title}</h2>
        {lede && <p className="vs-lede">{lede}</p>}
        <div className="vs-btns" style={{ paddingTop: 6 }}>{children}</div>
      </Reveal>
    </section>
  );
}
