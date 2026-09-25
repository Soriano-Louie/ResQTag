import React, { useEffect, useState } from 'react';
import { X, Printer, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { tagOrderService } from '../../services/tagOrderService';
import PrintableTag from '../dashboard/PrintableTag';
import { useToast } from '../../context/ToastContext';

export default function AdminPrintModal({ orderId, onClose, onStatusUpdated }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    const fetchPrintData = async () => {
      try {
        setLoading(true);
        const res = await tagOrderService.getOrderPrintData(orderId);
        setData(res);
      } catch (err) {
        toast.error('Failed to load tag printing data.');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchPrintData();
  }, [orderId]);

  if (!orderId) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleMarkAsPrinted = async () => {
    try {
      setUpdating(true);
      await tagOrderService.updateOrderStatus(orderId, 'printed');
      toast.success(`Order #${orderId} marked as Printed!`);
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch (err) {
      toast.error('Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      {/* Printable Sheet (Active on browser print dialog) */}
      {data && (
        <PrintableTag
          qr={{ qr_token: data.order.qr_token, status: data.order.qr_status }}
          user={{ firstName: data.order.first_name, lastName: data.order.last_name }}
          tagType={data.order.tag_type || 'bundle'}
        />
      )}

      {/* Screen Preview Modal Dialog (Hidden on Print) */}
      <div className="no-print bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
          <div className="p-3 rounded-2xl bg-brand-50 text-brand-600 border border-brand-100">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Admin Physical Tag Manufacturing</h2>
            <p className="text-xs text-slate-500">Order #{orderId} • Encrypted Tag Encoding & Print Output</p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        ) : (
          <div className="mt-5 space-y-6 text-xs">
            {/* Customer & Order Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
                <span className="font-bold text-slate-900 text-sm">
                  {data.order.first_name} {data.order.last_name}
                </span>
                <span className="text-slate-500 block">{data.order.email}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Recipient & Phone</span>
                <span className="font-bold text-slate-900">{data.order.recipient_name}</span>
                <span className="text-slate-500 block">{data.order.contact_number}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Shipping Address</span>
                  <span className="font-medium text-slate-800">{data.order.shipping_address}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Requested Format</span>
                  <span className="font-black text-xs text-brand-600 uppercase">
                    {data.order.tag_type === 'keychain' ? '🔑 Keychain Tag' : data.order.tag_type === 'wallet_card' ? '💳 Wallet Card' : '⭐ Complete Kit'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tag Details */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-brand-400 font-bold block uppercase tracking-widest">
                  TAG TOKEN ENCODING
                </span>
                <span className="font-mono text-xs text-slate-200">{data.order.qr_token}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-400 block">Quantity</span>
                <span className="font-black text-lg text-brand-400">{data.order.quantity}x Kit</span>
              </div>
            </div>

            {/* Print Instructions */}
            <div className="p-3 bg-brand-50 border border-brand-100 rounded-2xl text-brand-900 leading-relaxed text-[11px]">
              Click <strong>"Print Physical Sheet"</strong> below. It will open your system's print dialog with calibrated cutting guidelines tailored for <strong>{data.order.tag_type === 'keychain' ? 'Keychain Tags' : data.order.tag_type === 'wallet_card' ? 'Wallet Emergency Cards' : 'Complete Kit (Keychain + Card)'}</strong>.
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Close
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Print Physical Sheet
                </button>

                {data.order.order_status !== 'printed' && data.order.order_status !== 'delivered' && (
                  <button
                    type="button"
                    onClick={handleMarkAsPrinted}
                    disabled={updating}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {updating ? 'Updating...' : 'Mark as Printed'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
