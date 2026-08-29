// src/pages/admin/UserManagement.jsx
// Manager-only: create staff accounts, view all users, toggle status
//
// Aug 23 2026 — mobile fix. The table wrapper had overflow:'hidden' (not
// overflow-x:auto), so the 7-column table was genuinely clipping content
// on narrow screens, not just scrolling awkwardly. Added an isMobile card
// fallback matching the pattern already proven in Inventory.jsx/Orders.jsx.
// Also removed the "v10 mobile sweep" .adm-stats/.adm-grid-2/.adm-filter/
// .adm-table-wrap CSS block — none of those classNames were ever actually
// applied to any element in this file (same dead-code pattern found and
// fixed in Suppliers.jsx). Zero business-logic changes below.
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';

const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

const T = '#028090', T2 = '#02C39A';
const inp = { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:13, outline:'none', fontFamily:FONT, transition:'border .15s,box-shadow .15s', boxSizing:'border-box' };
const fi  = e => { e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo  = e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; };
const lbl = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#64748b', marginBottom:7 };
const SK  = { borderRadius:6, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite' };
const card = { background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.05)' };

const ROLE_CFG = {
  manager:  { c:'#028090', bg:'#f0fdfa', l:'Manager'  },
  staff:    { c:'#3b82f6', bg:'#eff6ff', l:'Staff'    },
  customer: { c:'#8b5cf6', bg:'#f5f3ff', l:'Customer' },
};

const INIT = { name:'', email:'', password:'', password_confirmation:'', role:'staff', job_function:'general', contact_number:'' };

function CreateUserModal({ onClose, onDone }) {
  const [form, setForm] = useState({ ...INIT });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setErr('Name, email, and password are required.'); return;
    }
    if (form.password !== form.password_confirmation) {
      setErr('Passwords do not match.'); return;
    }
    setBusy(true); setErr('');
    try {
      await axios.post('/api/admin/users', form);
      onDone();
    } catch(e) { setErr(e.response?.data?.message ?? e.response?.data?.errors?.[Object.keys(e.response?.data?.errors||{})[0]]?.[0] ?? 'Failed to create user.'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
        style={{ background:'#fff', borderRadius:18, width:'min(500px,100%)', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.15)', overflow:'hidden' }}>
        <div style={{ padding:'18px 22px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ fontSize:16, fontWeight:800, color:'#0f172a', margin:0 }}>Create User Account</h3>
            <p style={{ fontSize:11, color:'#64748b', margin:'3px 0 0' }}>SAP SU01 · User Administration</p>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'none', background:'#f1f5f9', cursor:'pointer', fontSize:16, color:'#64748b' }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={lbl}>Full Name *</label>
              <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. VFRB Staff 2" style={inp} onFocus={fi} onBlur={fo}/>
            </div>
            <div>
              <label style={lbl}>Role</label>
              <select value={form.role} onChange={e=>set('role',e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="customer">Customer</option>
              </select>
            </div>
          </div>
          {form.role === 'staff' && (
            <div>
              <label style={lbl}>Job Function</label>
              <select value={form.job_function} onChange={e=>set('job_function',e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                <option value="general">General (sees all operational pages — default)</option>
                <option value="production">Production (Production, Output Log, QC, Incidents only)</option>
                <option value="inventory">Inventory (Inventory, Materials, Usage Rates, Physical Count only)</option>
                <option value="sales">Sales (Orders, Delivery, Sales & Pay only)</option>
              </select>
              <p style={{ fontSize:10.5, color:'#94a3b8', margin:'4px 0 0' }}>
                Restricts which admin pages this account can see and use. Enforced server-side, not just hidden in the nav.
              </p>
            </div>
          )}
          <div>
            <label style={lbl}>Email Address *</label>
            <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="staff@vfrb.com" style={inp} onFocus={fi} onBlur={fo}/>
          </div>
          <div>
            <label style={lbl}>Contact Number</label>
            <input value={form.contact_number} onChange={e=>set('contact_number',e.target.value)} placeholder="09XXXXXXXXX" style={inp} onFocus={fi} onBlur={fo}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={lbl}>Password *</label>
              <input type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Min 8 characters" style={inp} onFocus={fi} onBlur={fo}/>
            </div>
            <div>
              <label style={lbl}>Confirm Password *</label>
              <input type="password" value={form.password_confirmation} onChange={e=>set('password_confirmation',e.target.value)} placeholder="Repeat password" style={inp} onFocus={fi} onBlur={fo}/>
            </div>
          </div>
          {err && <p style={{ color:'#ef4444', fontSize:12, fontWeight:600 }}>⚠️ {err}</p>}
        </div>
        <div style={{ padding:'14px 22px', borderTop:'1px solid #e2e8f0', display:'flex', gap:10, justifyContent:'flex-end', background:'#f8fafc' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
          <button onClick={submit} disabled={busy}
            style={{ padding:'9px 22px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${T},${T2})`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT, opacity:busy?.7:1 }}>
            {busy ? '⏳ Creating…' : '✓ Create User'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminUserManagement() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [roleF,   setRoleF]   = useState('all');
  const [modal,   setModal]   = useState(false);
  const [toggling,setToggling]= useState(null);
  const [winW, setWinW] = useState(typeof window!=='undefined'?window.innerWidth:1280);
  useEffect(() => { const h=()=>setWinW(window.innerWidth); window.addEventListener('resize',h); return()=>window.removeEventListener('resize',h); }, []);
  const isMobile = winW <= 767;
  const me = JSON.parse(sessionStorage.getItem('vfrb_user') || '{}');

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('admin_users');
      if (cached) { setUsers(cached); setLoading(false); return; }
    }
    setLoading(true);
    axios.get('/api/admin/users')
      .then(r => {
        const list = r.data?.data ?? r.data ?? [];
        setUsers(list);
        cacheSet('admin_users', list, 300_000); // 5min — users list is stable
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (user) => {
    if (user.user_id === me.user_id) return;
    setToggling(user.user_id);
    try {
      await axios.patch(`/api/admin/users/${user.user_id}/toggle`);
      load();
    } catch(e) {} finally { setToggling(null); }
  };

  const filtered = users.filter(u => {
    const ms = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    return ms && (roleF === 'all' || u.role === roleF);
  });

  const counts = {};
  users.forEach(u => { counts[u.role] = (counts[u.role] ?? 0) + 1; });

  return (
    <>
      <style>{`@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
      {modal && <CreateUserModal onClose={() => setModal(false)} onDone={() => { setModal(false); load(); }}/>}

      <div style={{ fontFamily:FONT, color:'#0f172a' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4 }}>User Management</h1>
            <p style={{ color:'#64748b', fontSize:13 }}>SAP SU01 · {users.length} total accounts</p>
          </div>
          {me.role === 'manager' && (
            <button onClick={() => setModal(true)}
              style={{ padding:'10px 22px', borderRadius:11, border:'none', background:`linear-gradient(135deg,${T},${T2})`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:`0 4px 14px rgba(2,128,144,.3)` }}>
              + Create User
            </button>
          )}
        </div>

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:22 }}>
          {[
            { r:'all',      l:'All Users',  c:'#64748b', bg:'#f1f5f9' },
            { r:'customer', l:'Customers',  ...ROLE_CFG.customer },
            { r:'staff',    l:'Staff',      ...ROLE_CFG.staff    },
            { r:'manager',  l:'Managers',   ...ROLE_CFG.manager  },
          ].map(s => (
            <button key={s.r} onClick={() => setRoleF(s.r)}
              style={{ padding:'14px', borderRadius:12, border:`1px solid ${roleF===s.r ? s.c+'40' : '#e2e8f0'}`, background: roleF===s.r ? s.bg : '#fff', cursor:'pointer', textAlign:'left', fontFamily:FONT, transition:'all .14s' }}>
              <p style={{ fontSize:22, fontWeight:800, color: roleF===s.r ? s.c : '#0f172a', margin:'0 0 4px' }}>
                {s.r === 'all' ? users.length : (counts[s.r] ?? 0)}
              </p>
              <p style={{ fontSize:11, color:'#64748b', margin:0, fontWeight:500 }}>{s.l}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{ ...inp, marginBottom:16 }} onFocus={fi} onBlur={fo}/>

        {/* Users — mobile cards vs desktop table */}
        {loading ? (
          isMobile ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[1,2,3].map(i => <div key={i} style={{ ...card, padding:14 }}><div style={{ ...SK, height:14, width:'60%' }}/></div>)}
            </div>
          ) : (
            <div style={{ ...card, overflow:'hidden', padding:30 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ ...SK, height:11, marginBottom:10 }}/>)}
            </div>
          )
        ) : filtered.length === 0 ? (
          <div style={{ ...card, padding:'40px', textAlign:'center' }}>
            <p style={{ fontSize:36, margin:'0 0 10px', opacity:.3 }}>👥</p>
            <p style={{ color:'#64748b', fontSize:13, fontWeight:600 }}>No users found</p>
          </div>
        ) : isMobile ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {filtered.map((u, i) => {
              const rc = ROLE_CFG[u.role] ?? { c:'#64748b', bg:'#f1f5f9', l:u.role };
              const isActive = u.is_active !== false;
              const isMe = u.user_id === me.user_id;
              return (
                <div key={u.user_id ?? i} style={{ ...card, padding:14, opacity: isActive ? 1 : .6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg,${T},${T2})`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14, fontWeight:800 }}>
                      {(u.name??'?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {u.name}{isMe && <span style={{ marginLeft:6, fontSize:9, padding:'1px 6px', borderRadius:99, background:'#f0fdfa', color:T, fontWeight:700 }}>YOU</span>}
                      </p>
                      <p style={{ fontSize:11, color:'#64748b', margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</p>
                    </div>
                    <span style={{ padding:'4px 10px', borderRadius:99, fontSize:10, fontWeight:700, background:rc.bg, color:rc.c, flexShrink:0 }}>{rc.l}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:'1px solid #f1f5f9' }}>
                    <div style={{ display:'flex', gap:14 }}>
                      <div>
                        <p style={{ fontSize:9, color:'#94a3b8', margin:0, textTransform:'uppercase', letterSpacing:'.04em' }}>Orders</p>
                        <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', margin:0 }}>{u.orders_count ?? 0}</p>
                      </div>
                      <div>
                        <p style={{ fontSize:9, color:'#94a3b8', margin:0, textTransform:'uppercase', letterSpacing:'.04em' }}>Status</p>
                        <span style={{ display:'inline-block', marginTop:2, padding:'2px 8px', borderRadius:99, fontSize:9, fontWeight:700, background: isActive ? '#dcfce7' : '#fee2e2', color: isActive ? '#166534' : '#991b1b' }}>
                          {isActive ? '● Active' : '○ Inactive'}
                        </span>
                      </div>
                    </div>
                    {me.role === 'manager' && !isMe && (
                      <button onClick={() => toggleStatus(u)} disabled={toggling === u.user_id}
                        style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${isActive ? '#fecaca' : '#bbf7d0'}`, background: isActive ? '#fff' : '#f0fdf4', color: isActive ? '#ef4444' : '#22c55e', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:FONT, opacity: toggling===u.user_id ? .6 : 1 }}>
                        {toggling === u.user_id ? '⏳' : isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
        <div style={{ ...card, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['User','Email','Role','Contact','Orders','Status','Action'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'2px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const rc = ROLE_CFG[u.role] ?? { c:'#64748b', bg:'#f1f5f9', l:u.role };
                const isActive = u.is_active !== false;
                const isMe = u.user_id === me.user_id;
                return (
                  <tr key={u.user_id ?? i} style={{ borderBottom:'1px solid #f1f5f9', opacity: isActive ? 1 : .6 }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg,${T},${T2})`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:800 }}>
                          {(u.name??'?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', margin:0 }}>
                            {u.name}{isMe && <span style={{ marginLeft:6, fontSize:9, padding:'1px 6px', borderRadius:99, background:'#f0fdfa', color:T, fontWeight:700 }}>YOU</span>}
                          </p>
                          {u.organization_name && <p style={{ fontSize:10, color:'#94a3b8', margin:'1px 0 0' }}>{u.organization_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:12, color:'#64748b' }}>{u.email}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ padding:'4px 10px', borderRadius:99, fontSize:10, fontWeight:700, background:rc.bg, color:rc.c }}>{rc.l}</span>
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:12, color:'#64748b' }}>{u.contact_number ?? '—'}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, fontWeight:700, color:'#0f172a', textAlign:'center' }}>
                      {u.orders_count ?? 0}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ padding:'4px 10px', borderRadius:99, fontSize:10, fontWeight:700, background: isActive ? '#dcfce7' : '#fee2e2', color: isActive ? '#166534' : '#991b1b' }}>
                        {isActive ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      {me.role === 'manager' && !isMe && (
                        <button onClick={() => toggleStatus(u)} disabled={toggling === u.user_id}
                          style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${isActive ? '#fecaca' : '#bbf7d0'}`, background: isActive ? '#fff' : '#f0fdf4', color: isActive ? '#ef4444' : '#22c55e', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:FONT, opacity: toggling===u.user_id ? .6 : 1 }}>
                          {toggling === u.user_id ? '⏳' : isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </>
  );
}
