import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldAlert } from 'lucide-react';

export default function PrintableTag({ qr, user, tagType = 'bundle', quantity = 1, orderId, items }) {
  const origin = window.location.origin;

  // Normalize single item or multiple items array
  let allTags = [];
  if (items && Array.isArray(items) && items.length > 0) {
    items.forEach((item) => {
      const qty = Math.max(1, parseInt(item.quantity || 1, 10));
      for (let i = 0; i < qty; i++) {
        allTags.push({
          qr: item.qr,
          user: item.user,
          tagType: item.tagType || 'bundle',
          orderId: item.orderId,
          index: i + 1,
          totalQty: qty,
        });
      }
    });
  } else if (qr) {
    const qty = Math.max(1, parseInt(quantity || 1, 10));
    for (let i = 0; i < qty; i++) {
      allTags.push({
        qr,
        user,
        tagType: tagType || 'bundle',
        orderId,
        index: i + 1,
        totalQty: qty,
      });
    }
  }

  if (allTags.length === 0) return null;

  const keychainItems = allTags.filter((t) => t.tagType === 'keychain' || t.tagType === 'bundle');
  const walletCardItems = allTags.filter((t) => t.tagType === 'wallet_card' || t.tagType === 'bundle');

  const isBatch = allTags.length > 1;

  return (
    <div
      className="hidden print:block p-4 max-w-4xl mx-auto text-black font-sans bg-white"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      {/* Header Info for Manufacturer / Admin (Compact to save page space) */}
      <div className="text-center mb-4 border-b-2 border-slate-300 pb-2.5">
        <div className="flex items-center justify-center gap-2 text-rose-700 font-black text-lg tracking-wider uppercase">
          <ShieldAlert className="w-5 h-5" />
          <span>ResQTag {isBatch ? 'Batch Physical Manufacturing Sheet' : 'Physical Manufacturing Template'}</span>
        </div>
        <p className="text-[10.5px] text-slate-600 mt-0.5 font-medium">
          {isBatch ? (
            <>
              Total Output: <strong>{allTags.length} Units</strong> • Keychains: <strong>{keychainItems.length}</strong> • Cards: <strong>{walletCardItems.length}</strong> • Optimized Paper Layout
            </>
          ) : (
            <>
              Target: <strong>{user?.firstName} {user?.lastName}</strong> • Format: <strong>{tagType === 'bundle' ? 'Complete Kit (Keychain + Card)' : tagType === 'keychain' ? 'Acrylic Keychain Tag' : 'Emergency Wallet Card'}</strong> • Token: <span className="font-mono font-bold">RQ-{qr.qr_token.slice(0, 8).toUpperCase()}</span>
            </>
          )}
        </p>
      </div>

      <div className="space-y-6">
        {/* ========================================================
            1. KEYCHAIN TAGS (3.0 × 3.0 cm Fold & Insert Grid)
            ======================================================== */}
        {keychainItems.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1">
              <span>🔑 Acrylic Keychain Tags ({keychainItems.length} {keychainItems.length === 1 ? 'Unit' : 'Units'}) — 3.0 × 3.0 cm</span>
              <span className="text-[10px] text-slate-400 font-normal">Cut along dashed line • Fold along center dotted line</span>
            </div>

            {/* Continuous Grid layout for maximum paper efficiency */}
            <div className="flex flex-wrap gap-3.5 items-center justify-start">
              {keychainItems.map((item, idx) => {
                const emergencyUrl = `${origin}/emergency/${item.qr?.qr_token}`;
                return (
                  <div
                    key={`kc-${item.qr?.qr_token || idx}-${idx}`}
                    className="border-2 border-dashed border-slate-700 bg-white flex justify-around items-center"
                    style={{
                      width: 'fit-content',
                      padding: '4px',
                      gap: '4px',
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid',
                      WebkitColumnBreakInside: 'avoid',
                    }}
                  >
                    {/* ── Keychain FRONT ── 3.0 × 3.0 cm ── */}
                    <div
                      className="bg-white flex flex-col items-center justify-center text-center overflow-hidden"
                      style={{ width: '3.0cm', height: '3.0cm', padding: '1.5mm', boxSizing: 'border-box', gap: '1.5mm' }}
                    >
                      {/* Brand */}
                      <div
                        className="flex items-center gap-0.5 font-black uppercase tracking-wider shrink-0"
                        style={{ fontSize: '5.5pt' }}
                      >
                        <ShieldAlert className="text-rose-700" style={{ width: '6.5pt', height: '6.5pt' }} />
                        <span className="text-rose-700">ResQ</span><span className="text-black">Tag</span>
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
                          className="font-black text-black leading-tight block truncate max-w-[2.8cm]"
                          style={{ fontSize: '7pt' }}
                        >
                          {item.user?.firstName} {item.user?.lastName}
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
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            2. WALLET CARDS (Standard CR80 Card Format)
            ======================================================== */}
        {walletCardItems.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1">
              <span>💳 Emergency Wallet Cards ({walletCardItems.length} {walletCardItems.length === 1 ? 'Unit' : 'Units'}) — Standard CR80 Size</span>
              <span className="text-[10px] text-slate-400 font-normal">Cut along dashed line</span>
            </div>

            {/* Multi-item grid layout */}
            <div className="flex flex-wrap gap-4 items-center justify-start">
              {walletCardItems.map((item, idx) => {
                const emergencyUrl = `${origin}/emergency/${item.qr?.qr_token}`;
                return (
                  <div
                    key={`wc-${item.qr?.qr_token || idx}-${idx}`}
                    className="border-2 border-dashed border-slate-700 p-3 bg-white flex flex-col sm:flex-row justify-center items-center gap-4"
                    style={{
                      width: 'fit-content',
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid',
                      WebkitColumnBreakInside: 'avoid',
                    }}
                  >
                    {/* Card Front */}
                    <div className="w-72 h-44 rounded-xl flex flex-col bg-white relative overflow-hidden border border-slate-100">
                      {/* Red Thick Top Bar */}
                      <div className="bg-rose-600 px-3 py-2 flex items-center gap-2 text-white shrink-0">
                        <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center shrink-0 shadow-xs">
                          <ShieldAlert className="w-4 h-4 text-rose-600 stroke-[2.5]" />
                        </div>
                        <div>
                          <div className="text-sm font-black tracking-tight leading-none">
                            <span className="text-white">ResQ</span>
                            <span className="text-slate-950">Tag</span>
                          </div>
                          <span className="text-[6.5pt] font-extrabold text-rose-100 tracking-wider uppercase block mt-0.5">
                            EMERGENCY QR
                          </span>
                        </div>
                      </div>

                      {/* Fading Red Cross Decoration at Bottom-Left */}
                      <div className="absolute bottom-0 left-0 pointer-events-none" style={{ opacity: 0.14 }}>
                        <svg width="74" height="74" viewBox="0 0 74 74" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id={`crossFadeFront-${idx}`} x1="0" y1="1" x2="1" y2="0">
                              <stop offset="0%" stopColor="#e11d48" stopOpacity="1" />
                              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.25" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M27 4h20v20h20v20H47v20H27V44H7V24h20V4z"
                            fill={`url(#crossFadeFront-${idx})`}
                          />
                        </svg>
                      </div>

                      {/* Card Body */}
                      <div className="flex-1 flex items-center justify-between px-3.5 py-1.5 relative z-10">
                        {/* Left: Card Holder Name & Scan Instructions */}
                        <div className="flex-1 flex flex-col justify-center pr-2">
                          <div className="text-[12pt] font-black text-slate-900 leading-tight truncate">
                            {item.user?.firstName} {item.user?.lastName}
                          </div>
                          <div className="text-[7.5pt] font-extrabold text-rose-700 tracking-wider uppercase mt-1 leading-tight">
                            SCAN FOR
                          </div>
                          <div className="text-[7.5pt] font-extrabold text-slate-600 tracking-wider uppercase leading-tight">
                            EMERGENCY INFO
                          </div>
                        </div>

                        {/* Middle Vertical Divider */}
                        <svg
                          width="2"
                          height="75"
                          viewBox="0 0 2 75"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="shrink-0 mx-1.5"
                        >
                          <defs>
                            <linearGradient id={`cardDividerGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
                              <stop offset="50%" stopColor="#e11d48" stopOpacity="0.9" />
                              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.15" />
                            </linearGradient>
                          </defs>
                          <line x1="1" y1="0" x2="1" y2="75" stroke={`url(#cardDividerGrad-${idx})`} strokeWidth="1.5" />
                        </svg>

                        {/* Right: QR Code */}
                        <div className="shrink-0 flex items-center justify-center p-1 bg-white rounded-lg border border-slate-100 shadow-xs">
                          <QRCodeSVG value={emergencyUrl} size={82} level="H" />
                        </div>
                      </div>
                    </div>

                    {/* Card Back */}
                    <div className="w-72 h-44 rounded-xl flex flex-col justify-between bg-white text-slate-900 relative overflow-hidden border border-slate-100">
                      {/* Red Thick Top Bar */}
                      <div className="bg-rose-600 px-3 py-2 flex items-center gap-2 text-white shrink-0">
                        <ShieldAlert className="w-4 h-4 text-white shrink-0" />
                        <span className="text-[7.5pt] font-black tracking-widest uppercase">
                          FIRST RESPONDER INSTRUCTIONS
                        </span>
                      </div>

                      {/* Back Body Instructions */}
                      <div className="flex-1 px-3.5 py-2 flex flex-col justify-between">
                        <div className="space-y-1.5 text-[7.5pt] text-slate-700 leading-snug">
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

                        <div className="border-t border-slate-200 pt-1.5 text-[7pt] text-slate-500 flex justify-between items-center font-medium">
                          <span>Official Emergency Medical ID</span>
                          <span className="text-slate-700 font-semibold">Keep Visible in Wallet</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Cutting & Assembly Instructions Footer */}
      <div className="mt-6 text-center text-[10px] text-slate-500 border-t border-slate-200 pt-2.5">
        ✂️ <strong>Manufacturing Guide:</strong> Cut precisely along the outer sharp dashed borders. For keychains, fold along center dotted line and insert into 35x50mm acrylic fob. For wallet cards, laminate with thermal pouch.
      </div>
    </div>
  );
}
