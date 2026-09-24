import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from './config';
import { log } from './log';

// numeric → number (money columns are numeric(12,2); values stay far below 2^53).
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
// int8 (count(*)) → number
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => log.error('db.pool_error', { message: err.message }));

export type Queryable = Pick<pg.Pool, 'query'> | pg.PoolClient;

export async function q<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = [], db: Queryable = pool): Promise<T[]> {
  const res = await db.query<T>(text, params as any[]);
  return res.rows;
}

export async function one<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = [], db: Queryable = pool): Promise<T | null> {
  const rows = await q<T>(text, params, db);
  return rows[0] ?? null;
}

export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/** Applies pending SQL migrations in filename order, each in its own transaction. */
export async function migrate(dir = migrationsDir): Promise<string[]> {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const applied = new Set((await q<{ name: string }>('SELECT name FROM schema_migrations')).map((r) => r.name));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const ran: string[] = [];
  for (const f of files) {
    if (applied.has(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    await tx(async (c) => {
      await c.query(sql);
      await c.query('INSERT INTO schema_migrations(name) VALUES ($1)', [f]);
    });
    log.info('db.migrated', { file: f });
    ran.push(f);
  }
  return ran;
}
