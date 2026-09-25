import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Package, 
  RefreshCw, 
  Power, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  Truck,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Crown
} from 'lucide-react';
import { qrService } from '../../services/qrService';
import { tagOrderService } from '../../services/tagOrderService';
import { useToast } from '../../context/ToastContext';
import OrderTagModal from './OrderTagModal';
import PrintableTag from './PrintableTag';

export default function QRCard({ qr, user, onQRUpdated }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadUserOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await tagOrderService.getMyOrders();
      setUserOrders(res.orders || []);
    } catch (err) {
      console.error('Failed to load user orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadUserOrders();
  }, []);

  if (!qr) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col items-center justify-center min-h-[320px] space-y-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center animate-pulse">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900">Setting up your ResQTag</h3>
          <p className="text-xs text-slate-500 max-w-xs">Initializing your secure emergency tag...</p>
        </div>
        <button
          onClick={onQRUpdated}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow transition-all"
        >
          Initialize Tag
        </button>
      </div>
    );
  }

  const origin = window.location.origin;
  const emergencyUrl = `${origin}/emergency/${qr.qr_token}`;
  const isActive = qr.status === 'active';
  const latestOrder = userOrders[0];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(emergencyUrl);
      setCopied(true);
      toast.success('Emergency URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const handleDownloadPNG = () => {
    const canvas = document.getElementById('resqtag-admin-qr-canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `ResQTag-${qr.qr_token.slice(0, 8)}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success('ResQTag QR code image downloaded!');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleToggleStatus = async () => {
    try {
      setLoading(true);
      const newStatus = isActive ? 'inactive' : 'active';
      const res = await qrService.updateStatus(newStatus);
      toast.success(res.message);
      setShowStatusConfirm(false);
      onQRUpdated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setLoading(true);
      const res = await qrService.regenerateQR();
      toast.success(res.message);
      setShowRegenerateConfirm(false);
      onQRUpdated();
      loadUserOrders();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> Pending Review
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
            <CheckCircle2 className="w-3 h-3 text-purple-600" /> Tag Printed
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
    <>
      {/* Printable Sheet for Admin */}
      {isAdmin && <PrintableTag qr={qr} user={user} />}

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
        {/* Card Header */}
        <div className="flex items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`p-2.5 rounded-2xl border shrink-0 ${isAdmin ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-brand-50 text-brand-600 border-brand-100'}`}>
              {isAdmin ? <Crown className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="font-bold text-slate-900 text-sm truncate">
                  {isAdmin ? 'Admin ResQTag Access' : 'ResQTag Security & Kit'}
                </h3>
                {isAdmin && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 shrink-0">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {isAdmin ? 'Direct QR view, download & printing enabled' : 'Official encrypted tag & order fulfillment'}
              </p>
            </div>
          </div>

          {/* Tag Status Badge */}
          <span
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {isActive ? 'Active' : 'Deactivated'}
          </span>
        </div>

        {/* ========================================================
            ADMIN VIEW: FULL QR VIEW, DOWNLOAD & DIRECT PRINT
            ======================================================== */}
        {isAdmin ? (
          <div className="space-y-4">
            {/* QR Preview & Quick Actions Box */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center space-y-4">
              {/* QR Preview Canvas */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                <QRCodeCanvas
                  id="resqtag-admin-qr-canvas"
                  value={emergencyUrl}
                  size={160}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e11d48'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/></svg>",
                    x: undefined,
                    y: undefined,
                    height: 32,
                    width: 32,
                    excavate: true,
                  }}
                />
                <span className="mt-2 text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400">
                  RQ-{qr.qr_token.slice(0, 8).toUpperCase()}
                </span>
              </div>

              {/* Admin Actions */}
              <div className="w-full space-y-3 text-xs">
                <div className="w-full min-w-0">
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Emergency Profile URL
                  </label>
                  <div className="flex items-center gap-1.5 w-full min-w-0">
                    <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-2.5 py-2 font-mono text-[11px] text-slate-700 truncate select-all">
                      {emergencyUrl}
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors shrink-0"
                      title="Copy URL"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={emergencyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-brand-50 hover:bg-brand-100 text-brand-600 border border-brand-200 rounded-xl transition-colors shrink-0"
                      title="Preview Public Page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleDownloadPNG}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition-all text-xs"
                  >
                    <Download className="w-4 h-4" />
                    Download PNG
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-300 shadow-sm transition-all text-xs"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    Print Tag
                  </button>
                </div>
              </div>
            </div>

            {/* Total Scans & Order CTA */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 text-white text-xs">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Scan Analytics</span>
                <span className="font-bold text-slate-100">{qr.scan_count || 0} Total Emergency Scans</span>
              </div>
              <button
                onClick={() => setShowOrderModal(true)}
                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow"
              >
                <Package className="w-3.5 h-3.5" />
                Order Kit
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================
             REGULAR USER VIEW: MONETIZATION & ORDER FULFILLMENT
             ======================================================== */
          <div className="space-y-4">
            {/* Protection / Tag Overview Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-brand-400 uppercase block font-bold">
                    ENCRYPTED EMERGENCY ID
                  </span>
                  <h4 className="text-lg font-black text-slate-100 tracking-tight">
                    RQ-{qr.qr_token.slice(0, 8).toUpperCase()}
                  </h4>
                </div>
                <div className="px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-slate-200">
                  PHYSICAL KEYCHAIN TAG
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Scans</span>
                  <span className="font-bold text-slate-100 text-sm">{qr.scan_count || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Last Emergency Scan</span>
                  <span className="font-semibold text-slate-200 text-[11px]">
                    {qr.last_scanned_at ? new Date(qr.last_scanned_at).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Status or Call to Action */}
            <div className="space-y-3">
              {latestOrder ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Latest Tag Request
                    </span>
                    {getStatusBadge(latestOrder.order_status)}
                  </div>
                  <p className="text-xs text-slate-600">
                    Order #{latestOrder.order_id} • <strong>{latestOrder.quantity}x Official Kit</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    Deliver to: {latestOrder.shipping_address}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-100/80 space-y-1 text-slate-700">
                  <span className="text-xs font-bold text-brand-900 block">No physical tag ordered yet</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Order your physical acrylic ResQTag keychain & emergency wallet card to carry with you.
                  </p>
                </div>
              )}

              {/* Primary CTA: Order Tag */}
              <button
                onClick={() => setShowOrderModal(true)}
                className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
              >
                <Package className="w-4 h-4" />
                {latestOrder ? 'Order Additional Physical Tag' : 'Order Official Physical ResQTag'}
              </button>
            </div>
          </div>
        )}

        {/* Security Controls */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <button
            onClick={() => setShowStatusConfirm(true)}
            className={`flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl transition-colors ${
              isActive
                ? 'text-rose-600 hover:bg-rose-50'
                : 'text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isActive ? 'Deactivate Tag' : 'Activate Tag'}
          </button>

          <button
            onClick={() => setShowRegenerateConfirm(true)}
            className="flex items-center gap-1.5 font-bold text-slate-600 hover:text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-xl transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Lost Tag? Regenerate
          </button>
        </div>
      </div>

      {/* Order Modal */}
      <OrderTagModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        user={user}
        onOrderSuccess={() => {
          loadUserOrders();
          if (onQRUpdated) onQRUpdated();
        }}
      />

      {/* Deactivate/Activate Confirm Modal */}
      {showStatusConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${isActive ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                <Power className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">
                {isActive ? 'Deactivate ResQTag?' : 'Activate ResQTag?'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isActive
                ? 'When deactivated, anyone scanning this physical tag will see a notice that the tag is inactive. Your emergency info will NOT be displayed.'
                : 'Activating your ResQTag will restore public visibility for your approved emergency information.'}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowStatusConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={loading}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow transition-all ${
                  isActive ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {loading ? 'Updating...' : isActive ? 'Yes, Deactivate' : 'Yes, Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Confirm Modal */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">Regenerate Tag Token?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Regenerating will <strong>permanently invalidate your previous QR code</strong>. If you lost your physical keychain tag, do this before requesting a new one so the old tag cannot be scanned.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow transition-all"
              >
                {loading ? 'Generating...' : 'Continue & Invalidate Old Tag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
