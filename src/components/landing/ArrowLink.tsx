import type { ReactNode } from 'react';
import { ViewLink as Link } from '../ViewLink';

type ArrowLinkProps = { to?: string; href?: string; children: ReactNode };

const Arrow = () => (
  <span className="lp-arrow__ar" aria-hidden="true">
    <svg viewBox="0 0 14 14" fill="none"><path d="M3 11 11 3M5 3h6v6" stroke="currentColor" strokeWidth="1.3" /></svg>
  </span>
);

export default function ArrowLink({ to, href, children }: ArrowLinkProps) {
  return to
    ? <Link to={to} className="lp-arrow"><span>{children}</span><Arrow /></Link>
    : <a href={href} className="lp-arrow"><span>{children}</span><Arrow /></a>;
}
