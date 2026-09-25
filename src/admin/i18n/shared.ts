import { ADJUSTMENT_LABELS, COMMISSION_BASIS_LABELS, RULE_LEVEL_LABELS, TAX_TREATMENT_LABELS } from '@shared/commerce';
import { DEPARTMENT_LABELS, ROLE_LABELS } from '@shared/domain';
import { TOKEN_LABELS } from '@shared/theme';
import { ENTITIES } from '@shared/entities';

/**
 * English strings defined in shared modules and rendered by the admin
 * through tr(): entity field labels and help, role and department names.
 * The coverage test requires an Arabic entry for each.
 */
export function adminStringsFromShared(): string[] {
  const out = new Set<string>();
  for (const e of Object.values(ENTITIES)) {
    for (const f of e.fields) {
      out.add(f.label);
      if (f.help) out.add(f.help);
    }
  }
  for (const m of [ROLE_LABELS, RULE_LEVEL_LABELS, COMMISSION_BASIS_LABELS, TAX_TREATMENT_LABELS, ADJUSTMENT_LABELS]) for (const v of Object.values(m)) out.add(v as string);
  for (const t of Object.values(TOKEN_LABELS)) out.add(t.hint);
  for (const d of Object.values(DEPARTMENT_LABELS)) out.add(d.en);
  return [...out];
}
