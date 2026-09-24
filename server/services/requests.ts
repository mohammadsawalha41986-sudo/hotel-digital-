import type pg from 'pg';
import {
  DEPARTMENT_LABELS,
  FEEDBACK_TYPE_LABELS,
  LAUNDRY_SERVICE_LABELS,
  REQUEST_TYPE_PREFIX,
  feedbackDepartment,
  type DepartmentCode,
  type RequestType,
} from '../../shared/domain';
import type { CustomField, ModifierGroup } from '../../shared/fields';
import { guestRequestSchema, type GuestIdentity } from '../../shared/hotel';
import { isAvailableNow } from '../../shared/hours';
import { lineAmounts, sumLines, type LineAmounts, type Totals } from '../../shared/pricing';
import { buildWhatsAppMessage, waLink, type MessageLine } from '../../shared/whatsapp';
import { one, q, tx } from '../db';
import { HttpError, badRequest, validationError } from '../errors';
import { getEntityRow, toRecord, type EntityRow } from '../repos/entities';
import type { Hotel } from '../repos/hotels';

export interface StoredLine extends MessageLine {
  item_id?: string;
  unit_price?: number;
  modifiers?: { group_en: string; group_ar: string; options: { en: string; ar: string; price: number }[] }[];
  service?: string;
  note?: string;
}

interface Built {
  type: RequestType;
  department: DepartmentCode;
  title_en: string;
  title_ar: string;
  source_id: string | null;
  lines: StoredLine[];
  facts: { label_en: string; label_ar: string; value: string }[];
  details: Record<string, unknown>;
  notes: string;
  totals: Totals | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  whatsappOverride?: string;
}

const unavailable = (message: string) => new HttpError(409, 'unavailable', message);

function assertOpen(rec: Record<string, unknown>, hotel: Hotel, label: string) {
  const state = isAvailableNow(rec.status_override as string | undefined, rec.hours as never, hotel.profile.timezone);
  if (!state.open) throw unavailable(`${label} is currently closed${state.opensAt ? ` (opens at ${state.opensAt})` : ''}.`);
}

/** Validates answers to admin-defined questions; returns display facts. */
function checkAnswers(fields: CustomField[], answers: Record<string, unknown>) {
  const facts: Built['facts'] = [];
  const clean: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = answers[f.id];
    const empty = v === undefined || v === '' || v === null;
    if (empty) {
      if (f.required && f.type !== 'boolean') errors[`answers.${f.id}`] = `${f.label_en} is required`;
      continue;
    }
    if (f.type === 'select' && !f.options.some((o) => o.value === v)) {
      errors[`answers.${f.id}`] = `Choose a valid option for ${f.label_en}`;
      continue;
    }
    if (f.type === 'number' && typeof v !== 'number') {
      errors[`answers.${f.id}`] = `${f.label_en} must be a number`;
      continue;
    }
    clean[f.id] = v;
    const opt = f.type === 'select' ? f.options.find((o) => o.value === v) : null;
    const shown = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : opt ? opt.en : String(v);
    facts.push({ label_en: f.label_en, label_ar: f.label_ar || f.label_en, value: shown });
  }
  if (Object.keys(errors).length) throw new HttpError(422, 'validation_failed', 'Please answer the required questions', { fields: errors });
  return { facts, clean };
}

async function loadActive(name: Parameters<typeof getEntityRow>[0], hotelId: string, id: string, what: string) {
  const row = await getEntityRow(name, hotelId, id);
  if (!row || !row.is_active) throw unavailable(`This ${what} is no longer available.`);
  return { row, rec: toRecord(name, row) };
}

// ---------------------------------------------------------------------------
// Per-kind builders (all prices re-read from the database)
// ---------------------------------------------------------------------------
async function buildOrder(hotel: Hotel, guest: GuestIdentity, p: Extract<ReturnType<typeof guestRequestSchema.parse>['payload'], { kind: 'ORDER' }>): Promise<Built> {
  const { rec: outlet } = await loadActive('outlets', hotel.id, p.outlet_id, 'outlet');
  const outletName = { en: String(outlet.name_en), ar: String(outlet.name_ar || outlet.name_en) };
  if (!outlet.accepts_orders) throw unavailable(`${outletName.en} does not take orders through the guest app.`);
  if (guest.type === 'EXTERNAL' && outlet.external_orders === false) throw unavailable(`${outletName.en} serves in-house guests only.`);
  assertOpen(outlet, hotel, outletName.en);

  // Items must belong to an active category of an active menu of this outlet.
  const itemIds = [...new Set(p.lines.map((l) => l.item_id))];
  const rows = await q<EntityRow & { menu_active: boolean; cat_active: boolean; menu_data: Record<string, unknown> }>(
    `SELECT i.*, m.is_active AS menu_active, c.is_active AS cat_active, m.data AS menu_data
       FROM menu_items i
       JOIN menu_categories c ON c.id = i.parent_id AND c.hotel_id = i.hotel_id
       JOIN menus m ON m.id = c.parent_id AND m.hotel_id = i.hotel_id
      WHERE i.hotel_id = $1 AND m.parent_id = $2 AND i.id = ANY($3::uuid[])`,
    [hotel.id, outlet.id, itemIds]
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  const vat = { vat_rate: hotel.profile.vat_rate, prices_include_vat: hotel.profile.prices_include_vat };
  const amounts: LineAmounts[] = [];
  const lines: StoredLine[] = [];

  for (const [idx, l] of p.lines.entries()) {
    const row = byId.get(l.item_id);
    if (!row || !row.is_active || !row.menu_active || !row.cat_active) throw unavailable(`An item in your basket is no longer on the menu (line ${idx + 1}).`);
    const item = toRecord('menu_items', row);
    const name = { en: String(item.name_en), ar: String(item.name_ar || item.name_en) };
    if (item.available === false) throw unavailable(`${name.en} is currently unavailable.`);
    const menuHours = (row.menu_data as { hours?: unknown }).hours;
    if (menuHours && !isAvailableNow('auto', menuHours as never, hotel.profile.timezone).open) throw unavailable(`${name.en} is not served at this time.`);

    let unit = Number(item.price ?? 0);
    const chosen: NonNullable<StoredLine['modifiers']> = [];
    const groups = (item.modifiers as ModifierGroup[] | undefined) ?? [];
    for (const key of Object.keys(l.modifiers)) {
      if (!groups.some((g) => g.id === key)) throw badRequest(`Invalid option group for ${name.en}`);
    }
    for (const g of groups) {
      const picked = [...new Set(l.modifiers[g.id] ?? [])];
      if (picked.length < g.min) throw new HttpError(422, 'validation_failed', `Choose ${g.name_en} for ${name.en}`);
      if (picked.length > g.max) throw new HttpError(422, 'validation_failed', `Too many selections for ${g.name_en} on ${name.en}`);
      const opts = picked.map((id) => {
        const o = g.options.find((x) => x.id === id);
        if (!o) throw badRequest(`Invalid option for ${name.en}`);
        if (!o.available) throw unavailable(`${o.name_en} is currently unavailable.`);
        return o;
      });
      if (opts.length) {
        unit += opts.reduce((s, o) => s + o.price, 0);
        chosen.push({ group_en: g.name_en, group_ar: g.name_ar || g.name_en, options: opts.map((o) => ({ en: o.name_en, ar: o.name_ar || o.name_en, price: o.price })) });
      }
    }
    const a = lineAmounts(unit, l.quantity, item.vat_mode as never, vat);
    amounts.push(a);
    const detailEn = [...chosen.map((c) => `${c.group_en}: ${c.options.map((o) => o.en).join(', ')}`), l.note ? `Note: ${l.note}` : ''].filter(Boolean).join(' · ');
    const detailAr = [...chosen.map((c) => `${c.group_ar}: ${c.options.map((o) => o.ar).join('، ')}`), l.note ? `ملاحظة: ${l.note}` : ''].filter(Boolean).join(' · ');
    lines.push({
      item_id: row.id,
      quantity: l.quantity,
      name_en: name.en,
      name_ar: name.ar,
      unit_price: unit,
      amount: a.gross / 100,
      modifiers: chosen,
      note: l.note,
      detail_en: detailEn,
      detail_ar: detailAr,
    });
  }

  return {
    type: 'ORDER',
    department: 'FNB',
    title_en: outletName.en,
    title_ar: outletName.ar,
    source_id: String(outlet.id),
    lines,
    facts: [],
    details: { outlet_type: outlet.type },
    notes: p.notes,
    totals: sumLines(amounts),
    priority: 'NORMAL',
    whatsappOverride: String(outlet.whatsapp ?? ''),
  };
}

async function buildService(hotel: Hotel, guest: GuestIdentity, p: { kind: 'ROOM_SERVICE' | 'HOTEL_SERVICE'; service_id: string; quantity: number; answers: Record<string, unknown>; notes: string }): Promise<Built> {
  const entity = p.kind === 'ROOM_SERVICE' ? 'room_services' : 'hotel_services';
  const { rec } = await loadActive(entity, hotel.id, p.service_id, 'service');
  const name = { en: String(rec.name_en), ar: String(rec.name_ar || rec.name_en) };
  if (rec.available === false) throw unavailable(`${name.en} is currently unavailable.`);
  if (p.kind === 'HOTEL_SERVICE' && rec.requestable === false) throw unavailable(`${name.en} cannot be requested online.`);
  if (p.kind === 'ROOM_SERVICE' && guest.type !== 'IN_HOUSE') throw new HttpError(422, 'validation_failed', 'Room services are available to in-house guests. Please add your room number.', { fields: { 'guest.room': 'Room number required' } });
  assertOpen(rec, hotel, name.en);
  const qty = rec.allow_quantity ? Math.min(p.quantity, Number(rec.max_quantity ?? 10)) : 1;
  const { facts, clean } = checkAnswers((rec.custom_fields as CustomField[]) ?? [], p.answers);
  const price = rec.price == null ? null : Number(rec.price);
  const totals = price ? sumLines([lineAmounts(price, qty, 'inherit', { vat_rate: hotel.profile.vat_rate, prices_include_vat: hotel.profile.prices_include_vat })]) : null;
  return {
    type: p.kind,
    department: rec.department as DepartmentCode,
    title_en: name.en,
    title_ar: name.ar,
    source_id: String(rec.id),
    lines: [{ quantity: qty, name_en: name.en, name_ar: name.ar, amount: totals?.total, unit_price: price ?? undefined }],
    facts,
    details: { answers: clean, category: rec.category },
    notes: p.notes,
    totals,
    priority: rec.category === 'maintenance' ? 'HIGH' : 'NORMAL',
  };
}

async function buildSpa(hotel: Hotel, p: { service_id: string; date: string; time: string; guests: number; answers: Record<string, unknown>; notes: string }): Promise<Built> {
  const { row, rec } = await loadActive('spa_services', hotel.id, p.service_id, 'treatment');
  const name = { en: String(rec.name_en), ar: String(rec.name_ar || rec.name_en) };
  if (rec.available === false || rec.bookable === false) throw unavailable(`${name.en} cannot be booked right now.`);
  const cat = row.parent_id ? await getEntityRow('spa_categories', hotel.id, row.parent_id) : null;
  if (cat && !cat.is_active) throw unavailable(`${name.en} is no longer available.`);
  const maxGuests = Number(rec.max_guests ?? 4);
  if (p.guests > maxGuests) throw new HttpError(422, 'validation_failed', `Maximum ${maxGuests} guests for this treatment`, { fields: { guests: `Maximum ${maxGuests}` } });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: hotel.profile.timezone }).format(new Date());
  if (p.date < today) throw new HttpError(422, 'validation_failed', 'Choose today or a future date', { fields: { date: 'Date is in the past' } });
  const { facts, clean } = checkAnswers((rec.booking_fields as CustomField[]) ?? [], p.answers);
  const price = rec.price == null ? null : Number(rec.price);
  const totals = price ? sumLines([lineAmounts(price, p.guests, 'inherit', { vat_rate: hotel.profile.vat_rate, prices_include_vat: hotel.profile.prices_include_vat })]) : null;
  const duration = rec.duration_minutes ? `${rec.duration_minutes} min` : '';
  return {
    type: 'SPA',
    department: 'SPA',
    title_en: name.en,
    title_ar: name.ar,
    source_id: String(rec.id),
    lines: [{ quantity: p.guests, name_en: name.en, name_ar: name.ar, detail_en: duration, detail_ar: duration ? `${rec.duration_minutes} دقيقة` : '', amount: totals?.total, unit_price: price ?? undefined }],
    facts: [
      { label_en: 'Preferred date', label_ar: 'التاريخ المفضل', value: p.date },
      { label_en: 'Preferred time', label_ar: 'الوقت المفضل', value: p.time },
      { label_en: 'Guests', label_ar: 'عدد الأشخاص', value: String(p.guests) },
      ...facts,
    ],
    details: { date: p.date, time: p.time, guests: p.guests, answers: clean, category_id: row.parent_id },
    notes: p.notes,
    totals,
    priority: 'NORMAL',
  };
}

async function buildLaundry(hotel: Hotel, guest: GuestIdentity, p: { lines: { item_id: string; service: 'wash' | 'dry_clean' | 'press'; quantity: number }[]; express: boolean; pickup: string; notes: string }): Promise<Built> {
  if (guest.type !== 'IN_HOUSE') throw new HttpError(422, 'validation_failed', 'Laundry pickup is available to in-house guests.', { fields: { 'guest.room': 'Room number required' } });
  const ids = [...new Set(p.lines.map((l) => l.item_id))];
  const rows = await q<EntityRow>('SELECT * FROM laundry_items WHERE hotel_id = $1 AND id = ANY($2::uuid[]) AND is_active', [hotel.id, ids]);
  const byId = new Map(rows.map((r) => [r.id, toRecord('laundry_items', r)]));
  const vat = { vat_rate: hotel.profile.vat_rate, prices_include_vat: hotel.profile.prices_include_vat };
  const amounts: LineAmounts[] = [];
  const lines: StoredLine[] = [];
  for (const [idx, l] of p.lines.entries()) {
    const item = byId.get(l.item_id);
    if (!item) throw unavailable(`A laundry item is no longer available (line ${idx + 1}).`);
    const base = item[`${l.service}_price`];
    if (base == null) throw new HttpError(422, 'validation_failed', `${item.name_en} is not offered for ${LAUNDRY_SERVICE_LABELS[l.service].en}`);
    if (p.express && item.express_pct == null) throw new HttpError(422, 'validation_failed', `Express service is not available for ${item.name_en}`);
    const unit = p.express ? Number(base) * (1 + Number(item.express_pct) / 100) : Number(base);
    const a = lineAmounts(Math.round(unit * 100) / 100, l.quantity, 'inherit', vat);
    amounts.push(a);
    lines.push({
      item_id: item.id,
      service: l.service,
      quantity: l.quantity,
      name_en: String(item.name_en),
      name_ar: String(item.name_ar || item.name_en),
      detail_en: LAUNDRY_SERVICE_LABELS[l.service].en + (p.express ? ' · Express' : ''),
      detail_ar: LAUNDRY_SERVICE_LABELS[l.service].ar + (p.express ? ' · سريع' : ''),
      unit_price: Math.round(unit * 100) / 100,
      amount: a.gross / 100,
    });
  }
  return {
    type: 'LAUNDRY',
    department: 'LAUNDRY',
    title_en: p.express ? 'Express laundry pickup' : 'Laundry pickup',
    title_ar: p.express ? 'استلام غسيل سريع' : 'استلام غسيل',
    source_id: null,
    lines,
    facts: [
      { label_en: 'Pickup', label_ar: 'موعد الاستلام', value: p.pickup },
      { label_en: 'Service speed', label_ar: 'سرعة الخدمة', value: p.express ? 'Express' : 'Standard' },
    ],
    details: { pickup: p.pickup, express: p.express },
    notes: p.notes,
    totals: sumLines(amounts),
    priority: p.express ? 'HIGH' : 'NORMAL',
  };
}

function buildFeedback(p: { feedback_type: 'COMPLAINT' | 'SUGGESTION' | 'COMPLIMENT' | 'SERVICE_RECOVERY'; about_department: DepartmentCode | null; subject: string; message: string; urgency: 'LOW' | 'NORMAL' | 'HIGH'; attachment: string }): Built {
  const label = FEEDBACK_TYPE_LABELS[p.feedback_type];
  const facts: Built['facts'] = [{ label_en: 'Subject', label_ar: 'الموضوع', value: p.subject }];
  if (p.about_department) facts.push({ label_en: 'About', label_ar: 'بخصوص', value: DEPARTMENT_LABELS[p.about_department].en });
  facts.push({ label_en: 'Urgency', label_ar: 'الأهمية', value: p.urgency });
  if (p.attachment) facts.push({ label_en: 'Attachment', label_ar: 'مرفق', value: p.attachment });
  return {
    type: 'FEEDBACK',
    department: feedbackDepartment(p.feedback_type, p.urgency),
    title_en: `${label.en}: ${p.subject}`,
    title_ar: `${label.ar}: ${p.subject}`,
    source_id: null,
    lines: [],
    facts,
    details: { feedback_type: p.feedback_type, about_department: p.about_department, subject: p.subject, urgency: p.urgency, attachment: p.attachment },
    notes: p.message,
    totals: null,
    priority: p.urgency,
  };
}

// ---------------------------------------------------------------------------
// Reference numbers & routing
// ---------------------------------------------------------------------------
async function nextReference(client: pg.PoolClient, hotel: Hotel, type: RequestType): Promise<string> {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: hotel.profile.timezone, year: '2-digit', month: '2-digit', day: '2-digit' })
    .format(new Date())
    .replace(/-/g, '');
  const prefix = REQUEST_TYPE_PREFIX[type];
  const row = await one<{ value: number }>(
    `INSERT INTO counters (hotel_id, key, value) VALUES ($1, $2, 1)
     ON CONFLICT (hotel_id, key) DO UPDATE SET value = counters.value + 1 RETURNING value`,
    [hotel.id, `${prefix}-${ymd}`],
    client
  );
  return `${prefix}-${ymd}-${String(row!.value).padStart(3, '0')}`;
}

export async function resolveWhatsApp(hotel: Hotel, dept: DepartmentCode, override?: string): Promise<string> {
  if (override && override.replace(/\D/g, '').length >= 7) return override;
  const rows = await q<{ code: string; whatsapp: string; is_active: boolean }>(
    'SELECT code, whatsapp, is_active FROM departments WHERE hotel_id = $1',
    [hotel.id]
  );
  const find = (code: string | null) => rows.find((r) => r.code === code && r.is_active && r.whatsapp.replace(/\D/g, '').length >= 7)?.whatsapp;
  // Feedback that has no dedicated number escalates to management before the general fallback.
  return find(dept) ?? (dept === 'FEEDBACK' ? find('MANAGEMENT') : undefined) ?? find(hotel.settings.fallback_department) ?? '';
}

export interface CreatedRequest {
  id: string;
  reference: string;
  status: string;
  department: DepartmentCode;
  whatsapp_url: string | null;
  totals: Totals | null;
  created_at: string;
}

export async function createGuestRequest(hotel: Hotel, body: unknown, guestTokenHash: string): Promise<CreatedRequest> {
  const parsed = guestRequestSchema.safeParse(body);
  if (!parsed.success) throw validationError(parsed.error);
  const { guest, payload, lang } = parsed.data;

  if (guest.type === 'EXTERNAL' && !hotel.settings.external_guests_enabled) throw new HttpError(422, 'validation_failed', 'This hotel serves in-house guests only.', { fields: { 'guest.type': 'In-house guests only' } });
  if (hotel.settings.require_phone && !guest.phone) throw new HttpError(422, 'validation_failed', 'Please add a phone number so the team can reach you', { fields: { 'guest.phone': 'Phone is required' } });

  let built: Built;
  switch (payload.kind) {
    case 'ORDER':
      built = await buildOrder(hotel, guest, payload);
      break;
    case 'ROOM_SERVICE':
    case 'HOTEL_SERVICE':
      built = await buildService(hotel, guest, payload);
      break;
    case 'SPA':
      built = await buildSpa(hotel, payload);
      break;
    case 'LAUNDRY':
      built = await buildLaundry(hotel, guest, payload);
      break;
    case 'FEEDBACK':
      built = buildFeedback(payload);
      break;
  }

  const room = guest.type === 'IN_HOUSE' ? guest.room.toUpperCase() : '';
  const whatsappTo = await resolveWhatsApp(hotel, built.department, built.whatsappOverride);

  return tx(async (client) => {
    const reference = await nextReference(client, hotel, built.type);
    const message = buildWhatsAppMessage({
      lang,
      hotel_en: hotel.profile.name_en,
      hotel_ar: hotel.profile.name_ar,
      reference,
      type: built.type,
      department: built.department,
      title_en: built.title_en,
      title_ar: built.title_ar,
      guest_name: guest.name,
      guest_phone: guest.phone,
      guest_type: guest.type,
      room,
      lines: built.lines,
      facts: built.facts,
      notes: built.notes,
      total: built.totals?.total ?? null,
      currency: hotel.profile.currency,
    });
    const row = await one<{ id: string; created_at: Date }>(
      `INSERT INTO requests (hotel_id, reference, type, department, priority, title_en, title_ar, guest_type, guest_name, guest_phone, room, lang,
                             source_id, lines, details, notes, subtotal, vat, total, currency, whatsapp_to, whatsapp_text, guest_token_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING id, created_at`,
      [
        hotel.id,
        reference,
        built.type,
        built.department,
        built.priority,
        built.title_en,
        built.title_ar,
        guest.type,
        guest.name,
        guest.phone,
        room,
        lang,
        built.source_id,
        JSON.stringify(built.lines),
        JSON.stringify({ ...built.details, facts: built.facts }),
        built.notes,
        built.totals?.subtotal ?? null,
        built.totals?.vat ?? null,
        built.totals?.total ?? null,
        hotel.profile.currency,
        whatsappTo,
        message,
        guestTokenHash,
      ],
      client
    );
    await q(
      `INSERT INTO request_events (request_id, hotel_id, to_status, note, is_internal) VALUES ($1,$2,'NEW',$3,false)`,
      [row!.id, hotel.id, 'Request received'],
      client
    );
    return {
      id: row!.id,
      reference,
      status: 'NEW',
      department: built.department,
      whatsapp_url: whatsappTo ? waLink(whatsappTo, message) : null,
      totals: built.totals,
      created_at: row!.created_at.toISOString(),
    };
  });
}
