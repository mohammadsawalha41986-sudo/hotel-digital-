/**
 * In-process request metrics for this replica: totals since start and a
 * rolling window of recent latencies. Exposed on the platform operations
 * endpoint; the platform (Railway) aggregates CPU/RAM and logs across replicas.
 */
const WINDOW = 2_000;
const started = Date.now();
const latencies: number[] = [];
let cursor = 0;
const totals = { requests: 0, errors_5xx: 0, errors_4xx: 0, rate_limited: 0 };
const recent5xx: number[] = [];

export function recordRequest(status: number, ms: number) {
  totals.requests++;
  if (status >= 500) {
    totals.errors_5xx++;
    recent5xx.push(Date.now());
    if (recent5xx.length > 500) recent5xx.shift();
  } else if (status === 429) totals.rate_limited++;
  else if (status >= 400) totals.errors_4xx++;
  if (latencies.length < WINDOW) latencies.push(ms);
  else {
    latencies[cursor] = ms;
    cursor = (cursor + 1) % WINDOW;
  }
}

const pct = (sorted: number[], p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : null);

export function metricsSnapshot() {
  const sorted = [...latencies].sort((a, b) => a - b);
  const fiveMin = Date.now() - 5 * 60_000;
  return {
    since: new Date(started).toISOString(),
    ...totals,
    errors_5xx_last_5min: recent5xx.filter((t) => t > fiveMin).length,
    latency_ms: { window: sorted.length, p50: pct(sorted, 50), p95: pct(sorted, 95), p99: pct(sorted, 99), max: sorted.at(-1) ?? null },
    memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    heap_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  };
}
