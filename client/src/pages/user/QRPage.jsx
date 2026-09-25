import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { qrService } from '../../services/qrService';
import QRCard from '../../components/dashboard/QRCard';
import PrintableTag from '../../components/dashboard/PrintableTag';
import { QrCode, ArrowLeft, Printer, ShieldCheck, Tag, Info, AlertTriangle, Key } from 'lucide-react';

export default function QRPage() {
  const { user, qr, setQr } = useAuth();
  const navigate = useNavigate();

  const loadQR = async () => {
    try {
      const res = await qrService.getQR();
      setQr(res.qr);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadQR();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Printable Sheet (Triggered on Window Print) */}
      <PrintableTag qr={qr} user={user} />

      <div className="no-print flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My ResQTag QR Manager</h1>
          <p className="text-xs text-slate-500">Download, print, and configure your physical emergency tag</p>
        </div>
      </div>

      <div className="no-print space-y-6">
        {/* Main QR Card */}
        <QRCard qr={qr} onQRUpdated={loadQR} />

        {/* Physical Tag Assembly Guide */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Tag className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">How to Create Your Physical ResQTag</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs">1</span>
              <h4 className="font-bold text-slate-900">Print the Sheet</h4>
              <p className="text-slate-600 leading-relaxed">
                Click "Print Keychain Tag" above to print the formatted mini keychain tag and wallet card.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs">2</span>
              <h4 className="font-bold text-slate-900">Laminate or Protect</h4>
              <p className="text-slate-600 leading-relaxed">
                Cut along the dotted borders. Protect the tag with clear tape, a thermal laminator, or a clear acrylic key fob.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs">3</span>
              <h4 className="font-bold text-slate-900">Attach & Go</h4>
              <p className="text-slate-600 leading-relaxed">
                Punch a hole at the top marker and attach to your keys, backpack zipper, pet collar, or slide into your wallet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
