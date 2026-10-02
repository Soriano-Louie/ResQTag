import test from 'node:test';
import assert from 'node:assert/strict';
import { requirePublicSiteUrl } from '../src/utils/publicSiteUrl.js';

test('QR links reject missing, local and private destinations', () => {
  for (const url of ['', 'http://localhost:5173', 'https://localhost', 'https://127.0.0.1', 'https://10.0.0.2', 'https://192.168.1.1', 'https://172.16.0.1', 'https://[::1]', 'https://app.local']) {
    assert.throws(() => requirePublicSiteUrl(url));
  }
});
test('hosted QR destination uses the canonical origin', () => {
  assert.equal(requirePublicSiteUrl('https://example.com/'), 'https://example.com');
});
