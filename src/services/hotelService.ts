import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Hotel, HotelBranding, HotelTypography, HotelPortalConfig, RoomType, HotelOffer } from '../types/hotel';
import { FBOutlet, WellnessService } from '../types/department';
import { AdminUser, canAccessHotel } from '../types/auth';
import { createDefaultPortalConfig } from '../utils/portalConfig';

export interface CreateHotelInput {
  name_en: string;
  name_ar: string;
  slug: string;
  classification_stars?: number;
  currency?: string;
  city_en: string;
  city_ar: string;
  country_en: string;
  country_ar: string;
  address_en?: string;
  address_ar?: string;
  phone?: string;
  email?: string;
  whatsapp_number?: string;
  tagline_en?: string;
  tagline_ar?: string;
  description_en?: string;
  description_ar?: string;
  logo_url?: string;
  branding?: Partial<HotelBranding>;
  typography?: Partial<HotelTypography>;
  portal_config?: HotelPortalConfig;
}

const DEFAULT_BRANDING: HotelBranding = {
  primary: '#872033',
  secondary: '#1C1917',
  accent: '#C5A880',
  background: '#FAF8F5',
  surface: '#FFFFFF',
  text: '#1C1917',
  muted: '#78716C',
  border: '#E7E5E4',
  button: '#872033',
  radius: '14px',
};

const DEFAULT_TYPOGRAPHY: HotelTypography = {
  arHeadingFont: 'Cairo',
  arBodyFont: 'Tajawal',
  enHeadingFont: 'Playfair Display',
  enBodyFont: 'Plus Jakarta Sans',
};

/**
 * Hydrates a Firestore document snapshot into a canonical typed Hotel object
 */
export async function hydrateHotelFromDoc(docSnap: any): Promise<Hotel> {
  const data = docSnap.data();
  const hotelId = docSnap.id;

  let branding: HotelBranding = data.branding || DEFAULT_BRANDING;
  let typography: HotelTypography = data.typography || DEFAULT_TYPOGRAPHY;
  let portal_config: HotelPortalConfig = data.portal_config || createDefaultPortalConfig();

  // Attempt to fetch dedicated subcollection configs if available
  if (isFirebaseConfigured && db) {
    try {
      const brandingSnap = await getDoc(doc(db, 'hotels', hotelId, 'branding', 'theme'));
      if (brandingSnap.exists()) {
        const bData = brandingSnap.data();
        branding = { ...branding, ...bData };
        if (bData.arHeadingFont) {
          typography = {
            arHeadingFont: bData.arHeadingFont || typography.arHeadingFont,
            arBodyFont: bData.arBodyFont || typography.arBodyFont,
            enHeadingFont: bData.enHeadingFont || typography.enHeadingFont,
            enBodyFont: bData.enBodyFont || typography.enBodyFont,
          };
        }
      }
    } catch (error) {
      console.warn(`[HotelService] Failed to load branding for ${hotelId}:`, error);
      throw error;
    }

    try {
      const configSnap = await getDoc(doc(db, 'hotels', hotelId, 'publicConfig', 'portal'));
      if (configSnap.exists()) {
        portal_config = { ...portal_config, ...configSnap.data() } as HotelPortalConfig;
      }
    } catch (error) {
      console.warn(`[HotelService] Failed to load portal configuration for ${hotelId}:`, error);
      throw error;
    }
  }

  return {
    id: hotelId,
    slug: data.slug || hotelId,
    name_en: data.name_en || 'Hotel Digital Guest Hub',
    name_ar: data.name_ar || 'منصة النزيل الرقمية',
    tagline_en: data.tagline_en || '',
    tagline_ar: data.tagline_ar || '',
    description_en: data.description_en || '',
    description_ar: data.description_ar || '',
    classification_stars: data.classification_stars || 4,
    classification_label_en: data.classification_label_en || `${data.classification_stars || 4}-Star Hotel`,
    classification_label_ar: data.classification_label_ar || `فندق فاخر فئة ${data.classification_stars || 4} نجوم`,
    logo_url: data.logo_url || '',
    favicon_url: data.favicon_url || '/vite.svg',
    hero_images: Array.isArray(data.hero_images) ? data.hero_images : [],
    address_en: data.address_en || '',
    address_ar: data.address_ar || '',
    city_en: data.city_en || 'Riyadh',
    city_ar: data.city_ar || 'الرياض',
    country_en: data.country_en || 'Saudi Arabia',
    country_ar: data.country_ar || 'المملكة العربية السعودية',
    phone: data.phone || '',
    email: data.email || '',
    whatsapp_number: data.whatsapp_number || '',
    general_guest_whatsapp: data.general_guest_whatsapp || data.whatsapp_number || '',
    branding,
    typography,
    portal_config,
    departments: Array.isArray(data.departments) ? data.departments : [],
    policies: data.policies || {
      checkInTime: '15:00',
      checkOutTime: '12:00',
      cancellationPolicy_en: 'Standard cancellation policy applies.',
      cancellationPolicy_ar: 'تطبق سياسة الإلغاء القياسية.',
      smokingPolicy_en: 'Non-smoking property.',
      smokingPolicy_ar: 'مكان إقامة لغير المدخنين.',
      wifiSsid: 'Hotel-Guest',
      parkingInfo_en: 'Onsite parking available.',
      parkingInfo_ar: 'تتوفر مواقف سيارات بالموقع.',
    },
    rooms: Array.isArray(data.rooms) ? data.rooms : [],
    offers: Array.isArray(data.offers) ? data.offers : [],
    diningVenues: Array.isArray(data.diningVenues) ? data.diningVenues : [],
    wellnessFacilities: Array.isArray(data.wellnessFacilities) ? data.wellnessFacilities : [],
    services: Array.isArray(data.services) ? data.services : [],
    currency: data.currency || 'SAR',
    is_published: data.is_published === true,
    default_language: data.default_language || 'en',
    enabled_languages: Array.isArray(data.enabled_languages) ? data.enabled_languages : ['en', 'ar'],
    google_maps_url: data.google_maps_url || '',
    latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
    longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
    website_url: data.website_url || '',
    timezone: data.timezone || 'Asia/Riyadh',
    wifi_name: data.wifi_name || data.policies?.wifiSsid || '',
    wifi_password: '',
    wifi_public_enabled: data.wifi_public_enabled === true,
    social_links: data.social_links || {},
    check_in_time: data.check_in_time || data.policies?.checkInTime || '15:00',
    check_out_time: data.check_out_time || data.policies?.checkOutTime || '12:00',
  };
}

/**
 * Retrieves a single hotel by canonical document ID
 */
export async function getHotel(hotelId: string): Promise<Hotel | null> {
  if (!hotelId) return null;

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'hotels', hotelId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return await hydrateHotelFromDoc(snap);
      }
    } catch (err) {
      console.warn(`[HotelService] Failed to load hotel ${hotelId} from Firestore:`, err);
      throw err;
    }
  }

  return null;
}

/**
 * Retrieves a hotel by slug with URL alias resolution
 */
export async function getHotelBySlug(slug: string): Promise<Hotel | null> {
  if (!slug) return null;
  const cleanSlug = slug.toLowerCase().trim();

  // Canonical alias resolution for legacy '11'
  const resolvedSlug = cleanSlug === '11' ? 'swiss-flora-royal' : cleanSlug;

  if (isFirebaseConfigured && db) {
    let directPermissionError: unknown = null;
    try {
      // 1. Direct document ID lookup
      const directRef = doc(db, 'hotels', resolvedSlug);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        return await hydrateHotelFromDoc(directSnap);
      }
    } catch (err) {
      const isPermissionDenied =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === 'permission-denied';
      if (!isPermissionDenied) throw err;
      directPermissionError = err;
    }

    try {
      // 2. Public slug lookup must constrain the query to published documents
      // so Firestore can prove that every possible result is guest-readable.
      const q = query(
        collection(db, 'hotels'),
        where('slug', '==', resolvedSlug),
        where('is_published', '==', true)
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        return await hydrateHotelFromDoc(querySnap.docs[0]);
      }
      if (directPermissionError) throw directPermissionError;
    } catch (err) {
      console.warn(`[HotelService] Failed to resolve hotel slug "${slug}" from Firestore:`, err);
      // Do not collapse an authorization failure into "not found". Firestore
      // intentionally denies anonymous reads for unpublished hotels, and the
      // caller needs that distinction to render the staging/authentication UI.
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === 'permission-denied'
      ) {
        throw err;
      }
    }
  }

  return null;
}

/**
 * Subscribes to real-time updates for a single hotel
 */
export function subscribeToHotel(
  hotelId: string,
  callback: (hotel: Hotel | null) => void
): () => void {
  if (!hotelId) {
    callback(null);
    return () => {};
  }

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'hotels', hotelId);
      return onSnapshot(
        docRef,
        async (snap) => {
          if (snap.exists()) {
            const h = await hydrateHotelFromDoc(snap);
            callback(h);
          } else {
            callback(null);
          }
        },
        (err) => {
          console.warn(`[HotelService] Real-time subscription error for ${hotelId}:`, err);
          callback(null);
        }
      );
    } catch (err) {
      console.warn(`[HotelService] Could not establish snapshot listener for ${hotelId}:`, err);
      callback(null);
      return () => {};
    }
  }

  callback(null);
  return () => {};
}

/**
 * Lists all hotels accessible by an authenticated staff or SUPER_ADMIN
 */
export async function listHotelsForAdmin(adminUser: AdminUser | null): Promise<Hotel[]> {
  if (!adminUser) return [];

  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, 'hotels');
      const snap = await getDocs(colRef);
      const list: Hotel[] = [];

      for (const d of snap.docs) {
        if (canAccessHotel(adminUser, d.id)) {
          list.push(await hydrateHotelFromDoc(d));
        }
      }

      return list;
    } catch (err) {
      console.warn('[HotelService] Failed to list hotels for admin:', err);
    }
  }

  return [];
}

/**
 * Subscribes to the real-time hotel portfolio for an admin user
 */
export function subscribeToHotelsForAdmin(
  adminUser: AdminUser | null,
  callback: (hotels: Hotel[]) => void
): () => void {
  if (!adminUser) {
    callback([]);
    return () => {};
  }

  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, 'hotels');
      return onSnapshot(
        colRef,
        async (snap) => {
          const list: Hotel[] = [];
          for (const d of snap.docs) {
            if (canAccessHotel(adminUser, d.id)) {
              list.push(await hydrateHotelFromDoc(d));
            }
          }
          callback(list);
        },
        (err) => {
          console.warn('[HotelService] Real-time portfolio subscription error:', err);
          callback([]);
        }
      );
    } catch (err) {
      console.warn('[HotelService] Could not establish portfolio listener:', err);
      callback([]);
      return () => {};
    }
  }

  callback([]);
  return () => {};
}

// ---------------------------------------------------------------------------
// CANONICAL SUBCOLLECTION CATALOG LOADERS
// ---------------------------------------------------------------------------

export async function getRooms(hotelId: string): Promise<RoomType[]> {
  if (!isFirebaseConfigured || !db || !hotelId) return [];
  try {
    const snap = await getDocs(collection(db, 'hotels', hotelId, 'rooms'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomType));
  } catch (e) {
    console.warn(`[HotelService] getRooms failed for ${hotelId}:`, e);
    throw e;
  }
}

export async function getOutlets(hotelId: string): Promise<FBOutlet[]> {
  if (!isFirebaseConfigured || !db || !hotelId) return [];
  try {
    const snap = await getDocs(collection(db, 'hotels', hotelId, 'outlets'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FBOutlet));
  } catch (e) {
    console.warn(`[HotelService] getOutlets failed for ${hotelId}:`, e);
    throw e;
  }
}

export async function getOffers(hotelId: string): Promise<HotelOffer[]> {
  if (!isFirebaseConfigured || !db || !hotelId) return [];
  try {
    const snap = await getDocs(collection(db, 'hotels', hotelId, 'offers'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as HotelOffer));
  } catch (e) {
    console.warn(`[HotelService] getOffers failed for ${hotelId}:`, e);
    throw e;
  }
}

export async function getWellness(hotelId: string): Promise<WellnessService[]> {
  if (!isFirebaseConfigured || !db || !hotelId) return [];
  try {
    const snap = await getDocs(collection(db, 'hotels', hotelId, 'wellness'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WellnessService));
  } catch (e) {
    console.warn(`[HotelService] getWellness failed for ${hotelId}:`, e);
    throw e;
  }
}

export async function getLaundry(hotelId: string): Promise<any[]> {
  if (!isFirebaseConfigured || !db || !hotelId) return [];
  try {
    const snap = await getDocs(collection(db, 'hotels', hotelId, 'laundry'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn(`[HotelService] getLaundry failed for ${hotelId}:`, e);
    throw e;
  }
}

export async function getGuestServices(hotelId: string): Promise<any[]> {
  if (!isFirebaseConfigured || !db || !hotelId) return [];
  try {
    const snap = await getDocs(collection(db, 'hotels', hotelId, 'guestServices'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn(`[HotelService] getGuestServices failed for ${hotelId}:`, e);
    throw e;
  }
}

export async function getBranding(hotelId: string): Promise<HotelBranding | null> {
  if (!isFirebaseConfigured || !db || !hotelId) return null;
  try {
    const snap = await getDoc(doc(db, 'hotels', hotelId, 'branding', 'theme'));
    if (snap.exists()) return snap.data() as HotelBranding;
  } catch (e) {
    console.warn(`[HotelService] getBranding failed for ${hotelId}:`, e);
  }
  return null;
}

export async function getPublicConfig(hotelId: string): Promise<HotelPortalConfig | null> {
  if (!isFirebaseConfigured || !db || !hotelId) return null;
  try {
    const snap = await getDoc(doc(db, 'hotels', hotelId, 'publicConfig', 'portal'));
    if (snap.exists()) return snap.data() as HotelPortalConfig;
  } catch (e) {
    console.warn(`[HotelService] getPublicConfig failed for ${hotelId}:`, e);
    throw e;
  }
  return null;
}

// ---------------------------------------------------------------------------
// HOTEL MUTATIONS & MANAGEMENT
// ---------------------------------------------------------------------------

/**
 * Creates a brand-new production hotel in Firestore.
 * Always defaults is_published to false and creates canonical subcollection configs.
 * NEVER inserts fake or demo operational catalog records.
 */
export async function createHotel(input: CreateHotelInput): Promise<Hotel> {
  if (!input.slug || !input.slug.trim()) throw new Error('Hotel slug is required.');
  if (!input.name_en || !input.name_en.trim() || !input.name_ar || !input.name_ar.trim()) {
    throw new Error('Bilingual hotel names (EN/AR) are required.');
  }

  const cleanSlug = input.slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!cleanSlug || cleanSlug.length < 3) {
    throw new Error('Hotel slug must be at least 3 characters and contain only lowercase letters, numbers, and hyphens.');
  }

  // Pre-existence check to prevent duplicate slug or document collision
  if (isFirebaseConfigured && db) {
    const existingDoc = await getDoc(doc(db, 'hotels', cleanSlug));
    if (existingDoc.exists()) {
      throw new Error(`Hotel property with slug "${cleanSlug}" already exists. Please choose a distinct slug.`);
    }
  }

  const hotelId = cleanSlug;

  const rootData = {
    id: hotelId,
    slug: hotelId,
    name_en: input.name_en.trim(),
    name_ar: input.name_ar.trim(),
    tagline_en: input.tagline_en || '',
    tagline_ar: input.tagline_ar || '',
    description_en: input.description_en || '',
    description_ar: input.description_ar || '',
    classification_stars: input.classification_stars || 4,
    currency: input.currency || 'SAR',
    city_en: input.city_en.trim(),
    city_ar: input.city_ar.trim(),
    country_en: input.country_en.trim(),
    country_ar: input.country_ar.trim(),
    address_en: input.address_en || '',
    address_ar: input.address_ar || '',
    phone: input.phone || '',
    email: input.email || '',
    whatsapp_number: input.whatsapp_number || '',
    general_guest_whatsapp: input.whatsapp_number || '',
    logo_url: input.logo_url || '',
    is_published: false, // Mandatory production safety default
    status: 'ACTIVE',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (isFirebaseConfigured && db) {
    // 1. Root Hotel Document
    await setDoc(doc(db, 'hotels', hotelId), rootData);

    // 2. Canonical Branding Configuration
    const brandingData = {
      ...DEFAULT_BRANDING,
      ...(input.branding || {}),
      ...DEFAULT_TYPOGRAPHY,
      ...(input.typography || {}),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'hotels', hotelId, 'branding', 'theme'), brandingData);

    // 3. Canonical Portal Configuration
    const portalData = input.portal_config || createDefaultPortalConfig();
    await setDoc(doc(db, 'hotels', hotelId, 'publicConfig', 'portal'), {
      ...portalData,
      updatedAt: serverTimestamp(),
    });
  }

  return {
    ...rootData,
    branding: { ...DEFAULT_BRANDING, ...(input.branding || {}) },
    typography: { ...DEFAULT_TYPOGRAPHY, ...(input.typography || {}) },
    portal_config: input.portal_config || createDefaultPortalConfig(),
    departments: [],
    policies: {
      checkInTime: '15:00',
      checkOutTime: '12:00',
      cancellationPolicy_en: 'Standard cancellation policy applies.',
      cancellationPolicy_ar: 'تطبق سياسة الإلغاء القياسية.',
      smokingPolicy_en: 'Non-smoking property.',
      smokingPolicy_ar: 'مكان إقامة لغير المدخنين.',
      wifiSsid: 'Hotel-Guest',
      parkingInfo_en: 'Onsite parking available.',
      parkingInfo_ar: 'تتوفر مواقف سيارات بالموقع.',
    },
    rooms: [],
    offers: [],
    diningVenues: [],
    wellnessFacilities: [],
    services: [],
    hero_images: [],
    favicon_url: '/vite.svg',
    classification_label_en: `${input.classification_stars || 4}-Star Hotel`,
    classification_label_ar: `فندق فاخر فئة ${input.classification_stars || 4} نجوم`,
  };
}

/**
 * Updates an existing hotel's metadata in Firestore
 */
export async function updateHotel(hotelId: string, updates: Partial<Hotel>): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId) return;

  const docRef = doc(db, 'hotels', hotelId);
  const data: Record<string, any> = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  // Prevent overriding the primary tenant identity
  delete data.id;
  delete data.createdAt;
  // Legacy hotel documents stored this secret on the publicly readable root.
  // Every metadata update also removes that field while the canonical value
  // lives under /private/guestAccess.
  data.wifi_password = deleteField();
  if (data.policies && typeof data.policies === 'object') {
    data.policies = { ...data.policies };
    delete data.policies.wifiPassword;
  }

  await updateDoc(docRef, data);
}

/**
 * Toggles a hotel's publication status
 */
export async function setHotelPublishStatus(hotelId: string, isPublished: boolean): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId) return;

  const docRef = doc(db, 'hotels', hotelId);
  await updateDoc(docRef, {
    is_published: isPublished,
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// SUBCOLLECTION CRUD OPERATIONS (SCOPED STRICTLY BY hotelId)
// ---------------------------------------------------------------------------

/**
 * Saves or updates a room type under /hotels/{hotelId}/rooms/{roomId}
 */
export async function saveRoom(hotelId: string, room: RoomType): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId || !room.id) return;
  const docRef = doc(db, 'hotels', hotelId, 'rooms', room.id);
  await setDoc(docRef, {
    ...room,
    hotel_id: hotelId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Deletes a room type from /hotels/{hotelId}/rooms/{roomId}
 */
export async function deleteRoom(hotelId: string, roomId: string): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId || !roomId) return;
  await deleteDoc(doc(db, 'hotels', hotelId, 'rooms', roomId));
}

/**
 * Saves or updates an F&B outlet under /hotels/{hotelId}/outlets/{outletId}
 */
export async function saveOutlet(hotelId: string, outlet: FBOutlet): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId || !outlet.id) return;
  const docRef = doc(db, 'hotels', hotelId, 'outlets', outlet.id);
  await setDoc(docRef, {
    ...outlet,
    hotel_id: hotelId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Deletes an F&B outlet from /hotels/{hotelId}/outlets/{outletId}
 */
export async function deleteOutlet(hotelId: string, outletId: string): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId || !outletId) return;
  await deleteDoc(doc(db, 'hotels', hotelId, 'outlets', outletId));
}

/**
 * Saves or updates a promotional offer under /hotels/{hotelId}/offers/{offerId}
 */
export async function saveOffer(hotelId: string, offer: HotelOffer): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId || !offer.id) return;
  const docRef = doc(db, 'hotels', hotelId, 'offers', offer.id);
  await setDoc(docRef, {
    ...offer,
    hotel_id: hotelId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Deletes a promotional offer from /hotels/{hotelId}/offers/{offerId}
 */
export async function deleteOffer(hotelId: string, offerId: string): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId || !offerId) return;
  await deleteDoc(doc(db, 'hotels', hotelId, 'offers', offerId));
}

/**
 * Saves or updates a wellness service under /hotels/{hotelId}/wellness/{serviceId}
 */
export async function saveWellness(hotelId: string, service: WellnessService): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId || !service.id) return;
  const docRef = doc(db, 'hotels', hotelId, 'wellness', service.id);
  await setDoc(docRef, {
    ...service,
    hotel_id: hotelId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Deletes a wellness service from /hotels/{hotelId}/wellness/{serviceId}
 */
export async function deleteWellness(hotelId: string, serviceId: string): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId || !serviceId) return;
  await deleteDoc(doc(db, 'hotels', hotelId, 'wellness', serviceId));
}

/**
 * Saves branding configuration under /hotels/{hotelId}/branding/theme
 */
export async function saveBranding(hotelId: string, branding: HotelBranding, typography?: HotelTypography): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId) return;
  const docRef = doc(db, 'hotels', hotelId, 'branding', 'theme');
  await setDoc(docRef, {
    ...branding,
    ...(typography || {}),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Saves public portal configuration under /hotels/{hotelId}/publicConfig/portal
 */
export async function savePublicConfig(hotelId: string, config: HotelPortalConfig): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId) return;
  const docRef = doc(db, 'hotels', hotelId, 'publicConfig', 'portal');
  await setDoc(docRef, {
    ...config,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Saves or updates a laundry item under /hotels/{hotelId}/laundry/{itemId}
 */
export async function saveLaundry(hotelId: string, item: any): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId || !item.id) return;
  const docRef = doc(db, 'hotels', hotelId, 'laundry', item.id);
  await setDoc(docRef, {
    ...item,
    hotel_id: hotelId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Deletes a laundry item from /hotels/{hotelId}/laundry/{itemId}
 */
export async function deleteLaundry(hotelId: string, itemId: string): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId || !itemId) return;
  await deleteDoc(doc(db, 'hotels', hotelId, 'laundry', itemId));
}

/**
 * Saves or updates a guest service item under /hotels/{hotelId}/guestServices/{serviceId}
 */
export async function saveGuestService(hotelId: string, service: any): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId || !service.id) return;
  const docRef = doc(db, 'hotels', hotelId, 'guestServices', service.id);
  await setDoc(docRef, {
    ...service,
    hotel_id: hotelId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Deletes a guest service item from /hotels/{hotelId}/guestServices/{serviceId}
 */
export async function deleteGuestService(hotelId: string, serviceId: string): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId || !serviceId) return;
  await deleteDoc(doc(db, 'hotels', hotelId, 'guestServices', serviceId));
}

/**
 * Retrieves private department WhatsApp routing configuration.
 */
export async function getDepartmentRouting(hotelId: string): Promise<any | null> {
  if (!isFirebaseConfigured || !db || !hotelId) return null;
  try {
    const snap = await getDoc(doc(db, 'hotels', hotelId, 'private', 'departmentRouting'));
    if (snap.exists()) return snap.data();
  } catch (e) {
    console.warn(`[HotelService] getDepartmentRouting failed for ${hotelId}:`, e);
  }
  return null;
}

/**
 * Saves private department WhatsApp routing configuration.
 */
export async function saveDepartmentRouting(hotelId: string, routing: any): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId) return;
  const docRef = doc(db, 'hotels', hotelId, 'private', 'departmentRouting');
  await setDoc(docRef, {
    ...routing,
    hotel_id: hotelId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getPrivateHotelSettings(hotelId: string): Promise<{ wifi_password?: string } | null> {
  if (!isFirebaseConfigured || !db || !hotelId) return null;
  const snap = await getDoc(doc(db, 'hotels', hotelId, 'private', 'guestAccess'));
  return snap.exists() ? (snap.data() as { wifi_password?: string }) : null;
}

export async function savePrivateHotelSettings(
  hotelId: string,
  settings: { wifi_password?: string }
): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId) return;
  await setDoc(doc(db, 'hotels', hotelId, 'private', 'guestAccess'), {
    ...settings,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function saveRoomInventory(hotelId: string, room: Record<string, any>): Promise<void> {
  if (!isFirebaseConfigured || !db || !hotelId || !room.id) return;
  await setDoc(doc(db, 'hotels', hotelId, 'privateRoomInventory', room.id), {
    ...room,
    hotel_id: hotelId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
