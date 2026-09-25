import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { qrService } from '../../services/qrService';
import { tagOrderService } from '../../services/tagOrderService';
import QRCard from '../../components/dashboard/QRCard';
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
  Loader2
} from 'lucide-react';

export default function QRPage() {
  const { user, qr, setQr } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

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
            <Truck className="w-3.5 h-3.5 text-emerald-600" /> Delivered
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Physical ResQTag & Orders</h1>
          <p className="text-xs text-slate-500">Manage your encrypted tag security and track physical tag printing</p>
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
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Your Tag Order History</h3>
                <p className="text-xs text-slate-500">Live production and fulfillment tracking for your physical kits</p>
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
              <p className="text-xs font-bold text-slate-700">No physical tag orders placed yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Use the "Order Official Physical ResQTag" button above to request your physical keychain tag and emergency wallet card.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.order_id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md">
                        Order #{order.order_id}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {order.quantity}x {order.tag_type === 'keychain' ? 'Acrylic Keychain Tag' : order.tag_type === 'wallet_card' ? 'Emergency Wallet Card' : 'Complete Kit (Keychain + Card)'}
                      </span>
                    </div>
                    {getStatusBadge(order.order_status)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Ordered: {new Date(order.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="sm:col-span-2 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="truncate">{order.shipping_address}</span>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200/60">
                      <strong>Delivery Notes:</strong> {order.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature Explanations: 1-Touch Responder Dialing & Lost Tag Regeneration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: 1-Touch Responder Dialing */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              📞
            </div>
            <h3 className="font-bold text-slate-900 text-sm">One-Touch Responder Dialing</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When a rescuer or first responder scans your physical tag, any emergency contacts you have marked as <strong>Public</strong> automatically display large, one-tap call buttons. Responders can immediately dial your family, doctor, or guardian directly from their phone with zero manual typing.
            </p>
          </div>

          {/* Card 2: Lost Tag Regeneration Security */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              🛡️
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Lost Tag Invalidation & Regeneration</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If your keychain tag or wallet card is ever lost or stolen, click <strong>"Lost Tag? Regenerate"</strong> above. This instantly kills the old encrypted QR token in the cloud so nobody who finds it can scan your personal medical data. You can then submit a replacement tag request right away.
            </p>
          </div>
        </div>

        {/* Why Physical ResQTag Info Box */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 space-y-3 shadow-sm border border-slate-700">
          <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Official Encrypted Physical Tag Kits</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            ResQTag physical keychains and emergency cards are manufactured using heavy-duty acrylic inserts and thermal-sealed protective layers to withstand water, weather, and physical wear during sports, travel, and emergencies. Each tag is calibrated and encoded with your secure cloud profile.
          </p>
        </div>
      </div>
    </div>
  );
}
