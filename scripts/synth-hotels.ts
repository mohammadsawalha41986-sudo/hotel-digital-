/**
 * Synthetic multi-hotel data for staging and load testing — never production.
 *
 *   DATABASE_URL=postgres://…/hotelhub_load npx tsx scripts/synth-hotels.ts --hotels 20 --days 90 --orders 120
 *
 * Each hotel gets a realistic catalogue built through the normal entity layer
 * (4 outlets × 5 categories × 8 items, room/hotel services, spa, offers), its
 * own departments, staff accounts, a commission agreement and a publication.
 * Order history (`--days` × `--orders` per day, clustered around breakfast and
 * dinner) is bulk-inserted in SQL so indexes and plans are exercised at
 * production-like table sizes. All names and phone numbers are fake.
 */
import { parseArgs } from 'node:util';
import { migrate, one, pool } from '../server/db';
import { synthHotels } from '../server/tools/synthHotels';

const { values } = parseArgs({ options: { hotels: { type: 'string', default: '20' }, days: { type: 'string', default: '90' }, orders: { type: 'string', default: '120' }, prefix: { type: 'string', default: 'load-hotel' } } });

async function main() {
  await migrate();
  const t0 = Date.now();
  const orders = await synthHotels({ hotels: Number(values.hotels), days: Number(values.days), perDay: Number(values.orders), prefix: values.prefix! });
  const counts = await one(`SELECT (SELECT COUNT(*) FROM hotels) AS hotels, (SELECT COUNT(*) FROM requests) AS requests, (SELECT COUNT(*) FROM guests) AS guests, pg_size_pretty(pg_database_size(current_database())) AS size`);
  console.log(`Done in ${Math.round((Date.now() - t0) / 1000)} s:`, counts, `(+${orders} orders this run)`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
