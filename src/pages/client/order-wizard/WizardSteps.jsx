// The four Order Wizard steps. Styles: .wz-* in styles/customer.css.
import { useRef, useState } from 'react';
import DesignPreview from '../../../components/DesignPreview';
import SizeChartTable from '../../../components/SizeChartTable';
import SizeProportions from '../design-studio/SizeProportions';
import { Button, Field, NavIcon } from '../../../components/ui';
import { checkUpload } from '../../../utils/fileCheck';
import { useReferenceRules } from '../../../utils/uploadRules';
import { useObjectUrl } from '../../../hooks/useObjectUrl';
import { STD_SIZES, MIN_ORDER_QTY, orderQty, qtyShort } from '../../../utils/orderQuantity';
import { FABRIC_TYPES, GARMENTS, MEASURES, garmentOf, minDeadline } from './orderForm';
import { garmentLabel } from '../../../utils/designName';

const isImage = f => !!f?.type?.startsWith('image/');
const Err = ({ id, children }) => (children ? <p id={id} className="wz-error" role="alert"><NavIcon name="warning" size={13}/> {children}</p> : null);

function RefFile({ file, error, onPick, onRemove }) {
  const input = useRef(null);
  const url = useObjectUrl(isImage(file) ? file : null);
  const [msg, setMsg] = useState('');
  const rules = useReferenceRules();
  const pick = async e => {
    const f = e.target.files?.[0] ?? null;
    const m = await checkUpload(f, rules);
    setMsg(m); e.target.value = '';
    if (!m && f) onPick(f);
  };
  return (
    <div className="wz-ref" data-error={!!(msg || error) || undefined}>
      {file ? (
        <div className="wz-ref-file">
          {url ? <img src={url} alt="" /> : <span className="wz-ref-ic"><NavIcon name="attachment" size={22}/></span>}
          <p><strong>{file.name}</strong><span>Sent with your order as the design reference.</span></p>
          <Button size="sm" onClick={() => input.current?.click()}>Change</Button>
          {onRemove && <Button size="sm" onClick={onRemove}>Remove</Button>}
        </div>
      ) : (
        <button type="button" className="wz-drop" onClick={() => input.current?.click()} aria-describedby="wz-ref-err">
          <NavIcon name="attachment" size={22}/><strong>Upload your design or a reference photo</strong><span>{rules.label}</span>
        </button>
      )}
      <input ref={input} type="file" hidden accept={rules.accept} onChange={pick} aria-label="Reference image or PDF"/>
      <Err id="wz-ref-err">{msg || error}</Err>
    </div>
  );
}

export function StepDesign({ form, set, errors, studio, onOpenStudio, title, uid }) {
  if (studio) return (
    <div className="wz-stack">
      {title && <h2 className="wz-piece-h">{title}</h2>}
      <div className="wz-stage"><DesignPreview cfg={studio} previewUrl={studio.previewPng ?? null} height={300}/></div>
      <div className="wz-design-row">
        <p><strong>{garmentLabel(studio.name || garmentOf(studio))}</strong><span>{[garmentLabel(garmentOf(studio)), form.sleeve_type, form.color].filter(Boolean).join(' · ')}</span></p>
        <Button icon="designStudio" onClick={onOpenStudio}>Edit in Studio</Button>
      </div>
      <p className="wz-lead">Your Studio design is attached as it is. Change it in the Studio, not here.</p>
      {form.design_ref_file && <RefFile file={form.design_ref_file} onPick={f => set('design_ref_file', f)} onRemove={() => set('design_ref_file', null)}/>}
      <Field id={`${uid}-extra`} as="textarea" rows={3} label="Anything VFRB should know about the design? (optional)" value={form.extra_notes}
        onChange={e => set('extra_notes', e.target.value)} placeholder="e.g. embroider the logo instead of printing it"/>
    </div>
  );
  return (
    <div className="wz-stack">
      <div className="wz-choice">
        <p><strong>No design yet?</strong><span>Design it in the Studio and it comes back here ready to order.</span></p>
        <Button variant="primary" icon="designStudio" onClick={onOpenStudio}>Open Design Studio</Button>
      </div>
      <p className="wz-or"><span>or order from your own file</span></p>
      <RefFile file={form.design_ref_file} error={errors.design_ref_file} onPick={f => set('design_ref_file', f)} onRemove={() => set('design_ref_file', null)}/>
      <Field as="select" label="Garment" value={form.garment_type} error={errors.garment_type} onChange={e => set('garment_type', e.target.value)}>
        <option value="">Choose a garment</option>
        <optgroup label="Tops">{GARMENTS.top.map(g => <option key={g}>{g}</option>)}</optgroup>
        <optgroup label="Bottoms">{GARMENTS.bottom.map(g => <option key={g}>{g}</option>)}</optgroup>
      </Field>
      <Field as="textarea" rows={4} label="Describe the design" value={form.client_design_notes} error={errors.client_design_notes}
        onChange={e => set('client_design_notes', e.target.value)} placeholder="Colors, logo placement, collar and sleeve style, anything the file doesn't show"/>
    </div>
  );
}

function Stepper({ label, value, onChange }) {
  const commit = raw => { const n = parseInt(String(raw).replace(/\D/g, ''), 10); onChange(Math.min(99999, Number.isFinite(n) ? n : 0)); };
  return (
    <div className="wz-cell" data-on={value > 0 || undefined}>
      <span className="wz-cell-l">{label}</span>
      <div className="wz-stp">
        <button type="button" className="wz-stp-b" aria-label={`Remove one ${label}`} disabled={!value} onClick={() => onChange(value - 1)}>−</button>
        <input className="wz-stp-i" inputMode="numeric" pattern="[0-9]*" aria-label={`${label} pieces`} value={value} onFocus={e => e.target.select()} onChange={e => commit(e.target.value)}/>
        <button type="button" className="wz-stp-b" aria-label={`Add one ${label}`} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}

export function QtyMeter({ form }) {
  const total = orderQty(form), short = qtyShort(form);
  return (
    <div className="wz-qty" data-ok={!short} role="status" aria-live="polite">
      <div className="wz-qty-row"><span>Total</span><strong>{total} pcs</strong></div>
      <div className="wz-qty-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, (total / MIN_ORDER_QTY) * 100)}%` }}/></div>
      <p>{short ? `${short} more to reach the ${MIN_ORDER_QTY}-piece minimum.` : `Meets the ${MIN_ORDER_QTY}-piece minimum.`}</p>
    </div>
  );
}

export function StepSizes({ form, set, errors, studio, kind, title, uid }) {
  const custom = form.sizing_type === 'custom';
  return (
    <div className="wz-stack">
      {title && <h2 className="wz-piece-h">{title}</h2>}
      {studio?.colors?.body ? (
        <p className="wz-color"><i style={{ background: studio.colors.body }} aria-hidden="true"/>Color from your design: <strong>{form.color}</strong></p>
      ) : (
        <Field id={`${uid}-color`} label="Main color" value={form.color} error={errors.color} onChange={e => set('color', e.target.value)} placeholder="e.g. Navy Blue"/>
      )}
      <div className="wz-seg" role="group" aria-label="Sizing method">
        {[['standard', 'Standard sizes'], ['custom', 'Custom measurements']].map(([v, l]) => (
          <button key={v} type="button" aria-pressed={form.sizing_type === v} onClick={() => set('sizing_type', v)}>{l}</button>
        ))}
      </div>
      {!custom && <>
        <SizeChartTable kind={kind} unit="in" note="General guide. VFRB confirms final measurements with you."/>
        <div className="wz-sizes">{STD_SIZES.map(s => <Stepper key={s} label={s} value={Number(form.sizes[s]) || 0} onChange={v => set('sizes', { ...form.sizes, [s]: v })}/>)}</div>
        <SizeProportions studio={studio} sizes={form.sizes}/>
      </>}
      {custom && <>
        <p className="wz-lead">Enter body measurements in inches. VFRB reviews them with you before production.</p>
        <div className="wz-grid2">
          {MEASURES[kind].map(([k, l]) => (
            <Field key={k} id={`${uid}-${k}`} label={`${l} (in)`} type="number" min={0} step={0.5} inputMode="decimal" value={form.measurements[k] ?? ''}
              onChange={e => set('measurements', { ...form.measurements, [k]: e.target.value })}/>
          ))}
          <Field id={`${uid}-qty`} label="Pieces" type="number" min={1} inputMode="numeric" value={form.custom_qty} onChange={e => set('custom_qty', e.target.value)}/>
        </div>
      </>}
      <QtyMeter form={form}/>
      <Err>{errors.sizes}</Err>
    </div>
  );
}

export function StepDelivery({ form, set, errors }) {
  return (
    <div className="wz-stack">
      <p className="wz-lead">Orders take at least a week. VFRB reviews your order and confirms the delivery date.</p>
      <div className="wz-grid2">
        <Field type="date" label="Preferred date (optional)" min={minDeadline()} value={form.deadline} error={errors.deadline} hint="VFRB confirms the final date."
          onChange={e => set('deadline', e.target.value)}/>
        <Field as="select" label="Fabric" value={form.fabric_type} error={errors.fabric_type} onChange={e => set('fabric_type', e.target.value)}>
          <option value="">Choose a fabric</option>
          {FABRIC_TYPES.map(f => <option key={f}>{f}</option>)}
        </Field>
      </div>
      <div className="wz-seg" role="group" aria-label="Delivery method">
        {[['vfrb_deliver', 'VFRB delivers'], ['pickup', 'Pick up at VFRB']].map(([v, l]) => (
          <button key={v} type="button" aria-pressed={form.delivery_method === v} onClick={() => set('delivery_method', v)}>{l}</button>
        ))}
      </div>
      {form.delivery_method === 'pickup'
        ? <p className="wz-lead">VFRB tells you when your order is packed and ready to collect.</p>
        : <Field as="textarea" rows={3} label="Delivery address" value={form.delivery_address} error={errors.delivery_address}
            onChange={e => set('delivery_address', e.target.value)} placeholder="Street, barangay, city, province"/>}
      <div className="wz-grid2">
        <Field label="PO reference (optional)" value={form.po_reference} onChange={e => set('po_reference', e.target.value)} placeholder="Your purchase order number"/>
        <Field as="textarea" rows={2} label="Notes for VFRB (optional)" value={form.special_notes} onChange={e => set('special_notes', e.target.value)}/>
      </div>
    </div>
  );
}

// Review rows per section; empty values are left out instead of shown as dashes.
function reviewRows(form, studio) {
  const custom = form.sizing_type === 'custom';
  const sizes = custom
    ? Object.entries(form.measurements).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k.replace('_', ' '), `${v} in`])
    : STD_SIZES.filter(s => Number(form.sizes[s]) > 0).map(s => [s, `${form.sizes[s]} pcs`]);
  return [
    { t: 'Design', go: 0, rows: [['Garment', garmentLabel(form.garment_type)], ['Source', studio ? 'Design Studio' : 'Your file'], ['Reference', form.design_ref_file?.name],
      ['Notes', studio ? form.extra_notes : form.client_design_notes]] },
    { t: 'Sizes', go: 1, rows: [['Color', form.color], ['Method', custom ? 'Custom (inches)' : 'Standard'], ...sizes, ['Total', `${orderQty(form)} pcs`]] },
    { t: 'Delivery', go: 2, rows: [['Preferred date', form.deadline || 'VFRB will propose'], ['Fabric', form.fabric_type], ['Deliver to', form.delivery_method === 'pickup' ? 'Pick up at VFRB' : form.delivery_address],
      ['PO reference', form.po_reference], ['Notes', form.special_notes]] },
  ].map(s => ({ ...s, rows: s.rows.filter(([, v]) => v) }));
}

export function StepReview({ form, set, studio, onEdit, title, sharedShown }) {
  const refUrl = useObjectUrl(!studio && isImage(form.design_ref_file) ? form.design_ref_file : null);
  return (
    <div className="wz-stack">
      {title && <h2 className="wz-piece-h">{title}</h2>}
      {(studio || refUrl) && (
        <div className="wz-stage">
          <DesignPreview cfg={studio} height={280} previewUrl={studio?.previewPng ?? null} referenceImageUrl={refUrl}
            onSnapshot={studio ? png => set('design_3d_snapshot', png) : null} snapshot={form.design_3d_snapshot ?? null}/>
        </div>
      )}
      {reviewRows(form, studio).filter(s => !(sharedShown && s.go === 2)).map(s => (
        <section key={s.t} className="wz-rev">
          <header><h3>{s.t}</h3><button type="button" className="wz-edit" onClick={() => onEdit(s.go)}>Edit<span className="sr-only"> {s.t}</span></button></header>
          <dl>{s.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </section>
      ))}
    </div>
  );
}
