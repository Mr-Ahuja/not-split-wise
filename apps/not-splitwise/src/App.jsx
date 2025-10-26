import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  auth,
  onAuth,
  signInWithGoogle,
  signOut,
  db,
  ref,
  onValue,
  get,
  set,
  update,
  push,
  isUserApproved,
  isAdmin,
  createGroup,
  addUserToGroup,
  addExpense,
  requestAccess,
  emailKey,
  tokenActive,
  useToken,
  ADMIN_EMAIL,
  parseAuthError,
} from './firebase';

const AuthContext = createContext(null);

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  async function doCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {}
  }
  return (
    <button type="button" className="copy-btn" onClick={doCopy} title={label} aria-label={`Copy ${label}`}>
      {copied ? (
        // check icon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l7.7-7.7 1.4 1.4z"/></svg>
      ) : (
        // copy icon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
      )}
    </button>
  );
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const unsub = onAuth(async (u) => {
      setUser(u);
      if (u?.email) {
        const ok = isAdmin(u) ? true : await isUserApproved(u.email);
        setApproved(ok);
        // Sync basic profile for display
        try {
          await update(ref(db, `userProfiles/${u.uid}`), {
            email: u.email || null,
            name: u.displayName || null,
            photoURL: u.photoURL || null,
            lastSeenAt: Date.now(),
          });
        } catch {}
      } else {
        setApproved(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const value = useMemo(() => ({ user, loading, approved }), [user, loading, approved]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuthCtx() {
  return useContext(AuthContext);
}

function Header() {
  const { user, approved } = useAuthCtx();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [err, setErr] = useState(null);
  const [notifStatus, setNotifStatus] = useState(Notification?.permission || 'default');

  useEffect(() => {
    function onBip(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    }
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', () => setCanInstall(false));
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
    };
  }, []);

  async function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome !== 'accepted') {
      // no-op
    }
    setDeferredPrompt(null);
    setCanInstall(false);
  }

  async function enableNotifications() {
    try {
      const res = await Notification.requestPermission();
      setNotifStatus(res);
    } catch {}
  }
  async function doSignIn() {
    try { setErr(null); await signInWithGoogle(); } catch (e) { setErr(parseAuthError(e)); }
  }
  return (
    <header className="site">
      <div className="inner container">
        <Link to="/" className="brand">
          <img src="/logo.svg" alt="logo" />
          <strong>Not Splitwise</strong>
        </Link>
        <nav>
          {user && (
            <>
              <Link className="btn" to="/dashboard">Dashboard</Link>
              {isAdmin(user) && <Link className="btn" to="/admin">Admin</Link>}
            </>
          )}
          {canInstall && <button className="btn" onClick={installApp}>Install App</button>}
          {notifStatus !== 'granted' && <button className="btn" onClick={enableNotifications}>Enable Notifications</button>}
          {user ? (
            <button className="btn" onClick={() => signOut()}>Sign out</button>
          ) : (
            <button className="btn mellange" onClick={doSignIn}>Sign in</button>
          )}
        </nav>
        {err && (
          <div className="muted" style={{marginTop: 8}}>
            {err.message} {err.helpUrl && <a className="btn" href={err.helpUrl} target="_blank" rel="noreferrer">Open Console</a>}
          </div>
        )}
      </div>
    </header>
  );
}

function Restricted() {
  const { user, loading, approved } = useAuthCtx();
  const navigate = useNavigate();
  const [err, setErr] = useState(null);
  async function doSignIn() { try { setErr(null); await signInWithGoogle(); } catch (e) { setErr(parseAuthError(e)); } }
  useEffect(() => {
    if (!loading) {
      if (user && approved) navigate('/dashboard');
    }
  }, [user, approved, loading, navigate]);
  return (
    <div className="container">
      <div className="card">
        <h2>Welcome to Not Splitwise</h2>
        <p className="muted">Invite-only expense sharing app for close-knit groups.</p>
        {!user ? (
          <>
            <button className="btn mellange" onClick={doSignIn}>Sign in with Google</button>
            {err && <p className="muted">{err.message} {err.helpUrl && <a href={err.helpUrl} target="_blank" rel="noreferrer">Open Console</a>}</p>}
          </>
        ) : approved ? (
          <p>Redirecting…</p>
        ) : (
          <div className="col">
            <p>Your account isn’t approved yet.</p>
            <Link className="btn" to="/request-access">Request Access</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function RequireApproved({ children }) {
  const { user, loading, approved } = useAuthCtx();
  if (loading) return <div className="container"><div className="card">Loading…</div></div>;
  if (!user) return <Navigate to="/" replace />;
  if (isAdmin(user)) return children;
  if (!approved) return <Navigate to="/request-access" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuthCtx();
  if (loading) return <div className="container"><div className="card">Loading…</div></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!isAdmin(user)) return <Navigate to="/" replace />;
  return children;
}

function RequireMember({ children }) {
  const { user, loading, approved } = useAuthCtx();
  const { groupId } = useParams();
  const [isMember, setIsMember] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;
    const mRef = ref(db, `groups/${groupId}/members/${user.uid}`);
    const unsub = onValue(mRef, (snap) => {
      setIsMember(!!snap.val());
      setChecking(false);
    }, { onlyOnce: true });
    return () => unsub();
  }, [user, groupId]);

  if (loading || checking) return <div className="container"><div className="card">Loading…</div></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!(approved || isMember)) return <Navigate to={`/join?groupId=${groupId}`} replace />;
  return children;
}

function Dashboard() {
  const { user } = useAuthCtx();
  const [groups, setGroups] = useState([]);
  const [newName, setNewName] = useState('');
  const [err, setErr] = useState(null);
  const [connected, setConnected] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    // Track RTDB connection state
    const cRef = ref(db, '.info/connected');
    const offC = onValue(cRef, (snap) => setConnected(!!snap.val()), () => setConnected(false));
    const ugRef = ref(db, `userGroupLinks/${user.uid}`);
    const unsub = onValue(ugRef, async (snap) => {
      try {
        const val = snap.val() || {};
        const ids = Object.keys(val);
        const results = await Promise.all(ids.map(async (gid) => {
          const g = await get(ref(db, `groups/${gid}`));
          return g.exists() ? { id: gid, ...g.val() } : null;
        }));
        setGroups(results.filter(Boolean));
      } catch (e) {
        setErr('Cannot reach Realtime Database. Ensure your RTDB is created and the URL is correct.');
      }
    }, (e) => setErr('Realtime Database connection failed.')); 
    return () => { offC(); unsub(); };
  }, [user]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const gid = await createGroup(newName.trim(), user.uid);
      setNewName('');
      navigate(`/group/${gid}`);
    } catch (e) {
      setErr('Failed to create group. Check Realtime Database configuration.');
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Your Groups</h2>
        {err && <p className="muted">{err}</p>}
        <ul>
          {groups.map(g => {
            const invite = `${location.origin}/join?groupId=${g.id}`;
            return (
              <li key={g.id} className="row hover-show">
                <Link className="btn" to={`/group/${g.id}`}>{g.name}</Link>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <code>{invite}</code>
                  <CopyBtn text={invite} label="Copy invite" />
                </div>
              </li>
            );
          })}
          {groups.length === 0 && <p className="muted">No groups yet.</p>}
        </ul>
      </div>
      <div className="card">
        <h3>Create Group</h3>
        <form onSubmit={handleCreate} className="row">
          <input className="input" placeholder="Group name" value={newName} onChange={e => setNewName(e.target.value)} />
          <button className="btn mellange" type="submit" disabled={!newName.trim() || !connected}>Create</button>
        </form>
        {!connected && <p className="muted">Realtime Database is not connected. Create your RTDB instance in Firebase Console and reload.</p>}
      </div>
    </div>
  );
}

function GroupPage() {
  const { user } = useAuthCtx();
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'custom'
  const [customSplit, setCustomSplit] = useState({});
  const [profiles, setProfiles] = useState({});
  const [err, setErr] = useState(null);
  const [lastSeen, setLastSeen] = useState(0);

  useEffect(() => {
    const gRef = ref(db, `groups/${groupId}`);
    const unsub = onValue(gRef, (snap) => {
      const val = snap.val();
      setGroup(val);
      if (val?.members) {
        const memberIds = Object.keys(val.members);
        memberIds.forEach(async (uid) => {
          const p = await get(ref(db, `userProfiles/${uid}`));
          if (p.exists()) setProfiles(prev => ({ ...prev, [uid]: p.val() }));
        });
      }
      // Notifications for new expenses affecting current user
      if (val?.expenses && Notification?.permission === 'granted' && user) {
        let maxTs = lastSeen;
        Object.entries(val.expenses).forEach(([id, ex]) => {
          const ts = Number(ex.createdAt || 0);
          if (ts > lastSeen && ex.split && ex.split[user.uid] > 0 && ex.paidBy !== user.uid) {
            const body = `${ex.title} — ₹${ex.amount} (you owe ₹${ex.split[user.uid]})`;
            if (navigator.serviceWorker?.ready) {
              navigator.serviceWorker.ready.then(reg => reg.showNotification('New expense', { body }));
            } else {
              try { new Notification('New expense', { body }); } catch {}
            }
          }
          if (ts > maxTs) maxTs = ts;
        });
        if (maxTs !== lastSeen) setLastSeen(maxTs);
      }
    }, (e) => setErr('Failed to load group (DB connection).'));
    return () => unsub();
  }, [groupId]);

  async function addNewExpense(e) {
    e.preventDefault();
    if (!group || !title.trim() || !amount) return;
    const members = Object.keys(group.members || {});
    const amt = Number(amount);
    let split = {};
    if (splitMode === 'custom') {
      const sum = members.reduce((acc, m) => acc + Number(customSplit[m] || 0), 0);
      if (Math.abs(sum - amt) > 0.01) { setErr('Custom split must sum to total amount.'); return; }
      split = Object.fromEntries(members.map(m => [m, Number(customSplit[m] || 0)]));
    } else {
      const each = Math.round((amt / members.length) * 100) / 100;
      split = Object.fromEntries(members.map(m => [m, each]));
    }
    try {
      await addExpense(groupId, {
        title: title.trim(),
        amount: amt,
        paidBy: user.uid,
        createdAt: Date.now(),
        split,
      });
      setTitle('');
      setAmount('');
      setErr(null);
    } catch (e) {
      setErr('Failed to add expense. Check DB configuration.');
    }
  }

  const shareLink = `${location.origin}/join?groupId=${groupId}`;

  function memberName(uid) {
    return profiles[uid]?.name || uid;
  }

  function computeBalances() {
    const balances = {};
    Object.keys(group?.members || {}).forEach(uid => balances[uid] = 0);
    Object.values(group?.expenses || {}).forEach(exp => {
      const amount = Number(exp.amount || 0);
      const split = exp.split || {};
      const paidBy = exp.paidBy;
      if (paidBy) balances[paidBy] += amount;
      Object.entries(split).forEach(([uid, share]) => {
        balances[uid] -= Number(share || 0);
      });
    });
    return balances;
  }

  function settlementSuggestions(balances) {
    const debtors = Object.entries(balances).filter(([, b]) => b < -0.01).map(([u, b]) => [u, -b]);
    const creditors = Object.entries(balances).filter(([, b]) => b > 0.01).map(([u, b]) => [u, b]);
    debtors.sort((a,b)=>b[1]-a[1]);
    creditors.sort((a,b)=>b[1]-a[1]);
    const tx = [];
    let i=0,j=0;
    while(i<debtors.length && j<creditors.length){
      const [du, da] = debtors[i];
      const [cu, ca] = creditors[j];
      const pay = Math.min(da, ca);
      tx.push({ from: du, to: cu, amount: Math.round(pay*100)/100 });
      debtors[i][1]-=pay; creditors[j][1]-=pay;
      if (debtors[i][1] < 0.01) i++;
      if (creditors[j][1] < 0.01) j++;
    }
    return tx;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>{group?.name || 'Group'}</h2>
        <p className="muted hover-show">Share invite: <code>{shareLink}</code> <CopyBtn text={shareLink} label="Copy invite" /></p>
      </div>
      <div className="card">
        <h3>Add expense</h3>
        {err && <p className="muted">{err}</p>}
        <form onSubmit={addNewExpense} className="col">
          <input className="input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="input" type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <div className="row">
            <label><input type="radio" name="split" checked={splitMode==='equal'} onChange={()=>setSplitMode('equal')} /> Equal split</label>
            <label><input type="radio" name="split" checked={splitMode==='custom'} onChange={()=>{
              setSplitMode('custom');
              if (group?.members){
                const ids = Object.keys(group.members);
                const amt = Number(amount||0);
                const each = ids.length>0 ? Math.round((amt/ids.length)*100)/100 : 0;
                setCustomSplit(Object.fromEntries(ids.map(id=>[id, each])));
              }
            }} /> Custom split</label>
          </div>
          {splitMode==='custom' && (
            <div className="col">
              {Object.keys(group?.members||{}).map(uid => (
                <div className="row" key={uid}>
                  <span style={{minWidth: 140}}>{memberName(uid)}</span>
                  <input className="input" type="number" value={customSplit[uid]||0} onChange={e => setCustomSplit(s=>({...s, [uid]: Number(e.target.value||0)}))} />
                </div>
              ))}
            </div>
          )}
          <button className="btn" type="submit">Add</button>
        </form>
      </div>
      <div className="card">
        <h3>Expenses</h3>
        <ul>
          {Object.entries(group?.expenses || {}).map(([id, exp]) => (
            <li key={id}>
              <strong>{exp.title}</strong> — ₹{exp.amount} — paid by {memberName(exp.paidBy)}
            </li>
          ))}
          {!group?.expenses && <p className="muted">No expenses yet.</p>}
        </ul>
      </div>
      <div className="card">
        <h3>Balances</h3>
        {group && (()=>{
          const b = computeBalances();
          const tx = settlementSuggestions(b);
          return (
            <div>
              <ul>
                {Object.entries(b).map(([uid, val]) => (
                  <li key={uid}>{memberName(uid)}: {val>=0?'+':''}₹{Math.round(val*100)/100}</li>
                ))}
              </ul>
              {tx.length>0 && (
                <>
                  <h4>Suggested settlements</h4>
                  <ul>
                    {tx.map((t,i)=>(<li key={i}>{memberName(t.from)} → {memberName(t.to)}: ₹{t.amount}</li>))}
                  </ul>
                </>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function Join() {
  const { user } = useAuthCtx();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const groupId = params.get('groupId');
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      if (!user || !groupId) return;
      await addUserToGroup(user.uid, groupId);
      navigate(`/group/${groupId}`, { replace: true });
    })();
  }, [user, groupId, navigate]);

  return (
    <div className="container">
      <div className="card">
        <h2>Join Group</h2>
        {!user && <>
          <button className="btn mellange" onClick={async ()=>{ try { setErr(null); await signInWithGoogle(); } catch(e){ setErr(parseAuthError(e)); } }}>Sign in to join</button>
          {err && <p className="muted">{err.message} {err.helpUrl && <a href={err.helpUrl} target="_blank" rel="noreferrer">Open Console</a>}</p>}
        </>}
        {user && <p>Adding you to the group…</p>}
      </div>
    </div>
  );
}

function UserInvite() {
  const { user } = useAuthCtx();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const [status, setStatus] = useState('checking');
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      if (!token) return setStatus('invalid');
      if (!user?.email) return setStatus('need-signin');
      const ok = await useToken(token, user.email);
      setStatus(ok ? 'ok' : 'invalid');
      if (ok) navigate('/dashboard', { replace: true });
    })();
  }, [token, user, navigate]);

  return (
    <div className="container">
      <div className="card">
        <h2>User Invite</h2>
        {status === 'need-signin' && (<>
          <button className="btn mellange" onClick={async ()=>{ try { setErr(null); await signInWithGoogle(); } catch(e){ setErr(parseAuthError(e)); } }}>Sign in to accept invite</button>
          {err && <p className="muted">{err.message} {err.helpUrl && <a href={err.helpUrl} target="_blank" rel="noreferrer">Open Console</a>}</p>}
        </>)}
        {status === 'checking' && <p>Validating…</p>}
        {status === 'invalid' && <p>Invalid or revoked invite link.</p>}
      </div>
    </div>
  );
}

function RequestAccess() {
  const { user } = useAuthCtx();
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!user) return;
    await requestAccess(user.uid, user.email);
    setSent(true);
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Request Access</h2>
        {!user ? (
          <button className="btn mellange" onClick={() => signInWithGoogle()}>Sign in</button>
        ) : sent ? (
          <p>Request sent. You’ll be notified once approved.</p>
        ) : (
          <button className="btn" onClick={submit}>Send Request</button>
        )}
      </div>
    </div>
  );
}

function Admin() {
  const { user } = useAuthCtx();
  const [requests, setRequests] = useState({});
  const [tokens, setTokens] = useState({});
  const [err, setErr] = useState(null);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const cRef = ref(db, '.info/connected');
    const offC = onValue(cRef, (snap) => setConnected(!!snap.val()), () => setConnected(false));
    const rRef = ref(db, 'admin/requests');
    const unsubR = onValue(rRef, (snap) => setRequests(snap.val() || {}), () => setErr('Failed to load requests (DB).'));
    const tRef = ref(db, 'admin/userInviteTokens');
    const unsubT = onValue(tRef, (snap) => setTokens(snap.val() || {}), () => setErr('Failed to load tokens (DB).'));
    return () => { offC(); unsubR(); unsubT(); };
  }, []);

  async function approve(email, uid) {
    await update(ref(db), {
      [`allowedUsers/${emailKey(email)}`]: true,
      [`admin/requests/${uid}/approved`]: true,
      [`admin/requests/${uid}/approvedAt`]: Date.now(),
    });
  }

  async function reject(uid) {
    await set(ref(db, `admin/requests/${uid}`), null);
  }

  async function generateToken() {
    try {
      setErr(null);
      const token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
      await set(ref(db, `admin/userInviteTokens/${token}`), { active: true, createdAt: Date.now(), createdBy: user.email });
    } catch (e) {
      setErr('Failed to generate token. Ensure Realtime Database exists and you have write access.');
    }
  }

  async function revokeToken(token) {
    await update(ref(db, `admin/userInviteTokens/${token}`), { active: false, revokedAt: Date.now() });
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Admin Panel</h2>
        <p className="muted">Signed in as: {user?.email} (admin: {isAdmin(user) ? 'yes' : 'no'})</p>
        {!connected && <p className="muted">Realtime Database is not connected. Create/enable RTDB and reload.</p>}
        {err && <p className="muted">{err}</p>}
      </div>
      <div className="card">
        <h3>Pending Requests</h3>
        <ul>
          {Object.entries(requests).filter(([, r]) => !r.approved).map(([uid, r]) => (
            <li key={uid} className="row">
              <span>{r.email}</span>
              <button className="btn" onClick={() => approve(r.email, uid)}>Approve</button>
              <button className="btn" onClick={() => reject(uid)}>Reject</button>
            </li>
          ))}
          {Object.keys(requests).length === 0 && <p className="muted">No pending requests.</p>}
        </ul>
      </div>
      <div className="card">
        <h3>User Invite Tokens</h3>
        <button className="btn" onClick={generateToken} disabled={!connected}>Generate Token</button>
        <ul>
          {Object.entries(tokens).map(([tok, info]) => (
            <li key={tok} className="row hover-show">
              <code style={{flex: 1}}>{location.origin}/user-invite?token={tok}</code>
              <CopyBtn text={`${location.origin}/user-invite?token=${tok}`} label="Copy link" />
              <span className="muted">{info.active ? 'active' : 'revoked'}</span>
              {info.active && <button className="btn" onClick={() => revokeToken(tok)}>Revoke</button>}
            </li>
          ))}
          {Object.keys(tokens).length === 0 && <p className="muted">No tokens yet.</p>}
        </ul>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="page">
      <AuthProvider>
        <Header />
        <Routes>
          <Route path="/" element={<Restricted />} />
          <Route path="/dashboard" element={<RequireApproved><Dashboard /></RequireApproved>} />
          <Route path="/group/:groupId" element={<RequireMember><GroupPage /></RequireMember>} />
          <Route path="/join" element={<Join />} />
          <Route path="/user-invite" element={<UserInvite />} />
          <Route path="/request-access" element={<RequestAccess />} />
          <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <footer className="site-footer">
          Not Splitwise by The Chosen One - Preetam Ahuja ·
          {' '}<a href="https://preetam.thechosenone.in/" target="_blank" rel="noreferrer">Preetam Ahuja</a>
        </footer>
      </AuthProvider>
    </div>
  );
}
