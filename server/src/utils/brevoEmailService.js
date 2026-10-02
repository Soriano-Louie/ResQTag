import { BrevoClient } from '@getbrevo/brevo';
import QRCode from 'qrcode';
import { config } from '../config/env.js';
import { uploadImageBuffer } from './cloudinaryStorage.js';
import { createDigitalTagKit } from './digitalTagKit.js';
import { requirePublicSiteUrl } from './publicSiteUrl.js';

/**
 * Resolves the public frontend origin used for QR / profile links in emails.
 *
 * Refuse to send QR codes pointing to a development or private-network address.
 */
function getPublicOrigin() {
  return requirePublicSiteUrl(config.publicSiteUrl);
}

/**
 * Initializes Brevo Transactional Email API client
 */
function getBrevoClient() {
  const apiKey = config.brevo.apiKey;
  if (!apiKey || apiKey === 'xkeysib-your_brevo_api_key_here') {
    return null;
  }
  return new BrevoClient({ apiKey });
}

/**
 * Neutralises client-side "data detectors" (Gmail / iOS / Outlook) that silently
 * turn user-supplied text into blue clickable links.
 *
 * This is not a preference we can switch off — mail clients linkify URLs, phone
 * numbers and street addresses on receipt. The shipping address field is free text
 * and users routinely paste a Google Maps URL into it, so it renders as a blue
 * underlined link pointing at an external map.
 *
 * `&zwnj;` (zero-width non-joiner) is invisible in every client but breaks the
 * character runs the detectors match on. Applied to the string and dot/warning
 * characters so `google.com`, `https://` and phone numbers are no longer
 * recognised, while the text stays copy-pasteable.
 */
function neutralizeDataDetectors(value = '') {
  return String(value)
    // Break the protocol separator so "https://" is not recognised as a URL.
    // The colon is kept in the output, otherwise the address renders as "https//".
    .replace(/(https?):(\/\/)/gi, '$1:&zwnj;$2')
    // Break the TLD dot so "google.com" is not recognised as a hostname
    .replace(/([a-z0-9])(\.)(?=[a-z]{2,})/gi, '$1&zwnj;$2')
    // Break phone numbers (7+ digit runs with optional +/dashes/spaces)
    .replace(/\+?(\d[\d\s\-().]{6,}\d)/g, (match) => match.replace(/(\d)(\d)/, '$1&zwnj;$2'));
}

/**
 * Format tag size display title
 */
function formatTagSizeLabel(tagType, selectedSize, customDimensions) {
  if (selectedSize === 'custom' && customDimensions) {
    return `Custom Dimensions (${customDimensions})`;
  }
  const sizeMap = {
    standard: 'Standard Size',
    square_fob_30x30: 'Square Keychain Fob (3cm x 3cm)',
    square_fob_35x35: 'Square Keychain Fob (3.5cm x 3.5cm)',
    standard_keychain_30x50: 'Rectangle Keychain (3cm x 5cm)',
    mini_compact_25x40: 'Mini Compact Keychain (2.5cm x 4cm)',
    standard_cr80_card: 'Standard Wallet Card (CR80: 8.56cm x 5.4cm)',
    compact_card_70x45: 'Compact ID Card (7cm x 4.5cm)',
    complete_bundle_all_sizes: 'Complete Bundle (All Keychain & Card Sizes)'
  };
  return sizeMap[selectedSize] || selectedSize || 'Standard Size';
}

/**
 * Sends order fulfillment emails (either Physical Shipping update or Digital QR Kit delivery)
 */
export async function sendTagOrderEmail({
  recipients = [],
  bundleQuantity,
  totalPeso,
  recipientEmail,
  recipientName,
  holderName,
  qrToken,
  tagType,
  selectedSize,
  customDimensions,
  orderId,
  deliveryType = 'digital_email',
  paymentMethod = 'gcash',
  shippingAddress = '',
  contactNumber = ''
}) {
  try {
    if (deliveryType === 'physical_shipping' && recipients.length) {
      const client = getBrevoClient();
      if (!client) {
        if (config.nodeEnv === 'production') throw new Error('Brevo API key is not configured.');
        return { success: true, simulated: true };
      }
      const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      const response = await client.transactionalEmails.sendTransacEmail({
        subject: `ResQTag order #${orderId} approved`,
        htmlContent: `<h1>Your family tags are being prepared</h1><p>${escape(bundleQuantity)} bundle(s). Total: PHP ${escape(totalPeso)}.</p><ul>${recipients.map(p => `<li>${escape(p.first_name)} ${escape(p.last_name)}: ${escape(p.copies)} set(s), each with one keychain and one wallet card.</li>`).join('')}</ul><p>${paymentMethod === 'cod' ? 'Payment will be collected on delivery.' : 'Your payment has been verified.'}</p><p>Shipping address: ${escape(shippingAddress)}</p>`,
        sender: { name: config.brevo.senderName, email: config.brevo.senderEmail },
        to: [{ email: recipientEmail, name: recipientName }]
      });
      return { success: true, simulated: false, messageId: response.messageId };
    }
    const origin = getPublicOrigin();
    const emergencyUrl = `${origin}/emergency/${qrToken}`;
    const tokenDisplay = `RQ-${qrToken.slice(0, 8).toUpperCase()}`;
    const sizeLabel = tagType === 'bundle' ? 'Keychain + wallet card (dimensions printed in the PDF)' : formatTagSizeLabel(tagType, selectedSize, customDimensions);
    const tagFormatLabel = tagType === 'wallet_card' 
      ? 'Wallet / ID Card' 
      : tagType === 'bundle' 
        ? 'Complete Bundle (Keychain + Card)' 
        : 'Keychain Tag';

    const isPhysical = deliveryType === 'physical_shipping';
    // COD orders are approved before anything is produced, so the copy must not
    // claim the tag is already printed. GCash approval happens after payment,
    // which for physical orders is the "printed & ready to ship" notification.
    const isCodPhysical = isPhysical && paymentMethod === 'cod';

    // Generate high-resolution QR code PNG buffer (1000x1000 px for ultra-crisp print quality)
    const digitalKit = !isPhysical ? await createDigitalTagKit({
      emergencyUrl, holderName: holderName || recipientName, tagType, selectedSize, customDimensions, orderId,
    }) : null;
    const qrBuffer = digitalKit?.qrBuffer || await QRCode.toBuffer(emergencyUrl, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 2,
      width: 1000,
      color: {
        dark: '#0f172a', // Slate 900
        light: '#ffffff'  // Pure White
      }
    });

    const qrBase64 = qrBuffer.toString('base64');

    // Gmail, Outlook and most other clients strip `data:` URIs from HTML email by
    // default, which renders the QR as a broken-image placeholder. Host the PNG on
    // Cloudinary and reference it over https so it displays in every client.
    const hostedQrUrl = await uploadImageBuffer(qrBuffer, {
      folder: 'resqtag/qr-codes',
      filename: `qr-${tokenDisplay}`
    });
    const qrImageSrc = hostedQrUrl || `data:image/png;base64,${qrBase64}`;
    const qrImageNotice = hostedQrUrl
      ? ''
      : '<p style="font-size: 11px; color: #64748b; margin: 10px 0 0;">Your QR code is also attached to this email as a PNG file.</p>';

    // Prepare Physical Delivery vs Digital Email Content
    let emailSubject = '';
    let htmlContent = '';

    if (isPhysical) {
      emailSubject = isCodPhysical
        ? `✅ Your ResQTag Order Is Confirmed & In Production (Order #${orderId})`
        : `📦 Your ResQTag Has Been Printed & Is Ready for Delivery (Order #${orderId})`;
      htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Physical ResQTag is Printed & Ready</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 620px; margin: 20px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 36px 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; font-size: 13px; color: #94a3b8; }
    .badge { display: inline-block; padding: 5px 14px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #6ee7b7; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
    .body { padding: 32px 30px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
    .card-qr { background: #f1f5f9; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; text-align: center; margin: 24px 0; }
    .qr-image { width: 200px; height: 200px; border-radius: 12px; background: #ffffff; padding: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .token-box { font-family: monospace; font-size: 14px; font-weight: 800; color: #0f172a; background: #ffffff; display: inline-block; padding: 6px 16px; border-radius: 8px; border: 1px dashed #cbd5e1; margin-top: 14px; }
    .specs-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .specs-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; }
    .specs-table td.label { font-weight: 600; color: #64748b; width: 38%; }
    .specs-table td.value { font-weight: 700; color: #0f172a; }
    .status-badge { display: inline-block; padding: 3px 10px; background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .delivery-guide { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 18px 20px; margin: 24px 0; }
    .delivery-guide h3 { margin: 0 0 8px; font-size: 14px; color: #166534; font-weight: 800; }
    .delivery-guide ul { margin: 0; padding-left: 18px; font-size: 12px; color: #14532d; line-height: 1.6; }
    .footer { background: #f8fafc; padding: 24px 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }

    /* Neutralize mail-client "data detectors" that auto-link user-supplied text
       (pasted Google Maps URLs in the shipping address, phone numbers, etc).
       These selectors target the classes/iOS attributes the clients inject. */
    a[x-apple-data-detectors],
    .x-gmail-data-detectors,
    .x-gmail-data-detectors *,
    .aBn {
      color: inherit !important;
      text-decoration: none !important;
      border-bottom: 0 !important;
      cursor: default !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
    }
  </style>
  <style>
    /* Gmail-specific: it injects <a> tags without x-apple-data-detectors and
       rewrites them to <u>, so target the following-sibling and body selectors. */
    u + .specs-table a {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-weight: inherit !important;
    }
    #MessageViewBody a {
      color: inherit !important;
      text-decoration: none !important;
    }
  </style>
  <!-- Tell Apple Mail/iOS not to linkify phone numbers or addresses -->
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no" />
</head>
<body>
  <div class="container">
    <div class="header">
    <div class="badge">${isCodPhysical ? 'Order Confirmed · Cash on Delivery' : 'Printed & Ready for Delivery'}</div>
    <h1>${isCodPhysical ? 'Your Tag Is Being Produced' : 'Your Physical Tag is Ready'}</h1>
    <p>${isCodPhysical ? 'Approved and queued for printing, laminating &amp; packing' : 'Printed, laminated & being prepared for courier dispatch'}</p>
  </div>

  <div class="body">
    <div class="greeting">Hello ${recipientName || 'Valued User'},</div>
    <div class="text">
      ${isCodPhysical
        ? `Thank you for your order! Your custom ResQTag emergency tag for Order <strong>#${orderId}</strong> has been <strong>confirmed and released to production</strong>. We will email you again the moment it is printed and handed to the courier.`
        : `Great news! Your custom ResQTag emergency tag for Order <strong>#${orderId}</strong> has been <strong>printed and laminated</strong>. It is now ready and being packaged for courier delivery to your registered shipping address.`}
    </div>

    <table class="specs-table">
      <tr>
        <td class="label">Production Status:</td>
        <td class="value"><span class="status-badge">${isCodPhysical ? '🛠️ Confirmed — In Production' : '✨ Printed & Laminated (Ready to Ship)'}</span></td>
      </tr>
      <tr>
        <td class="label">Payment Method:</td>
        <td class="value">${isCodPhysical ? 'Cash on Delivery (pay the courier on arrival)' : 'GCash (verified)'}</td>
      </tr>
        <tr>
          <td class="label">Tag Format:</td>
          <td class="value">${tagFormatLabel}</td>
        </tr>
        <tr>
          <td class="label">Dimensions:</td>
          <td class="value">${sizeLabel}</td>
        </tr>
        <tr>
          <td class="label">Emergency Token:</td>
          <td class="value" style="font-family: monospace;">${tokenDisplay}</td>
        </tr>
        ${shippingAddress ? `
        <tr>
          <td class="label">Shipping Address:</td>
          <td class="value">${neutralizeDataDetectors(shippingAddress)}</td>
        </tr>` : ''}
        ${contactNumber ? `
        <tr>
          <td class="label">Contact Phone:</td>
          <td class="value">${neutralizeDataDetectors(contactNumber)}</td>
        </tr>` : ''}

      </table>

      <div class="card-qr">
        <p style="font-size: 12px; font-weight: 700; color: #334155; margin: 0 0 12px;">Tag Preview & Instant Testing</p>
        <img src="${qrImageSrc}" alt="ResQTag QR Code" class="qr-image" style="display:block;border:0;" />${qrImageNotice}
        <br />
        <div class="token-box">${tokenDisplay}</div>
        <p style="font-size: 11px; color: #64748b; margin: 8px 0 0;">Your live profile is already active and ready to be scanned</p>
      </div>

      <div class="delivery-guide">
        <h3>🚚 What Happens Next?</h3>
        <ul>
          ${isCodPhysical
            ? `<li><strong>Now:</strong> Your order moves into printing and laminating. You will receive a second email once it is shipped.</li>
               <li><strong>Cash on Delivery:</strong> Please prepare the exact amount in cash. The courier will collect it at your door — your tag profile is <strong>never</strong> withheld if you cannot pay immediately.</li>
               <li><strong>Delivery window:</strong> Allow a few days for production plus courier transit after you receive the dispatch email.</li>`
            : `<li><strong>Courier Handover:</strong> Your laminated physical tag is securely packaged and scheduled for dispatch to your address.</li>
               <li><strong>Profile is Already Active:</strong> First responders can scan your QR code immediately. You do not need to activate anything upon delivery.</li>
               <li><strong>Keep Details Updated:</strong> You can update your emergency contacts and medical information anytime in your dashboard without needing a new physical tag.</li>`}
        </ul>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px;"><strong>ResQTag Emergency Information System</strong></p>
      <p style="margin: 0;">Securing lives through instant, encrypted medical and emergency profiles.</p>
    </div>
  </div>
</body>
</html>
      `;
    } else {
      // Digital QR Kit Email
      emailSubject = `🛡️ Your Official ResQTag QR Emergency Kit (Order #${orderId})`;
      htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Official ResQTag QR Emergency Kit</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 620px; margin: 20px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 36px 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; font-size: 13px; color: #94a3b8; }
    .badge { display: inline-block; padding: 5px 12px; background: rgba(225,29,72,0.15); border: 1px solid rgba(225,29,72,0.4); color: #fda4af; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
    .body { padding: 32px 30px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
    .card-qr { background: #f1f5f9; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; text-align: center; margin: 24px 0; }
    .qr-image { width: 220px; height: 220px; border-radius: 12px; background: #ffffff; padding: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .token-box { font-family: monospace; font-size: 14px; font-weight: 800; color: #0f172a; background: #ffffff; display: inline-block; padding: 6px 16px; border-radius: 8px; border: 1px dashed #cbd5e1; margin-top: 14px; }
    .specs-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .specs-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; }
    .specs-table td.label { font-weight: 600; color: #64748b; width: 40%; }
    .specs-table td.value { font-weight: 700; color: #0f172a; }
    .print-guide { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 14px; padding: 18px 20px; margin: 24px 0; }
    .print-guide h3 { margin: 0 0 8px; font-size: 14px; color: #9f1239; font-weight: 800; }
    .print-guide ul { margin: 0; padding-left: 18px; font-size: 12px; color: #881337; line-height: 1.6; }
    .footer { background: #f8fafc; padding: 24px 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }

    /* Neutralize mail-client "data detectors" that auto-link user-supplied text
       (pasted Google Maps URLs, phone numbers, etc). These selectors target the
       classes/iOS attributes the clients inject around detected content. */
    a[x-apple-data-detectors],
    .x-gmail-data-detectors,
    .x-gmail-data-detectors *,
    .aBn {
      color: inherit !important;
      text-decoration: none !important;
      border-bottom: 0 !important;
      cursor: default !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
    }
  </style>
  <style>
    /* Gmail-specific: it injects <a> tags without x-apple-data-detectors and
       rewrites them to <u>, so target the following-sibling and body selectors. */
    u + .specs-table a {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-weight: inherit !important;
    }
    #MessageViewBody a {
      color: inherit !important;
      text-decoration: none !important;
    }
  </style>
  <!-- Tell Apple Mail/iOS not to linkify phone numbers or addresses -->
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no" />
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Official Digital Tag Kit</div>
      <h1>Your ResQTag is Ready</h1>
      <p>High-resolution QR emergency code and print-ready digital templates</p>
    </div>

    <div class="body">
      <div class="greeting">Hello ${recipientName || 'Valued User'},</div>
      <div class="text">
        Your GCash payment for Order <strong>#${orderId}</strong> has been successfully verified! Your email includes two files: a <strong>ready-to-print PDF with your selected template's front and back</strong>, and a <strong>separate high-resolution QR PNG</strong> for your own designs.
      </div>

      <div class="card-qr">
        <img src="${qrImageSrc}" alt="ResQTag QR Code" class="qr-image" style="display:block;border:0;" />${qrImageNotice}
        <br />
        <div class="token-box">${tokenDisplay}</div>
        <p style="font-size: 11px; color: #64748b; margin: 8px 0 0;">Scan to immediately test your live emergency profile</p>
      </div>

      <table class="specs-table">
        <tr>
          <td class="label">Tag Format:</td>
          <td class="value">${tagFormatLabel}</td>
        </tr>
        <tr>
          <td class="label">Target Size:</td>
          <td class="value">${sizeLabel}</td>
        </tr>
        <tr>
          <td class="label">Emergency Token:</td>
          <td class="value" style="font-family: monospace;">${tokenDisplay}</td>
        </tr>
      </table>

      <div class="print-guide">
        <h3>🖨️ Self-Printing & Lamination Guide</h3>
        <ul>
          <li><strong>Photo Paper or Cardstock:</strong> For best longevity, print on 220-300 GSM photo paper or cardstock at 100% scale (Do not scale to fit).</li>
          <li><strong>Printable PDF:</strong> Open the attached PDF and print at Actual size / 100%. Cut along the outlines and place the front and back together. The dimensions are printed in the PDF.</li>
          <li><strong>Separate QR PNG:</strong> Use this image for your own design. Keep its white border, square proportions, and dark-on-white contrast.</li>
          <li><strong>Lamination:</strong> Cold or thermal lamination is recommended to make the printed emergency tag waterproof and scratch-resistant.</li>
        </ul>
      </div>


    </div>

    <div class="footer">
      <p style="margin: 0 0 6px;"><strong>ResQTag Emergency Information System</strong></p>
      <p style="margin: 0;">Securing lives through instant, encrypted medical and emergency profiles.</p>
    </div>
  </div>
</body>
</html>
      `;
    }

    const client = getBrevoClient();

    if (!client) {
      console.log('⚠️ [Brevo Email Service] BREVO_API_KEY is not configured or in dev placeholder mode.');
      console.log(`✉️ Simulated email dispatched to: ${recipientEmail}`);
      console.log(`🔑 QR Token: ${tokenDisplay}, Order ID: #${orderId}, Type: ${deliveryType}, Payment: ${paymentMethod}`);
      return {
        success: true,
        simulated: true,
        message: 'Brevo API key not set; email dispatch simulated successfully in development mode.'
      };
    }

    const response = await client.transactionalEmails.sendTransacEmail({
      subject: emailSubject,
      htmlContent: htmlContent,
      sender: {
        name: config.brevo.senderName || 'ResQTag Emergency System',
        email: config.brevo.senderEmail || 'support@resqtag.com'
      },
      to: [{ email: recipientEmail, name: recipientName || 'ResQTag User' }],
      attachment: [
        ...(digitalKit ? [{
          content: digitalKit.pdfBuffer.toString('base64'),
          name: `ResQTag-${tokenDisplay}-printable.pdf`
        }] : []),
        {
          content: qrBase64,
          name: `ResQTag-${tokenDisplay}.png`
        }
      ]
    });

    console.log('✅ [Brevo Email Service] Email sent successfully:', response.messageId || response);
    return {
      success: true,
      simulated: false,
      messageId: response.messageId || (typeof response === 'string' ? response : 'delivered')
    };
  } catch (error) {
    console.error('❌ [Brevo Email Service] Error sending tag order email:', error);
    throw error;
  }
}

/**
 * Backward compatibility alias for sendTagOrderEmail
 */
export const sendDigitalTagEmail = sendTagOrderEmail;

/**
 * Sends the 6-digit confirmation code to the NEW email address during an
 * account email change.
 *
 * Deliberately has no links or buttons: this message only proves the recipient
 * controls the new mailbox. Any action must be taken in the app by someone who
 * also knows the account password.
 *
 * @returns {Promise<{success: boolean, simulated: boolean, messageId?: string}>}
 */
export async function sendEmailVerificationCodeEmail({ recipientEmail, recipientName, code, expiresInMinutes }) {
  try {
    const emailSubject = `${code} is your ResQTag email verification code`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ResQTag Email Verification Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 560px; margin: 20px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 36px 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; font-size: 13px; color: #94a3b8; }
    .body { padding: 32px 30px; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
    .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 26px; text-align: center; margin: 24px 0; }
    .code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #0f172a; text-indent: 10px; }
    .expiry { font-size: 12px; color: #64748b; text-align: center; }
    .notice { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 14px; padding: 16px 18px; margin: 24px 0; }
    .notice p { margin: 0; font-size: 12px; line-height: 1.6; color: #9f1239; }
    .footer { background: #f8fafc; padding: 24px 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verify your new email</h1>
      <p>Confirm this address for your ResQTag account</p>
    </div>

    <div class="body">
      <div class="text">
        Hi ${neutralizeDataDetectors(recipientName || 'there')}, you requested to change the email address on your ResQTag account. Enter this code in the app to confirm the change:
      </div>

      <div class="code-box">
        <div class="code">${code}</div>
      </div>
      <div class="expiry">This code expires in ${expiresInMinutes} minutes.</div>

      <div class="notice">
        <p><strong>Did not request this?</strong> Ignore this email. Your current email address and password remain unchanged, and nothing has been changed on your account.</p>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0;">Securing lives through instant, encrypted medical and emergency profiles.</p>
    </div>
  </div>
</body>
</html>
      `;

    const client = getBrevoClient();

    if (!client) {
      console.log('⚠️ [Brevo Email Service] BREVO_API_KEY is not configured or in dev placeholder mode.');
      console.log(`✉️ Simulated verification email dispatched to: ${recipientEmail}`);
      // Printed so the flow stays testable locally, but only outside production:
      // a missing Brevo key in prod would otherwise write live codes to the logs.
      if (config.nodeEnv !== 'production') {
        console.log(`🔑 Email verification code: ${code}`);
      } else {
        console.error('🔑 Email verification code withheld from logs (production). BREVO_API_KEY must be set or users cannot complete email changes.');
      }
      return {
        success: true,
        simulated: true,
        message: 'Brevo API key not set; verification email simulated in development mode.'
      };
    }

    const response = await client.transactionalEmails.sendTransacEmail({
      subject: emailSubject,
      htmlContent: htmlContent,
      sender: {
        name: config.brevo.senderName || 'ResQTag Emergency System',
        email: config.brevo.senderEmail || 'support@resqtag.com'
      },
      to: [{ email: recipientEmail, name: recipientName || 'ResQTag User' }]
    });

    console.log('✅ [Brevo Email Service] Verification code email sent:', response.messageId || response);
    return {
      success: true,
      simulated: false,
      messageId: response.messageId || (typeof response === 'string' ? response : 'delivered')
    };
  } catch (error) {
    console.error('❌ [Brevo Email Service] Error sending verification code email:', error);
    throw error;
  }
}

/**
 * Sends a security notice to the PREVIOUS email address once an email change
 * completes.
 *
 * This is the account-takeover alarm: if someone hijacked a session and swapped
 * the recovery address, the real owner still receives mail at the old address
 * and can reset their password.
 *
 * @returns {Promise<{success: boolean, simulated: boolean}>}
 */
export async function sendEmailChangeNotificationEmail({ previousEmail, newEmail, recipientName, changedAt }) {
  try {
    const emailSubject = 'Security alert: your ResQTag email address was changed';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ResQTag email address was changed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 560px; margin: 20px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #7f1d1d 0%, #be123c 100%); padding: 36px 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; font-size: 13px; color: #fecdd3; }
    .body { padding: 32px 30px; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 16px; }
    .row { display: flex; justify-content: space-between; gap: 12px; padding: 13px 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 10px; font-size: 12px; }
    .row span:first-child { color: #64748b; font-weight: 600; }
    .row span:last-child { color: #0f172a; font-weight: 700; text-align: right; word-break: break-all; }
    .notice { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 14px; padding: 16px 18px; margin: 24px 0; }
    .notice p { margin: 0; font-size: 12px; line-height: 1.6; color: #9f1239; }
    .footer { background: #f8fafc; padding: 24px 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your email address was changed</h1>
      <p>Security notification for your ResQTag account</p>
    </div>

    <div class="body">
      <div class="text">
        Hi ${neutralizeDataDetectors(recipientName || 'there')}, the email address on your ResQTag account was changed successfully. This message was sent to your previous address so you are aware of the change.
      </div>

      <div class="row">
        <span>Previous email</span>
        <span>${neutralizeDataDetectors(previousEmail)}</span>
      </div>
      <div class="row">
        <span>New email</span>
        <span>${neutralizeDataDetectors(newEmail)}</span>
      </div>
      <div class="row">
        <span>Changed on</span>
        <span>${changedAt}</span>
      </div>

      <div class="notice">
        <p><strong>Was this not you?</strong> Someone changed the email on your account, which means they had your password. Reset your password immediately and contact support.</p>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0;">Securing lives through instant, encrypted medical and emergency profiles.</p>
    </div>
  </div>
</body>
</html>
      `;

    const client = getBrevoClient();

    if (!client) {
      console.log('⚠️ [Brevo Email Service] BREVO_API_KEY is not configured or in dev placeholder mode.');
      console.log(`✉️ Simulated email-change notice dispatched to: ${previousEmail}`);
      return {
        success: true,
        simulated: true,
        message: 'Brevo API key not set; change notification simulated in development mode.'
      };
    }

    const response = await client.transactionalEmails.sendTransacEmail({
      subject: emailSubject,
      htmlContent: htmlContent,
      sender: {
        name: config.brevo.senderName || 'ResQTag Emergency System',
        email: config.brevo.senderEmail || 'support@resqtag.com'
      },
      to: [{ email: previousEmail, name: recipientName || 'ResQTag User' }]
    });

    console.log('✅ [Brevo Email Service] Email change notice sent:', response.messageId || response);
    return {
      success: true,
      simulated: false,
      messageId: response.messageId || (typeof response === 'string' ? response : 'delivered')
    };
  } catch (error) {
    console.error('❌ [Brevo Email Service] Error sending email change notification:', error);
    throw error;
  }
}

