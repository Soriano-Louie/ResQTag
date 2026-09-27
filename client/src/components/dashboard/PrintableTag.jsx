import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldAlert, HeartPulse, PhoneCall, AlertTriangle } from 'lucide-react';

export default function PrintableTag({ qr, user, tagType = 'bundle' }) {
  if (!qr) return null;
  const origin = window.location.origin;
  const emergencyUrl = `${origin}/emergency/${qr.qr_token}`;

  const showKeychain = tagType === 'keychain' || tagType === 'bundle';
  const showWalletCard = tagType === 'wallet_card' || tagType === 'bundle';

  return (
    <div className="hidden print:block p-6 max-w-3xl mx-auto text-black font-sans bg-white">
      {/* Header Info for Manufacturer / Admin */}
      <div className="text-center mb-6 border-b-2 border-slate-300 pb-4">
        <div className="flex items-center justify-center gap-2 text-rose-700 font-black text-xl tracking-wider uppercase">
          <ShieldAlert className="w-6 h-6" />
          <span>ResQTag Physical Manufacturing Template</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Target: <strong>{user?.firstName} {user?.lastName}</strong> • Format: <strong>{tagType === 'bundle' ? 'Complete Kit (Keychain + Card)' : tagType === 'keychain' ? 'Acrylic Keychain Tag' : 'Emergency Wallet Card'}</strong> • Token: <span className="font-mono">RQ-{qr.qr_token.slice(0, 8).toUpperCase()}</span>
        </p>
      </div>

      <div className="space-y-8">
        {/* ========================================================
            1. KEYCHAIN TAG TEMPLATE (Front & Back Inserts)
            ======================================================== */}
        {showKeychain && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span>🔑 Acrylic Keychain Tag — 3.0 × 3.0 cm (Fold &amp; Insert Format)</span>
              <span className="text-[10px] text-slate-400 font-normal">Cut along dashed line</span>
            </div>

            {/* Outer dashed cut border */}
            <div
              className="border-2 border-dashed border-slate-700 rounded-2xl bg-white flex justify-around items-center mx-auto"
              style={{ width: 'fit-content', padding: '5px', gap: '4px' }}
            >
              {/* ── Keychain FRONT ── 3.0 × 3.0 cm ── */}
              <div
                className="border border-slate-300 rounded-lg bg-white shadow-sm flex flex-col items-center justify-center text-center overflow-hidden"
                style={{ width: '3.0cm', height: '3.0cm', padding: '1.5mm', boxSizing: 'border-box', gap: '1.5mm' }}
              >
                {/* Brand */}
                <div
                  className="flex items-center gap-0.5 text-rose-700 font-black uppercase tracking-wider shrink-0"
                  style={{ fontSize: '5.5pt' }}
                >
                  <ShieldAlert style={{ width: '6.5pt', height: '6.5pt' }} />
                  <span>ResQTag</span>
                </div>

                {/* QR Code */}
                <div className="border border-slate-200 rounded bg-white shrink-0" style={{ padding: '1px' }}>
                  <QRCodeSVG value={emergencyUrl} size={54} level="H" />
                </div>

                {/* Footer */}
                <span
                  className="font-black text-rose-700 tracking-wide uppercase shrink-0"
                  style={{ fontSize: '5.5pt' }}
                >
                  Scan in Emergency
                </span>
              </div>

              {/* Fold Divider */}
              <div style={{ height: '3.0cm', borderLeft: '2px dotted #cbd5e1', margin: '0 1px', flexShrink: 0 }} />

              {/* ── Keychain BACK ── 3.0 × 3.0 cm ── */}
              <div
                className="border border-slate-300 rounded-lg bg-white text-black shadow-sm flex flex-col items-center justify-center text-center overflow-hidden"
                style={{ width: '3.0cm', height: '3.0cm', padding: '1.5mm', boxSizing: 'border-box', gap: '1.5mm' }}
              >
                {/* Name block */}
                <div className="shrink-0">
                  <span
                    className="uppercase tracking-widest text-rose-700 font-black block"
                    style={{ fontSize: '5.5pt' }}
                  >
                    EMERGENCY ID
                  </span>
                  <span
                    className="font-black text-black leading-tight block"
                    style={{ fontSize: '7pt' }}
                  >
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>

                {/* Feature bullets */}
                <div
                  className="rounded bg-slate-50 border border-slate-200 text-black text-left w-full shrink-0 font-medium"
                  style={{ fontSize: '5.5pt', padding: '1mm', lineHeight: '1.4' }}
                >
                  <p>• Scan QR for medical info</p>
                  <p>• 1-Touch emergency contacts</p>
                  <p>• Real-time cloud verified</p>
                </div>
              </div>
            </div>

            {/* Print size note */}
            <p className="text-center text-[9px] text-slate-400 mt-1">
              Each panel prints at exactly <strong>3.0 × 3.0 cm</strong> · Fold along center dotted line · Insert into acrylic fob
            </p>
          </div>
        )}

        {/* ========================================================
            2. WALLET CARD TEMPLATE (CR80 Standard Card Format)
            ======================================================== */}
        {showWalletCard && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span>💳 Emergency Wallet Card (Standard Credit Card Size)</span>
              <span className="text-[10px] text-slate-400 font-normal">Cut along dashed line</span>
            </div>

            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-4 bg-white flex flex-col sm:flex-row justify-center items-center gap-6">
              {/* Card Front */}
              <div className="w-72 h-44 border border-slate-300 rounded-xl p-3.5 flex flex-col justify-between bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <div className="flex items-center gap-1 text-rose-700 font-black text-xs uppercase tracking-wider">
                    <HeartPulse className="w-4 h-4" />
                    <span>Emergency Medical Card</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">ResQTag</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-1 border border-slate-200 rounded-lg bg-white shrink-0">
                    <QRCodeSVG value={emergencyUrl} size={70} level="H" />
                  </div>
                  <div className="text-[10px] space-y-0.5 text-slate-700 flex-1 min-w-0">
                    <span className="text-[8px] uppercase font-bold text-slate-400 block">CARDHOLDER</span>
                    <span className="font-extrabold text-xs text-slate-900 block truncate">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <p className="text-[9px] text-slate-600 leading-tight pt-0.5">
                      First responders scan QR for allergies, medical notes & instant emergency contacts.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-1 text-[8px] text-slate-500 flex justify-between items-center">
                  <span>Keep in wallet or behind phone case</span>
                  <span className="font-mono">resqtag.com</span>
                </div>
              </div>

              {/* Card Back */}
              <div className="w-72 h-44 border border-slate-300 rounded-xl p-3.5 flex flex-col justify-between bg-slate-900 text-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                  <span className="text-[9px] font-mono tracking-widest text-rose-400 font-bold uppercase">
                    FIRST RESPONDER INSTRUCTIONS
                  </span>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                </div>

                <div className="space-y-1 text-[9px] text-slate-300">
                  <p><strong>1.</strong> Open smartphone camera and scan the front QR code.</p>
                  <p><strong>2.</strong> Access blood type, medications & severe allergies.</p>
                  <p><strong>3.</strong> Tap 1-touch dialer to immediately call designated emergency contacts.</p>
                </div>

                <div className="border-t border-slate-700 pt-1 text-[8px] text-slate-400 flex justify-between items-center">
                  <span>Official Encrypted Emergency ID</span>
                  <span className="font-mono text-slate-200">RQ-{qr.qr_token.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cutting & Assembly Instructions Footer */}
      <div className="mt-8 text-center text-[10px] text-slate-500 border-t border-slate-200 pt-3">
        ✂️ <strong>Manufacturing Guide:</strong> Cut precisely along the outer dashed borders. For keychains, fold along center line and insert into 35x50mm acrylic fob. For wallet cards, laminate with thermal pouch.
      </div>
    </div>
  );
}
