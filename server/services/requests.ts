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
import { lineAmounts, resolveVatMode, sumLines, toMinor, type LineAmounts, type Totals } from '../../shared/pricing';
import { buildWhatsAppMessage, waLink, type MessageLine } from '../../shared/whatsapp';
import { one, q, tx } from '../db';
import { HttpError, badRequest, validationError } from '../errors';
import { sha256 } from '../security';
import type { EntityName } from '../../shared/entities';
import type { EntityRecord } from '../repos/entities';
import { liveStates, publishedContent } from './publish';
import type { Hotel } from '../repos/hotels';
import type { SessionUser } from '../context';
import type { OrderSource, OrderType } from '../../shared/commerce';
import { identifyGuest } from './guests';

export interface StoredLine extends MessageLine {
  item_id?: string;
  unit_price?: number;
  modifiers?: { group_en: string; group_ar: string; options: { en: string; ar: string; price: number }[] }[];
  service?: string;
  note?: string;
}

/** Structured line data persisted to order_lines (immutable snapshot). */
export interface OrderLineInput {
  item_entity: string;
  item_id: string | null;
  item_code: string;
  category_code: string;
  name_en: string;
  name_ar: string;
  quantity: number;
  unit_price_minor: number;
  modifiers: unknown[];
  service: string;
  vat_mode: 'inclusive' | 'exclusive' | 'exempt';
  vat_rate_bps: number;
  amounts: LineAmounts;
  note: string;
}

interface Built {
  type: RequestType;
  orderLines: OrderLineInput[];
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

function finLine(
  hotel: Hotel,
  base: Omit<OrderLineInput, 'vat_mode' | 'vat_rate_bps' | 'amounts' | 'unit_price_minor' | 'modifiers' | 'service' | 'note'> & Partial<Pick<OrderLineInput, 'modifiers' | 'service' | 'note'>>,
  unitPrice: number,
  vatMode: string | undefined,
  amounts: LineAmounts
): OrderLineInput {
  const settings = { vat_rate: hotel.profile.vat_rate, prices_include_vat: hotel.profile.prices_include_vat };
  const mode = resolveVatMode(vatMode as never, settings);
  return {
    modifiers: [],
    service: '',
    note: '',
    ...base,
    unit_price_minor: toMinor(unitPrice),
    vat_mode: mode,
    vat_rate_bps: mode === 'exempt' ? 0 : Math.round(hotel.profile.vat_rate * 100),
    amounts,
  };
}

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

/**
 * The published catalog for pricing an order: prices, names and structure
 * are exactly what guests were shown. Live state is enforced on top — an item
 * hidden, archived, deleted or marked unavailable since the last publish
 * cannot be ordered.
 */
class OrderCatalog {
  private constructor(
    private hotelId: string,
    private byId: Map<string, Map<string, EntityRecord>>
  ) {}

  static async load(hotelId: string) {
    const content = await publishedContent(hotelId);
    const byId = new Map<string, Map<string, EntityRecord>>();
    for (const [name, rows] of Object.entries(content.catalog)) byId.set(name, new Map(rows.map((r) => [r.id, r])));
    return new OrderCatalog(hotelId, byId);
  }

  find(name: EntityName, id: string | null | undefined) {
    return id ? this.byId.get(name)?.get(id) : undefined;
  }

  /** Published records that are still live, with live availability/status applied. Missing ids are absent from the result. */
  async live(name: EntityName, ids: string[]): Promise<Map<string, EntityRecord>> {
    const wanted = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/i.test(id) && this.find(name, id));
    const states = await liveStates(this.hotelId, name, wanted);
    const out = new Map<string, EntityRecord>();
    for (const id of wanted) {
      const st = states.get(id);
      if (!st || !st.is_active || st.archived) continue;
      const rec = { ...this.find(name, id)! };
      if (st.available !== null && 'available' in rec) rec.available = st.available;
      if (st.status_override !== null && 'status_override' in rec) rec.status_override = st.status_override;
      out.set(id, rec);
    }
    return out;
  }

  async require(name: EntityName, id: string, what: string): Promise<EntityRecord> {
    const rec = (await this.live(name, [id])).get(id);
    if (!rec) throw unavailable(`This ${what} is no longer available.`);
    return rec;
  }
}

// ---------------------------------------------------------------------------
// Per-kind builders (prices from the published catalog, never from the client)
// ---------------------------------------------------------------------------
async function buildOrder(hotel: Hotel, guest: GuestIdentity, p: Extract<ReturnType<typeof guestRequestSchema.parse>['payload'], { kind: 'ORDER' }>, cat: OrderCatalog): Promise<Built> {
  const outlet = await cat.require('outlets', p.outlet_id, 'outlet');
  const outletName = { en: String(outlet.name_en), ar: String(outlet.name_ar || outlet.name_en) };
  if (!outlet.accepts_orders) throw unavailable(`${outletName.en} does not take orders through the guest app.`);
  if (guest.type === 'EXTERNAL' && outlet.external_orders === false) throw unavailable(`${outletName.en} serves in-house guests only.`);
  assertOpen(outlet, hotel, outletName.en);

  // Items must belong to a live category of a live menu of this outlet.
  const itemIds = p.lines.map((l) => l.item_id);
  const items = await cat.live('menu_items', itemIds);
  const catIds = [...items.values()].map((i) => i.parent_id!).filter(Boolean);
  const categories = await cat.live('menu_categories', catIds);
  const menus = await cat.live('menus', [...categories.values()].map((c) => c.parent_id!).filter(Boolean));
  const vat = { vat_rate: hotel.profile.vat_rate, prices_include_vat: hotel.profile.prices_include_vat };
  const amounts: LineAmounts[] = [];
  const lines: StoredLine[] = [];
  const orderLines: OrderLineInput[] = [];

  for (const [idx, l] of p.lines.entries()) {
    const item = items.get(l.item_id);
    const category = item ? categories.get(item.parent_id ?? '') : undefined;
    const menu = category ? menus.get(category.parent_id ?? '') : undefined;
    if (!item || !category || !menu || menu.parent_id !== outlet.id) throw unavailable(`An item in your basket is no longer on the menu (line ${idx + 1}).`);
    const name = { en: String(item.name_en), ar: String(item.name_ar || item.name_en) };
    if (item.available === false) throw unavailable(`${name.en} is currently unavailable.`);
    const menuHours = menu.hours as { mode?: string } | undefined;
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
        unit += opts.reduce((sum, o) => sum + o.price, 0);
        chosen.push({ group_en: g.name_en, group_ar: g.name_ar || g.name_en, options: opts.map((o) => ({ en: o.name_en, ar: o.name_ar || o.name_en, price: o.price })) });
      }
    }
    const a = lineAmounts(unit, l.quantity, item.vat_mode as never, vat);
    amounts.push(a);
    orderLines.push(
      finLine(hotel, { item_entity: 'menu_items', item_id: item.id, item_code: String(item.code ?? ''), category_code: String(category.code ?? ''), name_en: name.en, name_ar: name.ar, quantity: l.quantity, modifiers: chosen, note: l.note }, unit, item.vat_mode as string, a)
    );
    const detailEn = [...chosen.map((c) => `${c.group_en}: ${c.options.map((o) => o.en).join(', ')}`), l.note ? `Note: ${l.note}` : ''].filter(Boolean).join(' · ');
    const detailAr = [...chosen.map((c) => `${c.group_ar}: ${c.options.map((o) => o.ar).join('، ')}`), l.note ? `ملاحظة: ${l.note}` : ''].filter(Boolean).join(' · ');
    lines.push({ item_id: item.id, quantity: l.quantity, name_en: name.en, name_ar: name.ar, unit_price: unit, amount: a.gross / 100, modifiers: chosen, note: l.note, detail_en: detailEn, detail_ar: detailAr });
  }

  return {
    type: 'ORDER',
    orderLines,
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

async function buildService(hotel: Hotel, guest: GuestIdentity, p: { kind: 'ROOM_SERVICE' | 'HOTEL_SERVICE'; service_id: string; quantity: number; answers: Record<string, unknown>; notes: string }, cat: OrderCatalog): Promise<Built> {
  const entity = p.kind === 'ROOM_SERVICE' ? 'room_services' : 'hotel_services';
  const rec = await cat.require(entity, p.service_id, 'service');
  const name = { en: String(rec.name_en), ar: String(rec.name_ar || rec.name_en) };
  if (rec.available === false) throw unavailable(`${name.en} is currently unavailable.`);
  if (p.kind === 'HOTEL_SERVICE' && rec.requestable === false) throw unavailable(`${name.en} cannot be requested online.`);
  if (p.kind === 'ROOM_SERVICE' && guest.type !== 'IN_HOUSE') throw new HttpError(422, 'validation_failed', 'Room services are available to in-house guests. Please add your room number.', { fields: { 'guest.room': 'Room number required' } });
  assertOpen(rec, hotel, name.en);
  const qty = rec.allow_quantity ? Math.min(p.quantity, Number(rec.max_quantity ?? 10)) : 1;
  const { facts, clean } = checkAnswers((rec.custom_fields as CustomField[]) ?? [], p.answers);
  const price = rec.price == null ? null : Number(rec.price);
  const svcAmounts = lineAmounts(price ?? 0, qty, 'inherit', { vat_rate: hotel.profile.vat_rate, prices_include_vat: hotel.profile.prices_include_vat });
  const totals = price ? sumLines([svcAmounts]) : null;
  return {
    type: p.kind,
    orderLines: [
      finLine(hotel, { item_entity: entity, item_id: rec.id, item_code: String(rec.code ?? ''), category_code: String(rec.category ?? '').toUpperCase(), name_en: name.en, name_ar: name.ar, quantity: qty }, price ?? 0, 'inherit', svcAmounts),
    ],
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

async function buildSpa(hotel: Hotel, p: { service_id: string; date: string; time: string; guests: number; answers: Record<string, unknown>; notes: string }, cat: OrderCatalog): Promise<Built> {
  const rec = await cat.require('spa_services', p.service_id, 'treatment');
  const name = { en: String(rec.name_en), ar: String(rec.name_ar || rec.name_en) };
  if (rec.available === false || rec.bookable === false) throw unavailable(`${name.en} cannot be booked right now.`);
  const category = rec.parent_id ? (await cat.live('spa_categories', [rec.parent_id])).get(rec.parent_id) : undefined;
  if (!category) throw unavailable(`${name.en} is no longer available.`);
  const maxGuests = Number(rec.max_guests ?? 4);
  if (p.guests > maxGuests) throw new HttpError(422, 'validation_failed', `Maximum ${maxGuests} guests for this treatment`, { fields: { guests: `Maximum ${maxGuests}` } });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: hotel.profile.timezone }).format(new Date());
  if (p.date < today) throw new HttpError(422, 'validation_failed', 'Choose today or a future date', { fields: { date: 'Date is in the past' } });
  const { facts, clean } = checkAnswers((rec.booking_fields as CustomField[]) ?? [], p.answers);
  const price = rec.price == null ? null : Number(rec.price);
  const spaAmounts = lineAmounts(price ?? 0, p.guests, 'inherit', { vat_rate: hotel.profile.vat_rate, prices_include_vat: hotel.profile.prices_include_vat });
  const totals = price ? sumLines([spaAmounts]) : null;
  const duration = rec.duration_minutes ? `${rec.duration_minutes} min` : '';
  return {
    type: 'SPA',
    orderLines: [
      finLine(hotel, { item_entity: 'spa_services', item_id: rec.id, item_code: String(rec.code ?? ''), category_code: String(category.code ?? ''), name_en: name.en, name_ar: name.ar, quantity: p.guests }, price ?? 0, 'inherit', spaAmounts),
    ],
    department: (rec.department as DepartmentCode) || 'SPA',
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
    details: { date: p.date, time: p.time, guests: p.guests, answers: clean, category_id: rec.parent_id },
    notes: p.notes,
    totals,
    priority: 'NORMAL',
  };
}

async function buildLaundry(hotel: Hotel, guest: GuestIdentity, p: { lines: { item_id: string; service: 'wash' | 'dry_clean' | 'press'; quantity: number }[]; express: boolean; pickup: string; notes: string }, cat: OrderCatalog): Promise<Built> {
  if (guest.type !== 'IN_HOUSE') throw new HttpError(422, 'validation_failed', 'Laundry pickup is available to in-house guests.', { fields: { 'guest.room': 'Room number required' } });
  const items = await cat.live('laundry_items', p.lines.map((l) => l.item_id));
  const categories = await cat.live('laundry_categories', [...items.values()].map((i) => i.parent_id!).filter(Boolean));
  const vat = { vat_rate: hotel.profile.vat_rate, prices_include_vat: hotel.profile.prices_include_vat };
  const amounts: LineAmounts[] = [];
  const lines: StoredLine[] = [];
  const orderLines: OrderLineInput[] = [];
  for (const [idx, l] of p.lines.entries()) {
    const item = items.get(l.item_id);
    const category = item ? categories.get(item.parent_id ?? '') : undefined;
    if (!item || !category || item.available === false) throw unavailable(`A laundry item is no longer available (line ${idx + 1}).`);
    const base = item[`${l.service}_price`];
    if (base == null) throw new HttpError(422, 'validation_failed', `${item.name_en} is not offered for ${LAUNDRY_SERVICE_LABELS[l.service].en}`);
    if (p.express && item.express_pct == null) throw new HttpError(422, 'validation_failed', `Express service is not available for ${item.name_en}`);
    const unit = Math.round((p.express ? Number(base) * (1 + Number(item.express_pct) / 100) : Number(base)) * 100) / 100;
    const a = lineAmounts(unit, l.quantity, 'inherit', vat);
    amounts.push(a);
    orderLines.push(
      finLine(hotel, { item_entity: 'laundry_items', item_id: item.id, item_code: String(item.code ?? ''), category_code: String(category.code ?? ''), name_en: String(item.name_en), name_ar: String(item.name_ar || item.name_en), quantity: l.quantity, service: l.service + (p.express ? ':express' : '') }, unit, 'inherit', a)
    );
    lines.push({
      item_id: item.id,
      service: l.service,
      quantity: l.quantity,
      name_en: String(item.name_en),
      name_ar: String(item.name_ar || item.name_en),
      detail_en: LAUNDRY_SERVICE_LABELS[l.service].en + (p.express ? ' · Express' : ''),
      detail_ar: LAUNDRY_SERVICE_LABELS[l.service].ar + (p.express ? ' · سريع' : ''),
      unit_price: unit,
      amount: a.gross / 100,
    });
  }
  return {
    type: 'LAUNDRY',
    orderLines,
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
  if (p.about_department) facts.push({ label_en: 'About', label_ar: 'بخصوص', value: DEPARTMENT_LABELS[p.about_department]?.en ?? p.about_department });
  facts.push({ label_en: 'Urgency', label_ar: 'الأهمية', value: p.urgency });
  if (p.attachment) facts.push({ label_en: 'Attachment', label_ar: 'مرفق', value: p.attachment });
  return {
    type: 'FEEDBACK',
    orderLines: [],
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

const ORDER_TYPE_OF: Record<RequestType, OrderType> = {
  ORDER: 'FNB',
  ROOM_SERVICE: 'ROOM_SERVICE',
  HOTEL_SERVICE: 'GUEST_SERVICE',
  LAUNDRY: 'LAUNDRY',
  SPA: 'SPA',
  FEEDBACK: 'OTHER',
};

export interface CreateOptions {
  /** Channel. Guests: derived from their session (QR vs portal). Staff: ADMIN / MANUAL / WHATSAPP. */
  source?: OrderSource;
  /** Staff member entering the order on the guest's behalf. */
  actor?: SessionUser | null;
  guestExtra?: { email?: string; stay_reference?: string; check_in?: string | null; check_out?: string | null };
  /** Client-chosen key (one per checkout attempt): retries return the original request. */
  idempotencyKey?: string | null;
}

/** The response of an already-created request, for idempotent replays. */
async function replayCreated(hotelId: string, tokenHash: string, key: string, bodyHash: string): Promise<CreatedRequest | null> {
  const r = await one<{ id: string; reference: string; status: string; department: DepartmentCode; whatsapp_to: string; whatsapp_text: string; subtotal: number | null; vat: number | null; total: number | null; created_at: Date; idempotency_hash: string }>(
    `SELECT id, reference, status, department, whatsapp_to, whatsapp_text, subtotal, vat, total, created_at, idempotency_hash
       FROM requests WHERE hotel_id = $1 AND guest_token_hash = $2 AND idempotency_key = $3`,
    [hotelId, tokenHash, key]
  );
  if (!r) return null;
  if (r.idempotency_hash !== bodyHash) throw new HttpError(422, 'idempotency_mismatch', 'This checkout was already submitted with different details. Please start a new order.');
  return {
    id: r.id,
    reference: r.reference,
    status: r.status,
    department: r.department,
    whatsapp_url: r.whatsapp_to ? waLink(r.whatsapp_to, r.whatsapp_text) : null,
    totals: r.total == null ? null : { subtotal: r.subtotal ?? 0, vat: r.vat ?? 0, total: r.total },
    created_at: r.created_at.toISOString(),
  };
}

/**
 * Creates an order/request: validated and priced server-side, linked to the
 * guest profile and stay, with immutable order lines and a CREATED event.
 */
export async function createGuestRequest(hotel: Hotel, body: unknown, guestTokenHash: string | null, opts: CreateOptions = {}): Promise<CreatedRequest> {
  const parsed = guestRequestSchema.safeParse(body);
  if (!parsed.success) throw validationError(parsed.error);
  const { guest, payload, lang } = parsed.data;
  const idem = opts.idempotencyKey && guestTokenHash ? { key: opts.idempotencyKey, hash: sha256(JSON.stringify(parsed.data)) } : null;
  if (idem) {
    const prior = await replayCreated(hotel.id, guestTokenHash!, idem.key, idem.hash);
    if (prior) return prior;
  }

  if (guest.type === 'EXTERNAL' && !hotel.settings.external_guests_enabled) throw new HttpError(422, 'validation_failed', 'This hotel serves in-house guests only.', { fields: { 'guest.type': 'In-house guests only' } });
  if (hotel.settings.require_phone && !guest.phone) throw new HttpError(422, 'validation_failed', 'Please add a phone number so the team can reach you', { fields: { 'guest.phone': 'Phone is required' } });

  const cat = await OrderCatalog.load(hotel.id);
  let built: Built;
  switch (payload.kind) {
    case 'ORDER':
      built = await buildOrder(hotel, guest, payload, cat);
      break;
    case 'ROOM_SERVICE':
    case 'HOTEL_SERVICE':
      built = await buildService(hotel, guest, payload, cat);
      break;
    case 'SPA':
      built = await buildSpa(hotel, payload, cat);
      break;
    case 'LAUNDRY':
      built = await buildLaundry(hotel, guest, payload, cat);
      break;
    case 'FEEDBACK':
      built = buildFeedback(payload);
      break;
  }

  const room = guest.type === 'IN_HOUSE' ? guest.room.toUpperCase() : '';
  const whatsappTo = await resolveWhatsApp(hotel, built.department, built.whatsappOverride);
  const isCommercial = (built.totals?.total ?? 0) > 0;

  try {
    return await insertGuestRequest();
  } catch (e) {
    // Two identical submits raced past the replay check: the unique index let
    // exactly one commit; the other returns that same request.
    if (idem && (e as { code?: string; constraint?: string }).constraint === 'requests_idempotency_uq') {
      const prior = await replayCreated(hotel.id, guestTokenHash!, idem.key, idem.hash);
      if (prior) return prior;
    }
    throw e;
  }

  function insertGuestRequest() {
  return tx(async (client) => {
    let source: OrderSource = opts.source ?? 'GUEST_PORTAL';
    if (!opts.source && guestTokenHash) {
      const s = await one<{ entry: string }>(`SELECT entry FROM guest_sessions WHERE hotel_id = $1 AND token_hash = $2 ORDER BY created_at LIMIT 1`, [hotel.id, guestTokenHash], client);
      if (s?.entry === 'QR') source = 'QR';
    }
    const who = await identifyGuest(client, hotel, { ...guest, lang, ...opts.guestExtra }, guestTokenHash, source);
    const reference = await nextReference(client, hotel, built.type);
    const deptRow = await one<{ name_en: string; name_ar: string }>(`SELECT name_en, name_ar FROM departments WHERE hotel_id = $1 AND code = $2`, [hotel.id, built.department], client);
    const message = buildWhatsAppMessage({
      department_name: deptRow ? { en: deptRow.name_en, ar: deptRow.name_ar } : undefined,
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
                             source_id, lines, details, notes, subtotal, vat, total, currency, whatsapp_to, whatsapp_text, guest_token_hash,
                             guest_id, stay_id, hotel_name, source, order_type, is_commercial, financial_status, created_by,
                             idempotency_key, idempotency_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33)
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
        who.guest.phone || guest.phone,
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
        guestTokenHash ?? '',
        who.guest.id,
        who.stayId,
        hotel.profile.name_en,
        source,
        ORDER_TYPE_OF[built.type],
        isCommercial,
        isCommercial ? 'AWAITING_ELIGIBILITY' : 'NOT_APPLICABLE',
        opts.actor?.id ?? null,
        idem?.key ?? null,
        idem?.hash ?? null,
      ],
      client
    );
    for (const [i, l] of built.orderLines.entries()) {
      await q(
        `INSERT INTO order_lines (hotel_id, request_id, line_no, item_entity, item_id, item_code, category_code, name_en, name_ar, quantity,
                                  unit_price_minor, modifiers, service, vat_mode, vat_rate_bps, discount_minor, net_minor, vat_minor, gross_minor, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,0,$16,$17,$18,$19)`,
        [
          hotel.id, row!.id, i + 1, l.item_entity, l.item_id, l.item_code, l.category_code, l.name_en, l.name_ar, l.quantity,
          l.unit_price_minor, JSON.stringify(l.modifiers), l.service, l.vat_mode, l.vat_rate_bps, l.amounts.net, l.amounts.vat, l.amounts.gross, l.note,
        ],
        client
      );
    }
    const actorName = opts.actor?.name ?? guest.name;
    await q(
      `INSERT INTO request_events (request_id, hotel_id, user_id, to_status, note, is_internal, event_type, actor_type, actor_name)
       VALUES ($1,$2,$3,'NEW',$4,false,'CREATED',$5,$6)`,
      [row!.id, hotel.id, opts.actor?.id ?? null, opts.actor ? `Entered by staff (${source.toLowerCase()})` : 'Request received', opts.actor ? 'staff' : 'guest', actorName],
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
}
