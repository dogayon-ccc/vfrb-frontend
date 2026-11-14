// Chapter 4: bento grid linking the public pages. Photos, routes and facts come from existing site modules only.
import type { CSSProperties } from 'react';
import { ViewLink as Link } from '../../components/ViewLink';
import Photo from '../../components/landing/Photo';
import { SERVICES, PHASES } from '../../components/site/content';
import { P, GALLERY } from './photos';

type Tile = { to: string; kicker: string; title: string; cls: string; photo?: (typeof P)[keyof typeof P]; pos?: string; body?: string; chips?: readonly string[] };

const STATIONS = PHASES.flatMap(p => p.stages).length;

const TILES: readonly Tile[] = [
  { to: '/gallery', kicker: 'Gallery', title: `${GALLERY.length} photos from our floor`, cls: 'a', photo: P.embroidery, pos: 'center' },
  { to: '/our-team', kicker: 'VFRB Family', title: 'The people behind every order', cls: 'b', photo: P.familyCourt, pos: 'center 35%' },
  { to: '/what-we-do', kicker: 'What we do', title: 'Made in-house', cls: 'c', chips: SERVICES },
  { to: '/inside-vfrb', kicker: 'Inside VFRB', title: `${STATIONS} stations, one thread`, cls: 'd', photo: P.sewing4, pos: '30% center' },
  { to: '/about', kicker: 'About', title: 'Family-made in Muntinlupa since 2000', cls: 'e', photo: P.workers, pos: 'center 30%' },
];

export default function BentoGrid() {
  return (
    <ul className="lp-bento">
      {TILES.map((t, i) => (
        <li key={t.to} className={`lp-bento__${t.cls}`} style={{ '--i': i } as CSSProperties}>
          <Link to={t.to} className="lp-tile">
            {t.photo && <Photo photo={t.photo} pos={t.pos} hover={false} ratio="auto" className="lp-tile__ph" sizes="(min-width: 960px) 40vw, 90vw" />}
            <span className="lp-tile__tx">
              <small>{t.kicker}</small>
              <b>{t.title}</b>
              {t.chips && <span className="lp-tile__chips">{t.chips.map(c => <i key={c}>{c}</i>)}</span>}
              <span className="lp-tile__go" aria-hidden="true">&rarr;</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
