import { DEPARTMENT_LABELS, REQUEST_TYPE_LABELS, type DepartmentCode, type Lang, type RequestType } from './domain';
import { formatMoney } from './pricing';

export interface MessageLine {
  quantity?: number;
  name_en: string;
  name_ar: string;
  detail_en?: string;
  detail_ar?: string;
  amount?: number;
}

export interface RequestMessageInput {
  lang: Lang;
  hotel_en: string;
  hotel_ar: string;
  reference: string;
  type: RequestType;
  department: DepartmentCode;
  title_en: string;
  title_ar: string;
  guest_name: string;
  guest_phone: string;
  guest_type: 'IN_HOUSE' | 'EXTERNAL';
  room: string;
  lines: MessageLine[];
  facts: { label_en: string; label_ar: string; value: string }[];
  notes: string;
  total: number | null;
  currency: string;
}

/**
 * Staff-facing WhatsApp message, written in the language the guest used so the
 * guest can read what they are sending. Plain text with WhatsApp *bold*.
 */
export function buildWhatsAppMessage(i: RequestMessageInput): string {
  const ar = i.lang === 'ar';
  const t = (en: string, arText: string) => (ar ? arText : en);
  const out: string[] = [];
  out.push(`*${ar ? REQUEST_TYPE_LABELS[i.type].ar : REQUEST_TYPE_LABELS[i.type].en}* — ${ar ? i.title_ar || i.title_en : i.title_en}`);
  out.push(`${t('Hotel', 'الفندق')}: ${ar ? i.hotel_ar : i.hotel_en}`);
  out.push(`${t('Reference', 'المرجع')}: *${i.reference}*`);
  out.push(`${t('Department', 'القسم')}: ${ar ? DEPARTMENT_LABELS[i.department].ar : DEPARTMENT_LABELS[i.department].en}`);
  out.push('');
  out.push(`${t('Guest', 'النزيل')}: ${i.guest_name}`);
  if (i.guest_type === 'IN_HOUSE' && i.room) out.push(`${t('Room', 'الغرفة')}: *${i.room}*`);
  else out.push(t('Guest type: External visitor', 'نوع النزيل: زائر خارجي'));
  if (i.guest_phone) out.push(`${t('Phone', 'الهاتف')}: ${i.guest_phone}`);

  if (i.lines.length) {
    out.push('');
    out.push(`*${t('Request', 'الطلب')}:*`);
    for (const l of i.lines) {
      const name = ar ? l.name_ar || l.name_en : l.name_en;
      const detail = ar ? l.detail_ar || l.detail_en : l.detail_en;
      const qty = l.quantity ? `${l.quantity} × ` : '• ';
      const amount = l.amount != null && l.amount > 0 ? ` — ${formatMoney(l.amount, i.currency, i.lang)}` : '';
      out.push(`${qty}${name}${amount}`);
      if (detail) out.push(`   ${detail}`);
    }
  }
  if (i.facts.length) {
    out.push('');
    for (const f of i.facts) out.push(`${ar ? f.label_ar : f.label_en}: ${f.value}`);
  }
  if (i.notes) {
    out.push('');
    out.push(`${t('Notes', 'ملاحظات')}: ${i.notes}`);
  }
  if (i.total != null && i.total > 0) {
    out.push('');
    out.push(`*${t('Estimated total', 'الإجمالي التقديري')}: ${formatMoney(i.total, i.currency, i.lang)}*`);
  }
  return out.join('\n');
}

export function waLink(number: string, message: string): string {
  const digits = number.replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
