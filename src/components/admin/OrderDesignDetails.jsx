import { useState } from 'react';
import { ENTRIES } from '../../pages/client/design-studio/designGallery';
import { getStorageUrl, isImageFile } from '../../utils/fileUrl';
import { NavIcon } from '../ui';

// Read-only facts an order's Studio design carries that the preview alone hides: the gallery photo it started from, the
// template, zone colours, the customer's reference photo and the order notes. Admin never edits a submitted design here.

const ZONE_LABEL = { body: 'Body', sleeve: 'Sleeves', collar: 'Collar', pocket: 'Pocket / lower', tipping: 'Tipping' };
const label = { fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 };
const box = { padding: 12, background: 'var(--bg-surface)', borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, overflowWrap: 'anywhere' };

const parseCfg = (cfg) => { if (!cfg || typeof cfg === 'object') return cfg ?? null; try { return JSON.parse(cfg); } catch { return null; } };

// Customer's uploaded reference: skeleton until it loads, a plain message (and the link) if it cannot be displayed.
export function ReferenceFile({ path }) {
  const [state, setState] = useState('loading');
  if (!path) return null;
  const url = getStorageUrl(path);
  const link = (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--teal)', textDecoration: 'none' }}>
      <NavIcon name="download" size={13} color="var(--teal)" /> Download reference file
    </a>
  );
  if (!isImageFile(path)) return link;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
      {state === 'loading' && <div className="adm-sk" style={{ width: '100%', maxWidth: 320, height: 180 }} />}
      {state === 'error'
        ? <div className="adm-err" style={{ width: '100%' }}><span>The reference image could not be displayed. Use the download link.</span></div>
        : <img src={url} alt="Customer reference photo" onLoad={() => setState('ready')} onError={() => setState('error')}
            style={{ display: state === 'ready' ? 'block' : 'none', maxWidth: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }} />}
      {link}
    </div>
  );
}

export default function OrderDesignDetails({ order }) {
  const cfg = parseCfg(order.studio_config);
  const photo = cfg?.inspirationId ? ENTRIES.find((d) => d.id === cfg.inspirationId) : null;
  const zones = Object.entries(cfg?.colors ?? {}).filter(([z, c]) => ZONE_LABEL[z] && typeof c === 'string' && c);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16, minWidth: 0 }}>
      {cfg && (photo || cfg.inspirationId || cfg.templateId) && (
        <div>
          <div style={label}>Design origin</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
            {photo && <img src={photo.thumb} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', flexShrink: 0 }} />}
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, minWidth: 0, overflowWrap: 'anywhere' }}>
              {(photo || cfg.inspirationId) && <div><strong style={{ color: 'var(--ink)' }}>Gallery photo: </strong>{photo?.name ?? cfg.inspirationId}</div>}
              {cfg.templateId && <div><strong style={{ color: 'var(--ink)' }}>VFRB template: </strong>{cfg.templateId}</div>}
              {photo && <div style={{ color: 'var(--text-faint)' }}>The photo is the customer's inspiration; production follows the submitted 2D design.</div>}
            </div>
          </div>
        </div>
      )}
      {zones.length > 0 && (
        <div>
          <div style={label}>Zone colours</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {zones.map(([z, c]) => (
              <span key={z} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 4, background: c, border: '1px solid var(--border)' }} />
                {ZONE_LABEL[z]} <code style={{ fontSize: 11 }}>{c.toUpperCase()}</code>
              </span>
            ))}
          </div>
        </div>
      )}
      {cfg && order.client_design_ref_file && (
        <div>
          <div style={label}>Customer reference photo</div>
          <ReferenceFile path={order.client_design_ref_file} />
        </div>
      )}
      {order.notes && (
        <div style={box}><strong style={{ color: 'var(--ink)' }}>Order notes: </strong>{order.notes}</div>
      )}
    </div>
  );
}
