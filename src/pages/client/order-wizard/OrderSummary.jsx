// Live order summary: a sticky side panel on desktop, a bar that opens a sheet on phones and tablets.
import { useState } from 'react';
import BottomSheet from '../../../components/ui/BottomSheet';
import { NavIcon } from '../../../components/ui';
import { orderQty, MIN_ORDER_QTY } from '../../../utils/orderQuantity';
import { ROLE_LABEL } from '../design-studio/uniformSet';
import { useObjectUrl } from '../../../hooks/useObjectUrl';
import { garmentLabel } from '../../../utils/designName';

function Thumb({ form, studio }) {
  const ref = useObjectUrl(!studio && form.design_ref_file?.type?.startsWith('image/') ? form.design_ref_file : null);
  const src = studio?.previewPng ?? ref;
  return (
    <span className="wz-sthumb" style={!src && studio?.colors?.body ? { background: studio.colors.body } : undefined}>
      {src ? <img src={src} alt=""/> : <NavIcon name="garmentType" size={20}/>}
    </span>
  );
}

const total = forms => forms.reduce((a, f) => a + orderQty(f), 0);
const qtyLabel = q => (q ? `${q} pcs${q < MIN_ORDER_QTY ? ` (min ${MIN_ORDER_QTY})` : ''}` : 'Not set');

function SummaryBody({ forms, studios }) {
  const shared = forms[0], isSet = forms.length > 1;
  const rows = [
    ...(isSet ? [['Set total', qtyLabel(total(forms))]] : []),
    ['Preferred date', shared.deadline], ['Fabric', shared.fabric_type], ['Deliver to', shared.delivery_method === 'pickup' ? 'Pick up at VFRB' : shared.delivery_address], ['PO reference', shared.po_reference],
  ].filter(([, v]) => v);
  return (
    <div className="wz-sbody">
      {forms.map((f, i) => (
        <div key={i} className="wz-spiece">
          <Thumb form={f} studio={studios[i]}/>
          <p>
            {isSet && <small>{ROLE_LABEL[studios[i]?.uniformSet?.role] ?? `Piece ${i + 1}`}</small>}
            <strong>{garmentLabel(f.garment_type) || 'Garment not chosen'}</strong>
            <span>{[studios[i] ? 'Studio design' : f.design_ref_file ? 'Your file' : null, f.color].filter(Boolean).join(' · ')}</span>
            <span>{qtyLabel(orderQty(f))}</span>
          </p>
        </div>
      ))}
      {rows.length > 0 && <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
    </div>
  );
}

export function SummaryPanel(props) {
  return (
    <aside className="cx-card wz-sum" aria-label="Order summary">
      <div className="cx-card-h"><h2>Order summary</h2></div>
      <SummaryBody {...props}/>
    </aside>
  );
}

export function SummaryBar({ forms, studios }) {
  const [open, setOpen] = useState(false);
  const name = forms.map(f => garmentLabel(f.garment_type)).filter(Boolean).join(' + ') || 'Your order';
  return (
    <>
      <button type="button" className="wz-sbar" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Thumb form={forms[0]} studio={studios[0]}/>
        <span className="wz-sbar-t"><strong>{name}</strong><span>{qtyLabel(total(forms))}</span></span>
        <span className="wz-sbar-l">Summary</span>
      </button>
      {open && <BottomSheet title="Order summary" onClose={() => setOpen(false)} isMobile><SummaryBody forms={forms} studios={studios}/></BottomSheet>}
    </>
  );
}
