// src/pages/client/design-studio/LayersPanel.jsx
// Extracted from DesignStudio.jsx (Task E prep, Aug 31 2026) — first slice
// of the file-size cleanup flagged back on Aug 30. Component body is
// unchanged from the original, byte-for-byte apart from import paths.
import { useState } from 'react';
import { NavIcon } from '../../../components/ui/icons';
import { T2, secLabel } from './dsShared';

export default function LayersPanel({ layers, selectedId, onSelect, onToggleVisibility, onRename, onDelete, onReorder }) {
  const [dragId, setDragId]       = useState(null);
  const [overId, setOverId]       = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal]     = useState('');

  const commitRename = () => {
    if (editingId && editVal.trim()) onRename(editingId, editVal.trim());
    setEditingId(null);
  };

  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const ids  = layers.map(l => l.id);
    const from = ids.indexOf(dragId);
    const to   = ids.indexOf(targetId);
    if (from === -1 || to === -1) { setDragId(null); setOverId(null); return; }
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    onReorder(next);
    setDragId(null);
    setOverId(null);
  };

  return (
    <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:6,
      flex:1, overflowY:'auto' }}>
      <p style={secLabel}>Layers on this side · {layers.length}</p>

      {layers.length === 0 ? (
        <div style={{ padding:'26px 10px', textAlign:'center' }}>
          <NavIcon name="folder" size={22} color="rgba(15,23,42,.35)" style={{ marginBottom:6 }}/>
          <p style={{ fontSize:11, color:'rgba(15,23,42,.35)', margin:0 }}>
            Add a logo, text, or shape to see it here
          </p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
          {layers.map(layer => {
            const isSel  = layer.id === selectedId;
            const isOver = overId === layer.id && dragId && dragId !== layer.id;
            return (
              <div key={layer.id}
                draggable
                onDragStart={() => setDragId(layer.id)}
                onDragOver={e => { e.preventDefault(); if (overId !== layer.id) setOverId(layer.id); }}
                onDragLeave={() => setOverId(o => o === layer.id ? null : o)}
                onDrop={e => { e.preventDefault(); handleDrop(layer.id); }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                onClick={() => onSelect(layer.id)}
                style={{
                  display:'flex', alignItems:'center', gap:7,
                  padding:'7px 8px', borderRadius:8, cursor:'grab',
                  background: isSel ? 'rgba(2,195,154,.14)' : 'rgba(15,23,42,.03)',
                  border: isSel ? `1px solid ${T2}` : '1px solid rgba(15,23,42,.06)',
                  outline: isOver ? `2px solid ${T2}` : 'none',
                  opacity: dragId === layer.id ? .4 : 1,
                  transition:'background .12s, opacity .12s',
                }}>
                <NavIcon name="dragHandle" size={11} color="rgba(15,23,42,.22)"/>
                {/* Shape sub-kind (Triangle/Ellipse/Line/Star/...) uses the
                    one generic 'shapes' icon — real per-shape icons (rect/
                    circle) exist but a matching icon for every Fabric shape
                    kind doesn't, and showing the wrong one would be worse
                    than a shared generic. */}
                <NavIcon name={layer.type === 'logo' ? 'image' : layer.type === 'drawing' ? 'draw'
                  : layer.type === 'shape' ? 'shapes' : 'edit'} size={13} color="rgba(15,23,42,.6)"/>

                {editingId === layer.id ? (
                  <input autoFocus value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setEditingId(null);
                      e.stopPropagation();
                    }}
                    onClick={e => e.stopPropagation()}
                    maxLength={24}
                    style={{ flex:1, fontSize:11, background:'transparent', border:'none',
                      borderBottom:`1px solid ${T2}`, color:'#1a2332', outline:'none', minWidth:0 }}/>
                ) : (
                  <span
                    onDoubleClick={e => { e.stopPropagation(); setEditingId(layer.id); setEditVal(layer.name); }}
                    title={`${layer.name} — double-click to rename`}
                    style={{ flex:1, fontSize:11, color: isSel ? '#016070' : 'rgba(15,23,42,.7)',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}>
                    {layer.name}
                  </span>
                )}

                <button onClick={e => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2,
                    display:'flex', opacity: layer.visible ? .6 : .28 }}>
                  <NavIcon name={layer.visible ? 'show' : 'hide'} size={13} color="#fff"/>
                </button>
                <button onClick={e => { e.stopPropagation(); onDelete(layer.id); }}
                  title="Delete layer"
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2,
                    display:'flex', opacity:.45 }}>
                  <NavIcon name="delete" size={13} color="#fff"/>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize:9, color:'rgba(15,23,42,.2)', textAlign:'center', margin:'8px 0 0' }}>
        Top = front · Drag to reorder · Double-click to rename
      </p>
    </div>
  );
}
