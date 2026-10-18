// src/components/ui/DataTable.jsx
// Card frame + horizontal scroll + sticky header for a <table>. Pass <thead>/<tbody> as children.
// loading shows skeleton rows; when isEmpty, `empty` (usually an <EmptyState/>) replaces the table.
// toolbar sits above (search, filters), footer below (pager, totals). Styles: .ui-table-card / .ui-table.
// Existing .adm-table markup gets the same head/row styling, so old lists match new ones.
export default function DataTable({
  label, caption, toolbar, footer, loading = false, rows = 5, isEmpty = false, empty, dense = false,
  maxHeight, children, className = '', tableClassName = '',
}) {
  const cls = ['ui-table', dense && 'dense', tableClassName].filter(Boolean).join(' ');
  let content;
  if (loading) {
    content = (
      <div className="ui-table-state" aria-busy="true" aria-label={label ? `Loading ${label}` : 'Loading'}>
        {Array.from({ length: rows }, (_, i) => <div key={i} className="sk" style={{ height: 40, marginBottom: 8 }} />)}
      </div>
    );
  } else if (isEmpty) {
    content = empty;
  } else {
    content = (
      // Focusable so keyboard users can scroll a wide table sideways.
      <div className="ui-table-scroll" role="region" aria-label={label} tabIndex={0}
        style={maxHeight ? { '--ui-table-max': typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined}>
        <table className={cls}>
          {caption && <caption>{caption}</caption>}
          {children}
        </table>
      </div>
    );
  }
  return (
    <div className={`ui-table-card ${className}`.trim()}>
      {toolbar && <div className="ui-table-bar">{toolbar}</div>}
      {content}
      {footer && !loading && !isEmpty && <div className="ui-table-foot">{footer}</div>}
    </div>
  );
}
