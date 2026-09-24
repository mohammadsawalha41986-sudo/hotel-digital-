// Starts the production build against a freshly reset E2E database.
import { execFileSync } from 'node:child_process';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url || !/e2e|test/.test(url)) throw new Error('Refusing to reset a database whose name does not contain "e2e" or "test"');
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
await client.end();
execFileSync('node', ['dist/server/cli.js', 'seed-demo'], { stdio: 'inherit', env: process.env });
await import('../dist/server/index.js');
