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
// Usage:
//   <Button variant="primary" loading={saving} onClick={saveProfile}>
//     Save changes
//   </Button>
//   <Button variant="secondary" icon="undo">Discard</Button>
//   <Button variant="danger" size="sm" icon="delete">Delete</Button>
// ─────────────────────────────────────────────────────────────────────────
import { motion } from 'framer-motion';
import { NavIcon } from './icons';

const VARIANTS = {
  primary: {
    base: 'linear-gradient(135deg, var(--color-teal), var(--color-teal-light))',
    color: '#fff', border: 'none', shadow: '0 4px 14px rgba(2,128,144,.25)',
  },
  secondary: {
    base: 'var(--color-card)', color: 'var(--color-text)',
    border: '1px solid var(--color-border)', shadow: 'none',
  },
  ghost: {
    base: 'transparent', color: 'var(--color-teal)', border: 'none', shadow: 'none',
  },
  danger: {
    base: 'var(--color-danger)', color: '#fff', border: 'none',
    shadow: '0 4px 14px rgba(239,68,68,.22)',
  },
};

const SIZES = {
  sm: { padding: '7px 12px', fontSize: 12, minHeight: 36 },
  md: { padding: '11px 16px', fontSize: 13, minHeight: 44 },
  lg: { padding: '13px 20px', fontSize: 14, minHeight: 48 },
};

export default function Button({
  children, variant = 'secondary', size = 'md', icon, iconRight,
  loading = false, disabled = false, fullWidth = false,
  onClick, type = 'button', style,
}) {
  const v = VARIANTS[variant] ?? VARIANTS.secondary;
  const s = SIZES[size] ?? SIZES.md;
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      whileHover={isDisabled ? {} : { scale: 1.01 }}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        width: fullWidth ? '100%' : 'auto',
        padding: s.padding, fontSize: s.fontSize, minHeight: s.minHeight,
        borderRadius: 'var(--radius-md)', fontWeight: 700,
        background: isDisabled && variant === 'primary' ? 'var(--color-faint)' : v.base,
        color: v.color, border: v.border,
        boxShadow: isDisabled ? 'none' : v.shadow,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'filter .15s',
        ...style,
      }}>
      {loading
        ? <NavIcon name="undo" size={14} style={{ animation: 'spin .8s linear infinite' }} />
        : icon && <NavIcon name={icon} size={14} />}
      {children}
      {!loading && iconRight && <NavIcon name={iconRight} size={14} />}
    </motion.button>
  );
}
