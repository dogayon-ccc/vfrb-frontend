import { useRef, useState } from 'react';
import { NavIcon } from '../../../components/ui/icons';
import { familyFor } from './garmentCatalog';
import { groupLabels } from './layerGroups';
import './textilePanel.css';

export const ICON = { logo: 'image', artwork: 'image', drawing: 'draw', shape: 'shapes', text: 'text', pocket: 'shapes' };
const KIND = { logo: 'Logo', artwork: 'Artwork image', drawing: 'Drawing', shape: 'Shape', text: 'Text' };

export default function LayersPanel({ layers, unmapped = [], zoneChoices = [], onReassign = null, onDuplicate = null, onBlend = null, selectedId, garment, onSelect, onToggleVisibility, onToggleLock, onOpacity, onRename, onDelete, onReorder, onAdd = null, onGroup = null, onUngroup = null, selection = null, selectedIds = null }: any) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState('');
  const grip = useRef(null);
  const gnames = groupLabels(layers);

  const commitRename = () => {
    if (editingId && editVal.trim()) onRename(editingId, editVal.trim());
    setEditingId(null);
  };

  const handleDrop = (targetId) => {
    const ids = layers.map(l => l.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    setDragId(null); setOverId(null);
    if (from === -1 || to === -1 || from === to) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    onReorder(next);
  };

  // Pointer drag from the grip: HTML5 drag never fires on touch screens, so the grip reorders with any pointer.
  const overAt = (e) => e.currentTarget.ownerDocument.elementFromPoint(e.clientX, e.clientY)?.closest('[data-layer-id]')?.dataset.layerId ?? null;
  const gripDown = (e, id) => { e.currentTarget.setPointerCapture(e.pointerId); grip.current = id; setDragId(id); };
  const gripMove = (e) => { if (grip.current) setOverId(overAt(e)); };
  const gripUp = (e) => { if (!grip.current) return; grip.current = null; const t = overAt(e); t ? handleDrop(t) : (setDragId(null), setOverId(null)); };

  const move = (id, dir) => {
    const ids = layers.map(l => l.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    onReorder(ids);
  };

  const parked = unmapped.length > 0 && (
    <section className="ds-lay-unmapped" aria-label="Unmapped artwork">
      <p className="ds-lay-count">Unmapped artwork · {unmapped.length}</p>
      <p className="ds-lay-note">This garment has no matching part for these. They are saved, hidden, and come back in place when you return to their garment.</p>
      <ul className="ds-lay-list">
        {unmapped.map(u => (
          <li key={u.id} className="ds-lay-row" data-hidden>
            <span className="ds-lay-name">{u.name}<em>{[u.homeGarment, u.homeZone, u.homeFace].filter(Boolean).join(' · ') || 'Previous garment'}</em></span>
            {onReassign && zoneChoices.length > 0 && (
              <label className="ds-lay-op">
                <span>Place on</span>
                <select value="" aria-label={`Place ${u.name} on a part of this garment`} onChange={e => e.target.value && onReassign(u.id, e.target.value)}>
                  <option value="">Choose part…</option>
                  {zoneChoices.map(z => <option key={z.key} value={z.key}>{z.label}</option>)}
                </select>
              </label>
            )}
            <button type="button" className="ds-lay-btn ds-lay-del" aria-label={`Delete ${u.name}`} onClick={() => onDelete(u.id)}><NavIcon name="delete" size={14}/></button>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="ds-lay">
      {layers.length === 0 ? (
        <div className="ds-lay-empty">
          <p>Nothing on this side yet.</p>
          {onAdd && <button type="button" className="ds-btn ds-btn--primary" onClick={onAdd}>Add a logo or text</button>}
        </div>
      ) : (<>
        <p className="ds-lay-count">Layers on this side · {layers.length}</p>
        {onGroup && onUngroup && (
          <div className="ds-lay-groupbar" role="group" aria-label="Group layers">
            <button type="button" className="ds-lay-gbtn" disabled={!selection?.canGroup} onClick={onGroup} title="Select two or more layers (Shift or Ctrl-click), then group them to move as one">Group</button>
            <button type="button" className="ds-lay-gbtn" disabled={!selection?.canUngroup} onClick={onUngroup}>Ungroup</button>
            <span className="ds-lay-ghint" role="status">{selection?.count > 1 ? `${selection.count} selected` : 'Shift-click layers to select several'}</span>
          </div>
        )}
        <ul className="ds-lay-list" aria-label="Layers, front-most first">
          {layers.map((layer, i) => {
            const sel = layer.id === selectedId, multi = !!selectedIds?.has(layer.id), gname = layer.groupId ? gnames.get(layer.groupId) : null;
            return (
              <li key={layer.id} data-layer-id={layer.id} className="ds-lay-row" data-sel={sel || multi || undefined} data-group={layer.groupId ? ((gnames.size && [...gnames.keys()].indexOf(layer.groupId)) % 4) : undefined} data-hidden={!layer.visible || undefined}
                data-locked={layer.locked || undefined} data-over={(overId === layer.id && dragId && dragId !== layer.id) || undefined}
                style={{ opacity: dragId === layer.id ? .4 : undefined }}
                draggable={editingId !== layer.id}
                onDragStart={() => setDragId(layer.id)}
                onDragOver={e => { e.preventDefault(); if (overId !== layer.id) setOverId(layer.id); }}
                onDragLeave={() => setOverId(o => (o === layer.id ? null : o))}
                onDrop={e => { e.preventDefault(); handleDrop(layer.id); }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}>
                <div className="ds-lay-main">
                  <span className="ds-lay-grip" aria-hidden="true" title="Drag to reorder"
                    onPointerDown={e => gripDown(e, layer.id)} onPointerMove={gripMove} onPointerUp={gripUp} onPointerCancel={() => { grip.current = null; setDragId(null); setOverId(null); }}>
                    <NavIcon name="dragHandle" size={14}/>
                  </span>
                  <button type="button" className="ds-lay-pick" aria-pressed={sel || multi} onClick={e => onSelect(layer.id, e.shiftKey || e.ctrlKey || e.metaKey)}>
                    <span className="ds-lay-type" aria-hidden="true"><NavIcon name={ICON[layer.type] ?? 'text'} size={14}/></span>
                    {editingId === layer.id ? null : (
                      <span className="ds-lay-name" title={`${layer.name} â€” double-click to rename`}
                        onDoubleClick={e => { e.stopPropagation(); setEditingId(layer.id); setEditVal(layer.name); }}>
                        {layer.name}<em>{gname ? `${gname} · ` : ''}{KIND[layer.type]}</em>
                      </span>
                    )}
                  </button>
                  {editingId === layer.id && (
                    <input autoFocus className="ds-lay-edit" value={editVal} maxLength={24} aria-label="Layer name"
                      onChange={e => setEditVal(e.target.value)} onBlur={commitRename}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); e.stopPropagation(); }}/>
                  )}
                  <button type="button" className="ds-lay-btn" aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'} aria-pressed={layer.locked}
                    title={layer.locked ? 'Unlock' : 'Lock position and size'} onClick={() => onToggleLock(layer.id)}>
                    <NavIcon name="lock" size={14}/>
                  </button>
                  <button type="button" className="ds-lay-btn" aria-label={layer.visible ? 'Hide layer' : 'Show layer'} aria-pressed={!layer.visible}
                    title={layer.visible ? 'Hide' : 'Show'} onClick={() => onToggleVisibility(layer.id)}>
                    <NavIcon name={layer.visible ? 'show' : 'hide'} size={14}/>
                  </button>
                </div>

                {sel && (
                  <div className="ds-lay-detail">
                    <label className="ds-lay-op">
                      <span>Opacity {Math.round(layer.opacity * 100)}%</span>
                      <input type="range" min="10" max="100" value={Math.round(layer.opacity * 100)}
                        onChange={e => onOpacity(layer.id, Number(e.target.value) / 100, false)}
                        onPointerUp={e => onOpacity(layer.id, Number(e.target.value) / 100, true)}
                        onKeyUp={e => onOpacity(layer.id, Number(e.target.value) / 100, true)}/>
                    </label>
                    {onBlend && (
                      <label className="ds-lay-op"><span>Blend</span>
                        <select value={layer.blend ?? 'normal'} disabled={layer.locked} onChange={e => onBlend(layer.id, e.target.value)}>
                          <option value="normal">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option>
                        </select>
                      </label>
                    )}
                    <div className="ds-lay-tools">
                      <button type="button" className="ds-lay-btn" aria-label="Bring forward" disabled={i === 0} onClick={() => move(layer.id, -1)}>
                        <NavIcon name="chevronUp" size={14}/>
                      </button>
                      <button type="button" className="ds-lay-btn" aria-label="Send backward" disabled={i === layers.length - 1} onClick={() => move(layer.id, 1)}>
                        <NavIcon name="chevronDown" size={14}/>
                      </button>
                      {onDuplicate && <button type="button" className="ds-lay-btn" aria-label="Duplicate layer" onClick={() => onDuplicate(layer.id)}><NavIcon name="duplicate" size={14}/></button>}
                      <button type="button" className="ds-lay-btn" aria-label="Rename layer" onClick={() => { setEditingId(layer.id); setEditVal(layer.name); }}>
                        <NavIcon name="edit" size={14}/>
                      </button>
                      <button type="button" className="ds-lay-btn ds-lay-del" aria-label="Delete layer" disabled={layer.locked}
                        title={layer.locked ? 'Unlock to delete' : 'Delete'} onClick={() => onDelete(layer.id)}>
                        <NavIcon name="delete" size={14}/>
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {garment && (
          <div className="ds-lay-base" aria-label="Garment base layer">
            <span className="ds-lay-type" aria-hidden="true"><NavIcon name="garmentType" size={14}/></span>
            <span className="ds-lay-name">Garment base<em>{familyFor(garment) ? 'Locked; colours are set in Garment' : 'Locked'}</em></span>
            <NavIcon name="lock" size={13} color="var(--text-subtle)"/>
          </div>
        )}
      </>)}
      {parked}
    </div>
  );
}
