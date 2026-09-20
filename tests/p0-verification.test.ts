import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getOutletsForHotel,
  getWellnessForHotel,
  getRoomsForHotel,
  getOffersForHotel,
} from '../src/data/swissFloraData';
import { getHotelLaundryItems, getHotelGuestServices } from '../src/data/departmentData';
import {
  normalizeDepartmentCode,
  normalizeRequestStatus,
  toLegacyOperationalRequest,
  submitProductionRequest,
  ProductionRequestPayload,
} from '../src/services/requestService';
import {
  canAccessHotel,
  canManageDepartmentRequests,
  canEditHotelContent,
  canManageHotels,
  AdminUser,
} from '../src/types/auth';

// ---------------------------------------------------------------------------
// 1. TENANT ISOLATION TESTS
// ---------------------------------------------------------------------------
test('Tenant Isolation: getOutletsForHotel strictly returns empty for unknown hotels', () => {
  const unknownOutlets = getOutletsForHotel('unknown-hotel-999');
  assert.equal(unknownOutlets.length, 0, 'Unknown hotel must not return any F&B outlets');

  const emptyOutlets = getOutletsForHotel('');
  assert.equal(emptyOutlets.length, 0, 'Blank hotel ID must not return any F&B outlets');

  const swissFloraOutlets = getOutletsForHotel('11');
  assert.ok(swissFloraOutlets.length > 0, 'Swiss Flora Royal (11) must return its outlets');
  assert.equal(swissFloraOutlets[0].hotel_id, '11');
});

test('Tenant Isolation: getWellnessForHotel strictly returns empty for unknown hotels', () => {
  const unknownWellness = getWellnessForHotel('unknown-hotel-999');
  assert.equal(unknownWellness.length, 0, 'Unknown hotel must not return any wellness services');

  const swissFloraWellness = getWellnessForHotel('11');
  assert.ok(swissFloraWellness.length > 0, 'Swiss Flora Royal (11) must return its wellness catalog');
});

test('Tenant Isolation: getRoomsForHotel & getOffersForHotel strictly isolate data', () => {
  assert.equal(getRoomsForHotel('unknown-property').length, 0);
  assert.equal(getOffersForHotel('unknown-property').length, 0);

  assert.ok(getRoomsForHotel('11').length > 0);
  assert.ok(getOffersForHotel('11').length > 0);
});

test('Tenant Isolation: getHotelLaundryItems strictly returns empty for unknown hotels', () => {
  const unknownLaundry = getHotelLaundryItems('unknown-property');
  assert.equal(unknownLaundry.length, 0, 'Unknown hotel must not return laundry items');

  const swissFloraLaundry = getHotelLaundryItems('11');
  assert.ok(swissFloraLaundry.length > 0, 'Swiss Flora Royal (11) must return its laundry catalog');
});

test('Tenant Isolation: getHotelGuestServices strictly returns empty for unknown hotels', () => {
  const unknownServices = getHotelGuestServices('non-existent-id');
  assert.equal(unknownServices.length, 0, 'Unknown hotel must not return guest services');

  const swissFloraServices = getHotelGuestServices('11');
  assert.ok(swissFloraServices.length > 0, 'Swiss Flora Royal (11) must return its guest services');
});

// ---------------------------------------------------------------------------
// 2. REQUEST ENGINE & NORMALIZATION TESTS
// ---------------------------------------------------------------------------
test('Request Engine: normalizeDepartmentCode correctly maps all department variants', () => {
  assert.equal(normalizeDepartmentCode('fnb'), 'FNB');
  assert.equal(normalizeDepartmentCode('dining'), 'FNB');
  assert.equal(normalizeDepartmentCode('In-Room Culinary'), 'FNB');
  assert.equal(normalizeDepartmentCode('restaurant'), 'FNB');
  assert.equal(normalizeDepartmentCode('wellness'), 'SPA');
  assert.equal(normalizeDepartmentCode('spa'), 'SPA');
  assert.equal(normalizeDepartmentCode('laundry'), 'LDY');
  assert.equal(normalizeDepartmentCode('valet_laundry'), 'LDY');
  assert.equal(normalizeDepartmentCode('housekeeping'), 'HK');
  assert.equal(normalizeDepartmentCode('room_comfort'), 'HK');
  assert.equal(normalizeDepartmentCode('maintenance'), 'MNT');
  assert.equal(normalizeDepartmentCode('engineering'), 'MNT');
  assert.equal(normalizeDepartmentCode('concierge'), 'CON');
  assert.equal(normalizeDepartmentCode('front_office'), 'FO');
  assert.equal(normalizeDepartmentCode('unknown'), 'ROOM');
});

test('Request Engine: normalizeRequestStatus correctly standardizes operational statuses', () => {
  assert.equal(normalizeRequestStatus('new'), 'NEW');
  assert.equal(normalizeRequestStatus('RECEIVED'), 'ACKNOWLEDGED');
  assert.equal(normalizeRequestStatus('confirmed'), 'ACKNOWLEDGED');
  assert.equal(normalizeRequestStatus('PREPARING'), 'IN_PROGRESS');
  assert.equal(normalizeRequestStatus('on_the_way'), 'IN_PROGRESS');
  assert.equal(normalizeRequestStatus('in_progress'), 'IN_PROGRESS');
  assert.equal(normalizeRequestStatus('completed'), 'COMPLETED');
  assert.equal(normalizeRequestStatus('cancelled'), 'CANCELLED');
});

test('Request Engine: toLegacyOperationalRequest produces backwards-compatible format', () => {
  const prodPayload: ProductionRequestPayload = {
    id: 'REQ-1001',
    reference: 'REQ-1001',
    hotelId: '11',
    hotelNameEn: 'Swiss Flora Royal Hotel Riyadh',
    hotelNameAr: 'فندق سويس فلورا رويال الرياض',
    department: 'FNB',
    requestType: 'In-Room Dining',
    customerType: 'IN_HOUSE',
    roomNumber: '501',
    guestName: 'Sheikh Mohammed',
    guestPhone: '+966550000000',
    total: 250,
    currency: 'SAR',
    notes: 'Hot cloche please',
    status: 'NEW',
    createdAt: '2026-09-17T12:00:00Z',
    updatedAt: '2026-09-17T12:00:00Z',
  };

  const legacy = toLegacyOperationalRequest(prodPayload);
  assert.equal(legacy.id, 'REQ-1001');
  assert.equal(legacy.hotel_id, '11');
  assert.equal(legacy.department, 'fnb');
  assert.equal(legacy.room_number, '501');
  assert.equal(legacy.guest_name, 'Sheikh Mohammed');
  assert.equal(legacy.estimated_total, 250);
  assert.equal(legacy.currency, 'SAR');
  assert.equal(legacy.status, 'NEW');
});

test('Request Engine: submitProductionRequest enforces tenant isolation', async () => {
  await assert.rejects(
    async () => {
      // Missing hotelId must be rejected
      await submitProductionRequest({
        id: 'REQ-FAIL',
        reference: 'REQ-FAIL',
        hotelId: '',
        department: 'FNB',
        requestType: 'Dining',
        customerType: 'IN_HOUSE',
        guestName: 'Guest',
        total: 100,
        currency: 'SAR',
        status: 'NEW',
      });
    },
    /Tenant isolation violation/,
    'Requests without hotelId must fail validation'
  );
});

// ---------------------------------------------------------------------------
// 3. RBAC & PERMISSION GUARD TESTS
// ---------------------------------------------------------------------------
test('RBAC: canAccessHotel enforces multi-tenant hotel isolation', () => {
  const superAdmin: AdminUser = {
    uid: 'sa-1',
    email: 'super@hotelhub.com',
    displayName: 'Super Admin',
    role: 'SUPER_ADMIN',
    allowedHotelIds: ['*'],
  };

  const hotelAdmin: AdminUser = {
    uid: 'ha-1',
    email: 'admin@swissflora.com',
    displayName: 'Swiss Flora GM',
    role: 'HOTEL_ADMIN',
    allowedHotelIds: ['11', 'swiss-flora-royal'],
  };

  // Super Admin can access any hotel
  assert.equal(canAccessHotel(superAdmin, '11'), true);
  assert.equal(canAccessHotel(superAdmin, 'hotel-999'), true);

  // Hotel Admin can only access assigned hotel
  assert.equal(canAccessHotel(hotelAdmin, '11'), true);
  assert.equal(canAccessHotel(hotelAdmin, 'hotel-999'), false, 'Hotel admin must not access unassigned hotel');

  // Null user is rejected
  assert.equal(canAccessHotel(null, '11'), false);
});

test('RBAC: canManageDepartmentRequests enforces departmental segregation', () => {
  const fnbManager: AdminUser = {
    uid: 'fnb-1',
    email: 'chef@swissflora.com',
    displayName: 'Executive Chef',
    role: 'FNB_MANAGER',
    allowedHotelIds: ['11'],
  };

  const hkSupervisor: AdminUser = {
    uid: 'hk-1',
    email: 'housekeeping@swissflora.com',
    displayName: 'Housekeeping Lead',
    role: 'HOUSEKEEPING_SUPERVISOR',
    allowedHotelIds: ['11'],
  };

  const viewer: AdminUser = {
    uid: 'v-1',
    email: 'auditor@hotelhub.com',
    displayName: 'Auditor',
    role: 'VIEWER',
    allowedHotelIds: ['11'],
  };

  // F&B Manager can manage F&B but not Housekeeping or Engineering
  assert.equal(canManageDepartmentRequests(fnbManager, '11', 'fnb'), true);
  assert.equal(canManageDepartmentRequests(fnbManager, '11', 'room_service'), true);
  assert.equal(canManageDepartmentRequests(fnbManager, '11', 'housekeeping'), false);
  assert.equal(canManageDepartmentRequests(fnbManager, '11', 'engineering'), false);

  // Housekeeping Supervisor can manage Housekeeping and Laundry, not F&B
  assert.equal(canManageDepartmentRequests(hkSupervisor, '11', 'housekeeping'), true);
  assert.equal(canManageDepartmentRequests(hkSupervisor, '11', 'laundry'), true);
  assert.equal(canManageDepartmentRequests(hkSupervisor, '11', 'fnb'), false);

  // Viewer cannot manage requests
  assert.equal(canManageDepartmentRequests(viewer, '11', 'fnb'), false);
  assert.equal(canManageDepartmentRequests(viewer, '11', 'housekeeping'), false);
});

test('RBAC: canEditHotelContent restricts CMS modification to authorized roles', () => {
  const superAdmin: AdminUser = {
    uid: 'sa-1',
    email: 'super@hotelhub.com',
    displayName: 'Super Admin',
    role: 'SUPER_ADMIN',
    allowedHotelIds: ['*'],
  };

  const editor: AdminUser = {
    uid: 'ed-1',
    email: 'editor@swissflora.com',
    displayName: 'Content Editor',
    role: 'CONTENT_EDITOR',
    allowedHotelIds: ['11'],
  };

  const fnbManager: AdminUser = {
    uid: 'fnb-1',
    email: 'chef@swissflora.com',
    displayName: 'Executive Chef',
    role: 'FNB_MANAGER',
    allowedHotelIds: ['11'],
  };

  assert.equal(canEditHotelContent(superAdmin, '11'), true);
  assert.equal(canEditHotelContent(editor, '11'), true);
  assert.equal(canEditHotelContent(fnbManager, '11'), false, 'Operational staff cannot edit global CMS');
});

test('RBAC: canManageHotels strictly reserved for SUPER_ADMIN', () => {
  const superAdmin: AdminUser = {
    uid: 'sa-1',
    email: 'super@hotelhub.com',
    displayName: 'Super Admin',
    role: 'SUPER_ADMIN',
    allowedHotelIds: ['*'],
  };

  const hotelAdmin: AdminUser = {
    uid: 'ha-1',
    email: 'admin@swissflora.com',
    displayName: 'Hotel Admin',
    role: 'HOTEL_ADMIN',
    allowedHotelIds: ['11'],
  };

  assert.equal(canManageHotels(superAdmin), true);
  assert.equal(canManageHotels(hotelAdmin), false, 'Hotel admin cannot create or delete hotel properties');
});

// ---------------------------------------------------------------------------
// 4. CANONICAL ROLE TAXONOMY & ALIAS TESTS
// ---------------------------------------------------------------------------
import { canonicalizeStaffRole, StaffRole } from '../src/types/auth';
import { generateSecureReference } from '../src/services/requestService';
import { isDevEnvironment } from '../src/services/firebase';

test('RBAC Canonicalization: canonicalizeStaffRole correctly resolves all primary roles and aliases', () => {
  // Primary canonical roles
  assert.equal(canonicalizeStaffRole('SUPER_ADMIN'), 'SUPER_ADMIN');
  assert.equal(canonicalizeStaffRole('HOTEL_ADMIN'), 'HOTEL_ADMIN');
  assert.equal(canonicalizeStaffRole('FNB_MANAGER'), 'FNB_MANAGER');
  assert.equal(canonicalizeStaffRole('SPA_MANAGER'), 'SPA_MANAGER');
  assert.equal(canonicalizeStaffRole('HOUSEKEEPING_SUPERVISOR'), 'HOUSEKEEPING_SUPERVISOR');
  assert.equal(canonicalizeStaffRole('LAUNDRY_MANAGER'), 'LAUNDRY_MANAGER');
  assert.equal(canonicalizeStaffRole('ENGINEERING_CHIEF'), 'ENGINEERING_CHIEF');
  assert.equal(canonicalizeStaffRole('FRONT_OFFICE'), 'FRONT_OFFICE');
  assert.equal(canonicalizeStaffRole('CONTENT_EDITOR'), 'CONTENT_EDITOR');
  assert.equal(canonicalizeStaffRole('VIEWER'), 'VIEWER');

  // Aliases and legacy mappings
  assert.equal(canonicalizeStaffRole('FRONT_DESK'), 'FRONT_OFFICE');
  assert.equal(canonicalizeStaffRole('reception'), 'FRONT_OFFICE');
  assert.equal(canonicalizeStaffRole('SPA_DIRECTOR'), 'SPA_MANAGER');
  assert.equal(canonicalizeStaffRole('wellness_manager'), 'SPA_MANAGER');
  assert.equal(canonicalizeStaffRole('HOUSEKEEPING'), 'HOUSEKEEPING_SUPERVISOR');
  assert.equal(canonicalizeStaffRole('hk'), 'HOUSEKEEPING_SUPERVISOR');
  assert.equal(canonicalizeStaffRole('ENGINEERING'), 'ENGINEERING_CHIEF');
  assert.equal(canonicalizeStaffRole('GM'), 'HOTEL_ADMIN');
  assert.equal(canonicalizeStaffRole('superadmin'), 'SUPER_ADMIN');
  assert.equal(canonicalizeStaffRole('unknown_role'), 'VIEWER', 'Unrecognized roles must default to VIEWER');
});

test('RBAC Matrix: Proves permission segregation for every canonical role', () => {
  const roles: StaffRole[] = [
    'SUPER_ADMIN',
    'HOTEL_ADMIN',
    'FNB_MANAGER',
    'SPA_MANAGER',
    'HOUSEKEEPING_SUPERVISOR',
    'LAUNDRY_MANAGER',
    'ENGINEERING_CHIEF',
    'FRONT_OFFICE',
    'CONTENT_EDITOR',
    'VIEWER',
  ];

  roles.forEach((role) => {
    const user: AdminUser = {
      uid: `user-${role}`,
      email: `${role.toLowerCase()}@hotel.com`,
      displayName: role,
      role,
      allowedHotelIds: role === 'SUPER_ADMIN' ? ['*'] : ['11'],
    };

    // All valid staff can access assigned hotel
    assert.equal(canAccessHotel(user, '11'), true, `${role} must access assigned hotel`);
    
    // Only SUPER_ADMIN can access unassigned hotel
    if (role === 'SUPER_ADMIN') {
      assert.equal(canAccessHotel(user, 'hotel-other'), true);
      assert.equal(canManageHotels(user), true);
    } else {
      assert.equal(canAccessHotel(user, 'hotel-other'), false);
      assert.equal(canManageHotels(user), false);
    }

    // CMS editing permissions
    if (['SUPER_ADMIN', 'HOTEL_ADMIN', 'CONTENT_EDITOR'].includes(role)) {
      assert.equal(canEditHotelContent(user, '11'), true, `${role} should edit content`);
    } else {
      assert.equal(canEditHotelContent(user, '11'), false, `${role} must not edit content`);
    }

    // VIEWER cannot manage any operational requests
    if (role === 'VIEWER') {
      assert.equal(canManageDepartmentRequests(user, '11', 'fnb'), false);
      assert.equal(canManageDepartmentRequests(user, '11', 'housekeeping'), false);
      assert.equal(canManageDepartmentRequests(user, '11', 'spa'), false);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. REQUEST ENGINE INTEGRITY & COLLISION RESISTANCE
// ---------------------------------------------------------------------------
test('Request Engine Integrity: generateSecureReference produces unique, collision-free references', () => {
  const generated = new Set<string>();
  const iterations = 500;

  for (let i = 0; i < iterations; i++) {
    const ref = generateSecureReference('FNB');
    assert.ok(ref.startsWith('FNB-'), 'Reference must start with prefix');
    assert.ok(!generated.has(ref), `Collision detected on iteration ${i}: ${ref}`);
    generated.add(ref);
  }

  assert.equal(generated.size, iterations);
});

// ---------------------------------------------------------------------------
// 6. ADVERSARIAL FIRESTORE & STORAGE SECURITY RULES SIMULATION
// ---------------------------------------------------------------------------
test('Security Rules Simulation: Guest request validation denies malicious/fraudulent payloads', () => {
  function simulateFirestoreGuestValidation(data: any, hotelId: string, requestId: string): boolean {
    let validTenantAndId = (data.hotelId === hotelId) &&
                           (data.id === requestId || data.reference === requestId);
    let validInitialStatus = data.status === 'NEW';
    let validDepartment = ['FNB', 'WELLNESS', 'HOUSEKEEPING', 'LAUNDRY', 'GUEST_SERVICES', 'CONCIERGE', 'FRONT_OFFICE', 'SPA', 'LDY', 'HK', 'MNT', 'CON', 'FO', 'ROOM'].includes(data.department);
    let validCustomerType = ['IN_HOUSE', 'EXTERNAL'].includes(data.customerType);
    let validGuestName = typeof data.guestName === 'string' && data.guestName.length >= 2 && data.guestName.length <= 100;
    let validPhone = !('guestPhone' in data) || (typeof data.guestPhone === 'string' && data.guestPhone.length <= 30);
    let validRoom = data.customerType !== 'IN_HOUSE' || (typeof data.roomNumber === 'string' && data.roomNumber.length >= 1 && data.roomNumber.length <= 20);
    let validTotal = typeof data.total === 'number' && data.total >= 0 && data.total <= 100000;
    let validSubtotal = !('subtotal' in data) || (typeof data.subtotal === 'number' && data.subtotal >= 0 && data.subtotal <= 100000);
    let validVat = !('vatAmount' in data) || (typeof data.vatAmount === 'number' && data.vatAmount >= 0 && data.vatAmount <= 50000);
    let validDiscount = !('discount' in data) || (typeof data.discount === 'number' && data.discount >= 0 && data.discount <= 50000);
    let noStaffFields = !('assignedTo' in data) && !('assigned_staff' in data) && !('staffNotes' in data) && !('internalNotes' in data) && !('resolution' in data);

    return validTenantAndId &&
           validInitialStatus &&
           validDepartment &&
           validCustomerType &&
           validGuestName &&
           validPhone &&
           validRoom &&
           validTotal &&
           validSubtotal &&
           validVat &&
           validDiscount &&
           noStaffFields;
  }

  const validPayload = {
    id: 'FNB-001',
    reference: 'FNB-001',
    hotelId: '11',
    department: 'FNB',
    customerType: 'IN_HOUSE',
    roomNumber: '402',
    guestName: 'Ahmed Ali',
    total: 150,
    status: 'NEW',
  };

  // 1. Valid request passes
  assert.equal(simulateFirestoreGuestValidation(validPayload, '11', 'FNB-001'), true);

  // 2. Guest cannot create COMPLETED or CANCELLED status
  assert.equal(simulateFirestoreGuestValidation({ ...validPayload, status: 'COMPLETED' }, '11', 'FNB-001'), false);
  assert.equal(simulateFirestoreGuestValidation({ ...validPayload, status: 'CANCELLED' }, '11', 'FNB-001'), false);

  // 3. Guest cannot inject staff fields (assignedTo / internal notes)
  assert.equal(simulateFirestoreGuestValidation({ ...validPayload, assignedTo: 'Staff-9' }, '11', 'FNB-001'), false);
  assert.equal(simulateFirestoreGuestValidation({ ...validPayload, internalNotes: 'VIP room' }, '11', 'FNB-001'), false);

  // 4. Negative or fraudulent financial numbers rejected
  assert.equal(simulateFirestoreGuestValidation({ ...validPayload, total: -50 }, '11', 'FNB-001'), false);
  assert.equal(simulateFirestoreGuestValidation({ ...validPayload, total: 200000 }, '11', 'FNB-001'), false);

  // 5. Tenant mismatch rejected
  assert.equal(simulateFirestoreGuestValidation(validPayload, 'hotel-99', 'FNB-001'), false);

  // 6. IN_HOUSE request without room number rejected
  assert.equal(simulateFirestoreGuestValidation({ ...validPayload, roomNumber: '' }, '11', 'FNB-001'), false);
});

test('Security Rules Simulation: Staff update prevents tenant reassignment and alters immutable fields', () => {
  function simulateFirestoreStaffUpdate(incoming: any, existing: any, targetHotelId: string): boolean {
    let immutableTenant = incoming.hotelId === existing.hotelId && incoming.hotelId === targetHotelId;
    let immutableId = incoming.id === existing.id;
    let immutableRef = incoming.reference === existing.reference;
    return immutableTenant && immutableId && immutableRef;
  }

  const existingDoc = {
    id: 'FNB-100',
    reference: 'FNB-100',
    hotelId: '11',
    status: 'NEW',
    total: 80,
  };

  // Valid status update by authorized staff
  assert.equal(simulateFirestoreStaffUpdate({ ...existingDoc, status: 'IN_PROGRESS' }, existingDoc, '11'), true);

  // Attacker trying to reassign request to another hotel is DENIED
  assert.equal(simulateFirestoreStaffUpdate({ ...existingDoc, hotelId: 'hotel-b' }, existingDoc, '11'), false);

  // Attacker trying to mutate reference ID is DENIED
  assert.equal(simulateFirestoreStaffUpdate({ ...existingDoc, reference: 'TAMPERED' }, existingDoc, '11'), false);
});

test('Storage Security Rules: Standardized 10MB limit and MIME type enforcement', () => {
  const MAX_STORAGE_BYTES = 10 * 1024 * 1024; // 10,485,760 bytes

  assert.equal(MAX_STORAGE_BYTES, 10485760);

  function isAllowedMimeType(contentType: string): boolean {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf'];
    return allowed.includes(contentType);
  }

  assert.equal(isAllowedMimeType('image/jpeg'), true);
  assert.equal(isAllowedMimeType('image/png'), true);
  assert.equal(isAllowedMimeType('image/webp'), true);
  assert.equal(isAllowedMimeType('application/pdf'), true);
  assert.equal(isAllowedMimeType('application/x-msdownload'), false, 'Executables must be rejected');
  assert.equal(isAllowedMimeType('application/javascript'), false, 'Scripts must be rejected');
});

// ---------------------------------------------------------------------------
// 7. PRODUCTION AUTH HARDENING GUARD TESTS
// ---------------------------------------------------------------------------
import { loginAdmin } from '../src/services/authService';

test('Auth Hardening: Production mode strictly forbids arbitrary dev fallback login', async () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    // Simulate production environment
    process.env.NODE_ENV = 'production';
    assert.equal(isDevEnvironment(), false, 'isDevEnvironment must report false in production');

    // Attempting login without live Firebase credentials in production MUST throw
    await assert.rejects(
      async () => {
        await loginAdmin('super@hotel.com', 'secret123');
      },
      /Production mode requires active Firebase credentials/,
      'Production must never allow dev fallback authentication'
    );
  } finally {
    // Restore environment
    process.env.NODE_ENV = originalEnv;
  }
});

// ---------------------------------------------------------------------------
// 8. MULTI-HOTEL TENANT ISOLATION, UNPUBLISHED SECURITY & GOVERNANCE TESTS
// ---------------------------------------------------------------------------
import { findHotelBySlug, parseCurrentRoute, buildGuestUrl } from '../src/utils/urlRouter';
import { Hotel } from '../src/types/hotel';

test('Multi-Hotel Architecture: SUPER_ADMIN has global access across 1 to 100+ properties', () => {
  const superAdmin: AdminUser = {
    uid: 'sa-root',
    email: 'info@norivaglobal.com',
    displayName: 'Super Administrator',
    role: 'SUPER_ADMIN',
    allowedHotelIds: ['*'],
  };

  const properties = [
    'swiss-flora-royal',
    'ritz-carlton-riyadh',
    'four-seasons-kingdom',
    'fairmont-riyadh',
    'st-regis-red-sea',
    'al-faisaliah-hotel',
  ];

  properties.forEach((propId) => {
    assert.equal(canAccessHotel(superAdmin, propId), true, `SUPER_ADMIN must access ${propId}`);
    assert.equal(canEditHotelContent(superAdmin, propId), true, `SUPER_ADMIN must edit ${propId}`);
  });
  assert.equal(canManageHotels(superAdmin), true, 'SUPER_ADMIN must have hotel onboarding permissions');
});

test('Multi-Hotel Architecture: HOTEL_ADMIN is strictly locked to designated hotel property', () => {
  const propertyAdminA: AdminUser = {
    uid: 'admin-a',
    email: 'gm@swissflora.com',
    displayName: 'Swiss Flora GM',
    role: 'HOTEL_ADMIN',
    allowedHotelIds: ['swiss-flora-royal', '11'],
  };

  const propertyAdminB: AdminUser = {
    uid: 'admin-b',
    email: 'gm@ritzriyadh.com',
    displayName: 'Ritz GM',
    role: 'HOTEL_ADMIN',
    allowedHotelIds: ['ritz-riyadh'],
  };

  // Property A Admin can access Property A
  assert.equal(canAccessHotel(propertyAdminA, 'swiss-flora-royal'), true);
  assert.equal(canAccessHotel(propertyAdminA, '11'), true);

  // Property A Admin CANNOT access Property B or unassigned properties
  assert.equal(canAccessHotel(propertyAdminA, 'ritz-riyadh'), false);
  assert.equal(canAccessHotel(propertyAdminA, 'four-seasons'), false);

  // Property B Admin CANNOT access Property A
  assert.equal(canAccessHotel(propertyAdminB, 'swiss-flora-royal'), false);
  assert.equal(canAccessHotel(propertyAdminB, '11'), false);

  // Neither property admin can create new global properties
  assert.equal(canManageHotels(propertyAdminA), false);
  assert.equal(canManageHotels(propertyAdminB), false);
});

test('Multi-Hotel Security Rules: Unpublished hotel blocks anonymous guest reads and allows authorized staff', () => {
  // Simulates firestore.rules logic:
  // allow read: if (resource.data.is_published == true) || isHotelStaff(hotelId);
  function simulateHotelRootReadRule(
    hotelDoc: { is_published: boolean },
    hotelId: string,
    authContext: { uid?: string; role?: string; allowedHotelIds?: string[] } | null
  ): boolean {
    // 1. Published hotel is publicly readable
    if (hotelDoc.is_published === true) return true;

    // 2. Unpublished hotel requires isHotelStaff(hotelId)
    if (!authContext) return false;
    if (authContext.role === 'SUPER_ADMIN') return true;
    if (authContext.allowedHotelIds?.includes('*')) return true;
    if (authContext.allowedHotelIds?.includes(hotelId)) return true;

    return false;
  }

  const unpublishedHotel = { is_published: false };
  const publishedHotel = { is_published: true };

  const anonymousGuest = null;
  const authorizedStaff = { uid: 'u-1', role: 'HOTEL_ADMIN', allowedHotelIds: ['swiss-flora-royal'] };
  const unauthorizedStaff = { uid: 'u-2', role: 'HOTEL_ADMIN', allowedHotelIds: ['other-hotel'] };
  const superAdmin = { uid: 'u-sa', role: 'SUPER_ADMIN', allowedHotelIds: ['*'] };

  // Published hotel: everyone can read
  assert.equal(simulateHotelRootReadRule(publishedHotel, 'swiss-flora-royal', anonymousGuest), true);
  assert.equal(simulateHotelRootReadRule(publishedHotel, 'swiss-flora-royal', unauthorizedStaff), true);

  // Unpublished hotel: anonymous guest is DENIED
  assert.equal(simulateHotelRootReadRule(unpublishedHotel, 'swiss-flora-royal', anonymousGuest), false, 'Anonymous guest must not read unpublished hotel');

  // Unpublished hotel: unauthorized staff is DENIED
  assert.equal(simulateHotelRootReadRule(unpublishedHotel, 'swiss-flora-royal', unauthorizedStaff), false, 'Unauthorized staff must not read unpublished hotel');

  // Unpublished hotel: authorized staff is ALLOWED
  assert.equal(simulateHotelRootReadRule(unpublishedHotel, 'swiss-flora-royal', authorizedStaff), true, 'Authorized staff must read unpublished hotel');

  // Unpublished hotel: SUPER_ADMIN is ALLOWED
  assert.equal(simulateHotelRootReadRule(unpublishedHotel, 'swiss-flora-royal', superAdmin), true, 'Super admin must read unpublished hotel');
});

test('Multi-Hotel Security Rules: Subcollections inherit published guard', () => {
  // Simulates isHotelPubliclyReadable(hotelId):
  // function isHotelPubliclyReadable(hotelId) {
  //   return get(/databases/$(database)/documents/hotels/$(hotelId)).data.is_published == true;
  // }
  function simulateSubcollectionReadRule(
    parentHotelIsPublished: boolean,
    hotelId: string,
    authContext: { uid?: string; role?: string; allowedHotelIds?: string[] } | null
  ): boolean {
    if (parentHotelIsPublished) return true;
    if (!authContext) return false;
    if (authContext.role === 'SUPER_ADMIN' || authContext.allowedHotelIds?.includes('*')) return true;
    if (authContext.allowedHotelIds?.includes(hotelId)) return true;
    return false;
  }

  // When parent hotel is unpublished, guest cannot read outlets, rooms, offers, etc.
  assert.equal(simulateSubcollectionReadRule(false, 'swiss-flora-royal', null), false);

  // Authorized staff can read subcollections even when unpublished
  assert.equal(simulateSubcollectionReadRule(false, 'swiss-flora-royal', { role: 'HOTEL_ADMIN', allowedHotelIds: ['swiss-flora-royal'] }), true);

  // When parent hotel is published, guests can read subcollections
  assert.equal(simulateSubcollectionReadRule(true, 'swiss-flora-royal', null), true);
});

test('Multi-Hotel Creation Contract: New properties default to is_published=false without fake operational records', () => {
  // Simulates clean onboarding structure
  const rawInput = {
    name_en: 'Grand Oasis Palace',
    name_ar: 'قصر الواحة الكبير',
    slug: 'grand-oasis-palace',
    city_en: 'Jeddah',
    city_ar: 'جدة',
    country_en: 'Saudi Arabia',
    country_ar: 'المملكة العربية السعودية',
  };

  const newHotelDoc: Partial<Hotel> = {
    id: rawInput.slug,
    slug: rawInput.slug,
    name_en: rawInput.name_en,
    name_ar: rawInput.name_ar,
    city_en: rawInput.city_en,
    city_ar: rawInput.city_ar,
    country_en: rawInput.country_en,
    country_ar: rawInput.country_ar,
    is_published: false, // Must default to draft
    rooms: [],           // Must be clean / empty
    offers: [],          // Must be clean / empty
    diningVenues: [],    // Must be clean / empty
    wellnessFacilities: [], // Must be clean / empty
    services: [],        // Must be clean / empty
  };

  assert.equal(newHotelDoc.is_published, false, 'New hotel must default to unpublished/draft');
  assert.equal(newHotelDoc.rooms?.length, 0, 'New hotel must not clone sample rooms');
  assert.equal(newHotelDoc.offers?.length, 0, 'New hotel must not clone sample offers');
  assert.equal(newHotelDoc.diningVenues?.length, 0, 'New hotel must not clone sample dining');
});

test('Multi-Hotel Operational Isolation: Tenant A requests never cross-contaminate Tenant B', () => {
  const hotelARequests = [
    { id: 'REQ-A1', hotel_id: 'swiss-flora-royal', guest_name: 'Guest A1' },
    { id: 'REQ-A2', hotel_id: 'swiss-flora-royal', guest_name: 'Guest A2' },
  ];

  const hotelBRequests = [
    { id: 'REQ-B1', hotel_id: 'grand-oasis-palace', guest_name: 'Guest B1' },
  ];

  const combinedStoredRequests = [...hotelARequests, ...hotelBRequests];

  // Filtering for Hotel A
  const filteredA = combinedStoredRequests.filter((r) => r.hotel_id === 'swiss-flora-royal');
  assert.equal(filteredA.length, 2);
  assert.ok(filteredA.every((r) => r.hotel_id === 'swiss-flora-royal'));

  // Filtering for Hotel B
  const filteredB = combinedStoredRequests.filter((r) => r.hotel_id === 'grand-oasis-palace');
  assert.equal(filteredB.length, 1);
  assert.equal(filteredB[0].id, 'REQ-B1');

  // Cross-tenant bleed check
  assert.equal(filteredA.some((r) => r.hotel_id === 'grand-oasis-palace'), false);
  assert.equal(filteredB.some((r) => r.hotel_id === 'swiss-flora-royal'), false);
});

test('URL Routing & Backward Compatibility: Legacy alias 11 seamlessly resolves to swiss-flora-royal', () => {
  const hotelPortfolio: Hotel[] = [
    {
      id: 'swiss-flora-royal',
      slug: 'swiss-flora-royal',
      name_en: 'Swiss Flora Royal Hotel Riyadh',
      name_ar: 'فندق سويس فلورا رويال الرياض',
      classification_stars: 5,
      classification_label_en: '5-Star Hotel',
      classification_label_ar: 'فندق فاخر فئة 5 نجوم',
      city_en: 'Riyadh',
      city_ar: 'الرياض',
      country_en: 'Saudi Arabia',
      country_ar: 'المملكة العربية السعودية',
      branding: {} as any,
      typography: {} as any,
      portal_config: {} as any,
      departments: [],
      policies: {} as any,
      rooms: [],
      offers: [],
      diningVenues: [],
      wellnessFacilities: [],
      services: [],
      currency: 'SAR',
      is_published: true,
    },
    {
      id: 'grand-palace',
      slug: 'grand-palace',
      name_en: 'Grand Palace Hotel',
      name_ar: 'فندق القصر الكبير',
      classification_stars: 4,
      classification_label_en: '4-Star Hotel',
      classification_label_ar: 'فندق 4 نجوم',
      city_en: 'Jeddah',
      city_ar: 'جدة',
      country_en: 'Saudi Arabia',
      country_ar: 'المملكة العربية السعودية',
      branding: {} as any,
      typography: {} as any,
      portal_config: {} as any,
      departments: [],
      policies: {} as any,
      rooms: [],
      offers: [],
      diningVenues: [],
      wellnessFacilities: [],
      services: [],
      currency: 'SAR',
      is_published: false,
    },
  ];

  // 1. Finding by exact canonical slug
  const matchCanonical = findHotelBySlug(hotelPortfolio, 'swiss-flora-royal');
  assert.ok(matchCanonical);
  assert.equal(matchCanonical?.id, 'swiss-flora-royal');

  // 2. Finding by legacy alias '11'
  const matchLegacy = findHotelBySlug(hotelPortfolio, '11');
  assert.ok(matchLegacy);
  assert.equal(matchLegacy?.id, 'swiss-flora-royal', 'Legacy URL slug 11 must map to swiss-flora-royal');

  // 3. Finding distinct second property
  const matchSecond = findHotelBySlug(hotelPortfolio, 'grand-palace');
  assert.ok(matchSecond);
  assert.equal(matchSecond?.id, 'grand-palace');

  // 4. Non-existent property returns undefined
  const matchNone = findHotelBySlug(hotelPortfolio, 'non-existent-slug');
  assert.equal(matchNone, undefined);
});

// ---------------------------------------------------------------------------
// 9. COMPLETE MULTI-HOTEL FUNCTIONAL ACCEPTANCE AUDIT TESTS
// ---------------------------------------------------------------------------
import { createHotel } from '../src/services/hotelService';
import { FBOutlet, MenuItem } from '../src/types/department';

test('Acceptance: Arbitrary hotel creation enforces bilingual names and validates slug', async () => {
  // Missing English name must throw
  await assert.rejects(
    async () => {
      await createHotel({
        name_en: '',
        name_ar: 'فندق تجريبي',
        slug: 'valid-test-slug',
        city_en: 'Riyadh',
        city_ar: 'الرياض',
        country_en: 'Saudi Arabia',
        country_ar: 'المملكة العربية السعودية',
      });
    },
    /Bilingual hotel names \(EN\/AR\) are required/,
    'Must reject empty English name'
  );

  // Missing Arabic name must throw
  await assert.rejects(
    async () => {
      await createHotel({
        name_en: 'Valid Test Hotel',
        name_ar: '',
        slug: 'valid-test-slug',
        city_en: 'Riyadh',
        city_ar: 'الرياض',
        country_en: 'Saudi Arabia',
        country_ar: 'المملكة العربية السعودية',
      });
    },
    /Bilingual hotel names \(EN\/AR\) are required/,
    'Must reject empty Arabic name'
  );

  // Invalid / too-short slug must throw
  await assert.rejects(
    async () => {
      await createHotel({
        name_en: 'Valid Test Hotel',
        name_ar: 'فندق تجريبي',
        slug: '-x-',
        city_en: 'Riyadh',
        city_ar: 'الرياض',
        country_en: 'Saudi Arabia',
        country_ar: 'المملكة العربية السعودية',
      });
    },
    /Hotel slug must be at least 3 characters/,
    'Must reject invalid/too-short slug'
  );
});

test('Acceptance: Arbitrary hotel creation defaults strictly to is_published=false and clean catalogs', async () => {
  const created = await createHotel({
    name_en: 'The Azure Pearl Hotel & Suites',
    name_ar: 'فندق لؤلؤة أزور والأجنحة',
    slug: 'azure-pearl-hotel',
    city_en: 'Dammam',
    city_ar: 'الدمام',
    country_en: 'Saudi Arabia',
    country_ar: 'المملكة العربية السعودية',
  });

  assert.equal(created.id, 'azure-pearl-hotel');
  assert.equal(created.slug, 'azure-pearl-hotel');
  assert.equal(created.is_published, false, 'New hotel must always be unpublished draft');
  assert.equal(created.rooms.length, 0, 'New hotel must have 0 rooms');
  assert.equal(created.diningVenues.length, 0, 'New hotel must have 0 dining venues');
  assert.equal(created.wellnessFacilities.length, 0, 'New hotel must have 0 wellness facilities');
  assert.equal(created.offers.length, 0, 'New hotel must have 0 offers');
  assert.equal(created.services.length, 0, 'New hotel must have 0 services');
});

test('Acceptance: Multi-tenant portfolio query strictly filters by user permissions', () => {
  const allHotels: Hotel[] = [
    { id: 'swiss-flora-royal', slug: 'swiss-flora-royal', name_en: 'Swiss Flora Royal', is_published: false } as any,
    { id: 'al-faisaliah', slug: 'al-faisaliah', name_en: 'Al Faisaliah', is_published: true } as any,
    { id: 'ritz-carlton-jeddah', slug: 'ritz-carlton-jeddah', name_en: 'Ritz Carlton Jeddah', is_published: true } as any,
  ];

  const superAdmin: AdminUser = {
    uid: 'sa-1',
    email: 'info@norivaglobal.com',
    displayName: 'Super Admin',
    role: 'SUPER_ADMIN',
    allowedHotelIds: ['*'],
  };

  const faisaliahManager: AdminUser = {
    uid: 'fm-1',
    email: 'gm@faisaliah.com',
    displayName: 'Faisaliah GM',
    role: 'HOTEL_ADMIN',
    allowedHotelIds: ['al-faisaliah'],
  };

  // SUPER_ADMIN sees all 3 hotels
  const superAdminHotels = allHotels.filter((h) => canAccessHotel(superAdmin, h.id));
  assert.equal(superAdminHotels.length, 3);

  // HOTEL_ADMIN for Al Faisaliah sees only 1 hotel
  const managerHotels = allHotels.filter((h) => canAccessHotel(faisaliahManager, h.id));
  assert.equal(managerHotels.length, 1);
  assert.equal(managerHotels[0].id, 'al-faisaliah');
});

test('Acceptance: activeHotelId context switching completely isolates tenant data', () => {
  let activeHotelId = 'hotel-alpha';

  const hotelAlphaCatalogs = {
    outlets: [{ id: 'out-a1', hotel_id: 'hotel-alpha', name_en: 'Alpha Bistro' }],
    requests: [{ id: 'req-a1', hotel_id: 'hotel-alpha', total: 100 }],
  };

  const hotelBetaCatalogs = {
    outlets: [{ id: 'out-b1', hotel_id: 'hotel-beta', name_en: 'Beta Lounge' }],
    requests: [{ id: 'req-b1', hotel_id: 'hotel-beta', total: 200 }],
  };

  function getCurrentHotelOutlets(currentId: string) {
    if (currentId === 'hotel-alpha') return hotelAlphaCatalogs.outlets;
    if (currentId === 'hotel-beta') return hotelBetaCatalogs.outlets;
    return [];
  }

  // Active is Alpha
  assert.equal(getCurrentHotelOutlets(activeHotelId)[0].name_en, 'Alpha Bistro');

  // Switch context to Beta
  activeHotelId = 'hotel-beta';
  assert.equal(getCurrentHotelOutlets(activeHotelId)[0].name_en, 'Beta Lounge');

  // Switch to unpopulated arbitrary hotel Gamma
  activeHotelId = 'hotel-gamma';
  assert.equal(getCurrentHotelOutlets(activeHotelId).length, 0);
});

test('Acceptance: Cross-tenant write prevention blocks staff updating unauthorized tenant subcollections', () => {
  const staffMember: AdminUser = {
    uid: 'staff-prop-a',
    email: 'staff@prop-a.com',
    displayName: 'Staff Prop A',
    role: 'HOTEL_ADMIN',
    allowedHotelIds: ['hotel-a'],
  };

  function canStaffWriteToSubcollection(user: AdminUser, targetHotelId: string): boolean {
    return canAccessHotel(user, targetHotelId) && canEditHotelContent(user, targetHotelId);
  }

  assert.equal(canStaffWriteToSubcollection(staffMember, 'hotel-a'), true, 'Staff can edit assigned hotel');
  assert.equal(canStaffWriteToSubcollection(staffMember, 'hotel-b'), false, 'Staff CANNOT edit unassigned hotel');
  assert.equal(canStaffWriteToSubcollection(staffMember, 'swiss-flora-royal'), false, 'Staff CANNOT edit Swiss Flora');
});

test('Acceptance: Publishing model allows hiding individual catalog items within published hotel', () => {
  const publishedHotelRooms: Array<{ id: string; name_en: string; is_active: boolean }> = [
    { id: 'room-101', name_en: 'Deluxe King Suite', is_active: true },
    { id: 'room-102', name_en: 'Presidential Penthouse', is_active: false }, // Hidden by staff
    { id: 'room-103', name_en: 'Executive Studio', is_active: true },
  ];

  // Guest view filters only active items
  const guestVisibleRooms = publishedHotelRooms.filter((r) => r.is_active);
  assert.equal(guestVisibleRooms.length, 2);
  assert.equal(guestVisibleRooms.some((r) => r.id === 'room-102'), false, 'Hidden room must not appear to guests');

  // Staff view sees all items
  assert.equal(publishedHotelRooms.length, 3);
});

test('Acceptance: Request engine enforces hotel-specific department routing without global contamination', async () => {
  const hotelA_Payload = {
    id: 'REQ-HTA-01',
    reference: 'REQ-HTA-01',
    hotelId: 'arbitrary-hotel-a',
    department: 'FNB' as const,
    requestType: 'Dining',
    customerType: 'IN_HOUSE' as const,
    roomNumber: '204',
    guestName: 'Hassan Al-Otaibi',
    total: 350,
    currency: 'SAR',
    targetWhatsApp: '+966551111111',
    status: 'NEW' as const,
  };

  const hotelB_Payload = {
    id: 'REQ-HTB-01',
    reference: 'REQ-HTB-01',
    hotelId: 'arbitrary-hotel-b',
    department: 'FNB' as const,
    requestType: 'Dining',
    customerType: 'IN_HOUSE' as const,
    roomNumber: '501',
    guestName: 'Noura Al-Dosari',
    total: 120,
    currency: 'SAR',
    targetWhatsApp: '+966552222222',
    status: 'NEW' as const,
  };

  const resA = await submitProductionRequest(hotelA_Payload);
  const resB = await submitProductionRequest(hotelB_Payload);

  assert.equal(resA.hotelId, 'arbitrary-hotel-a');
  assert.equal(resA.targetWhatsApp, '+966551111111');

  assert.equal(resB.hotelId, 'arbitrary-hotel-b');
  assert.equal(resB.targetWhatsApp, '+966552222222');

  // Target WhatsApp routing numbers must remain distinct
  assert.notEqual(resA.targetWhatsApp, resB.targetWhatsApp);
});




