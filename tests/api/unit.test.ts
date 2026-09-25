import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { feedbackDepartment, roleCan, roleSeesDepartment, STATUS_TRANSITIONS } from '../../shared/domain';
import { evaluateHours } from '../../shared/hours';
import { dateTime, fieldValue, localDateTime, num, time } from '../../server/services/excel/cells';
import { stableJson } from '../../server/services/excel/state';
import { templateForSheet } from '../../server/services/excel/templates';
import { lineAmounts, sumLines } from '../../shared/pricing';
import { guestIdentitySchema } from '../../shared/hotel';
import { buildEntitySchema } from '../../shared/fields';
import { ENTITIES } from '../../shared/entities';

describe('pricing', () => {
  const vat = { vat_rate: 15, prices_include_vat: true };
  test('inclusive VAT splits the listed price', () => {
    assert.deepEqual(sumLines([lineAmounts(115, 1, 'inherit', vat)]), { subtotal: 100, vat: 15, total: 115 });
  });
  test('exclusive and exempt modes', () => {
    assert.deepEqual(sumLines([lineAmounts(100, 2, 'exclusive', vat)]), { subtotal: 200, vat: 30, total: 230 });
    assert.deepEqual(sumLines([lineAmounts(100, 2, 'exempt', vat)]), { subtotal: 200, vat: 0, total: 200 });
  });
  test('no floating point drift on many lines', () => {
    const lines = Array.from({ length: 10 }, () => lineAmounts(0.1, 3, 'exempt', vat));
    assert.equal(sumLines(lines).total, 3);
  });
});

describe('opening hours', () => {
  const tz = 'UTC';
  const at = (iso: string) => new Date(iso);
  const hours = { mode: 'schedule' as const, days: { mon: [{ open: '18:00', close: '02:00' }], tue: [{ open: '07:00', close: '11:00' }] }, note_en: '', note_ar: '' };
  test('ranges crossing midnight stay open after 00:00', () => {
    assert.equal(evaluateHours(hours, tz, at('2026-09-21T23:30:00Z')).open, true); // Monday
    assert.equal(evaluateHours(hours, tz, at('2026-09-22T01:30:00Z')).open, true); // Tuesday early
    assert.equal(evaluateHours(hours, tz, at('2026-09-22T03:00:00Z')).open, false);
  });
  test('reports next opening time', () => {
    assert.deepEqual(evaluateHours(hours, tz, at('2026-09-22T05:00:00Z')), { open: false, opensAt: '07:00' });
  });
  test('always-open mode', () => {
    assert.equal(evaluateHours({ mode: 'always', days: {}, note_en: '', note_ar: '' }, tz).open, true);
  });
});

describe('domain rules', () => {
  test('role permissions', () => {
    assert.ok(roleCan('FNB', 'dining'));
    assert.ok(!roleCan('FNB', 'hotel'));
    assert.ok(roleSeesDepartment('FRONT_OFFICE', 'CONCIERGE'));
    assert.ok(!roleSeesDepartment('SPA', 'FNB'));
    assert.ok(roleCan('MANAGEMENT', 'audit'));
  });
  test('status transitions have no exits from terminal states', () => {
    assert.deepEqual(STATUS_TRANSITIONS.COMPLETED, []);
    assert.ok(STATUS_TRANSITIONS.NEW.includes('ACCEPTED'));
  });
  test('feedback routing', () => {
    assert.equal(feedbackDepartment('COMPLAINT', 'LOW'), 'MANAGEMENT');
    assert.equal(feedbackDepartment('SUGGESTION', 'NORMAL'), 'FEEDBACK');
    assert.equal(feedbackDepartment('SUGGESTION', 'HIGH'), 'MANAGEMENT');
  });
  test('guest identity rules', () => {
    assert.ok(!guestIdentitySchema.safeParse({ type: 'IN_HOUSE', name: 'Sara', phone: '', room: '' }).success);
    assert.ok(guestIdentitySchema.safeParse({ type: 'EXTERNAL', name: 'Sara', phone: '+966 55 000 1111', room: '' }).success);
    assert.ok(!guestIdentitySchema.safeParse({ type: 'EXTERNAL', name: 'Sara', phone: 'call me', room: '' }).success);
  });
});

describe('excel cell coercion', () => {
  const f = (key: string) => ENTITIES.menu_items.fields.find((x) => x.key === key)!;
  test('tags, booleans and numbers typed by hand (English, Arabic, Arabic-Indic digits)', () => {
    assert.deepEqual(fieldValue(f('dietary'), 'Vegan, gluten_free'), { value: ['vegan', 'gluten_free'] });
    assert.deepEqual(fieldValue(f('dietary'), 'نباتي'), { value: ['vegetarian'] }, 'Arabic option labels are accepted');
    assert.ok(fieldValue(f('price'), 'abc').error);
    assert.deepEqual(fieldValue(f('featured'), 'نعم'), { value: true });
    assert.deepEqual(num('١٢٫٥'), { value: 12.5 });
    assert.deepEqual(num('SAR 1,250'), { value: 1250 });
  });
  test('times from text, AM/PM and Excel time cells', () => {
    assert.deepEqual(time('7:05'), { value: '07:05' });
    assert.deepEqual(time('4:30 pm'), { value: '16:30' });
    assert.deepEqual(time(0.75), { value: '18:00' });
    assert.deepEqual(time('24:00'), { value: '00:00' });
    assert.ok(time('25:00').error);
  });
  test('dates are hotel-local wall-clock time and export back unchanged', () => {
    const v = dateTime('2027-03-01 14:00', 'Asia/Riyadh');
    assert.deepEqual(v, { value: '2027-03-01T11:00:00.000Z' });
    assert.equal(localDateTime(v.value!, 'Asia/Riyadh'), '2027-03-01 14:00');
    assert.deepEqual(dateTime('2027-03-01T11:00:00Z', 'Asia/Riyadh'), { value: '2027-03-01T11:00:00.000Z' }, 'explicit zones are respected');
    assert.ok(dateTime('01/03/2027', 'UTC').error);
  });
  test('media URLs reject non-http schemes', () => {
    assert.ok(fieldValue(f('image'), 'javascript:alert(1)').error);
    assert.deepEqual(fieldValue(f('gallery'), 'https://a.test/1.jpg | https://a.test/2.jpg'), { value: ['https://a.test/1.jpg', 'https://a.test/2.jpg'] });
    const schema = buildEntitySchema(ENTITIES.offers.fields);
    assert.ok(schema.safeParse({ title_en: 'x', image: '/media/abc/def.png' }).success);
  });
  test('sheets are recognised by name, title or number prefix; states compare key-order independently', () => {
    assert.equal(templateForSheet('07 F&B Items')?.key, 'fnb_items');
    assert.equal(templateForSheet('offers & packages')?.key, 'offers');
    assert.equal(templateForSheet('Random'), undefined);
    assert.equal(stableJson({ b: 1, a: { d: 2, c: 3 } }), stableJson({ a: { c: 3, d: 2 }, b: 1 }));
  });
});

describe('field defaults', () => {
  test('tag fields honour their declared default (offers show on the homepage by default)', () => {
    const parsed = buildEntitySchema(ENTITIES.offers.fields).parse({ title_en: 'Brunch' });
    assert.deepEqual(parsed.placement, ['home']);
  });
});
