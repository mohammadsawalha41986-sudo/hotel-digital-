type Level = 'debug' | 'info' | 'warn' | 'error';
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const min = order[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? 20;

function write(level: Level, event: string, fields?: Record<string, unknown>) {
  if (order[level] < min || process.env.LOG_SILENT === '1') return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...fields });
  (level === 'error' || level === 'warn' ? process.stderr : process.stdout).write(line + '\n');
}

/** Structured JSON logger (one line per event, safe for log aggregation). */
export const log = {
  debug: (e: string, f?: Record<string, unknown>) => write('debug', e, f),
  info: (e: string, f?: Record<string, unknown>) => write('info', e, f),
  warn: (e: string, f?: Record<string, unknown>) => write('warn', e, f),
  error: (e: string, f?: Record<string, unknown>) => write('error', e, f),
};
