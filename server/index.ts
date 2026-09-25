import fs from 'node:fs';
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { config } from './config';
import { migrate, pool } from './db';
import { log } from './log';
import { ensurePublications } from './services/publish';
import { startJobs } from './services/scheduler';
import { startDraining } from './health';

async function main() {
  fs.mkdirSync(config.uploadDir, { recursive: true });
  if (process.env.SKIP_MIGRATIONS !== '1') {
    await migrate();
    // Hotels created before publishing existed keep a working guest site.
    const n = await ensurePublications();
    if (n) log.info('publish.initial', { hotels: n });
  }
  // Maintenance jobs (replica-safe; retention stays opt-in via RETENTION_JOB=1).
  const stopJobs = process.env.JOBS_DISABLED === '1' ? () => {} : startJobs();
  const app = createApp();
  const server = serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
    log.info('server.listening', { port: info.port, env: config.isProd ? 'production' : 'development' });
  });

  // Graceful shutdown: report not-ready so the platform stops sending traffic,
  // let in-flight requests (e.g. an order being written) finish, then close.
  let stopping = false;
  const shutdown = (signal: string) => {
    if (stopping) return;
    stopping = true;
    log.info('server.shutdown', { signal });
    startDraining();
    stopJobs();
    const grace = Number(process.env.SHUTDOWN_GRACE_MS ?? 5_000);
    setTimeout(() => {
      server.close(() => {
        pool.end().finally(() => process.exit(0));
      });
      // Idle keep-alive sockets would hold close() open.
      (server as unknown as { closeIdleConnections?: () => void }).closeIdleConnections?.();
    }, grace).unref();
    setTimeout(() => process.exit(1), grace + 15_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  log.error('server.fatal', { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
