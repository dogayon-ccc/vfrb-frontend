import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';
import BottomSheet from '../../components/ui/BottomSheet';
import { NavIcon } from '../../components/ui/icons';
import { PageHeader, StatGrid, PillTabs, ErrorBlock, Panel, StatusPill, SearchBox, Avatar, SkeletonRows, useIsMobile } from '../../components/admin/AdminUI';

const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

const T = 'var(--teal)', T2 = 'var(--teal-2)';
const inp = { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'#fff', color:'var(--ink)', fontSize:13, outline:'none', fontFamily:FONT, transition:'border .15s,box-shadow .15s', boxSizing:'border-box' };
const fi  = e => { e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo  = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; };
const lbl = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-subtle)', marginBottom:7 };
const SK  = { borderRadius:6, background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite' };

const ROLE_CFG = {
  manager:  { c:'var(--teal)', bg:'var(--teal-50, #f0fdfa)', l:'Manager'  },
  staff:    { c:'var(--info)', bg:'var(--info-bg)', l:'Staff'    },
  customer: { c:'#8b5cf6', bg:'#f5f3ff', l:'Client' },
};

const INIT = { name:'', email:'', password:'', password_confirmation:'', role:'staff', job_function:'general', contact_number:'' };

function CreateUserModal({ onClose, onDone, isMobile }) {
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
    <BottomSheet title="Create User Account" onClose={onClose} isMobile={isMobile} maxWidth={500}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="um-modal-grid2">
            <div>
              <label style={lbl}>Full Name *</label>
              <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. VFRB Staff 2" style={inp} onFocus={fi} onBlur={fo}/>
            </div>
            <div>
              <label style={lbl}>Role</label>
              <select value={form.role} onChange={e=>set('role',e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="customer">Client</option>
              </select>
            </div>
          </div>
          {form.role === 'staff' && (
            <div>
              <label style={lbl}>Job Function</label>
              <select value={form.job_function} onChange={e=>set('job_function',e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                <option value="general">General (sees all operational pages — default)</option>
                <option value="production">Production (Production, Output Log, QC Checklist, Incidents)</option>
                <option value="inventory">Inventory (Inventory, Materials, Physical Count, Procurement)</option>
                <option value="sales">Sales (Orders, Clients, Messages, Delivery, Sales & Pay — no Production or Inventory pages)</option>
              </select>
              <p style={{ fontSize:10.5, color:'var(--text-faint)', margin:'4px 0 0' }}>
                Restricts which admin pages this account can open. Production and Inventory
                restrictions are enforced by the server; Procurement and the read-only stock list
                are hidden in the menu but not blocked server-side, and every staff account can
                view Settings. Managers always have full access.</p>
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
          <div className="um-modal-grid2">
            <div>
              <label style={lbl}>Password *</label>
              <input type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Min 8 characters" style={inp} onFocus={fi} onBlur={fo}/>
            </div>
            <div>
              <label style={lbl}>Confirm Password *</label>
              <input type="password" value={form.password_confirmation} onChange={e=>set('password_confirmation',e.target.value)} placeholder="Repeat password" style={inp} onFocus={fi} onBlur={fo}/>
            </div>
          </div>
          {err && <p style={{ color:'var(--danger-text)', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}><NavIcon name="warning" size={13} color="var(--danger)"/>{err}</p>}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:12, marginTop:2, borderTop:'1px solid var(--border)' }}>
            <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:'1px solid var(--border)', background:'#fff', color:'var(--ink)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
            <button onClick={submit} disabled={busy}
              style={{ padding:'9px 22px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${T},${T2})`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT, opacity:busy?.7:1, display:'inline-flex', alignItems:'center', gap:7 }}>
              {busy && <NavIcon name="loading" size={13} color="#fff" style={{ animation:'um-spin .8s linear infinite' }}/>}
              {busy ? 'Creating…' : <><NavIcon name="add" size={13} color="#fff"/> Create User</>}
            </button>
          </div>
        </div>
    </BottomSheet>
  );
}

function EditUserModal({ user, onClose, onDone, isMobile }) {
  const [role, setRole] = useState(user.role);
  const [jobFn, setJobFn] = useState(user.job_function ?? 'general');
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await axios.put(`/api/admin/users/${user.user_id}`, { role, job_function: jobFn });
      onDone();
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed to update user.'); }
    finally { setBusy(false); }
  };

  return (
    <BottomSheet title={`Edit ${user.name}`} onClose={onClose} isMobile={isMobile} maxWidth={440}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={lbl}>Role</label>
            <select value={role} onChange={e=>setRole(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          {role === 'staff' && (
            <div>
              <label style={lbl}>Job Function</label>
              <select value={jobFn} onChange={e=>setJobFn(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                <option value="general">General</option>
                <option value="production">Production</option>
                <option value="inventory">Inventory</option>
                <option value="sales">Sales (not yet enforced)</option>
              </select>
            </div>
          )}
          {err && <p style={{ color:'var(--danger-text)', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}><NavIcon name="warning" size={13} color="var(--danger)"/>{err}</p>}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:12, marginTop:2, borderTop:'1px solid var(--border)' }}>
            <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:'1px solid var(--border)', background:'#fff', color:'var(--ink)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
            <button onClick={submit} disabled={busy}
              style={{ padding:'9px 22px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${T},${T2})`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT, opacity:busy?.7:1 }}>
              {busy ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
    </BottomSheet>
  );
}

function ConfirmModal({ title, body, confirmLabel, danger, busy, onConfirm, onClose, isMobile }) {
  return (
    <BottomSheet title={title} onClose={onClose} isMobile={isMobile} maxWidth={380}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <p style={{ fontSize:13, color:'var(--text-subtle)', margin:0, lineHeight:1.5 }}>{body}</p>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:'1px solid var(--border)', background:'#fff', color:'var(--ink)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
            <button onClick={onConfirm} disabled={busy}
              style={{ padding:'9px 22px', borderRadius:9, border:'none', background: danger ? 'var(--danger)' : `linear-gradient(135deg,${T},${T2})`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT, opacity:busy?.7:1 }}>
              {busy ? 'Please wait…' : confirmLabel}
            </button>
          </div>
        </div>
    </BottomSheet>
  );
}

export default function AdminUserManagement() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [roleF,   setRoleF]   = useState('all');
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [toggling,setToggling]= useState(null);
  const [toggleErr, setToggleErr] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const isMobile = useIsMobile();
  const [loadErr, setLoadErr] = useState(false);
  const me = JSON.parse(localStorage.getItem('vfrb_user') || '{}');

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('admin_users');
      if (cached) { setUsers(cached); setLoading(false); return; }
    }
    setLoading(true); setLoadErr(false);
    axios.get('/api/admin/users')
      .then(r => {
        const list = r.data?.data ?? r.data ?? [];
        setUsers(list);
        cacheSet('admin_users', list, 300_000);
      })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (user) => {
    if (user.user_id === me.user_id) return;
    const isActive = user.is_active !== false;
    if (isActive) { setConfirmDeactivate(user); return; }
    await runToggle(user);
  };

  const runToggle = async (user) => {
    setToggling(user.user_id); setToggleErr('');
    setUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, is_active: !(user.is_active !== false) } : u));
    try {
      await axios.patch(`/api/admin/users/${user.user_id}/toggle`);
      cacheClear('admin_users');
    } catch(e) {
      setUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, is_active: user.is_active } : u));
      setToggleErr(e.response?.data?.message ?? 'Could not update user status.');
    } finally { setToggling(null); }
  };

  const filtered = users.filter(u => {
    const ms = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    return ms && (roleF === 'all' || u.role === roleF);
  });

  const counts = {};
  users.forEach(u => { counts[u.role] = (counts[u.role] ?? 0) + 1; });

  return (
    <>
      <style>{`@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}
        @keyframes um-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .um-modal-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        @media(max-width:480px){.um-modal-grid2{grid-template-columns:1fr;}}
      `}</style>
      {modal && <CreateUserModal onClose={() => setModal(false)} onDone={() => { setModal(false); load(); }} isMobile={isMobile}/>}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(true); }} isMobile={isMobile}/>}
      {confirmDeactivate && (
        <ConfirmModal
          title="Deactivate user?"
          body={`${confirmDeactivate.name} will lose access immediately.`}
          confirmLabel="Deactivate"
          danger
          busy={toggling === confirmDeactivate.user_id}
          onClose={() => setConfirmDeactivate(null)}
          onConfirm={async () => { const u = confirmDeactivate; setConfirmDeactivate(null); await runToggle(u); }}
          isMobile={isMobile}
        />
      )}

      <PageHeader title="User Management" sub={`${users.length} total accounts`}>
        {me.role === 'manager' && <button className="adm-btn primary" onClick={() => setModal(true)}><NavIcon name="add" size={14} color="currentColor" /> Add User</button>}
      </PageHeader>

      {toggleErr && <div style={{ marginBottom:14 }}><ErrorBlock msg={toggleErr} /></div>}
      {loadErr && <div style={{ marginBottom:14 }}><ErrorBlock msg="Could not load users." onRetry={() => load(true)} /></div>}

      <StatGrid loading={loading} items={[
        { label:'Total Accounts', value:users.length },
        { label:'Active', value:users.filter(u => u.is_active !== false).length, color:'var(--success-text)' },
        { label:'Inactive', value:users.filter(u => u.is_active === false).length, color: users.some(u => u.is_active === false) ? 'var(--danger-text)' : undefined },
        { label:'Staff & Managers', value:(counts.staff ?? 0) + (counts.manager ?? 0), color:'var(--teal)' },
      ]} />

      <div className="adm-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by name or email…" />
      </div>
      <PillTabs value={roleF} onChange={setRoleF} tabs={[
        { key:'all', label:'All Users', count:users.length },
        { key:'customer', label:'Clients', count:counts.customer ?? 0 },
        { key:'staff', label:'Staff', count:counts.staff ?? 0 },
        { key:'manager', label:'Managers', count:counts.manager ?? 0 },
      ]} />

      {loading ? <Panel flush><SkeletonRows rows={5} h={48} /></Panel>
      : filtered.length === 0 ? (
        <Panel><div className="adm-empty"><NavIcon name="users" size={30} color="currentColor" />
          <div style={{ marginTop:8, fontWeight:700 }}>No users found</div>
          {(search || roleF !== 'all') && <button className="adm-link-btn" onClick={() => { setSearch(''); setRoleF('all'); }}>Clear filters</button>}</div></Panel>
      ) : (
        <>
          <div className="adm-only-d">
            <Panel flush>
              <div className="adm-tbl-scroll">
                <table className="adm-table">
                  <thead><tr><th>User</th><th className="adm-hide-t">Contact</th><th>Role</th><th style={{ textAlign:'center' }}>Orders</th><th>Status</th><th style={{ textAlign:'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map((u, i) => {
                      const rc = ROLE_CFG[u.role] ?? { c:'var(--text-subtle)', bg:'var(--bg-surface)', l:u.role };
                      const isActive = u.is_active !== false;
                      const isMe = u.user_id === me.user_id;
                      const canAct = me.role === 'manager' && !isMe;
                      return (
                        <tr key={u.user_id ?? i} className={canAct ? 'adm-row' : undefined} style={{ opacity: isActive ? 1 : .6 }}>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                              <Avatar name={u.name} size={36} tone={u.role === 'manager' ? 'purple' : u.role === 'staff' ? 'blue' : undefined} />
                              <div style={{ minWidth:0 }}>
                                <div style={{ fontWeight:700 }}>{u.name}{isMe && <span className="adm-chip" style={{ marginLeft:6, background:'var(--teal-50)', color:'var(--teal)' }}>YOU</span>}</div>
                                <div style={{ fontSize:11, color:'var(--text-subtle)' }}>{u.email}</div>
                                {u.organization_name && <div style={{ fontSize:10, color:'var(--text-faint)' }}>{u.organization_name}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="adm-hide-t" style={{ color:'var(--text-subtle)' }}>{u.contact_number ?? '—'}</td>
                          <td><span className="adm-pill" style={{ background:rc.bg, color:rc.c }}>{rc.l}</span></td>
                          <td style={{ textAlign:'center', fontWeight:700 }}>{u.orders_count ?? 0}</td>
                          <td><StatusPill status={isActive ? 'active' : 'inactive'} label={isActive ? 'Active' : 'Inactive'} /></td>
                          <td>
                            {canAct && (
                              <div className="adm-ra" style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                                <button className="adm-btn" onClick={() => setEditing(u)}><NavIcon name="edit" size={13} color="currentColor" /> Edit</button>
                                <button className={`adm-btn ${isActive ? 'danger' : 'success'}`} onClick={() => toggleStatus(u)} disabled={toggling === u.user_id}>
                                  {toggling === u.user_id ? '…' : isActive ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding:'10px 18px', borderTop:'1px solid var(--bg-surface)', fontSize:11, color:'var(--text-faint)' }}>Showing {filtered.length} of {users.length} accounts</div>
            </Panel>
          </div>

          <div className="adm-only-m adm-stagger" key={`${roleF}-${search}`}>
            {filtered.map((u, i) => {
              const rc = ROLE_CFG[u.role] ?? { c:'var(--text-subtle)', bg:'var(--bg-surface)', l:u.role };
              const isActive = u.is_active !== false;
              const isMe = u.user_id === me.user_id;
              return (
                <div key={u.user_id ?? i} className="adm-mcard" style={{ '--i':Math.min(i,8), opacity: isActive ? 1 : .65 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                    <Avatar name={u.name} size={40} tone={u.role === 'manager' ? 'purple' : u.role === 'staff' ? 'blue' : undefined} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}{isMe && <span className="adm-chip" style={{ marginLeft:6, background:'var(--teal-50)', color:'var(--teal)' }}>YOU</span>}</div>
                      <div style={{ fontSize:11, color:'var(--text-subtle)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</div>
                    </div>
                    <span className="adm-pill" style={{ background:rc.bg, color:rc.c }}>{rc.l}</span>
                  </div>
                  <div className="adm-mrow" style={{ marginTop:12, paddingTop:10, borderTop:'1px solid var(--bg-surface)' }}>
                    <span style={{ fontSize:12, color:'var(--text-subtle)' }}><b style={{ color:'var(--ink)' }}>{u.orders_count ?? 0}</b> orders</span>
                    <StatusPill status={isActive ? 'active' : 'inactive'} label={isActive ? 'Active' : 'Inactive'} />
                  </div>
                  {me.role === 'manager' && !isMe && (
                    <div className="adm-mfoot">
                      <button className="adm-btn" onClick={() => setEditing(u)}>Edit</button>
                      <button className={`adm-btn ${isActive ? 'danger' : 'success'}`} onClick={() => toggleStatus(u)} disabled={toggling === u.user_id}>
                        {toggling === u.user_id ? '…' : isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
