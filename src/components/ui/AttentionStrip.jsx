// src/components/ui/AttentionStrip.jsx
// The amber band at the top of a work page: what needs a decision now, each count one tap from its list.
// items: [{ key, label, count, to?, onClick? }]. When every count is 0 it turns into a calm "all clear" line.
// This is the only element that uses the attention amber at full strength. Styles: .ui-attn in styles/theme.css.
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AttentionStrip({
  title = 'Needs attention', note, items = [], clearTitle = 'Nothing waiting', clearNote, className = '',
}) {
  const open = items.filter((i) => Number(i.count) > 0).length;
  if (!open) {
    return (
      <section className={`ui-attn clear ${className}`.trim()} aria-label={clearTitle}>
        <div className="ui-attn-head">
          <p className="ui-attn-title"><CheckCircle2 size={18} strokeWidth={2.4} aria-hidden="true" />{clearTitle}</p>
          {clearNote && <p className="ui-attn-note">{clearNote}</p>}
        </div>
      </section>
    );
  }
  return (
    <section className={`ui-attn ${className}`.trim()} aria-label={title}>
      <div className="ui-attn-head">
        <h2 className="ui-attn-title"><AlertTriangle size={18} strokeWidth={2.4} aria-hidden="true" />{title}</h2>
        {note && <p className="ui-attn-note">{note}</p>}
      </div>
      <ul className="ui-attn-items">
        {items.map((it, i) => {
          const zero = !(Number(it.count) > 0);
          const inner = <><b>{it.count ?? 0}</b><span>{it.label}</span></>;
          const common = { className: 'ui-attn-item', 'data-zero': zero || undefined };
          return (
            <li key={it.key ?? it.label} style={{ '--i': i }}>
              {it.to ? <Link to={it.to} {...common}>{inner}</Link>
                : it.onClick ? <button type="button" onClick={it.onClick} {...common}>{inner}</button>
                : <div {...common}>{inner}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
