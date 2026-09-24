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
import { pool } from './db';
import { HttpError, validationError } from './errors';
import { log } from './log';
import { randomToken } from './security';
import { authRoutes } from './routes/auth';
import { publicRoutes } from './routes/public';
import { hotelRoutes } from './routes/admin/hotels';
import { entityRoutes } from './routes/admin/entities';
import { requestRoutes } from './routes/admin/requests';
import { analyticsRoutes } from './routes/admin/analytics';
import { miscRoutes } from './routes/admin/misc';
import { importRoutes } from './routes/admin/importExport';

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('requestId', randomToken(8));
    const start = Date.now();
    await next();
    if (c.req.path.startsWith('/api/')) {
      log.info('http', { id: c.get('requestId'), method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - start });
    }
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

  app.get('/api/health', async (c) => {
    await pool.query('SELECT 1');
    return c.json({ ok: true });
  });

  app.route('/api/auth', authRoutes);
  app.route('/api/public', publicRoutes);
  app.route('/api/admin/hotels', hotelRoutes);
  app.route('/api/admin/hotels', entityRoutes);
  app.route('/api/admin/hotels', requestRoutes);
  app.route('/api/admin/hotels', analyticsRoutes);
  app.route('/api/admin/hotels', miscRoutes);
  app.route('/api/admin/hotels', importRoutes);

  app.all('/api/*', (c) => c.json({ error: { code: 'not_found', message: 'Endpoint not found' } }, 404));

  // Uploaded media: immutable file names, long cache, no directory listing.
  app.use(
    '/media/*',
    serveStatic({
      root: path.relative(process.cwd(), config.uploadDir) || '.',
      rewriteRequestPath: (p) => p.replace(/^\/media/, ''),
      onFound: (_p, c) => {
        c.header('Cache-Control', 'public, max-age=31536000, immutable');
        c.header('X-Content-Type-Options', 'nosniff');
      },
    })
  );
  app.get('/media/*', (c) => c.text('Not found', 404));

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
    else {
      log.error('unhandled', { id: c.get('requestId'), path: c.req.path, message: err.message, stack: config.isProd ? undefined : err.stack });
      e = new HttpError(500, 'internal', 'Something went wrong on our side. Please try again.');
    }
    return c.json({ error: { code: e.code, message: e.message, details: e.details, request_id: c.get('requestId') } }, e.status as 400);
  });

  return app;
}
