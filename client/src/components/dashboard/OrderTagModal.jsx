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
  Key,
  Banknote
} from 'lucide-react';
import { tagOrderService } from '../../services/tagOrderService';
import { profileService } from '../../services/profileService';
import { useToast } from '../../context/ToastContext';
import ModalOverlay from '../common/ModalOverlay';
import { isValidEmail, ORDER_EMAIL_MAX_LENGTH } from '../../utils/validation';

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
    paymentMethod: 'gcash', // 'gcash' | 'cod' (cod only for physical_shipping)
    targetEmail: '',
    recipientName: '',
    contactNumber: '',
    shippingAddress: '',
    tagType: 'keychain', // 'keychain' | 'wallet_card' | 'bundle'
    selectedSize: 'standard_keychain_30x50',
    // Custom dimensions (width/height) for single-item custom size
    customWidthCm: '',
    customHeightCm: '',
    // Bundle-specific size selections (for digital email complete kit)
    bundleKeychainSize: 'square_fob_30x30',
    bundleKeychainCustomWidth: '',
    bundleKeychainCustomHeight: '',
    bundleCardSize: 'standard_cr80_card',
    bundleCardCustomWidth: '',
    bundleCardCustomHeight: '',
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

  const clearReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Adjust default size when deliveryType or tagType changes
  const handleDeliveryTypeChange = (type) => {
    // Cash on Delivery is exclusive to physical shipping, so digital orders fall back to GCash
    const nextPaymentMethod = type === 'physical_shipping' ? formData.paymentMethod : 'gcash';
    if (nextPaymentMethod !== formData.paymentMethod) clearReceipt();

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
        paymentMethod: nextPaymentMethod,
        gcashRefNumber: nextPaymentMethod === 'cod' ? '' : prev.gcashRefNumber,
        selectedSize: size,
        customWidthCm: '',
        customHeightCm: '',
        bundleKeychainSize: 'square_fob_30x30',
        bundleKeychainCustomWidth: '',
        bundleKeychainCustomHeight: '',
        bundleCardSize: 'standard_cr80_card',
        bundleCardCustomWidth: '',
        bundleCardCustomHeight: '',
      };
    });
  };

  const handlePaymentMethodChange = (method) => {
    if (method === formData.paymentMethod) return;
    if (method === 'cod') clearReceipt();
    setFormData(prev => ({
      ...prev,
      paymentMethod: method,
      gcashRefNumber: method === 'cod' ? '' : prev.gcashRefNumber
    }));
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
      customWidthCm: '',
      customHeightCm: '',
      bundleKeychainSize: 'square_fob_30x30',
      bundleKeychainCustomWidth: '',
      bundleKeychainCustomHeight: '',
      bundleCardSize: 'standard_cr80_card',
      bundleCardCustomWidth: '',
      bundleCardCustomHeight: '',
    }));
  };

  if (!isOpen) return null;

  const isPhysicalDelivery = formData.deliveryType === 'physical_shipping';
  const isCashOnDelivery = isPhysicalDelivery && formData.paymentMethod === 'cod';

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
    clearReceipt();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.recipientName.trim()) {
      return toast.error('Please enter the recipient full name.');
    }
    if (!formData.contactNumber.trim()) {
      return toast.error('Please enter a valid contact phone number.');
    }
    if (formData.deliveryType === 'digital_email') {
      if (!formData.targetEmail.trim()) {
        return toast.error('Please enter the email address for QR delivery.');
      }
      if (!isValidEmail(formData.targetEmail, ORDER_EMAIL_MAX_LENGTH)) {
        return toast.error('Please enter a valid email address for QR delivery.');
      }
    }
    if (formData.deliveryType === 'physical_shipping' && !formData.shippingAddress.trim()) {
      return toast.error('Please enter the complete delivery address.');
    }
    if (formData.deliveryType === 'digital_email' && formData.tagType !== 'bundle' && formData.selectedSize === 'custom') {
      if (!formData.customWidthCm || !formData.customHeightCm) {
        return toast.error('Please enter both Width and Height for your custom dimensions.');
      }
    }
    if (formData.deliveryType === 'digital_email' && formData.tagType === 'bundle') {
      if (formData.bundleKeychainSize === 'custom' && (!formData.bundleKeychainCustomWidth || !formData.bundleKeychainCustomHeight)) {
        return toast.error('Please enter Width and Height for your custom keychain dimensions.');
      }
      if (formData.bundleCardSize === 'custom' && (!formData.bundleCardCustomWidth || !formData.bundleCardCustomHeight)) {
        return toast.error('Please enter Width and Height for your custom card dimensions.');
      }
    }
    if (formData.paymentMethod === 'gcash' && !receiptFile) {
      return toast.error('Please upload your GCash payment receipt screenshot.');
    }

    try {
      setLoading(true);

      const submissionData = new FormData();
      submissionData.append('deliveryType', formData.deliveryType);
      submissionData.append('paymentMethod', formData.paymentMethod);
      submissionData.append('targetEmail', formData.targetEmail.trim());
      submissionData.append('recipientName', formData.recipientName.trim());
      submissionData.append('contactNumber', formData.contactNumber.trim());
      submissionData.append('shippingAddress', formData.shippingAddress.trim());
      submissionData.append('tagType', formData.tagType);
      submissionData.append('selectedSize', formData.selectedSize);
      if (formData.deliveryType === 'digital_email' && formData.tagType !== 'bundle' && formData.selectedSize === 'custom') {
        submissionData.append('customDimensions', `${formData.customWidthCm}cm × ${formData.customHeightCm}cm`);
      }
      if (formData.deliveryType === 'digital_email' && formData.tagType === 'bundle') {
        const kSize = formData.bundleKeychainSize === 'custom'
          ? `custom:${formData.bundleKeychainCustomWidth}×${formData.bundleKeychainCustomHeight}cm`
          : formData.bundleKeychainSize;
        const cSize = formData.bundleCardSize === 'custom'
          ? `custom:${formData.bundleCardCustomWidth}×${formData.bundleCardCustomHeight}cm`
          : formData.bundleCardSize;
        submissionData.append('bundleKeychainSize', kSize);
        submissionData.append('bundleCardSize', cSize);
        submissionData.append('customDimensions', `Keychain: ${kSize} | Card: ${cSize}`);
      }
      submissionData.append('quantity', formData.quantity);
      if (formData.paymentMethod === 'gcash') {
        submissionData.append('gcashRefNumber', formData.gcashRefNumber.trim());
      }
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
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      className="bg-slate-950/80 backdrop-blur-md flex items-start sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="safe-area-inset bg-white sm:rounded-3xl rounded-none max-w-xl w-full sm:p-7 p-4 shadow-2xl border border-slate-100 relative sm:my-6 my-0 sm:max-h-[92dvh] max-h-[100dvh] h-[100dvh] sm:h-auto flex flex-col">
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
              {isPhysicalDelivery && ' — pay by GCash or Cash on Delivery'}
            </p>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-5 overflow-y-auto overscroll-contain pr-1 text-xs flex-1 min-h-0">
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
                  Official printed & laminated tag (square keychain or card) manufactured and shipped to your address. Pay via GCash or cash on delivery.
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
                    onClick={() => setFormData(p => ({ ...p, selectedSize: 'square_fob_30x30', customWidthCm: '', customHeightCm: '' }))}
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
                    onClick={() => setFormData(p => ({ ...p, selectedSize: 'standard_keychain_30x50', customWidthCm: '', customHeightCm: '' }))}
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
                    onClick={() => setFormData(p => ({ ...p, selectedSize: 'mini_compact_25x40', customWidthCm: '', customHeightCm: '' }))}
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
                    onClick={() => setFormData(p => ({ ...p, selectedSize: 'standard_cr80_card', customWidthCm: '', customHeightCm: '' }))}
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
                    onClick={() => setFormData(p => ({ ...p, selectedSize: 'compact_card_70x45', customWidthCm: '', customHeightCm: '' }))}
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

              {/* Bundle Sizes — digital email: pick sizes for BOTH keychain and card */}
              {formData.tagType === 'bundle' && (
                <div className="space-y-3">
                  {/* Keychain size for bundle */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-brand-600" /> Keychain Size
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: 'square_fob_30x30', label: 'Square Fob', dims: '3 × 3 cm', sub: 'Standard acrylic fob insert' },
                        { id: 'standard_keychain_30x50', label: 'Rectangle / Oval', dims: '3 × 5 cm', sub: 'Standard rectangular blank' },
                        { id: 'mini_compact_25x40', label: 'Mini Compact Fob', dims: '2.5 × 4 cm', sub: 'Slim zipper / lanyard pull' },
                        { id: 'custom', label: 'Custom Size', dims: 'Custom cm', sub: 'Specify your own keychain dimensions' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, bundleKeychainSize: opt.id, bundleKeychainCustomWidth: '', bundleKeychainCustomHeight: '' }))}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            formData.bundleKeychainSize === opt.id
                              ? 'border-brand-600 bg-brand-50/60 text-slate-900 font-bold'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{opt.label}</span>
                            <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{opt.dims}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal mt-0.5 block">{opt.sub}</span>
                        </button>
                      ))}
                    </div>
                    {/* Custom width/height for bundle keychain */}
                    {formData.bundleKeychainSize === 'custom' && (
                      <div className="pt-1 space-y-1.5">
                        <p className="text-[11px] text-slate-500 font-medium">Enter your keychain dimensions in centimeters:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-[11px]">Width (cm) <span className="text-rose-500">*</span></label>
                            <input
                              type="number"
                              min="0.5"
                              step="0.1"
                              value={formData.bundleKeychainCustomWidth}
                              onChange={e => setFormData(p => ({ ...p, bundleKeychainCustomWidth: e.target.value }))}
                              placeholder="e.g. 3.5"
                              className="w-full px-3 py-2 bg-white border border-brand-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 font-medium text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-[11px]">Height (cm) <span className="text-rose-500">*</span></label>
                            <input
                              type="number"
                              min="0.5"
                              step="0.1"
                              value={formData.bundleKeychainCustomHeight}
                              onChange={e => setFormData(p => ({ ...p, bundleKeychainCustomHeight: e.target.value }))}
                              placeholder="e.g. 5.0"
                              className="w-full px-3 py-2 bg-white border border-brand-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 font-medium text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Wallet card size for bundle */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-brand-600" /> Wallet Card Size
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: 'standard_cr80_card', label: 'Standard CR80 Card', dims: '8.56 × 5.4 cm', sub: 'Standard wallet card / ID slot' },
                        { id: 'compact_card_70x45', label: 'Compact Mini Card', dims: '7 × 4.5 cm', sub: 'Compact badge & phone sleeve' },
                        { id: 'custom', label: 'Custom Card Size', dims: 'Custom cm', sub: 'Specify your own card dimensions', span: true },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, bundleCardSize: opt.id, bundleCardCustomWidth: '', bundleCardCustomHeight: '' }))}
                          className={`p-2.5 rounded-xl border text-left transition-all ${opt.span ? 'sm:col-span-2' : ''} ${
                            formData.bundleCardSize === opt.id
                              ? 'border-brand-600 bg-brand-50/60 text-slate-900 font-bold'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{opt.label}</span>
                            <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{opt.dims}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal mt-0.5 block">{opt.sub}</span>
                        </button>
                      ))}
                    </div>
                    {/* Custom width/height for bundle card */}
                    {formData.bundleCardSize === 'custom' && (
                      <div className="pt-1 space-y-1.5">
                        <p className="text-[11px] text-slate-500 font-medium">Enter your card dimensions in centimeters:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-[11px]">Width (cm) <span className="text-rose-500">*</span></label>
                            <input
                              type="number"
                              min="0.5"
                              step="0.1"
                              value={formData.bundleCardCustomWidth}
                              onChange={e => setFormData(p => ({ ...p, bundleCardCustomWidth: e.target.value }))}
                              placeholder="e.g. 8.56"
                              className="w-full px-3 py-2 bg-white border border-brand-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 font-medium text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-1 text-[11px]">Height (cm) <span className="text-rose-500">*</span></label>
                            <input
                              type="number"
                              min="0.5"
                              step="0.1"
                              value={formData.bundleCardCustomHeight}
                              onChange={e => setFormData(p => ({ ...p, bundleCardCustomHeight: e.target.value }))}
                              placeholder="e.g. 5.4"
                              className="w-full px-3 py-2 bg-white border border-brand-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 font-medium text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Custom Dimensions — two separate Width/Height fields */}
              {formData.tagType !== 'bundle' && formData.selectedSize === 'custom' && (
                <div className="pt-1 space-y-1.5">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Enter your custom dimensions in centimeters — e.g. Width: <strong>4</strong>, Height: <strong>6</strong>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-[11px]">Width (cm) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.1"
                        value={formData.customWidthCm}
                        onChange={e => setFormData(p => ({ ...p, customWidthCm: e.target.value }))}
                        placeholder="e.g. 4"
                        className="w-full px-3 py-2 bg-white border border-brand-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 font-medium text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-[11px]">Height (cm) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.1"
                        value={formData.customHeightCm}
                        onChange={e => setFormData(p => ({ ...p, customHeightCm: e.target.value }))}
                        placeholder="e.g. 6"
                        className="w-full px-3 py-2 bg-white border border-brand-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 font-medium text-slate-900"
                      />
                    </div>
                  </div>
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
                  maxLength={ORDER_EMAIL_MAX_LENGTH}
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

          {/* 5. Payment Method, Confirmation & Receipt Upload Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            {/* Payment Method Selector — Cash on Delivery is offered for physical tag delivery only */}
            {isPhysicalDelivery && (
              <div className="space-y-2">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span>5. Choose Payment Method</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* GCash */}
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('gcash')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                      formData.paymentMethod === 'gcash'
                        ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${formData.paymentMethod === 'gcash' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-black text-slate-900 block text-xs">GCash</span>
                          <span className="text-[10px] text-blue-600 font-bold">Pay Now</span>
                        </div>
                      </div>
                      {formData.paymentMethod === 'gcash' && (
                        <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      Send payment now and upload your receipt. Your order is queued right away while we verify it.
                    </p>
                  </button>

                  {/* Cash on Delivery */}
                  <button
                    type="button"
                    onClick={() => handlePaymentMethodChange('cod')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                      formData.paymentMethod === 'cod'
                        ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${formData.paymentMethod === 'cod' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          <Banknote className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-black text-slate-900 block text-xs">Cash on Delivery</span>
                          <span className="text-[10px] text-emerald-600 font-bold">Pay on Arrival</span>
                        </div>
                      </div>
                      {formData.paymentMethod === 'cod' && (
                        <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      Settle in cash with our courier when the physical tag reaches your address. No receipt needed.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {!isCashOnDelivery && (
              <>
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
              </>
            )}

            {/* Cash on Delivery Confirmation Panel */}
            {isCashOnDelivery && (
              <div className="p-4 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl text-white shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-white/20 text-[10px] font-black tracking-wider uppercase">
                      Cash on Delivery
                    </span>
                    <span className="text-xs font-bold text-emerald-100">No payment needed now</span>
                  </div>
                  <Banknote className="w-5 h-5 text-emerald-100" />
                </div>

                <p className="text-[11px] text-emerald-50 leading-relaxed">
                  1. Submit this order with no receipt or reference number required.<br />
                  2. We manufacture your tag and dispatch it to your shipping address.<br />
                  3. Pay our courier in cash when the package is handed over to you.
                </p>

                <div className="bg-white/10 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-white/15 text-[11px] text-emerald-50 leading-relaxed">
                  Please prepare the exact cash amount on the delivery date and have your ResQTag ready for the
                  courier. Our team marks the order as paid once the courier confirms the handover.
                </div>
              </div>
            )}
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
              {isCashOnDelivery
                ? 'Once submitted, our admin team will review your shipping details and start production. No receipt is needed — payment is collected in cash by our courier upon delivery of the physical tag.'
                : `Once submitted, our admin team will verify your GCash payment screenshot. Upon confirmation, your official encrypted QR tag kit will be instantly delivered to ${formData.targetEmail || 'your email'} via Brevo.`}
            </p>
          </div>

          {/* Action Buttons — pinned so they stay reachable while the form scrolls */}
          <div className="sticky bottom-0 -mb-4 sm:-mb-7 -mx-1 px-1 pb-4 sm:pb-7 pt-3 bg-white flex justify-end gap-3 border-t border-slate-100 z-10">
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
                  {isCashOnDelivery ? 'Place Order — Cash on Delivery' : 'Submit Order & Payment'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
