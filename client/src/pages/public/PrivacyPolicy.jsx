import React from 'react';
import { ShieldCheck, Lock, Eye, Database, Key } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold mb-3">
          <ShieldCheck className="w-4 h-4" /> Privacy First Architecture
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mt-1">Last updated: September 2026</p>
      </div>

      <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">1. Core Privacy Philosophy</h2>
          <p>
            ResQTag is engineered specifically to prevent involuntary exposure of personal records. Traditional QR codes store raw text directly within the barcode image, meaning anyone with a camera can extract your private data. In contrast, ResQTag utilizes dynamic, cryptographically secure tokens.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">2. Server-Side Whitelist Enforcement</h2>
          <p>
            When a user or first responder scans your ResQTag QR code, our Express backend queries your privacy configuration table. Only fields explicitly toggled as <strong>Public</strong> are returned in the API payload. Private data is excluded at the database level and is never transmitted over the wire to unauthenticated browsers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">3. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Account Information:</strong> First Name, Middle Name, Last Name, Email address, and salted bcrypt password hashes.</li>
            <li><strong>Emergency Information:</strong> Blood type, allergies, medical conditions, medications, critical medical instructions, and emergency notes.</li>
            <li><strong>Emergency Contacts:</strong> Names, relationships, phone numbers, and optional email addresses for your designated emergency contacts.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">4. User Rights & Control</h2>
          <p>
            You have full control over your data at all times:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Field-by-field Visibility:</strong> Toggle any personal or medical item between Public and Private.</li>
            <li><strong>Instant Deactivation:</strong> Disable public viewing without deleting your account.</li>
            <li><strong>Token Regeneration:</strong> Permanently invalidate old QR codes with a single click if your physical tag is lost or stolen.</li>
            <li><strong>Account Deletion:</strong> Permanently delete your account and all associated emergency records.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">5. Security Standards</h2>
          <p>
            All network communication is secured over HTTPS/TLS. Authentication cookies are configured with <code>HttpOnly</code>, <code>Secure</code>, and modern SameSite protection to prevent XSS and token interception.
          </p>
        </section>
      </div>
    </div>
  );
}
