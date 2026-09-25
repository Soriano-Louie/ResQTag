import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldAlert, PhoneCall, HeartPulse } from 'lucide-react';

export default function PrintableTag({ qr, user }) {
  if (!qr) return null;
  const origin = window.location.origin;
  const emergencyUrl = `${origin}/emergency/${qr.qr_token}`;

  return (
    <div className="hidden print:block p-4 max-w-2xl mx-auto text-black">
      <div className="text-center mb-6 border-b pb-4">
        <h1 className="text-xl font-black uppercase tracking-wider text-rose-700">ResQTag Emergency Printout</h1>
        <p className="text-xs text-gray-500">Cut along dotted lines to create your physical keychain tag and wallet card</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Keychain Tag (Front & Back) */}
        <div className="border-2 border-dashed border-gray-700 rounded-xl p-4 flex flex-col items-center justify-between text-center bg-white h-72">
          <div className="w-4 h-4 rounded-full border border-gray-400 -mt-2 bg-gray-100 flex items-center justify-center text-[8px] text-gray-400">
            ○
          </div>
          <div className="flex items-center gap-1.5 text-rose-700 font-extrabold text-sm uppercase">
            <ShieldAlert className="w-4 h-4" />
            <span>ResQTag</span>
          </div>

          <div className="p-2 border rounded-lg bg-white">
            <QRCodeSVG value={emergencyUrl} size={110} level="H" />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Scan for Medical Info</p>
          </div>
        </div>

        {/* Emergency Wallet Card */}
        <div className="border-2 border-dashed border-gray-700 rounded-xl p-4 flex flex-col justify-between bg-white h-72">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <span className="font-extrabold text-xs text-rose-700 uppercase">Emergency Info Card</span>
              <p className="text-[9px] text-gray-500">Keep in wallet / phone case</p>
            </div>
            <HeartPulse className="w-4 h-4 text-rose-600" />
          </div>

          <div className="flex items-center gap-3 my-2">
            <div className="p-1 border rounded bg-white shrink-0">
              <QRCodeSVG value={emergencyUrl} size={80} level="H" />
            </div>
            <div className="text-[10px] space-y-1">
              <p><strong className="text-gray-700">Name:</strong> {user?.firstName} {user?.lastName}</p>
              <p><strong className="text-gray-700">Notice:</strong> First responders scan QR for allergies, blood type & contacts.</p>
            </div>
          </div>

          <div className="border-t pt-2 text-[9px] text-gray-500">
            <span>resqtag.com</span>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-500 border-t pt-4">
        Printed from ResQTag — Emergency Medical & Contact Information System
      </div>
    </div>
  );
}
