// Bundles the API server and CLI into dist/server (dependencies stay external).
import { build } from 'esbuild';
import fs from 'node:fs';

await build({
  entryPoints: { index: 'server/index.ts', cli: 'server/cli.ts' },
  outdir: 'dist/server',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info',
});

// SQL migrations and seed data are read at runtime relative to the bundle.
fs.cpSync('server/migrations', 'dist/server/migrations', { recursive: true });
fs.cpSync('server/seed/data', 'dist/server/data', { recursive: true });
console.log('server bundle ready: dist/server');
