import React from 'react';
import { AlertTriangle, Lock, ShieldCheck } from 'lucide-react';

export default function PrivacyWarningBanner() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 text-amber-950 flex flex-col sm:flex-row items-start gap-3.5 shadow-sm">
      <div className="p-2 bg-amber-500/20 text-amber-700 rounded-xl shrink-0 mt-0.5">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="space-y-1 text-xs sm:text-sm">
        <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
          Privacy & Public Visibility Notice
        </h4>
        <p className="text-amber-800/90 leading-relaxed">
          Information marked as <strong className="text-amber-900 underline decoration-amber-500">Public</strong> will be immediately viewable by anyone who scans your physical ResQTag QR code without needing an account. Only make information public that you are comfortable sharing during an emergency.
        </p>
        <div className="flex items-center gap-4 text-xs font-semibold text-amber-900/80 pt-1">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-amber-700" /> Private fields remain completely hidden on the server
          </span>
        </div>
      </div>
    </div>
  );
}
