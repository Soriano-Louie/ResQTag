import React, { useEffect, useState } from 'react';
import { X, Printer, ShieldCheck, Loader2, CheckCircle2, Layers, Package } from 'lucide-react';
import { tagOrderService } from '../../services/tagOrderService';
import PrintableTag from '../dashboard/PrintableTag';
import { useToast } from '../../context/ToastContext';
import ModalOverlay from '../common/ModalOverlay';

export default function AdminPrintModal({ orderId, orderIds, onClose, onStatusUpdated }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [ordersData, setOrdersData] = useState([]);
  const [updating, setUpdating] = useState(false);

  const targetIds = orderIds && orderIds.length > 0 ? orderIds : orderId ? [orderId] : [];

  useEffect(() => {
    if (targetIds.length === 0) return;

    const fetchAllPrintData = async () => {
      try {
        setLoading(true);
        const results = await Promise.all(
          targetIds.map((id) => tagOrderService.getOrderPrintData(id))
        );

        setOrdersData(results.map((r) => r.order));

        const parsedItems = results.map((res) => ({
          qr: { qr_token: res.order.qr_token, status: res.order.qr_status },
          user: { firstName: res.order.first_name, lastName: res.order.last_name },
          tagType: res.order.tag_type || 'bundle',
          selectedSize: res.order.selected_size,
          customDimensions: res.order.custom_dimensions,
          quantity: res.order.quantity || 1,
          orderId: res.order.order_id,
          order: res.order,
        }));

        setItems(parsedItems);
      } catch (err) {
        toast.error('Failed to load tag printing data.');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchAllPrintData();
  }, [JSON.stringify(targetIds)]);

  if (targetIds.length === 0) return null;

  const isBatch = targetIds.length > 1;
  const totalUnits = items.reduce((acc, it) => acc + (parseInt(it.quantity, 10) || 1), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleMarkAllAsPrinted = async () => {
    try {
      setUpdating(true);
      await Promise.all(
        targetIds.map((id) => tagOrderService.updateOrderStatus(id, 'printed'))
      );
      toast.success(
        isBatch
          ? `All ${targetIds.length} orders marked as Printed!`
          : `Order #${targetIds[0]} marked as Printed!`
      );
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch (err) {
      toast.error('Failed to update order status.');
    } finally {
      setUpdating(false);
    }
  };

  const hasUnprinted = ordersData.some(
    (o) => o.order_status !== 'printed' && o.order_status !== 'delivered'
  );

  return (
    <ModalOverlay
      isOpen
      onClose={onClose}
      onBackdropClick={false}
      className="bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 print:static print:inset-auto print:bg-white print:p-0 print:m-0 print:overflow-visible print:z-auto print:block print:h-auto print:w-auto"
    >
      {/* Printable Sheet (Active on browser print dialog) */}
      {!loading && items.length > 0 && <PrintableTag items={items} />}

      {/* Screen Preview Modal Dialog (Hidden on Print) */}
      <div className="no-print print:hidden bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
            {isBatch ? <Layers className="w-6 h-6" /> : <Printer className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {isBatch ? 'Batch Physical Tag Manufacturing' : 'Physical Tag Manufacturing'}
            </h2>
            <p className="text-xs text-slate-500">
              {isBatch
                ? `Compiled ${targetIds.length} orders (${totalUnits} total units) onto paper-efficient layout`
                : `Order #${targetIds[0]} • Encrypted Tag Encoding & Print Output`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Compiling print data & generating layout...</p>
          </div>
        ) : (
          <div className="mt-5 space-y-6 text-xs">
            {/* Batch / Single Overview Box */}
            {isBatch ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 text-white">
                  <div>
                    <span className="text-[10px] font-mono text-rose-400 font-bold block uppercase tracking-widest">
                      BATCH PRINT COMPILED
                    </span>
                    <span className="text-sm font-bold text-slate-200">
                      {targetIds.length} Orders Selected
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 block">Total Units to Print</span>
                    <span className="font-black text-lg text-rose-400">{totalUnits}x Tags</span>
                  </div>
                </div>

                {/* Orders List Preview */}
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-slate-50">
                  {ordersData.map((order) => (
                    <div key={order.order_id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">
                          #{order.order_id} • {order.first_name} {order.last_name}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Recipient: {order.recipient_name} ({order.shipping_address})
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-800 text-[11px] block uppercase">
                          {order.tag_type === 'keychain' ? '🔑 Keychain' : order.tag_type === 'wallet_card' ? '💳 Card' : '⭐ Kit'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 block">
                          {order.selected_size === 'custom' && order.custom_dimensions
                            ? `Custom: ${order.custom_dimensions}`
                            : `${order.quantity}x`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Single Order View */
              ordersData[0] && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {ordersData[0]?.first_name} {ordersData[0]?.last_name}
                      </span>
                      <span className="text-slate-500 block">{ordersData[0]?.email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Recipient & Phone</span>
                      <span className="font-bold text-slate-900">{ordersData[0]?.recipient_name}</span>
                      <span className="text-slate-500 block">{ordersData[0]?.contact_number}</span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Shipping Address</span>
                        <span className="font-medium text-slate-800">{ordersData[0]?.shipping_address}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Requested Format & Scale</span>
                        <span className="font-black text-xs text-rose-600 uppercase">
                          {ordersData[0]?.tag_type === 'keychain' ? '🔑 Keychain Tag' : ordersData[0]?.tag_type === 'wallet_card' ? '💳 Wallet Card' : '⭐ Complete Kit'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 block">
                          {ordersData[0]?.selected_size === 'custom' && ordersData[0]?.custom_dimensions
                            ? `Custom: ${ordersData[0]?.custom_dimensions}`
                            : ordersData[0]?.selected_size || 'Standard Scale'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-rose-400 font-bold block uppercase tracking-widest">
                        TAG TOKEN ENCODING
                      </span>
                      <span className="font-mono text-xs text-slate-200">{ordersData[0]?.qr_token}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-slate-400 block">Quantity</span>
                      <span className="font-black text-lg text-rose-400">{ordersData[0]?.quantity}x</span>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Paper Saving Guide Note */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 leading-relaxed text-[11px] flex items-start gap-2.5">
              <span className="text-base">🌱</span>
              <div>
                <strong>Paper Efficiency Mode Active:</strong> All selected tags are compiled in a high-density grid with calibrated sharp cutting guidelines. Up to 12 keychains or 5 wallet cards fit on a single page!
              </div>
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

                {hasUnprinted && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsPrinted}
                    disabled={updating}
                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {updating ? 'Updating...' : isBatch ? 'Mark All as Printed' : 'Mark as Printed'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
