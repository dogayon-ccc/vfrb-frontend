// Shared colour controls for the Colours and Garment panels: a compact grid of named swatch dots, and a custom swatch with a hex field.
import { useEffect, useState } from 'react';
import { SwatchChip } from '../../../components/customer/kit';
import { PH_SWATCHES } from './dsShared';

const same = (a, b) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase();
// The swatch name of a colour, or "Custom" for any other hex.
export const colourName = hex => PH_SWATCHES.find(s => same(s.hex, hex))?.name ?? (hex ? 'Custom' : 'Not set');

export function SwatchGrid({ label, current, onPick }) {
  return (
    <ul className="ds-swatch-dots" aria-label={`${label} colour`}>
      {PH_SWATCHES.map(s => <li key={s.hex}><SwatchChip size="dot" color={s.hex} name={s.name} selected={same(current, s.hex)} onSelect={() => onPick(s.hex)}/></li>)}
    </ul>
  );
}

// Custom colour: the native colour swatch plus a typed hex value; a value is applied only once it is a full #RRGGBB.
export function CustomColor({ label, current, onPick }) {
  const [text, setText] = useState(current ?? '');
  useEffect(() => { setText(current ?? ''); }, [current]);
  const commit = v => { const h = v.trim().replace(/^([^#])/, '#$1'); if (/^#[0-9a-f]{6}$/i.test(h)) onPick(h.toLowerCase()); };
  const valid = /^#?[0-9a-f]{6}$/i.test(text.trim());
  return (
    <div className="ds-custom">
      <input type="color" className="ds-custom-sw" aria-label={`${label}: custom colour`} value={/^#[0-9a-f]{6}$/i.test(current ?? '') ? current : '#1e3a5f'}
        onChange={e => onPick(e.target.value)}/>
      <label className="ds-custom-hex">
        <span>Hex</span>
        <input type="text" inputMode="text" maxLength={7} spellCheck={false} value={text} aria-invalid={!valid || undefined}
          onChange={e => { setText(e.target.value); commit(e.target.value); }} onBlur={() => setText(current ?? '')}/>
      </label>
    </div>
  );
}
