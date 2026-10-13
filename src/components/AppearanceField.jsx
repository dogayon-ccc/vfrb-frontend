// Own appearance (GET/PATCH /api/settings/appearance): light/dark mode and accent, applied at once to this portal for any role.
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { ACCENT_PRESETS, accentIdFor, accentHexFor, loadAccent, saveAccent, saveAccentEverywhere } from '../utils/accentColor';
import { loadMode, saveMode, saveModeEverywhere, THEME_MODES } from '../utils/themeMode';

const MODES = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'system', label: 'Match device', Icon: Monitor },
  { id: 'dark', label: 'Dark', Icon: Moon },
];

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

  const run = async (apply, save) => {
    apply(); setBusy(true); setMsg({ text: '', error: false });
    const err = await save();
    setMsg(err ? { text: err, error: true } : { text: 'Saved to your account.', error: false });
    setBusy(false);
  };
  const pickMode = (id) => run(() => setMode(id), () => saveModeEverywhere(userId, id));
  const pickAccent = (p) => run(() => setAccent(p.id), () => saveAccentEverywhere(userId, p.hex));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Mode</legend>
        <div role="radiogroup" aria-label="Mode" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {MODES.map(({ id, label, Icon }) => (
            <button key={id} type="button" role="radio" aria-checked={mode === id} className={`ap-chip${mode === id ? ' on' : ''}`}
              disabled={busy} onClick={() => mode !== id && pickMode(id)}>
              <Icon size={14} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '6px 0 0' }}>
          Match device follows your phone or computer setting. The Design Studio keeps its own workspace colours.
        </p>
      </fieldset>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Accent colour</legend>
        <div role="radiogroup" aria-label="Accent colour" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {ACCENT_PRESETS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={accent === p.id} aria-label={p.name} title={p.name}
              className="ap-swatch" disabled={busy} onClick={() => accent !== p.id && pickAccent(p)} style={{ background: p.hex }}>
              {accent === p.id && <Check size={16} aria-hidden="true" />}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '6px 0 0' }}>
          Used for buttons, links and highlights. In dark mode it is lightened so text stays readable.
        </p>
      </fieldset>

      {msg.text && <p role={msg.error ? 'alert' : 'status'} style={{ fontSize: 'var(--text-xs)', margin: 0, color: msg.error ? 'var(--danger-text)' : 'var(--success-text)' }}>{msg.text}</p>}

      <style>{`
        .ap-chip{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border-radius:var(--r-full);border:1px solid var(--border);
          background:var(--bg-card);color:var(--text);font-size:var(--text-sm);font-weight:600;cursor:pointer}
        .ap-chip.on{border-color:var(--teal);background:var(--teal-50);color:var(--teal-dark)}
        .ap-swatch{width:44px;height:44px;border-radius:var(--r-full);border:2px solid var(--bg-card);box-shadow:0 0 0 1px var(--border);
          display:grid;place-items:center;color:var(--text-on-accent);cursor:pointer}
        .ap-swatch[aria-checked=true]{box-shadow:0 0 0 2px var(--text)}
        .ap-chip:focus-visible,.ap-swatch:focus-visible{outline:2px solid var(--border-focus);outline-offset:2px}
        .ap-chip:disabled,.ap-swatch:disabled{opacity:.6;cursor:not-allowed}
      `}</style>
    </div>
  );
}
