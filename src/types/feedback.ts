// src/types/feedback.ts
// Data types and interfaces for Guest Information, Contact & Management Feedback Hub

export type FeedbackType =
  | 'COMPLAINT'
  | 'SUGGESTION'
  | 'FEEDBACK'
  | 'COMPLIMENT'
  | 'MANAGEMENT_REQUEST';

export type FeedbackStatus =
  | 'NEW'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'ESCALATED';

export type FeedbackPriority = 'NORMAL' | 'HIGH' | 'URGENT';

export type PreferredContactMethod = 'phone' | 'whatsapp' | 'room_visit' | 'email';

export interface InternalNote {
  id: string;
  author: string;
  note: string;
  createdAt: string;
}

export interface GuestFeedbackCase {
  id: string;
  reference: string; // CMP-XXXXX, SGT-XXXXX, CMPM-XXXXX, FDB-XXXXX, MGR-XXXXX
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

  staffName?: string; // For staff compliments
  department?: string;

  rating?: number; // For general feedback rating (1-5)

  message: string;
  photoUrl?: string;

  priority: FeedbackPriority;
  status: FeedbackStatus;

  assignedDepartmentId?: string;
  assignedUserId?: string;

  internalNotes?: InternalNote[];
  managementResponse?: string;

  submittedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  closedAt?: string;

  followUpRequired: boolean;
  isAnonymous?: boolean;
}

export interface FeedbackAuditLog {
  id: string;
  reference: string;
  hotelId: string;
  action:
    | 'SUBMITTED'
    | 'ACKNOWLEDGED'
    | 'ASSIGNED'
    | 'REASSIGNED'
    | 'NOTE_ADDED'
    | 'RESPONDED'
    | 'ESCALATED'
    | 'RESOLVED'
    | 'CLOSED'
    | 'REOPENED';
  user: string;
  timestamp: string;
  details?: string;
}
