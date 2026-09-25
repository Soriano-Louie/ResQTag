import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { contactService } from '../../services/contactService';
import { qrService } from '../../services/qrService';
import QRCard from '../../components/dashboard/QRCard';
import PrintableTag from '../../components/dashboard/PrintableTag';
import { 
  User, 
  HeartHandshake, 
  Activity, 
  Lock, 
  Edit3, 
  Plus, 
  ShieldCheck, 
  Droplet, 
  AlertTriangle,
  QrCode,
  ArrowUpRight,
  ExternalLink,
  Phone,
  Loader2
} from 'lucide-react';

export default function Dashboard() {
  const { user, qr, refreshUser, setQr } = useAuth();
  const [profile, setProfile] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [profileData, contactData, qrData] = await Promise.all([
        profileService.getProfile().catch(() => null),
        contactService.getContacts().catch(() => ({ contacts: [] })),
        qrService.getQR().catch(() => null)
      ]);
      setProfile(profileData);
      setContacts(contactData?.contacts || []);
      if (qrData?.qr) {
        setQr(qrData.qr);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading && !profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading your emergency dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-700/80">
        <div className="space-y-1">
          <span className="text-xs uppercase font-bold tracking-wider text-brand-400">
            Emergency Management Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-black">
            Welcome, {user?.firstName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Your emergency profile is configured and ready for physical tag fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/privacy"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
          >
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            Privacy Settings
          </Link>
          <Link
            to="/qr"
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-brand-600/30 transition-all"
          >
            <QrCode className="w-3.5 h-3.5" />
            Order Physical Tag
          </Link>
        </div>
      </div>

      {/* Main Grid: QR Tag Card + Overview Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: QR Card */}
        <div className="lg:col-span-5 space-y-6">
          <QRCard qr={qr} user={user} onQRUpdated={loadDashboardData} />
        </div>

        {/* Right Column: Profile Summary Cards */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Personal Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Personal Information</h3>
              </div>
              <Link
                to="/profile"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Full Name</span>
                <span className="font-bold text-slate-800 text-sm">
                  {[profile?.personal?.firstName, profile?.personal?.middleName, profile?.personal?.lastName].filter(Boolean).join(' ') || `${user?.firstName} ${user?.lastName}`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Account Email</span>
                <span className="font-semibold text-slate-800">{user?.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Contact Phone</span>
                <span className="font-semibold text-slate-800">
                  {profile?.personal?.contactNumber || <span className="text-slate-400 italic">Not set</span>}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Date of Birth</span>
                <span className="font-semibold text-slate-800">
                  {profile?.personal?.dateOfBirth || <span className="text-slate-400 italic">Not set</span>}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block font-medium">Address</span>
                <span className="font-medium text-slate-700">
                  {profile?.personal?.address || <span className="text-slate-400 italic">Not set</span>}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Medical & Emergency Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Emergency Medical Data</h3>
              </div>
              <Link
                to="/medical"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Blood Type</span>
                <span className="font-extrabold text-base text-rose-600">
                  {profile?.medical?.bloodType || <span className="text-xs text-slate-400 italic font-normal">Unspecified</span>}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Allergies</span>
                <span className="font-bold text-slate-800">
                  {profile?.medical?.allergies || <span className="text-xs text-slate-400 italic font-normal">None listed</span>}
                </span>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <span className="text-slate-400 block font-medium">Important Medical Notes</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {profile?.medical?.importantMedicalInfo || profile?.medical?.emergencyNotes || (
                    <span className="text-slate-400 italic">No notes added. Click edit to add critical info for rescuers.</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Emergency Contacts Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Emergency Contacts ({contacts.length})
                </h3>
              </div>
              <Link
                to="/contacts"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-2.5 py-1 rounded-lg transition-colors"
              >
                Manage Contacts
              </Link>
            </div>

            {contacts.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                <p className="text-xs text-slate-500">You haven't added any emergency contacts yet.</p>
                <Link
                  to="/contacts"
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Emergency Contact
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.slice(0, 3).map((contact) => (
                  <div
                    key={contact.contact_id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{contact.name}</span>
                      <span className="text-slate-500">{contact.relationship} • {contact.contact_number}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        contact.is_public
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {contact.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
