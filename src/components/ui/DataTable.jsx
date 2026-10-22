// src/components/ui/DataTable.jsx
// Card frame + horizontal scroll + sticky header for a <table>. Pass <thead>/<tbody> as children.
// loading shows skeleton rows; when isEmpty, `empty` (usually an <EmptyState/>) replaces the table.
// toolbar sits above (search, filters), footer below (pager, totals). Styles: .ui-table-card / .ui-table.
// Existing .adm-table markup gets the same head/row styling, so old lists match new ones.
// mobileCards: under 768px each row becomes a card; give each <td> a data-label for its field name.
import Skeleton from './Skeleton.jsx';

export default function DataTable({
  label, caption, toolbar, footer, loading = false, rows = 5, isEmpty = false, empty, dense = false, mobileCards = false,
  maxHeight, children, className = '', tableClassName = '',
}) {
  const cls = ['ui-table', dense && 'dense', mobileCards && 'cards', tableClassName].filter(Boolean).join(' ');
  let content;
  if (loading) {
    content = (
      <div className="ui-table-state" aria-busy="true" aria-label={label ? `Loading ${label}` : 'Loading'}>
        <Skeleton variant="block" count={rows} height={40} />
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
