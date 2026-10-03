import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import sharp from 'sharp';
import pool from '../src/config/db.js';
import { normalizePhoto } from '../src/utils/profilePhoto.js';
import { photoRouter } from '../src/routes/photoRoutes.js';
import { getPublicEmergencyProfile } from '../src/controllers/publicController.js';

test('photo processing resizes images and strips source metadata', async () => {
  const source = await sharp({ create: { width: 1000, height: 600, channels: 3, background: 'red' } })
    .jpeg().withMetadata({ orientation: 1 }).toBuffer();
  assert.ok((await sharp(source).metadata()).exif);
  const result = await sharp(await normalizePhoto(source)).metadata();
  assert.equal(result.width, 512);
  assert.equal(result.format, 'jpeg');
  assert.equal(result.exif, undefined);
  assert.equal(result.icc, undefined);
});

test('photo processing rejects malformed files and SVG content', async () => {
  await assert.rejects(normalizePhoto(Buffer.from('not an image')));
  await assert.rejects(normalizePhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')));
});

async function serve(t, member = false) {
  const app = express();
  app.use((req, res, next) => { req.user = { user_id: 7 }; next(); });
  app.use(member ? '/:id/photo' : '/photo', photoRouter());
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('family photo reads, writes and removal reject foreign or archived members', async t => {
  t.mock.method(pool, 'query', async (sql, values) => {
    assert.match(sql, /FROM family_members.*user_id=\? AND archived=0/);
    assert.deepEqual(values, [42, 7]);
    return [[]];
  });
  const base = await serve(t, true);
  for (const method of ['GET', 'PUT', 'DELETE']) {
    const res = await fetch(`${base}/42/photo`, { method });
    assert.equal(res.status, 404);
  }
});

test('owner can upload, read, replace and remove a photo with no public file URL', async t => {
  let stored;
  t.mock.method(pool, 'query', async (sql, values) => {
    assert.deepEqual(values.slice(0, 2), [7, 0]);
    if (sql.startsWith('INSERT')) stored = values[2];
    if (sql.startsWith('DELETE')) stored = null;
    return sql.startsWith('SELECT') ? [stored ? [{ image: stored }] : []] : [{}];
  });
  const base = await serve(t);
  for (const background of ['red', 'blue']) {
    const bytes = await sharp({ create: { width: 20, height: 20, channels: 3, background } }).png().toBuffer();
    const body = new FormData(); body.append('photo', new Blob([bytes], { type: 'image/png' }), 'photo.png');
    const res = await fetch(`${base}/photo`, { method: 'PUT', body });
    assert.equal(res.status, 200);
    assert.match((await res.json()).photo, /^data:image\/jpeg;base64,/);
  }
  const res = await fetch(`${base}/photo`);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.ok((await res.json()).photo);
  assert.equal((await fetch(`${base}/photo`, { method: 'DELETE' })).status, 200);
  assert.equal((await (await fetch(`${base}/photo`)).json()).photo, null);
});

test('uploads reject oversized and fake images', async t => {
  t.mock.method(pool, 'query', async () => { throw new Error('Invalid uploads must not reach storage'); });
  const base = await serve(t);
  for (const bytes of [Buffer.from('fake'), Buffer.alloc(5 * 1024 * 1024 + 1)]) {
    const body = new FormData(); body.append('photo', new Blob([bytes], { type: 'image/jpeg' }), 'photo.jpg');
    assert.equal((await fetch(`${base}/photo`, { method: 'PUT', body })).status, 400);
  }
});

test('family public photo requires explicit visibility and an active tag', async t => {
  let privacy = {}, archived = 0, photoReads = 0;
  t.mock.method(pool, 'query', async sql => {
    if (sql.includes('profile_photos')) { photoReads++; return [[{ image: Buffer.from('photo') }]]; }
    return [[{ member_id: 1, user_id: 7, archived, account_status: 'active', profile: {}, contacts: [], privacy }]];
  });
  const scan = async () => {
    const res = { json(data) { this.data = data; }, set() {} };
    await getPublicEmergencyProfile({ params: { token: 'fm_123456789012345678901234' } }, res);
    return res.data;
  };
  assert.equal((await scan()).data.profile_picture_url, undefined);
  assert.equal(photoReads, 0);
  privacy = { profile_picture: true };
  assert.match((await scan()).data.profile_picture_url, /^data:image\/jpeg/);
  archived = 1;
  assert.equal((await scan()).status, 'inactive');
  assert.equal(photoReads, 1);
});

test('owner public photo stays private by default and can be shared then hidden', async t => {
  let shared = false, reads = 0;
  t.mock.method(pool, 'query', async sql => {
    if (sql.includes('FROM qr_tags')) return [[{ qr_id: 1, user_id: 7, status: 'active' }]];
    if (sql.includes('FROM users')) return [[{ user_id: 7, account_status: 'active' }]];
    if (sql.includes('FROM privacy_settings')) return [shared ? [{ field_name: 'profile_picture', is_public: 1 }] : []];
    if (sql.includes('FROM profile_photos')) { reads++; return [[{ image: Buffer.from('photo') }]]; }
    return [[]];
  });
  for (const visible of [false, true, false]) {
    shared = visible;
    const res = { json(data) { this.data = data; }, set() {} };
    await getPublicEmergencyProfile({ params: { token: '123456789012345678901234' } }, res);
    assert.equal(Boolean(res.data.data.profile_picture_url), visible);
  }
  assert.equal(reads, 1);
});
