// src/components/ui/Field.jsx
// ─────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// Profile.jsx defines its own `lbl`/`inp`/`fi`/`fo` style objects and focus
// handlers at the top of the file. That pattern is copy-pasted into most
// other form pages in this app with the same values retyped each time —
// so a focus-ring color change today means finding and editing it in every
// page individually. This component is the single implementation; pages
// import it instead of re-declaring the same style objects.
//
// Usage:
//   <Field label="Contact Number" value={form.contact_number}
//     onChange={e => set('contact_number', e.target.value)}
//     placeholder="09XXXXXXXXX"/>
//
//   <Field as="select" label="Client Type" value={form.client_type}
//     onChange={e => set('client_type', e.target.value)}>
//     {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
//   </Field>
// ─────────────────────────────────────────────────────────────────────────
import { useState } from 'react';

export default function Field({
  as = 'input', label, error, disabled, style, children, ...rest
}) {
  const [focused, setFocused] = useState(false);

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-md)',
    border: `1px solid ${error ? 'var(--color-danger)' : focused ? 'var(--color-teal)' : 'var(--color-border)'}`,
    background: disabled ? 'var(--color-surface)' : 'var(--color-card)',
    color: disabled ? 'var(--color-faint)' : 'var(--color-text)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
    boxShadow: focused && !error ? '0 0 0 3px rgba(2,128,144,.10)' : 'none',
    transition: 'border-color .15s, box-shadow .15s',
    cursor: disabled ? 'not-allowed' : (as === 'select' ? 'pointer' : 'text'),
    ...style,
  };

  const Tag = as; // 'input' | 'select' | 'textarea'

  return (
    <div>
      {label && (
        <label style={{
          display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '.07em', color: 'var(--color-muted)', marginBottom: 7,
        }}>
          {label}
        </label>
      )}
      {as === 'input' ? (
        <input
          disabled={disabled}
          style={inputStyle}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
      ) : (
        <Tag
          disabled={disabled}
          style={inputStyle}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}>
          {children}
        </Tag>
      )}
      {error && (
        <p style={{ fontSize: 11, color: 'var(--color-danger)', margin: '5px 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
}
