import { z } from 'zod';

/**
 * Guest engagement events. Only aggregate daily counts are stored (per hotel,
 * event and target) — never who, which device or which session.
 */
export const GUEST_EVENTS = [
  'offer_impression',
  'offer_click',
  'experience_click',
  'service_view',
  'menu_item_view',
  'request_started',
  'request_completed',
  'whatsapp_click',
] as const;
export type GuestEvent = (typeof GUEST_EVENTS)[number];

export const EVENT_TARGET_TYPES = ['', 'offer', 'experience', 'outlet', 'menu_item', 'room_service', 'hotel_service', 'spa_service', 'laundry', 'feedback', 'department'] as const;

export const guestEventSchema = z.object({
  event: z.enum(GUEST_EVENTS),
  target_type: z.enum(EVENT_TARGET_TYPES).default(''),
  /** Stable record code (e.g. OFFER-BRUNCH), never a personal value. */
  target_code: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9_-]*$/)
    .default(''),
});
export const guestEventBatchSchema = z.object({ events: z.array(guestEventSchema).min(1).max(25) });
export type GuestEventInput = z.infer<typeof guestEventSchema>;
