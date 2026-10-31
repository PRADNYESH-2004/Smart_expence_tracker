import { useEffect, useMemo, useState } from 'react';
import { Wallet, Plus, Search, LogOut, Trash2, Pencil, TrendingUp, Receipt, CalendarDays, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const today = new Date().toISOString().slice(0, 10);
const blank = { title: '', amount: '', category: 'Food', expense_date: today, note: '' };

async function request(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  if (!response.ok) {
    let message = 'Something went wrong';
    try { const data = await response.json(); message = data.detail || message; } catch {}
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('expense_token') || '');
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('login');
  const [auth, setAuth] = useState({ name: '', email: '', password: '' });
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, count: 0, monthly_total: 0, category_totals: {} });
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadData(activeToken = token) {
    const [me, list, stats] = await Promise.all([
      request('/auth/me', activeToken), request('/expenses', activeToken), request('/expenses/summary', activeToken)
    ]);
    setUser(me); setExpenses(list); setSummary(stats);
  }
  useEffect(() => { if (token) loadData().catch(() => logout()); }, [token]);

  function logout() {
    localStorage.removeItem('expense_token'); setToken(''); setUser(null); setExpenses([]);
  }

  async function submitAuth(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      let result;
      if (mode === 'register') {
        result = await request('/auth/register', '', { method: 'POST', body: JSON.stringify(auth) });
      } else {
        const body = new URLSearchParams({ username: auth.email, password: auth.password });
        result = await request('/auth/login', '', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      }
      localStorage.setItem('expense_token', result.access_token); setToken(result.access_token);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function saveExpense(e) {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, amount: Number(form.amount) };
      await request(editing ? `/expenses/${editing}` : '/expenses', token, {
        method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload)
      });
      setShowForm(false); setEditing(null); setForm(blank); await loadData();
    } catch (err) { setError(err.message); }
  }

  function startEdit(item) {
    setEditing(item.id); setForm({ title: item.title, amount: String(item.amount), category: item.category, expense_date: item.expense_date, note: item.note || '' }); setShowForm(true);
  }

  async function removeExpense(id) {
    if (!confirm('Delete this expense?')) return;
    try { await request(`/expenses/${id}`, token, { method: 'DELETE' }); await loadData(); }
    catch (err) { setError(err.message); }
  }

  const visible = useMemo(() => expenses.filter(x =>
    (category === 'All' || x.category === category) &&
    `${x.title} ${x.note || ''}`.toLowerCase().includes(search.toLowerCase())
  ), [expenses, category, search]);
  const categories = ['All', 'Food', 'Travel', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Other'];
  const topCategory = Object.entries(summary.category_totals || {}).sort((a,b) => b[1]-a[1])[0];

  if (!token || !user) return <main className="auth-page"><section className="auth-card">
    <div className="brand-mark"><Wallet size={24}/></div><p className="eyebrow">PERSONAL FINANCE, SIMPLIFIED</p>
    <h1>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1><p className="muted">Keep your spending clear and under control.</p>
    <form onSubmit={submitAuth} className="stack">
      {mode === 'register' && <label>Full name<input required minLength="2" value={auth.name} onChange={e=>setAuth({...auth,name:e.target.value})} placeholder="Your name"/></label>}
      <label>Email address<input required type="email" value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})} placeholder="you@example.com"/></label>
      <label>Password<input required minLength="8" type="password" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})} placeholder="At least 8 characters"/></label>
      {error && <p className="error">{error}</p>}
      <button className="primary full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
    </form>
    <p className="switch">{mode === 'login' ? "New here?" : 'Already have an account?'} <button onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='login'?'Create an account':'Sign in'}</button></p>
  </section></main>;

  return <main className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark"><Wallet size={21}/></span><b>pocketwise</b></div>
      <div className="side-label">WORKSPACE</div><div className="nav-active"><TrendingUp size={18}/> Overview</div>
      <div className="sidebar-bottom"><div className="avatar">{user.name?.[0]?.toUpperCase()}</div><div className="user-meta"><b>{user.name}</b><small>{user.email}</small></div><button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={17}/></button></div>
    </aside>
    <section className="content">
      <header className="topbar"><div><p className="eyebrow">YOUR FINANCIAL SNAPSHOT</p><h1>Overview</h1></div><button className="primary" onClick={()=>{setEditing(null);setForm(blank);setShowForm(true)}}><Plus size={18}/> Add expense</button></header>
      {error && <div className="notice">{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
      <section className="stats">
        <article className="stat-card dark"><div className="stat-top"><span>Total expenses</span><Wallet size={18}/></div><strong>{money(summary.total)}</strong><small>Across all your transactions</small></article>
        <article className="stat-card"><div className="stat-top"><span>This month</span><CalendarDays size={18}/></div><strong>{money(summary.monthly_total)}</strong><small>Spent in the current month</small></article>
        <article className="stat-card"><div className="stat-top"><span>Transactions</span><Receipt size={18}/></div><strong>{summary.count}</strong><small>{topCategory ? `Top category: ${topCategory[0]}` : 'No expenses yet'}</small></article>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Recent transactions</h2><p className="muted">A clear view of where your money goes.</p></div><span className="count-pill">{visible.length} records</span></div>
        <div className="toolbar"><div className="searchbox"><Search size={17}/><input placeholder="Search expenses..." value={search} onChange={e=>setSearch(e.target.value)}/></div><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
        <div className="table-wrap"><table><thead><tr><th>EXPENSE</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th></th></tr></thead><tbody>
          {visible.map(item=><tr key={item.id}><td><div className="expense-title">{item.title}</div><small>{item.note || '—'}</small></td><td><span className="category-tag">{item.category}</span></td><td>{new Date(item.expense_date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td><td className="amount">{money(item.amount)}</td><td><div className="actions"><button className="icon-btn" title="Edit" onClick={()=>startEdit(item)}><Pencil size={15}/></button><button className="icon-btn danger" title="Delete" onClick={()=>removeExpense(item.id)}><Trash2 size={15}/></button></div></td></tr>)}
          {!visible.length && <tr><td colSpan="5" className="empty">No expenses found. Add your first expense to get started.</td></tr>}
        </tbody></table></div>
      </section>
      <footer>Made to make money feel a little simpler. <span>Smart Expense Tracker</span></footer>
    </section>
    {showForm && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><form className="modal" onSubmit={saveExpense}>
      <div className="modal-head"><div><p className="eyebrow">{editing?'UPDATE RECORD':'NEW RECORD'}</p><h2>{editing?'Edit expense':'Add an expense'}</h2></div><button type="button" className="icon-btn" onClick={()=>setShowForm(false)}><X/></button></div>
      <label>Expense title<input required maxLength="120" placeholder="e.g. Lunch with friends" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
      <div className="form-grid"><label>Amount (₹)<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00"/></label><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.slice(1).map(c=><option key={c}>{c}</option>)}</select></label></div>
      <label>Date<input required type="date" value={form.expense_date} onChange={e=>setForm({...form,expense_date:e.target.value})}/></label>
      <label>Note (optional)<textarea maxLength="500" rows="3" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Add a short note..."/></label>
      <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary">{editing?'Save changes':'Save expense'}</button></div>
    </form></div>}
  </main>;
}
