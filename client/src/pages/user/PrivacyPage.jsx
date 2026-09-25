import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { privacyService } from '../../services/privacyService';
import { useToast } from '../../context/ToastContext';
import PrivacyWarningBanner from '../../components/dashboard/PrivacyWarningBanner';
import { 
  Lock, 
  Globe, 
  Save, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  Check, 
  AlertTriangle,
  User,
  Activity,
  HeartHandshake
} from 'lucide-react';

const PRIVACY_SECTIONS = [
  {
    title: 'Personal Identification',
    icon: User,
    color: 'text-purple-600 bg-purple-50',
    fields: [
      { key: 'full_name', label: 'Full Name', desc: 'Allows first responders to address you and identify your profile', sensitive: false },
      { key: 'contact_number', label: 'Personal Phone Number', desc: 'Your direct mobile number', sensitive: true },
      { key: 'email', label: 'Personal Email Address', desc: 'Your personal account email', sensitive: true },
      { key: 'address', label: 'Home Address', desc: 'Your physical residence address', sensitive: true },
      { key: 'date_of_birth', label: 'Date of Birth', desc: 'Helps emergency doctors assess age-appropriate dosages', sensitive: true }
    ]
  },
  {
    title: 'Emergency Medical Data',
    icon: Activity,
    color: 'text-rose-600 bg-rose-50',
    fields: [
      { key: 'blood_type', label: 'Blood Type', desc: 'Crucial for immediate transfusions in trauma scenarios', sensitive: false },
      { key: 'allergies', label: 'Allergies', desc: 'Prevents administration of life-threatening medications', sensitive: false },
      { key: 'medical_conditions', label: 'Existing Medical Conditions', desc: 'Chronic conditions (e.g., Epilepsy, Diabetes, Asthma)', sensitive: true },
      { key: 'medications', label: 'Current Medications & Dosages', desc: 'Daily prescriptions and medical dosages', sensitive: true },
      { key: 'important_medical_info', label: 'Important Medical Information', desc: 'Implants, DNR status, or vital survival notes', sensitive: false },
      { key: 'emergency_notes', label: 'General Emergency Notes', desc: 'Language preferences or miscellaneous rescuer notes', sensitive: true }
    ]
  },
  {
    title: 'Emergency Contacts Visibility',
    icon: HeartHandshake,
    color: 'text-emerald-600 bg-emerald-50',
    fields: [
      { key: 'emergency_contacts', label: 'Emergency Contacts Section', desc: 'Master switch to display your public emergency contacts and call buttons', sensitive: false }
    ]
  }
];

export default function PrivacyPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await privacyService.getPrivacySettings();
        setSettings(res.settings || {});
      } catch (err) {
        toast.error('Failed to load privacy settings.');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await privacyService.updatePrivacySettings(settings);
      toast.success('Privacy settings saved! Public emergency profile updated.');
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Privacy & Visibility Controls</h1>
            <p className="text-xs text-slate-500">Configure exactly what fields appear when your QR code is scanned</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Warning Notice Banner */}
      <PrivacyWarningBanner />

      {/* Settings Matrix */}
      <div className="space-y-6">
        {PRIVACY_SECTIONS.map((section, sIdx) => {
          const Icon = section.icon;
          return (
            <div key={sIdx} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className={`p-2 rounded-xl ${section.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{section.title}</h3>
              </div>

              <div className="divide-y divide-slate-100">
                {section.fields.map((field) => {
                  const isPublic = !!settings[field.key];
                  return (
                    <div
                      key={field.key}
                      className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                    >
                      <div className="space-y-0.5 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {field.label}
                          </span>
                          {field.sensitive && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              Sensitive
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500">
                          {field.desc}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-xs font-bold uppercase hidden sm:inline-block ${
                            isPublic ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {isPublic ? 'Public' : 'Private'}
                        </span>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isPublic}
                            onChange={() => handleToggle(field.key)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold px-7 py-3 rounded-xl shadow-md transition-all"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Privacy Configuration'}
        </button>
      </div>
    </div>
  );
}
