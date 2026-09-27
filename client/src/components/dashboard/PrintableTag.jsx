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
    <div
      className="hidden print:block p-6 max-w-3xl mx-auto text-black font-sans bg-white"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
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
                className="bg-white flex flex-col items-center justify-center text-center overflow-hidden"
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
                className="bg-white text-black flex flex-col items-center justify-center text-center overflow-hidden"
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
              <div className="w-72 h-44 rounded-xl p-4 flex items-center justify-between bg-white relative overflow-hidden">
                {/* Left Column: Brand & Details */}
                <div className="flex-1 flex flex-col justify-between h-full pr-2">
                  {/* Brand Header with Inline SVG Badge */}
                  <div className="flex items-center gap-2">
                    <svg
                      width="38"
                      height="38"
                      viewBox="0 0 38 38"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="shrink-0"
                    >
                      <rect width="38" height="38" rx="10" fill="#e11d48" />
                      <g transform="translate(7, 7)">
                        <path
                          d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
                          stroke="#ffffff"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                        <path
                          d="M12 8v4"
                          stroke="#ffffff"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 16h.01"
                          stroke="#ffffff"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    </svg>
                    <div>
                      <div className="text-lg font-black tracking-tight leading-none text-slate-900">
                        <span className="text-rose-600">ResQ</span><span className="text-slate-900">Tag</span>
                      </div>
                      <span className="text-[7.5pt] font-extrabold text-slate-800 tracking-wider uppercase block mt-0.5">
                        EMERGENCY QR
                      </span>
                    </div>
                  </div>

                  {/* User Name & Instruction */}
                  <div className="mt-auto">
                    <div className="text-[12pt] font-extrabold text-slate-900 leading-tight truncate">
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div className="text-[7.5pt] font-bold text-slate-600 tracking-wider uppercase mt-1 leading-tight">
                      <div>SCAN FOR</div>
                      <div>EMERGENCY INFO</div>
                    </div>
                  </div>
                </div>

                {/* Middle Vertical Divider (SVG gradient to guarantee print display) */}
                <svg
                  width="2"
                  height="110"
                  viewBox="0 0 2 110"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0 mx-1"
                >
                  <defs>
                    <linearGradient id="cardDividerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
                      <stop offset="50%" stopColor="#e11d48" stopOpacity="1" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.15" />
                    </linearGradient>
                  </defs>
                  <line x1="1" y1="0" x2="1" y2="110" stroke="url(#cardDividerGrad)" strokeWidth="1.5" />
                </svg>

                {/* Right Column: QR Code */}
                <div className="shrink-0 flex items-center justify-center pl-1">
                  <div className="p-1 rounded-lg bg-white">
                    <QRCodeSVG value={emergencyUrl} size={96} level="H" />
                  </div>
                </div>
              </div>

              {/* Card Back */}
              <div className="w-72 h-44 rounded-xl p-4 flex flex-col justify-between bg-white text-slate-900 relative overflow-hidden border border-slate-100">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span className="text-[8pt] font-black tracking-widest text-rose-700 uppercase">
                    FIRST RESPONDER INSTRUCTIONS
                  </span>
                </div>

                <div className="space-y-2 text-[8pt] text-slate-700 leading-relaxed py-1">
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 font-bold">1.</span>
                    <span>Scan the front QR code using any smartphone camera.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 font-bold">2.</span>
                    <span>Access vital medical info, allergies & blood type instantly.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 font-bold">3.</span>
                    <span>Tap the 1-touch dialer to immediately reach emergency contacts.</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2 text-[7.5pt] text-slate-500 flex justify-between items-center font-medium">
                  <span>Official Emergency Medical ID</span>
                  <span className="text-slate-700 font-semibold">Keep Visible in Wallet</span>
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
