import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function DataLeakPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <header className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold mb-3">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Privacy &amp; Trust
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Zero Public Data Leak Policy</h1>
        <p className="text-slate-500 text-sm mt-2">Last updated: October 3, 2026</p>
      </header>

      <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">Our commitment</h2>
          <p>ResQTag is designed to keep information marked private out of public emergency profiles. “Zero Public Data Leak” describes this privacy goal; it is not a guarantee that any online service is free from every security risk.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">What a QR scan reveals</h2>
          <p>Your QR code contains a link to an emergency page. The page shows information allowed by the profile's visibility settings. Anyone with the QR code or its link can view that public information without signing in, so review your settings before sharing a tag.</p>
          <p>Private fields are removed by the server before the emergency profile is sent to the viewer. Emergency contacts appear only when contact sharing is enabled and the individual contact is marked public.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">Choose what you share</h2>
          <p>Use Privacy Controls to review which personal and medical details appear on your emergency page. Share only what you want someone scanning your tag to see, and keep emergency information and contact details up to date.</p>
          <p>Each family member has separate visibility settings in Family Members. Review these settings with the person whose information you manage, where appropriate.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">If a tag is lost or information should no longer be public</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Change a field's visibility to stop showing it on future emergency-page requests.</li>
            <li>Deactivate your own QR tag to stop public access, or regenerate its code to invalidate the old link. A regenerated code requires updated tags.</li>
            <li>Archive a family member to make their family QR tag inactive.</li>
          </ul>
          <p>These changes cannot remove screenshots, printed copies, or information that someone has already saved.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">Family QR codes and orders</h2>
          <p>Family members' QR codes are supplied on physical ResQTags and are not displayed in your account. Include family members when placing a physical tag order. Digital QR orders include only the account owner's code.</p>
          <p>Keeping a code out of the account page does not make the information on its emergency page private. Anyone who scans the physical tag can still see the fields you have chosen to share.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">Related information</h2>
          <p>Read our <Link to="/privacy-policy" className="font-semibold text-brand-700 underline hover:text-brand-600">Privacy Policy</Link> for more information about account data and privacy controls, and our <Link to="/terms" className="font-semibold text-brand-700 underline hover:text-brand-600">Terms of Service</Link> for use of ResQTag.</p>
        </section>
      </div>
    </div>
  );
}
