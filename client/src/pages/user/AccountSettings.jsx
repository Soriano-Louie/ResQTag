import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';
import { User, Lock, Trash2, ArrowLeft, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AccountSettings() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('All password fields are required.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      await authService.updatePassword(passwordData);
      toast.success('Password updated successfully.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      toast.error('Please enter your password to confirm deletion.');
      return;
    }

    try {
      setDeleteLoading(true);
      await authService.deleteAccount({ password: deletePassword });
      toast.success('Your account has been deleted permanently.');
      logout();
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
          <p className="text-xs text-slate-500">Manage your security credentials and account status</p>
        </div>
      </div>

      {/* Account Info Box */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">Account Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Registered Name</span>
            <span className="font-bold text-slate-800 text-sm">{user?.firstName} {user?.lastName}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Account Email</span>
            <span className="font-bold text-slate-800 text-sm">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Change Password</h3>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Min 6 characters"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={passwordData.confirmNewPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                placeholder="Re-enter new password"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition-all"
            >
              {passwordLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="bg-rose-50/60 rounded-2xl border border-rose-200 p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2.5 text-rose-900">
          <Trash2 className="w-5 h-5 text-rose-600" />
          <h3 className="font-bold text-sm">Danger Zone: Delete Account</h3>
        </div>
        <p className="text-xs text-rose-800/80 leading-relaxed">
          Permanently deletes your user account, emergency medical profile, all emergency contacts, and invalidates your QR code. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow transition-all"
        >
          Delete My Account Permanently
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-lg">Confirm Account Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Please enter your password below to confirm permanent account deletion.
            </p>
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow"
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
