import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  QrCode, 
  Download, 
  Printer, 
  RefreshCw, 
  Power, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertTriangle,
  Eye,
  ShieldAlert
} from 'lucide-react';
import { qrService } from '../../services/qrService';
import { useToast } from '../../context/ToastContext';

export default function QRCard({ qr, onQRUpdated }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

  if (!qr) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col items-center justify-center min-h-[350px] space-y-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center animate-pulse">
          <QrCode className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900">Setting up your ResQTag</h3>
          <p className="text-xs text-slate-500 max-w-xs">Initializing your secure emergency QR code...</p>
        </div>
        <button
          onClick={onQRUpdated}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow transition-all"
        >
          Initialize QR Code
        </button>
      </div>
    );
  }

  const origin = window.location.origin;
  const emergencyUrl = `${origin}/emergency/${qr.qr_token}`;
  const isActive = qr.status === 'active';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(emergencyUrl);
      setCopied(true);
      toast.success('Emergency URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const handleDownloadPNG = () => {
    const canvas = document.getElementById('resqtag-qr-canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `ResQTag-${qr.qr_token.slice(0, 8)}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success('ResQTag QR code image downloaded!');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleToggleStatus = async () => {
    try {
      setLoading(true);
      const newStatus = isActive ? 'inactive' : 'active';
      const res = await qrService.updateStatus(newStatus);
      toast.success(res.message);
      setShowStatusConfirm(false);
      onQRUpdated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setLoading(true);
      const res = await qrService.regenerateQR();
      toast.success(res.message);
      setShowRegenerateConfirm(false);
      onQRUpdated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Your ResQTag</h3>
            <p className="text-xs text-slate-500">Scan code or share URL during emergencies</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
              isActive
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/60'
                : 'bg-rose-100 text-rose-800 border border-rose-300/60'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* QR Canvas & Profile Link Area */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* QR Preview Box */}
        <div className="shrink-0 flex flex-col items-center justify-center p-5 bg-slate-50 rounded-2xl border border-slate-200 lg:w-56">
          <div className="bg-white p-4 rounded-xl shadow-md border border-slate-100 flex flex-col items-center w-full">
            <QRCodeCanvas
              id="resqtag-qr-canvas"
              value={emergencyUrl}
              size={160}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e11d48'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/></svg>",
                x: undefined,
                y: undefined,
                height: 32,
                width: 32,
                excavate: true,
              }}
            />
            <span className="mt-2 text-[11px] font-bold tracking-wider uppercase text-slate-400">
              Scan For Emergency
            </span>
          </div>

          <div className="mt-3 text-center">
            <span className="text-xs text-slate-500">
              Total Scans: <strong className="text-slate-800">{qr.scan_count || 0}</strong>
            </span>
            {qr.last_scanned_at && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Last scanned: {new Date(qr.last_scanned_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1.5">
              Emergency Profile Link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 truncate select-all">
                {emergencyUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
                title="Copy Link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={emergencyUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-xl transition-colors shrink-0"
                title="Preview Public Emergency Page"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleDownloadPNG}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300/70 transition-all"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              Print Keychain Tag
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            {/* Toggle Status Button */}
            <button
              onClick={() => setShowStatusConfirm(true)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'text-rose-600 hover:bg-rose-50'
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {isActive ? 'Deactivate Tag' : 'Activate Tag'}
            </button>

            {/* Regenerate Token Button */}
            <button
              onClick={() => setShowRegenerateConfirm(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Generate New QR
            </button>
          </div>
        </div>
      </div>

      {/* Deactivate/Activate Confirm Modal */}
      {showStatusConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isActive ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                <Power className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">
                {isActive ? 'Deactivate ResQTag?' : 'Activate ResQTag?'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isActive
                ? 'When deactivated, anyone scanning this QR code will see a notice that the tag is inactive. Your emergency information will NOT be displayed.'
                : 'Activating your ResQTag will immediately restore public visibility for your approved emergency information.'}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowStatusConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={loading}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-xl shadow transition-all ${
                  isActive ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {loading ? 'Updating...' : isActive ? 'Yes, Deactivate' : 'Yes, Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Confirm Modal */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">Generate New QR Code?</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Generating a new QR code will <strong>permanently deactivate your previous QR code</strong>. Any printed physical ResQTag using the old QR code will no longer work and will need to be reprinted.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow transition-all"
              >
                {loading ? 'Generating...' : 'Continue & Invalidate Old QR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
