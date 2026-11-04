// Account draft offer: an in-flow strip under the bar (never over menus or the stage); restoring over work or discarding asks first.
import { useState } from 'react';
import { History, X } from 'lucide-react';
import { garmentLabel } from '../../../utils/designName';

export default function DraftStrip({ draft, hasWork, onRestore, onDismiss, onDiscard }) {
  const [ask, setAsk] = useState(null); // 'replace' | 'discard'
  const name = garmentLabel(draft.label || draft.studio_config?.name || draft.studio_config?.garment);
  return (
    <div className="ds-draft" role="region" aria-label="Unfinished design">
      <History size={16} strokeWidth={2} aria-hidden="true" />
      <p>{ask === 'replace' ? 'Replace your current work with the saved design?'
        : ask === 'discard' ? 'Discard this draft? It cannot be restored.'
        : <>You have an unfinished design{name ? <>: <strong>{name}</strong></> : ''}. Starting a new one replaces it.</>}</p>
      {ask ? (
        <>
          <button type="button" className="ds-draft-go" onClick={ask === 'replace' ? onRestore : onDiscard}>{ask === 'replace' ? 'Replace' : 'Discard'}</button>
          <button type="button" className="ds-draft-alt" onClick={() => setAsk(null)}>{ask === 'replace' ? 'Keep mine' : 'Keep draft'}</button>
        </>
      ) : (
        <>
          <button type="button" className="ds-draft-go" onClick={() => (hasWork ? setAsk('replace') : onRestore())}>Restore</button>
          <button type="button" className="ds-draft-alt" onClick={() => setAsk('discard')}>Discard</button>
          <button type="button" className="ds-draft-x" aria-label="Hide, start a new design" onClick={onDismiss}><X size={18} strokeWidth={2} aria-hidden="true" /></button>
        </>
      )}
    </div>
  );
}
