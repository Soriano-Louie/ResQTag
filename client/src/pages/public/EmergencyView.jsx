import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicService } from '../../services/publicService';
import { 
  ShieldAlert, 
  HeartHandshake, 
  PhoneCall, 
  AlertTriangle, 
  Droplet, 
  Pill, 
  Activity, 
  MapPin, 
  Calendar, 
  Mail, 
  FileText, 
  User, 
  ShieldX, 
  Loader2,
  Lock,
  CheckCircle2,
  Heart
} from 'lucide-react';

export default function EmergencyView() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('active');

  useEffect(() => {
    async function fetchEmergencyProfile() {
      if (!token) {
        setError('No emergency token provided.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await publicService.getEmergencyProfile(token);

        if (res.status === 'inactive') {
          setStatus('inactive');
        } else {
          setStatus('active');
          setData(res.data);
        }
      } catch (err) {
        setError(err.message || 'Unable to load emergency profile.');
      } finally {
        setLoading(false);
      }
    }

    fetchEmergencyProfile();
  }, [token]);

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800">Retrieving Emergency Information...</h2>
          <p className="text-sm text-slate-500">Checking verified ResQTag credentials</p>
        </div>
      </div>
    );
  }

  // 2. Not Found / Error State
  if (error) {
    return (
      <div className="min-h-[75vh] max-w-lg mx-auto p-4 sm:p-6 flex flex-col items-center justify-center text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-inner">
          <ShieldX className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Emergency Profile Unavailable</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {error}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-500 max-w-xs leading-relaxed">
          If this is a physical tag, the owner may have regenerated their QR code or the profile may have been removed.
        </div>
        <Link
          to="/"
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 underline"
        >
          Return to ResQTag Home
        </Link>
      </div>
    );
  }

  // 3. Deactivated / Inactive State
  if (status === 'inactive') {
    return (
      <div className="min-h-[75vh] max-w-lg mx-auto p-4 sm:p-6 flex flex-col items-center justify-center text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
            ResQTag Inactive
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Tag Currently Deactivated</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            This ResQTag has been temporarily marked as inactive by the owner. No emergency information is viewable at this time.
          </p>
        </div>
        <Link
          to="/"
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 underline pt-2"
        >
          Learn more about ResQTag
        </Link>
      </div>
    );
  }

  // 4. Active Emergency Profile View
  const hasContacts = data?.emergency_contacts && data.emergency_contacts.length > 0;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-5">
        
        {/* Urgent Emergency Alert Header */}
        <div className="bg-gradient-to-r from-brand-700 via-rose-600 to-brand-700 text-white rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur shrink-0">
              <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-200 block">
                Emergency Information
              </span>
              <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                {data?.full_name || 'ResQTag User'}
              </h1>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Verified
            </span>
          </div>
        </div>

        {/* Priority 1: Emergency Contacts & Quick Dial */}
        {hasContacts && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-brand-600" />
                Emergency Contacts
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                Tap to Call Directly
              </span>
            </div>

            <div className="space-y-3">
              {data.emergency_contacts.map((contact, index) => (
                <div 
                  key={contact.contact_id || index}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{contact.name}</h3>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-brand-100 text-brand-800 text-[11px] font-bold">
                        {contact.relationship}
                      </span>
                    </div>
                    {contact.email && (
                      <span className="text-xs text-slate-400 truncate max-w-[150px]">
                        {contact.email}
                      </span>
                    )}
                  </div>

                  {/* Direct Dial Action Button */}
                  {contact.contact_number && (
                    <a
                      href={`tel:${contact.contact_number.replace(/\s+/g, '')}`}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all text-sm tracking-wide"
                    >
                      <PhoneCall className="w-4 h-4 animate-bounce" />
                      CALL {contact.relationship.toUpperCase()} ({contact.contact_number})
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Priority 2: Critical Medical Quick-Stats (Blood Type & Allergies) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Blood Type */}
          {data?.blood_type && (
            <div className="bg-white rounded-2xl border-2 border-rose-200 p-4 shadow-sm flex items-center gap-3.5 bg-rose-50/30">
              <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Droplet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                  Blood Type
                </span>
                <span className="text-xl font-extrabold text-slate-900">
                  {data.blood_type}
                </span>
              </div>
            </div>
          )}

          {/* Allergies Alert */}
          {data?.allergies && (
            <div className="bg-white rounded-2xl border-2 border-amber-200 p-4 shadow-sm flex items-start gap-3.5 bg-amber-50/30">
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                  Allergies
                </span>
                <p className="text-sm font-bold text-amber-950 leading-snug">
                  {data.allergies}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Priority 3: Medical Conditions, Medications & Crucial Notes */}
        {(data?.medical_conditions || data?.medications || data?.important_medical_info || data?.emergency_notes) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Activity className="w-4 h-4 text-medical-600" />
              Medical Details
            </h2>

            <div className="space-y-4">
              {data.medical_conditions && (
                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1">
                    Medical Conditions
                  </span>
                  <p className="text-sm text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed font-medium">
                    {data.medical_conditions}
                  </p>
                </div>
              )}

              {data.medications && (
                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1">
                    Current Medications & Dosages
                  </span>
                  <p className="text-sm text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed font-medium">
                    {data.medications}
                  </p>
                </div>
              )}

              {data.important_medical_info && (
                <div>
                  <span className="text-xs font-bold text-rose-700 block mb-1">
                    Important Medical Information
                  </span>
                  <p className="text-sm text-rose-950 bg-rose-50/60 p-3 rounded-xl border border-rose-200 leading-relaxed font-medium">
                    {data.important_medical_info}
                  </p>
                </div>
              )}

              {data.emergency_notes && (
                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1">
                    Other Emergency Instructions
                  </span>
                  <p className="text-sm text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                    {data.emergency_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Priority 4: Personal Details (If marked public) */}
        {(data?.contact_number || data?.address || data?.date_of_birth || data?.email) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-4 h-4 text-purple-600" />
              Personal Identification
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {data.contact_number && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <PhoneCall className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Personal Phone</span>
                    <a href={`tel:${data.contact_number}`} className="font-bold text-slate-800 hover:text-brand-600">
                      {data.contact_number}
                    </a>
                  </div>
                </div>
              )}

              {data.date_of_birth && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Birth</span>
                    <span className="font-bold text-slate-800">{new Date(data.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </div>
              )}

              {data.address && (
                <div className="sm:col-span-2 flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Home Address</span>
                    <span className="font-medium text-slate-800">{data.address}</span>
                  </div>
                </div>
              )}

              {data.email && (
                <div className="sm:col-span-2 flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
                    <span className="font-medium text-slate-800">{data.email}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Responder Guidance Note */}
        <div className="text-center p-4 text-[11px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Displaying only owner-authorized public emergency records.
          </p>
          <p>ResQTag — Encrypted Emergency Safety System</p>
        </div>

      </div>
    </div>
  );
}
