import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
// @ts-expect-error untyped dev dependency
import S3rver from 's3rver';
import { createStorage, isSafeKey } from '../../server/storage';

/**
 * The S3 driver against a local S3-compatible server (the same protocol as
 * Railway Buckets / R2 / S3), so multi-replica media storage is exercised
 * without cloud credentials.
 */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's3rver-'));
let server: any;
let endpoint = '';

before(async () => {
  server = new S3rver({ port: 0, address: '127.0.0.1', silent: true, directory: dir, configureBuckets: [{ name: 'media-test' }] });
  const { port } = await server.run();
  endpoint = `http://127.0.0.1:${port}`;
});
after(async () => {
  await server?.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const HOTEL = '11111111-2222-3333-4444-555555555555';

describe('S3 object storage driver', () => {
  test('put, get, remove and ping against an S3-compatible bucket', async () => {
    const s = createStorage({ STORAGE_DRIVER: 's3', BUCKET: 'media-test', ENDPOINT: endpoint, ACCESS_KEY_ID: 'S3RVER', SECRET_ACCESS_KEY: 'S3RVER', S3_PATH_STYLE: '1' });
    assert.equal(s.driver, 's3');
    await s.ping();
    const key = `${HOTEL}/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-o.webp`;
    await s.put(key, Buffer.from('RIFF....WEBP'), 'image/webp');
    const got = await s.get(key);
    assert.equal(got?.body.toString(), 'RIFF....WEBP');
    assert.equal(got?.contentType, 'image/webp');
    await s.remove([key]);
    assert.equal(await s.get(key), null);
  });

  test('bad credentials or a missing bucket fail the readiness ping', async () => {
    const s = createStorage({ STORAGE_DRIVER: 's3', BUCKET: 'no-such-bucket', ENDPOINT: endpoint, ACCESS_KEY_ID: 'S3RVER', SECRET_ACCESS_KEY: 'S3RVER', S3_PATH_STYLE: '1' });
    await assert.rejects(() => s.ping());
  });

  test('keys are confined to <hotel uuid>/<file>', () => {
    assert.ok(isSafeKey(`${HOTEL}/x-o.webp`));
    for (const bad of ['../etc/passwd', `${HOTEL}/../x`, `${HOTEL}/a/b.png`, 'x.png', `${HOTEL}/`]) assert.equal(isSafeKey(bad), false, bad);
  });

  test('the local driver is the default without bucket settings', () => {
    assert.equal(createStorage({}).driver, 'local');
    assert.equal(createStorage({ BUCKET: 'b', ENDPOINT: 'http://x', STORAGE_DRIVER: 'local' }).driver, 'local');
    assert.throws(() => createStorage({ STORAGE_DRIVER: 's3' }));
  });
});
