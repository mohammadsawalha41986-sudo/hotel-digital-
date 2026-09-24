import type { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, 'bad_request', message, details);
export const unauthorized = (message = 'Please sign in') => new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'You do not have access to this resource') => new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Not found') => new HttpError(404, 'not_found', message);
export const conflict = (message: string) => new HttpError(409, 'conflict', message);
export const tooMany = (message = 'Too many requests, please try again shortly') => new HttpError(429, 'rate_limited', message);

export function validationError(err: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  return new HttpError(422, 'validation_failed', 'Please correct the highlighted fields', { fields });
}
