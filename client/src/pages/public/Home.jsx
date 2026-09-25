import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  QrCode, 
  Lock, 
  PhoneCall, 
  HeartHandshake, 
  Printer, 
  ArrowRight, 
  CheckCircle2, 
  Activity,
  AlertOctagon,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-600/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold tracking-wide">
                <ShieldAlert className="w-4 h-4 text-brand-400" />
                Next-Gen Emergency QR Tag System
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                Critical Medical Info <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-rose-400 to-amber-300">
                  When Seconds Count.
                </span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
                ResQTag connects first responders and good Samaritans to your vital medical details and emergency contacts with a single QR scan. You keep 100% control over what information stays private.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-7 py-3.5 rounded-2xl font-bold shadow-lg shadow-brand-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Go to Your Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-7 py-3.5 rounded-2xl font-bold shadow-lg shadow-brand-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Create Free ResQTag
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/about"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 px-6 py-3.5 rounded-2xl font-semibold transition-all"
                    >
                      See How It Works
                    </Link>
                  </>
                )}
              </div>

              {/* Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Granular Privacy Whitelist
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> One-Touch Emergency Dial
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Printable Keychain Tag
                </span>
              </div>
            </div>

            {/* Right Interactive Tag Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-sm">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-brand-600 to-rose-500 rounded-3xl blur-xl opacity-30 animate-pulse" />
                <div className="relative bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-white">ResQTag Emergency</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                      Active
                    </span>
                  </div>

                  {/* Sample Mockup Medical Card */}
                  <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-700 to-rose-600 flex items-center justify-center font-bold text-lg text-white">
                        JD
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">Juan Dela Cruz</h4>
                        <p className="text-xs text-slate-400">Taguig City, Philippines</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Type</span>
                        <span className="text-rose-400 font-extrabold text-sm">O+ (Positive)</span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Allergies</span>
                        <span className="text-amber-400 font-semibold text-xs">Penicillin, Peanuts</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md">
                        <PhoneCall className="w-3.5 h-3.5" />
                        CALL GUARDIAN (0917-123-4567)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>🔒 Privacy Filter Enforced</span>
                    <span className="font-mono text-[10px]">resqtag.com/emergency/8f92...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Process */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            How ResQTag Works
          </h2>
          <p className="text-slate-600 text-sm">
            Simple 3-step setup to protect yourself and your loved ones in unexpected emergencies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 relative shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xl">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Create & Set Privacy</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Add your medical details (blood type, allergies, medications) and emergency contacts. Choose exactly which items are public or private.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 relative shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Print or Attach QR Tag</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Download your unique QR code or use our print-ready template to attach a physical tag to your keychain, backpack, or wallet card.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 relative shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xl">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Instant Rescue Access</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              In an emergency, any smartphone scans the tag to view vital medical info and tap one button to dial your designated emergency contacts immediately.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Guarantee Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-12 text-white border border-slate-700 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 text-xs font-semibold">
                <Lock className="w-4 h-4" /> Server-Enforced Privacy
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Your Privacy is Non-Negotiable
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Unlike simple QR codes that bake your personal contact data permanently inside the barcode, ResQTag uses dynamic secure tokens. Private information is filtered at the database level and never transmitted to untrusted browsers.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Deactivate your tag anytime with one tap
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Regenerate QR tokens if physical tag is lost
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Zero login or app download required for responders
                </li>
              </ul>
            </div>

            <div className="bg-slate-950/60 rounded-2xl p-6 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Sample Whitelist Flow</h4>
              <div className="space-y-2 font-mono text-xs text-slate-300">
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span>Full Name:</span>
                  <span className="text-emerald-400 font-bold">PUBLIC ✓</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span>Phone Number:</span>
                  <span className="text-rose-400 font-bold">PRIVATE ✗</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span>Blood Type:</span>
                  <span className="text-emerald-400 font-bold">PUBLIC ✓</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span>Medical Notes:</span>
                  <span className="text-rose-400 font-bold">PRIVATE ✗</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
