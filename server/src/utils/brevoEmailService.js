import * as brevo from '@getbrevo/brevo';
import QRCode from 'qrcode';
import { config } from '../config/env.js';

/**
 * Initializes Brevo Transactional Email API client
 */
function getBrevoClient() {
  const apiKey = config.brevo.apiKey;
  if (!apiKey || apiKey === 'xkeysib-your_brevo_api_key_here') {
    return null;
  }
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  return apiInstance;
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
    standard_keychain_30x50: 'Standard Keychain (30mm x 50mm)',
    square_fob_35x35: 'Square Keychain Fob (35mm x 35mm)',
    mini_compact_25x40: 'Mini Compact Keychain (25mm x 40mm)',
    standard_cr80_card: 'Standard Wallet Card (CR80: 85.6mm x 54mm)',
    compact_card_70x45: 'Compact ID Card (70mm x 45mm)',
    complete_bundle_all_sizes: 'Complete Bundle (All Keychain & Card Sizes)'
  };
  return sizeMap[selectedSize] || selectedSize || 'Standard Size';
}

/**
 * Sends a digital delivery email containing high-resolution QR code and print-ready instructions
 */
export async function sendDigitalTagEmail({
  recipientEmail,
  recipientName,
  qrToken,
  tagType,
  selectedSize,
  customDimensions,
  orderId
}) {
  try {
    const origin = config.clientUrl || 'http://localhost:5173';
    const emergencyUrl = `${origin}/emergency/${qrToken}`;
    const tokenDisplay = `RQ-${qrToken.slice(0, 8).toUpperCase()}`;
    const sizeLabel = formatTagSizeLabel(tagType, selectedSize, customDimensions);

    // Generate high-resolution QR code PNG buffer (1000x1000 px for ultra-crisp print quality)
    const qrBuffer = await QRCode.toBuffer(emergencyUrl, {
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
    const qrDataUri = `data:image/png;base64,${qrBase64}`;

    // Prepare HTML Email Content
    const htmlContent = `
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
    .btn { display: inline-block; width: 100%; box-sizing: border-box; text-align: center; background: #e11d48; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: 800; font-size: 14px; margin: 16px 0; }
    .footer { background: #f8fafc; padding: 24px 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
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
        Your GCash payment for Order <strong>#${orderId}</strong> has been successfully verified! Attached to this email is your high-resolution encrypted QR tag formatted specifically for your selected dimensions.
      </div>

      <div class="card-qr">
        <img src="${qrDataUri}" alt="ResQTag QR Code" class="qr-image" />
        <br />
        <div class="token-box">${tokenDisplay}</div>
        <p style="font-size: 11px; color: #64748b; margin: 8px 0 0;">Scan to immediately test your live emergency profile</p>
      </div>

      <table class="specs-table">
        <tr>
          <td class="label">Tag Format:</td>
          <td class="value">${tagType === 'wallet_card' ? 'Wallet / ID Card' : tagType === 'bundle' ? 'Complete Bundle (Keychain + Card)' : 'Keychain Tag'}</td>
        </tr>
        <tr>
          <td class="label">Target Size:</td>
          <td class="value">${sizeLabel}</td>
        </tr>
        <tr>
          <td class="label">Emergency Token:</td>
          <td class="value" style="font-family: monospace;">${tokenDisplay}</td>
        </tr>
        <tr>
          <td class="label">Live Profile Link:</td>
          <td class="value"><a href="${emergencyUrl}" style="color: #e11d48; word-break: break-all;">${emergencyUrl}</a></td>
        </tr>
      </table>

      <div class="print-guide">
        <h3>🖨️ Self-Printing & Lamination Guide</h3>
        <ul>
          <li><strong>Photo Paper or Matte Cardstock:</strong> For best longevity, print on 220-300 GSM photo paper or PVC card sheet at 100% scale (Do not scale to fit).</li>
          <li><strong>Dimensions:</strong> Use the exact dimensions specified above for standard acrylic blanks or card slots.</li>
          <li><strong>Lamination:</strong> Cold or thermal lamination is recommended to make the emergency tag waterproof and scratch-resistant.</li>
        </ul>
      </div>

      <a href="${emergencyUrl}" class="btn">View Your Live Emergency Profile</a>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px;"><strong>ResQTag Emergency Information System</strong></p>
      <p style="margin: 0;">Securing lives through instant, encrypted medical and emergency profiles.</p>
    </div>
  </div>
</body>
</html>
    `;

    const client = getBrevoClient();

    if (!client) {
      console.log('⚠️ [Brevo Email Service] BREVO_API_KEY is not configured or in dev placeholder mode.');
      console.log(`✉️ Simulated email dispatched to: ${recipientEmail}`);
      console.log(`🔑 QR Token: ${tokenDisplay}, Order ID: #${orderId}`);
      return {
        success: true,
        simulated: true,
        message: 'Brevo API key not set; email dispatch simulated successfully in development mode.'
      };
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `🛡️ Your Official ResQTag QR Emergency Kit (Order #${orderId})`;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = {
      name: config.brevo.senderName || 'ResQTag Emergency System',
      email: config.brevo.senderEmail || 'support@resqtag.com'
    };
    sendSmtpEmail.to = [{ email: recipientEmail, name: recipientName || 'ResQTag User' }];

    // Add high-resolution PNG attachment
    sendSmtpEmail.attachment = [
      {
        content: qrBase64,
        name: `ResQTag-${tokenDisplay}.png`
      }
    ];

    const response = await client.sendTransacEmail(sendSmtpEmail);
    console.log('✅ [Brevo Email Service] Email sent successfully:', response.body?.messageId || response);
    return {
      success: true,
      simulated: false,
      messageId: response.body?.messageId
    };
  } catch (error) {
    console.error('❌ [Brevo Email Service] Error sending digital tag email:', error);
    throw error;
  }
}
