import { parseArgs } from 'node:util';
import { ROLES, type Role } from '../shared/domain';
import { migrate, one, pool, tx } from './db';
import { seedDemoCatalog, seedDemoUsers, seedIsolationHotel, upsertUser, DEMO_PASSWORD } from './seed/demo';
import { seedSwissFlora } from './seed/swissflora';
import { validatePasswordStrength } from './security';

const usage = `Usage:
  npm run db:migrate
  npm run db:seed                         Swiss Flora Royal (real hotel data, no invented prices)
  npm run db:seed:demo                    + demo catalog, second hotel and one user per role (staging only)
  npm run admin:create -- --email a@b.com --name "Name" --role HOTEL_ADMIN --hotel swiss-flora-royal --password '...'`;

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
