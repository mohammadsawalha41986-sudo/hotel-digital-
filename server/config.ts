import path from 'node:path';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') throw new Error(`Missing required environment variable ${name}`);
  return v;
}

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  isProd,
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: required('DATABASE_URL', isProd ? undefined : 'postgres://hub:hub@localhost:5432/hotelhub'),
  /** Public origin used for QR links and CSRF origin checks, e.g. https://guest.example.com */
  publicOrigin: process.env.PUBLIC_ORIGIN ?? '',
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? './uploads'),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 8) * 1024 * 1024,
  maxGuestUploadBytes: 5 * 1024 * 1024,
  sessionDays: Number(process.env.SESSION_DAYS ?? 7),
  cookieName: 'hub_session',
  /** Served static client (production). */
  clientDir: path.resolve(process.env.CLIENT_DIR ?? './dist/client'),
  trustProxy: process.env.TRUST_PROXY === '1' || isProd,
};
