import React, { useState, useEffect, useRef } from 'react';
import ModalOverlay from '../common/ModalOverlay';
import { authService } from '../../services/authService';
import {
  Mail, KeyRound, ShieldCheck, CheckCircle2, AlertTriangle,
  X, Loader2, ArrowRight, ArrowLeft
} from 'lucide-react';
import { isValidEmail, USER_EMAIL_MAX_LENGTH } from '../../utils/validation';

/**
 * Two-step email change handshake.
 *
 * Step 1  Confirm the account password and state the new address. The server
 *         emails a 6-digit code to the NEW address; the account email is NOT
 *         touched yet.
 * Step 2  Enter the code. Only a matching code commits the change.
 *
 * The password is deliberately never re-prompted on step 2 — step 1 already
 * proved session + password ownership, and the code proves control of the new
 * inbox. That is the two independent factors the flow is meant to require.
 */
export default function EmailChangeModal({ isOpen, onClose, currentEmail, onEmailChanged }) {
  const [step, setStep] = useState(1);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const codeRef = useRef(null);

  // Reset to a clean step 1 every time the modal is opened.
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setNewEmail('');
      setPassword('');
      setCode('');
      setPendingEmail('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 2) codeRef.current?.focus();
  }, [step]);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter your password to continue.');
      return;
    }
    if (!newEmail.trim()) {
      setError('Please enter your new email address.');
      return;
    }
    if (!isValidEmail(newEmail, USER_EMAIL_MAX_LENGTH)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await authService.requestEmailChange({ password, newEmail });

      setPendingEmail(res.newEmail);
      setCode('');
      setStep(2);
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async (e) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Please enter the verification code.');
      return;
    }

    try {
      setLoading(true);
      const res = await authService.confirmEmailChange({ code: code.trim() });

      setError('');
      onEmailChanged?.(res.newEmail);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    setCode('');
    setStep(1);
  };

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={handleClose}
      className="bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg leading-tight">Change Email Address</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Step {step} of 2 &mdash; {step === 1 ? 'Confirm your password' : 'Enter verification code'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-brand-500' : 'bg-slate-200'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-brand-500' : 'bg-slate-200'}`} />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-rose-700 leading-relaxed">{error}</p>
          </div>
        )}

        {/* ---------------- STEP 1: PASSWORD ---------------- */}
        {step === 1 && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block">Current email</span>
              <span className="text-xs text-slate-700 font-medium break-all">{currentEmail}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Email Address
              </label>
              <input
                type="email"
                required
                maxLength={USER_EMAIL_MAX_LENGTH}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                A verification code will be sent here. Your current email stays active until you confirm.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Required to confirm it is really you changing the account.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending Code...</>
                ) : (
                  <>Send Code <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ---------------- STEP 2: CODE ---------------- */}
        {step === 2 && (
          <form onSubmit={handleConfirmCode} className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-800 leading-relaxed">
                <p className="font-bold">Code sent</p>
                <p className="break-all">Enter the 6-digit code we emailed to <strong>{pendingEmail}</strong>.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Verification Code
              </label>
              <input
                ref={codeRef}
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]{6}"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
                className="w-full px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <p className="text-[10px] text-slate-400 mt-1 text-center">
                Expires in 10 minutes &middot; 5 attempts allowed
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirming...</>
                ) : (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Confirm Change</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalOverlay>
  );
}
