import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { cacheGet, cacheClear } from '../../utils/cache';
import { fetchResource } from '../../utils/adminResources';
import BottomSheet from '../../components/ui/BottomSheet';
import { NavIcon } from '../../components/ui/icons';
import { isAdmin, roleLabel, STAGES, STAGE_LABEL } from '../../utils/jobAccess';
import { PASSWORD_RULE_TEXT, passwordOk } from '../../utils/passwordRules';
import { PillTabs, ErrorBlock, Panel, StatusPill, SearchBox, Avatar, SkeletonRows, Toast, useToast, useIsMobile } from '../../components/admin/AdminUI';

const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

const T = 'var(--teal)', T2 = 'var(--teal-2)';
const inp = { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'#fff', color:'var(--ink)', fontSize:13, outline:'none', fontFamily:FONT, transition:'border .15s,box-shadow .15s', boxSizing:'border-box' };
const fi  = e => { e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo  = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; };
const lbl = { display:'block', fontSize:11, fontWeight:700, color:'var(--text-subtle)', marginBottom:7 };

// Admin-portal accounts listed here; customers created here are listed on the Clients page.
const ROLE_CFG = {
  manager: { c:'var(--teal)', bg:'var(--teal-50, #f0fdfa)', l:'Administrator (Manager)', tab:'Administrators' },
  staff:   { c:'var(--info)', bg:'var(--info-bg)', l:'Administrator (Station)', tab:'Stations' },
  owner:   { c:'var(--warning-text)', bg:'var(--warning-bg)', l:'Owner', tab:'Owners' },
};
const ADMIN_ROLES = ['manager', 'staff', 'owner'];
// Station accounts carry their stage; the API rejects a stage on any other role.
const withStage = (body) => (body.role === 'staff' ? body : (({ assigned_stage, ...rest }) => rest)(body));
const roleText = (u, rc) => (u.role === 'staff' ? roleLabel(u) : rc.l);
const CLIENT_TYPES = [['corporate','Corporate'], ['school','School'], ['government','Government'], ['medical','Medical'], ['organization','Organization']];

const INIT = { name:'', email:'', password:'', password_confirmation:'', role:'customer', contact_number:'', username:'', organization_name:'', client_type:'', assigned_stage:'' };

const ROLE_CHOICES = {
  customer: { l:'Customer', icon:'users', note:'Places bulk uniform orders. Needs an email address.' },
  manager: { l:ROLE_CFG.manager.l, icon:'manager', note:'Runs the whole system and manages every account.' },
  staff: { l:ROLE_CFG.staff.l, icon:'production', note:'Works one production stage. Email is optional.' },
  owner: { l:ROLE_CFG.owner.l, icon:'reports', note:'Read-only view of the business. Email is optional.' },
};

export function CreateUserModal({ onClose, onDone, isMobile, adminRoles, initial }) {
  const [form, setForm] = useState({ ...INIT, ...initial });
  // Callers with no role choice (Customers access requests) skip straight to the form.
  const [picked, setPicked] = useState(!adminRoles.length);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));
  const isCustomer = form.role === 'customer';

  const submit = async () => {
    if (!form.name.trim() || !form.password) { setErr('Name and password are required.'); return; }
    if (isCustomer && !form.email.trim()) { setErr('A customer needs an email address.'); return; }
    if (!isCustomer && !form.email.trim() && !form.username.trim()) { setErr('Enter an email or a username so this person can sign in.'); return; }
    if (!passwordOk(form.password)) { setErr(PASSWORD_RULE_TEXT); return; }
    if (form.password !== form.password_confirmation) {
      setErr('Passwords do not match.'); return;
    }
    if (isCustomer && (!form.organization_name.trim() || !form.client_type)) {
      setErr('Organization and client type are required for a customer.'); return;
    }
    if (form.role === 'staff' && !form.assigned_stage) { setErr('Choose the stage this Station works.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await axios.post('/api/admin/users', withStage(form));
      onDone(!isCustomer ? (r.data?.email ? 'Account created.' : `Account created. They sign in with the username ${r.data?.username}.`) : r.data?.password_link_sent
        ? 'Customer created. A link to set their own password was emailed to them.'
        : 'Customer created, but the password email could not be sent. Share the password you set, or ask them to use Forgot password.');
    } catch(e) { setErr(firstError(e, 'Failed to create user.')); }
    finally { setBusy(false); }
  };

  if (!picked) return (
    <BottomSheet title="What type of account?" onClose={onClose} isMobile={isMobile} maxWidth={560}>
      <div className="um-modal-grid2">
        {['customer', ...adminRoles].map(r => (
          <button key={r} type="button" className="um-role-pick" onClick={() => { set('role', r); setPicked(true); }}>
            <NavIcon name={ROLE_CHOICES[r].icon} size={18} color="var(--teal)"/>
            <b>{ROLE_CHOICES[r].l}</b>
            <span>{ROLE_CHOICES[r].note}</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );

  return (
    <BottomSheet title="Create User Account" onClose={onClose} isMobile={isMobile} maxWidth={500}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="um-role-chosen">
            <span>{ROLE_CHOICES[form.role].l}</span>
            {adminRoles.length > 0 && <button type="button" className="adm-btn" onClick={() => { setPicked(false); setErr(''); }}>Change</button>}
          </div>
          <div>
            <label style={lbl}>Full name *</label>
            <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Roxanne" style={inp} onFocus={fi} onBlur={fo}/>
          </div>
          {form.role === 'staff' && <div>
              <label style={lbl}>Stage *</label>
              <select value={form.assigned_stage} onChange={e=>set('assigned_stage',e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                <option value="">Choose…</option>
                {STAGES.map(k => <option key={k} value={k}>{STAGE_LABEL[k]}</option>)}
              </select>
            </div>}
          {isCustomer && (
            <>
              <div className="um-modal-grid2">
                <div>
                  <label style={lbl}>Organization *</label>
                  <input value={form.organization_name} onChange={e=>set('organization_name',e.target.value)} placeholder="e.g. St. Luke's Medical" style={inp} onFocus={fi} onBlur={fo}/>
                </div>
                <div>
                  <label style={lbl}>Client type *</label>
                  <select value={form.client_type} onChange={e=>set('client_type',e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                    <option value="">Choose…</option>
                    {CLIENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ fontSize:11, color:'var(--text-faint)', margin:0 }}>Customers cannot sign up themselves. This account can sign in right away and is listed on the Clients page.</p>
            </>
          )}
          <LoginFields email={form.email} username={form.username} set={set} emailRequired={isCustomer}/>
          <div>
            <label style={lbl}>Contact number</label>
            <input value={form.contact_number} onChange={e=>set('contact_number',e.target.value)} placeholder="09XXXXXXXXX" style={inp} onFocus={fi} onBlur={fo}/>
          </div>
          <div className="um-modal-grid2">
            <div>
              <label style={lbl}>Password *</label>
              <input type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Aa, 0-9 and a symbol, 8+ characters" title={PASSWORD_RULE_TEXT} style={inp} onFocus={fi} onBlur={fo}/>
            </div>
            <div>
              <label style={lbl}>Confirm password *</label>
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

// Email is optional for Station, Administrator and Owner accounts; without one they sign in by username and get no emails.
function LoginFields({ email, username, set, emailRequired }) {
  return (
    <>
      <div className="um-modal-grid2">
        <div>
          <label style={lbl}>Email address{emailRequired ? ' *' : ' (optional)'}</label>
          <input type="email" value={email} onChange={e=>set('email',e.target.value)} placeholder="name@company.com" style={inp} onFocus={fi} onBlur={fo}/>
        </div>
        <div>
          <label style={lbl}>Username{emailRequired ? ' (optional)' : ''}</label>
          <input value={username} onChange={e=>set('username',e.target.value)} placeholder="e.g. cutting.station" autoCapitalize="none" style={inp} onFocus={fi} onBlur={fo}/>
        </div>
      </div>
      {!emailRequired && <p style={{ fontSize:11, color:'var(--text-faint)', margin:0 }}>Enter an email, a username, or both. Without an email they sign in with the username, get no email notifications, and only a manager can reset their password.</p>}
    </>
  );
}

const firstError = (e, fallback) => e.response?.data?.errors?.[Object.keys(e.response?.data?.errors || {})[0]]?.[0] ?? e.response?.data?.message ?? fallback;

function EditUserModal({ user, onClose, onDone, isMobile }) {
  const [name, setName] = useState(user.name ?? '');
  const [role, setRole] = useState(user.role);
  const [stage, setStage] = useState(user.assigned_stage ?? '');
  const [login, setLogin] = useState({ email: user.email ?? '', username: user.username ?? '' });
  const [pw, setPw] = useState({ password: '', password_confirmation: '' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const [note, setNote] = useState('');
  const setL = (k, v) => setLogin(l => ({ ...l, [k]: v }));

  const noEmail = !login.email.trim();
  const newPassword = noEmail && !!pw.password;

  // One Save: sign-in details first (clearing an email is what allows a direct password), then the new password.
  const submit = async () => {
    if (!name.trim()) { setErr('Enter a name.'); return; }
    if (role === 'staff' && !stage) { setErr('Choose the stage this Station works.'); return; }
    if (noEmail && !login.username.trim()) { setErr('Keep an email or a username so this person can sign in.'); return; }
    if (newPassword && !passwordOk(pw.password)) { setErr(PASSWORD_RULE_TEXT); return; }
    if (newPassword && pw.password !== pw.password_confirmation) { setErr('Passwords do not match.'); return; }
    setBusy(true); setErr('');
    let step = 'Failed to update user.';
    try {
      await axios.put(`/api/admin/users/${user.user_id}`, withStage({ name: name.trim(), role, assigned_stage: stage, ...login }));
      if (newPassword) {
        step = 'Details saved, but the password was not changed.';
        await axios.put(`/api/admin/users/${user.user_id}/password`, pw);
      }
      onDone(newPassword ? 'Account saved. New password set; they have been signed out.' : 'Account saved.');
    } catch(e) { setErr(`${step} ${firstError(e, '')}`.trim()); }
    finally { setBusy(false); }
  };

  const sendLink = async () => {
    setBusy(true); setErr(''); setNote('');
    try {
      await axios.post('/api/password/forgot', { email: user.email });
      setNote(`Reset link sent to ${user.email}.`);
    } catch(e) { setErr(firstError(e, 'Could not send the reset link.')); }
    finally { setBusy(false); }
  };

  return (
    <BottomSheet title={`Edit ${user.name}`} onClose={onClose} isMobile={isMobile} maxWidth={440}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={lbl} htmlFor="edit-user-name">Full name *</label>
            <input id="edit-user-name" value={name} maxLength={100} autoComplete="off" onChange={e=>setName(e.target.value)} style={inp} onFocus={fi} onBlur={fo}/>
          </div>
          <div>
            <label style={lbl}>Role</label>
            <select value={role} onChange={e=>setRole(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
              {ADMIN_ROLES.map(v => <option key={v} value={v}>{ROLE_CFG[v].l}</option>)}
            </select>
          </div>
          {role === 'staff' && <div>
              <label style={lbl}>Stage *</label>
              <select value={stage} onChange={e=>setStage(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                <option value="">Choose…</option>
                {STAGES.map(k => <option key={k} value={k}>{STAGE_LABEL[k]}</option>)}
              </select>
            </div>}
          <LoginFields email={login.email} username={login.username} set={setL} emailRequired={false}/>
          <fieldset style={{ border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px 12px', margin:0 }}>
            <legend style={{ ...lbl, padding:'0 4px', margin:0 }}>Password</legend>
            {noEmail ? (
              <>
                <div className="um-modal-grid2">
                  <input type="password" aria-label="New password" autoComplete="new-password" value={pw.password} onChange={e=>setPw(p=>({ ...p, password:e.target.value }))} placeholder="New password" style={inp} onFocus={fi} onBlur={fo}/>
                  <input type="password" aria-label="Repeat new password" autoComplete="new-password" value={pw.password_confirmation} onChange={e=>setPw(p=>({ ...p, password_confirmation:e.target.value }))} placeholder="Repeat password" style={inp} onFocus={fi} onBlur={fo}/>
                </div>
                <p style={{ fontSize:11, color:'var(--text-faint)', margin:'8px 0 0' }}>Leave blank to keep the current password. Save Changes applies it and signs them out. {PASSWORD_RULE_TEXT}</p>
              </>
            ) : login.email.trim().toLowerCase() === (user.email ?? '').toLowerCase() ? (
              <button type="button" className="adm-btn" onClick={sendLink} disabled={busy}>Email a reset link</button>
            ) : (
              <p style={{ fontSize:11, color:'var(--text-faint)', margin:0 }}>Save first. You can then email a reset link to the new address.</p>
            )}
          </fieldset>
          {note && <p role="status" style={{ color:'var(--teal)', fontSize:12, fontWeight:600, margin:0 }}>{note}</p>}
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

const loginLabel = (u) => u.email || (u.username ? `@${u.username} · no email` : '—');

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

function UserDetail({ u, isMe, canAct, onEdit, onToggle, toggling }) {
  if (!u) return <div className="um-detail-empty">Select an account to see its details.</div>;
  const rc = ROLE_CFG[u.role] ?? { c:'var(--text-subtle)', bg:'var(--bg-surface)', l:u.role };
  const isActive = u.is_active !== false;
  return (
    <>
      <div className="um-detail-head">
        <Avatar name={u.name} size={56} tone={u.role === 'manager' ? 'purple' : u.role === 'staff' ? 'blue' : undefined} />
        <div style={{ minWidth:0 }}>
          <h2 id="um-detail-title" className="um-detail-name">{u.name}{isMe && <span className="adm-chip" style={{ marginLeft:8, background:'var(--teal-50)', color:'var(--teal)' }}>YOU</span>}</h2>
          <div className="um-detail-mail">{loginLabel(u)}</div>
        </div>
      </div>
      <dl className="um-detail-list">
        <div><dt>Role</dt><dd><span className="adm-pill" style={{ background:rc.bg, color:rc.c }}>{roleText(u, rc)}</span></dd></div>
        <div><dt>Status</dt><dd><StatusPill status={isActive ? 'active' : 'inactive'} label={isActive ? 'Active' : 'Inactive'} /></dd></div>
        <div><dt>Username</dt><dd>{u.username || '—'}</dd></div>
        <div><dt>Email</dt><dd>{u.email || 'None'}</dd></div>
        <div><dt>Forgot password</dt><dd>{u.email ? 'Reset link by email' : 'A manager sets a new one'}</dd></div>
        <div><dt>Contact number</dt><dd>{u.contact_number || '—'}</dd></div>
        {u.organization_name && <div><dt>Organization</dt><dd>{u.organization_name}</dd></div>}
        <div><dt>Account created</dt><dd>{fmtDate(u.created_at)}</dd></div>
        <div><dt>Last updated</dt><dd>{fmtDate(u.updated_at)}</dd></div>
      </dl>
      {canAct ? (
        <div className="um-detail-actions">
          <button className="adm-btn" onClick={() => onEdit(u)}><NavIcon name="edit" size={13} color="currentColor" /> Edit account</button>
          <button className={`adm-btn ${isActive ? 'danger' : 'success'}`} onClick={() => toggling !== u.user_id && onToggle(u)} aria-disabled={toggling === u.user_id || undefined}>
            {toggling === u.user_id ? 'Saving…' : isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ) : (
        <p className="adm-sub" style={{ marginTop:16 }}>{isMe ? 'This is your account. Change your own details in Settings.' : 'Ask another Administrator (Manager) to change this account.'}</p>
      )}
    </>
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

const PAGE_SIZE = 10;

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
  const [selectedId, setSelectedId] = useState(null);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search, roleF]);
  const isMobile = useIsMobile();
  const [loadErr, setLoadErr] = useState(false);
  const me = JSON.parse(localStorage.getItem('vfrb_user') || '{}');

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('admin_users');
      if (cached) { setUsers(cached); setLoading(false); return; }
    }
    setLoading(true); setLoadErr(false);
    fetchResource('users')
      .then(setUsers)
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

  const [toast, setToast] = useToast();
  const canManage = () => isAdmin(me);

  const filtered = users.filter(u => {
    const ms = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase());
    return ms && (roleF === 'all' || u.role === roleF);
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const first = (cur - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(first, first + PAGE_SIZE);
  const selected = filtered.find(u => u.user_id === selectedId) ?? pageRows[0] ?? null;
  const inactive = users.filter(u => u.is_active === false).length;
  const pager = (
    <div className="um-pager">
      <span role="status">{first + 1}–{first + pageRows.length} of {filtered.length}{inactive ? `, ${inactive} inactive overall` : ''}</span>
      {pages > 1 && (
        <span className="um-pager-btns">
          <button type="button" className="adm-btn" onClick={() => setPage(cur - 1)} disabled={cur === 1}>Previous</button>
          <span>Page {cur} of {pages}</span>
          <button type="button" className="adm-btn" onClick={() => setPage(cur + 1)} disabled={cur === pages}>Next</button>
        </span>
      )}
    </div>
  );

  const counts = {};
  users.forEach(u => { counts[u.role] = (counts[u.role] ?? 0) + 1; });

  return (
    <>
      <style>{`@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .um-split{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:start}
        .um-bar{justify-content:flex-start}
        @media(min-width:768px){.um-bar>:first-child{flex:1 1 240px;max-width:360px}}
        .um-bar .adm-tabs{margin:0}
        .um-bar>.adm-btn{margin-left:auto}
        .um-pager{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px 16px;padding:10px 18px;border-top:1px solid var(--bg-surface);font-size:13px;color:var(--text-subtle)}
        .um-pager-btns{display:flex;align-items:center;gap:10px}
        .um-detail{display:none}
        .um-row.off{opacity:.65}
        .um-role{white-space:nowrap}
        .um-clip{display:block;max-width:26ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--text-subtle)}
        .um-pick{display:flex;align-items:center;gap:11px;width:100%;min-height:44px;padding:0;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
        .um-pick:focus-visible{outline:2px solid var(--border-focus);outline-offset:4px;border-radius:8px}
        @media(min-width:1640px){
          .um-split{grid-template-columns:minmax(0,1fr) minmax(320px,380px)}
          .um-col-act{display:none}
          .um-row.sel td{background:var(--teal-50)}
          .um-row.sel td:first-child{box-shadow:inset 3px 0 0 var(--teal)}
          .um-detail{display:block;position:sticky;top:calc(var(--topbar-h, 64px) + 16px);padding:20px;border:1px solid var(--border);border-radius:16px;background:var(--bg-card)}
        }
        .um-detail-head{display:flex;gap:14px;align-items:center}
        .um-detail-name{margin:0;font-size:18px;font-weight:800;color:var(--ink);overflow-wrap:anywhere}
        .um-detail-mail{font-size:13px;color:var(--text-subtle);overflow-wrap:anywhere}
        .um-detail-list{margin:18px 0 0;display:grid;gap:12px}
        .um-detail-list>div{display:grid;grid-template-columns:130px minmax(0,1fr);gap:8px;align-items:center}
        .um-detail-list dt{font-size:12px;font-weight:800;color:var(--text-subtle)}
        .um-detail-list dd{margin:0;font-size:14px;color:var(--ink);overflow-wrap:anywhere}
        .um-detail-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)}
        .um-detail-empty{color:var(--text-subtle);font-size:14px}
      `}</style>
      {modal && <CreateUserModal onClose={() => setModal(false)} onDone={(msg) => { setModal(false); setToast({ msg, type:'success' }); load(true); }} isMobile={isMobile} adminRoles={ADMIN_ROLES}/>}
      <Toast toast={toast} />
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onDone={(msg) => { setEditing(null); setToast({ msg, type:'success' }); load(true); }} isMobile={isMobile}/>}
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

      {toggleErr && <div style={{ marginBottom:14 }}><ErrorBlock msg={toggleErr} /></div>}
      {loadErr && <div style={{ marginBottom:14 }}><ErrorBlock msg="Could not load users." onRetry={() => load(true)} /></div>}

      <div className="adm-toolbar um-bar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by name, email or username…" />
        <PillTabs value={roleF} onChange={setRoleF} tabs={[
          { key:'all', label:'All', count:users.length },
          ...Object.entries(ROLE_CFG).filter(([key, r]) => !r.legacy || (counts[key] ?? 0) > 0).map(([key, r]) => ({ key, label:r.tab, count:counts[key] ?? 0 })),
        ]} />
        <button className="adm-btn primary" onClick={() => setModal(true)}><NavIcon name="add" size={14} color="currentColor" /> Add User</button>
      </div>

      {loading ? <Panel flush><SkeletonRows rows={5} h={48} /></Panel>
      : filtered.length === 0 ? (
        <Panel><div className="adm-empty"><NavIcon name="users" size={30} color="currentColor" />
          <div style={{ marginTop:8, fontWeight:700 }}>No users found</div>
          {(search || roleF !== 'all') && <button className="adm-link-btn" onClick={() => { setSearch(''); setRoleF('all'); }}>Clear filters</button>}</div></Panel>
      ) : (
        <>
          <div className="adm-only-d adm-d-lg um-split">
            <Panel flush>
              <div className="adm-tbl-scroll">
                <table className="adm-table">
                  <thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col" className="um-col-act" style={{ textAlign:'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {pageRows.map((u, i) => {
                      const rc = ROLE_CFG[u.role] ?? { c:'var(--text-subtle)', bg:'var(--bg-surface)', l:u.role };
                      const isActive = u.is_active !== false;
                      const isMe = u.user_id === me.user_id;
                      const canAct = canManage(u) && !isMe;
                      return (
                        <tr key={u.user_id ?? i} className={`adm-row um-row${selected?.user_id === u.user_id ? ' sel' : ''}${isActive ? '' : ' off'}`} onClick={() => setSelectedId(u.user_id)}>
                          <td>
                            <button type="button" className="um-pick" aria-controls="um-detail" aria-current={selected?.user_id === u.user_id ? 'true' : undefined}
                              onClick={(e) => { e.stopPropagation(); setSelectedId(u.user_id); }}>
                              <Avatar name={u.name} size={36} tone={u.role === 'manager' ? 'purple' : u.role === 'staff' ? 'blue' : undefined} />
                              <span style={{ display:'block', minWidth:0 }}>
                                <span style={{ display:'block', fontWeight:700 }}>{u.name}{isMe && <span className="adm-chip" style={{ marginLeft:6, background:'var(--teal-50)', color:'var(--teal)' }}>YOU</span>}</span>
                                <span className="um-clip" title={loginLabel(u)}>{loginLabel(u)}</span>
                                {u.organization_name && <span className="um-clip" title={u.organization_name}>{u.organization_name}</span>}
                              </span>
                            </button>
                          </td>
                          <td><span className="adm-pill um-role" style={{ background:rc.bg, color:rc.c }}>{roleText(u, rc)}</span></td>
                          <td><StatusPill status={isActive ? 'active' : 'inactive'} label={isActive ? 'Active' : 'Inactive'} /></td>
                          <td className="um-col-act" onClick={(e) => e.stopPropagation()}>
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
              {pager}
            </Panel>
            <aside id="um-detail" className="um-detail" aria-labelledby={selected ? 'um-detail-title' : undefined} aria-label={selected ? undefined : 'Account details'}>
              <UserDetail u={selected} isMe={selected?.user_id === me.user_id} canAct={!!selected && canManage(selected) && selected.user_id !== me.user_id}
                onEdit={setEditing} onToggle={toggleStatus} toggling={toggling} />
            </aside>
          </div>

          <div className="adm-only-m adm-m-lg adm-cards-t adm-stagger" key={`${roleF}-${search}`}>
            {pageRows.map((u, i) => {
              const rc = ROLE_CFG[u.role] ?? { c:'var(--text-subtle)', bg:'var(--bg-surface)', l:u.role };
              const isActive = u.is_active !== false;
              const isMe = u.user_id === me.user_id;
              return (
                <div key={u.user_id ?? i} className="adm-mcard" style={{ '--i':Math.min(i,8), opacity: isActive ? 1 : .65 }}>
                  <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:'8px 11px' }}>
                    <Avatar name={u.name} size={40} tone={u.role === 'manager' ? 'purple' : u.role === 'staff' ? 'blue' : undefined} />
                    <div style={{ flex:'1 1 170px', minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}{isMe && <span className="adm-chip" style={{ marginLeft:6, background:'var(--teal-50)', color:'var(--teal)' }}>YOU</span>}</div>
                      <div style={{ fontSize:12, color:'var(--text-subtle)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{loginLabel(u)}</div>
                    </div>
                    <span className="adm-pill" style={{ background:rc.bg, color:rc.c }}>{roleText(u, rc)}</span>
                  </div>
                  <div className="adm-mrow" style={{ marginTop:12, paddingTop:10, borderTop:'1px solid var(--bg-surface)' }}>
                    <span style={{ fontSize:12, color:'var(--text-subtle)' }}>{u.contact_number || 'No contact number'}</span>
                    <StatusPill status={isActive ? 'active' : 'inactive'} label={isActive ? 'Active' : 'Inactive'} />
                  </div>
                  {canManage(u) && !isMe && (
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
            {pager}
          </div>
        </>
      )}
    </>
  );
}
