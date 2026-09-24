import { parseArgs } from 'node:util';
import { ROLES, type Role } from '../shared/domain';
import { migrate, one, pool, tx } from './db';
import { seedDemoCatalog, seedDemoUsers, seedIsolationHotel, upsertUser, DEMO_PASSWORD } from './seed/demo';
import { seedSwissFlora } from './seed/swissflora';
import { validatePasswordStrength } from './security';
import { importFirestoreHotel } from './tools/firestoreImport';
import fs from 'node:fs';

const usage = `Usage:
  npm run db:migrate
  npm run db:seed                         Swiss Flora Royal (real hotel data, no invented prices)
  npm run db:seed:demo                    + demo catalog, second hotel and one user per role (staging only)
  npm run admin:create -- --email a@b.com --name "Name" --role HOTEL_ADMIN --hotel swiss-flora-royal --password '...'
  npm run import:firestore -- export.json [--dry-run]   migrate hotels from the previous Firebase version`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case 'migrate': {
      const ran = await migrate();
      console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'Database is up to date');
      break;
    }
    case 'seed': {
      await migrate();
      const r = await tx((c) => seedSwissFlora(c));
      console.log(r.created ? `Seeded Swiss Flora Royal (${r.id})` : `Swiss Flora Royal already exists (${r.id}) — left unchanged`);
      break;
    }
    case 'seed-demo': {
      if (process.env.NODE_ENV === 'production' && !rest.includes('--force')) throw new Error('Refusing to load demo data in production (pass --force to override).');
      await migrate();
      await tx(async (c) => {
        const royal = await seedSwissFlora(c);
        const added = await seedDemoCatalog(c, royal.id);
        const harbour = await seedIsolationHotel(c);
        const users = await seedDemoUsers(c, royal.id, harbour);
        console.log(`Demo catalog ${added ? 'added' : 'already present'}; users (password "${DEMO_PASSWORD}"):\n  ${users.join('\n  ')}`);
      });
      break;
    }
    case 'create-admin': {
      const { values } = parseArgs({ args: rest, options: { email: { type: 'string' }, name: { type: 'string' }, role: { type: 'string', default: 'HOTEL_ADMIN' }, hotel: { type: 'string', multiple: true }, password: { type: 'string' } } });
      const role = values.role as Role;
      if (!values.email || !values.name || !values.password) throw new Error(usage);
      if (!(ROLES as readonly string[]).includes(role)) throw new Error(`Role must be one of ${ROLES.join(', ')}`);
      const weak = validatePasswordStrength(values.password);
      if (weak) throw new Error(weak);
      await migrate();
      const hotelIds: string[] = [];
      for (const slug of values.hotel ?? []) {
        const h = await one<{ id: string }>('SELECT id FROM hotels WHERE slug = $1', [slug]);
        if (!h) throw new Error(`Hotel "${slug}" not found`);
        hotelIds.push(h.id);
      }
      if (role !== 'SUPER_ADMIN' && hotelIds.length === 0) throw new Error('Non-super-admin users need at least one --hotel');
      const id = await tx((c) => upsertUser(c, values.email!, values.name!, role, hotelIds, values.password!));
      console.log(`User ${values.email} (${role}) ready: ${id}`);
      break;
    }
    case 'import-firestore': {
      const file = rest.find((a) => !a.startsWith('--'));
      if (!file) throw new Error(usage);
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      const hotels = data.hotels ?? data.__collections__?.hotels;
      if (!hotels || typeof hotels !== 'object') throw new Error('Expected a Firestore export with a top-level "hotels" collection');
      await migrate();
      const dry = rest.includes('--dry-run');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const [key, doc] of Object.entries(hotels as Record<string, Record<string, unknown>>)) {
          const r = await importFirestoreHotel(client, key, doc);
          console.log(`${r.hotel} → ${r.hotelId}\n  created: ${JSON.stringify(r.created)}`);
          for (const s of r.skipped) console.log(`  skipped ${s.what}: ${s.reason}`);
        }
        await client.query(dry ? 'ROLLBACK' : 'COMMIT');
        console.log(dry ? 'Dry run — nothing was written.' : 'Imported. Hotels start unpublished: review them in the admin, then publish.');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
      break;
    }
    default:
      console.log(usage);
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e, (e as { details?: unknown })?.details ? JSON.stringify((e as { details?: unknown }).details) : '');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
