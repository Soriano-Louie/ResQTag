import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, QrCode, Lock, CheckCircle2, PhoneCall, RefreshCw, EyeOff, ShieldCheck } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 text-brand-600" />
          About ResQTag System
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          How ResQTag Protects Lives & Privacy
        </h1>
        <p className="text-slate-600 text-base max-w-2xl mx-auto leading-relaxed">
          Traditional emergency tags either expose too much personal information or become obsolete when your phone number or medication changes. ResQTag bridges this gap.
        </p>
      </div>

      {/* Static QR vs Dynamic ResQTag Comparison */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <QrCode className="w-5 h-5 text-brand-600" />
          Dynamic URL vs. Static Barcode
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-rose-50/60 border border-rose-200 space-y-3">
            <h3 className="font-bold text-rose-900 text-sm flex items-center gap-1.5">
              <EyeOff className="w-4 h-4 text-rose-600" /> Traditional Static QR
            </h3>
            <p className="text-xs text-rose-800/80 leading-relaxed">
              Contains your raw text (e.g. phone number, full address, medical history) directly encoded inside the image. Anyone with any scanner gets your private data, and if your doctor changes your medication, you must throw away and reprint the tag.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
            <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> ResQTag Dynamic Token
            </h3>
            <p className="text-xs text-emerald-800/80 leading-relaxed">
              Encodes only a secure random identifier. When scanned, our backend checks your privacy whitelist in real time and shows only your approved public emergency data. Update your records anytime without ever reprinting your tag.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Breakdown */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900">Key Safety Architecture</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-sky-600" /> Backend Whitelist Enforcement
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Private data is completely stripped on the server side before the API responds. It is physically impossible for someone inspecting the browser code to see private medical info.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-600" /> One-Touch Responder Dialing
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Emergency contacts marked as public generate prominent, mobile-optimized call buttons using direct tel: URIs for rapid communication in crisis situations.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600" /> Lost Tag Invalidation
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              If your keychain or physical tag is lost, simply regenerate a new QR code in your dashboard. The previous tag immediately stops displaying your profile.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" /> Instant Tag Deactivation
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Temporarily deactivate your tag during travel or routine activities with a single click, displaying a clean inactive state to scanners.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Box */}
      <div className="bg-gradient-to-r from-brand-600 to-rose-600 rounded-2xl p-8 text-white text-center space-y-4 shadow-lg">
        <h3 className="text-2xl font-bold">Ready to create your ResQTag?</h3>
        <p className="text-brand-100 text-sm max-w-md mx-auto">
          It takes less than 2 minutes to register, set your emergency contacts, and generate your printable QR keychain tag.
        </p>
        <div className="pt-2">
          <Link
            to="/register"
            className="inline-block bg-white text-brand-600 hover:bg-slate-100 font-bold px-6 py-3 rounded-xl shadow transition-all"
          >
            Create Your ResQTag Now
          </Link>
        </div>
      </div>
    </div>
  );
}
