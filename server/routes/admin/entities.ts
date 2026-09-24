import { Hono } from 'hono';
import { z } from 'zod';
import { ENTITIES, isEntityName, type EntityName } from '../../../shared/entities';
import { audit, diff } from '../../audit';
import { requireHotelAccess } from '../../auth';
import { clientIp, type AppEnv, type Ctx } from '../../context';
import { tx } from '../../db';
import { badRequest, notFound, validationError } from '../../errors';
import { createEntity, deleteEntity, listEntities, reorderEntities, updateEntity } from '../../repos/entities';

export const entityRoutes = new Hono<AppEnv>();

function resolve(c: Ctx): { hid: string; name: EntityName } {
  const name = c.req.param('entity') ?? '';
  if (!isEntityName(name)) throw notFound('Unknown content type');
  return { hid: c.req.param('hid')!, name };
}

const PRICE_KEYS = ['price', 'wash_price', 'dry_clean_price', 'press_price', 'express_pct', 'modifiers'];

function summarize(name: EntityName, action: string, rec: Record<string, unknown>, changed?: string[]) {
  const title = String(rec[`${ENTITIES[name].titleField}_en`] ?? rec.id);
  const priceChange = changed?.some((k) => PRICE_KEYS.includes(k)) ? ' (price change)' : '';
  return `${action} ${ENTITIES[name].label.singular} "${title}"${changed ? `: ${changed.join(', ')}` : ''}${priceChange}`;
}

entityRoutes.get('/:hid/entities/:entity', async (c) => {
  const { hid, name } = resolve(c);
  requireHotelAccess(c, hid, ENTITIES[name].module);
  const parent = c.req.query('parent_id');
  const rows = await listEntities(name, hid, parent ? { parentId: parent } : {});
  return c.json({ items: rows });
});

entityRoutes.post('/:hid/entities/:entity', async (c) => {
  const { hid, name } = resolve(c);
  const u = requireHotelAccess(c, hid, ENTITIES[name].module);
  const input = await c.req.json().catch(() => {
    throw badRequest('Invalid JSON body');
  });
  const rec = await tx(async (client) => {
    const created = await createEntity(name, hid, input, client);
    await audit({ hotelId: hid, user: u, action: 'create', entity: name, entityId: created.id, summary: summarize(name, 'Created', created), after: created, ip: clientIp(c) }, client);
    return created;
  });
  return c.json(rec, 201);
});

entityRoutes.patch('/:hid/entities/:entity/:id', async (c) => {
  const { hid, name } = resolve(c);
  const u = requireHotelAccess(c, hid, ENTITIES[name].module);
  const patch = await c.req.json().catch(() => {
    throw badRequest('Invalid JSON body');
  });
  const result = await tx(async (client) => {
    const { before, after } = await updateEntity(name, hid, c.req.param('id'), patch, client);
    const d = diff(before, after);
    const changed = Object.keys(d.after ?? {});
    if (changed.length) {
      await audit({ hotelId: hid, user: u, action: 'update', entity: name, entityId: after.id, summary: summarize(name, 'Updated', after, changed), ...d, ip: clientIp(c) }, client);
    }
    return after;
  });
  return c.json(result);
});

entityRoutes.delete('/:hid/entities/:entity/:id', async (c) => {
  const { hid, name } = resolve(c);
  const u = requireHotelAccess(c, hid, ENTITIES[name].module);
  await tx(async (client) => {
    const removed = await deleteEntity(name, hid, c.req.param('id'), client);
    await audit({ hotelId: hid, user: u, action: 'delete', entity: name, entityId: removed.id, summary: summarize(name, 'Deleted', removed), before: removed, ip: clientIp(c) }, client);
  });
  return c.json({ ok: true });
});

entityRoutes.post('/:hid/entities/:entity/reorder', async (c) => {
  const { hid, name } = resolve(c);
  const u = requireHotelAccess(c, hid, ENTITIES[name].module);
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw validationError(parsed.error);
  await tx(async (client) => {
    await reorderEntities(name, hid, parsed.data.ids, client);
    await audit({ hotelId: hid, user: u, action: 'reorder', entity: name, summary: `Reordered ${ENTITIES[name].label.plural}`, after: parsed.data.ids, ip: clientIp(c) }, client);
  });
  return c.json({ ok: true });
});
