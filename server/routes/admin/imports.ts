import { Hono } from 'hono';
import { z } from 'zod';
import { requireHotelAccess } from '../../auth';
import { clientIp, type AppEnv, type Ctx } from '../../context';
import { HttpError, badRequest } from '../../errors';
import {
  MASTER_KEY,
  MASTER_TITLE,
  TEMPLATES,
  commitImport,
  discardImport,
  getBatch,
  listBatches,
  previewImport,
  rollbackImport,
  templateWorkbook,
  templatesFor,
} from '../../services/excel/engine';
import { MAX_FILE_BYTES } from '../../services/excel/workbook';

/**
 * Data Import & Export center: template downloads, data exports, staged
 * previews, confirmation, history and rollback. Every route is hotel scoped
 * and checks the modules of the template(s) involved.
 */
export const importRoutes = new Hono<AppEnv>();

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function hotelUser(c: Ctx) {
  const hid = c.req.param('hid')!;
  // The import center module; each template additionally needs its own content module.
  const u = requireHotelAccess(c, hid, 'import');
  return { hid, u };
}

function sendXlsx(buf: Buffer, filename: string) {
  const ascii = filename.replace(/[^\x20-\x7e]+/g, '').replace(/"/g, '');
  return new Response(new Uint8Array(buf), {
    headers: {
      'content-type': XLSX,
      'content-disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'cache-control': 'no-store',
    },
  });
}

importRoutes.get('/:hid/data/templates', async (c) => {
  const { u } = hotelUser(c);
  const mine = new Set(templatesFor(u).map((t) => t.key));
  return c.json({
    templates: TEMPLATES.map((t) => ({
      key: t.key,
      number: t.number,
      title: t.title,
      title_ar: t.title_ar,
      sheet: t.sheet,
      description: t.description,
      modules: t.modules,
      entities: t.entities ?? [],
      update_only: !!t.updateOnly,
      allowed: mine.has(t.key),
    })),
    master: { key: MASTER_KEY, title: MASTER_TITLE, allowed: mine.size > 0, sheets: mine.size },
    max_file_mb: MAX_FILE_BYTES / 1024 / 1024,
  });
});

importRoutes.get('/:hid/data/templates/:key', async (c) => {
  const { hid, u } = hotelUser(c);
  const { buf, filename } = await templateWorkbook(c.req.param('key'), u, hid, false);
  return sendXlsx(buf, filename);
});

importRoutes.get('/:hid/data/export/:key', async (c) => {
  const { hid, u } = hotelUser(c);
  const { buf, filename } = await templateWorkbook(c.req.param('key'), u, hid, true);
  return sendXlsx(buf, filename);
});

const previewSchema = z.object({
  template: z.string().min(1).max(64),
  mode: z.enum(['create_only', 'create_update']).default('create_update'),
  check_images: z.enum(['true', 'false']).default('true'),
});

importRoutes.post('/:hid/data/imports', async (c) => {
  const { hid, u } = hotelUser(c);
  const form = await c.req.formData().catch(() => null);
  if (!form) throw badRequest('Send the file as multipart/form-data');
  const file = form.get('file');
  if (!(file instanceof File)) throw new HttpError(422, 'validation_failed', 'Choose an .xlsx file to upload', { fields: { file: 'Required' } });
  if (file.size > MAX_FILE_BYTES) throw new HttpError(413, 'file_too_large', `The file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB`);
  const parsed = previewSchema.safeParse({ template: form.get('template') ?? undefined, mode: form.get('mode') ?? undefined, check_images: form.get('check_images') ?? undefined });
  if (!parsed.success) throw new HttpError(422, 'validation_failed', 'Choose a template and an import mode', { fields: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) });
  const batch = await previewImport({
    hotelId: hid,
    user: u,
    template: parsed.data.template,
    mode: parsed.data.mode,
    filename: file.name,
    file: Buffer.from(await file.arrayBuffer()),
    checkImages: parsed.data.check_images === 'true',
  });
  return c.json(batch, 201);
});

importRoutes.get('/:hid/data/imports', async (c) => {
  const { hid, u } = hotelUser(c);
  return c.json({ imports: await listBatches(hid, u) });
});

importRoutes.get('/:hid/data/imports/:bid', async (c) => {
  const { hid, u } = hotelUser(c);
  return c.json(await getBatch(hid, c.req.param('bid'), u));
});

importRoutes.post('/:hid/data/imports/:bid/commit', async (c) => {
  const { hid, u } = hotelUser(c);
  return c.json(await commitImport(hid, c.req.param('bid'), u, clientIp(c)));
});

importRoutes.post('/:hid/data/imports/:bid/discard', async (c) => {
  const { hid, u } = hotelUser(c);
  return c.json(await discardImport(hid, c.req.param('bid'), u));
});

importRoutes.post('/:hid/data/imports/:bid/rollback', async (c) => {
  const { hid, u } = hotelUser(c);
  const dry = c.req.query('dry') === '1';
  return c.json(await rollbackImport(hid, c.req.param('bid'), u, clientIp(c), dry));
});
