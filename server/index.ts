import fs from 'node:fs';
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { config } from './config';
import { migrate, pool } from './db';
import { log } from './log';
import { ensurePublications } from './services/publish';

async function main() {
  fs.mkdirSync(config.uploadDir, { recursive: true });
  if (process.env.SKIP_MIGRATIONS !== '1') {
    await migrate();
    // Hotels created before publishing existed keep a working guest site.
    const n = await ensurePublications();
    if (n) log.info('publish.initial', { hotels: n });
  }
  const app = createApp();
  const server = serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
    log.info('server.listening', { port: info.port, env: config.isProd ? 'production' : 'development' });
  });

  const shutdown = (signal: string) => {
    log.info('server.shutdown', { signal });
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  log.error('server.fatal', { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
