import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { useToast } from '../../context/ToastContext';
import { User, Phone, MapPin, Calendar, Save, ArrowLeft, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    contactNumber: '',
    address: '',
    dateOfBirth: '',
    profilePictureUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await profileService.getProfile();
        if (res.personal) {
          setFormData({
            firstName: res.personal.firstName || '',
            middleName: res.personal.middleName || '',
            lastName: res.personal.lastName || '',
            contactNumber: res.personal.contactNumber || '',
            address: res.personal.address || '',
            dateOfBirth: res.personal.dateOfBirth || '',
            profilePictureUrl: res.personal.profilePictureUrl || ''
          });
        }
      } catch (err) {
        toast.error('Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }

    try {
      setSaving(true);
      await profileService.updatePersonalInfo(formData);
      toast.success('Personal information updated successfully.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Personal Information</h1>
          <p className="text-xs text-slate-500">Update your name, contact phone, and residence address</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Middle Name
              </label>
              <input
                type="text"
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
                placeholder="(Optional)"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Phone & Date of Birth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="0917-123-4567"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Residential Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <textarea
                name="address"
                rows="2"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address, City, Province/State"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
