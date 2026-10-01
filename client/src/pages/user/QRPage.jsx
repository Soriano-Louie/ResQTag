import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { qrService } from '../../services/qrService';
import { tagOrderService } from '../../services/tagOrderService';
import QRCard from '../../components/dashboard/QRCard';
import { useToast } from '../../context/ToastContext';
import ModalOverlay from '../../components/common/ModalOverlay';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Package, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Truck, 
  Info,
  Calendar,
  MapPin,
  Loader2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Mail,
  CreditCard,
  Key,
  ExternalLink,
  UploadCloud,
  X,
  Copy,
  Check,
  Banknote
} from 'lucide-react';

export default function QRPage() {
  const { user, qr, setQr } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [orders, setOrders] = useState([]);
  const [orderPage, setOrderPage] = useState(1);
  const userOrdersPerPage = 5;
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState(null); // orderId awaiting confirm
  const [cancelling, setCancelling] = useState(null);       // orderId currently being cancelled
  const [cancelError, setCancelError] = useState(null);

  // Resubmit Payment State
  const [resubmitOrder, setResubmitOrder] = useState(null);
  const [resubmitFile, setResubmitFile] = useState(null);
  const [resubmitPreview, setResubmitPreview] = useState(null);
  const [resubmitRef, setResubmitRef] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  const [copiedGcash, setCopiedGcash] = useState(false);

  const loadData = async () => {
    try {
      const [qrRes, ordersRes] = await Promise.all([
        qrService.getQR().catch(() => null),
        tagOrderService.getMyOrders().catch(() => ({ orders: [] }))
      ]);
      if (qrRes?.qr) setQr(qrRes.qr);
      setOrders(ordersRes?.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancelOrder = async (orderId) => {
    setCancelling(orderId);
    setCancelError(null);
    try {
      await tagOrderService.cancelOrder(orderId);
      setCancelConfirm(null);
      await loadData();
      toast.success('Order cancelled successfully.');
    } catch (err) {
      setCancelError(err?.response?.data?.message || err.message || 'Failed to cancel order.');
    } finally {
      setCancelling(null);
    }
  };

  const handleCopyGcash = async () => {
    try {
      await navigator.clipboard.writeText('09939241734');
      setCopiedGcash(true);
      toast.success('GCash number copied to clipboard!');
      setTimeout(() => setCopiedGcash(false), 2000);
    } catch {
      toast.error('Failed to copy number.');
    }
  };

  const handleResubmitSubmit = async (e) => {
    e.preventDefault();
    if (!resubmitFile && !resubmitRef.trim()) {
      return toast.error('Please upload an updated receipt image or enter reference number.');
    }

    try {
      setResubmitting(true);
      const fd = new FormData();
      if (resubmitFile) fd.append('receipt', resubmitFile);
      if (resubmitRef.trim()) fd.append('gcashRefNumber', resubmitRef.trim());

      await tagOrderService.resubmitPayment(resubmitOrder.order_id, fd);
      toast.success('Payment receipt resubmitted for admin review!');
      setResubmitOrder(null);
      setResubmitFile(null);
      setResubmitPreview(null);
      setResubmitRef('');
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to resubmit payment.');
    } finally {
      setResubmitting(false);
    }
  };

  const formatSizeTitle = (order) => {
    if (order.selected_size === 'custom') {
      return order.custom_dimensions ? `Custom (${order.custom_dimensions})` : 'Custom Size';
    }
    // Bundle with custom sub-sizes stores details in custom_dimensions
    if (order.selected_size === 'complete_bundle_all_sizes' && order.custom_dimensions) {
      return `Complete Kit — ${order.custom_dimensions}`;
    }
    const map = {
      standard: 'Standard Size',
      square_fob_30x30: 'Square Keychain Fob (3×3 cm)',
      standard_keychain_30x50: 'Standard Keychain (3×5 cm)',
      square_fob_35x35: 'Square Fob (3.5×3.5 cm)',
      mini_compact_25x40: 'Mini Compact (2.5×4 cm)',
      standard_cr80_card: 'Standard Wallet Card (CR80: 8.56×5.4 cm)',
      compact_card_70x45: 'Compact Card (7×4.5 cm)',
      complete_bundle_all_sizes: 'Complete Bundle (All Sizes)',
      physical_combo: 'Combo · Keychain (3×3 cm) + Card (CR80)',
      physical_family_3: 'Family of 3 · Fixed Keychains + Cards',
      physical_family_5: 'Family of 5 · Fixed Keychains + Cards',
      physical_family_10: 'Family of 10 · Fixed Keychains + Cards'
    };
    return map[order.selected_size] || order.selected_size || 'Standard';
  };

  const formatOrderItem = (order) => {
    if (order.tag_type === 'keychain') return `${order.quantity}x Keychain Tag`;
    if (order.tag_type === 'wallet_card') return `${order.quantity}x Wallet Card`;
    const pkgLabels = {
      physical_combo: 'Single Combo',
      physical_family_3: 'Family of 3',
      physical_family_5: 'Family of 5',
      physical_family_10: 'Family of 10'
    };
    if (pkgLabels[order.selected_size]) {
      return `${order.quantity} tag sets · ${pkgLabels[order.selected_size]}`;
    }
    return `${order.quantity}x Complete Bundle`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-sky-100 text-sky-800 border border-sky-200">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" /> In Production
          </span>
        );
      case 'printed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" /> Tag Printed
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Delivered / Emailed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-red-100 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-600" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (order) => {
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
            <AlertTriangle className="w-3 h-3 text-rose-600" /> Payment Rejected
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
          <Banknote className="w-3 h-3 text-amber-600" /> Payable on Delivery
        </span>
      );
    }

    switch (order.payment_status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Check className="w-3 h-3 text-emerald-600" /> GCash Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> Payment Rejected
          </span>
        );
      case 'submitted':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" /> Payment Under Review
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 print:hidden">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">ResQTag Security & Orders</h1>
          <p className="text-xs text-slate-500">Manage your encrypted tag security, digital QR kits, and physical orders</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Main QR Card */}
        <QRCard qr={qr} user={user} onQRUpdated={loadData} />

        {/* Order History & Tracking Section */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-brand-50 text-brand-600 border border-brand-100">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Your ResQTag Order History</h3>
                <p className="text-xs text-slate-500">Live digital QR email fulfillment and physical order tracking</p>
              </div>
            </div>
          </div>

          {loadingOrders ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Package className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No tag orders or digital requests placed yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Use the "Order Official ResQTag" button above to request high-res digital QR email delivery or physical acrylic kits.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders
                .slice((orderPage - 1) * userOrdersPerPage, orderPage * userOrdersPerPage)
                .map((order) => (
                <div
                  key={order.order_id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3.5"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md">
                        Order #{order.order_id}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        order.delivery_type === 'digital_email'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {order.delivery_type === 'digital_email' ? <Mail className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                        {order.delivery_type === 'digital_email' ? 'Digital Email Delivery' : 'Physical Shipping'}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        order.payment_method === 'cod'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {order.payment_method === 'cod' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                        {order.payment_method === 'cod' ? 'Cash on Delivery' : 'GCash'}
                      </span>
                      {getPaymentStatusBadge(order)}
                    </div>
                    {getStatusBadge(order.order_status)}
                  </div>

                  {/* Order Specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Format & Size</span>
                      <span className="font-bold text-slate-900 block">
                        {formatOrderItem(order)}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">{formatSizeTitle(order)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">
                        {order.delivery_type === 'digital_email' ? 'Destination Email' : 'Shipping Destination'}
                      </span>
                      <span className="font-bold text-slate-900 block truncate">
                        {order.delivery_type === 'digital_email'
                          ? (order.target_email || order.shipping_address)
                          : order.shipping_address}
                      </span>
                      <span className="text-[11px] text-slate-500">Recipient: {order.recipient_name} ({order.contact_number})</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Payment & Date</span>
                      <span className="font-semibold text-slate-800 block">
                        {order.payment_method === 'cod'
                          ? (order.payment_status === 'verified'
                            ? 'COD Collected'
                            : 'Payable on Delivery')
                          : (order.gcash_ref_number ? `Ref: ${order.gcash_ref_number}` : 'GCash Receipt Uploaded')}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Rejection Alert Box */}
                  {order.payment_status === 'rejected' && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-rose-900">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Payment Verification Notice from Admin</span>
                      </div>
                      <p className="text-[11px] text-rose-800 leading-relaxed">
                        {order.admin_rejection_reason || 'Payment screenshot could not be verified. Please verify transaction details and resubmit.'}
                      </p>
                      {order.payment_method === 'cod' ? (
                        <p className="text-[11px] text-rose-800 leading-relaxed">
                          This order is Cash on Delivery, so no receipt is required. Our courier will collect the payment on delivery.
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setResubmitOrder(order);
                            setResubmitRef(order.gcash_ref_number || '');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          Resubmit GCash Receipt
                        </button>
                      )}
                    </div>
                  )}

                  {/* COD Reminder */}
                  {order.payment_method === 'cod' && order.payment_status === 'unpaid' && order.order_status !== 'cancelled' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2 text-emerald-900 text-xs">
                      <Banknote className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        Cash on Delivery order. Please prepare the exact amount in cash for our courier at <strong>{order.shipping_address}</strong>.
                      </span>
                    </div>
                  )}

                  {/* Delivery Info Box if completed */}
                  {order.order_status === 'delivered' && order.delivery_type === 'digital_email' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 text-emerald-900 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Official QR kit and printable guide delivered to <strong>{order.target_email}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {order.notes && (
                    <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200/60">
                      <strong>Notes:</strong> {order.notes}
                    </div>
                  )}

                  {/* Cancel button — only for pending orders */}
                  {order.order_status === 'pending' && (
                    <div className="pt-1">
                      {cancelConfirm === order.order_id ? (
                        <div className="flex flex-col gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Are you sure you want to cancel this order?
                          </div>
                          {cancelError && (
                            <p className="text-[11px] text-red-600">{cancelError}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCancelOrder(order.order_id)}
                              disabled={cancelling === order.order_id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-60"
                            >
                              {cancelling === order.order_id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              Yes, Cancel Order
                            </button>
                            <button
                              onClick={() => { setCancelConfirm(null); setCancelError(null); }}
                              className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-colors"
                            >
                              Keep Order
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCancelConfirm(order.order_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 text-xs font-bold hover:bg-red-50 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel Order
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* User Order Pagination */}
              {Math.ceil(orders.length / userOrdersPerPage) > 1 && (
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                  <span>
                    Showing {(orderPage - 1) * userOrdersPerPage + 1}–{Math.min(orderPage * userOrdersPerPage, orders.length)} of {orders.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={orderPage <= 1}
                      onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: Math.ceil(orders.length / userOrdersPerPage) }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={`user-order-page-${pageNum}`}
                        onClick={() => setOrderPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                          orderPage === pageNum
                            ? 'bg-brand-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      disabled={orderPage >= Math.ceil(orders.length / userOrdersPerPage)}
                      onClick={() => setOrderPage((p) => Math.min(Math.ceil(orders.length / userOrdersPerPage), p + 1))}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Next Page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resubmit Payment Modal */}
      {resubmitOrder && (
      <ModalOverlay
        isOpen
        onClose={() => setResubmitOrder(null)}
        className="bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4"
      >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Resubmit GCash Receipt</h3>
                  <p className="text-[11px] text-slate-500">Order #{resubmitOrder.order_id}</p>
                </div>
              </div>
              <button
                onClick={() => setResubmitOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* GCash Box */}
            <div className="p-3 bg-blue-600 rounded-2xl text-white space-y-1.5 text-xs">
              <span className="text-[10px] text-blue-200 font-bold uppercase block">GCash Account</span>
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-sm">09939241734</span>
                <button
                  type="button"
                  onClick={handleCopyGcash}
                  className="px-2.5 py-1 bg-white text-blue-700 font-bold rounded-lg text-[11px]"
                >
                  {copiedGcash ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <form onSubmit={handleResubmitSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Upload Clearer Receipt Screenshot
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setResubmitFile(f);
                      setResubmitPreview(URL.createObjectURL(f));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                />
                {resubmitPreview && (
                  <img
                    src={resubmitPreview}
                    alt="Receipt preview"
                    className="mt-2 w-20 h-20 object-cover rounded-xl border border-slate-200"
                  />
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  GCash Reference Number
                </label>
                <input
                  type="text"
                  value={resubmitRef}
                  onChange={(e) => setResubmitRef(e.target.value)}
                  placeholder="e.g. 1029 3847 5612"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResubmitOrder(null)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resubmitting}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {resubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  Submit Receipt
                </button>
              </div>
            </form>
          </div>
      </ModalOverlay>
      )}
    </div>
  );
}
