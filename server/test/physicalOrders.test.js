import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../src/config/db.js';
import { createOrder } from '../src/controllers/tagOrderController.js';
import { sendTagOrderEmail } from '../src/utils/brevoEmailService.js';
import { BrevoClient } from '@getbrevo/brevo';
import { config } from '../src/config/env.js';
const options = [['physical_keychain', 'keychain', 30], ['physical_card', 'wallet_card', 50], ['physical_combo', 'bundle', 70]];
function response() { return { code: 200, status(n) { this.code = n; return this; }, json(data) { this.data = data; return this; } }; }
for (const [selectedSize, tagType, price] of options) {
  for (const includeSelf of [true, false]) for (const paymentMethod of ['cod', 'gcash']) {
    test(`${selectedSize}: ${includeSelf ? 'owner' : 'member'} via ${paymentMethod} stores correct items and server price`, async t => {
      const calls = [];
      t.mock.method(pool, 'getConnection', async () => ({
        beginTransaction: async () => {}, commit: async () => calls.push('commit'), rollback: async () => calls.push('rollback'), release() {},
        async query(sql, values) {
          calls.push({sql, values});
          if (sql.includes('FROM users')) { assert.equal(includeSelf, true); return [[{ first_name:'Owner', last_name:'Test', qr_token:'owner-token' }]]; }
          if (sql.includes('FROM family_members')) { assert.equal(includeSelf, false); assert.deepEqual(values,[7,11]); return [[{ member_id:11, first_name:'Member',last_name:'Test',qr_token:'member-token' }]]; }
          return [{insertId:99}];
        }
      }));
      const res=response();
      await createOrder({user:{user_id:7,email:'owner@example.com'},body:{recipientName:'Buyer',contactNumber:'123',shippingAddress:'Taguig',deliveryType:'physical_shipping',paymentMethod,selectedSize,tagType:tagType==='bundle'?'keychain':'bundle',totalPeso:1,quantity:999,bundleQuantity:2,memberIds:includeSelf?[]:[11],includeSelf},file:paymentMethod==='gcash'?{path:'test-receipt.jpg'}:undefined},res);
      assert.equal(res.code,201);assert.equal(res.data.tagType,tagType);assert.equal(res.data.totalPeso,price*2);
      const saved=calls.find(c=>c.sql?.includes('INSERT INTO tag_orders (')).values;
      assert.equal(saved[7],tagType);assert.equal(saved[10],2);assert.equal(saved[15],price*2);
      const recipients=calls.filter(c=>c.sql?.includes('INSERT INTO tag_order_recipients'));
      assert.equal(recipients.length,1);assert.equal(recipients[0].values[1],includeSelf?null:11);assert.equal(recipients[0].values[4],includeSelf?'owner-token':'member-token');assert.equal(recipients[0].values[5],2);
      assert.ok(calls.includes('commit'));assert.ok(!calls.includes('rollback'));
    });
  }
  test(`${selectedSize}: fulfillment email describes only purchased items`, async t => {
    const previousKey=config.brevo.apiKey;config.brevo.apiKey='test-only';t.after(()=>{config.brevo.apiKey=previousKey;});
    let payload;
    t.mock.getter(BrevoClient.prototype,'transactionalEmails',()=>({async sendTransacEmail(value){payload=value;return {messageId:'mock'};}}));
    await sendTagOrderEmail({deliveryType:'physical_shipping',paymentMethod:'cod',tagType,selectedSize,recipients:[{first_name:'Owner',last_name:'Test',copies:1}],bundleQuantity:1,totalPeso:price,orderId:99,recipientEmail:'owner@example.com',recipientName:'Buyer'});
    const includes=payload.htmlContent.match(/each with ([^.]+)\./)[1];
    assert.equal(includes,tagType==='keychain'?'one keychain':tagType==='wallet_card'?'one wallet card':'one keychain and one wallet card');
    assert.match(payload.htmlContent,new RegExp(`PHP ${price}`));
  });
}
test('single-item order still rejects multiple recipients and unknown packages', async t => {
 t.mock.method(pool,'getConnection',()=>{throw new Error('Must not save invalid order');});
 for(const body of [{selectedSize:'physical_keychain',includeSelf:true,memberIds:[11]}, {selectedSize:'physical_card',includeSelf:false,memberIds:[]}, {selectedSize:'constructor',includeSelf:true,memberIds:[]}]) {
  const res=response();await createOrder({user:{user_id:7},body:{recipientName:'Buyer',contactNumber:'123',shippingAddress:'Taguig',deliveryType:'physical_shipping',paymentMethod:'cod',bundleQuantity:1,...body}},res);assert.equal(res.code,400);
 }
});
