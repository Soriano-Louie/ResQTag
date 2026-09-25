import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { tagOrderService } from '../../services/tagOrderService';
import { useToast } from '../../context/ToastContext';
import AdminPrintModal from '../../components/admin/AdminPrintModal';
import { 
  ShieldCheck, 
  Users, 
  QrCode, 
  Activity, 
  Search, 
  CheckCircle2, 
  Trash2, 
  Loader2, 
  Power,
  Package,
  Printer,
  Clock,
  Sparkles,
  Truck,
  Filter
} from 'lucide-react';

export default function AdminDashboard() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'users'

  // User Management State
  const [stats, setStats] = useState({ totalUsers: 0, activeTags: 0, totalScans: 0 });
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Order Management State
  const [orders, setOrders] = useState([]);
  const [orderCounts, setOrderCounts] = useState({ pendingCount: 0, processingCount: 0, printedCount: 0, deliveredCount: 0 });
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Print Modal State
  const [selectedPrintOrderId, setSelectedPrintOrderId] = useState(null);

  // Load User Data
  const loadUserData = async () => {
    try {
      setLoadingUsers(true);
      const [statsRes, usersRes] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers({ search: userSearch, page: userPage, limit: 15 })
      ]);
      setStats(statsRes.stats);
      setUsers(usersRes.users);
      setUserTotalPages(usersRes.pagination.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load user management data.');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load Orders Data
  const loadOrdersData = async () => {
    try {
      setLoadingOrders(true);
      const res = await tagOrderService.getAdminOrders({
        status: orderStatusFilter,
        search: orderSearch,
        page: orderPage,
        limit: 15
      });
      setOrders(res.orders || []);
      setOrderCounts(res.counts || { pendingCount: 0, processingCount: 0, printedCount: 0, deliveredCount: 0 });
      setOrderTotalPages(res.pagination.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load tag printing orders.');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [userPage]);

  useEffect(() => {
    loadOrdersData();
  }, [orderPage, orderStatusFilter]);

  const handleUserSearchSubmit = (e) => {
    e.preventDefault();
    setUserPage(1);
    loadUserData();
  };

  const handleOrderSearchSubmit = (e) => {
    e.preventDefault();
    setOrderPage(1);
    loadOrdersData();
  };

  const handleToggleUserStatus = async (user) => {
    try {
      const newStatus = user.account_status === 'active' ? 'suspended' : 'active';
      await adminService.updateUserStatus(user.user_id, newStatus);
      toast.success(`User ${user.first_name} is now ${newStatus}.`);
      loadUserData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user and their records?')) return;
    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted successfully.');
      loadUserData();
      loadOrdersData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await tagOrderService.updateOrderStatus(orderId, newStatus);
      toast.success(`Order #${orderId} updated to ${newStatus}.`);
      loadOrdersData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getStatusPill = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> Pending
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-100 text-sky-800 border border-sky-200">
            <Sparkles className="w-3 h-3 text-sky-600" /> In Production
          </span>
        );
      case 'printed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
            <CheckCircle2 className="w-3 h-3 text-purple-600" /> Printed
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Truck className="w-3 h-3 text-emerald-600" /> Delivered
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">ResQTag Admin Fulfillment Console</h1>
            <p className="text-xs text-slate-400">Physical tag production queue, user oversight & analytics</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-800 rounded-2xl border border-slate-700">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            Print Requests
            {orderCounts.pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
                {orderCounts.pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Users
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pending Review</span>
            <span className="text-2xl font-black text-slate-900">{orderCounts.pendingCount || 0}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">In Production</span>
            <span className="text-2xl font-black text-slate-900">{orderCounts.processingCount || 0}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Printed Tags</span>
            <span className="text-2xl font-black text-slate-900">{orderCounts.printedCount || 0}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Delivered Kits</span>
            <span className="text-2xl font-black text-slate-900">{orderCounts.deliveredCount || 0}</span>
          </div>
        </div>
      </div>

      {/* TAB 1: TAG PRINT ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Physical Tag Print Queue</h2>
              <p className="text-xs text-slate-500">Review requests, print physical sheets & update delivery statuses</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Status Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => {
                    setOrderStatusFilter(e.target.value);
                    setOrderPage(1);
                  }}
                  className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Review</option>
                  <option value="processing">In Production</option>
                  <option value="printed">Printed</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Search Form */}
              <form onSubmit={handleOrderSearchSubmit} className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search recipient, email, phone..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </form>
            </div>
          </div>

          {loadingOrders ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-1">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">No print requests found</p>
              <p className="text-slate-400">Incoming tag orders submitted by users will appear in this queue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500 text-[10px]">
                  <tr>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Customer & Recipient</th>
                    <th className="p-4">Format</th>
                    <th className="p-4">Quantity</th>
                    <th className="p-4">Delivery Address</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Requested</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.order_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900">
                        #{order.order_id}
                      </td>

                      <td className="p-4">
                        <span className="font-bold text-slate-900 block">
                          {order.recipient_name}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {order.contact_number} • {order.email}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                          {order.tag_type === 'keychain' ? '🔑 Keychain' : order.tag_type === 'wallet_card' ? '💳 Wallet Card' : '⭐ Complete Kit'}
                        </span>
                      </td>

                      <td className="p-4 font-bold text-slate-900">
                        {order.quantity}x
                      </td>

                      <td className="p-4 max-w-xs text-slate-700 truncate" title={order.shipping_address}>
                        {order.shipping_address}
                      </td>

                      <td className="p-4">
                        {getStatusPill(order.order_status)}
                      </td>

                      <td className="p-4 text-slate-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>

                      <td className="p-4 text-right space-x-2">
                        {/* Print Button */}
                        <button
                          onClick={() => setSelectedPrintOrderId(order.order_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[11px] shadow transition-all"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print Tag
                        </button>

                        {/* Status Transition Quick Select */}
                        <select
                          value={order.order_status}
                          onChange={(e) => handleUpdateOrderStatus(order.order_id, e.target.value)}
                          className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300/70 rounded-xl text-[11px] font-bold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">In Production</option>
                          <option value="printed">Printed</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Orders Pagination */}
          {orderTotalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>Page {orderPage} of {orderTotalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={orderPage <= 1}
                  onClick={() => setOrderPage(p => p - 1)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 font-bold"
                >
                  Previous
                </button>
                <button
                  disabled={orderPage >= orderTotalPages}
                  onClick={() => setOrderPage(p => p + 1)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">User Account Management</h2>
              <p className="text-xs text-slate-500">Manage registered user accounts, active statuses & security</p>
            </div>
            <form onSubmit={handleUserSearchSubmit} className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user name or email..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </form>
          </div>

          {loadingUsers ? (
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
                <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500 text-[10px]">
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

          {/* User Pagination */}
          {userTotalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>Page {userPage} of {userTotalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={userPage <= 1}
                  onClick={() => setUserPage(p => p - 1)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 font-bold"
                >
                  Previous
                </button>
                <button
                  disabled={userPage >= userTotalPages}
                  onClick={() => setUserPage(p => p + 1)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Print Modal */}
      {selectedPrintOrderId && (
        <AdminPrintModal
          orderId={selectedPrintOrderId}
          onClose={() => setSelectedPrintOrderId(null)}
          onStatusUpdated={loadOrdersData}
        />
      )}
    </div>
  );
}
