import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBundle, familySchema } from '../src/utils/familyValidation.js';
import pool from '../src/config/db.js';
import { createOrder, getOrderPrintData } from '../src/controllers/tagOrderController.js';
import { getPublicEmergencyProfile } from '../src/controllers/publicController.js';
import familyRoutes from '../src/routes/familyRoutes.js';

const selection = { memberIds: [1, 2, 3], includeSelf: false, bundleQuantity: 2 };
function response() { return { code: 200, status(n) { this.code = n; return this; }, json(data) { this.data = data; return this; } }; }
test('three selected people get two copies each; owner occupies one slot', () => {
  assert.equal(validateBundle(selection, 3).quantity, 2);
  assert.deepEqual(validateBundle({ ...selection, memberIds: '[1,2]', includeSelf: 'true' }, 3).members, [1, 2]);
  assert.throws(() => validateBundle({ ...selection, includeSelf: true }, 3));
  assert.throws(() => validateBundle({ ...selection, memberIds: [1, 2] }, 3));
  assert.throws(() => validateBundle(selection, 5));
});
test('reject duplicate, malformed, fractional and excessive selections or quantities', () => {
  for (const memberIds of [[1,1,2], [0,1,2], ['1',2,3], 'oops', null]) assert.throws(() => validateBundle({ ...selection, memberIds }, 3));
  for (const bundleQuantity of [0, -1, 1.5, '2x', 7, undefined]) assert.throws(() => validateBundle({ ...selection, bundleQuantity }, 3));
  assert.equal(validateBundle({ memberIds: Array.from({ length: 10 }, (_, i) => i + 1), includeSelf: false, bundleQuantity: 2 }, 10).quantity, 2);
});
test('family details require names and reject invalid contacts; strip unexpected profile data', () => {
  assert.equal(familySchema.safeParse({ first_name: ' ', last_name: 'Doe' }).success, false);
  assert.equal(familySchema.safeParse({ first_name: 'A', last_name: 'B', contacts: [{ name: 'C', contact_number: '' }] }).success, false);
  assert.deepEqual(familySchema.parse({ first_name: 'A', last_name: 'B', profile: { password: 'secret' } }).profile, {});
});
test('create order saves three recipients and copies atomically, calculates price on server', async t => {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push('begin'), commit: async () => calls.push('commit'), rollback: async () => calls.push('rollback'), release: () => calls.push('release'),
    query: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes('FROM family_members')) {
        assert.deepEqual(values, [7, 1, 2, 3]);
        assert.match(sql, /archived=0/);
        return [[1,2,3].map(member_id => ({ member_id, first_name: `Member${member_id}`, last_name: 'Test', qr_token: `fm_${member_id}` }))];
      }
      return [{ insertId: 99 }];
    }
  };
  t.mock.method(pool, 'getConnection', async () => connection);
  const res = response();
  await createOrder({ user: { user_id: 7, email: 'a@example.com' }, body: { ...selection, recipientName: 'Buyer', contactNumber: '123', shippingAddress: 'Test street', deliveryType: 'physical_shipping', paymentMethod: 'cod', selectedSize: 'physical_family_3', quantity: 999, totalPeso: 1 } }, res);
  assert.equal(res.code, 201);
  assert.equal(res.data.totalPeso, 420);
  const recipients = calls.filter(c => c.sql?.includes('INSERT INTO tag_order_recipients'));
  assert.equal(recipients.length, 3);
  assert.ok(recipients.every(c => c.values.at(-1) === 2));
  assert.ok(calls.includes('commit')); assert.ok(!calls.includes('rollback'));
});
test('foreign or archived member selection rolls back without inserting order', async t => {
  const calls = [];
  t.mock.method(pool, 'getConnection', async () => ({ beginTransaction: async () => {}, query: async sql => { calls.push(sql); return [[]]; }, rollback: async () => calls.push('rollback'), release: () => calls.push('release') }));
  const res = response();
  await createOrder({ user: { user_id: 7 }, body: { ...selection, recipientName: 'Buyer', contactNumber: '123', shippingAddress: 'Street', deliveryType: 'physical_shipping', paymentMethod: 'cod', selectedSize: 'physical_family_3' } }, res);
  assert.equal(res.code, 400); assert.ok(calls.includes('rollback')); assert.ok(!calls.some(c => c.includes('INSERT')));
});
test('member scan exposes only their public fields and contacts', async t => {
  t.mock.method(pool, 'query', async () => [[{ first_name: 'Child', last_name: 'Test', account_status: 'active', archived: 0, profile: { blood_type: 'O+', allergies: 'Private', address: 'Private' }, privacy: { full_name: true, blood_type: true, emergency_contacts: true }, contacts: [{ name: 'Public', is_public: true }, { name: 'Private', is_public: false }] }]]);
  const res = response();
  await getPublicEmergencyProfile({ params: { token: 'fm_123456789012345678901234' } }, res);
  assert.equal(res.data.data.full_name, 'Child Test');
  assert.equal(res.data.data.blood_type, 'O+');
  assert.equal(res.data.data.allergies, undefined);
  assert.equal(res.data.data.address, undefined);
  assert.equal(res.data.data.emergency_contacts.length, 1);
});
test('archived family QR returns inactive', async t => {
  t.mock.method(pool, 'query', async () => [[{ archived: 1, account_status: 'active' }]]);
  const res = response();
  await getPublicEmergencyProfile({ params: { token: 'fm_123456789012345678901234' } }, res);
  assert.equal(res.data.status, 'inactive'); assert.equal(res.data.data, undefined);
});
test('printing refuses an archived recipient rather than substituting owner QR', async t => {
  t.mock.method(pool, 'query', async sql => {
    if (sql.includes('FROM tag_orders')) return [[{ order_id: 99, user_id: 7 }]];
    if (sql.includes('FROM tag_order_recipients')) return [[{ order_id: 99, member_id: 1, qr_token: 'fm_test', copies: 2 }]];
    return [[]];
  });
  const res = response(); await getOrderPrintData({ params: { id: 99 } }, res);
  assert.equal(res.code, 409);
});

test('family edits and archives are scoped to the authenticated account', async t => {
  t.mock.method(pool, 'query', async (sql, values) => {
    assert.match(sql, /member_id=\? AND user_id=\? AND archived=0/);
    assert.deepEqual(values.slice(-2), ['42', 7]);
    return [{ affectedRows: 0 }];
  });
  for (const method of ['put', 'delete']) {
    const handler = familyRoutes.stack.find(layer => layer.route?.methods[method]).route.stack[0].handle;
    const res = response();
    await handler({ user: { user_id: 7 }, params: { id: '42' }, body: { first_name: 'A', last_name: 'B' } }, res, err => { throw err; });
    assert.equal(res.code, 404);
  }
});
test('failure while saving a recipient rolls back the complete order', async t => {
  let rolledBack = false, committed = false;
  t.mock.method(pool, 'getConnection', async () => ({
    beginTransaction: async () => {}, release: () => {}, rollback: async () => { rolledBack = true; }, commit: async () => { committed = true; },
    query: async sql => {
      if (sql.includes('FROM users')) return [[{ first_name: 'Owner', last_name: 'Test', qr_token: 'owner' }]];
      if (sql.includes('INSERT INTO tag_order_recipients')) throw new Error('Simulated insert failure');
      return [{ insertId: 1 }];
    }
  }));
  const res = response();
  await createOrder({ user: { user_id: 7 }, body: { recipientName: 'Buyer', contactNumber: '123', shippingAddress: 'Street', deliveryType: 'physical_shipping', paymentMethod: 'cod', selectedSize: 'physical_combo', memberIds: [], includeSelf: true, bundleQuantity: 2 } }, res);
  assert.equal(res.code, 500); assert.ok(rolledBack); assert.equal(committed, false);
});
test('digital order keeps owner QR and does not require family selection', async t => {
  let inserted = false;
  t.mock.method(pool, 'getConnection', async () => ({
    beginTransaction: async () => {}, commit: async () => {}, release: () => {},
    query: async sql => {
      if (sql.includes('FROM users')) return [[{ qr_token: 'owner' }]];
      assert.match(sql, /INSERT INTO tag_orders/); inserted = true;
      return [{ insertId: 4 }];
    }
  }));
  const res = response();
  await createOrder({ user: { user_id: 7, email: 'owner@example.com' }, body: { recipientName: 'Owner', contactNumber: '123', quantity: 1 }, file: { path: '/receipt.png' } }, res);
  assert.equal(res.code, 201); assert.equal(res.data.deliveryType, 'digital_email'); assert.ok(inserted);
});
test('legacy order still prints; new order missing recipients cannot fall back to owner', async t => {
  let packageSize = null;
  t.mock.method(pool, 'query', async sql => sql.includes('FROM tag_orders') ? [[{ order_id: 1, user_id: 7, qr_token: 'owner', package_size: packageSize }]] : [[]]);
  const legacy = response(); await getOrderPrintData({ params: { id: 1 } }, legacy);
  assert.equal(legacy.code, 200); assert.equal(legacy.data.order.qr_token, 'owner');
  packageSize = 3;
  const current = response(); await getOrderPrintData({ params: { id: 1 } }, current);
  assert.equal(current.code, 409);
});
