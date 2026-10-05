import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../src/config/db.js';
import { getPublicEmergencyProfile } from '../src/controllers/publicController.js';
const token = '0123456789abcdef0123456789abcdef';
const record = { qr_id: 1, user_id: 7, status: 'active', account_status: 'active', first_name: 'Test', last_name: 'Holder', blood_type: 'O+', address: 'Private address' };
function response() { return { code: 200, headers: {}, set(k,v) { this.headers[k]=v; }, status(n) { this.code=n; return this; }, json(v) { this.data=v; return this; } }; }

test('scan overlaps independent reads and preserves private fields and contact filtering', async t => {
  let releaseContacts;
  let contactStarted = false;
  const calls = [];
  t.mock.method(pool, 'query', async sql => {
    calls.push(sql);
    if (sql.includes('FROM qr_tags q')) return [[record]];
    if (sql.startsWith('UPDATE')) return [{}];
    if (sql.includes('FROM emergency_contacts')) {
      contactStarted = true;
      return new Promise(resolve => { releaseContacts = () => resolve([[{ name: 'Public', is_public: 1 }, { name: 'Private', is_public: 0 }]]); });
    }
    if (sql.includes('FROM privacy_settings')) {
      assert.equal(contactStarted, true);
      releaseContacts();
      return [[{ field_name: 'blood_type', is_public: 0 }]];
    }
    throw new Error('Unexpected query');
  });
  const res = response();
  await getPublicEmergencyProfile({ params: { token } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.data.data.full_name, 'Test Holder');
  assert.equal(res.data.data.address, undefined);
  assert.equal(res.data.data.blood_type, undefined);
  assert.equal(res.data.data.qr_id, undefined);
  assert.deepEqual(res.data.data.emergency_contacts.map(c => c.name), ['Public']);
  assert.equal(calls.filter(s => s.trim().startsWith('SELECT')).length, 3);
});

for (const [label, rows, status, code] of [
  ['revoked token', [], 'not_found', 404],
  ['inactive tag', [{ ...record, status: 'inactive' }], 'inactive', 200],
  ['inactive account', [{ ...record, account_status: 'inactive' }], 'inactive', 200],
  ['missing account', [{ ...record, account_status: null }], 'inactive', 200]
]) test(label + ' does not retrieve contacts or photos', async t => {
  let reads = 0;
  t.mock.method(pool, 'query', async () => { reads++; return [rows]; });
  const res = response();
  await getPublicEmergencyProfile({ params: { token } }, res);
  assert.equal(res.code, code);
  assert.equal(res.data.status, status);
  assert.equal(res.data.data, undefined);
  assert.equal(reads, 1);
});

test('invalid token does not access database', async t => {
  t.mock.method(pool, 'query', () => { throw new Error('Must not query'); });
  const res = response();
  await getPublicEmergencyProfile({ params: { token: 'invalid' } }, res);
  assert.equal(res.code, 400);
});
