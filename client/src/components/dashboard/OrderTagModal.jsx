import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Package, 
  Mail, 
  Truck, 
  MapPin, 
  Phone, 
  User, 
  AlertCircle, 
  Loader2, 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  UploadCloud, 
  Image as ImageIcon,
  CheckCircle2,
  Info,
  Maximize2,
  CreditCard,
  Key
} from 'lucide-react';
import { tagOrderService } from '../../services/tagOrderService';
import { profileService } from '../../services/profileService';
import { useToast } from '../../context/ToastContext';

export default function OrderTagModal({ isOpen, onClose, user, onOrderSuccess }) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [copiedGcash, setCopiedGcash] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  const [formData, setFormData] = useState({
    deliveryType: 'digital_email', // 'digital_email' | 'physical_shipping'
    targetEmail: '',
    recipientName: '',
    contactNumber: '',
    shippingAddress: '',
    tagType: 'keychain', // 'keychain' | 'wallet_card' | 'bundle'
    selectedSize: 'standard_keychain_30x50',
    customDimensions: '',
    quantity: 1,
    gcashRefNumber: '',
    notes: ''
  });

  // Autofill from user and profile data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const defaultName = [user?.firstName, user?.middleName, user?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const userEmail = user?.email || '';

    async function autofillProfileData() {
      try {
        setFetchingProfile(true);
        const profileData = await profileService.getProfile();
        setFormData(prev => ({
          ...prev,
          targetEmail: prev.targetEmail || userEmail,
          recipientName: prev.recipientName || defaultName,
          contactNumber: prev.contactNumber || profileData?.personal?.contactNumber || '',
          shippingAddress: prev.shippingAddress || profileData?.personal?.address || ''
        }));
      } catch (err) {
        setFormData(prev => ({
          ...prev,
          targetEmail: prev.targetEmail || userEmail,
          recipientName: prev.recipientName || defaultName
        }));
      } finally {
        setFetchingProfile(false);
      }
    }

    autofillProfileData();
  }, [isOpen, user]);

  // Adjust default size when deliveryType or tagType changes
  const handleDeliveryTypeChange = (type) => {
    setFormData(prev => {
      let size = prev.selectedSize;
      if (type === 'physical_shipping') {
        if (prev.tagType === 'keychain') size = 'square_fob_30x30';
        else if (prev.tagType === 'wallet_card') size = 'standard_cr80_card';
        else size = 'standard';
      } else {
        if (prev.tagType === 'keychain') size = 'standard_keychain_30x50';
        else if (prev.tagType === 'wallet_card') size = 'standard_cr80_card';
        else size = 'complete_bundle_all_sizes';
      }
      return {
        ...prev,
        deliveryType: type,
        selectedSize: size,
        customDimensions: type === 'physical_shipping' ? '' : prev.customDimensions
      };
    });
  };

  const handleTagTypeChange = (newType) => {
    let defaultSize = 'standard';
    if (formData.deliveryType === 'physical_shipping') {
      if (newType === 'keychain') defaultSize = 'square_fob_30x30';
      else if (newType === 'wallet_card') defaultSize = 'standard_cr80_card';
      else defaultSize = 'standard';
    } else {
      if (newType === 'keychain') defaultSize = 'standard_keychain_30x50';
      else if (newType === 'wallet_card') defaultSize = 'standard_cr80_card';
      else if (newType === 'bundle') defaultSize = 'complete_bundle_all_sizes';
    }
    setFormData(prev => ({
      ...prev,
      tagType: newType,
      selectedSize: defaultSize,
      customDimensions: ''
    }));
  };

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Receipt image must be smaller than 5MB.');
        return;
      }
      setReceiptFile(file);
      const previewUrl = URL.createObjectURL(file);
      setReceiptPreview(previewUrl);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.recipientName.trim()) {
      return toast.error('Please enter the recipient full name.');
    }
    if (!formData.contactNumber.trim()) {
      return toast.error('Please enter a valid contact phone number.');
    }
    if (formData.deliveryType === 'digital_email' && !formData.targetEmail.trim()) {
      return toast.error('Please enter the email address for QR delivery.');
    }
    if (formData.deliveryType === 'physical_shipping' && !formData.shippingAddress.trim()) {
      return toast.error('Please enter the complete delivery address.');
    }
    if (formData.deliveryType === 'digital_email' && formData.selectedSize === 'custom' && !formData.customDimensions.trim()) {
      return toast.error('Please enter your custom dimensions (e.g. 4cm × 6cm).');
    }
    if (!receiptFile) {
      return toast.error('Please upload your GCash payment receipt screenshot.');
    }

    try {
      setLoading(true);

      const submissionData = new FormData();
      submissionData.append('deliveryType', formData.deliveryType);
      submissionData.append('targetEmail', formData.targetEmail.trim());
      submissionData.append('recipientName', formData.recipientName.trim());
      submissionData.append('contactNumber', formData.contactNumber.trim());
      submissionData.append('shippingAddress', formData.shippingAddress.trim());
      submissionData.append('tagType', formData.tagType);
      submissionData.append('selectedSize', formData.selectedSize);
      if (formData.deliveryType === 'digital_email' && formData.selectedSize === 'custom') {
        submissionData.append('customDimensions', formData.customDimensions.trim());
      }
      submissionData.append('quantity', formData.quantity);
      submissionData.append('gcashRefNumber', formData.gcashRefNumber.trim());
      submissionData.append('notes', formData.notes.trim());
      if (receiptFile) {
        submissionData.append('receipt', receiptFile);
      }

      const res = await tagOrderService.createOrder(submissionData);

      toast.success(res.message || 'ResQTag request submitted successfully!');
      if (onOrderSuccess) onOrderSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit order request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 relative my-6 max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 shrink-0">
          <div className="p-3 rounded-2xl bg-brand-50 text-brand-600 border border-brand-100">
            <Package className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Order Official ResQTag</h2>
            <p className="text-xs text-slate-500 truncate">
              Digital QR email delivery or physical tag kit with GCash verification
            </p>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-5 overflow-y-auto pr-1 text-xs flex-1">
          {/* 1. Delivery Option Selection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <span>1. Choose Delivery Method</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Digital Email Delivery */}
              <button
                type="button"
                onClick={() => handleDeliveryTypeChange('digital_email')}
                className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                  formData.deliveryType === 'digital_email'
                    ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${formData.deliveryType === 'digital_email' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-slate-900 block text-xs">Digital QR to Email</span>
                      <span className="text-[10px] text-brand-600 font-bold">Custom Print & DIY</span>
                    </div>
                  </div>
                  {formData.deliveryType === 'digital_email' && (
                    <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  High-res printable QR code & templates with custom dimensions sent straight to your email inbox.
                </p>
              </button>

              {/* Physical Acrylic Kit */}
              <button
                type="button"
                onClick={() => handleDeliveryTypeChange('physical_shipping')}
                className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                  formData.deliveryType === 'physical_shipping'
                    ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${formData.deliveryType === 'physical_shipping' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-slate-900 block text-xs">Physical Tag Delivery</span>
                      <span className="text-[10px] text-slate-500 font-bold">Standard Manufactured Size</span>
                    </div>
                  </div>
                  {formData.deliveryType === 'physical_shipping' && (
                    <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Official printed & laminated tag (square keychain or card) manufactured and shipped to your address.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Format Selection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <span>2. Select Tag Format</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Keychain */}
              <button
                type="button"
                onClick={() => handleTagTypeChange('keychain')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  formData.tagType === 'keychain'
                    ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 text-slate-900 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60 text-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1 text-slate-900">
                    <Key className="w-3.5 h-3.5 text-brand-600" />
                    <span className="font-black text-xs">Keychain</span>
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight block">
                    Keys, pet tags, bags
                  </span>
                </div>
                <span className={`text-[9px] font-bold mt-2 uppercase ${formData.tagType === 'keychain' ? 'text-brand-600' : 'text-slate-400'}`}>
                  {formData.tagType === 'keychain' ? '● Selected' : '○ Choose'}
                </span>
              </button>

              {/* Wallet Card */}
              <button
                type="button"
                onClick={() => handleTagTypeChange('wallet_card')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  formData.tagType === 'wallet_card'
                    ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 text-slate-900 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60 text-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1 text-slate-900">
                    <CreditCard className="w-3.5 h-3.5 text-brand-600" />
                    <span className="font-black text-xs">Wallet Card</span>
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight block">
                    Wallet slots, phone ID
                  </span>
                </div>
                <span className={`text-[9px] font-bold mt-2 uppercase ${formData.tagType === 'wallet_card' ? 'text-brand-600' : 'text-slate-400'}`}>
                  {formData.tagType === 'wallet_card' ? '● Selected' : '○ Choose'}
                </span>
              </button>

              {/* Bundle (Both) */}
              <button
                type="button"
                onClick={() => handleTagTypeChange('bundle')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  formData.tagType === 'bundle'
                    ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 text-slate-900 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60 text-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1 text-slate-900">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-black text-xs">Complete Kit</span>
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight block">
                    Keychain + Card (Both)
                  </span>
                </div>
                <span className={`text-[9px] font-bold mt-2 uppercase ${formData.tagType === 'bundle' ? 'text-brand-600' : 'text-slate-400'}`}>
                  {formData.tagType === 'bundle' ? '● Selected' : '○ Choose'}
                </span>
              </button>
            </div>
          </div>

          {/* 3. Sizing Section: Conditional for Physical Delivery vs Digital Email Delivery */}
          {formData.deliveryType === 'physical_shipping' ? (
            /* Physical Delivery: Fixed Standard Manufacturing Dimensions */
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">3. Physical Manufacturing Specifications</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Fixed Standard Scale
                </span>
              </div>
              <div className="text-[11px] text-slate-600 leading-relaxed">
                {formData.tagType === 'keychain' && (
                  <p>
                    🏷️ <strong>Square Acrylic Keychain:</strong> Manufactured as a standard <strong>3.0 × 3.0 cm square tag</strong> fitted securely inside a transparent acrylic keychain fob.
                  </p>
                )}
                {formData.tagType === 'wallet_card' && (
                  <p>
                    💳 <strong>Emergency Wallet Card:</strong> Manufactured in standard ISO CR80 format (<strong>8.56 × 5.40 cm</strong>), thermally laminated to fit credit card wallet slots.
                  </p>
                )}
                {formData.tagType === 'bundle' && (
                  <p>
                    📦 <strong>Complete Kit:</strong> Includes both the <strong>Square Keychain Tag (3.0 × 3.0 cm)</strong> and <strong>Standard Wallet Card (8.56 × 5.40 cm)</strong>.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Digital Email Delivery: Customizable Dimensions for DIY Self-Printing */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span>3. Select Preferred Print Dimensions</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">For DIY self-printing</span>
              </div>

              {/* Keychain Sizes */}
              {formData.tagType === 'keychain' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, selectedSize: 'square_fob_30x30' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      formData.selectedSize === 'square_fob_30x30'
                        ? 'border-brand-600 bg-brand-50/60 text-slate-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Square Keychain Fob</span>
                      <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">3 × 3 cm</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5 block">Standard acrylic fob insert</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, selectedSize: 'standard_keychain_30x50' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      formData.selectedSize === 'standard_keychain_30x50'
                        ? 'border-brand-600 bg-brand-50/60 text-slate-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Rectangle / Oval</span>
                      <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">3 × 5 cm</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5 block">Standard rectangular blank</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, selectedSize: 'mini_compact_25x40' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      formData.selectedSize === 'mini_compact_25x40'
                        ? 'border-brand-600 bg-brand-50/60 text-slate-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Mini Compact Fob</span>
                      <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">2.5 × 4 cm</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5 block">Slim zipper / lanyard pull</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, selectedSize: 'custom' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      formData.selectedSize === 'custom'
                        ? 'border-brand-600 bg-brand-50/60 text-slate-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Custom Dimensions</span>
                      <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">Custom cm</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5 block">Specify your own dimensions</span>
                  </button>
                </div>
              )}

              {/* Wallet Card Sizes */}
              {formData.tagType === 'wallet_card' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, selectedSize: 'standard_cr80_card' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      formData.selectedSize === 'standard_cr80_card'
                        ? 'border-brand-600 bg-brand-50/60 text-slate-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Standard CR80 Card</span>
                      <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">8.56 × 5.4 cm</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5 block">Standard wallet card / ID slot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, selectedSize: 'compact_card_70x45' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      formData.selectedSize === 'compact_card_70x45'
                        ? 'border-brand-600 bg-brand-50/60 text-slate-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Compact Mini Card</span>
                      <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">7 × 4.5 cm</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5 block">Compact badge & phone sleeve</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, selectedSize: 'custom' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all sm:col-span-2 ${
                      formData.selectedSize === 'custom'
                        ? 'border-brand-600 bg-brand-50/60 text-slate-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Custom Card Dimensions</span>
                      <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">Custom cm</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5 block">Specify width & height in centimeters</span>
                  </button>
                </div>
              )}

              {/* Bundle Sizes */}
              {formData.tagType === 'bundle' && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700 space-y-1">
                  <span className="font-bold text-xs block text-slate-900">📦 All Standard Print Templates Included:</span>
                  <p className="text-[11px] text-slate-600">
                    Your digital kit includes vector templates for both <strong>Square Keychain (3×3 cm)</strong>, <strong>Rectangle Keychain (3×5 cm)</strong>, and <strong>Standard Wallet Card (CR80: 8.56×5.4 cm)</strong>.
                  </p>
                </div>
              )}

              {/* Custom Dimensions Input Box for Email Delivery */}
              {formData.selectedSize === 'custom' && (
                <div className="pt-1">
                  <label className="font-bold text-slate-700 block mb-1">
                    Custom Dimension Specifications (e.g. 4cm × 6cm):
                  </label>
                  <input
                    type="text"
                    name="customDimensions"
                    value={formData.customDimensions}
                    onChange={handleChange}
                    placeholder="e.g. 4cm width by 6cm height"
                    className="w-full px-3 py-2 bg-white border border-brand-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 font-medium text-slate-900"
                  />
                </div>
              )}
            </div>
          )}

          {/* 4. Recipient & Contact Details */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            {/* Delivery Email (Required for Digital Delivery) */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {formData.deliveryType === 'digital_email' ? 'Delivery Email Inbox' : 'Account / Notification Email'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  name="targetEmail"
                  value={formData.targetEmail}
                  onChange={handleChange}
                  placeholder="e.g. juan@example.com"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Recipient Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium text-slate-900"
                  />
                </div>
              </div>

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
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Physical Shipping Address (Only if physical delivery chosen) */}
            {formData.deliveryType === 'physical_shipping' && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Complete Physical Shipping Address <span className="text-rose-500">*</span>
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
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium text-slate-900 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. GCash Payment & Receipt Upload Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl text-white shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-white/20 text-[10px] font-black tracking-wider uppercase">
                    GCash Payment
                  </span>
                  <span className="text-xs font-bold text-blue-100">Send Payment to:</span>
                </div>
                <span className="text-[11px] font-bold text-blue-100">Official Merchant</span>
              </div>

              <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-white/15">
                <div>
                  <span className="text-[10px] uppercase text-blue-200 font-semibold block">GCash Mobile Number</span>
                  <span className="text-base font-black tracking-widest font-mono text-white select-all">
                    09939241734
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyGcash}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-700 font-bold rounded-xl text-xs hover:bg-blue-50 transition-all shadow-sm"
                >
                  {copiedGcash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedGcash ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <p className="text-[11px] text-blue-100 leading-relaxed">
                1. Open your GCash app and send payment to <strong>09939241734</strong>.<br />
                2. Take a screenshot of the completed transaction receipt.<br />
                3. Upload the receipt screenshot below for admin verification.
              </p>
            </div>

            {/* Receipt File Upload */}
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Upload GCash Receipt Screenshot <span className="text-rose-500">*</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                id="gcash-receipt-file-input"
              />

              {!receiptPreview ? (
                <label
                  htmlFor="gcash-receipt-file-input"
                  className="border-2 border-dashed border-slate-300 hover:border-brand-500 bg-slate-50 hover:bg-brand-50/30 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group"
                >
                  <div className="p-2.5 rounded-full bg-slate-100 group-hover:bg-brand-100 text-slate-500 group-hover:text-brand-600 transition-colors">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-700 group-hover:text-brand-700 mt-2 text-xs">
                    Click to select or drop GCash receipt screenshot
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    PNG, JPG, or WebP (Max 5MB)
                  </span>
                </label>
              ) : (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={receiptPreview}
                      alt="GCash Receipt Preview"
                      className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block truncate text-xs">
                        {receiptFile?.name || 'receipt-image.png'}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Ready to upload
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveReceipt}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove receipt image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* GCash Reference Number */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                GCash Reference Number (Optional but speeds up verification)
              </label>
              <input
                type="text"
                name="gcashRefNumber"
                value={formData.gcashRefNumber}
                onChange={handleChange}
                placeholder="e.g. 1029 3847 5612"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-500/20 font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Special Instructions / Notes (Optional)
            </label>
            <input
              type="text"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="e.g. Please format in high-contrast or note special request"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-500/20 font-medium text-slate-900"
            />
          </div>

          {/* Verification Warning */}
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-2 text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Once submitted, our admin team will verify your GCash payment screenshot. Upon confirmation, your official encrypted QR tag kit will be instantly delivered to <strong>{formData.targetEmail || 'your email'}</strong> via Brevo.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
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
                  Submitting Request...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Submit Order & Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
