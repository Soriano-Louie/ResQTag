import React, { useState } from 'react';
import { ShieldCheck, Package, MapPin, Phone, User, AlertCircle, Loader2, X, Sparkles } from 'lucide-react';
import { tagOrderService } from '../../services/tagOrderService';
import { useToast } from '../../context/ToastContext';

export default function OrderTagModal({ isOpen, onClose, user, onOrderSuccess }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipientName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    contactNumber: '',
    shippingAddress: '',
    tagType: 'keychain', // 'keychain' | 'wallet_card' | 'bundle'
    quantity: 1,
    notes: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.recipientName.trim()) {
      return toast.error('Please enter the recipient full name.');
    }
    if (!formData.contactNumber.trim()) {
      return toast.error('Please enter a valid contact phone number.');
    }
    if (!formData.shippingAddress.trim()) {
      return toast.error('Please enter the complete delivery address.');
    }

    try {
      setLoading(true);
      const res = await tagOrderService.createOrder({
        recipientName: formData.recipientName,
        contactNumber: formData.contactNumber,
        shippingAddress: formData.shippingAddress,
        tagType: formData.tagType,
        quantity: parseInt(formData.quantity, 10) || 1,
        notes: formData.notes
      });

      toast.success(res.message || 'ResQTag order request submitted successfully!');
      if (onOrderSuccess) onOrderSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit order request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
          <div className="p-3 rounded-2xl bg-brand-50 text-brand-600 border border-brand-100">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Order Official ResQTag</h2>
            <p className="text-xs text-slate-500">
              Select tag format, enter delivery details, and submit for fulfillment
            </p>
          </div>
        </div>

        {/* Order Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Format Selection Cards */}
          <div>
            <label className="font-bold text-slate-700 block mb-2">
              Select Physical Tag Format <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Keychain */}
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, tagType: 'keychain' }))}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  formData.tagType === 'keychain'
                    ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 text-slate-900'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60 text-slate-600'
                }`}
              >
                <div>
                  <span className="font-black text-xs block text-slate-900">🔑 Keychain Tag</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">
                    Acrylic fob for keys, bags & pet collars
                  </span>
                </div>
                <span className={`text-[9px] font-bold mt-2 inline-block uppercase ${formData.tagType === 'keychain' ? 'text-brand-600' : 'text-slate-400'}`}>
                  {formData.tagType === 'keychain' ? '● Selected' : '○ Choose'}
                </span>
              </button>

              {/* Wallet Card */}
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, tagType: 'wallet_card' }))}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  formData.tagType === 'wallet_card'
                    ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 text-slate-900'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60 text-slate-600'
                }`}
              >
                <div>
                  <span className="font-black text-xs block text-slate-900">💳 Wallet Card</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">
                    Standard credit-card size for wallet or phone
                  </span>
                </div>
                <span className={`text-[9px] font-bold mt-2 inline-block uppercase ${formData.tagType === 'wallet_card' ? 'text-brand-600' : 'text-slate-400'}`}>
                  {formData.tagType === 'wallet_card' ? '● Selected' : '○ Choose'}
                </span>
              </button>

              {/* Complete Bundle */}
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, tagType: 'bundle' }))}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  formData.tagType === 'bundle'
                    ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 text-slate-900'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60 text-slate-600'
                }`}
              >
                <div>
                  <span className="font-black text-xs block text-slate-900">⭐ Complete Kit</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">
                    Both Keychain Tag + Emergency Wallet Card
                  </span>
                </div>
                <span className={`text-[9px] font-bold mt-2 inline-block uppercase ${formData.tagType === 'bundle' ? 'text-brand-600' : 'text-slate-400'}`}>
                  {formData.tagType === 'bundle' ? '● Selected' : '○ Choose'}
                </span>
              </button>
            </div>
          </div>
          {/* Recipient Name */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Recipient Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                name="recipientName"
                value={formData.recipientName}
                onChange={handleChange}
                placeholder="e.g. Juan Dela Cruz"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Contact Number & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Contact Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="0912 345 6789"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Quantity <span className="text-rose-500">*</span>
              </label>
              <select
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-bold text-slate-900"
              >
                {[1, 2, 3, 4, 5, 10].map(num => (
                  <option key={num} value={num}>{num} {num === 1 ? 'Kit' : 'Kits'}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Delivery / Shipping Address */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Complete Delivery Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                name="shippingAddress"
                rows={2}
                value={formData.shippingAddress}
                onChange={handleChange}
                placeholder="House/Unit No., Street, Barangay, City, Province, Postal Code"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-900 resize-none"
              />
            </div>
          </div>

          {/* Notes / Instructions */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Special Delivery Instructions (Optional)
            </label>
            <input
              type="text"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="e.g. Leave with security guard / Landmark near school"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-900"
            />
          </div>

          {/* Technopreneurship Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Once submitted, our fulfillment team will verify your emergency profile, encode your unique encrypted QR tag, and prepare your physical kit for manufacturing & delivery.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-black rounded-xl shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Confirm & Submit Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
