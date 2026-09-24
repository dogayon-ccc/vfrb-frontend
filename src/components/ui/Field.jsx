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
// BUG FIX (Sept 6 2026, caught before this file was ever wired into a
// page): same class of bug as Button.jsx alongside this one — every
// var(--color-*) / var(--radius-md) reference below pointed at custom
// properties that don't exist anywhere in theme.css. Remapped to the real
// tokens. Unlike Button.jsx's disabled-background case, every reference
// here maps cleanly to a real, semantically-correct token — no judgment
// calls needed in this file.
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
  as = 'input', label, error, disabled, style, children, id, ...rest
}) {
  const [focused, setFocused] = useState(false);
  // Auto id from label text when the caller doesn't pass one — keeps existing call sites working unchanged.
  const fieldId = id ?? (label ? `f-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}` : undefined);

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 'var(--r-md)',
    border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--teal)' : 'var(--border)'}`,
    background: disabled ? 'var(--bg-surface)' : 'var(--bg-card)',
    color: disabled ? 'var(--text-faint)' : 'var(--ink)',
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
        <label htmlFor={fieldId} style={{
          display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '.07em', color: 'var(--text-muted)', marginBottom: 7,
        }}>
          {label}
        </label>
      )}
      {as === 'input' ? (
        <input
          id={fieldId}
          disabled={disabled}
          style={inputStyle}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
      ) : (
        <Tag
          id={fieldId}
          disabled={disabled}
          style={inputStyle}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}>
          {children}
        </Tag>
      )}
      {error && (
        <p style={{ fontSize: 11, color: 'var(--danger)', margin: '5px 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
}
