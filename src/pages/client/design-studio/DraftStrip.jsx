// Account draft offer: an in-flow strip under the bar (never over menus or the stage); restoring over existing work asks first.
import { useState } from 'react';
import { History, X } from 'lucide-react';
import { garmentLabel } from '../../../utils/designName';

export default function DraftStrip({ draft, hasWork, onRestore, onDismiss }) {
  const [confirm, setConfirm] = useState(false);
  const name = garmentLabel(draft.label || draft.studio_config?.name || draft.studio_config?.garment);
  return (
    <div className="ds-draft" role="region" aria-label="Unfinished design">
      <History size={16} strokeWidth={2} aria-hidden="true" />
      <p>{confirm ? 'Replace your current work with the saved design?' : <>You have an unfinished design{name ? <>: <strong>{name}</strong></> : ''}.</>}</p>
      {confirm ? (
        <>
          <button type="button" className="ds-draft-go" onClick={onRestore}>Replace</button>
          <button type="button" className="ds-draft-alt" onClick={() => setConfirm(false)}>Keep mine</button>
        </>
      ) : (
        <>
          <button type="button" className="ds-draft-go" onClick={() => (hasWork ? setConfirm(true) : onRestore())}>Restore</button>
          <button type="button" className="ds-draft-x" aria-label="Dismiss, start a new design" onClick={onDismiss}><X size={18} strokeWidth={2} aria-hidden="true" /></button>
        </>
      )}
    </div>
  );
}
