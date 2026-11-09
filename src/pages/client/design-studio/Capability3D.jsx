// The one 3D capability badge (garment cards, Studio stage and view toggle). kind: verified | approx | none | reference.
import { Box, CheckCircle2, Eye, Square } from 'lucide-react';
import { CAP3D } from './glbSlots';

const ICON = { verified: CheckCircle2, approx: Box, none: Square, reference: Eye };
export const TIER_CAP = { '2d-3d': 'verified', '2d-3d-approx': 'approx', 'editable-2d': 'none', reference: 'reference' };

export default function Capability3D({ kind, className = '', title }) {
  const Icon = ICON[kind] ?? Square;
  return (
    <span className={`ds-cap3d${className ? ` ${className}` : ''}`} data-cap={kind} title={title}>
      <Icon size={13} strokeWidth={2.2} aria-hidden="true"/><span>{CAP3D[kind] ?? CAP3D.none}</span>
    </span>
  );
}
