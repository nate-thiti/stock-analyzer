import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, AlertTriangle, Shield, Loader2, List } from 'lucide-react';
import { api } from '../api';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', email: '', password: '' });
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistText, setWatchlistText] = useState('');
  const [watchlistSaving, setWatchlistSaving] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await api.listUsers();
      setUsers(list);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    api.getWatchlist().then((w) => {
      setWatchlist(w.symbols || []);
      setWatchlistText((w.symbols || []).join(', '));
    }).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createUser(form);
      setForm({ username: '', email: '', password: '' });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editId) return;
    try {
      const payload = {};
      if (editForm.username) payload.username = editForm.username;
      if (editForm.email) payload.email = editForm.email;
      if (editForm.password) payload.password = editForm.password;
      await api.updateUser(editId, payload);
      setEditId(null);
      setEditForm({ username: '', email: '', password: '' });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, username) => {
    if (!window.confirm(`ลบผู้ใช้ "${username}" ?`)) return;
    try {
      await api.deleteUser(id);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveWatchlist = async (e) => {
    e.preventDefault();
    setWatchlistSaving(true);
    setError(null);
    try {
      const symbols = watchlistText.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
      const res = await api.setWatchlist(symbols);
      setWatchlist(res.symbols);
      setWatchlistText(res.symbols.join(', '));
    } catch (err) {
      setError(err.message);
    } finally {
      setWatchlistSaving(false);
    }
  };

  const startEdit = (u) => {
    setEditId(u.id);
    setEditForm({ username: u.username, email: u.email, password: '' });
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-2">
          <Shield size={24} className="text-primary" />
          จัดการผู้ใช้
        </h2>
        <p className="text-sm text-muted mt-1">เฉพาะ Super Admin — สร้างและจัดการบัญชีผู้ใช้</p>
      </div>

      {error && (
        <div className="bg-danger/5 border border-danger/25 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-danger shrink-0" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <form onSubmit={handleCreate} className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Plus size={16} className="text-primary" /> สร้างผู้ใช้ใหม่
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-muted uppercase">ชื่อผู้ใช้</label>
            <input
              type="text"
              placeholder="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              className="w-full mt-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase">อีเมล</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full mt-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase">รหัสผ่าน</label>
            <input
              type="password"
              placeholder="อย่างน้อย 6 ตัว"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              className="w-full mt-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="px-6 py-2 bg-gradient-primary border border-primary rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {creating ? 'กำลังสร้าง...' : 'สร้างผู้ใช้'}
        </button>
      </form>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">รายชื่อผู้ใช้ ({users.length})</h3>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-surface/40">
                  <th className="text-left py-3 px-4 text-xs text-muted uppercase">ID</th>
                  <th className="text-left py-3 px-4 text-xs text-muted uppercase">ชื่อผู้ใช้</th>
                  <th className="text-left py-3 px-4 text-xs text-muted uppercase">อีเมล</th>
                  <th className="text-left py-3 px-4 text-xs text-muted uppercase">บทบาท</th>
                  <th className="text-right py-3 px-4 text-xs text-muted uppercase">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/30 hover:bg-surface/30">
                    {editId === u.id ? (
                      <td colSpan={5} className="p-4">
                        <form onSubmit={handleUpdate} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-xs font-bold text-muted uppercase">ชื่อผู้ใช้</label>
                            <input
                              value={editForm.username}
                              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                              className="w-full mt-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-muted uppercase">อีเมล</label>
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              className="w-full mt-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-muted uppercase">รหัสผ่าน</label>
                            <input
                              type="password"
                              placeholder="ว่าง = ไม่เปลี่ยน"
                              value={editForm.password}
                              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                              className="w-full mt-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <button type="submit" className="px-3 py-1.5 bg-primary/15 text-primary rounded-lg text-xs font-medium">บันทึก</button>
                            <button type="button" onClick={() => setEditId(null)} className="px-3 py-1.5 text-muted text-xs">ยกเลิก</button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-mono text-muted">{u.id}</td>
                        <td className="py-3 px-4 font-semibold">{u.username}</td>
                        <td className="py-3 px-4 text-muted">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            u.role === 'superadmin' ? 'bg-warning/15 text-warning' : 'bg-surface text-muted border border-border/40'
                          }`}>
                            {u.role === 'superadmin' ? 'Super Admin' : 'User'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => startEdit(u)}
                            className="text-xs text-primary hover:underline"
                          >
                            แก้ไข
                          </button>
                          {u.role !== 'superadmin' && (
                            <button
                              type="button"
                              onClick={() => handleDelete(u.id, u.username)}
                              className="text-xs text-danger hover:underline inline-flex items-center gap-1"
                            >
                              <Trash2 size={12} /> ลบ
                            </button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveWatchlist} className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <List size={16} className="text-primary" />
          Watchlist ทั่วไป (Market Signals)
        </h3>
        <p className="text-xs text-muted">หุ้นที่ใช้สแกนสัญญาณบนหน้าแรก — ผู้ใช้สามารถสลับไปใช้รายการโปรดของตัวเองได้</p>
        <textarea
          value={watchlistText}
          onChange={(e) => setWatchlistText(e.target.value)}
          rows={3}
          placeholder="AAPL, MSFT, NVDA, PTT.BK..."
          className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
        />
        <p className="text-xs text-muted">{watchlist.length} หุ้นในปัจจุบัน</p>
        {watchlist.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {watchlist.map((sym) => (
              <span key={sym} className="px-2 py-0.5 rounded-md text-xs font-mono bg-surface border border-border/40 text-muted">
                {sym}
              </span>
            ))}
          </div>
        )}
        <button
          type="submit"
          disabled={watchlistSaving}
          className="px-6 py-2 bg-gradient-primary border border-primary rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {watchlistSaving ? 'กำลังบันทึก...' : 'บันทึก Watchlist'}
        </button>
      </form>
    </div>
  );
}
