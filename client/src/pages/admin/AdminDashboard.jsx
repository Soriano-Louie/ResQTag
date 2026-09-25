import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { 
  ShieldCheck, 
  Users, 
  QrCode, 
  Activity, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Loader2, 
  Power,
  ExternalLink
} from 'lucide-react';

export default function AdminDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState({ totalUsers: 0, activeTags: 0, totalScans: 0 });
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers({ search, page, limit: 15 })
      ]);
      setStats(statsRes.stats);
      setUsers(usersRes.users);
      setTotalPages(usersRes.pagination.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load admin management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleToggleUserStatus = async (user) => {
    try {
      const newStatus = user.account_status === 'active' ? 'suspended' : 'active';
      await adminService.updateUserStatus(user.user_id, newStatus);
      toast.success(`User ${user.first_name} is now ${newStatus}.`);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user and their records?')) return;
    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted successfully.');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ResQTag Admin Console</h1>
            <p className="text-xs text-slate-400">Platform metrics, user oversight & QR tag management</p>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-brand-50 text-brand-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Registered Users</span>
            <span className="text-2xl font-black text-slate-900">{stats.totalUsers}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Active QR Tags</span>
            <span className="text-2xl font-black text-slate-900">{stats.activeTags}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-sky-50 text-sky-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Tag Scans</span>
            <span className="text-2xl font-black text-slate-900">{stats.totalScans}</span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-base font-bold text-slate-900">User Management</h2>
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user name or email..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </form>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No registered users found matching your search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-500 text-[10px]">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4">QR Tag Status</th>
                  <th className="p-4">Scans</th>
                  <th className="p-4">Registered</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.user_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 font-bold text-slate-900">
                      {u.first_name} {u.last_name}
                      {u.role === 'admin' && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-700">{u.email}</td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.account_status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.account_status}
                      </span>
                    </td>
                    <td className="p-4">
                      {u.qr_token ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.qr_status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.qr_status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {u.qr_status}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No tag</span>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">{u.scan_count || 0}</td>
                    <td className="p-4 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {u.role !== 'admin' && (
                        <>
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              u.account_status === 'active'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={u.account_status === 'active' ? 'Suspend Account' : 'Activate Account'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.user_id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
