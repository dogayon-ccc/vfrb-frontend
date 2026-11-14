// The one 3D capability badge (garment cards, Studio stage and view toggle). kind: verified | approx | none | reference.
import { Box, CheckCircle2, Eye, Square } from 'lucide-react';
import { CAP3D } from './glbSlots';

const ICON = { verified: CheckCircle2, approx: Box, none: Square, reference: Eye };
const SHORT = { verified: 'Verified 3D', approx: 'Approx. 3D', none: '2D only', reference: 'Photo only' };
export const TIER_CAP = { '2d-3d': 'verified', '2d-3d-approx': 'approx', 'editable-2d': 'none', reference: 'reference' };

export default function Capability3D({ kind, className = '', title, short = false }: any) {
  const Icon = ICON[kind] ?? Square;
  return (
    <span className={`ds-cap3d${className ? ` ${className}` : ''}`} data-cap={kind} title={title ?? (short ? CAP3D[kind] ?? CAP3D.none : undefined)}>
      <Icon size={13} strokeWidth={2.2} aria-hidden="true"/><span>{short ? SHORT[kind] ?? SHORT.none : CAP3D[kind] ?? CAP3D.none}</span>
    </span>
  );
}
