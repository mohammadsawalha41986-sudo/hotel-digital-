// src/utils/feedbackStorage.ts
import {
  GuestFeedbackCase,
  FeedbackAuditLog,
  FeedbackType,
  FeedbackStatus,
  FeedbackPriority,
  PreferredContactMethod,
} from '../types/feedback';

const FEEDBACK_STORAGE_KEY = 'hotel_feedback_cases_v1';
const FEEDBACK_AUDIT_STORAGE_KEY = 'hotel_feedback_audit_v1';

export const COMPLAINT_CATEGORIES: { id: string; en: string; ar: string }[] = [
  { id: 'room', en: 'Room & Amenities', ar: 'الغرفة وتجهيزاتها' },
  { id: 'housekeeping', en: 'Housekeeping & Cleanliness', ar: 'النظافة وخدمة الغرف' },
  { id: 'maintenance', en: 'Maintenance & AC / Plumbing', ar: 'الصيانة والتكييف والسباكة' },
  { id: 'fnb', en: 'Food & Beverage', ar: 'المأكولات والمشروبات' },
  { id: 'room_service', en: 'Room Service Delivery', ar: 'توصيل خدمة الغرف' },
  { id: 'laundry', en: 'Valet Laundry Service', ar: 'خدمة غسيل وكي الملابس' },
  { id: 'spa', en: 'Spa & Wellness', ar: 'السبا والنادي الصحي' },
  { id: 'front_desk', en: 'Front Desk & Check-in', ar: 'الاستقبال وإجراءات الدخول' },
  { id: 'staff_service', en: 'Staff Service & Conduct', ar: 'تعامل الموظفين' },
  { id: 'noise', en: 'Noise & Disturbances', ar: 'الضوضاء والإزعاج' },
  { id: 'billing', en: 'Billing & Charges', ar: 'الفواتير والرسوم' },
  { id: 'facilities', en: 'Facilities & Elevators', ar: 'المرافق والمصاعد' },
  { id: 'security', en: 'Security & Safety', ar: 'الأمن والسلامة' },
  { id: 'other', en: 'Other Issue', ar: 'مشكلة أخرى' },
];

export const SUGGESTION_CATEGORIES: { id: string; en: string; ar: string }[] = [
  { id: 'service', en: 'Guest Service & Hospitality', ar: 'الضيافة وخدمة النزلاء' },
  { id: 'fnb', en: 'Dining & Menu Offerings', ar: 'المطاعم وقائمة الطعام' },
  { id: 'room', en: 'Room Comfort & Setup', ar: 'راحة الغرف وتجهيزاتها' },
  { id: 'facilities', en: 'Hotel Amenities & Facilities', ar: 'المرافق والخدمات العامة' },
  { id: 'spa', en: 'Wellness & Fitness', ar: 'اللياقة والاستجمام' },
  { id: 'technology', en: 'Digital Experience & Wi-Fi', ar: 'التجربة الرقمية والواي فاي' },
  { id: 'guest_experience', en: 'General Guest Experience', ar: 'تجربة الإقامة العامة' },
  { id: 'other', en: 'Other Suggestion', ar: 'اقتراح آخر' },
];

const INITIAL_FEEDBACK_SEED: GuestFeedbackCase[] = [
  {
    id: 'CASE-001',
    reference: 'CMP-48291',
    hotelId: '11', // Royal
    type: 'COMPLAINT',
    category: 'maintenance',
    category_ar: 'الصيانة والتكييف والسباكة',
    roomNumber: 'Suite 405',
    guestName: 'Bader Al-Shammari',
    phone: '+966504443322',
    email: 'bader.shammari@example.com',
    preferredContactMethod: 'whatsapp',
    preferredCallbackTime: 'Morning (09:00 - 12:00)',
    message:
      'The shower mixer temperature regulation is fluctuating between hot and cold. Kindly send a maintenance technician to inspect.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    assignedDepartmentId: 'maintenance',
    assignedUserId: 'Duty Manager Tariq',
    followUpRequired: true,
    submittedAt: '2026-09-16T14:20:00Z',
    acknowledgedAt: '2026-09-16T14:35:00Z',
    internalNotes: [
      {
        id: 'NOTE-1',
        author: 'Front Desk Supervisor',
        note: 'Assigned to chief engineer. Technician scheduled for 15:00.',
        createdAt: '2026-09-16T14:40:00Z',
      },
    ],
  },
  {
    id: 'CASE-002',
    reference: 'SGT-83921',
    hotelId: '11',
    type: 'SUGGESTION',
    category: 'fnb',
    category_ar: 'المطاعم وقائمة الطعام',
    guestName: 'Layla Al-Dosari',
    roomNumber: 'Room 312',
    message:
      'It would be wonderful to have gluten-free and oat milk options clearly labeled at the Flora Restaurant breakfast buffet.',
    priority: 'NORMAL',
    status: 'ACKNOWLEDGED',
    assignedDepartmentId: 'restaurant',
    followUpRequired: false,
    submittedAt: '2026-09-15T10:00:00Z',
    acknowledgedAt: '2026-09-15T11:00:00Z',
    managementResponse:
      'Thank you for this valuable suggestion. Our Executive Chef has added labeled gluten-free items and alternative milks to the breakfast station.',
  },
  {
    id: 'CASE-003',
    reference: 'CMPM-38291',
    hotelId: '11',
    type: 'COMPLIMENT',
    category: 'front_desk',
    category_ar: 'الاستقبال وإجراءات الدخول',
    staffName: 'Ziyad (Concierge)',
    department: 'Concierge Desk',
    guestName: 'Dr. Faisal Al-Harthi',
    roomNumber: 'Royal Suite 701',
    message:
      'Ziyad went above and beyond to arrange last-minute VIP airport transfer and business lounge access during a critical meeting. Outstanding professionalism!',
    priority: 'NORMAL',
    status: 'RESOLVED',
    followUpRequired: false,
    submittedAt: '2026-09-14T18:00:00Z',
    acknowledgedAt: '2026-09-14T18:15:00Z',
    resolvedAt: '2026-09-14T19:00:00Z',
    internalNotes: [
      {
        id: 'NOTE-2',
        author: 'General Manager',
        note: 'Commended Ziyad during morning line-up; added recognition letter to file.',
        createdAt: '2026-09-15T08:00:00Z',
      },
    ],
  },
  {
    id: 'CASE-004',
    reference: 'MGR-74921',
    hotelId: '11',
    type: 'MANAGEMENT_REQUEST',
    category: 'billing',
    category_ar: 'الفواتير والرسوم',
    roomNumber: 'Suite 510',
    guestName: 'Eng. Nasser Al-Qahtani',
    phone: '+966551122334',
    preferredContactMethod: 'phone',
    preferredCallbackTime: 'Immediately',
    message:
      'Guest requested Duty Manager consultation regarding corporate tax invoice itemization before departure.',
    priority: 'URGENT',
    status: 'RESOLVED',
    assignedUserId: 'Duty Manager Hani',
    followUpRequired: true,
    submittedAt: '2026-09-16T17:00:00Z',
    acknowledgedAt: '2026-09-16T17:05:00Z',
    resolvedAt: '2026-09-16T17:40:00Z',
  },
  // Inn feedback case
  {
    id: 'CASE-005',
    reference: 'CMP-29104',
    hotelId: '12', // Inn
    type: 'COMPLAINT',
    category: 'room',
    category_ar: 'الغرفة وتجهيزاتها',
    roomNumber: 'Room 208',
    guestName: 'Turki Al-Subaie',
    phone: '+966567788990',
    preferredContactMethod: 'room_visit',
    message: 'Need additional desk lamp for work and extra pillows.',
    priority: 'NORMAL',
    status: 'RESOLVED',
    assignedDepartmentId: 'housekeeping',
    followUpRequired: false,
    submittedAt: '2026-09-15T20:00:00Z',
    acknowledgedAt: '2026-09-15T20:10:00Z',
    resolvedAt: '2026-09-15T20:25:00Z',
  },
];

function loadStoredFeedback(): GuestFeedbackCase[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(INITIAL_FEEDBACK_SEED));
      return INITIAL_FEEDBACK_SEED;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return INITIAL_FEEDBACK_SEED;
  } catch {
    return INITIAL_FEEDBACK_SEED;
  }
}

function saveStoredFeedback(cases: GuestFeedbackCase[]): void {
  try {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(cases));
  } catch (err) {
    console.error('Failed to save feedback cases to localStorage:', err);
  }
}

function loadStoredFeedbackAudit(): FeedbackAuditLog[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_AUDIT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function appendFeedbackAudit(log: Omit<FeedbackAuditLog, 'id' | 'timestamp'>): void {
  try {
    const current = loadStoredFeedbackAudit();
    const entry: FeedbackAuditLog = {
      ...log,
      id: `FLOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    current.unshift(entry);
    localStorage.setItem(FEEDBACK_AUDIT_STORAGE_KEY, JSON.stringify(current.slice(0, 200)));
  } catch (err) {
    console.error('Failed to record feedback audit:', err);
  }
}

export function generateFeedbackReference(type: FeedbackType): string {
  const rand = Math.floor(10000 + Math.random() * 90000);
  switch (type) {
    case 'COMPLAINT':
      return `CMP-${rand}`;
    case 'SUGGESTION':
      return `SGT-${rand}`;
    case 'COMPLIMENT':
      return `CMPM-${rand}`;
    case 'FEEDBACK':
      return `FDB-${rand}`;
    case 'MANAGEMENT_REQUEST':
      return `MGR-${rand}`;
    default:
      return `GRC-${rand}`;
  }
}

export interface FeedbackSubmissionPayload {
  hotelId: string;
  type: FeedbackType;
  category: string;
  category_ar?: string;
  roomNumber?: string;
  guestName?: string;
  phone?: string;
  email?: string;
  preferredContactMethod?: PreferredContactMethod;
  preferredCallbackTime?: string;
  staffName?: string;
  department?: string;
  rating?: number;
  message: string;
  urgency?: 'normal' | 'high' | 'urgent';
  isAnonymous?: boolean;
}

export function submitGuestFeedback(payload: FeedbackSubmissionPayload): {
  success: boolean;
  reference: string;
  message: string;
} {
  if (!payload.message || payload.message.trim().length < 5) {
    return {
      success: false,
      reference: '',
      message: 'Please write a message of at least 5 characters.',
    };
  }

  const reference = generateFeedbackReference(payload.type);

  // Determine priority
  let priority: FeedbackPriority = 'NORMAL';
  if (
    payload.urgency === 'urgent' ||
    payload.type === 'MANAGEMENT_REQUEST' ||
    payload.category === 'security'
  ) {
    priority = 'URGENT';
  } else if (payload.urgency === 'high' || payload.type === 'COMPLAINT') {
    priority = 'HIGH';
  }

  const newCase: GuestFeedbackCase = {
    id: `CASE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    reference,
    hotelId: payload.hotelId,
    type: payload.type,
    category: payload.category,
    category_ar: payload.category_ar,
    roomNumber: payload.roomNumber?.trim(),
    guestName: payload.isAnonymous ? 'Anonymous Guest' : payload.guestName?.trim(),
    phone: payload.phone?.trim(),
    email: payload.email?.trim(),
    preferredContactMethod: payload.preferredContactMethod,
    preferredCallbackTime: payload.preferredCallbackTime,
    staffName: payload.staffName?.trim(),
    department: payload.department?.trim(),
    rating: payload.rating,
    message: payload.message.trim(),
    priority,
    status: 'NEW',
    followUpRequired: Boolean(payload.phone || payload.email || payload.roomNumber),
    isAnonymous: Boolean(payload.isAnonymous),
    submittedAt: new Date().toISOString(),
  };

  const cases = loadStoredFeedback();
  cases.unshift(newCase);
  saveStoredFeedback(cases);

  appendFeedbackAudit({
    reference,
    hotelId: payload.hotelId,
    action: 'SUBMITTED',
    user: payload.guestName ? `${payload.guestName} (Guest)` : 'Guest (In-House/Web)',
    details: `Type: ${payload.type} | Priority: ${priority} | Room: ${payload.roomNumber || 'N/A'}`,
  });

  return {
    success: true,
    reference,
    message: 'Feedback received successfully.',
  };
}

export function getFeedbackCasesForAdmin(hotelId?: string): GuestFeedbackCase[] {
  const all = loadStoredFeedback();
  if (!hotelId) return all;
  return all.filter((c) => c.hotelId === hotelId);
}

export function updateFeedbackCaseStatus(
  reference: string,
  newStatus: FeedbackStatus,
  adminUser: string,
  details?: string
): boolean {
  const cases = loadStoredFeedback();
  const index = cases.findIndex((c) => c.reference === reference);
  if (index === -1) return false;

  const prev = cases[index].status;
  cases[index].status = newStatus;
  const now = new Date().toISOString();

  if (newStatus === 'ACKNOWLEDGED' && !cases[index].acknowledgedAt) {
    cases[index].acknowledgedAt = now;
  } else if (newStatus === 'RESOLVED') {
    cases[index].resolvedAt = now;
  } else if (newStatus === 'CLOSED') {
    cases[index].closedAt = now;
  }

  saveStoredFeedback(cases);

  appendFeedbackAudit({
    reference,
    hotelId: cases[index].hotelId,
    action:
      newStatus === 'ACKNOWLEDGED'
        ? 'ACKNOWLEDGED'
        : newStatus === 'RESOLVED'
        ? 'RESOLVED'
        : newStatus === 'CLOSED'
        ? 'CLOSED'
        : newStatus === 'ESCALATED'
        ? 'ESCALATED'
        : 'REOPENED',
    user: adminUser,
    details: details || `Status updated from ${prev} to ${newStatus}`,
  });

  return true;
}

export function assignFeedbackCase(
  reference: string,
  departmentId: string,
  managerName: string,
  adminUser: string
): boolean {
  const cases = loadStoredFeedback();
  const index = cases.findIndex((c) => c.reference === reference);
  if (index === -1) return false;

  cases[index].assignedDepartmentId = departmentId;
  cases[index].assignedUserId = managerName;
  if (cases[index].status === 'NEW') {
    cases[index].status = 'IN_PROGRESS';
  }
  saveStoredFeedback(cases);

  appendFeedbackAudit({
    reference,
    hotelId: cases[index].hotelId,
    action: 'ASSIGNED',
    user: adminUser,
    details: `Assigned to ${departmentId} dept (${managerName})`,
  });

  return true;
}

export function addInternalNoteToCase(
  reference: string,
  note: string,
  adminUser: string
): boolean {
  const cases = loadStoredFeedback();
  const index = cases.findIndex((c) => c.reference === reference);
  if (index === -1) return false;

  if (!cases[index].internalNotes) {
    cases[index].internalNotes = [];
  }

  cases[index].internalNotes!.push({
    id: `NOTE-${Date.now()}`,
    author: adminUser,
    note: note.trim(),
    createdAt: new Date().toISOString(),
  });

  saveStoredFeedback(cases);

  appendFeedbackAudit({
    reference,
    hotelId: cases[index].hotelId,
    action: 'NOTE_ADDED',
    user: adminUser,
    details: `Note added: "${note.slice(0, 30)}..."`,
  });

  return true;
}

export function getFeedbackAuditLogs(hotelId?: string): FeedbackAuditLog[] {
  const logs = loadStoredFeedbackAudit();
  if (!hotelId) return logs;
  return logs.filter((l) => l.hotelId === hotelId);
}
