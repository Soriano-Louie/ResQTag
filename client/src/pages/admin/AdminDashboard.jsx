import React, { useState, useEffect, useRef } from 'react';
import { adminService } from '../../services/adminService';
import { tagOrderService } from '../../services/tagOrderService';
import { useToast } from '../../context/ToastContext';
import AdminPrintModal from '../../components/admin/AdminPrintModal';
import ModalOverlay from '../../components/common/ModalOverlay';
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
  Filter,
  XCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Mail,
  CreditCard,
  Key,
  ExternalLink,
  Image as ImageIcon,
  AlertTriangle,
  X,
  Check,
  Send,
  Banknote
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
  const [orderCounts, setOrderCounts] = useState({ 
    pendingCount: 0, 
    processingCount: 0, 
    printedCount: 0, 
    deliveredCount: 0,
    submittedPaymentCount: 0,
    codPendingCount: 0
  });
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPaymentStatusFilter, setOrderPaymentStatusFilter] = useState('all');
  const [orderDeliveryTypeFilter, setOrderDeliveryTypeFilter] = useState('all');
  const [orderPaymentMethodFilter, setOrderPaymentMethodFilter] = useState('all');
  const [orderDateFilter, setOrderDateFilter] = useState('all');
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderLimit, setOrderLimit] = useState(10);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [orderTotalOrders, setOrderTotalOrders] = useState(0);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const orderRequestId = useRef(0);

  // Payment Verification & Receipt Modal State
  const [viewingReceiptOrder, setViewingReceiptOrder] = useState(null);
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [verifyingPaymentId, setVerifyingPaymentId] = useState(null);
  const [collectingCodId, setCollectingCodId] = useState(null);
  const [rejectingPaymentId, setRejectingPaymentId] = useState(null);

  // Print Modal State & Batch Selection
  const [selectedPrintOrderIds, setSelectedPrintOrderIds] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [batchStatusValue, setBatchStatusValue] = useState('processing');
  const [batchUpdating, setBatchUpdating] = useState(false);

  // Helper for numbered pagination buttons with windowing
  const getPageNumbers = (currentPage, totalPages) => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

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
    const requestId = ++orderRequestId.current;
    try {
      setLoadingOrders(true);
      const res = await tagOrderService.getAdminOrders({
        status: orderStatusFilter,
        paymentStatus: orderPaymentStatusFilter,
        deliveryType: orderDeliveryTypeFilter,
        paymentMethod: orderPaymentMethodFilter,
        search: orderSearch,
        dateFilter: orderDateFilter,
        startDate: orderDateFilter === 'custom' ? orderStartDate : undefined,
        endDate: orderDateFilter === 'custom' ? orderEndDate : undefined,
        page: orderPage,
        limit: orderLimit
      });
      if (requestId !== orderRequestId.current) return;
      setOrders(res.orders || []);
      setSelectedOrderIds([]);
      setOrderCounts(res.counts || { 
        pendingCount: 0, 
        processingCount: 0, 
        printedCount: 0, 
        deliveredCount: 0,
        submittedPaymentCount: 0,
        codPendingCount: 0
      });
      setOrderTotalPages(res.pagination.totalPages || 1);
      setOrderTotalOrders(res.pagination.totalOrders || 0);
    } catch (err) {
      if (requestId !== orderRequestId.current) return;
      setOrders([]);
      setSelectedOrderIds([]);
      toast.error('Failed to load tag printing orders.');
    } finally {
      if (requestId === orderRequestId.current) setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [userPage]);

  useEffect(() => {
    setLoadingOrders(true);
    setSelectedOrderIds([]);
    const timer = setTimeout(loadOrdersData, 250);
    return () => {
      clearTimeout(timer);
      orderRequestId.current += 1;
    };
  }, [
    orderPage, 
    orderLimit, 
    orderStatusFilter, 
    orderPaymentStatusFilter, 
    orderDeliveryTypeFilter, 
    orderPaymentMethodFilter,
    orderSearch,
    orderDateFilter, 
    orderStartDate, 
    orderEndDate
  ]);

  const handleUserSearchSubmit = (e) => {
    e.preventDefault();
    setUserPage(1);
    loadUserData();
  };

  const handleOrderSearchSubmit = (e) => {
    e.preventDefault();
    if (orderPage !== 1) setOrderPage(1);
    else loadOrdersData();
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

  // Confirm Payment & Trigger Brevo Transactional Email
  const handleConfirmPayment = async (order) => {
    try {
      setVerifyingPaymentId(order.order_id);
      const res = await tagOrderService.confirmPaymentAndSendEmail(order.order_id);
      toast.success(res.message || `Payment verified & email dispatched for Order #${order.order_id}!`);
      if (viewingReceiptOrder?.order_id === order.order_id) {
        setViewingReceiptOrder(null);
      }
      loadOrdersData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to verify payment & dispatch email.');
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  // Confirm the courier collected cash for a Cash on Delivery order
  const handleCollectCod = async (order) => {
    try {
      setCollectingCodId(order.order_id);
      const res = await tagOrderService.collectCodPayment(order.order_id);
      toast.success(res.message || `Cash on Delivery payment recorded for Order #${order.order_id}!`);
      loadOrdersData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to record the Cash on Delivery payment.');
    } finally {
      setCollectingCodId(null);
    }
  };

  // Reject Payment with Feedback Reason
  const handleRejectPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingOrder) return;
    try {
      setRejectingPaymentId(rejectingOrder.order_id);
      const res = await tagOrderService.rejectPayment(rejectingOrder.order_id, rejectionReasonInput);
      toast.success(res.message || `Order #${rejectingOrder.order_id} payment rejected.`);
      setRejectingOrder(null);
      setRejectionReasonInput('');
      if (viewingReceiptOrder?.order_id === rejectingOrder.order_id) {
        setViewingReceiptOrder(null);
      }
      loadOrdersData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to reject payment.');
    } finally {
      setRejectingPaymentId(null);
    }
  };

  const handleBatchStatusUpdate = async () => {
    if (selectedOrderIds.length === 0) return;
    setBatchUpdating(true);
    try {
      const res = await tagOrderService.batchUpdateOrderStatus(selectedOrderIds, batchStatusValue);
      toast.success(res.message);
      setSelectedOrderIds([]);
      loadOrdersData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Batch update failed.');
    } finally {
      setBatchUpdating(false);
    }
  };

  // Physical combo package helpers (display-only; keys/prices match the order
  // modal and the server-validated PHYSICAL_PACKAGES table).
  const PHYSICAL_PACKAGE_LABELS = {
    physical_combo: 'Single Combo',
    physical_family_3: 'Family of 3',
    physical_family_5: 'Family of 5',
    physical_family_10: 'Family of 10'
  };
  const PHYSICAL_PACKAGE_PRICES = { physical_combo: 100, physical_family_3: 210, physical_family_5: 350, physical_family_10: 700 };
  const PHYSICAL_PACKAGE_SETS = { physical_combo: 1, physical_family_3: 3, physical_family_5: 5, physical_family_10: 10 };

  const isPhysicalPackageOrder = (order) => !!(order?.selected_size && PHYSICAL_PACKAGE_LABELS[order.selected_size]);

  const getPhysicalPackagePrice = (order) => {
    if (!isPhysicalPackageOrder(order)) return null;
    if (order.total_peso != null) return Number(order.total_peso);
    const quantity = parseInt(order.quantity, 10) || PHYSICAL_PACKAGE_SETS[order.selected_size];
    return PHYSICAL_PACKAGE_PRICES[order.selected_size] * (quantity / PHYSICAL_PACKAGE_SETS[order.selected_size]);
  };

  const formatOrderItemLabel = (order) => {
    if (order.recipients?.length) return `${order.bundle_quantity} bundle(s) · ${order.quantity} sets · ${order.recipients.map(p => `${p.first_name} ${p.last_name} × ${p.copies}`).join(', ')}`;
    if (order.tag_type === 'keychain') return `${order.quantity}x Keychain`;
    if (order.tag_type === 'wallet_card') return `${order.quantity}x Wallet Card`;
    if (isPhysicalPackageOrder(order)) {
      return `${order.quantity} tag sets · ${PHYSICAL_PACKAGE_LABELS[order.selected_size]}`;
    }
    return `${order.quantity}x Bundle`;
  };

  const formatSizeLabel = (order) => {
    if (order.selected_size === 'custom') {
      return order.custom_dimensions ? `Custom: ${order.custom_dimensions}` : 'Custom Size';
    }
    const sizeMap = {
      standard: 'Standard Size',
      standard_keychain_30x50: 'Keychain (3×5 cm)',
      square_fob_35x35: 'Square (3.5×3.5 cm)',
      mini_compact_25x40: 'Mini (2.5×4 cm)',
      standard_cr80_card: 'Card (CR80: 8.56×5.4 cm)',
      compact_card_70x45: 'Compact Card (7×4.5 cm)',
      complete_bundle_all_sizes: 'Complete Bundle (All Sizes)',
      physical_combo: 'Combo (Keychain + Card)',
      physical_family_3: 'Family of 3 Bundle',
      physical_family_5: 'Family of 5 Bundle',
      physical_family_10: 'Family of 10 Bundle'
    };
    return sizeMap[order.selected_size] || order.selected_size || 'Standard';
  };

  const getStatusPill = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> Pending Review
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-100 text-sky-800 border border-sky-200">
            <Sparkles className="w-3 h-3 text-sky-600" /> In Production
          </span>
        );
      case 'printed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
            <CheckCircle2 className="w-3 h-3 text-purple-600" /> Tag Printed
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Truck className="w-3 h-3 text-emerald-600" /> Delivered / Emailed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getPaymentBadge = (order) => {
    const isCod = order.payment_method === 'cod';

    if (isCod) {
      if (order.payment_status === 'verified') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Check className="w-3 h-3 text-emerald-600" /> COD Collected
          </span>
        );
      }
      if (order.payment_status === 'rejected') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> Rejected
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
          <Banknote className="w-3 h-3 text-amber-600" /> Awaiting COD
        </span>
      );
    }

    switch (order.payment_status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Check className="w-3 h-3 text-emerald-600" /> Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> Rejected
          </span>
        );
      case 'submitted':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
            <Clock className="w-3 h-3 text-blue-600" /> Needs Review
          </span>
        );
    }
  };

  const getReceiptUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = import.meta.env.VITE_API_URL || '';
    const cleanBase = base.replace(/\/api\/?$/, '');
    return `${cleanBase}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 print:hidden">
      {/* Printable Sheet Modal for Admin Print Flow */}
      {selectedPrintOrderIds && (
        <AdminPrintModal
          orderIds={selectedPrintOrderIds}
          onClose={() => {
            setSelectedPrintOrderIds(null);
            loadOrdersData();
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase tracking-wider">
              Restricted Area
            </span>
            <span className="text-xs text-slate-400 font-bold">• System Level 1</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Admin Command Center</h1>
          <p className="text-xs text-slate-500">
            GCash payment review, Brevo automated QR email dispatch, and manufacturing order pipeline
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-1.5 bg-slate-200/60 rounded-2xl border border-slate-300/50">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'orders'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-brand-600" />
            <span>Tag & Digital Orders</span>
            {orderCounts.submittedPaymentCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-extrabold animate-pulse">
                {orderCounts.submittedPaymentCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>User Management</span>
          </button>
        </div>
      </div>

      {/* Global Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Citizens</span>
            <span className="text-2xl font-black text-slate-900">{stats.totalUsers}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active QR Tags</span>
            <span className="text-2xl font-black text-slate-900">{stats.activeTags}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pending GCash Review</span>
            <span className="text-2xl font-black text-amber-600">
              {orderCounts.submittedPaymentCount || 0}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Awaiting COD Collection</span>
            <span className="text-2xl font-black text-emerald-600">
              {orderCounts.codPendingCount || 0}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-brand-50 text-brand-600 border border-brand-100">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Emergency Scans</span>
            <span className="text-2xl font-black text-slate-900">{stats.totalScans}</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          TAB 1: TAG ORDERS, GCASH VERIFICATION & BREVO EMAIL QUEUE
          ======================================================== */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Orders Section Header & Filters */}
          <div className="p-6 border-b border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-brand-600" />
                  <span>ResQTag Order Pipeline & Payment Queue</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Review GCash receipts or collect Cash on Delivery payments, approve to trigger Brevo email delivery, or print manufacturing badges.
                </p>
              </div>

              {/* Status Quick Metrics */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl">
                  Pending: {orderCounts.pendingCount || 0}
                </span>
                <span className="px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-xl">
                  In Production: {orderCounts.processingCount || 0}
                </span>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl">
                  Delivered / Emailed: {orderCounts.deliveredCount || 0}
                </span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {/* Payment Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                <span className="text-[11px] font-semibold text-slate-400">Payment:</span>
                <select
                  value={orderPaymentStatusFilter}
                  onChange={(e) => {
                    setOrderPaymentStatusFilter(e.target.value);
                    setOrderPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Payments</option>
                  <option value="submitted">Needs Review (GCash Uploaded)</option>
                  <option value="unpaid">Awaiting COD Collection</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Payment Method Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                <Banknote className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-semibold text-slate-400">Method:</span>
                <select
                  value={orderPaymentMethodFilter}
                  onChange={(e) => {
                    setOrderPaymentMethodFilter(e.target.value);
                    setOrderPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Methods</option>
                  <option value="gcash">GCash</option>
                  <option value="cod">Cash on Delivery</option>
                </select>
              </div>

              {/* Delivery Type Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                <span className="text-[11px] font-semibold text-slate-400">Delivery:</span>
                <select
                  value={orderDeliveryTypeFilter}
                  onChange={(e) => {
                    setOrderDeliveryTypeFilter(e.target.value);
                    setOrderPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="digital_email">Digital QR to Email</option>
                  <option value="physical_shipping">Physical Shipping</option>
                </select>
              </div>

              {/* Order Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-semibold text-slate-400">Status:</span>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => {
                    setOrderStatusFilter(e.target.value);
                    setOrderPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Review</option>
                  <option value="processing">In Production</option>
                  <option value="printed">Tag Printed</option>
                  <option value="delivered">Delivered / Emailed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-semibold text-slate-400">Date:</span>
                <select
                  value={orderDateFilter}
                  onChange={(e) => {
                    setOrderDateFilter(e.target.value);
                    setOrderPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="this_month">This Month</option>
                  <option value="custom">Custom Range...</option>
                </select>
              </div>

              {/* Search Form */}
              <form onSubmit={handleOrderSearchSubmit} className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => {
                    setOrderSearch(e.target.value);
                    setOrderPage(1);
                  }}
                  placeholder="Search recipient, email, phone, ref #..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium text-slate-900"
                />
              </form>
            </div>
            {orderDateFilter === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="font-semibold text-slate-600">From
                  <input type="date" value={orderStartDate} max={orderEndDate || undefined}
                    onChange={e => { setOrderStartDate(e.target.value); setOrderPage(1); }}
                    className="ml-2 px-3 py-2 border border-slate-200 rounded-xl bg-slate-50" />
                </label>
                <label className="font-semibold text-slate-600">To
                  <input type="date" value={orderEndDate} min={orderStartDate || undefined}
                    onChange={e => { setOrderEndDate(e.target.value); setOrderPage(1); }}
                    className="ml-2 px-3 py-2 border border-slate-200 rounded-xl bg-slate-50" />
                </label>
              </div>
            )}
          </div>

          {/* Batch Actions Toolbar */}
          {selectedOrderIds.length > 0 && (
            <div className="mx-6 my-3 p-3 px-4 bg-slate-900 border border-slate-700 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
                <span className="font-bold text-white">
                  {selectedOrderIds.length} {selectedOrderIds.length === 1 ? 'Order' : 'Orders'} Selected
                </span>
                <button
                  onClick={() => setSelectedOrderIds([])}
                  className="text-slate-400 hover:text-white transition-colors text-[11px] underline underline-offset-2"
                >
                  Clear
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-600 rounded-xl px-2 py-1">
                  <span className="text-slate-400 font-semibold text-[11px]">Set status →</span>
                  <select
                    value={batchStatusValue}
                    onChange={(e) => setBatchStatusValue(e.target.value)}
                    className="bg-transparent border-none text-[11px] font-bold text-white focus:outline-none cursor-pointer"
                  >
                    <option value="pending" className="text-slate-900">Pending</option>
                    <option value="processing" className="text-slate-900">In Production</option>
                    <option value="printed" className="text-slate-900">Printed</option>
                    <option value="delivered" className="text-slate-900">Delivered</option>
                    <option value="cancelled" className="text-slate-900">Cancelled</option>
                  </select>
                </div>
                <button
                  onClick={handleBatchStatusUpdate}
                  disabled={batchUpdating}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs shadow-sm transition-all disabled:opacity-60"
                >
                  {batchUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Apply to All
                </button>

                <button
                  onClick={() => setSelectedPrintOrderIds(selectedOrderIds)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Batch Print ({selectedOrderIds.length})
                </button>
              </div>
            </div>
          )}

          {loadingOrders ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-1">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">No matching orders found</p>
              <p className="text-slate-400">Incoming digital requests and physical orders will appear in this queue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500 text-[10px]">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                        onChange={() => {
                          if (selectedOrderIds.length === orders.length) {
                            setSelectedOrderIds([]);
                          } else {
                            setSelectedOrderIds(orders.map((o) => o.order_id));
                          }
                        }}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4"
                        title="Select All Orders"
                      />
                    </th>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Recipient & Delivery</th>
                    <th className="p-4">Format & Dimensions</th>
                    <th className="p-4">GCash Receipt</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Verification & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => {
                    const receiptUrl = getReceiptUrl(order.gcash_receipt_url);
                    const isDigital = order.delivery_type === 'digital_email';
                    const isCod = order.payment_method === 'cod';

                    return (
                      <tr
                        key={order.order_id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          selectedOrderIds.includes(order.order_id) ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="p-4 w-10">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(order.order_id)}
                            onChange={() => {
                              setSelectedOrderIds((prev) =>
                                prev.includes(order.order_id)
                                  ? prev.filter((id) => id !== order.order_id)
                                  : [...prev, order.order_id]
                              );
                            }}
                            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4"
                          />
                        </td>

                        <td className="p-4 font-mono font-bold text-slate-900">
                          #{order.order_id}
                        </td>

                        <td className="p-4 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{order.recipient_name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                              isDigital ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isDigital ? 'Digital' : 'Shipping'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                              isCod ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isCod ? 'COD' : 'GCash'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {isDigital ? (order.target_email || order.email) : order.shipping_address}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {order.contact_number}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="font-bold text-slate-800 block text-xs">
                            {formatOrderItemLabel(order)}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono block">
                            {formatSizeLabel(order)}
                          </span>
                          {isPhysicalPackageOrder(order) && (
                            <span className="text-[11px] text-emerald-700 font-bold block">
                              ₱{getPhysicalPackagePrice(order)}
                            </span>
                          )}
                        </td>

                        {/* GCash Receipt Column */}
                        <td className="p-4">
                          {receiptUrl ? (
                            <button
                              type="button"
                              onClick={() => setViewingReceiptOrder(order)}
                              className="flex items-center gap-2 p-1.5 pr-3 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-xl transition-all text-blue-900 group"
                            >
                              <img
                                src={receiptUrl}
                                alt="Receipt"
                                className="w-8 h-8 object-cover rounded-lg border border-blue-200 shrink-0"
                              />
                              <div className="text-left">
                                <span className="font-bold text-[11px] block group-hover:underline">
                                  View Receipt
                                </span>
                                {order.gcash_ref_number && (
                                  <span className="text-[10px] font-mono text-blue-700 block">
                                    Ref: {order.gcash_ref_number}
                                  </span>
                                )}
                              </div>
                            </button>
                          ) : isCod ? (
                            <span className="text-emerald-700 text-[11px] font-bold italic">
                              No receipt — COD
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No receipt image</span>
                          )}
                        </td>

                        {/* Payment Status Column */}
                        <td className="p-4">
                          {getPaymentBadge(order)}
                        </td>

                        {/* Order Status Column */}
                        <td className="p-4">
                          {getStatusPill(order.order_status)}
                        </td>

                        {/* Actions Column */}
                        <td className="p-4">
                          {/* flex-wrap + gap gives real spacing on both axes, so the
                              buttons stay separated when they stack on small screens
                              (space-x-1.5 only added horizontal margin). */}
                          <div className="flex flex-wrap justify-end gap-1.5">
                          {/* Quick Verify & Send Email Button */}
                          {order.payment_status === 'submitted' && !isCod && (
                            <button
                              onClick={() => handleConfirmPayment(order)}
                              disabled={verifyingPaymentId === order.order_id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] shadow transition-all disabled:opacity-50"
                              title="Verify payment and instantly dispatch QR kit via Brevo email"
                            >
                              {verifyingPaymentId === order.order_id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              Approve & Email
                            </button>
                          )}

                          {/* Approve COD Order — releases the tag to production, cash is settled separately */}
                          {isCod && order.order_status === 'pending' && (
                            <button
                              onClick={() => handleConfirmPayment(order)}
                              disabled={verifyingPaymentId === order.order_id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-[11px] shadow transition-all disabled:opacity-50"
                              title="Approve this Cash on Delivery order and start production"
                            >
                              {verifyingPaymentId === order.order_id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              Approve Order
                            </button>
                          )}

                          {/* Mark Cash on Delivery as Collected (only once the tag has been printed & dispatched) */}
                          {isCod && order.payment_status !== 'verified' && order.order_status === 'printed' && (
                            <button
                              onClick={() => handleCollectCod(order)}
                              disabled={collectingCodId === order.order_id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] shadow transition-all disabled:opacity-50"
                              title="Confirm the courier collected the cash payment"
                            >
                              {collectingCodId === order.order_id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Banknote className="w-3.5 h-3.5" />
                              )}
                              COD Collected
                            </button>
                          )}

                          {/* Pending-order hint: cash is settled at courier handover, not at approval */}
                          {isCod && order.order_status === 'processing' && order.payment_status !== 'verified' && (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 font-bold rounded-xl text-[11px]"
                              title="Cash on Delivery is settled with the courier. Mark the order as Printed once it has been produced and dispatched."
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              Awaiting COD
                            </span>
                          )}

                          {/* Quick Reject Button */}
                          {order.payment_status === 'submitted' && !isCod && (
                            <button
                              onClick={() => {
                                setRejectingOrder(order);
                                setRejectionReasonInput('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-[11px] transition-colors"
                              title="Reject payment receipt"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          )}

                          {/* Print Tag (For physical manufacturing) */}
                          <button
                            onClick={() => setSelectedPrintOrderIds([order.order_id])}
                            disabled={order.order_status === 'cancelled'}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 font-bold rounded-xl text-[11px] shadow transition-all ${
                              order.order_status === 'cancelled'
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                            title="Print physical badge"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print
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
                            <option value="delivered">Delivered / Emailed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Orders Pagination */}
          {orderTotalPages > 0 && orders.length > 0 && (
            <div className="p-4 px-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Showing{' '}
                  <strong className="text-slate-800 font-bold">
                    {(orderPage - 1) * orderLimit + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-slate-800 font-bold">
                    {Math.min(orderPage * orderLimit, orderTotalOrders)}
                  </strong>{' '}
                  of <strong className="text-slate-800 font-bold">{orderTotalOrders}</strong> orders
                </span>

                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                  <span className="text-[11px] text-slate-400 font-medium">Per page:</span>
                  <select
                    value={orderLimit}
                    onChange={(e) => {
                      setOrderLimit(Number(e.target.value));
                      setOrderPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Page Number Buttons */}
              {orderTotalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={orderPage <= 1}
                    onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {getPageNumbers(orderPage, orderTotalPages).map((pageNum, idx) =>
                    pageNum === '...' ? (
                      <span key={`dots-order-${idx}`} className="px-2 py-1 text-slate-400 font-bold">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-order-${pageNum}`}
                        onClick={() => setOrderPage(pageNum)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg font-bold text-xs transition-all ${
                          orderPage === pageNum
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  )}

                  <button
                    disabled={orderPage >= orderTotalPages}
                    onClick={() => setOrderPage((p) => Math.min(orderTotalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: CITIZEN / USER MANAGEMENT
          ======================================================== */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Citizen Security Directory</span>
              </h2>
              <p className="text-xs text-slate-500">Manage user accounts, roles, and emergency tag authorizations</p>
            </div>

            <form onSubmit={handleUserSearchSubmit} className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search citizen by name or email..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium text-slate-900"
              />
            </form>
          </div>

          {loadingUsers ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-1">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">No citizens found</p>
              <p className="text-slate-400">Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500 text-[10px]">
                  <tr>
                    <th className="p-4">Citizen Name</th>
                    <th className="p-4">Contact & Email</th>
                    <th className="p-4">Account Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Encrypted QR Token</th>
                    <th className="p-4">Registered</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-slate-900 block">
                          {u.first_name} {u.middle_name} {u.last_name}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-semibold text-slate-800 block">{u.email}</span>
                        <span className="text-[11px] text-slate-500 block font-mono">
                          {u.contact_number || 'No contact phone'}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.account_status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.account_status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          {u.account_status}
                        </span>
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-600 text-[11px]">
                        {u.qr_token ? (
                          <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-800">
                            RQ-{u.qr_token.slice(0, 8).toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>

                      <td className="p-4 text-slate-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      <td className="p-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          disabled={u.role === 'admin'}
                          className={`p-2 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                            u.account_status === 'active'
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={u.account_status === 'active' ? 'Suspend Account' : 'Activate Account'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.user_id)}
                          disabled={u.role === 'admin'}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Delete Citizen Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* User Pagination */}
          {userTotalPages > 1 && (
            <div className="p-4 px-6 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>
                Page {userPage} of {userTotalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={userPage <= 1}
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: userTotalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={`user-page-${pageNum}`}
                    onClick={() => setUserPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                      userPage === pageNum
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  disabled={userPage >= userTotalPages}
                  onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          GCASH RECEIPT INSPECTION MODAL
          ======================================================== */}
      {viewingReceiptOrder && (
      <ModalOverlay
        isOpen
        onClose={() => setViewingReceiptOrder(null)}
        className="bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
      >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 relative my-8 space-y-4 max-h-[92dvh] overflow-y-auto overscroll-contain">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    GCash Receipt Inspection (Order #{viewingReceiptOrder.order_id})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Recipient: <strong>{viewingReceiptOrder.recipient_name}</strong> • Destination:{' '}
                    <strong>{viewingReceiptOrder.target_email || viewingReceiptOrder.email}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingReceiptOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Summary Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">GCash Ref #</span>
                <span className="font-mono font-bold text-slate-900">
                  {viewingReceiptOrder.gcash_ref_number || 'Not specified'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Format & Size</span>
                <span className="font-bold text-slate-900">
                  {formatOrderItemLabel(viewingReceiptOrder)} ({formatSizeLabel(viewingReceiptOrder)})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Payment Status</span>
                {getPaymentBadge(viewingReceiptOrder)}
              </div>
            </div>

            {/* Image Preview */}
            <div className="bg-slate-900 rounded-2xl p-2 flex items-center justify-center max-h-[480px] overflow-hidden">
              <img
                src={getReceiptUrl(viewingReceiptOrder.gcash_receipt_url)}
                alt="GCash Payment Receipt"
                className="max-h-[460px] w-auto object-contain rounded-xl shadow"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <a
                href={getReceiptUrl(viewingReceiptOrder.gcash_receipt_url)}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open full image in new tab
              </a>

              <div className="flex items-center gap-2">
                {viewingReceiptOrder.payment_status !== 'rejected' && (
                  <button
                    onClick={() => {
                      setRejectingOrder(viewingReceiptOrder);
                      setRejectionReasonInput('');
                    }}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors border border-rose-200"
                  >
                    Reject Payment
                  </button>
                )}

                <button
                  onClick={() => handleConfirmPayment(viewingReceiptOrder)}
                  disabled={verifyingPaymentId === viewingReceiptOrder.order_id}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {verifyingPaymentId === viewingReceiptOrder.order_id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending Brevo Email...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Confirm Payment & Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
      </ModalOverlay>
      )}

      {/* ========================================================
          PAYMENT REJECTION REASON MODAL
          ======================================================== */}
      {rejectingOrder && (
      <ModalOverlay
        isOpen
        onClose={() => setRejectingOrder(null)}
        className="bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4"
      >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Reject GCash Payment</h3>
                  <p className="text-[11px] text-slate-500">Order #{rejectingOrder.order_id}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectingOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectPaymentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Reason for Rejection (Visible to Citizen)
                </label>
                <textarea
                  rows={3}
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="e.g. Receipt image is blurry / Reference number not found / Amount sent is incorrect. Please resubmit."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingOrder(null)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectingPaymentId === rejectingOrder.order_id}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {rejectingPaymentId === rejectingOrder.order_id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
      </ModalOverlay>
      )}
    </div>
  );
}
