
// Own appearance (GET/PATCH /api/settings/appearance): light/dark mode and accent, applied at once to this portal for any role.
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { ACCENT_PRESETS, accentIdFor, accentHexFor, loadAccent, saveAccent, saveAccentEverywhere } from '../utils/accentColor';
import { loadMode, saveMode, saveModeEverywhere, THEME_MODES } from '../utils/themeMode';

const MODES = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'system', label: 'Match device', Icon: Monitor },
  { id: 'dark', label: 'Dark', Icon: Moon },
];
const ARROWS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

// ARIA radio group: one tab stop, arrows move and select. aria-disabled (not disabled) keeps keyboard focus while saving.
const RadioGroup = memo(function RadioGroup({ label, options, value, onChange, busy, renderOption, gap }) {
  const refs = useRef({});
  const onKey = (e) => {
    const step = ARROWS[e.key];
    if (!step || busy) return;
    e.preventDefault();
    const i = options.findIndex((o) => o.id === value);
    const next = options[(i + step + options.length) % options.length];
    onChange(next);
    refs.current[next.id]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} style={{ display: 'flex', gap, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button key={o.id} ref={(el) => { refs.current[o.id] = el; }} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
            aria-disabled={busy || undefined} onClick={() => !busy && !on && onChange(o)} {...renderOption(o, on)} />
        );
      })}
    </div>
  );
});

const modeOption = ({ label, Icon }, on) => ({ className: `ap-chip${on ? ' on' : ''}`, children: <><Icon size={14} aria-hidden="true" /> {label}</> });
const accentOption = (p, on) => ({ className: 'ap-swatch', 'aria-label': p.name, title: p.name, style: { background: p.hex }, children: on && <Check size={16} aria-hidden="true" /> });

// Controlled pickers: value + onChange only, so the parent owns the state and they skip re-renders when unrelated state changes.
export const ModePicker = memo(function ModePicker({ value, onChange, busy }) {
  return <RadioGroup label="Mode" options={MODES} value={value} onChange={onChange} busy={busy} renderOption={modeOption} gap={8} />;
});
export const AccentColorPicker = memo(function AccentColorPicker({ value, onChange, busy }) {
  return <RadioGroup label="Accent colour" options={ACCENT_PRESETS} value={value} onChange={onChange} busy={busy} renderOption={accentOption} gap={10} />;
});

export default function AppearanceField({ userId }) {
  const [mode, setMode] = useState(() => loadMode(userId));
  const [accent, setAccent] = useState(() => accentIdFor(loadAccent(userId)));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', error: false });

  // The account copy wins over this device (another device may have changed it).
  useEffect(() => {
    axios.get('/api/settings/appearance').then((r) => {
      const m = r.data?.theme_mode, a = r.data?.theme_accent;
      if (THEME_MODES.includes(m) && m !== loadMode(userId)) { setMode(m); saveMode(userId, m); }
      if (a && a !== accentIdFor(loadAccent(userId))) { setAccent(a); saveAccent(userId, accentHexFor(a)); }
    }).catch(() => {});
  }, [userId]);

  // save*Everywhere stores the choice and fires the event useAppearance repaints from: the single source of truth for <html>.
  const run = useCallback(async (apply, save) => {
    apply(); setBusy(true); setMsg({ text: '', error: false });
    const err = await save();
    setMsg(err ? { text: err, error: true } : { text: 'Saved to your account.', error: false });
    setBusy(false);
  }, []);
  const pickMode = useCallback((m) => run(() => setMode(m.id), () => saveModeEverywhere(userId, m.id)), [run, userId]);
  const pickAccent = useCallback((p) => run(() => setAccent(p.id), () => saveAccentEverywhere(userId, p.hex)), [run, userId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-busy={busy || undefined}>
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Mode</legend>
        <ModePicker value={mode} onChange={pickMode} busy={busy} />
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '6px 0 0' }}>
          Match device follows your phone or computer setting. The Design Studio keeps its own workspace colours.
        </p>
      </fieldset>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Accent colour</legend>
        <AccentColorPicker value={accent} onChange={pickAccent} busy={busy} />
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '6px 0 0' }}>
          Used for buttons, links and highlights. In dark mode it is lightened so text stays readable.
        </p>
      </fieldset>

      <p role={msg.error ? 'alert' : 'status'} style={{ fontSize: 'var(--text-xs)', margin: 0, minHeight: '1.4em', color: msg.error ? 'var(--danger-text)' : 'var(--success-text)' }}>{msg.text}</p>

      <style>{`
        .ap-chip{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border-radius:var(--r-full);border:1px solid var(--border);
          background:var(--bg-card);color:var(--text);font-size:var(--text-sm);font-weight:600;cursor:pointer;transition:border-color .15s,background .15s}
        .ap-chip.on{border-color:var(--teal);background:var(--teal-50);color:var(--teal-dark)}
        .ap-swatch{width:44px;height:44px;border-radius:var(--r-full);border:2px solid var(--bg-card);box-shadow:0 0 0 1px var(--border);
          display:grid;place-items:center;color:var(--text-on-accent);cursor:pointer}
        .ap-swatch[aria-checked=true]{box-shadow:0 0 0 2px var(--text)}
        .ap-chip:focus-visible,.ap-swatch:focus-visible{outline:2px solid var(--border-focus);outline-offset:2px}
        .ap-chip[aria-disabled=true],.ap-swatch[aria-disabled=true]{opacity:.6;cursor:progress}
        @media(prefers-reduced-motion:reduce){.ap-chip{transition:none}}
      `}</style>
    </div>
  );
}
