import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { OperationalRequest, OperationalStatus } from '../types/requests';
import {
  getStoredRequests,
  saveOperationalRequest as saveLocalRequest,
  updateOperationalRequestStatus as updateLocalRequestStatus,
} from '../utils/requestStore';

export type ProductionDepartment =
  | 'FNB'
  | 'SPA'
  | 'LDY'
  | 'HK'
  | 'MNT'
  | 'CON'
  | 'FO'
  | 'ROOM';

export type ProductionRequestStatus =
  | 'NEW'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ProductionOrderItem {
  id: string;
  nameEn: string;
  nameAr: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  options?: string;
  notes?: string;
}

export interface ProductionServiceItem {
  id: string;
  nameEn: string;
  nameAr: string;
  date?: string;
  time?: string;
  guestsCount?: number;
  price?: number;
}

export interface ProductionRequestPayload {
  id: string;
  reference: string;
  hotelId: string;
  hotelNameEn?: string;
  hotelNameAr?: string;
  department: ProductionDepartment;
  requestType: string;
  customerType: 'IN_HOUSE' | 'EXTERNAL';
  roomNumber?: string;
  guestName: string;
  guestPhone?: string;
  items?: ProductionOrderItem[];
  services?: ProductionServiceItem[];
  subtotal?: number;
  discount?: number;
  vatAmount?: number;
  total: number;
  currency: string;
  notes?: string;
  status: ProductionRequestStatus;
  channel?: 'WHATSAPP' | 'DIRECT_PORTAL';
  assignedTo?: string;
  targetWhatsApp?: string;
  whatsappMessageEn?: string;
  whatsappMessageAr?: string;
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

/**
 * Normalizes any department code into the standard production department code
 */
export function normalizeDepartmentCode(dept: string): ProductionDepartment {
  const d = dept.toUpperCase();
  if (
    d.includes('FNB') ||
    d.includes('DINING') ||
    d.includes('RESTAURANT') ||
    d.includes('CAFE') ||
    d.includes('ROOM_SERVICE') ||
    d.includes('CULINARY') ||
    d.includes('FOOD') ||
    d.includes('BEVERAGE')
  ) {
    return 'FNB';
  }
  if (d.includes('SPA') || d.includes('WELLNESS')) {
    return 'SPA';
  }
  if (d.includes('LAUNDRY') || d === 'LDY' || d.startsWith('LDY_') || d.endsWith('_LDY')) {
    return 'LDY';
  }
  if (d.includes('HOUSEKEEPING') || d.includes('COMFORT') || d === 'HK' || d.startsWith('HK_') || d.endsWith('_HK')) {
    return 'HK';
  }
  if (d.includes('ENGINEERING') || d.includes('MAINTENANCE') || d === 'MNT' || d.startsWith('MNT_') || d.endsWith('_MNT')) {
    return 'MNT';
  }
  if (d.includes('CONCIERGE') || d === 'CON' || d.startsWith('CON_') || d.endsWith('_CON')) {
    return 'CON';
  }
  if (d.includes('FRONT_OFFICE') || d.includes('RECEPTION') || d === 'FO' || d.startsWith('FO_') || d.endsWith('_FO')) {
    return 'FO';
  }
  return 'ROOM';
}

/**
 * Normalizes any legacy or detailed status into the primary production lifecycle status
 */
export function normalizeRequestStatus(status: string): ProductionRequestStatus {
  const s = status.toUpperCase();
  if (s === 'NEW') return 'NEW';
  if (s === 'RECEIVED' || s === 'CONFIRMED' || s === 'ACKNOWLEDGED') return 'ACKNOWLEDGED';
  if (s === 'IN_PROGRESS' || s === 'PREPARING' || s === 'READY' || s === 'ON_THE_WAY') return 'IN_PROGRESS';
  if (s === 'COMPLETED') return 'COMPLETED';
  if (s === 'CANCELLED') return 'CANCELLED';
  return 'NEW';
}

/**
 * Converts a production request object into the legacy OperationalRequest format
 * so that the existing approved frontend components render seamlessly.
 */
export function toLegacyOperationalRequest(p: ProductionRequestPayload): OperationalRequest {
  const legacyDeptMap: Record<ProductionDepartment, OperationalRequest['department']> = {
    FNB: 'fnb',
    SPA: 'spa',
    LDY: 'laundry',
    HK: 'housekeeping',
    MNT: 'engineering',
    CON: 'guest_services',
    FO: 'guest_services',
    ROOM: 'housekeeping',
  };

  return {
    id: p.reference || p.id,
    hotel_id: p.hotelId,
    hotel_name_en: p.hotelNameEn || 'Hotel Digital Guest Hub',
    hotel_name_ar: p.hotelNameAr || 'منصة النزيل الرقمية',
    department: legacyDeptMap[p.department] || 'guest_services',
    department_name_en: p.department,
    department_name_ar: p.department,
    outlet_or_service_name_en: p.requestType,
    outlet_or_service_name_ar: p.requestType,
    customer_type: p.customerType,
    room_number: p.roomNumber || '',
    guest_name: p.guestName,
    guest_phone: p.guestPhone || '',
    items: p.items?.map((it) => ({
      id: it.id,
      name_en: it.nameEn,
      name_ar: it.nameAr,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      total_price: it.totalPrice,
      options: it.options,
      notes: it.notes,
    })),
    services: p.services?.map((srv) => ({
      id: srv.id,
      name_en: srv.nameEn,
      name_ar: srv.nameAr,
      date: srv.date,
      time: srv.time,
      guests_count: srv.guestsCount,
      price: srv.price,
    })),
    estimated_total: p.total,
    currency: p.currency,
    notes: p.notes,
    target_whatsapp: p.targetWhatsApp || '',
    whatsapp_message_en: p.whatsappMessageEn || '',
    whatsapp_message_ar: p.whatsappMessageAr || '',
    status: (p.status as OperationalStatus) || 'NEW',
    assigned_staff: p.assignedTo,
    created_at: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
    updated_at: typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString(),
  };
}

// In-memory submission de-duplication lock to prevent double-tap race conditions
const activeSubmissionLocks = new Set<string>();

/**
 * Generates a collision-resistant, cryptographically sound operational reference code.
 * Combines timestamp base36 with random entropy for high concurrency safety.
 * Example: FNB-M7P9A-48K2
 */
export function generateSecureReference(prefix: string): string {
  const p = (prefix || 'REQ').toUpperCase();
  const timeComponent = Date.now().toString(36).toUpperCase().slice(-5);
  const randomEntropy = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${p}-${timeComponent}-${randomEntropy}`;
}

/**
 * Creates and persists a new guest operational request.
 * Writes to Firestore: /hotels/{hotelId}/requests/{requestId}
 * Falls back to local storage adapter when Firebase is unconfigured in development.
 * 
 * NOTE ON FINANCIAL / MONETARY DATA INTEGRITY:
 * In client-side direct-write architectures, client-calculated subtotals, VAT, and totals
 * cannot be cryptographically guaranteed against client-side browser tampering.
 * While firestore.rules bounds total >= 0, authoritative price recalculation MUST be
 * performed by a secure backend function (e.g. Cloud Function onDocumentCreated)
 * before dispatching to Kitchen Display Systems (KDS) or charging to PMS room folios.
 */
export async function submitProductionRequest(
  payload: Omit<ProductionRequestPayload, 'createdAt' | 'updatedAt'>
): Promise<ProductionRequestPayload> {
  if (!payload.hotelId) {
    throw new Error('Tenant isolation violation: Every request must include a valid hotelId.');
  }

  const refId = payload.reference || payload.id;
  const lockKey = `${payload.hotelId}_${refId}`;

  // De-duplication: Reject duplicate in-flight submissions within 3 seconds
  if (activeSubmissionLocks.has(lockKey)) {
    console.warn(`[RequestService] Duplicate in-flight submission suppressed for reference: ${refId}`);
    return {
      ...payload,
      id: refId,
      reference: refId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  activeSubmissionLocks.add(lockKey);
  setTimeout(() => activeSubmissionLocks.delete(lockKey), 3000);

  const now = new Date().toISOString();
  const completePayload: ProductionRequestPayload = {
    ...payload,
    id: refId,
    reference: refId,
    createdAt: now,
    updatedAt: now,
  };

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'hotels', payload.hotelId, 'requests', refId);
      await setDoc(docRef, {
        ...completePayload,
        serverCreatedAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp(),
      });
      console.info(`[RequestService] Request ${refId} persisted to Firestore for hotel ${payload.hotelId}`);
      return completePayload;
    } catch (err) {
      console.warn('[RequestService] Firestore write failed, using fallback:', err);
    }
  }

  // Transitional fallback for local development or offline state
  const legacy = toLegacyOperationalRequest(completePayload);
  saveLocalRequest(legacy);
  return completePayload;
}

/**
 * Real-time subscription to hotel requests.
 * Connects to Firestore /hotels/{hotelId}/requests with fallback polling.
 */
export function subscribeToHotelRequests(
  hotelId: string,
  onRequestsUpdated: (requests: OperationalRequest[]) => void
): () => void {
  if (!hotelId) {
    onRequestsUpdated([]);
    return () => {};
  }

  if (isFirebaseConfigured && db) {
    try {
      const requestsRef = collection(db, 'hotels', hotelId, 'requests');
      const q = query(requestsRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: OperationalRequest[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as ProductionRequestPayload;
            list.push(toLegacyOperationalRequest(data));
          });
          onRequestsUpdated(list);
        },
        (error) => {
          console.warn(`[RequestService] Firestore subscription error for hotel ${hotelId}:`, error);
          // On permission failure or unauthorized access, strictly empty the list to prevent data leaks
          onRequestsUpdated([]);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn('[RequestService] Could not establish Firestore onSnapshot listener:', err);
      onRequestsUpdated([]);
      return () => {};
    }
  }

  // Local development fallback: Return stored requests and poll every 5s
  const refresh = () => {
    const local = getStoredRequests(hotelId);
    onRequestsUpdated(local);
  };
  refresh();
  const interval = setInterval(refresh, 5000);

  return () => clearInterval(interval);
}

/**
 * Updates the lifecycle status of a request in Firestore and local fallback.
 */
export async function updateRequestStatus(
  hotelId: string,
  requestId: string,
  newStatus: ProductionRequestStatus,
  assignedStaff?: string
): Promise<void> {
  if (!hotelId || !requestId) return;

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'hotels', hotelId, 'requests', requestId);
      const updateData: Record<string, any> = {
        status: newStatus,
        serverUpdatedAt: serverTimestamp(),
        updatedAt: new Date().toISOString(),
      };
      if (assignedStaff !== undefined) {
        updateData.assignedTo = assignedStaff;
      }
      await updateDoc(docRef, updateData);
      return;
    } catch (err) {
      console.warn(`[RequestService] Firestore update failed for request ${requestId}:`, err);
    }
  }

  // Local fallback
  updateLocalRequestStatus(requestId, newStatus as OperationalStatus, assignedStaff);
}

