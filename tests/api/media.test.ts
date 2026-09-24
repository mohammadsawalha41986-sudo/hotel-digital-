import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after, before, describe, test } from 'node:test';
import { Client, ids, login, q, setup, teardown, users } from './helpers';

before(setup);
after(async () => {
  fs.rmSync('./.test-uploads', { recursive: true, force: true });
  await teardown();
});

const H = () => `/admin/hotels/${ids.royal}`;

describe('media uploads', () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000008000000080806000000c40fbe8b0000000970485973000003e8000003e801b57b526b0000001249444154189563a85231f98f0f338c0c0500c19d74419121225d0000000049454e44ae426082', 'hex');

  test('valid images are stored, served and recorded', async () => {
    const admin = await login(users.admin);
    const fd = new FormData();
    fd.append('file', new File([png], 'dot.png', { type: 'image/png' }));
    const r = await admin.req('POST', `${H()}/media/upload`, fd);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.match(r.body.url, new RegExp(`^/media/${ids.royal}/[0-9a-f-]+-o\\.webp$`), 'raster images are re-encoded to WebP');
    const list = (await admin.get(`${H()}/media`)).body.media;
    assert.ok(list.some((m: any) => m.url === r.body.url));
  });

  test('SVG, disguised and oversized files are rejected', async () => {
    const admin = await login(users.admin);
    const svg = new FormData();
    svg.append('file', new File(['<svg onload="alert(1)"/>'], 'x.svg', { type: 'image/svg+xml' }));
    assert.equal((await admin.req('POST', `${H()}/media/upload`, svg)).status, 422, 'scripted SVG is refused');
    const fake = new FormData();
    fake.append('file', new File(['#!/bin/sh\necho pwned'], 'photo.jpg', { type: 'image/jpeg' }));
    assert.equal((await admin.req('POST', `${H()}/media/upload`, fake)).status, 415);
    const big = new FormData();
    big.append('file', new File([Buffer.concat([png, Buffer.alloc(9 * 1024 * 1024)])], 'big.png', { type: 'image/png' }));
    assert.equal((await admin.req('POST', `${H()}/media/upload`, big)).status, 413);
  });

  test('guest attachments are image-only and need a guest session', async () => {
    const g = new Client();
    const fd = new FormData();
    fd.append('file', new File([png], 'issue.png', { type: 'image/png' }));
    const r = await g.req('POST', '/public/hotels/swiss-flora-royal/uploads', fd);
    assert.equal(r.status, 201);
    const pdf = new FormData();
    pdf.append('file', new File([Buffer.from('%PDF-1.4 test')], 'x.pdf', { type: 'application/pdf' }));
    assert.equal((await g.req('POST', '/public/hotels/swiss-flora-royal/uploads', pdf)).status, 415);
    await q('SELECT 1');
  });
});
