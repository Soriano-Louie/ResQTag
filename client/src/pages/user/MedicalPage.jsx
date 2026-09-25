import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { useToast } from '../../context/ToastContext';
import { Activity, Droplet, AlertTriangle, Pill, HeartPulse, FileText, Save, ArrowLeft, Loader2 } from 'lucide-react';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown / Unspecified'];

export default function MedicalPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    bloodType: '',
    allergies: '',
    medicalConditions: '',
    medications: '',
    importantMedicalInfo: '',
    emergencyNotes: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await profileService.getProfile();
        if (res.medical) {
          setFormData({
            bloodType: res.medical.bloodType || '',
            allergies: res.medical.allergies || '',
            medicalConditions: res.medical.medicalConditions || '',
            medications: res.medical.medications || '',
            importantMedicalInfo: res.medical.importantMedicalInfo || '',
            emergencyNotes: res.medical.emergencyNotes || ''
          });
        }
      } catch (err) {
        toast.error('Failed to load medical information.');
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
    try {
      setSaving(true);
      await profileService.updateMedicalInfo(formData);
      toast.success('Emergency medical information updated successfully.');
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
          <h1 className="text-2xl font-bold text-slate-900">Emergency & Medical Information</h1>
          <p className="text-xs text-slate-500">Provide critical health records to assist emergency responders</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Blood Type & Allergies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Blood Type
              </label>
              <div className="relative">
                <Droplet className="w-4 h-4 text-rose-500 absolute left-3.5 top-3" />
                <select
                  name="bloodType"
                  value={formData.bloodType}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="">Select Blood Type...</option>
                  {BLOOD_TYPES.map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Allergies (Drugs, Foods, Latex)
              </label>
              <div className="relative">
                <AlertTriangle className="w-4 h-4 text-amber-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  placeholder="e.g. Penicillin, Peanuts, Sulfa"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Medical Conditions */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Existing Medical Conditions
            </label>
            <div className="relative">
              <HeartPulse className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <textarea
                name="medicalConditions"
                rows="2"
                value={formData.medicalConditions}
                onChange={handleChange}
                placeholder="e.g. Asthma, Type 1 Diabetes, Hypertension, Epilepsy"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Medications */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Medications & Dosages
            </label>
            <div className="relative">
              <Pill className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <textarea
                name="medications"
                rows="2"
                value={formData.medications}
                onChange={handleChange}
                placeholder="e.g. Albuterol Inhaler (PRN), Metformin 500mg daily"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Important Medical Info */}
          <div>
            <label className="block text-xs font-semibold text-rose-700 mb-1">
              Important Medical Information (High Priority for Rescuers)
            </label>
            <div className="relative">
              <Activity className="w-4 h-4 text-rose-500 absolute left-3.5 top-3" />
              <textarea
                name="importantMedicalInfo"
                rows="2"
                value={formData.importantMedicalInfo}
                onChange={handleChange}
                placeholder="e.g. Pacemaker implanted, Organ donor, Severely diabetic"
                className="w-full pl-10 pr-3 py-2.5 bg-rose-50/40 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Other Emergency Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Other Emergency Notes / Communication Preferences
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <textarea
                name="emergencyNotes"
                rows="2"
                value={formData.emergencyNotes}
                onChange={handleChange}
                placeholder="e.g. Uses hearing aid, Non-verbal in distress, Speaks English/Tagalog"
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
              {saving ? 'Saving...' : 'Save Medical Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
