export type AppRouteType = 'guest' | 'admin' | 'dev_routes';

export interface ParsedRoute {
  type: AppRouteType;
  hotelSlug?: string;
  roomNumber?: string;
  subDepartment?: 'stay' | 'dining' | 'wellness' | 'laundry' | 'services' | 'offers';
  outletSlug?: string;
  serviceSlug?: string;
  adminHotelId?: string;
  adminTab?: string;
  rawPath: string;
}

/**
 * Parses current pathname, search params and hash
 */
export function parseCurrentRoute(): ParsedRoute {
  let path = window.location.pathname;
  const hash = window.location.hash.replace(/^#/, '');
  const searchParams = new URLSearchParams(window.location.search);
  const queryRoom = searchParams.get('room') || undefined;

  // Support hash routing if running in iframe / static preview: #/admin or #admin
  if (hash.startsWith('/admin') || hash.startsWith('admin')) {
    path = hash.startsWith('/') ? hash : `/${hash}`;
  } else if (hash.startsWith('/dev') || hash.startsWith('dev')) {
    path = hash.startsWith('/') ? hash : `/${hash}`;
  } else if (hash.startsWith('/h/') || hash.startsWith('h/')) {
    path = hash.startsWith('/') ? hash : `/${hash}`;
  }

  // 1. Check Developer routes mode
  if (path === '/dev/routes' || path.startsWith('/dev/')) {
    return { type: 'dev_routes', rawPath: path };
  }

  // 2. Check Admin control center
  if (path === '/admin' || path.startsWith('/admin/')) {
    // /admin/hotels/:hotelId/:tab
    const parts = path.split('/').filter(Boolean);
    const hotelId = parts[1] === 'hotels' ? parts[2] : undefined;
    const adminTab = parts[1] === 'hotels' ? parts[3] : parts[1];
    return {
      type: 'admin',
      adminHotelId: hotelId,
      adminTab,
      rawPath: path,
    };
  }

  // 3. Check Canonical Guest QR & URL format:
  // /h/:hotelSlug or /hotels/:hotelSlug
  // /hotels/:hotelSlug/rooms/...
  // /hotels/:hotelSlug/dining/...
  // /hotels/:hotelSlug/services/...
  // /h/:hotelSlug/room/:roomNumber
  // /h/:hotelSlug/dining/:outletSlug
  // /h/:hotelSlug/wellness/:serviceSlug
  // /h/:hotelSlug/offers/:offerSlug
  if (path.startsWith('/h/') || path.startsWith('/hotels/')) {
    const prefixLength = path.startsWith('/h/') ? 3 : 8;
    const parts = path.substring(prefixLength).split('/').filter(Boolean);
    const hotelSlug = parts[0];
    let roomNumber: string | undefined = queryRoom;
    let subDepartment: ParsedRoute['subDepartment'] = undefined;
    let outletSlug: string | undefined;
    let serviceSlug: string | undefined;

    if (parts[1] === 'room' && parts[2]) {
      roomNumber = parts[2];
      if (parts[3] as any) {
        subDepartment = parts[3] as any;
        if (parts[4]) {
          if (subDepartment === 'dining') outletSlug = parts[4];
          if (subDepartment === 'wellness') serviceSlug = parts[4];
        }
      }
    } else if (parts[1] === 'rooms') {
      subDepartment = 'stay';
    } else if (parts[1]) {
      const seg = parts[1];
      if (['stay', 'dining', 'wellness', 'laundry', 'services', 'offers'].includes(seg)) {
        subDepartment = seg as any;
        if (parts[2]) {
          if (subDepartment === 'dining') outletSlug = parts[2];
          if (subDepartment === 'wellness') serviceSlug = parts[2];
          if (subDepartment === 'services') {
            if (parts[2] === 'spa') subDepartment = 'wellness';
            if (parts[2] === 'laundry') subDepartment = 'laundry';
          }
        }
      }
    }

    return {
      type: 'guest',
      hotelSlug,
      roomNumber,
      subDepartment,
      outletSlug,
      serviceSlug,
      rawPath: path,
    };
  }

  // Default fallback for root '/'
  return {
    type: 'guest',
    hotelSlug: 'swiss-flora-royal',
    roomNumber: queryRoom,
    rawPath: path,
  };
}

/**
 * Builds canonical URL string for navigation
 */
export function buildGuestUrl(hotelSlug: string, roomNumber?: string, subDept?: string, slug?: string): string {
  let url = `/h/${hotelSlug}`;
  if (roomNumber) {
    url += `/room/${roomNumber}`;
  }
  if (subDept) {
    url += `/${subDept}`;
    if (slug) {
      url += `/${slug}`;
    }
  }
  return url;
}

export function buildAdminUrl(hotelId?: string, tab?: string): string {
  if (hotelId) {
    return `/admin/hotels/${hotelId}${tab ? `/${tab}` : ''}`;
  }
  return '/admin';
}

/**
 * Updates browser URL cleanly without refreshing and notifies listeners
 */
export function pushAppRoute(newUrl: string): void {
  if (window.location.pathname !== newUrl && window.location.hash !== `#${newUrl}`) {
    window.history.pushState({}, '', newUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

/**
 * Robust hotel finder by slug, id, or known alias
 */
export function findHotelBySlug<T extends { id: string; slug?: string; name_en?: string }>(
  hotels: T[],
  identifier?: string
): T | undefined {
  if (!identifier) return undefined;
  const clean = identifier.toLowerCase().trim();
  
  // 1. Exact match by slug or id
  const exact = hotels.find(
    (h) => (h.slug && h.slug.toLowerCase() === clean) || (h.id && h.id.toLowerCase() === clean)
  );
  if (exact) return exact;

  // 2. Canonical Swiss Flora mappings
  if (clean === 'swiss-flora-royal' || clean === 'swiss-flora-royal-hotel-riyadh' || clean === '11') {
    const royal = hotels.find((h) => h.id === '11' || (h.slug && h.slug.includes('royal')));
    if (royal) return royal;
  }
  if (clean === 'swiss-flora-inn' || clean === 'swiss-flora-inn-hotel-riyadh' || clean === '12') {
    const inn = hotels.find((h) => h.id === '12' || (h.slug && h.slug.includes('inn')));
    if (inn) return inn;
  }

  // 3. Prefix or contains fallback
  return hotels.find((h) => {
    const s = (h.slug || '').toLowerCase();
    const id = (h.id || '').toLowerCase();
    return s.includes(clean) || clean.includes(s) || id.includes(clean);
  });
}

