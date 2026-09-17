// src/utils/reviewStorage.ts
import {
  GuestReview,
  ReviewAuditLog,
  ReviewSubmissionPayload,
  ReviewStatus,
  DisplayNamePreference,
  ReviewCategory,
} from '../types/reviews';

const REVIEWS_STORAGE_KEY = 'hotel_moderated_reviews_v1';
const REVIEWS_AUDIT_STORAGE_KEY = 'hotel_reviews_audit_log_v1';
const LAST_SUBMIT_TIME_KEY = 'hotel_review_last_submit_time';

export const REVIEW_CATEGORIES: { id: ReviewCategory; en: string; ar: string }[] = [
  { id: 'Overall Stay', en: 'Overall Stay', ar: 'الإقامة بشكل عام' },
  { id: 'Room', en: 'Room & Comfort', ar: 'الغرفة والراحة' },
  { id: 'Housekeeping', en: 'Housekeeping', ar: 'خدمة الغرف والنظافة' },
  { id: 'Food & Beverage', en: 'Food & Beverage', ar: 'المأكولات والمشروبات' },
  { id: 'Café', en: 'Café & Lounge', ar: 'المقهى واللاونج' },
  { id: 'Spa & Wellness', en: 'Spa & Wellness', ar: 'السبا والنادي الصحي' },
  { id: 'Staff Service', en: 'Staff Service', ar: 'تعامل وطاقم الخدمة' },
  { id: 'Facilities', en: 'Facilities', ar: 'المرافق والتجهيزات' },
  { id: 'Other', en: 'Other', ar: 'أخرى' },
];

export function getCategoryLabel(category: ReviewCategory, isAr: boolean): string {
  const match = REVIEW_CATEGORIES.find((c) => c.id === category);
  if (!match) return category;
  return isAr ? match.ar : match.en;
}

export function formatDisplayName(
  fullName: string,
  preference: DisplayNamePreference,
  isAr: boolean
): string {
  if (preference === 'anonymous') {
    return isAr ? 'نزيل الفندق' : 'Anonymous Guest';
  }
  if (!fullName || fullName.trim() === '') {
    return isAr ? 'نزيل الفندق' : 'Anonymous Guest';
  }

  const parts = fullName.trim().split(/\s+/);
  if (preference === 'first_name') {
    if (parts.length > 1) {
      return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
    }
    return parts[0];
  }

  // full_name
  return fullName.trim();
}

// Initial Realistic Seed Reviews
const INITIAL_SEED_REVIEWS: GuestReview[] = [
  // Swiss Flora Royal (hotelId: '11')
  {
    id: 'REV-10492',
    hotelId: '11',
    rating: 5,
    category: 'Overall Stay',
    category_ar: 'الإقامة بشكل عام',
    guestName: 'Sultan Al-Otaibi',
    displayNamePreference: 'full_name',
    publicDisplayName: 'Sultan Al-Otaibi',
    roomNumber: 'Royal Suite 502',
    stayDate: '2026-09-10',
    title: 'An unforgettable luxury sanctuary in Riyadh',
    comment:
      'The service at Swiss Flora Royal was beyond exemplary. From the private check-in to the aromatic floral lounge and bespoke butler service, every detail was orchestrated with utmost precision.',
    source: 'ROOM_QR',
    verified: true,
    status: 'APPROVED',
    published: true,
    featured: true,
    flaggedForAttention: false,
    consentToPublish: true,
    submittedAt: '2026-09-11T10:30:00Z',
    approvedAt: '2026-09-11T12:00:00Z',
    publishedAt: '2026-09-11T12:05:00Z',
    approvedBy: 'General Manager',
    managementResponse: {
      text:
        'Dear Sultan, thank you for your kind words. We are thrilled to know your stay in Royal Suite 502 was exceptional, and we look forward to welcoming you back very soon.',
      responderTitle_en: 'Response from Swiss Flora Royal Hotel',
      responderTitle_ar: 'رد إدارة فندق سويس فلورا رويال',
      respondedAt: '2026-09-11T14:20:00Z',
      isPublished: true,
      responderName: 'Dr. Tariq Al-Husseini (General Manager)',
    },
  },
  {
    id: 'REV-10495',
    hotelId: '11',
    rating: 5,
    category: 'Food & Beverage',
    category_ar: 'المأكولات والمشروبات',
    guestName: 'Noura Mansour',
    displayNamePreference: 'first_name',
    publicDisplayName: 'Noura M.',
    roomNumber: 'Deluxe Suite 308',
    stayDate: '2026-09-12',
    title: 'Sublime culinary experience and breakfast buffet',
    comment:
      'The breakfast buffet at Flora Restaurant offers an incredible variety of international and traditional Saudi dishes. The specialty coffee bar and warm croissants made our mornings delightful.',
    source: 'WEBSITE',
    verified: true,
    status: 'APPROVED',
    published: true,
    featured: true,
    flaggedForAttention: false,
    consentToPublish: true,
    submittedAt: '2026-09-13T09:15:00Z',
    approvedAt: '2026-09-13T11:00:00Z',
    publishedAt: '2026-09-13T11:10:00Z',
    approvedBy: 'Guest Relations Manager',
  },
  {
    id: 'REV-10498',
    hotelId: '11',
    rating: 4,
    category: 'Spa & Wellness',
    category_ar: 'السبا والنادي الصحي',
    guestName: 'Fahad Al-Shehri',
    displayNamePreference: 'full_name',
    publicDisplayName: 'Fahad Al-Shehri',
    roomNumber: 'Superior Room 412',
    stayDate: '2026-09-14',
    title: 'Quiet retreat and soothing Moroccan bath',
    comment:
      'Great spa facilities, very clean temperature-controlled pool, and attentive therapists. The only minor improvement would be extending pool hours until 11 PM on weekends.',
    source: 'ROOM_QR',
    verified: true,
    status: 'APPROVED',
    published: true,
    featured: false,
    flaggedForAttention: false,
    consentToPublish: true,
    submittedAt: '2026-09-14T18:40:00Z',
    approvedAt: '2026-09-15T08:30:00Z',
    publishedAt: '2026-09-15T08:35:00Z',
    approvedBy: 'Hotel Manager',
  },
  {
    id: 'REV-10502',
    hotelId: '11',
    rating: 5,
    category: 'Staff Service',
    category_ar: 'تعامل وطاقم الخدمة',
    guestName: 'Abdulaziz Al-Zahrani',
    displayNamePreference: 'anonymous',
    publicDisplayName: 'Anonymous Guest',
    roomNumber: 'Executive Room 204',
    stayDate: '2026-09-15',
    title: 'Courteous concierge and effortless check-in',
    comment:
      'The reception team greeted us warmly despite arriving past midnight. Luggage was delivered swiftly, and the digital QR room ordering made room service completely seamless.',
    source: 'WEBSITE',
    verified: false,
    status: 'APPROVED',
    published: true,
    featured: false,
    flaggedForAttention: false,
    consentToPublish: true,
    submittedAt: '2026-09-15T22:10:00Z',
    approvedAt: '2026-09-16T09:00:00Z',
    publishedAt: '2026-09-16T09:15:00Z',
    approvedBy: 'Guest Relations',
  },
  // Pending review in moderation queue
  {
    id: 'REV-10515',
    hotelId: '11',
    rating: 5,
    category: 'Housekeeping',
    category_ar: 'خدمة الغرف والنظافة',
    guestName: 'Rayan Al-Khatib',
    displayNamePreference: 'full_name',
    publicDisplayName: 'Rayan Al-Khatib',
    roomNumber: 'Suite 601',
    stayDate: '2026-09-16',
    title: 'Spotless cleanliness and prompt linen refresh',
    comment:
      'Housekeeping was impeccable. The room was refreshed twice daily with pleasant signature scent and complimentary evening sweets.',
    source: 'WEBSITE',
    verified: true,
    status: 'PENDING',
    published: false,
    featured: false,
    flaggedForAttention: false,
    consentToPublish: true,
    submittedAt: '2026-09-16T19:30:00Z',
    guestEmail: 'rayan.khatib@example.com',
    guestPhone: '+966501112233',
  },
  // Low rating flagged for attention in moderation queue (Service recovery)
  {
    id: 'REV-10518',
    hotelId: '11',
    rating: 2,
    category: 'Room',
    category_ar: 'الغرفة والراحة',
    guestName: 'Khaled Al-Ghamdi',
    displayNamePreference: 'first_name',
    publicDisplayName: 'Khaled A.',
    roomNumber: 'Room 315',
    stayDate: '2026-09-16',
    title: 'AC cooling issue during daytime',
    comment:
      'The air conditioner in Room 315 took over two hours to cool down after 2 PM. The technician fixed it eventually, but it impacted our rest afternoon.',
    source: 'ROOM_QR',
    verified: true,
    status: 'PENDING',
    published: false,
    featured: false,
    flaggedForAttention: true, // Needs attention for service recovery
    consentToPublish: true,
    submittedAt: '2026-09-16T20:45:00Z',
    guestEmail: 'k.ghamdi@example.com',
    guestPhone: '+966559988776',
  },
  // Hidden review (previously approved, now hidden by admin)
  {
    id: 'REV-10480',
    hotelId: '11',
    rating: 4,
    category: 'Overall Stay',
    category_ar: 'الإقامة بشكل عام',
    guestName: 'Mona Al-Harbi',
    displayNamePreference: 'first_name',
    publicDisplayName: 'Mona H.',
    roomNumber: 'Room 102',
    comment: 'Nice stay overall, comfortable beds.',
    source: 'WEBSITE',
    verified: false,
    status: 'HIDDEN',
    published: false,
    featured: false,
    consentToPublish: true,
    submittedAt: '2026-09-01T11:00:00Z',
    hiddenAt: '2026-09-05T14:00:00Z',
    lastModifiedBy: 'Hotel Manager',
  },

  // Swiss Flora Inn (hotelId: '12') - Isolated Property
  {
    id: 'REV-20101',
    hotelId: '12',
    rating: 5,
    category: 'Overall Stay',
    category_ar: 'الإقامة بشكل عام',
    guestName: 'Majed Al-Mutairi',
    displayNamePreference: 'full_name',
    publicDisplayName: 'Majed Al-Mutairi',
    roomNumber: 'Standard King 205',
    stayDate: '2026-09-12',
    title: 'Ideal business transit stay near Olaya',
    comment:
      'Swiss Flora Inn provides clean, modern, quiet rooms with ultra-fast Wi-Fi. Perfect value and swift service for business travellers.',
    source: 'WEBSITE',
    verified: true,
    status: 'APPROVED',
    published: true,
    featured: true,
    flaggedForAttention: false,
    consentToPublish: true,
    submittedAt: '2026-09-13T14:00:00Z',
    approvedAt: '2026-09-13T16:00:00Z',
    publishedAt: '2026-09-13T16:05:00Z',
    approvedBy: 'Inn Duty Manager',
  },
  {
    id: 'REV-20104',
    hotelId: '12',
    rating: 4,
    category: 'Café',
    category_ar: 'المقهى واللاونج',
    guestName: 'Sara Al-Bader',
    displayNamePreference: 'first_name',
    publicDisplayName: 'Sara B.',
    roomNumber: 'Room 310',
    stayDate: '2026-09-14',
    title: 'Lovely coffee and quiet work booths',
    comment:
      'The lobby express café has great specialty brews and plenty of power outlets for laptops. A great practical property.',
    source: 'ROOM_QR',
    verified: true,
    status: 'APPROVED',
    published: true,
    featured: false,
    flaggedForAttention: false,
    consentToPublish: true,
    submittedAt: '2026-09-14T19:00:00Z',
    approvedAt: '2026-09-15T09:30:00Z',
    publishedAt: '2026-09-15T09:35:00Z',
    approvedBy: 'Inn Duty Manager',
  },
];

function loadStoredReviews(): GuestReview[] {
  try {
    const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(INITIAL_SEED_REVIEWS));
      return INITIAL_SEED_REVIEWS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_SEED_REVIEWS;
  } catch (err) {
    console.error('Failed to parse stored reviews, falling back to seed:', err);
    return INITIAL_SEED_REVIEWS;
  }
}

function saveStoredReviews(reviews: GuestReview[]): void {
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  } catch (err) {
    console.error('Failed to save reviews to localStorage:', err);
  }
}

function loadStoredAuditLogs(): ReviewAuditLog[] {
  try {
    const raw = localStorage.getItem(REVIEWS_AUDIT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function appendAuditLog(log: Omit<ReviewAuditLog, 'id' | 'timestamp'>): void {
  try {
    const current = loadStoredAuditLogs();
    const entry: ReviewAuditLog = {
      ...log,
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    current.unshift(entry);
    localStorage.setItem(REVIEWS_AUDIT_STORAGE_KEY, JSON.stringify(current.slice(0, 200)));
  } catch (err) {
    console.error('Failed to log review audit:', err);
  }
}

// =========================================================================
// PUBLIC API: STRICT QUERY RULE
// =========================================================================

/**
 * STRICT RULE: Only returns reviews matching:
 * status === 'APPROVED' AND published === true AND hotelId === requested
 * Room number, phone, email, and internal admin details are stripped.
 */
export function getPublicReviewsForHotel(hotelId: string): GuestReview[] {
  const all = loadStoredReviews();
  return all
    .filter(
      (r) =>
        r.hotelId === hotelId &&
        r.status === 'APPROVED' &&
        r.published === true
    )
    .map((r) => ({
      // Security projection: sanitize guest private data from public payload
      id: r.id,
      hotelId: r.hotelId,
      rating: r.rating,
      category: r.category,
      category_ar: r.category_ar,
      guestName: r.publicDisplayName, // Use sanitized display name
      displayNamePreference: r.displayNamePreference,
      publicDisplayName: r.publicDisplayName,
      title: r.title,
      comment: r.comment,
      source: r.source,
      verified: r.verified,
      status: r.status,
      published: r.published,
      featured: r.featured,
      managementResponse:
        r.managementResponse && r.managementResponse.isPublished
          ? r.managementResponse
          : undefined,
      consentToPublish: r.consentToPublish,
      submittedAt: r.submittedAt,
      stayDate: r.stayDate,
    }));
}

/**
 * Calculates dynamic public rating strictly from approved & published reviews.
 */
export function calculatePublicRating(hotelId: string): {
  averageRating: string;
  totalCount: number;
  starDistribution: Record<number, number>;
} {
  const publishedReviews = getPublicReviewsForHotel(hotelId);
  const totalCount = publishedReviews.length;

  const starDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  publishedReviews.forEach((r) => {
    const star = Math.max(1, Math.min(5, Math.round(r.rating)));
    starDistribution[star] = (starDistribution[star] || 0) + 1;
  });

  if (totalCount === 0) {
    return {
      averageRating: '5.0',
      totalCount: 0,
      starDistribution,
    };
  }

  const sum = publishedReviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = (sum / totalCount).toFixed(1);

  return {
    averageRating: avg,
    totalCount,
    starDistribution,
  };
}

// =========================================================================
// GUEST SUBMISSION: NEVER AUTO-PUBLISHED!
// =========================================================================

export function submitGuestReview(payload: ReviewSubmissionPayload): {
  success: boolean;
  referenceId: string;
  message: string;
} {
  // Spam & cooldown protection (minimum 10 seconds between submissions)
  const lastSubmit = localStorage.getItem(LAST_SUBMIT_TIME_KEY);
  const now = Date.now();
  if (lastSubmit && now - parseInt(lastSubmit, 10) < 10000) {
    return {
      success: false,
      referenceId: '',
      message: 'Please wait a moment before submitting another review.',
    };
  }

  // Active validation: Rating must be 1 - 5
  if (!payload.rating || payload.rating < 1 || payload.rating > 5) {
    return {
      success: false,
      referenceId: '',
      message: 'Please select a star rating between 1 and 5.',
    };
  }

  if (!payload.comment || payload.comment.trim().length < 5) {
    return {
      success: false,
      referenceId: '',
      message: 'Please write a descriptive comment of at least 5 characters.',
    };
  }

  const referenceId = `REV-${Math.floor(10000 + Math.random() * 90000)}`;
  const publicDisplayName = formatDisplayName(
    payload.guestName,
    payload.displayNamePreference,
    false
  );

  const matchedCat = REVIEW_CATEGORIES.find((c) => c.id === payload.category);
  const category_ar = matchedCat ? matchedCat.ar : payload.category;

  // Negative review (1-2 stars) automatically flagged for attention / service recovery
  const isFlagged = payload.rating <= 2;

  // Genuine verification check: if from room QR or verified context
  const isVerified = Boolean(payload.isVerified || payload.source === 'ROOM_QR');

  const newReview: GuestReview = {
    id: referenceId,
    hotelId: payload.hotelId,
    rating: payload.rating,
    category: payload.category,
    category_ar,
    guestName: payload.guestName || 'Anonymous Guest',
    displayNamePreference: payload.displayNamePreference,
    publicDisplayName,
    roomNumber: payload.roomNumber?.trim(),
    stayDate: payload.stayDate || new Date().toISOString().split('T')[0],
    title: payload.title?.trim(),
    comment: payload.comment.trim(),
    guestPhone: payload.guestPhone?.trim(),
    guestEmail: payload.guestEmail?.trim(),
    source: payload.source || 'WEBSITE',
    verified: isVerified,

    // STRICT REQUIREMENT: Never auto-published!
    status: 'PENDING',
    published: false,
    featured: false,

    flaggedForAttention: isFlagged,
    consentToPublish: Boolean(payload.consentToPublish),
    submittedAt: new Date().toISOString(),
  };

  const current = loadStoredReviews();
  current.unshift(newReview);
  saveStoredReviews(current);

  localStorage.setItem(LAST_SUBMIT_TIME_KEY, now.toString());

  appendAuditLog({
    reviewId: referenceId,
    hotelId: payload.hotelId,
    action: 'SUBMITTED',
    adminUser: `Guest (${payload.displayNamePreference})`,
    details: `Rating: ${payload.rating}★ | Category: ${payload.category}${
      isFlagged ? ' [FLAGGED: Low rating service recovery]' : ''
    }`,
  });

  return {
    success: true,
    referenceId,
    message: 'Review successfully submitted for moderation.',
  };
}

// =========================================================================
// ADMIN MANAGEMENT & MODERATION
// =========================================================================

export function getAllReviewsForAdmin(hotelId?: string): GuestReview[] {
  const all = loadStoredReviews();
  if (!hotelId) return all;
  return all.filter((r) => r.hotelId === hotelId);
}

export function updateReviewStatus(
  reviewId: string,
  newStatus: ReviewStatus,
  adminUser: string
): boolean {
  const all = loadStoredReviews();
  const index = all.findIndex((r) => r.id === reviewId);
  if (index === -1) return false;

  const prevStatus = all[index].status;
  all[index].status = newStatus;
  all[index].lastModifiedBy = adminUser;

  if (newStatus === 'APPROVED') {
    all[index].approvedAt = new Date().toISOString();
    all[index].approvedBy = adminUser;
  } else if (newStatus === 'HIDDEN' || newStatus === 'REJECTED') {
    // If hidden or rejected, it MUST be removed from public view
    all[index].published = false;
    all[index].hiddenAt = new Date().toISOString();
  }

  saveStoredReviews(all);

  appendAuditLog({
    reviewId,
    hotelId: all[index].hotelId,
    action:
      newStatus === 'APPROVED'
        ? 'APPROVED'
        : newStatus === 'HIDDEN'
        ? 'HIDDEN'
        : 'REJECTED',
    adminUser,
    details: `Status changed from ${prevStatus} to ${newStatus}`,
  });

  return true;
}

export function setReviewPublished(
  reviewId: string,
  published: boolean,
  adminUser: string
): boolean {
  const all = loadStoredReviews();
  const index = all.findIndex((r) => r.id === reviewId);
  if (index === -1) return false;

  // Rule: Can only publish if status is APPROVED
  if (published && all[index].status !== 'APPROVED') {
    all[index].status = 'APPROVED';
    all[index].approvedAt = new Date().toISOString();
    all[index].approvedBy = adminUser;
  }

  all[index].published = published;
  all[index].lastModifiedBy = adminUser;

  if (published) {
    all[index].publishedAt = new Date().toISOString();
  }

  saveStoredReviews(all);

  appendAuditLog({
    reviewId,
    hotelId: all[index].hotelId,
    action: published ? 'PUBLISHED' : 'UNPUBLISHED',
    adminUser,
    details: published
      ? 'Review published to public website'
      : 'Review unpublished from public website',
  });

  return true;
}

export function setReviewFeatured(
  reviewId: string,
  featured: boolean,
  adminUser: string
): boolean {
  const all = loadStoredReviews();
  const index = all.findIndex((r) => r.id === reviewId);
  if (index === -1) return false;

  all[index].featured = featured;
  all[index].lastModifiedBy = adminUser;
  saveStoredReviews(all);

  appendAuditLog({
    reviewId,
    hotelId: all[index].hotelId,
    action: featured ? 'FEATURED' : 'UNFEATURED',
    adminUser,
    details: featured
      ? 'Marked as featured review for highlight display'
      : 'Removed featured status',
  });

  return true;
}

export function saveManagementResponse(
  reviewId: string,
  responseText: string,
  isPublished: boolean,
  hotelName: string,
  adminUser: string
): boolean {
  const all = loadStoredReviews();
  const index = all.findIndex((r) => r.id === reviewId);
  if (index === -1) return false;

  const hotelNameEn = hotelName.includes('Inn') ? 'Swiss Flora Inn' : 'Swiss Flora Royal Hotel';
  const hotelNameAr = hotelName.includes('Inn') || hotelName.includes('إن')
    ? 'فندق سويس فلورا إن'
    : 'فندق سويس فلورا رويال';

  all[index].managementResponse = {
    text: responseText.trim(),
    responderTitle_en: `Response from ${hotelNameEn}`,
    responderTitle_ar: `رد إدارة ${hotelNameAr}`,
    respondedAt: new Date().toISOString(),
    isPublished,
    responderName: adminUser,
  };

  all[index].lastModifiedBy = adminUser;
  saveStoredReviews(all);

  appendAuditLog({
    reviewId,
    hotelId: all[index].hotelId,
    action: isPublished ? 'RESPONSE_PUBLISHED' : 'RESPONSE_DRAFTED',
    adminUser,
    details: `Management response ${isPublished ? 'published' : 'saved as draft'}: "${responseText.slice(
      0,
      40
    )}..."`,
  });

  return true;
}

export function deleteReview(reviewId: string, adminUser: string): boolean {
  const all = loadStoredReviews();
  const target = all.find((r) => r.id === reviewId);
  if (!target) return false;

  const filtered = all.filter((r) => r.id !== reviewId);
  saveStoredReviews(filtered);

  appendAuditLog({
    reviewId,
    hotelId: target.hotelId,
    action: 'DELETED',
    adminUser,
    details: `Permanently deleted review from database by ${adminUser}`,
  });

  return true;
}

export function getReviewAuditLogs(hotelId?: string): ReviewAuditLog[] {
  const logs = loadStoredAuditLogs();
  if (!hotelId) return logs;
  return logs.filter((l) => l.hotelId === hotelId);
}
