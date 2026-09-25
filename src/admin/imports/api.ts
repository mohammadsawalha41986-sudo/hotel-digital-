import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export type ImportMode = 'create_only' | 'create_update';
export type RowAction = 'create' | 'update' | 'unchanged' | 'skipped' | 'error';

export interface TemplateInfo {
  key: string;
  number: string;
  title: string;
  title_ar: string;
  sheet: string;
  description: string;
  modules: string[];
  entities: string[];
  update_only: boolean;
  allowed: boolean;
}

export interface TemplateCatalogue {
  templates: TemplateInfo[];
  master: { key: string; title: string; allowed: boolean; sheets: number };
  max_file_mb: number;
}

export interface RowResult {
  sheet: string;
  row: number;
  code: string;
  name: string;
  action: RowAction;
  duplicate?: boolean;
  messages: { level: 'error' | 'warning'; column?: string; message: string }[];
}

export interface ImportSummary {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
  create: number;
  update: number;
  unchanged: number;
  skipped: number;
  duplicates: number;
  issues?: { level: 'error' | 'warning'; sheet?: string; message: string }[];
  notice?: string;
}

export interface ImportBatch {
  id: string;
  template: string;
  template_title: string;
  filename: string;
  mode: ImportMode;
  status: 'previewed' | 'committed' | 'failed' | 'rolled_back' | 'discarded' | 'expired';
  user_email: string;
  summary: ImportSummary;
  created_at: string;
  committed_at: string | null;
  rolled_back_at: string | null;
  expires_at: string | null;
  change_count: number;
  change_counts: Record<string, number>;
  results?: RowResult[];
  changes?: { sheet: string; op: 'create' | 'update'; label: string }[];
}

export interface RollbackReport {
  restored: number;
  unchanged: number;
  conflicts: { label: string; reason: string }[];
}

const base = (hid: string) => `/admin/hotels/${hid}/data`;

export function useTemplates(hid: string, enabled = true) {
  return useQuery({ queryKey: ['import-templates', hid], queryFn: () => api<TemplateCatalogue>(`${base(hid)}/templates`), staleTime: 5 * 60_000, enabled });
}

export function useImports(hid: string, enabled = true) {
  return useQuery({ queryKey: ['imports', hid], queryFn: () => api<{ imports: ImportBatch[] }>(`${base(hid)}/imports`), enabled });
}

export function useImportBatch(hid: string, id: string | null) {
  return useQuery({ queryKey: ['import', hid, id], queryFn: () => api<ImportBatch>(`${base(hid)}/imports/${id}`), enabled: !!id });
}

/** Every mutation that changes content refreshes the whole admin cache (content, publishing, history). */
export function useImportMutations(hid: string) {
  const qc = useQueryClient();
  const refreshAll = () => qc.invalidateQueries();
  const refreshHistory = () => qc.invalidateQueries({ queryKey: ['imports', hid] });
  return {
    preview: useMutation({
      mutationFn: (v: { file: File; template: string; mode: ImportMode; checkImages: boolean }) => {
        const fd = new FormData();
        fd.append('file', v.file);
        fd.append('template', v.template);
        fd.append('mode', v.mode);
        fd.append('check_images', String(v.checkImages));
        return api<ImportBatch>(`${base(hid)}/imports`, { method: 'POST', body: fd });
      },
      onSuccess: refreshHistory,
    }),
    commit: useMutation({ mutationFn: (id: string) => api<ImportBatch>(`${base(hid)}/imports/${id}/commit`, { method: 'POST' }), onSettled: refreshAll }),
    discard: useMutation({ mutationFn: (id: string) => api<ImportBatch>(`${base(hid)}/imports/${id}/discard`, { method: 'POST' }), onSuccess: refreshHistory }),
    rollbackCheck: useMutation({ mutationFn: (id: string) => api<{ report: RollbackReport }>(`${base(hid)}/imports/${id}/rollback?dry=1`, { method: 'POST' }) }),
    rollback: useMutation({ mutationFn: (id: string) => api<{ report: RollbackReport; batch: ImportBatch }>(`${base(hid)}/imports/${id}/rollback`, { method: 'POST' }), onSettled: refreshAll }),
  };
}

export const templatePath = (hid: string, key: string, withData: boolean) => `${base(hid)}/${withData ? 'export' : 'templates'}/${key}`;
