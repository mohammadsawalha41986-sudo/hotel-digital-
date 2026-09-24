/**
 * Thin fetch wrapper for the Hub API. Every mutation carries the CSRF header
 * the server requires; errors become ApiError with field-level messages.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
    /** Structured error details (e.g. rollback conflicts, a re-validated import). */
    public details: Record<string, unknown> = {}
  ) {
    super(message);
  }
  get isNetwork() {
    return this.status === 0;
  }
}

type Json = Record<string, unknown> | unknown[];

/** Optional translator for API messages (the admin registers one for Arabic). */
let translate: (message: string, code: string) => string = (m) => m;
export function setApiMessageTranslator(fn: (message: string, code: string) => string) {
  translate = fn;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Json | FormData;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'x-requested-with': 'hub', ...opts.headers };
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) body = opts.body;
  else if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method: opts.method ?? 'GET', headers, body, credentials: 'same-origin', signal: opts.signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'network', translate('We could not reach the server. Check your connection and try again.', 'network'));
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: { fields?: Record<string, string> } & Record<string, unknown> } } | null)?.error;
    const code = err?.code ?? 'http_error';
    const fields = Object.fromEntries(Object.entries(err?.details?.fields ?? {}).map(([k, v]) => [k, translate(String(v), 'field')]));
    throw new ApiError(res.status, code, translate(err?.message ?? `Request failed (${res.status})`, code), fields, err?.details ?? {});
  }
  return data as T;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

/** Downloads a file from the API (spreadsheets) and saves it with the server's file name. */
export async function downloadFile(path: string, fallbackName = 'download'): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { headers: { 'x-requested-with': 'hub' }, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'network', 'We could not reach the server. Check your connection and try again.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.error?.code ?? 'http_error', data?.error?.message ?? `Download failed (${res.status})`);
  }
  const cd = res.headers.get('content-disposition') ?? '';
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  const plain = /filename="([^"]+)"/i.exec(cd);
  const name = star ? decodeURIComponent(star[1]) : plain ? plain[1] : fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
