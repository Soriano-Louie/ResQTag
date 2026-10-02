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
  CreditCard,
  Key,
  Banknote
} from 'lucide-react';
import { tagOrderService } from '../../services/tagOrderService';
import { profileService } from '../../services/profileService';
import { useToast } from '../../context/ToastContext';
import ModalOverlay from '../common/ModalOverlay';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { isValidEmail, ORDER_EMAIL_MAX_LENGTH } from '../../utils/validation';

// Physical tag packages — each unit ALWAYS includes BOTH the fixed-size square
// keychain (code 'square_fob_30x30', 3.0 × 3.0 cm) and the standard CR80
// wallet card (code 'standard_cr80_card', 8.56 × 5.4 cm). No other sizes are
// offered for physical tags. `sets` = keychain+card pairs per purchase unit.
const PHYSICAL_PACKAGES = [
  { key: 'physical_combo', label: 'Single Combo', tagline: '1 keychain + 1 wallet card', pricePeso: 100, sets: 1 },
  { key: 'physical_family_3', label: 'Family of 3', tagline: '3 keychains + 3 wallet cards', pricePeso: 210, sets: 3 },
  { key: 'physical_family_5', label: 'Family of 5', tagline: '5 keychains + 5 wallet cards', pricePeso: 350, sets: 5 },
  { key: 'physical_family_10', label: 'Family of 10', tagline: '10 keychains + 10 wallet cards', pricePeso: 700, sets: 10 }
];

const getPhysicalPackage = (key) => PHYSICAL_PACKAGES.find((p) => p.key === key);

const createInitialOrderForm = () => ({
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
    // Bundle multiplier for physical family packages; the submitted quantity is
    // derived on submit as package.sets × physicalQty (see handleSubmit).
    physicalQty: 1,
    gcashRefNumber: '',
    notes: ''
  });

export default function OrderTagModal({ isOpen, onClose, user, onOrderSuccess }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [members, setMembers] = useState([]);
  const [memberIds, setMemberIds] = useState([]);
  const [includeSelf, setIncludeSelf] = useState(false);
  const [familyError, setFamilyError] = useState('');
  const [familyLoading, setFamilyLoading] = useState(true);
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setFamilyLoading(true);
    setFamilyError('');
    api.get('/family').then(({ data }) => {
      if (!active) return;
      setMembers(data.members);
      setMemberIds(ids => ids.filter(id => data.members.some(m => m.member_id === id)));
    }).catch(err => { if (active) setFamilyError(err.message); })
      .finally(() => { if (active) setFamilyLoading(false); });
    return () => { active = false; };
  }, [isOpen]);

  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [copiedGcash, setCopiedGcash] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  const [formData, setFormData] = useState(createInitialOrderForm);

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
      if (type === 'physical_shipping') {
        // Physical orders are fixed combo packages (keychain + card). Start at
        // the default Single Combo until the user picks a package below.
        return {
          ...prev,
          deliveryType: type,
          tagType: 'bundle',
          selectedSize: 'physical_combo',
          physicalQty: 1,
          paymentMethod: nextPaymentMethod,
          gcashRefNumber: nextPaymentMethod === 'cod' ? '' : prev.gcashRefNumber,
          customWidthCm: '',
          customHeightCm: '',
          bundleKeychainSize: 'square_fob_30x30',
          bundleKeychainCustomWidth: '',
          bundleKeychainCustomHeight: '',
          bundleCardSize: 'standard_cr80_card',
          bundleCardCustomWidth: '',
          bundleCardCustomHeight: ''
        };
      }
      // Digital email delivery — keep the existing default size mapping.
      let size = prev.selectedSize;
      if (prev.tagType === 'keychain') size = 'standard_keychain_30x50';
      else if (prev.tagType === 'wallet_card') size = 'standard_cr80_card';
      else size = 'complete_bundle_all_sizes';
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
        bundleCardCustomHeight: ''
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
      // Physical orders are always the fixed combo kit.
      defaultSize = 'physical_combo';
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

  const handlePhysicalPackageChange = (key) => {
    setFormData(prev => ({
      ...prev,
      selectedSize: key,
      physicalQty: 1
    }));
  };

  const handlePhysicalQtyChange = (delta) => {
    const pkg = getPhysicalPackage(formData.selectedSize);
    if (!pkg) return;
    const current = formData.physicalQty || 1;
    // Keep the total number of tag sets within the server cap of 20.
    const maxQty = Math.max(1, Math.floor(20 / pkg.sets));
    setFormData(prev => ({
      ...prev,
      physicalQty: Math.min(maxQty, Math.max(1, current + delta))
    }));
  };

  if (!isOpen) return null;

  const isPhysicalDelivery = formData.deliveryType === 'physical_shipping';
  const isCashOnDelivery = isPhysicalDelivery && formData.paymentMethod === 'cod';

  const selectedPhysicalPackage = getPhysicalPackage(formData.selectedSize);
  const availablePeople = members.length + 1;
  const missingPeople = Math.max(0, (selectedPhysicalPackage?.sets || 0) - availablePeople);
  const physicalBundleQty = formData.physicalQty || 1;
  const physicalTotalSets = selectedPhysicalPackage
    ? selectedPhysicalPackage.sets * physicalBundleQty
    : 0;
  const physicalTotalPeso = selectedPhysicalPackage
    ? selectedPhysicalPackage.pricePeso * physicalBundleQty
    : 0;

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
    if (isPhysicalDelivery && memberIds.length + Number(includeSelf) !== selectedPhysicalPackage?.sets) {
      return toast.error(`Select exactly ${selectedPhysicalPackage?.sets} people for this package.`);
    }

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
    if (isPhysicalDelivery && !selectedPhysicalPackage) {
      return toast.error('Please choose a physical package (combo or family bundle).');
    }
    if (isPhysicalDelivery && (physicalTotalSets < 1 || physicalTotalSets > 20)) {
      return toast.error('Total tag sets must be between 1 and 20.');
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
      submissionData.append('quantity', isPhysicalDelivery ? physicalTotalSets : formData.quantity);
      if (isPhysicalDelivery) {
        submissionData.append('bundleQuantity', formData.physicalQty);
        submissionData.append('memberIds', JSON.stringify(memberIds));
        submissionData.append('includeSelf', String(includeSelf));
      }
      if (formData.paymentMethod === 'gcash') {
        submissionData.append('gcashRefNumber', formData.gcashRefNumber.trim());
      }
      submissionData.append('notes', formData.notes.trim());
      if (receiptFile) {
        submissionData.append('receipt', receiptFile);
      }

      const res = await tagOrderService.createOrder(submissionData);

      clearReceipt();
      setFormData(createInitialOrderForm());
      setMemberIds([]);
      setIncludeSelf(false);
      setCopiedGcash(false);
      setFamilyError('');
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
                  Ready-to-print PDF templates (front and back) plus a separate high-resolution QR PNG sent straight to your email inbox.
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
                  Official printed &amp; laminated <strong>combo kit (keychain + wallet card)</strong> in fixed standard sizes, delivered to your address. Pay via GCash or cash on delivery.
                </p>
              </button>

              {isPhysicalDelivery && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Delivery area:</strong> Physical delivery is currently available <strong>within Taguig only</strong>. We do not accommodate delivery outside Taguig yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Format Selection */}
          <div className="space-y-2">
            {isPhysicalDelivery ? (
              <>
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span>2. Tag Format</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Fixed Combo</span>
                </label>
                <div className="p-3 rounded-2xl bg-brand-50/40 border border-brand-300 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    <strong>Keychain + Wallet Card</strong> — both are always included in every physical package, in fixed standard sizes: <strong>Square Keychain (3.0 × 3.0 cm)</strong> and <strong>Standard Wallet Card (CR80: 8.56 × 5.40 cm)</strong>.
                  </p>
                </div>
              </>
            ) : (
              <>
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span>2. Select Tag Format</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
              </>
            )}
          </div>

          {/* 3. Physical Package Selection */}
          {formData.deliveryType === 'physical_shipping' && (
            /* Physical Delivery: Fixed Combo Package Picker */
            <div className="space-y-2">
              <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <span>3. Choose Physical Package</span>
                <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PHYSICAL_PACKAGES.map((pkg) => {
                  const selected = formData.selectedSize === pkg.key;
                  return (
                    <button
                      key={pkg.key}
                      type="button"
                      onClick={() => handlePhysicalPackageChange(pkg.key)}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${
                        selected
                          ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20 text-slate-900 shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60 text-slate-600'
                      }`}
                    >
                      {selected && (
                        <CheckCircle2 className="w-4 h-4 text-brand-600 absolute top-2 right-2" />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 text-slate-900">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-black text-xs">{pkg.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 leading-tight block">{pkg.tagline}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-sm font-black ${selected ? 'text-brand-700' : 'text-slate-800'}`}>
                          ₱{pkg.pricePeso}
                        </span>
                        <span className="text-[9px] text-slate-400">{pkg.sets} set{pkg.sets === 1 ? '' : 's'} included</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {!familyLoading && !familyError && missingPeople > 0 && (
                <div role="alert" className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900">
                  <p><strong>Not enough members for {selectedPhysicalPackage.label}.</strong> This package needs {selectedPhysicalPackage.sets} people. You currently have {availablePeople} available, including yourself.</p>
                  <p className="mt-1">
                    <Link to="/family" onClick={onClose} className="font-semibold underline">Add at least {missingPeople} more family member{missingPeople === 1 ? '' : 's'}</Link> and include your own tag, or choose a smaller package.
                  </p>
                </div>
              )}

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Every physical package is manufactured at fixed standard sizes — <strong>Square Keychain (3.0 × 3.0 cm)</strong> + <strong>Wallet Card (CR80: 8.56 × 5.4 cm)</strong>. No other sizes are offered for physical tags.
              </p>

              <fieldset className="p-4 border rounded-xl space-y-3">
                <legend className="font-bold">Choose people for this package</legend>
                <p role="status">{memberIds.length + Number(includeSelf)} of {selectedPhysicalPackage?.sets} people selected</p>
                {familyError && <p role="alert" className="text-rose-700">{familyError} Close and reopen to retry.</p>}
                <label className="block"><input type="checkbox" checked={includeSelf} onChange={e => setIncludeSelf(e.target.checked)} /> Include my own tag (one slot)</label>
                {members.map(m => <label className="block" key={m.member_id}><input type="checkbox" checked={memberIds.includes(m.member_id)} onChange={e => setMemberIds(ids => e.target.checked ? [...ids, m.member_id] : ids.filter(id => id !== m.member_id))} /> {m.first_name} {m.last_name}</label>)}
                <Link to="/family" onClick={onClose} className="text-brand-700 underline">Add or edit family members</Link>
                <p>{physicalBundleQty} set(s) per selected person. Each set includes one keychain and one wallet card.</p>
                <p className="font-semibold">{[...(includeSelf ? ['My own tag'] : []), ...members.filter(m => memberIds.includes(m.member_id)).map(m => `${m.first_name} ${m.last_name}`)].join(', ') || 'Choose your recipients above.'}</p>
              </fieldset>
              {/* Bundle quantity stepper */}
              {selectedPhysicalPackage && selectedPhysicalPackage.sets >= 1 && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 block text-xs">Bundle Quantity</span>
                    <span className="text-[10px] text-slate-500 block">
                      Each bundle adds one set for every selected person
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePhysicalQtyChange(-1)}
                      className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-95 font-black text-slate-600 transition-all"
                      aria-label="Decrease bundle quantity"
                    >−</button>
                    <span className="min-w-10 text-center font-black text-sm bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
                      {formData.physicalQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePhysicalQtyChange(1)}
                      className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-95 font-black text-slate-600 transition-all"
                      aria-label="Increase bundle quantity"
                    >+</button>
                  </div>
                </div>
              )}

              {/* Live order summary */}
              {selectedPhysicalPackage && (
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 text-white">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">Order Summary</span>
                    <span className="text-[11px] text-slate-200 block truncate">
                      {selectedPhysicalPackage.label}
                      {formData.physicalQty > 1 && ` × ${formData.physicalQty}`}
                      {` · ${physicalTotalSets} tag set${physicalTotalSets === 1 ? '' : 's'}`}
                    </span>
                  </div>
                  <span className="text-sm font-black text-emerald-100 shrink-0">₱{physicalTotalPeso}</span>
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
                <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3 shrink-0" />
                  Physical delivery is currently only available within Taguig.
                </p>
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
                  <span className="text-xs font-bold text-blue-100">
                    {isPhysicalDelivery
                      ? `Amount to Pay: ₱${physicalTotalPeso}`
                      : 'Send Payment to:'}
                  </span>
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
                  Please prepare the exact cash amount — <strong>₱{physicalTotalPeso}</strong> — on the delivery date and have your ResQTag ready for the
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
              placeholder="e.g. Near the barangay hall, beside ABC Pharmacy. Look for the blue gate."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-500/20 font-medium text-slate-900"
            />
          </div>

          {/* Verification Warning */}
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-2 text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              {isCashOnDelivery
                ? `Once submitted, our admin team will review your ${selectedPhysicalPackage?.label?.toLowerCase() || 'physical'} order and start production. No receipt is needed — payment is collected in cash by our courier on delivery.`
                : isPhysicalDelivery
                  ? `Once submitted, our admin team will verify your GCash payment screenshot and start production of your ${selectedPhysicalPackage?.label?.toLowerCase() || 'physical'} tag kit.`
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
              disabled={loading || (isPhysicalDelivery && memberIds.length + Number(includeSelf) !== selectedPhysicalPackage?.sets)}
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
                  {isCashOnDelivery
                    ? `Place Order — Cash on Delivery (₱${physicalTotalPeso})`
                    : isPhysicalDelivery
                      ? `Place Order — ₱${physicalTotalPeso}`
                      : 'Submit Order & Payment'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
