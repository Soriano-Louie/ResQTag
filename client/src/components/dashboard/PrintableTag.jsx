import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldAlert, Scissors } from 'lucide-react';

/**
 * Parses and resolves tag dimensions into exact physical centimeters (cm)
 */
export function resolveDimensions(tagType, selectedSize, customDimensions) {
  // If custom dimension specified, parse any format (e.g., "4cm x 6cm", "35mm x 50mm", "4x6", "4.5cm by 5.5cm")
  if (selectedSize === 'custom' && customDimensions) {
    const raw = String(customDimensions).toLowerCase();
    const isMm = raw.includes('mm');
    const matches = raw.match(/(\d+(?:\.\d+)?)/g);

    if (matches && matches.length >= 2) {
      let w = parseFloat(matches[0]);
      let h = parseFloat(matches[1]);

      // Convert mm to cm if specified or if large integers without decimal
      if (isMm || (w > 20 && h > 20 && !raw.includes('cm'))) {
        w = w / 10;
        h = h / 10;
      }

      w = Math.max(1.5, Math.min(20, w));
      h = Math.max(1.5, Math.min(25, h));

      return {
        widthCm: w,
        heightCm: h,
        label: `Custom (${w % 1 === 0 ? w : w.toFixed(1)} × ${h % 1 === 0 ? h : h.toFixed(1)} cm)`,
        isCustom: true,
      };
    } else if (matches && matches.length === 1) {
      let s = parseFloat(matches[0]);
      if (isMm || (s > 20 && !raw.includes('cm'))) {
        s = s / 10;
      }
      s = Math.max(1.5, Math.min(20, s));
      return {
        widthCm: s,
        heightCm: s,
        label: `Custom (${s % 1 === 0 ? s : s.toFixed(1)} × ${s % 1 === 0 ? s : s.toFixed(1)} cm)`,
        isCustom: true,
      };
    }
  }

  // Standard Keychain Presets
  if (tagType === 'keychain') {
    switch (selectedSize) {
      case 'standard_keychain_30x50':
        return { widthCm: 3.0, heightCm: 5.0, label: 'Rectangle (3.0 × 5.0 cm)', isCustom: false };
      case 'mini_compact_25x40':
        return { widthCm: 2.5, heightCm: 4.0, label: 'Mini Compact (2.5 × 4.0 cm)', isCustom: false };
      case 'square_fob_30x30':
      case 'square_fob_35x35':
      // Physical combo packages always use the fixed 3.0 × 3.0 cm square keychain.
      case 'physical_combo':
      case 'physical_family_3':
      case 'physical_family_5':
      case 'physical_family_10':
      case 'standard':
      default:
        return { widthCm: 3.0, heightCm: 3.0, label: 'Square Fob (3.0 × 3.0 cm)', isCustom: false };
    }
  }

  // Standard Card Presets
  if (tagType === 'wallet_card') {
    switch (selectedSize) {
      case 'compact_card_70x45':
        return { widthCm: 7.0, heightCm: 4.5, label: 'Compact Card (7.0 × 4.5 cm)', isCustom: false };
      case 'standard_cr80_card':
      // Physical combo packages always use the fixed CR80 wallet card.
      case 'physical_combo':
      case 'physical_family_3':
      case 'physical_family_5':
      case 'physical_family_10':
      case 'standard':
      default:
        return { widthCm: 8.56, heightCm: 5.40, label: 'Standard CR80 Card (8.56 × 5.40 cm)', isCustom: false };
    }
  }

  // Default fallback for Bundle components
  return { widthCm: 3.0, heightCm: 3.0, label: 'Standard', isCustom: false };
}

export default function PrintableTag({ qr, user, tagType = 'bundle', quantity = 1, selectedSize, customDimensions, orderId, items }) {
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
          selectedSize: item.selectedSize || item.order?.selected_size,
          customDimensions: item.customDimensions || item.order?.custom_dimensions,
          orderId: item.orderId || item.order?.order_id,
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
        selectedSize,
        customDimensions,
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
      {/* Header Info for Manufacturer / Admin */}
      <div className="text-center mb-3 border-b-2 border-slate-300 pb-2">
        <div className="flex items-center justify-center gap-2 text-rose-700 font-black text-lg tracking-wider uppercase">
          <ShieldAlert className="w-5 h-5" />
          <span>ResQTag {isBatch ? 'Batch Physical Manufacturing Sheet' : 'Physical Manufacturing Template'}</span>
        </div>
        <p className="text-[10.5px] text-slate-600 mt-0.5 font-medium">
          {isBatch ? (
            <>
              Total Output: <strong>{allTags.length} Units</strong> • Keychains: <strong>{keychainItems.length}</strong> • Cards: <strong>{walletCardItems.length}</strong> • Calibrated 1:1 Scale
            </>
          ) : (
            <>
              Target: <strong>{allTags[0]?.user?.firstName || user?.firstName} {allTags[0]?.user?.lastName || user?.lastName}</strong> • Format: <strong>{(allTags[0]?.tagType || tagType) === 'bundle' ? 'Complete Kit (Keychain + Card)' : (allTags[0]?.tagType || tagType) === 'keychain' ? 'Acrylic Keychain Tag' : 'Emergency Wallet Card'}</strong> • Token: <span className="font-mono font-bold">RQ-{(allTags[0]?.qr?.qr_token || qr?.qr_token || '').slice(0, 8).toUpperCase()}</span>
            </>
          )}
        </p>
      </div>

      {/* 📏 1:1 Physical Scale Calibration Bar */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 mb-4 text-[9px] text-slate-700">
        <div className="flex items-center gap-1.5">
          <span className="font-bold uppercase tracking-wider text-rose-700">📏 1:1 Physical Scale Check:</span>
          <span className="text-slate-500">Print dialog must be set to <strong>Scale: 100% (Actual Size)</strong>. Measure this 5 cm reference bar:</span>
        </div>
        <div className="flex items-center gap-1 font-mono font-bold text-[8.5px]">
          <span>0cm</span>
          <div
            style={{
              width: '5.0cm',
              height: '7px',
              border: '1.5px solid #0f172a',
              background: 'repeating-linear-gradient(90deg, #0f172a 0, #0f172a 1cm, #ffffff 1cm, #ffffff 2cm)',
              boxSizing: 'border-box',
            }}
          />
          <span>5.0cm</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* ========================================================
            1. KEYCHAIN TAGS (Calibrated Dimensions Fold & Insert Grid)
            ======================================================== */}
        {keychainItems.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1">
              <span>🔑 Acrylic Keychain Tags ({keychainItems.length} {keychainItems.length === 1 ? 'Unit' : 'Units'})</span>
              <span className="text-[10px] text-slate-400 font-normal">Cut along outer dashed box • Fold along center dotted line</span>
            </div>

            {/* Continuous Grid layout for maximum paper efficiency */}
            <div className="flex flex-wrap gap-4 items-center justify-start">
              {keychainItems.map((item, idx) => {
                const emergencyUrl = `${origin}/emergency/${item.qr?.qr_token}`;
                const dims = resolveDimensions('keychain', item.selectedSize, item.customDimensions);
                const w = dims.widthCm;
                const h = dims.heightCm;

                // Dynamic sizing calculations to ensure fit without clipping
                const qrPixelSize = Math.min(Math.floor(w * 17), Math.floor(h * 15), 58);
                const isMini = w <= 2.6 || h <= 3.6;

                return (
                  <div key={`kc-${item.qr?.qr_token || idx}-${idx}`} className="flex flex-col gap-1">
                    {/* Dimension Tag Label */}
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-0.5">
                      <span className="font-bold text-slate-800">#{item.orderId || idx + 1} {dims.label}</span>
                      <span>Cut {w}×{h} cm</span>
                    </div>

                    <div
                      className="border-2 border-dashed border-slate-700 bg-white flex justify-around items-center"
                      style={{
                        width: 'fit-content',
                        padding: '2px',
                        gap: '3px',
                        breakInside: 'avoid',
                        pageBreakInside: 'avoid',
                        WebkitColumnBreakInside: 'avoid',
                      }}
                    >
                      {/* ── Keychain FRONT ── exact W × H cm ── */}
                      <div
                        className="bg-white flex flex-col items-center justify-between text-center overflow-hidden"
                        style={{
                          width: `${w}cm`,
                          height: `${h}cm`,
                          padding: isMini ? '1mm' : '1.5mm',
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* Brand */}
                        <div
                          className="flex items-center justify-center gap-0.5 font-black uppercase tracking-wider shrink-0 w-full"
                          style={{ fontSize: isMini ? '4.8pt' : '5.5pt' }}
                        >
                          <ShieldAlert className="text-rose-700" style={{ width: isMini ? '5.5pt' : '6.5pt', height: isMini ? '5.5pt' : '6.5pt' }} />
                          <span className="tracking-tight leading-none"><span className="text-rose-700">ResQ</span><span className="text-black">Tag</span></span>
                        </div>

                        {/* QR Code */}
                        <div className="border border-slate-200 rounded bg-white shrink-0 p-0.5 flex items-center justify-center">
                          <QRCodeSVG value={emergencyUrl} size={qrPixelSize} level="H" />
                        </div>

                        {/* Footer */}
                        <span
                          className="font-black text-rose-700 tracking-wide uppercase shrink-0 leading-none"
                          style={{ fontSize: isMini ? '4.5pt' : '5.5pt' }}
                        >
                          Scan in Emergency
                        </span>
                      </div>

                      {/* Fold Divider */}
                      <div style={{ height: `${h}cm`, borderLeft: '2px dotted #94a3b8', margin: '0 1px', flexShrink: 0 }} />

                      {/* ── Keychain BACK ── exact W × H cm ── */}
                      <div
                        className="bg-white text-black flex flex-col items-center justify-between text-center overflow-hidden"
                        style={{
                          width: `${w}cm`,
                          height: `${h}cm`,
                          padding: isMini ? '1mm' : '1.5mm',
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* Name block */}
                        <div className="shrink-0 w-full">
                          <span
                            className="uppercase tracking-widest text-rose-700 font-black block leading-none"
                            style={{ fontSize: isMini ? '4.5pt' : '5.2pt' }}
                          >
                            EMERGENCY ID
                          </span>
                          <span
                            className="font-black text-black leading-tight block truncate w-full mt-0.5"
                            style={{ fontSize: isMini ? '6pt' : '7pt' }}
                          >
                            {item.user?.firstName} {item.user?.lastName}
                          </span>
                        </div>

                        {/* Feature bullets */}
                        <div
                          className="rounded bg-slate-50 border border-slate-200 text-black text-left w-full shrink-0 font-medium"
                          style={{ fontSize: isMini ? '4.5pt' : '5.2pt', padding: isMini ? '0.8mm' : '1.2mm', lineHeight: '1.3' }}
                        >
                          <p>• Scan QR for medical info</p>
                          <p>• 1-Touch emergency contacts</p>
                          <p>• Cloud verified</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            2. WALLET CARDS (Calibrated Card Format & Custom Scales)
            ======================================================== */}
        {walletCardItems.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1">
              <span>💳 Emergency Wallet Cards ({walletCardItems.length} {walletCardItems.length === 1 ? 'Unit' : 'Units'})</span>
              <span className="text-[10px] text-slate-400 font-normal">Cut along dashed line • Laminate with thermal film</span>
            </div>

            {/* Multi-item grid layout */}
            <div className="flex flex-wrap gap-5 items-center justify-start">
              {walletCardItems.map((item, idx) => {
                const emergencyUrl = `${origin}/emergency/${item.qr?.qr_token}`;
                const dims = resolveDimensions('wallet_card', item.selectedSize, item.customDimensions);
                const w = dims.widthCm;
                const h = dims.heightCm;

                // Dynamic card QR code pixel sizing
                const qrSize = Math.min(Math.floor(h * 15), 76);

                return (
                  <div key={`wc-${item.qr?.qr_token || idx}-${idx}`} className="flex flex-col gap-1">
                    {/* Dimension Tag Label */}
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-0.5">
                      <span className="font-bold text-slate-800">#{item.orderId || idx + 1} {dims.label}</span>
                      <span>Cut {w}×{h} cm</span>
                    </div>

                    <div
                      className="border-2 border-dashed border-slate-700 p-2 bg-white flex flex-col sm:flex-row justify-center items-center gap-3"
                      style={{
                        width: 'fit-content',
                        breakInside: 'avoid',
                        pageBreakInside: 'avoid',
                        WebkitColumnBreakInside: 'avoid',
                      }}
                    >
                      {/* Card Front (Exact W × H cm) */}
                      <div
                        className="flex flex-col bg-white relative overflow-hidden border border-slate-200"
                        style={{
                          width: `${w}cm`,
                          height: `${h}cm`,
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* Red Top Bar */}
                        <div className="bg-rose-600 px-2.5 py-1.5 flex items-center gap-1.5 text-white shrink-0">
                          <div className="w-5 h-5 rounded bg-white flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                          </div>
                          <div>
                            <div className="text-xs font-black tracking-tight leading-none">
                              <span className="text-white">ResQ</span>
                              <span className="text-slate-950">Tag</span>
                            </div>
                            <span className="text-[6pt] font-extrabold text-rose-100 tracking-wider uppercase block">
                              EMERGENCY QR
                            </span>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="flex-1 flex items-center justify-between px-2.5 py-1 relative z-10">
                          {/* Left: Card Holder Name & Scan Instructions */}
                          <div className="flex-1 flex flex-col justify-center pr-1.5 min-w-0">
                            <div className="text-[10.5pt] font-black text-slate-900 leading-tight truncate">
                              {item.user?.firstName} {item.user?.lastName}
                            </div>
                            <div className="text-[7pt] font-extrabold text-rose-700 tracking-wider uppercase mt-1 leading-tight">
                              SCAN FOR
                            </div>
                            <div className="text-[7pt] font-extrabold text-slate-600 tracking-wider uppercase leading-tight">
                              EMERGENCY INFO
                            </div>
                          </div>

                          {/* Middle Vertical Divider */}
                          <div className="w-[1.5px] bg-gradient-to-b from-rose-200 via-rose-600 to-rose-200 h-4/5 shrink-0 mx-1" />

                          {/* Right: QR Code */}
                          <div className="shrink-0 flex items-center justify-center p-0.5 bg-white rounded border border-slate-200">
                            <QRCodeSVG value={emergencyUrl} size={qrSize} level="H" />
                          </div>
                        </div>
                      </div>

                      {/* Card Back (Exact W × H cm) */}
                      <div
                        className="flex flex-col justify-between bg-white text-slate-900 relative overflow-hidden border border-slate-200"
                        style={{
                          width: `${w}cm`,
                          height: `${h}cm`,
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* Red Top Bar */}
                        <div className="bg-rose-600 px-2.5 py-1.5 flex items-center gap-1.5 text-white shrink-0">
                          <ShieldAlert className="w-3.5 h-3.5 text-white shrink-0" />
                          <span className="text-[7pt] font-black tracking-widest uppercase">
                            FIRST RESPONDER INSTRUCTIONS
                          </span>
                        </div>

                        {/* Back Body Instructions */}
                        <div className="flex-1 px-2.5 py-1.5 flex flex-col justify-between">
                          <div className="space-y-1 text-[6.8pt] text-slate-700 leading-snug">
                            <div className="flex items-start gap-1">
                              <span className="text-rose-600 font-bold">1.</span>
                              <span>Scan front QR code with any phone camera.</span>
                            </div>
                            <div className="flex items-start gap-1">
                              <span className="text-rose-600 font-bold">2.</span>
                              <span>Access vital medical history, allergies & blood type.</span>
                            </div>
                            <div className="flex items-start gap-1">
                              <span className="text-rose-600 font-bold">3.</span>
                              <span>Tap 1-touch dialer to reach emergency contacts.</span>
                            </div>
                          </div>

                          <div className="border-t border-slate-200 pt-1 text-[6.5pt] text-slate-500 flex justify-between items-center font-medium">
                            <span>Official Emergency Medical ID</span>
                            <span className="text-slate-700 font-semibold">Keep Visible in Wallet</span>
                          </div>
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
      <div className="mt-5 text-center text-[9.5px] text-slate-500 border-t border-slate-200 pt-2 flex items-center justify-center gap-1.5">
        <Scissors className="w-3.5 h-3.5 text-slate-400" />
        <span>
          <strong>Manufacturing Guide:</strong> Cut precisely along outer dashed lines. For keychains, fold along center dotted line and insert into acrylic blank. For wallet cards, laminate with thermal pouch.
        </span>
      </div>
    </div>
  );
}

