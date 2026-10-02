import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const CM = 72 / 2.54;
const RED = '#e11d48';
const INK = '#0f172a';

// Physical measurements in PDF points, independent of screen or printer DPI.
export function digitalTagDimensions(type, selectedSize, customDimensions) {
  const presets = {
    standard_keychain_30x50: [3, 5], mini_compact_25x40: [2.5, 4],
    square_fob_30x30: [3, 3], square_fob_35x35: [3, 3],
    standard_cr80_card: [8.56, 5.4], compact_card_70x45: [7, 4.5],
  };
  if (selectedSize === 'custom' && customDimensions) {
    const numbers = String(customDimensions).match(/\d+(?:\.\d+)?/g)?.map(Number);
    if (numbers?.length >= 2) {
      const scale = /mm/i.test(customDimensions) ? 10 : 1;
      return [Math.max(1.5, Math.min(20, numbers[0] / scale)), Math.max(1.5, Math.min(25, numbers[1] / scale))];
    }
  }
  return presets[selectedSize] || (type === 'wallet_card' ? [8.56, 5.4] : [3, 3]);
}

function text(doc, value, x, y, width, size, color = INK, align = 'left') {
  doc.font('Helvetica-Bold').fontSize(size).fillColor(color)
    .text(String(value || ''), x, y, { width, align, lineBreak: false, ellipsis: true });
}

function frame(doc, x, y, w, h) {
  doc.save().lineWidth(0.5).dash(2, { space: 2 }).rect(x, y, w, h).stroke('#64748b').restore();
}

function drawKeychain(doc, qr, name, x, y, w, h, back) {
  frame(doc, x, y, w, h);
  const pad = 3;
  if (!back) {
    const brandRed = '#be123c';
    const iconSize = 6.5;
    const gap = 1.5;
    doc.font('Helvetica-Bold').fontSize(5.5);
    const redWidth = doc.widthOfString('ResQ');
    const blackWidth = doc.widthOfString('Tag');
    const brandX = x + (w - iconSize - gap - redWidth - blackWidth) / 2;
    doc.save().translate(brandX, y + pad).scale(iconSize / 24)
      .lineWidth(2).lineCap('round').lineJoin('round');
    // Match the Lucide ShieldAlert outline used by the admin print template.
    doc.path('M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z').stroke(brandRed);
    doc.moveTo(12, 8).lineTo(12, 12).stroke(brandRed);
    doc.circle(12, 16, 1).fill(brandRed);
    doc.restore();
    text(doc, 'ResQ', brandX + iconSize + gap, y + pad + 0.5, redWidth + 1, 5.5, brandRed);
    text(doc, 'Tag', brandX + iconSize + gap + redWidth, y + pad + 0.5, blackWidth + 1, 5.5, '#000000');
    const size = Math.min(w - pad * 2, h - 22);
    doc.image(qr, x + (w - size) / 2, y + (h - size) / 2, { width: size, height: size });
    text(doc, 'SCAN IN EMERGENCY', x + pad, y + h - 9, w - pad * 2, 4.5, RED, 'center');
  } else {
    const nameOffset = 0.1 * CM; // Move the heading and name down by 1 mm.
    text(doc, 'EMERGENCY ID', x + pad, y + pad + nameOffset, w - pad * 2, 4.5, RED, 'center');
    text(doc, name, x + pad, y + 10 + nameOffset, w - pad * 2, 6, INK, 'center');
    const boxHeight = 25;
    const top = y + (h - boxHeight) / 2;
    doc.roundedRect(x + pad, top, w - pad * 2, boxHeight, 2).fill('#f1f5f9');
    ['Scan QR for medical info', '1-Touch emergency contacts', 'Cloud verified'].forEach((line, i) => {
      text(doc, line, x + pad + 1, top + 4 + i * 7, w - pad * 2 - 2, 4.5, INK, 'center');
    });
  }
}

function drawCard(doc, qr, name, x, y, w, h, back) {
  frame(doc, x, y, w, h);
  doc.rect(x + 0.5, y + 0.5, w - 1, 29).fill(RED);
  text(doc, back ? 'FIRST RESPONDER INSTRUCTIONS' : 'ResQTag', x + 9, y + 6, w - 18, back ? 7 : 10, '#ffffff');
  if (!back) {
    text(doc, 'EMERGENCY QR', x + 9, y + 19, w - 18, 6, '#ffffff');
    // Fade the decorative cross towards the upper right, behind the content.
    const s = Math.min(1.8 * CM, h - 30);
    const cx = x + 1, cy = y + h - s - 1;
    const gradient = doc.linearGradient(cx, cy + s, cx + s, cy)
      .stop(0, RED, 0.22).stop(1, RED, 0.02);
    doc.save().path(`M ${cx + s / 3} ${cy} h ${s / 3} v ${s / 3} h ${s / 3} v ${s / 3} h ${-s / 3} v ${s / 3} h ${-s / 3} v ${-s / 3} h ${-s / 3} v ${-s / 3} h ${s / 3} Z`).fill(gradient).restore();
    const qrSize = Math.min(76, h - 43, w * 0.38);
    const bodyTop = y + 30;
    const bodyHeight = h - 30;
    const textWidth = w - qrSize - 29;
    text(doc, name, x + 9, bodyTop + bodyHeight / 2 - 17, textWidth, 10);
    text(doc, 'SCAN FOR', x + 9, bodyTop + bodyHeight / 2, textWidth, 7, RED);
    text(doc, 'EMERGENCY INFO', x + 9, bodyTop + bodyHeight / 2 + 10, textWidth, 7, '#475569');
    doc.moveTo(x + w - qrSize - 15, bodyTop + 10).lineTo(x + w - qrSize - 15, y + h - 10).lineWidth(1).stroke('#fda4af');
    doc.image(qr, x + w - qrSize - 7, bodyTop + (bodyHeight - qrSize) / 2, { width: qrSize, height: qrSize });
  } else {
    doc.font('Helvetica').fontSize(7).fillColor(INK).text(
      '1. Scan the front QR code with any phone camera.\n\n2. Access medical history, allergies and blood type.\n\n3. Tap to call emergency contacts.',
      x + 9, y + 40, { width: w - 18, height: h - 48 }
    );
  }
}

export async function createDigitalTagKit({ emergencyUrl, holderName, tagType = 'keychain', selectedSize, customDimensions, orderId }) {
  if (!['keychain', 'wallet_card', 'bundle'].includes(tagType)) throw new Error('Unsupported digital tag format.');
  const qrBuffer = await QRCode.toBuffer(emergencyUrl, {
    type: 'png', width: 1200, margin: 4, errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#ffffff' },
  });
  const doc = new PDFDocument({ autoFirstPage: false, info: { Title: 'ResQTag Printable Emergency Kit' } });
  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const types = tagType === 'bundle' ? ['keychain', 'wallet_card'] : [tagType];
  for (const type of types) {
    let size = selectedSize, custom = customDimensions;
    if (tagType === 'bundle') {
      const part = customDimensions?.match(type === 'keychain' ? /Keychain:\s*([^|]+)/i : /Card:\s*([^|]+)/i)?.[1].trim();
      size = part?.startsWith('custom:') ? 'custom' : part;
      custom = part?.startsWith('custom:') ? part.slice(7) : undefined;
    }
    const [widthCm, heightCm] = digitalTagDimensions(type, size, custom);
    const w = widthCm * CM, h = heightCm * CM;
    // Stack faces for easy cutting and gluing; expand the sheet for legacy large custom orders.
    doc.addPage({ size: [Math.max(595.28, w + 80), Math.max(841.89, 2 * h + 245)], margin: 0 });
    text(doc, 'ResQTag | Ready-to-print kit', 40, 35, doc.page.width - 80, 18);
    text(doc, `${type === 'keychain' ? 'Keychain' : 'Wallet card'} - ${widthCm} x ${heightCm} cm per face`, 40, 65, doc.page.width - 80, 10);
    text(doc, `Order #${orderId || '-'} | Print at 100% / Actual size. Turn off Fit to page.`, 40, 85, doc.page.width - 80, 9, '#475569');
    const draw = type === 'keychain' ? drawKeychain : drawCard;
    text(doc, 'FRONT', 40, 113, w, 8, '#64748b');
    draw(doc, qrBuffer, holderName, 40, 130, w, h, false);
    text(doc, 'BACK', 40, 150 + h, w, 8, '#64748b');
    draw(doc, qrBuffer, holderName, 40, 167 + h, w, h, true);
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text(
      'Cut along the dashed outlines. Place the two faces back-to-back, then insert into your keychain holder or laminate your card. Test the QR code after printing.',
      40, 190 + 2 * h, { width: doc.page.width - 80 }
    );
  }
  doc.end();
  return { qrBuffer, pdfBuffer: await finished };
}
