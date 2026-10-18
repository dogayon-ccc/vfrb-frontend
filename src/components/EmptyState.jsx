// src/components/EmptyState.jsx
// One shared empty-state system for all customer pages — same isometric
// line-art style, same teal palette, same layout. Started as Orders.jsx's
// local component; Messages.jsx's bare emoji+text state (Sept 20 audit)
// is why this got extracted instead of duplicated a third time.
import UiEmptyState from './ui/EmptyState';

const T = 'var(--teal)', T2 = 'var(--teal-2)';
const PAPER = 'var(--bg-card)', SHADOW = 'var(--bg-surface-2)', TINT = 'var(--teal-50)';

// Isometric box + design cursor + "Design it!" bubble — orders/design-studio contexts.
function BoxIllustration() {
  return (
    <svg viewBox="0 0 200 160" width="160" height="128" style={{ display:'block', margin:'0 auto', opacity:.88, maxWidth:'100%' }}>
      <rect x="20" y="118" width="160" height="10" rx="4" fill={SHADOW}/>
      <rect x="50" y="64" width="100" height="58" rx="10" fill={T} opacity=".12"/>
      <rect x="50" y="64" width="100" height="58" rx="10" fill="none" stroke={T} strokeWidth="2"/>
      <rect x="68" y="44" width="64" height="26" rx="7" fill={T} opacity=".18"/>
      <rect x="68" y="44" width="64" height="26" rx="7" fill="none" stroke={T} strokeWidth="1.5"/>
      <line x1="100" y1="70" x2="100" y2="92" stroke={T} strokeWidth="2" strokeLinecap="round"/>
      <ellipse cx="100" cy="92" rx="2" ry="3" fill={T2} opacity=".8"/>
      <ellipse cx="116" cy="44" rx="8" ry="5" fill={T2} opacity=".7"/>
      <rect x="110" y="36" width="12" height="8" rx="2" fill={T2} opacity=".5"/>
      <ellipse cx="116" cy="36" rx="8" ry="5" fill={T2} opacity=".7"/>
      <circle cx="144" cy="86" r="12" fill={PAPER} stroke={T} strokeWidth="2"/>
      <circle cx="144" cy="86" r="5" fill={T} opacity=".25"/>
      {[0,60,120,180,240,300].map(deg => {
        const rad = (deg * Math.PI) / 180;
        return <line key={deg} x1={144 + 5*Math.cos(rad)} y1={86 + 5*Math.sin(rad)}
          x2={144 + 11*Math.cos(rad)} y2={86 + 11*Math.sin(rad)} stroke={T} strokeWidth="1.2" opacity=".5"/>;
      })}
      <rect x="60" y="112" width="80" height="8" rx="3" fill={T2} opacity=".2"/>
      <rect x="60" y="112" width="80" height="8" rx="3" fill="none" stroke={T} strokeWidth="1" opacity=".3"/>
      {[68,76,84,92,100,108,116,124,132].map(x => <circle key={x} cx={x} cy="116" r="1.5" fill={T} opacity=".4"/>)}
      <rect x="112" y="12" width="64" height="26" rx="9" fill={TINT} stroke={T2} strokeWidth="1.5"/>
      <polygon points="128,38 136,38 130,46" fill={TINT} stroke={T2} strokeWidth="1"/>
      <line x1="129" y1="38" x2="135" y2="38" stroke={TINT} strokeWidth="1.5"/>
      <text x="144" y="29" textAnchor="middle" fontSize="10" fontWeight="700" fill={T} fontFamily="var(--font)">Design it!</text>
    </svg>
  );
}

// Same box motif with a chat bubble emerging — ties "no orders" to "nothing to message about",
// so a user who's seen the Orders empty state recognizes this one instead of two unrelated pictures.
function MessageLockedIllustration() {
  return (
    <svg viewBox="0 0 200 160" width="160" height="128" style={{ display:'block', margin:'0 auto', opacity:.88, maxWidth:'100%' }}>
      <rect x="30" y="120" width="140" height="10" rx="4" fill={SHADOW}/>
      <rect x="55" y="70" width="90" height="52" rx="10" fill={T} opacity=".12"/>
      <rect x="55" y="70" width="90" height="52" rx="10" fill="none" stroke={T} strokeWidth="2"/>
      <line x1="55" y1="88" x2="145" y2="88" stroke={T} strokeWidth="1.2" opacity=".4"/>
      <rect x="112" y="26" width="64" height="40" rx="12" fill={PAPER} stroke={T2} strokeWidth="2"/>
      <polygon points="120,66 130,66 122,78" fill={PAPER} stroke={T2} strokeWidth="2"/>
      <line x1="121" y1="67" x2="129" y2="67" stroke={PAPER} strokeWidth="2"/>
      {[[126,40],[144,40],[162,40]].map(([cx,cy]) => <circle key={cx} cx={cx} cy={cy} r="3" fill={T2} opacity=".7"/>)}
      <circle cx="70" cy="96" r="10" fill={PAPER} stroke={T} strokeWidth="1.5" opacity=".5"/>
      <path d="M65 96 l3.5 3.5 L76 92" fill="none" stroke={T} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".4"/>
    </svg>
  );
}

// Simple pick-a-thread hint — used when orders exist but no conversation is selected yet.
function SelectThreadIllustration() {
  return (
    <svg viewBox="0 0 200 160" width="120" height="96" style={{ display:'block', margin:'0 auto', opacity:.7, maxWidth:'100%' }}>
      <rect x="40" y="46" width="120" height="68" rx="14" fill={T} opacity=".08"/>
      <rect x="40" y="46" width="120" height="68" rx="14" fill="none" stroke={T} strokeWidth="2"/>
      <polygon points="76,114 90,114 76,128" fill={T} opacity=".08" stroke={T} strokeWidth="2"/>
      {[62,80,98].map((y,i) => <rect key={y} x="56" y={y} width={i===2?60:88} height="8" rx="4" fill={T} opacity=".18"/>)}
    </svg>
  );
}

// Load-failed state — deliberately distinct from BoxIllustration so a failed fetch never
// looks identical to a genuine "you have no orders yet". Same line-art language/palette,
// warning-triangle motif instead of the box, red-leaning stroke so it reads as a fault, not content.
function ErrorIllustration() {
  return (
    <svg viewBox="0 0 200 160" width="120" height="96" style={{ display:'block', margin:'0 auto', opacity:.88, maxWidth:'100%' }}>
      <circle cx="100" cy="80" r="52" fill="var(--danger-bg)" stroke="var(--danger-border)" strokeWidth="2"/>
      <path d="M100 56 L100 90" stroke="var(--danger)" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="100" cy="104" r="4" fill="var(--danger)"/>
    </svg>
  );
}

const ILLUSTRATIONS = { order:BoxIllustration, 'message-locked':MessageLockedIllustration, 'select-thread':SelectThreadIllustration, error:ErrorIllustration };

// Illustrated variant of the shared empty state (ui/EmptyState): same frame, type and button as everywhere else.
export default function EmptyState({ illustration='order', headline, sub, cta, maxWidth=420, compact=false }) {
  const Illustration = ILLUSTRATIONS[illustration] ?? BoxIllustration;
  return (
    <UiEmptyState boxed compact={compact} art={<Illustration/>} title={headline}
      tone={illustration === 'error' ? 'error' : 'default'} style={{ maxWidth, margin:'0 auto' }}
      action={cta && <button type="button" className="cx-btn cx-btn-p" onClick={cta.onClick}>{cta.label}</button>}>
      {sub}
    </UiEmptyState>
  );
}
