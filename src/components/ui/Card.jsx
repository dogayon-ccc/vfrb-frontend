// src/components/ui/Card.jsx
// The one card: white surface, 12px radius, resting shadow. Optional header (title, subtitle, action).
// tone: 'default' | 'subtle' (inset, no shadow) | 'attention' (amber seam: needs a decision).
// padding: 'sm' | 'md' | 'lg' | 'none'. `as` picks the element (section by default).
// Styles: .ui-card in styles/theme.css. AdminUI.Panel renders this.
import { useId } from 'react';

export default function Card({
  title, subtitle, action, tone = 'default', padding = 'md', interactive = false,
  as: Tag = 'section', children, style, bodyStyle, className = '', bodyClassName = '', ...rest
}) {
  const id = useId();
  const cls = ['ui-card', tone !== 'default' && tone, interactive && 'interactive', className].filter(Boolean).join(' ');
  const body = ['ui-card-body', padding === 'sm' ? 'sm' : padding === 'lg' ? 'lg' : padding === 'none' ? 'flush' : '', bodyClassName]
    .filter(Boolean).join(' ');
  return (
    <Tag className={cls} style={style} aria-labelledby={title && Tag === 'section' ? id : undefined} {...rest}>
      {(title || action) && (
        <div className="ui-card-head">
          <div style={{ minWidth: 0 }}>
            {title && <h2 className="ui-card-title" id={id}>{title}</h2>}
            {subtitle && <p className="ui-card-sub">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={body} style={bodyStyle}>{children}</div>
    </Tag>
  );
}
