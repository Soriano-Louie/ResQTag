import test from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { createDigitalTagKit, digitalTagDimensions } from '../src/utils/digitalTagKit.js';

const options = { emergencyUrl: 'https://example.com/emergency/test-token', holderName: 'Maria Dela Cruz', orderId: 123 };

for (const tagType of ['keychain', 'wallet_card', 'bundle']) {
  test(`${tagType} produces a printable PDF and separate high-resolution QR PNG`, async () => {
    const { pdfBuffer, qrBuffer } = await createDigitalTagKit({ ...options, tagType });
    assert.equal(pdfBuffer.subarray(0, 5).toString(), '%PDF-');
    assert.equal((pdfBuffer.toString('latin1').match(/\/Type \/Page\b/g) || []).length, tagType === 'bundle' ? 2 : 1);
    const png = PNG.sync.read(qrBuffer);
    assert.equal(png.width, 1200);
    assert.equal(png.height, 1200);
    assert.equal(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data, options.emergencyUrl);
    // The outer border must remain white for reliable scanning.
    for (let x = 0; x < png.width; x++) {
      assert.equal(png.data.readUInt32BE(x * 4), 0xffffffff);
    }
  });
}

test('uses standard sizes and preserves legacy ordered sizes', () => {
  assert.deepEqual(digitalTagDimensions('keychain'), [3, 3]);
  assert.deepEqual(digitalTagDimensions('wallet_card'), [8.56, 5.4]);
  assert.deepEqual(digitalTagDimensions('keychain', 'standard_keychain_30x50'), [3, 5]);
  assert.deepEqual(digitalTagDimensions('wallet_card', 'custom', '85mm x 54mm'), [8.5, 5.4]);
});

test('rejects invalid formats instead of delivering an incorrect template', async () => {
  await assert.rejects(createDigitalTagKit({ ...options, tagType: 'invalid' }), /Unsupported/);
});
