import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Heart, Lock, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-sm mt-auto no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-white">
                ResQ<span className="text-brand-500">Tag</span>
              </span>
            </div>
            <p className="text-slate-400 max-w-sm text-xs leading-relaxed">
              QR-Based Emergency Medical & Contact Information System. Providing instant, privacy-controlled access to critical information when seconds count.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-sky-400" /> Privacy First</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> SSL Encrypted</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Create Free Tag</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Account Login</Link></li>
            </ul>
          </div>

          {/* Legal & Privacy */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">Privacy & Trust</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><span className="text-slate-500">Zero Public Data Leak Policy</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} ResQTag. All rights reserved.
          </div>
          <div className="flex items-center gap-1">
            Built with care for public emergency safety.
          </div>
        </div>
      </div>
    </footer>
  );
}
