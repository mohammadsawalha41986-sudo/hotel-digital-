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

