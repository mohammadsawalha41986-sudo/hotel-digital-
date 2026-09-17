export type DepartmentType = 'rooms' | 'dining' | 'services' | 'whatsapp' | 'admin' | 'core';

export interface RouteParam {
  name: string;
  type: string;
  description: string;
  example: string;
}

export interface RouteDefinition {
  id: string;
  path: string;
  name: string;
  department: DepartmentType;
  subCategory: string;
  description: string;
  targetTeam: string;
  slaTarget?: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'VIEW';
  accessLevel: 'Guest' | 'Authenticated In-Room' | 'Staff/Department' | 'System/Webhook';
  pathParams: RouteParam[];
  queryParams?: RouteParam[];
  whatsappDeepLinkTemplate?: string;
  legacyAlternative?: string;
}

export const ROUTE_REGISTRY: RouteDefinition[] = [
  // ==========================================
  // CORE & GUEST ENTRY ROUTES
  // ==========================================
  {
    id: 'core-home',
    path: '/',
    name: 'Guest Hub Welcome',
    department: 'core',
    subCategory: 'Portal Entry',
    description: 'Landing portal for hotel selection, digital check-in greeting, and language preference.',
    targetTeam: 'Front Office / Guest Experience',
    httpMethod: 'VIEW',
    accessLevel: 'Guest',
    pathParams: [],
  },
  {
    id: 'core-hotel-landing',
    path: '/hotels/:hotelSlug',
    name: 'Hotel Department Hub',
    department: 'core',
    subCategory: 'Portal Entry',
    description: 'Main landing page for a specific hotel property, showing navigation to Rooms, Dining, and Services.',
    targetTeam: 'General Guest Relations',
    httpMethod: 'VIEW',
    accessLevel: 'Guest',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Unique property slug identifier', example: 'grand-palace-resort' },
    ],
  },
  {
    id: 'core-inroom-qr-canonical',
    path: '/h/:hotelSlug/r/:roomNumber',
    name: 'In-Room Direct QR Access',
    department: 'core',
    subCategory: 'Room QR Routing',
    description: 'Zero-friction room entrance URL embedded on in-room NFC tags and desk QR codes, auto-binding the guest session.',
    targetTeam: 'Front Office / Guest Tech',
    slaTarget: '< 200ms auth resolution',
    httpMethod: 'VIEW',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
      { name: 'roomNumber', type: 'string', description: 'Assigned room or suite number', example: '402' },
    ],
    queryParams: [
      { name: 'token', type: 'string', description: 'Optional cryptographically signed stay token', example: 'jwt_guest_session_xyz' },
      { name: 'lang', type: 'string', description: 'Optional ISO language code', example: 'en' },
    ],
  },

  // ==========================================
  // ROOMS DEPARTMENT ROUTES
  // ==========================================
  {
    id: 'rooms-hub',
    path: '/hotels/:hotelSlug/rooms',
    name: 'Rooms Department Portal',
    department: 'rooms',
    subCategory: 'Room Overview',
    description: 'Central hub for all in-room hospitality requests, environmental controls, and stay management.',
    targetTeam: 'Housekeeping & Guest Operations',
    httpMethod: 'VIEW',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
    legacyAlternative: '/guest-services/room (Deprecated flat hierarchy)',
  },
  {
    id: 'rooms-amenities',
    path: '/hotels/:hotelSlug/rooms/amenities',
    name: 'Room Amenities Ordering',
    department: 'rooms',
    subCategory: 'Amenities',
    description: 'Interactive catalog to request extra down pillows, hypo-allergenic bedding, dental sets, plush robes, and luxury toiletries.',
    targetTeam: 'Housekeeping Department',
    slaTarget: '15 Minutes dispatch',
    httpMethod: 'VIEW',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
    whatsappDeepLinkTemplate: 'https://wa.me/{hotelWaNumber}?text=Hi%20Housekeeping,%20I%20am%20in%20Room%20{roomNumber}%20and%20need%20amenities:%20{items}',
  },
  {
    id: 'rooms-housekeeping',
    path: '/hotels/:hotelSlug/rooms/housekeeping',
    name: 'Housekeeping & Turn-Down Management',
    department: 'rooms',
    subCategory: 'Housekeeping',
    description: 'Schedule daily room servicing, request immediate turndown service, set Do-Not-Disturb (DND), or choose green linen reuse.',
    targetTeam: 'Housekeeping Department',
    slaTarget: '30 Minutes scheduling window',
    httpMethod: 'VIEW',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
  },
  {
    id: 'rooms-maintenance',
    path: '/hotels/:hotelSlug/rooms/maintenance',
    name: 'In-Room Engineering & Maintenance',
    department: 'rooms',
    subCategory: 'Maintenance',
    description: 'Submit urgent repair requests for AC/climate, lighting, plumbing, high-speed Wi-Fi, or TV systems with optional photo upload.',
    targetTeam: 'Engineering & Maintenance',
    slaTarget: '10 Minutes triage for priority issues',
    httpMethod: 'VIEW',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
    whatsappDeepLinkTemplate: 'https://wa.me/{hotelWaNumber}?text=Maintenance%20alert%20from%20Room%20{roomNumber}:%20{issueDescription}',
  },
  {
    id: 'rooms-minibar',
    path: '/hotels/:hotelSlug/rooms/minibar',
    name: 'Minibar Catalog & Consumption',
    department: 'rooms',
    subCategory: 'Minibar',
    description: 'Digital tariff list for premium spirits, artisanal snacks, and chilled beverages, plus one-tap restock requests.',
    targetTeam: 'Minibar / Housekeeping Team',
    slaTarget: '20 Minutes restock',
    httpMethod: 'VIEW',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
  },
  {
    id: 'rooms-checkout-express',
    path: '/hotels/:hotelSlug/rooms/checkout',
    name: 'Express Digital Check-Out',
    department: 'rooms',
    subCategory: 'Front Desk & Departure',
    description: 'Review digital itemized room folio, settle outstanding charges via Apple Pay/Card, and request late check-out options.',
    targetTeam: 'Front Desk & Revenue Accounting',
    slaTarget: 'Instant billing settlement',
    httpMethod: 'VIEW',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
  },

  // ==========================================
  // DINING DEPARTMENT ROUTES
  // ==========================================
  {
    id: 'dining-hub',
    path: '/hotels/:hotelSlug/dining',
    name: 'Dining Department Portal',
    department: 'dining',
    subCategory: 'Dining Overview',
    description: 'Full culinary directory including in-room dining, fine dining venues, cocktail lounges, and breakfast pre-ordering.',
    targetTeam: 'Food & Beverage Management',
    httpMethod: 'VIEW',
    accessLevel: 'Guest',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
    legacyAlternative: '/menu /room-service (Deprecated flat routes)',
  },
  {
    id: 'dining-room-service',
    path: '/hotels/:hotelSlug/dining/room-service',
    name: 'In-Room Dining Digital Menu',
    department: 'dining',
    subCategory: 'In-Room Dining',
    description: 'Browse all-day dining menu with live chef notes, allergens (nut-free, gluten-free, halal), prep time indicators, and modifiers.',
    targetTeam: 'Main Kitchen / In-Room Dining F&B',
    slaTarget: '35-45 Minutes delivery',
    httpMethod: 'VIEW',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
    queryParams: [
      { name: 'category', type: 'string', description: 'Filter: all-day, breakfast, late-night, wine-list', example: 'all-day' },
      { name: 'dietary', type: 'string', description: 'Allergen exclusion filter', example: 'halal' },
    ],
  },
  {
    id: 'dining-room-service-cart',
    path: '/hotels/:hotelSlug/dining/room-service/checkout',
    name: 'Room Service Order Checkout',
    department: 'dining',
    subCategory: 'In-Room Dining',
    description: 'Cart confirmation, culinary notes to chef, delivery time slot selection (asap or scheduled), and room billing authorization.',
    targetTeam: 'In-Room Dining Dispatch',
    httpMethod: 'VIEW',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
  },
  {
    id: 'dining-room-service-tracking',
    path: '/hotels/:hotelSlug/dining/room-service/orders/:orderId',
    name: 'Live Kitchen & Delivery Tracker',
    department: 'dining',
    subCategory: 'In-Room Dining',
    description: 'Real-time 4-stage tracking (Received -> Kitchen Prep -> Plating & Quality Check -> En Route to Room) with WhatsApp alerts.',
    targetTeam: 'Kitchen Display System & Butler Team',
    slaTarget: 'Real-time status updates',
    httpMethod: 'VIEW',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
      { name: 'orderId', type: 'string', description: 'Unique order identifier', example: 'ORD-2026-8942' },
    ],
    whatsappDeepLinkTemplate: 'https://wa.me/{hotelWaNumber}?text=Tracking%20Order%20{orderId}%20for%20Room%20{roomNumber}',
  },
  {
    id: 'dining-tray-clearance',
    path: '/hotels/:hotelSlug/dining/tray-pickup',
    name: 'Used Tray & Dishes Clearance',
    department: 'dining',
    subCategory: 'In-Room Dining',
    description: 'Single-tap request to notify stewarding to collect dining carts or used trays outside the guest door.',
    targetTeam: 'Stewarding & F&B Clearance',
    slaTarget: '15 Minutes clearance',
    httpMethod: 'POST',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
  },
  {
    id: 'dining-venues-directory',
    path: '/hotels/:hotelSlug/dining/venues',
    name: 'Hotel Restaurants & Bars Directory',
    department: 'dining',
    subCategory: 'Restaurants & Lounges',
    description: 'Showcase of signature restaurants, sushi bar, rooftop cocktail terrace, and patisserie with menus and dress codes.',
    targetTeam: 'F&B Host Operations',
    httpMethod: 'VIEW',
    accessLevel: 'Guest',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
  },
  {
    id: 'dining-venues-detail',
    path: '/hotels/:hotelSlug/dining/venues/:venueSlug',
    name: 'Restaurant Profile & Sommelier List',
    department: 'dining',
    subCategory: 'Restaurants & Lounges',
    description: 'Deep dive into a specific restaurant venue: seasonal tasting menu, sommelier pairing, chef profile, and virtual gallery.',
    targetTeam: 'Venue Hostess & Head Chef',
    httpMethod: 'VIEW',
    accessLevel: 'Guest',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
      { name: 'venueSlug', type: 'string', description: 'Restaurant or bar slug', example: 'azure-rooftop-grill' },
    ],
  },
  {
    id: 'dining-table-reservation',
    path: '/hotels/:hotelSlug/dining/reservations/new',
    name: 'Table Reservation Booking Flow',
    department: 'dining',
    subCategory: 'Reservations',
    description: 'Reserve a table for breakfast, lunch, or dinner with seating zone preference (terrace, romantic booth, indoor) and party size.',
    targetTeam: 'Restaurant Maitre d’ & Host Team',
    slaTarget: 'Instant confirmation',
    httpMethod: 'VIEW',
    accessLevel: 'Guest',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
    queryParams: [
      { name: 'venue', type: 'string', description: 'Pre-select specific venue slug', example: 'azure-rooftop-grill' },
      { name: 'date', type: 'string', description: 'Target date YYYY-MM-DD', example: '2026-09-13' },
    ],
  },
  {
    id: 'dining-breakfast-preorder',
    path: '/hotels/:hotelSlug/dining/breakfast-order',
    name: 'Door-Knob Breakfast Pre-Order',
    department: 'dining',
    subCategory: 'Breakfast',
    description: 'Digital continental or American breakfast pre-order for next morning delivery between specified 15-minute time windows.',
    targetTeam: 'Morning Kitchen & In-Room Dining',
    slaTarget: 'Scheduled delivery window',
    httpMethod: 'VIEW',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
  },

  // ==========================================
  // SERVICES DEPARTMENT ROUTES
  // ==========================================
  {
    id: 'services-hub',
    path: '/hotels/:hotelSlug/services',
    name: 'Services Department Portal',
    department: 'services',
    subCategory: 'Services Overview',
    description: 'Comprehensive directory of guest concierge, spa treatments, wellness, laundry, chauffeur transit, and front desk.',
    targetTeam: 'Guest Services Director',
    httpMethod: 'VIEW',
    accessLevel: 'Guest',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
  },
  {
    id: 'services-concierge',
    path: '/hotels/:hotelSlug/services/concierge',
    name: 'Chief Concierge & Local Experiences',
    department: 'services',
    subCategory: 'Concierge',
    description: 'Curated city itineraries, theater ticket reservations, private museum access, and bespoke local recommendations.',
    targetTeam: 'Les Clefs d’Or Concierge Team',
    slaTarget: '20 Minutes initial response',
    httpMethod: 'VIEW',
    accessLevel: 'Guest',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
    whatsappDeepLinkTemplate: 'https://wa.me/{hotelWaNumber}?text=Concierge%20request%20from%20Room%20{roomNumber}:%20{inquiry}',
  },
  {
    id: 'services-spa',
    path: '/hotels/:hotelSlug/services/spa',
    name: 'Spa & Wellness Treatment Menu',
    department: 'services',
    subCategory: 'Spa & Wellness',
    description: 'Holistic massage rituals, organic facials, hammam, couples packages, and therapeutic wellness experiences.',
    targetTeam: 'Spa Director & Therapists',
    httpMethod: 'VIEW',
    accessLevel: 'Guest',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
  },
  {
    id: 'services-spa-booking',
    path: '/hotels/:hotelSlug/services/spa/book',
    name: 'Spa Treatment Appointment Booking',
    department: 'services',
    subCategory: 'Spa & Wellness',
    description: 'Select therapist gender preference, treatment room type, fragrance oils, and scheduled timeslot.',
    targetTeam: 'Spa Reception',
    slaTarget: 'Instant appointment lock',
    httpMethod: 'VIEW',
    accessLevel: 'Guest',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
  },
  {
    id: 'services-laundry',
    path: '/hotels/:hotelSlug/services/laundry',
    name: 'Valet Laundry & Dry Cleaning',
    department: 'services',
    subCategory: 'Laundry & Valet',
    description: 'Digital laundry slip for wash & fold, delicate dry cleaning, or 2-hour rapid steaming/pressing with room pickup.',
    targetTeam: 'Housekeeping Laundry Facility',
    slaTarget: '15 Minutes bag collection',
    httpMethod: 'VIEW',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
  },
  {
    id: 'services-transport',
    path: '/hotels/:hotelSlug/services/transport',
    name: 'Airport Transfers & Private Chauffeur',
    department: 'services',
    subCategory: 'Transportation',
    description: 'Book executive Mercedes/BMW airport transfers, helicopter shuttle, or request valet vehicle retrieval from hotel garage.',
    targetTeam: 'Transportation & Valet Team',
    slaTarget: '10 Minutes valet retrieval',
    httpMethod: 'VIEW',
    accessLevel: 'Guest',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
  },
  {
    id: 'services-luggage',
    path: '/hotels/:hotelSlug/services/luggage',
    name: 'Bell Desk & Luggage Assistance',
    department: 'services',
    subCategory: 'Bell Desk',
    description: 'Request bellhop assistance with departure luggage, long-term secure baggage storage, or room delivery upon check-in.',
    targetTeam: 'Bell Captain & Porters',
    slaTarget: '10 Minutes porter dispatch',
    httpMethod: 'VIEW',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
  },
  {
    id: 'services-wake-up',
    path: '/hotels/:hotelSlug/services/wake-up',
    name: 'Automated & Personal Wake-Up Call',
    department: 'services',
    subCategory: 'Front Desk',
    description: 'Set custom morning wake-up times with option for operator greeting and morning weather summary.',
    targetTeam: 'Front Desk / PBX Switchboard',
    slaTarget: 'Exact-minute precision',
    httpMethod: 'VIEW',
    accessLevel: 'Authenticated In-Room',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
  },

  // ==========================================
  // WHATSAPP ROUTING INTEGRATION
  // ==========================================
  {
    id: 'wa-deep-route',
    path: '/hotels/:hotelSlug/whatsapp/route',
    name: 'WhatsApp Dynamic Department Dispatcher',
    department: 'whatsapp',
    subCategory: 'WhatsApp Gateway',
    description: 'Directs the guest directly into the appropriate department WhatsApp chat with pre-populated contextual metadata.',
    targetTeam: 'Automated Department Routing Bot',
    slaTarget: 'Immediate URL redirect to WhatsApp API',
    httpMethod: 'GET',
    accessLevel: 'Guest',
    pathParams: [
      { name: 'hotelSlug', type: 'string', description: 'Property identifier', example: 'grand-palace-resort' },
    ],
    queryParams: [
      { name: 'department', type: 'string', description: 'Target: rooms | dining | services', example: 'dining' },
      { name: 'intent', type: 'string', description: 'Intent: amenity | room_service | valet | concierge', example: 'room_service' },
      { name: 'room', type: 'string', description: 'Room number', example: '402' },
      { name: 'ref', type: 'string', description: 'Optional order or ticket reference', example: 'ORD-8942' },
    ],
  },
  {
    id: 'wa-webhook',
    path: '/api/v1/whatsapp/webhook',
    name: 'WhatsApp Business Inbound Webhook',
    department: 'whatsapp',
    subCategory: 'API & Webhooks',
    description: 'Receives two-way customer replies from Meta WhatsApp Cloud API, parsing intent and dispatching to departmental staff.',
    targetTeam: 'Omnichannel Integration Engine',
    httpMethod: 'POST',
    accessLevel: 'System/Webhook',
    pathParams: [],
  },
  {
    id: 'wa-notify-dispatch',
    path: '/api/v1/whatsapp/notify',
    name: 'Outbound WhatsApp Notification Dispatcher',
    department: 'whatsapp',
    subCategory: 'API & Webhooks',
    description: 'Trigger automated WhatsApp template messages for order acceptance, food leaving the kitchen, or car arriving at portico.',
    targetTeam: 'Outbound Notification Queue',
    httpMethod: 'POST',
    accessLevel: 'Staff/Department',
    pathParams: [],
  },

  // ==========================================
  // STAFF & ADMIN DEPARTMENT DASHBOARDS
  // ==========================================
  {
    id: 'admin-master',
    path: '/admin',
    name: 'Global Operations Executive Dashboard',
    department: 'admin',
    subCategory: 'Operations Command',
    description: 'High-level KPI view across all hotel properties, active department queues, average response times, and guest satisfaction.',
    targetTeam: 'General Manager & Operations Execs',
    httpMethod: 'VIEW',
    accessLevel: 'Staff/Department',
    pathParams: [],
  },
  {
    id: 'staff-rooms-dispatch',
    path: '/staff/rooms/dispatch',
    name: 'Rooms Department Dispatch Board',
    department: 'admin',
    subCategory: 'Department Dispatch',
    description: 'Real-time kanban board for Housekeeping and Engineering, color-coded by SLA urgency with one-click assignment.',
    targetTeam: 'Housekeeping Supervisors & Duty Engineers',
    slaTarget: 'Live auto-refresh',
    httpMethod: 'VIEW',
    accessLevel: 'Staff/Department',
    pathParams: [],
    queryParams: [
      { name: 'hotel', type: 'string', description: 'Filter by hotel property', example: 'grand-palace-resort' },
      { name: 'floor', type: 'string', description: 'Filter by building floor', example: '4' },
    ],
  },
  {
    id: 'staff-dining-kds',
    path: '/staff/dining/kds',
    name: 'Dining Kitchen Display System (KDS)',
    department: 'admin',
    subCategory: 'Department Dispatch',
    description: 'Kitchen fulfillment board showing pending in-room dining tickets, ticket elapsed time, allergen callouts, and courier handoff.',
    targetTeam: 'Executive Sous Chef & Expediter',
    slaTarget: 'Sub-second WebSocket sync',
    httpMethod: 'VIEW',
    accessLevel: 'Staff/Department',
    pathParams: [],
    queryParams: [
      { name: 'station', type: 'string', description: 'Station filter: grill, cold, pastry, expeditor', example: 'expeditor' },
    ],
  },
  {
    id: 'staff-services-board',
    path: '/staff/services/desk',
    name: 'Concierge, Spa & Transport Desk',
    department: 'admin',
    subCategory: 'Department Dispatch',
    description: 'Unified request inbox for Concierge itineraries, Spa appointments, Valet car call-ups, and Bellman dispatches.',
    targetTeam: 'Concierge Desk & Transportation Dispatch',
    httpMethod: 'VIEW',
    accessLevel: 'Staff/Department',
    pathParams: [],
  },
];
