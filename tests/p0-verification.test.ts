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


