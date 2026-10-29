// src/components/ui/PageHeader.jsx
// The one page header: optional eyebrow, title, subtitle and meta line, actions on the right; `stitched` adds a stitch rule below.
// AdminUI.PageHeader and kit.PageHeader render this. Styles: .ui-head in styles/theme.css.
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function PageHeader({ title, eyebrow, subtitle, meta, actions, back, stitched = false, className = '', children }) {
  const act = actions ?? children;
  return (
    <header className={['ui-head', stitched && 'is-stitched', className].filter(Boolean).join(' ')}>
      <div className="ui-head-txt">
        {back && (
          <Link className="ui-head-back" to={back.to}>
            <ChevronLeft size={16} strokeWidth={2.2} aria-hidden="true" />{back.label}
          </Link>
        )}
        {eyebrow && <p className="ui-head-eyebrow">{eyebrow}</p>}
        <h1 className="ui-title">{title}</h1>
        {subtitle && <p className="ui-sub">{subtitle}</p>}
        {meta && <div className="ui-head-meta">{meta}</div>}
      </div>
      {act && <div className="ui-head-actions">{act}</div>}
    </header>
  );
}
