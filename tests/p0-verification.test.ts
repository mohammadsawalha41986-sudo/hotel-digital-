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
