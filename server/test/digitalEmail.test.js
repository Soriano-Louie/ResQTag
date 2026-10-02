import test from 'node:test';
import assert from 'node:assert/strict';
import { BrevoClient } from '@getbrevo/brevo';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../src/config/env.js';
import { sendTagOrderEmail } from '../src/utils/brevoEmailService.js';

test('digital fulfillment sends the PDF and PNG together without sending a live email', async t => {
  const previousKey = config.brevo.apiKey;
  config.brevo.apiKey = 'test-only';
  t.after(() => { config.brevo.apiKey = previousKey; });
  t.mock.method(cloudinary.uploader, 'upload_stream', (_options, callback) => ({
    end() { callback(null, { secure_url: 'https://example.com/test-qr.png' }); },
  }));
  let payload;
  t.mock.getter(BrevoClient.prototype, 'transactionalEmails', () => ({
    async sendTransacEmail(value) { payload = value; return { messageId: 'test-message' }; },
  }));
  const result = await sendTagOrderEmail({
    recipientEmail: 'test@example.com', recipientName: 'Buyer', holderName: 'Tag Owner',
    qrToken: 'test-token', tagType: 'bundle', orderId: 123,
  });
  assert.equal(result.success, true);
  assert.equal(payload.attachment.length, 2);
  assert.match(payload.attachment[0].name, /-printable\.pdf$/);
  assert.equal(Buffer.from(payload.attachment[0].content, 'base64').subarray(0, 5).toString(), '%PDF-');
  assert.match(payload.attachment[1].name, /\.png$/);
  assert.match(payload.htmlContent, /separate high-resolution QR PNG/);
  assert.match(payload.htmlContent, /Actual size/);
});
