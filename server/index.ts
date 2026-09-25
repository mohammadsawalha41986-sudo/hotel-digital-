import cluster from 'node:cluster';
import fs from 'node:fs';
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { config } from './config';
import { migrate, pool } from './db';
import { log } from './log';
import { ensurePublications } from './services/publish';
import { startJobs } from './services/scheduler';
import { startProcessAlerts } from './services/alerts';
import { startDraining } from './health';

/**
 * WEB_CONCURRENCY > 1 runs that many worker processes sharing the port, so one
 * container can use several vCPUs (Node serves requests on one core per
 * process). The primary migrates once, then forks; workers skip migrations.
 * Every worker is stateless apart from short caches, like separate replicas.
 */
const WORKERS = Math.max(1, Number(process.env.WEB_CONCURRENCY ?? 1));

async function prepare() {
  fs.mkdirSync(config.uploadDir, { recursive: true });
  if (process.env.SKIP_MIGRATIONS !== '1') {
    await migrate();
    // Hotels created before publishing existed keep a working guest site.
    const n = await ensurePublications();
    if (n) log.info('publish.initial', { hotels: n });
  }
}

async function primary() {
  await prepare();
  await pool.end();
  for (let i = 0; i < WORKERS; i++) cluster.fork({ SKIP_MIGRATIONS: '1' });
  let stopping = false;
  cluster.on('exit', (w, code) => {
    if (stopping) return;
    log.error('worker.exit', { pid: w.process.pid, code });
    cluster.fork({ SKIP_MIGRATIONS: '1' });
  });
  const stop = (signal: NodeJS.Signals) => {
    stopping = true;
    for (const w of Object.values(cluster.workers ?? {})) w?.process.kill(signal);
    setTimeout(() => process.exit(0), Number(process.env.SHUTDOWN_GRACE_MS ?? 5_000) + 16_000).unref();
    cluster.on('exit', () => {
      if (!Object.keys(cluster.workers ?? {}).length) process.exit(0);
    });
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
}

async function main() {
  if (!cluster.isWorker) await prepare();
  // Maintenance jobs (replica-safe; retention stays opt-in via RETENTION_JOB=1).
  const stopJobs = process.env.JOBS_DISABLED === '1' ? () => {} : startJobs();
  const stopAlerts = startProcessAlerts();
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
    stopAlerts();
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

(WORKERS > 1 && cluster.isPrimary ? primary() : main()).catch((err) => {
  log.error('server.fatal', { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
