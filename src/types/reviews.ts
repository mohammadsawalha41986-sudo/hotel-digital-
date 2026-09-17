// src/types/reviews.ts
// Data types and interfaces for the Moderated Guest Reviews System

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';

export type ReviewSource =
  | 'WEBSITE'
  | 'ROOM_QR'
  | 'ADMIN'
  | 'GOOGLE'
  | 'TRIPADVISOR'
  | 'OTHER';

export type ReviewCategory =
  | 'Overall Stay'
  | 'Room'
  | 'Housekeeping'
  | 'Food & Beverage'
  | 'Café'
  | 'Spa & Wellness'
  | 'Staff Service'
  | 'Facilities'
  | 'Other';

export type DisplayNamePreference = 'full_name' | 'first_name' | 'anonymous';

export interface ManagementResponse {
  text: string;
  responderTitle_en: string;
  responderTitle_ar: string;
  respondedAt: string;
  isPublished: boolean;
  responderName?: string;
}

export interface GuestReview {
  id: string; // e.g. REV-49281
  hotelId: string;
  rating: number; // 1 - 5 active stars
  category: ReviewCategory;
  category_ar: string;

  guestName: string;
  displayNamePreference: DisplayNamePreference;
  publicDisplayName: string;

  roomNumber?: string; // Visible ONLY in Admin
  stayDate?: string;
  title?: string;
  comment: string;

  guestPhone?: string; // Private - Internal follow-up ONLY
  guestEmail?: string; // Private - Internal follow-up ONLY

  source: ReviewSource;
  verified: boolean; // Genuine verification (room QR or verified stay)

  status: ReviewStatus;
  published: boolean; // MUST be true AND status === 'APPROVED' to show publicly
  featured: boolean; // Highlighted in review slider

  flaggedForAttention?: boolean; // Negative review (1-2 stars) or complaint

  managementResponse?: ManagementResponse;

  consentToPublish: boolean;

  submittedAt: string;
  approvedAt?: string;
  publishedAt?: string;
  hiddenAt?: string;

  approvedBy?: string;
  lastModifiedBy?: string;
}

export interface ReviewAuditLog {
  id: string;
  reviewId: string;
  hotelId: string;
  action:
    | 'SUBMITTED'
    | 'APPROVED'
    | 'PUBLISHED'
    | 'HIDDEN'
    | 'UNPUBLISHED'
    | 'REJECTED'
    | 'DELETED'
    | 'FEATURED'
    | 'UNFEATURED'
    | 'RESPONSE_DRAFTED'
    | 'RESPONSE_PUBLISHED'
    | 'RESPONSE_HIDDEN';
  adminUser: string;
  timestamp: string;
  details?: string;
}

export interface ReviewSubmissionPayload {
  hotelId: string;
  rating: number;
  category: ReviewCategory;
  guestName: string;
  displayNamePreference: DisplayNamePreference;
  roomNumber?: string;
  stayDate?: string;
  title?: string;
  comment: string;
  guestPhone?: string;
  guestEmail?: string;
  consentToPublish: boolean;
  source?: ReviewSource;
  isVerified?: boolean;
}
