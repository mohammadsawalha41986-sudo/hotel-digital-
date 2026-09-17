export type StaffRole =
  | 'SUPER_ADMIN'
  | 'HOTEL_ADMIN'
  | 'FNB_MANAGER'
  | 'FRONT_OFFICE'
  | 'HOUSEKEEPING'
  | 'HOUSEKEEPING_SUPERVISOR'
  | 'LAUNDRY_MANAGER'
  | 'SPA_MANAGER'
  | 'SPA_DIRECTOR'
  | 'ENGINEERING'
  | 'ENGINEERING_CHIEF'
  | 'CONTENT_EDITOR'
  | 'VIEWER';

/**
 * Canonical Staff Role Taxonomy
 * Maps legacy or informal aliases into the canonical primary role.
 */
export function canonicalizeStaffRole(rawRole: string): StaffRole {
  const r = (rawRole || '').trim().toUpperCase();
  if (r === 'SUPER_ADMIN' || r === 'SUPERADMIN' || r === 'ROOT') return 'SUPER_ADMIN';
  if (r === 'HOTEL_ADMIN' || r === 'HOTELADMIN' || r === 'GM' || r === 'GENERAL_MANAGER') return 'HOTEL_ADMIN';
  if (r === 'FNB_MANAGER' || r === 'FNB' || r === 'FOOD_BEVERAGE_DIRECTOR') return 'FNB_MANAGER';
  if (r === 'SPA_MANAGER' || r === 'SPA_DIRECTOR' || r === 'WELLNESS_MANAGER') return 'SPA_MANAGER';
  if (r === 'HOUSEKEEPING' || r === 'HOUSEKEEPING_SUPERVISOR' || r === 'HK') return 'HOUSEKEEPING_SUPERVISOR';
  if (r === 'LAUNDRY_MANAGER' || r === 'LAUNDRY' || r === 'VALET_MANAGER') return 'LAUNDRY_MANAGER';
  if (r === 'ENGINEERING' || r === 'ENGINEERING_CHIEF' || r === 'MAINTENANCE_DIRECTOR') return 'ENGINEERING_CHIEF';
  if (r === 'FRONT_OFFICE' || r === 'FRONT_DESK' || r === 'RECEPTION' || r === 'CONCIERGE') return 'FRONT_OFFICE';
  if (r === 'CONTENT_EDITOR' || r === 'EDITOR') return 'CONTENT_EDITOR';
  if (r === 'VIEWER' || r === 'AUDITOR' || r === 'READONLY') return 'VIEWER';
  return 'VIEWER';
}

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: StaffRole;
  /**
   * Allowed hotel IDs.
   * SUPER_ADMIN has ['*'] indicating all hotels.
   * Other roles are restricted to their assigned hotel IDs.
   */
  allowedHotelIds: string[];
  createdAt?: string;
  lastLoginAt?: string;
}

export interface PermissionCheckContext {
  user: AdminUser | null;
  targetHotelId: string;
  department?: string;
}

/**
 * Validates if an authenticated user has permission to access a specific hotel.
 * SUPER_ADMIN has access to all hotels.
 * Other roles must have targetHotelId in their allowedHotelIds array.
 */
export function canAccessHotel(user: AdminUser | null, targetHotelId: string): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return user.allowedHotelIds.includes('*') || user.allowedHotelIds.includes(targetHotelId);
}

/**
 * Validates if an authenticated user has permission to manage operational requests for a department.
 */
export function canManageDepartmentRequests(
  user: AdminUser | null,
  targetHotelId: string,
  department: string
): boolean {
  if (!canAccessHotel(user, targetHotelId)) return false;
  if (!user) return false;
  
  if (user.role === 'SUPER_ADMIN' || user.role === 'HOTEL_ADMIN') return true;
  if (user.role === 'VIEWER') return false;

  const deptLower = department.toLowerCase();
  switch (user.role) {
    case 'FNB_MANAGER':
      return deptLower === 'fnb' || deptLower === 'room_service' || deptLower === 'restaurant' || deptLower === 'cafe';
    case 'HOUSEKEEPING':
    case 'HOUSEKEEPING_SUPERVISOR':
      return deptLower === 'housekeeping' || deptLower === 'laundry' || deptLower === 'room_comfort';
    case 'LAUNDRY_MANAGER':
      return deptLower === 'laundry';
    case 'ENGINEERING':
    case 'ENGINEERING_CHIEF':
      return deptLower === 'engineering' || deptLower === 'maintenance';
    case 'SPA_MANAGER':
    case 'SPA_DIRECTOR':
      return deptLower === 'spa' || deptLower === 'wellness';
    case 'FRONT_OFFICE':
      return deptLower === 'front_office' || deptLower === 'concierge' || deptLower === 'guest_services';
    case 'CONTENT_EDITOR':
      return false; // Content editors manage CMS, not live operational requests
    default:
      return false;
  }
}

/**
 * Validates if an authenticated user has permission to edit hotel content and CMS.
 */
export function canEditHotelContent(user: AdminUser | null, targetHotelId: string): boolean {
  if (!canAccessHotel(user, targetHotelId)) return false;
  if (!user) return false;
  return ['SUPER_ADMIN', 'HOTEL_ADMIN', 'CONTENT_EDITOR'].includes(user.role);
}

/**
 * Validates if an authenticated user has permission to onboard or manage hotel properties.
 */
export function canManageHotels(user: AdminUser | null): boolean {
  return !!user && user.role === 'SUPER_ADMIN';
}

