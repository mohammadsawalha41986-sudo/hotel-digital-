import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { compress } from 'hono/compress';
import { secureHeaders } from 'hono/secure-headers';
import { serveStatic } from '@hono/node-server/serve-static';
import { ZodError } from 'zod';
import { csrfGuard, sessionMiddleware } from './auth';
import { config } from './config';
import type { AppEnv } from './context';
import { HttpError, validationError } from './errors';
import { log } from './log';
import { randomToken } from './security';
import { isSafeKey, readMedia } from './storage';
import { readiness } from './health';
import { recordRequest } from './metrics';
import { invalidateBundle } from './services/bundleCache';
import { authRoutes } from './routes/auth';
import { publicRoutes } from './routes/public';
import { hotelRoutes } from './routes/admin/hotels';
import { entityRoutes } from './routes/admin/entities';
import { requestRoutes } from './routes/admin/requests';
import { analyticsRoutes } from './routes/admin/analytics';
import { miscRoutes } from './routes/admin/misc';
import { importRoutes } from './routes/admin/imports';
import { commerceRoutes } from './routes/admin/commerce';
import { platformRoutes } from './routes/admin/platform';

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    // Correlation id: honour a proxy-supplied one, return it to the client.
    const incoming = c.req.header('x-request-id');
    c.set('requestId', incoming && /^[A-Za-z0-9._-]{6,64}$/.test(incoming) ? incoming : randomToken(8));
    const start = Date.now();
    await next();
    c.header('X-Request-Id', c.get('requestId'));
    if (c.req.path.startsWith('/api/')) {
      const ms = Date.now() - start;
      recordRequest(c.res.status, ms);
      // Path only (no query string): queries can carry search terms such as guest names.
      const level = c.res.status >= 500 ? 'error' : ms > 2_000 ? 'warn' : 'info';
      log[level]('http', { id: c.get('requestId'), method: c.req.method, path: c.req.path, status: c.res.status, ms });
    }
  });

  // Registered before secureHeaders so it runs after it: an SVG opened directly is a document,
  // so it gets a sandboxing policy with no scripts or external loads.
  app.use('/media/*', async (c, next) => {
    await next();
    if (c.req.path.endsWith('.svg')) c.res.headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox");
  });

  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        mediaSrc: ["'self'", 'blob:', 'https:'],
        frameSrc: ["'self'", 'https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://player.vimeo.com', 'https://www.google.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: 'same-site',
    })
  );
  app.use('/api/*', compress());
  app.use('/api/*', bodyLimit({ maxSize: 20 * 1024 * 1024, onError: (c) => c.json({ error: { code: 'too_large', message: 'Request is too large' } }, 413) }));
  app.use('/api/*', sessionMiddleware);
  app.use('/api/*', csrfGuard);
  // Any successful change to a hotel (content, availability, publish, import,
  // settings) drops that hotel's cached public bundle once the change — and its
  // transaction — has completed.
  app.use('/api/admin/hotels/:hid/*', async (c, next) => {
    await next();
    if (c.req.method !== 'GET' && c.res.status < 400) invalidateBundle(c.req.param('hid'));
  });

  // Liveness: the process is up and serving (no dependencies, never flaps on a DB blip).
  app.get('/api/health', (c) => c.json({ ok: true }));
  // Readiness: safe to route traffic here — database reachable within 2 s, media
  // storage reachable, and not draining for shutdown. Used by the platform health check.
  app.get('/api/ready', async (c) => {
    c.header('Cache-Control', 'no-store');
    const r = await readiness();
    return c.json(r, r.ok ? 200 : 503);
  });

  app.route('/api/auth', authRoutes);
  app.route('/api/public', publicRoutes);
  app.route('/api/admin/hotels', hotelRoutes);
  app.route('/api/admin/hotels', entityRoutes);
  app.route('/api/admin/hotels', requestRoutes);
  app.route('/api/admin/hotels', analyticsRoutes);
  app.route('/api/admin/hotels', miscRoutes);
  app.route('/api/admin/hotels', importRoutes);
  app.route('/api/admin/hotels', commerceRoutes);
  app.route('/api/admin/platform', platformRoutes);

  app.all('/api/*', (c) => c.json({ error: { code: 'not_found', message: 'Endpoint not found' } }, 404));

  // Uploaded media from object storage (local disk or S3-compatible bucket).
  // Content-unique file names, so responses are immutable and cacheable forever.
  app.get('/media/*', async (c) => {
    const key = decodeURIComponent(c.req.path.slice('/media/'.length));
    if (!isSafeKey(key)) return c.text('Not found', 404);
    const obj = await readMedia(key).catch((err) => {
      log.error('media.read_failed', { id: c.get('requestId'), message: (err as Error).message });
      return undefined;
    });
    if (obj === undefined) return c.text('Temporarily unavailable', 503);
    if (!obj) return c.text('Not found', 404);
    c.header('Content-Type', obj.contentType);
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    c.header('X-Content-Type-Options', 'nosniff');
    return c.body(new Uint8Array(obj.body));
  });

  // Built client (production). Vite serves the client itself in development.
  if (fs.existsSync(path.join(config.clientDir, 'index.html'))) {
    const root = path.relative(process.cwd(), config.clientDir);
    app.use(
      '/assets/*',
      serveStatic({ root, onFound: (_p, c) => c.header('Cache-Control', 'public, max-age=31536000, immutable') })
    );
    app.use('*', serveStatic({ root }));
    const indexHtml = fs.readFileSync(path.join(config.clientDir, 'index.html'), 'utf8');
    app.get('*', (c) => {
      c.header('Cache-Control', 'no-cache');
      return c.html(indexHtml);
    });
  }

  app.onError((err, c) => {
    let e: HttpError;
    if (err instanceof HttpError) e = err;
    else if (err instanceof ZodError) e = validationError(err);
    else if ((err as { code?: string }).code === '23000') {
      // Raised by the immutability triggers (financial and history records).
      log.warn('immutable_violation', { id: c.get('requestId'), path: c.req.path, message: err.message });
      e = new HttpError(409, 'immutable_record', 'Financial and history records cannot be changed. Post an adjustment instead.');
    } else if ((err as { code?: string }).code === '23514' || (err as { code?: string }).code === '23505') {
      log.warn('constraint_violation', { id: c.get('requestId'), path: c.req.path, constraint: (err as { constraint?: string }).constraint });
      e = new HttpError(409, 'conflict', 'This change conflicts with existing data. Refresh and try again.');
    } else {
      log.error('unhandled', { id: c.get('requestId'), path: c.req.path, message: err.message, stack: config.isProd ? undefined : err.stack });
      e = new HttpError(500, 'internal', 'Something went wrong on our side. Please try again.');
    }
    return c.json({ error: { code: e.code, message: e.message, details: e.details, request_id: c.get('requestId') } }, e.status as 400);
  });

  return app;
}
