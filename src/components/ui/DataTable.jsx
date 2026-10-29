// src/components/ui/DataTable.jsx
// Card frame + horizontal scroll + sticky header for a <table>. Pass <thead>/<tbody> as children.
// loading shows skeleton rows; when isEmpty, `empty` (usually an <EmptyState/>) replaces the table.
// toolbar sits above (search, filters), footer below (pager, totals). Styles: .ui-table-card / .ui-table.
// Existing .adm-table markup gets the same head/row styling, so old lists match new ones.
// mobileCards: under 768px each row becomes a card; give each <td> a data-label for its field name.
// Comfortable/Compact toggle is one per-viewer choice for every table; `dense` is the default until they pick.
import { useEffect, useState } from 'react';
import Skeleton from './Skeleton.jsx';

const DENSITY_KEY = 'vfrb.tableDensity';
const DENSITY_EVENT = 'vfrb:table-density';
const readDensity = () => { try { return localStorage.getItem(DENSITY_KEY); } catch { return null; } };

function useDensity(dense) {
  const [saved, setSaved] = useState(readDensity);
  useEffect(() => {
    const sync = () => setSaved(readDensity());
    window.addEventListener(DENSITY_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(DENSITY_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const choose = (v) => {
    try { localStorage.setItem(DENSITY_KEY, v); } catch { /* storage blocked: keep it for this table only */ }
    setSaved(v);
    window.dispatchEvent(new Event(DENSITY_EVENT));
  };
  const value = saved === 'compact' || saved === 'comfortable' ? saved : dense ? 'compact' : 'comfortable';
  return [value, choose];
}

function DensityToggle({ value, onChange, hideOnCards }) {
  return (
    <div className={`ui-density${hideOnCards ? ' cards-hide' : ''}`} role="group" aria-label="Row density">
      {[['comfortable', 'Comfortable'], ['compact', 'Compact']].map(([k, l]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>
      ))}
    </div>
  );
}

export default function DataTable({
  label, caption, toolbar, footer, loading = false, rows = 5, isEmpty = false, empty, dense = false, mobileCards = false,
  densityToggle = true, maxHeight, children, className = '', tableClassName = '',
}) {
  const [density, setDensity] = useDensity(dense);
  const showToggle = densityToggle && !isEmpty;
  const cls = ['ui-table', density === 'compact' && 'dense', mobileCards && 'cards', tableClassName].filter(Boolean).join(' ');
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
      {(toolbar || showToggle) && (
        <div className={`ui-table-bar${toolbar ? '' : ' only-density'}${!toolbar && mobileCards ? ' cards-hide' : ''}`}>
          {toolbar}
          {showToggle && <DensityToggle value={density} onChange={setDensity} hideOnCards={mobileCards} />}
        </div>
      )}
      {content}
      {footer && !loading && !isEmpty && <div className="ui-table-foot">{footer}</div>}
    </div>
  );
}
