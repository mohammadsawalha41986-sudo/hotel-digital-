import { ENTITIES, type EntityName } from './entities';
import type { FieldSpec } from './fields';

/**
 * Spreadsheet column layout for an entity, derived from its field specs.
 * Parent rows are referenced by English name through the ancestor chain,
 * e.g. a menu item row has columns outlet, menu, category.
 */
export interface ImportColumn {
  header: string;
  field?: FieldSpec;
  storageKey?: string;
  kind: 'id' | 'ancestor' | 'field' | 'active' | 'sort';
  ancestor?: EntityName;
  hint: string;
}

export const ANCESTOR_COLUMN: Partial<Record<EntityName, string>> = {
  outlets: 'outlet',
  menus: 'menu',
  menu_categories: 'category',
  spa_categories: 'category',
};

export function ancestorsOf(name: EntityName): EntityName[] {
  const chain: EntityName[] = [];
  let p = ENTITIES[name].parent;
  while (p) {
    chain.unshift(p);
    p = ENTITIES[p].parent;
  }
  return chain;
}

export function importColumns(name: EntityName): ImportColumn[] {
  const cols: ImportColumn[] = [{ header: 'id', kind: 'id', hint: 'Leave empty for new rows. Keep the exported id to update a row.' }];
  for (const a of ancestorsOf(name)) {
    cols.push({ header: ANCESTOR_COLUMN[a]!, kind: 'ancestor', ancestor: a, hint: `English name of the ${ENTITIES[a].label.singular.toLowerCase()}` });
  }
  for (const f of ENTITIES[name].fields) {
    if (f.noImport || f.type === 'ref') continue;
    const hint =
      f.type === 'boolean'
        ? 'yes / no'
        : f.type === 'tags'
          ? `comma separated: ${(f.options ?? []).map((o) => o.value).join(', ')}`
          : f.type === 'select' || f.type === 'department'
            ? `one of: ${(f.options ?? []).map((o) => o.value).join(', ')}`
            : f.type === 'money' || f.type === 'number'
              ? 'number'
              : f.type === 'media' || f.type === 'video'
                ? 'https:// URL'
                : '';
    if (f.type === 'i18n' || f.type === 'i18nText') {
      cols.push({ header: `${f.key}_en`, storageKey: `${f.key}_en`, field: f, kind: 'field', hint: `${f.label} (English)${f.required ? ' — required' : ''}` });
      cols.push({ header: `${f.key}_ar`, storageKey: `${f.key}_ar`, field: f, kind: 'field', hint: `${f.label} (Arabic)` });
    } else {
      cols.push({ header: f.key, storageKey: f.key, field: f, kind: 'field', hint: [f.label, hint].filter(Boolean).join(' — ') });
    }
  }
  cols.push({ header: 'active', kind: 'active', hint: 'yes / no (shown to guests)' });
  cols.push({ header: 'sort_order', kind: 'sort', hint: 'number, optional' });
  return cols;
}

const TRUE = new Set(['yes', 'y', 'true', '1', 'نعم']);
const FALSE = new Set(['no', 'n', 'false', '0', 'لا', '']);

/** Converts a raw cell into the typed value the entity schema expects. */
export function coerceCell(field: FieldSpec, raw: unknown): { value?: unknown; error?: string } {
  const str = raw == null ? '' : String(raw).trim();
  switch (field.type) {
    case 'boolean': {
      const v = str.toLowerCase();
      if (TRUE.has(v)) return { value: true };
      if (FALSE.has(v)) return { value: str === '' ? (field.default as boolean) ?? false : false };
      return { error: `"${str}" is not yes/no` };
    }
    case 'money':
    case 'number': {
      if (str === '') return { value: null };
      const n = Number(str.replace(/[, ]/g, ''));
      return Number.isFinite(n) ? { value: n } : { error: `"${str}" is not a number` };
    }
    case 'tags': {
      if (!str) return { value: [] };
      const values = str.split(/[,،;]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      const allowed = new Map((field.options ?? []).flatMap((o) => [[o.value, o.value], [o.en.toLowerCase(), o.value]]));
      const bad = values.filter((v) => !allowed.has(v));
      return bad.length ? { error: `Unknown value(s): ${bad.join(', ')}` } : { value: [...new Set(values.map((v) => allowed.get(v)!))] };
    }
    case 'select':
    case 'department': {
      if (!str) return { value: undefined };
      const match = (field.options ?? []).find((o) => o.value.toLowerCase() === str.toLowerCase() || o.en.toLowerCase() === str.toLowerCase());
      return match ? { value: match.value } : { error: `"${str}" is not one of ${(field.options ?? []).map((o) => o.value).join(', ')}` };
    }
    default:
      return { value: str };
  }
}

/** Formats a stored value back into a spreadsheet cell. */
export function exportCell(field: FieldSpec | undefined, v: unknown): string | number {
  if (v == null) return '';
  if (field?.type === 'boolean' || typeof v === 'boolean') return v ? 'yes' : 'no';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'number') return v;
  return String(v);
}
