import type { HotelFinanceAccess } from '../../shared/commerce';
import { PII_ROLES, ROLE_DEPARTMENTS, roleCan } from '../../shared/domain';
import type { SessionUser } from '../context';
import { one } from '../db';
import { forbidden } from '../errors';

export const isPlatformFinance = (u: SessionUser) => u.role === 'SUPER_ADMIN' || u.role === 'PLATFORM_FINANCE';

/**
 * What financial data this user may see for this hotel:
 *  - platform roles: FULL
 *  - hotel admin / hotel finance: the hotel's configured access (NONE by default)
 *  - everyone else: NONE (operational data only)
 */
export async function financeAccess(u: SessionUser, hotelId: string): Promise<HotelFinanceAccess> {
  if (isPlatformFinance(u)) return 'FULL';
  if (!roleCan(u.role, 'finance')) return 'NONE';
  const s = await one<{ hotel_finance_access: HotelFinanceAccess }>(`SELECT hotel_finance_access FROM hotel_commercial_settings WHERE hotel_id = $1`, [hotelId]);
  return s?.hotel_finance_access ?? 'NONE';
}

export async function requireFinance(u: SessionUser, hotelId: string, level: 'SETTLEMENTS' | 'FULL') {
  const a = await financeAccess(u, hotelId);
  if (a === 'NONE' || (level === 'FULL' && a !== 'FULL')) throw forbidden('Financial information for this hotel is not available to your account');
  return a;
}

export const canSeePii = (u: SessionUser) => PII_ROLES.includes(u.role);
export const departmentsOf = (u: SessionUser) => ROLE_DEPARTMENTS[u.role];
