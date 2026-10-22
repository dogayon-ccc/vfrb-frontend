// src/components/ui/Button.jsx
// ─────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// Profile.jsx (and most pages) apply the teal gradient
// `linear-gradient(135deg,${T},${T2})` to every button, primary or not —
// verified directly: both "Save Profile" and "Change Password" get the
// identical full gradient treatment, so nothing on the page reads as more
// or less important than anything else. This component makes that a
// deliberate choice instead of a default: only `variant="primary"` gets
// the gradient; everything else is flat, so primary actions actually
// stand out against them.
//
// BUG FIX (Sept 6 2026, caught before this file was ever wired into a
// page): every var(--color-*) / var(--radius-md) reference below pointed
// at custom properties that don't exist anywhere in theme.css — direct
// grep of the real token list confirms zero matches for --color-teal,
// --color-card, --color-text, --color-border, --color-danger,
// --color-faint, or --radius-md. Same root cause, same silent-failure
// mode as the Card.jsx/Badge.jsx bugs already fixed elsewhere (Sept 2).
// Remapped every reference to the real tokens below.
//
// ONE JUDGMENT CALL, flagged rather than silently picked: the disabled-
// primary-button background had no real equivalent for --color-faint in
// this context (that name was being used as a background fill here, but
// theme.css's --text-faint is a text-color token, not a background one —
// using it here would be semantically wrong even though it "fixes" the
// broken reference). Used --border-strong instead, a neutral mid-tone
// that reads as "disabled" without misusing a text token as a fill.
// Revisit if a dedicated disabled-surface token gets added to theme.css.
//
// Usage:
//   <Button variant="primary" loading={saving} onClick={saveProfile}>
//     Save changes
//   </Button>
//   <Button variant="secondary" icon="undo">Discard</Button>
//   <Button variant="danger" size="sm" icon="delete">Delete</Button>
// ─────────────────────────────────────────────────────────────────────────
import { motion } from 'framer-motion';
import { NavIcon } from './icons';

// Look lives in .ui-btn[data-v][data-size] (styles/theme.css) so a shell can theme it; `style` still overrides.
export default function Button({
  children, variant = 'secondary', size = 'md', icon, iconRight,
  loading = false, disabled = false, fullWidth = false,
  onClick, type = 'button', style, className = '', ...rest
}) {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      {...rest}
      className={`ui-btn ${className}`.trim()}
      data-v={variant}
      data-size={size}
      data-full={fullWidth || undefined}
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      whileHover={isDisabled ? {} : { scale: 1.01 }}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      style={style}>
      {loading
        ? <NavIcon name="undo" size={14} style={{ animation: 'spin .8s linear infinite' }} />
        : icon && <NavIcon name={icon} size={14} />}
      {children}
      {!loading && iconRight && <NavIcon name={iconRight} size={14} />}
    </motion.button>
  );
}
