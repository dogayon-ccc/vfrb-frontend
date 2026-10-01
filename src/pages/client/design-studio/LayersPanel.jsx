import { useState } from 'react';
import { NavIcon } from '../../../components/ui/icons';
import { familyFor } from './garmentCatalog';

const ICON = { logo: 'image', drawing: 'draw', shape: 'shapes', text: 'text' };
const KIND = { logo: 'Logo', drawing: 'Drawing', shape: 'Shape', text: 'Text' };

export default function LayersPanel({ layers, selectedId, garment, onSelect, onToggleVisibility, onToggleLock, onOpacity, onRename, onDelete, onReorder }) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState('');

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

  const move = (id, dir) => {
    const ids = layers.map(l => l.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    onReorder(ids);
  };

  return (
    <div className="ds-lay">
      <p className="ds-lay-count">Layers on this side · {layers.length}</p>

      {layers.length === 0 ? (
        <div className="ds-empty">
          <span className="ds-empty-icon"><NavIcon name="layersPanel" size={22} color="var(--teal-dark)"/></span>
          <p className="ds-empty-title">No layers on this side yet</p>
          <p className="ds-empty-sub">Logos, text, shapes and drawings you add show up here, where you can reorder, hide, lock or rename them.</p>
        </div>
      ) : (
        <ul className="ds-lay-list" aria-label="Layers, front-most first">
          {layers.map((layer, i) => {
            const sel = layer.id === selectedId;
            return (
              <li key={layer.id} className="ds-lay-row" data-sel={sel || undefined} data-hidden={!layer.visible || undefined}
                data-locked={layer.locked || undefined} data-over={(overId === layer.id && dragId && dragId !== layer.id) || undefined}
                style={{ opacity: dragId === layer.id ? .4 : undefined }}
                draggable={editingId !== layer.id}
                onDragStart={() => setDragId(layer.id)}
                onDragOver={e => { e.preventDefault(); if (overId !== layer.id) setOverId(layer.id); }}
                onDragLeave={() => setOverId(o => (o === layer.id ? null : o))}
                onDrop={e => { e.preventDefault(); handleDrop(layer.id); }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}>
                <div className="ds-lay-main">
                  <button type="button" className="ds-lay-pick" aria-pressed={sel} onClick={() => onSelect(layer.id)}>
                    <span className="ds-lay-type" aria-hidden="true"><NavIcon name={ICON[layer.type] ?? 'text'} size={14}/></span>
                    {editingId === layer.id ? null : (
                      <span className="ds-lay-name" title={`${layer.name} — double-click to rename`}
                        onDoubleClick={e => { e.stopPropagation(); setEditingId(layer.id); setEditVal(layer.name); }}>
                        {layer.name}<em>{KIND[layer.type]}</em>
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
                    <div className="ds-lay-tools">
                      <button type="button" className="ds-lay-btn" aria-label="Bring forward" disabled={i === 0} onClick={() => move(layer.id, -1)}>
                        <NavIcon name="chevronUp" size={14}/>
                      </button>
                      <button type="button" className="ds-lay-btn" aria-label="Send backward" disabled={i === layers.length - 1} onClick={() => move(layer.id, 1)}>
                        <NavIcon name="chevronDown" size={14}/>
                      </button>
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
      )}

      {garment && (
        <div className="ds-lay-base" aria-label="Garment base layer">
          <span className="ds-lay-type" aria-hidden="true"><NavIcon name="garmentType" size={14}/></span>
          <span className="ds-lay-name">{garment}<em>{familyFor(garment) ? 'Base garment · colors set in Garment' : 'Base garment'}</em></span>
          <NavIcon name="lock" size={13} color="var(--text-subtle)"/>
        </div>
      )}
    </div>
  );
}
