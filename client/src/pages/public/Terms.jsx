import React from 'react';
import { FileText, ShieldAlert } from 'lucide-react';

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-3">
          <FileText className="w-4 h-4" /> Legal
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Terms of Use</h1>
        <p className="text-slate-500 text-sm mt-1">Last updated: September 2026</p>
      </div>

      <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By creating an account or scanning a ResQTag QR code, you agree to these Terms of Use and acknowledge the emergency notification functionality of the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">2. Emergency Medical Disclaimer</h2>
          <p>
            ResQTag is an informational facilitation platform designed to help first responders, medical personnel, and good Samaritans access voluntary medical notes and emergency contact details. ResQTag is <strong>not a medical device</strong>, emergency dispatch service, or a replacement for 911/emergency services.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">3. User Responsibility for Accuracy</h2>
          <p>
            You are solely responsible for ensuring that all medical conditions, allergies, medications, and emergency contact phone numbers saved on your profile are accurate, current, and clearly specified.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">4. Public Disclosure Warning</h2>
          <p>
            You understand that any information you deliberately mark as <strong>Public</strong> will be visible to any individual who physically or digitally scans your ResQTag QR code. Do not mark information as public if you do not want it accessible during an emergency.
          </p>
        </section>
      </div>
    </div>
  );
}
