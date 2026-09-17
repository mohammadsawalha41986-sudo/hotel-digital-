import * as XLSX from 'xlsx';

export interface TemplateDefinition {
  filename: string;
  titleEn: string;
  titleAr: string;
  category: string;
  descriptionEn: string;
  instructions: { field: string; required: string; type: string; allowedValues: string; notes: string }[];
  headers: string[];
  exampleRows: (string | number)[][];
}

export const EXCEL_TEMPLATES: Record<string, TemplateDefinition> = {
  'rooms-template.xlsx': {
    filename: 'rooms-template.xlsx',
    titleEn: 'Rooms & Suites Template',
    titleAr: 'قالب الغرف والأجنحة',
    category: 'Rooms & Inventory',
    descriptionEn: 'Standard template for importing room types, sizes, bed specifications, occupancy, and base tariffs.',
    instructions: [
      { field: 'slug', required: 'Yes', type: 'String', allowedValues: 'e.g. royal-suite', notes: 'Unique URL identifier' },
      { field: 'name_en', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'Official English room name' },
      { field: 'name_ar', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'Official Arabic room name' },
      { field: 'category_en', required: 'Yes', type: 'String', allowedValues: 'Deluxe | Suite | Penthouse', notes: 'English category' },
      { field: 'category_ar', required: 'Yes', type: 'String', allowedValues: 'فاخر | جناح | بنتهاوس', notes: 'Arabic category' },
      { field: 'size_sqm', required: 'Yes', type: 'Number', allowedValues: '> 10', notes: 'Square meters' },
      { field: 'bed_type_en', required: 'Yes', type: 'String', allowedValues: '1 King Bed | 2 Twin Beds', notes: 'Bed configuration' },
      { field: 'bed_type_ar', required: 'Yes', type: 'String', allowedValues: 'سرير كينج | سريران مفردان', notes: 'Arabic bed configuration' },
      { field: 'max_adults', required: 'Yes', type: 'Number', allowedValues: '1 to 6', notes: 'Maximum adult occupancy' },
      { field: 'base_price', required: 'Yes', type: 'Number', allowedValues: '> 0', notes: 'Starting night rate in SAR' },
      { field: 'available_count', required: 'Yes', type: 'Number', allowedValues: '>= 1', notes: 'Total units in inventory' },
    ],
    headers: ['slug', 'name_en', 'name_ar', 'category_en', 'category_ar', 'size_sqm', 'bed_type_en', 'bed_type_ar', 'max_adults', 'base_price', 'available_count'],
    exampleRows: [
      ['royal-executive-suite', 'Royal Executive Suite', 'جناح تنفيذي ملكي', 'Executive Suite', 'جناح تنفيذي', 72, '1 King Bed', 'سرير كينج ملكي', 2, 850, 8],
      ['deluxe-diplomatic-room', 'Deluxe Diplomatic Room', 'غرفة دبلوماسية ديلوكس', 'Deluxe Room', 'غرفة ديلوكس', 48, '1 King Bed', 'سرير كينج كبير', 2, 550, 24],
      ['presidential-penthouse', 'Royal Presidential Penthouse', 'بنتهاوس رئاسي فاخر', 'Penthouse', 'بنتهاوس', 160, '2 King Beds', 'سريران كينج فاخران', 4, 2800, 2],
    ],
  },

  'room-numbers-template.xlsx': {
    filename: 'room-numbers-template.xlsx',
    titleEn: 'Room Numbers & Floor Map',
    titleAr: 'قالب أرقام الغرف ومخطط الطوابق',
    category: 'Rooms & Inventory',
    descriptionEn: 'Maps physical room numbers to room types, floors, wings, and QR lock codes.',
    instructions: [
      { field: 'room_number', required: 'Yes', type: 'String', allowedValues: 'e.g. 101, 402', notes: 'Physical door number' },
      { field: 'room_type_slug', required: 'Yes', type: 'String', allowedValues: 'Matching room slug', notes: 'Room type identifier' },
      { field: 'floor', required: 'Yes', type: 'Number', allowedValues: '1 to 50', notes: 'Floor number' },
      { field: 'wing', required: 'No', type: 'String', allowedValues: 'East | West | North', notes: 'Hotel building wing' },
      { field: 'qr_key_code', required: 'No', type: 'String', allowedValues: 'Alpha-numeric', notes: 'Optional security pairing key' },
    ],
    headers: ['room_number', 'room_type_slug', 'floor', 'wing', 'qr_key_code'],
    exampleRows: [
      ['401', 'royal-executive-suite', 4, 'Royal Wing', 'QR-RW-401'],
      ['402', 'royal-executive-suite', 4, 'Royal Wing', 'QR-RW-402'],
      ['403', 'deluxe-diplomatic-room', 4, 'Royal Wing', 'QR-RW-403'],
      ['501', 'presidential-penthouse', 5, 'Penthouse Wing', 'QR-PW-501'],
    ],
  },

  'fnb-menu-template.xlsx': {
    filename: 'fnb-menu-template.xlsx',
    titleEn: 'F&B Restaurant & Café Menu',
    titleAr: 'قالب قائمة طعام المطاعم والمقاهي',
    category: 'Food & Beverage',
    descriptionEn: 'Comprehensive menu importer supporting categories, dietary tags, prices, options, and allergens.',
    instructions: [
      { field: 'item_code', required: 'Yes', type: 'String', allowedValues: 'e.g. RST-01', notes: 'Item code' },
      { field: 'outlet_slug', required: 'Yes', type: 'String', allowedValues: 'Slug of outlet', notes: 'Target venue slug' },
      { field: 'category_en', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'English menu section' },
      { field: 'category_ar', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'Arabic menu section' },
      { field: 'name_en', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'English dish name' },
      { field: 'name_ar', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'Arabic dish name' },
      { field: 'price', required: 'Yes', type: 'Number', allowedValues: '>= 0', notes: 'Price in SAR' },
      { field: 'is_vegetarian', required: 'No', type: 'Boolean', allowedValues: 'TRUE | FALSE', notes: 'Vegetarian badge' },
      { field: 'is_spicy', required: 'No', type: 'Boolean', allowedValues: 'TRUE | FALSE', notes: 'Spicy badge' },
      { field: 'calories', required: 'No', type: 'Number', allowedValues: '>= 0', notes: 'Nutritional calorie count' },
    ],
    headers: ['item_code', 'outlet_slug', 'category_en', 'category_ar', 'name_en', 'name_ar', 'price', 'is_vegetarian', 'is_spicy', 'calories'],
    exampleRows: [
      ['APP-01', 'al-diwan-restaurant', 'Appetizers', 'المقبلات', 'Artisanal Cold Mezze Platter', 'مقبلات باردة فاخرة مشكلة', 55, 'TRUE', 'FALSE', 380],
      ['MC-02', 'al-diwan-restaurant', 'Main Courses', 'الأطباق الرئيسية', 'Slow-Braised Royal Lamb Kabsa', 'كبسة لحم خروف ملكية فاخرة', 125, 'FALSE', 'FALSE', 820],
      ['DES-01', 'flora-cafe-lounge', 'Pastries & Sweets', 'الحلويات الفاخرة', 'Pistachio Kunafa Tart', 'تارت الكنافة بالفستق الحلبي', 42, 'TRUE', 'FALSE', 450],
    ],
  },

  'room-service-template.xlsx': {
    filename: 'room-service-template.xlsx',
    titleEn: 'Room Service 24/7 Menu',
    titleAr: 'قالب قائمة خدمة الغرف على مدار الساعة',
    category: 'Food & Beverage',
    descriptionEn: 'Dedicated in-room dining catalog with prep times, night service flags, and tray delivery fees.',
    instructions: [
      { field: 'item_code', required: 'Yes', type: 'String', allowedValues: 'RS-xx', notes: 'Item code' },
      { field: 'name_en', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'English item name' },
      { field: 'name_ar', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'Arabic item name' },
      { field: 'section_en', required: 'Yes', type: 'String', allowedValues: 'Breakfast | All Day | Late Night', notes: 'Serving period' },
      { field: 'price', required: 'Yes', type: 'Number', allowedValues: '> 0', notes: 'Price SAR' },
      { field: 'preparation_time_min', required: 'No', type: 'Number', allowedValues: '5 to 60', notes: 'Average kitchen prep time' },
      { field: 'available_24_7', required: 'Yes', type: 'Boolean', allowedValues: 'TRUE | FALSE', notes: 'Available all hours' },
    ],
    headers: ['item_code', 'name_en', 'name_ar', 'section_en', 'price', 'preparation_time_min', 'available_24_7'],
    exampleRows: [
      ['RS-101', 'Royal Club Sandwich', 'كلوب ساندويتش رويال', 'All Day Dining', 35, 20, 'TRUE'],
      ['RS-102', 'Wagyu Gourmet Beef Burger', 'برجر لحم واغيو الفاخر', 'All Day Dining', 75, 25, 'TRUE'],
      ['RS-103', 'Fresh Orange Juice (Squeezed)', 'عصير برتقال طازج معصور', 'Beverages', 22, 10, 'TRUE'],
    ],
  },

  'mini-bar-template.xlsx': {
    filename: 'mini-bar-template.xlsx',
    titleEn: 'Mini Bar In-Room Inventory',
    titleAr: 'قالب الميني بار داخل الغرفة',
    category: 'Food & Beverage',
    descriptionEn: 'In-room refreshment center items with standard complimentary counts and restock prices.',
    instructions: [
      { field: 'sku', required: 'Yes', type: 'String', allowedValues: 'MB-xxx', notes: 'SKU code' },
      { field: 'name_en', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'English item name' },
      { field: 'name_ar', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'Arabic item name' },
      { field: 'category', required: 'Yes', type: 'String', allowedValues: 'Beverage | Snack | Confectionery', notes: 'Category' },
      { field: 'price', required: 'Yes', type: 'Number', allowedValues: '>= 0', notes: 'Price SAR' },
      { field: 'is_complimentary', required: 'Yes', type: 'Boolean', allowedValues: 'TRUE | FALSE', notes: 'Free for guest' },
    ],
    headers: ['sku', 'name_en', 'name_ar', 'category', 'price', 'is_complimentary'],
    exampleRows: [
      ['MB-01', 'Sparkling Mineral Water (San Pellegrino 250ml)', 'مياه معدنية فوارة', 'Beverage', 18, 'FALSE'],
      ['MB-02', 'Organic Gourmet Mixed Nuts (100g)', 'مكسرات مشكلة عضوية فاخرة', 'Snack', 25, 'FALSE'],
      ['MB-03', 'Swiss Royal Spring Water (Complimentary)', 'مياه سويس رويال المعدنية (ضيافة)', 'Beverage', 0, 'TRUE'],
    ],
  },

  'offers-template.xlsx': {
    filename: 'offers-template.xlsx',
    titleEn: 'Promotions & Special Offers',
    titleAr: 'قالب العروض والخصومات الخاصة',
    category: 'Marketing',
    descriptionEn: 'Configures seasonal promotions, package discounts, valid dates, and target landing departments.',
    instructions: [
      { field: 'title_en', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'English promotional title' },
      { field: 'title_ar', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'Arabic promotional title' },
      { field: 'department', required: 'Yes', type: 'String', allowedValues: 'rooms | restaurant | health_club', notes: 'Associated department' },
      { field: 'original_price', required: 'Yes', type: 'Number', allowedValues: '> 0', notes: 'Original price' },
      { field: 'offer_price', required: 'Yes', type: 'Number', allowedValues: '> 0', notes: 'Discounted price' },
      { field: 'badge_en', required: 'No', type: 'String', allowedValues: 'e.g. 25% OFF', notes: 'Tag badge' },
      { field: 'valid_until', required: 'Yes', type: 'String', allowedValues: 'YYYY-MM-DD', notes: 'Expiration date' },
    ],
    headers: ['title_en', 'title_ar', 'department', 'original_price', 'offer_price', 'badge_en', 'valid_until'],
    exampleRows: [
      ['Exclusive Weekend Wellness Escape', 'باقة عطلة نهاية الأسبوع الصحية', 'health_club', 450, 320, 'SAVE 28%', '2026-12-31'],
      ['Royal Suite Honeymoon Package', 'باقة شهر العسل بالجناح الملكي', 'rooms', 1200, 890, 'HOT OFFER', '2026-11-30'],
    ],
  },

  'health-club-template.xlsx': {
    filename: 'health-club-template.xlsx',
    titleEn: 'Wellness & Health Club Services',
    titleAr: 'قالب النادي الصحي والسبا',
    category: 'Wellness',
    descriptionEn: 'Catalog of massages, spa treatments, hammam, and personal training sessions.',
    instructions: [
      { field: 'code', required: 'Yes', type: 'String', allowedValues: 'SPA-xx', notes: 'Service code' },
      { field: 'name_en', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'English service name' },
      { field: 'name_ar', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'Arabic service name' },
      { field: 'duration_minutes', required: 'Yes', type: 'Number', allowedValues: '30, 45, 60, 90', notes: 'Treatment duration' },
      { field: 'price', required: 'Yes', type: 'Number', allowedValues: '> 0', notes: 'Price in SAR' },
      { field: 'gender_policy', required: 'No', type: 'String', allowedValues: 'Men Only | Women Only | Both', notes: 'Access policy' },
    ],
    headers: ['code', 'name_en', 'name_ar', 'duration_minutes', 'price', 'gender_policy'],
    exampleRows: [
      ['SPA-101', 'Royal Oud Aromatherapy Massage', 'مساج العود الملكي بالزيوت العطرية', 60, 320, 'Both'],
      ['SPA-102', 'Deep Tissue Recovery Therapy', 'مساج الأنسجة العميقة للاسترخاء', 60, 280, 'Both'],
      ['SPA-103', 'Moroccan Hammam Royal Ritual', 'طقوس الحمام المغربي الملكي الفاخر', 90, 450, 'Both'],
    ],
  },

  'laundry-template.xlsx': {
    filename: 'laundry-template.xlsx',
    titleEn: 'Valet Laundry Price List',
    titleAr: 'قالب أسعار المغسلة وخدمة الكي',
    category: 'Valet Laundry',
    descriptionEn: 'Standard pricing matrix for wash, dry clean, and press per garment type.',
    instructions: [
      { field: 'item_code', required: 'Yes', type: 'String', allowedValues: 'LND-xx', notes: 'Garment code' },
      { field: 'category', required: 'Yes', type: 'String', allowedValues: 'Gentlemen | Ladies | Traditional', notes: 'Category' },
      { field: 'name_en', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'Garment English name' },
      { field: 'name_ar', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'Garment Arabic name' },
      { field: 'wash_press_price', required: 'Yes', type: 'Number', allowedValues: '>= 0', notes: 'Wash & Press price' },
      { field: 'dry_clean_price', required: 'Yes', type: 'Number', allowedValues: '>= 0', notes: 'Dry Clean price' },
      { field: 'press_only_price', required: 'Yes', type: 'Number', allowedValues: '>= 0', notes: 'Press only price' },
    ],
    headers: ['item_code', 'category', 'name_en', 'name_ar', 'wash_press_price', 'dry_clean_price', 'press_only_price'],
    exampleRows: [
      ['LND-01', 'Traditional', 'Traditional Saudi Thobe', 'ثوب سعودي تقليدي', 25, 30, 15],
      ['LND-02', 'Gentlemen', 'Formal Business Suit (2-Piece)', 'بدلة عمل رسمية (قطعتان)', 45, 55, 25],
      ['LND-03', 'Traditional', 'Ghutrah / Shemagh', 'شماغ / غترة تقليدية', 15, 18, 10],
      ['LND-04', 'Ladies', 'Abaya / Luxury Cloak', 'عباية نسائية فاخرة', 35, 45, 20],
    ],
  },

  'guest-services-template.xlsx': {
    filename: 'guest-services-template.xlsx',
    titleEn: 'Guest & Housekeeping Services Catalog',
    titleAr: 'قالب خدمات النزلاء والإشراف الداخلي',
    category: 'Services',
    descriptionEn: 'Housekeeping amenities, maintenance tickets, concierge assistance, and luggage dispatch.',
    instructions: [
      { field: 'service_code', required: 'Yes', type: 'String', allowedValues: 'SRV-xx', notes: 'Service code' },
      { field: 'department', required: 'Yes', type: 'String', allowedValues: 'housekeeping | engineering | concierge', notes: 'Handling division' },
      { field: 'title_en', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'English title' },
      { field: 'title_ar', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'Arabic title' },
      { field: 'sla_target', required: 'No', type: 'String', allowedValues: '10 min | 20 min', notes: 'SLA target' },
      { field: 'is_free', required: 'Yes', type: 'Boolean', allowedValues: 'TRUE | FALSE', notes: 'Complimentary service' },
    ],
    headers: ['service_code', 'department', 'title_en', 'title_ar', 'sla_target', 'is_free'],
    exampleRows: [
      ['HK-01', 'housekeeping', 'Extra Bath Towels & Linens', 'مناشف حمام وأغطية إضافية', '15 min', 'TRUE'],
      ['HK-02', 'housekeeping', 'Hypoallergenic Feather Pillows', 'وسائد ريش ضد الحساسية', '15 min', 'TRUE'],
      ['ENG-01', 'engineering', 'Air Conditioning Calibration', 'معايرة وضبط التكييف', '20 min', 'TRUE'],
      ['CNG-01', 'concierge', 'Luggage Bell Desk Assistance', 'خدمة نقل الحقائب والتوصيل', '10 min', 'TRUE'],
    ],
  },

  'departments-template.xlsx': {
    filename: 'departments-template.xlsx',
    titleEn: 'Hotel Departments & WhatsApp Routing',
    titleAr: 'قالب الأقسام وإعدادات الواتساب',
    category: 'Operations',
    descriptionEn: 'Configures departmental extensions, dedicated WhatsApp lines, operating hours, and in-house permissions.',
    instructions: [
      { field: 'code', required: 'Yes', type: 'String', allowedValues: 'fnb | spa | laundry | housekeeping', notes: 'Department code' },
      { field: 'name_en', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'English name' },
      { field: 'name_ar', required: 'Yes', type: 'String', allowedValues: 'Text', notes: 'Arabic name' },
      { field: 'whatsapp_number', required: 'Yes', type: 'String', allowedValues: '+966...', notes: 'WhatsApp phone' },
      { field: 'accept_external_guests', required: 'Yes', type: 'Boolean', allowedValues: 'TRUE | FALSE', notes: 'Accept external' },
      { field: 'operating_hours', required: 'No', type: 'String', allowedValues: '24 Hours | 07:00 - 23:00', notes: 'Hours' },
    ],
    headers: ['code', 'name_en', 'name_ar', 'whatsapp_number', 'accept_external_guests', 'operating_hours'],
    exampleRows: [
      ['fnb_room_service', 'In-Room Dining', 'خدمة الغرف', '+966112000003', 'FALSE', '24 Hours'],
      ['al_diwan_restaurant', 'Al Diwan Restaurant', 'مطعم الديوان', '+966112000001', 'TRUE', '06:30 - 23:30'],
      ['wellness_spa', 'Royal Spa & Wellness', 'السبا والنادي الصحي', '+966112000005', 'TRUE', '07:00 - 22:00'],
      ['valet_laundry', 'Valet Laundry', 'المغسلة والمصبغة', '+966112000006', 'TRUE', '07:00 - 21:00'],
      ['housekeeping', 'Housekeeping', 'الإشراف الداخلي', '+966112000004', 'FALSE', '24 Hours'],
    ],
  },
};

/**
 * Generates an actual, multi-sheet .xlsx workbook and triggers direct browser download
 */
export function downloadExcelTemplate(templateKey: string): void {
  const def = EXCEL_TEMPLATES[templateKey];
  if (!def) {
    console.error('Unknown template key:', templateKey);
    return;
  }

  // Sheet 1: Instructions & Guidelines
  const instructionsData = [
    ['HOTEL DIGITAL GUEST HUB — DATA IMPORT SPECIFICATION'],
    [`Template: ${def.titleEn} (${def.titleAr})`],
    [`Version: 2.0 (Phase 3 Standard)`],
    [`Generated: ${new Date().toISOString().split('T')[0]}`],
    [],
    ['FIELD SPECIFICATIONS & RULES:'],
    ['Field Name', 'Required?', 'Data Type', 'Allowed Values / Format', 'Operational Notes'],
    ...def.instructions.map((ins) => [ins.field, ins.required, ins.type, ins.allowedValues, ins.notes]),
    [],
    ['GENERAL IMPORT GUIDELINES:'],
    ['1. Do not modify or remove column header names on the "Data" sheet.'],
    ['2. Required fields must not be empty or blank.'],
    ['3. Decimal prices must use standard dot notation (e.g. 85.50).'],
    ['4. Save and upload as .xlsx or .csv in the Admin Import Center.'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);

  // Sheet 2: Data & Example Rows
  const wsData = XLSX.utils.aoa_to_sheet([def.headers, ...def.exampleRows]);

  // Create workbook with both sheets
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
  XLSX.utils.book_append_sheet(wb, wsData, 'Data');

  // Trigger browser download
  XLSX.writeFile(wb, def.filename);
}

export interface ImportValidationIssue {
  row: number;
  column: string;
  problem: string;
  suggestedFix: string;
  severity: 'error' | 'warning';
}

export interface ImportValidationResult {
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  newRecords: number;
  updateRecords: number;
  duplicateRecords: number;
  issues: ImportValidationIssue[];
  previewData: Record<string, any>[];
  headers: string[];
}

/**
 * Validates parsed worksheet rows against expected fields
 */
export function validateImportData(
  rows: Record<string, any>[],
  templateKey?: string
): ImportValidationResult {
  const def = templateKey ? EXCEL_TEMPLATES[templateKey] : null;
  const issues: ImportValidationIssue[] = [];
  const previewData = rows.slice(0, 10);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  let invalidCount = 0;
  let warningCount = 0;
  const seenIds = new Set<string>();
  let duplicateCount = 0;

  rows.forEach((row, index) => {
    const rowNum = index + 2; // account for header line
    let rowHasError = false;

    // Check primary ID or code uniqueness
    const firstCol = Object.keys(row)[0];
    const idVal = row[firstCol];
    if (idVal !== undefined && idVal !== '') {
      const idStr = String(idVal).trim();
      if (seenIds.has(idStr)) {
        duplicateCount++;
        issues.push({
          row: rowNum,
          column: firstCol,
          problem: `Duplicate key identifier "${idStr}" detected.`,
          suggestedFix: 'Provide a unique identifier or switch mode to UPDATE EXISTING.',
          severity: 'warning',
        });
        warningCount++;
      } else {
        seenIds.add(idStr);
      }
    }

    // Check required fields from template definition if present
    if (def) {
      def.instructions.forEach((ins) => {
        if (ins.required === 'Yes') {
          const val = row[ins.field];
          if (val === undefined || val === null || String(val).trim() === '') {
            rowHasError = true;
            issues.push({
              row: rowNum,
              column: ins.field,
              problem: `Required field "${ins.field}" is missing or empty.`,
              suggestedFix: `Provide valid ${ins.type} matching ${ins.allowedValues}.`,
              severity: 'error',
            });
          }
        }
      });
    }

    // Check numeric fields
    Object.entries(row).forEach(([col, val]) => {
      if (
        (col.includes('price') || col.includes('sqm') || col.includes('count')) &&
        val !== undefined &&
        val !== ''
      ) {
        const num = Number(val);
        if (isNaN(num)) {
          rowHasError = true;
          issues.push({
            row: rowNum,
            column: col,
            problem: `Value "${val}" is not a valid number.`,
            suggestedFix: 'Enter a valid numeric value without currency symbols.',
            severity: 'error',
          });
        }
      }
    });

    if (rowHasError) {
      invalidCount++;
    }
  });

  const totalRows = rows.length;
  const validRows = Math.max(0, totalRows - invalidCount);
  const newRecords = Math.max(0, validRows - duplicateCount);

  return {
    totalRows,
    validRows,
    warningRows: warningCount,
    invalidRows: invalidCount,
    newRecords,
    updateRecords: duplicateCount,
    duplicateRecords: duplicateCount,
    issues,
    previewData,
    headers,
  };
}

export interface ImportValidationIssueReport {
  row_index: number;
  column: string;
  problem: string;
  suggested_fix?: string;
  severity: 'FATAL' | 'WARNING';
}

export interface ImportValidationReport {
  template_type: string;
  total_rows: number;
  valid_count: number;
  warning_count: number;
  invalid_count: number;
  issues: ImportValidationIssueReport[];
}

export type ImportTemplateType = string;

export interface ExcelImportTemplateItem {
  id: string;
  name: string;
  description: string;
  filename: string;
  columns: { header: string; required: boolean; notes?: string }[];
}

export const EXCEL_IMPORT_TEMPLATES: ExcelImportTemplateItem[] = Object.entries(EXCEL_TEMPLATES).map(([key, def]) => ({
  id: key,
  name: `${def.titleEn} (${def.titleAr})`,
  description: def.descriptionEn,
  filename: def.filename,
  columns: def.instructions.map((ins) => ({
    header: ins.field,
    required: ins.required === 'Yes',
    notes: ins.notes,
  })),
}));

export async function parseSpreadsheetFile(file: File): Promise<{ rows: Record<string, any>[]; sheetNames: string[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const targetSheet = sheetNames.includes('Data') ? 'Data' : sheetNames[0];
  const worksheet = workbook.Sheets[targetSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
  return { rows, sheetNames };
}

export function validateImportDataset(templateKey: string, rows: Record<string, any>[]): ImportValidationReport {
  const res = validateImportData(rows, templateKey);
  return {
    template_type: templateKey,
    total_rows: res.totalRows,
    valid_count: res.validRows,
    warning_count: res.warningRows,
    invalid_count: res.invalidRows,
    issues: res.issues.map((i) => ({
      row_index: i.row,
      column: i.column,
      problem: i.problem,
      suggested_fix: i.suggestedFix,
      severity: i.severity === 'error' ? 'FATAL' : 'WARNING',
    })),
  };
}
