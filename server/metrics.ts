/**
 * In-process request metrics for this replica (or worker process): totals
 * since start, a rolling latency window, a 5-minute request rate, sustained
 * CPU, and per-hotel request/5xx counters. Exposed on the platform operations
 * endpoint (Super Admin only) and evaluated by the alert watcher; the platform
 * (Railway) aggregates CPU/RAM and logs across replicas.
 */
const WINDOW = 2_000;
const started = Date.now();
const latencies: number[] = [];
let cursor = 0;
const totals = { requests: 0, errors_5xx: 0, errors_4xx: 0, rate_limited: 0 };

// Per-second buckets for the last 5 minutes: [requests, 5xx].
const BUCKETS = 300;
const perSecond = new Array<[number, number]>(BUCKETS).fill([0, 0]).map(() => [0, 0] as [number, number]);
const bucketSecond = new Array<number>(BUCKETS).fill(0);

function bucket(nowSec: number) {
  const i = nowSec % BUCKETS;
  if (bucketSecond[i] !== nowSec) {
    bucketSecond[i] = nowSec;
    perSecond[i][0] = 0;
    perSecond[i][1] = 0;
  }
  return perSecond[i];
}

/** Hotel key from an API path: admin routes carry the hotel id, public routes the slug. */
const HOTEL_PATH = /^\/api\/(?:admin\/hotels\/([0-9a-f-]{36})|public\/hotels\/([a-z0-9-]{2,60}))(?:\/|$)/;
const perHotel = new Map<string, { requests: number; errors_5xx: number; last_5xx_at: number | null }>();
const MAX_HOTELS = 2_000;

export function recordRequest(status: number, ms: number, path = '') {
  totals.requests++;
  const b = bucket(Math.floor(Date.now() / 1000));
  b[0]++;
  if (status >= 500) {
    totals.errors_5xx++;
    b[1]++;
  } else if (status === 429) totals.rate_limited++;
  else if (status >= 400) totals.errors_4xx++;
  if (latencies.length < WINDOW) latencies.push(ms);
  else {
    latencies[cursor] = ms;
    cursor = (cursor + 1) % WINDOW;
  }
  const m = HOTEL_PATH.exec(path);
  const key = m?.[1] ?? (m?.[2] ? `slug:${m[2]}` : null);
  if (key) {
    let h = perHotel.get(key);
    if (!h) {
      if (perHotel.size >= MAX_HOTELS) return;
      perHotel.set(key, (h = { requests: 0, errors_5xx: 0, last_5xx_at: null }));
    }
    h.requests++;
    if (status >= 500) {
      h.errors_5xx++;
      h.last_5xx_at = Date.now();
    }
  }
}

/** Requests and 5xx over the last `seconds` (≤ 300). */
export function recentCounts(seconds = 300) {
  const now = Math.floor(Date.now() / 1000);
  let requests = 0;
  let errors = 0;
  for (let i = 0; i < BUCKETS; i++) {
    if (now - bucketSecond[i] < seconds) {
      requests += perSecond[i][0];
      errors += perSecond[i][1];
    }
  }
  return { requests, errors_5xx: errors, rps: +(requests / Math.min(seconds, Math.max(1, (Date.now() - started) / 1000))).toFixed(1) };
}

// Sustained CPU of this process, sampled every 15 s, averaged over 5 minutes.
const cpuSamples: number[] = [];
let lastCpu = process.cpuUsage();
let lastAt = performance.now();
setInterval(() => {
  const now = performance.now();
  const d = process.cpuUsage(lastCpu);
  cpuSamples.push(((d.user + d.system) / 1000 / (now - lastAt)) * 100);
  if (cpuSamples.length > 20) cpuSamples.shift();
  lastCpu = process.cpuUsage();
  lastAt = now;
}, 15_000).unref();

export const cpuPercent5m = () => (cpuSamples.length ? Math.round(cpuSamples.reduce((a, b) => a + b, 0) / cpuSamples.length) : null);

const pct = (sorted: number[], p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : null);

export function metricsSnapshot() {
  const sorted = [...latencies].sort((a, b) => a - b);
  const recent = recentCounts(300);
  return {
    since: new Date(started).toISOString(),
    ...totals,
    last_5min: recent,
    errors_5xx_last_5min: recent.errors_5xx,
    latency_ms: { window: sorted.length, p50: pct(sorted, 50), p95: pct(sorted, 95), p99: pct(sorted, 99), max: sorted.at(-1) ?? null },
    cpu_pct_5min: cpuPercent5m(),
    memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    heap_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  };
}

/** Per-hotel counters of this process (keys: hotel id, or `slug:<slug>` for public routes). */
export function hotelMetrics() {
  return perHotel;
}
