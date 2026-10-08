import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { isValidEmail, USER_EMAIL_MAX_LENGTH } from '../../utils/validation';

export default function ForgotPassword() {
  const location = useLocation();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState(location.state?.email || '');
  const [step, setStep] = useState('email');
  const [requestId, setRequestId] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const [resendUntil, setResendUntil] = useState(0);

  useEffect(() => {
    if (step !== 'code') return;
    const updateCountdown = () => setResendSeconds(Math.max(0, Math.ceil((resendUntil - Date.now()) / 1000)));
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [step, resendUntil]);

  async function requestCode() {
    if (!isValidEmail(email, USER_EMAIL_MAX_LENGTH)) {
      setError('Please enter a valid account email address.');
      return;
    }
    setLoading(true); setError(''); setMessage('');
    try {
      const result = await authService.requestPasswordReset(email.trim());
      setRequestId(result.requestId); setCode(''); setResetToken('');
      setMessage(result.message); setResendSeconds(60); setResendUntil(Date.now() + 60000); setStep('code');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function submit(e) {
    e.preventDefault();
    if (step === 'email') return requestCode();
    setError('');
    if (step === 'password' && (newPassword.length < 6 || new TextEncoder().encode(newPassword).length > 72)) {
      setError('Use at least 6 characters. Shorten the password if it exceeds 72 bytes.'); return;
    }
    if (step === 'password' && newPassword !== confirmNewPassword) {
      setError('The new passwords do not match.'); return;
    }
    setLoading(true);
    try {
      if (step === 'code') {
        const result = await authService.verifyPasswordReset({ requestId, code });
        setResetToken(result.resetToken); setCode(''); setMessage(''); setStep('password');
      } else if (step === 'password') {
        await authService.confirmPasswordReset({ requestId, resetToken, newPassword, confirmNewPassword });
        setResetToken(''); setRequestId(''); setNewPassword(''); setConfirmNewPassword(''); setStep('done');
        localStorage.removeItem('resqtag_token');
        // Clear any old session displayed in the navigation after recovery.
        void refreshUser();
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function startAgain() {
    setStep('email'); setCode(''); setRequestId(''); setResetToken('');
    setNewPassword(''); setConfirmNewPassword(''); setError(''); setMessage('');
  }
  const inputClass = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500';
  const title = step === 'email' ? 'Forgot your password?' : step === 'code' ? 'Verify your email' : step === 'password' ? 'Choose a new password' : 'Password changed';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 text-white">
            {step === 'done' ? <CheckCircle2 className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">
            {step === 'email' ? 'Verify your account email before resetting your password.' : step === 'code' ? `Enter the six-digit code for ${email.trim()}. It expires in 10 minutes.` : step === 'password' ? 'Email verified. Confirm your new password below.' : 'Your existing sessions have been signed out. Log in with your new password.'}
          </p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
          {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
          {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 rounded-xl p-3">{error}</p>}
          {step !== 'done' && <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={loading} className="space-y-4">
              {step === 'email' && <div>
                <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-700 mb-1.5">Account email</label>
                <input id="reset-email" type="email" autoComplete="email" required maxLength={USER_EMAIL_MAX_LENGTH} value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" className={inputClass} />
              </div>}
              {step === 'code' && <div>
                <label htmlFor="reset-code" className="block text-xs font-semibold text-slate-700 mb-1.5">Verification code</label>
                <input id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} className={`${inputClass} text-center tracking-widest text-lg`} />
              </div>}
              {step === 'password' && <>
                <div><label htmlFor="reset-password" className="block text-xs font-semibold text-slate-700 mb-1.5">New password</label>
                  <input id="reset-password" type="password" autoComplete="new-password" required minLength={6} maxLength={72} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} />
                  <p className="text-xs text-slate-500 mt-1">At least 6 characters.</p>
                </div>
                <div><label htmlFor="reset-confirm" className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm new password</label>
                  <input id="reset-confirm" type="password" autoComplete="new-password" required minLength={6} maxLength={72} value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className={inputClass} />
                </div>
              </>}
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl disabled:opacity-60">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Please wait...' : step === 'email' ? 'Send verification code' : step === 'code' ? 'Verify code' : 'Change password'}
              </button>
            </fieldset>
          </form>}
          {step === 'code' && <button type="button" disabled={loading || resendSeconds > 0} onClick={requestCode} className="text-sm text-brand-700 font-semibold disabled:text-slate-400">{resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}</button>}
          {(step === 'code' || step === 'password') && <button type="button" disabled={loading} onClick={startAgain} className="block text-sm text-slate-600 underline">{step === 'code' ? 'Use a different email' : 'Start verification again'}</button>}
          <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm font-bold text-brand-700"><ArrowLeft className="w-4 h-4" />Back to login</Link>
        </div>
      </div>
    </div>
  );
}
