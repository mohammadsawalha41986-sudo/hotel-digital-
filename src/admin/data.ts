import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DepartmentCode, Module, Role } from '@shared/domain';
import type { EntityName } from '@shared/entities';
import type { Branding, HotelProfile, HotelSettings, SiteConfig } from '@shared/hotel';
import { api } from '../lib/api';

export interface Me {
  user: { id: string; email: string; name: string; role: Role; global: boolean } | null;
  permissions?: { modules: Module[]; departments: DepartmentCode[] };
  hotels?: { id: string; slug: string; name_en: string; name_ar: string; is_published: boolean }[];
}

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/auth/me'), staleTime: 60_000 });
}

export interface AdminHotel {
  id: string;
  is_published: boolean;
  profile: HotelProfile;
  branding: Branding;
  settings: HotelSettings;
  site_draft: SiteConfig;
  site_published: SiteConfig;
  site_published_at: string | null;
  site_draft_updated_at: string | null;
  has_unpublished_changes: boolean;
}

export function useAdminHotel(hid: string) {
  return useQuery({ queryKey: ['hotel', hid], queryFn: () => api<AdminHotel>(`/admin/hotels/${hid}`), enabled: !!hid });
}

export function useHotelMutation<TBody>(hid: string, path: string, method: 'PUT' | 'POST' = 'PUT') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TBody) => api<AdminHotel>(`/admin/hotels/${hid}${path}`, { method, body: body as never }),
    onSuccess: (data) => {
      if (data && typeof data === 'object' && 'profile' in data) qc.setQueryData(['hotel', hid], data);
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['bundle'] });
    },
  });
}

export interface EntityRecord {
  id: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
  [k: string]: unknown;
}

export function useEntities(hid: string, entity: EntityName, parentId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ['entities', hid, entity, parentId ?? null],
    queryFn: () => api<{ items: EntityRecord[] }>(`/admin/hotels/${hid}/entities/${entity}${parentId ? `?parent_id=${parentId}` : ''}`).then((r) => r.items),
    enabled: enabled && !!hid && (parentId === undefined || !!parentId),
  });
}

export interface DepartmentOption {
  code: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
}

/** The hotel's routing departments (built-in and hotel-defined) for pickers. */
export function useDepartmentOptions(hid: string) {
  return useQuery({
    queryKey: ['department-options', hid],
    queryFn: () => api<{ departments: DepartmentOption[] }>(`/admin/hotels/${hid}/departments/options`).then((r) => r.departments),
    enabled: !!hid,
    staleTime: 60_000,
  });
}

export function useEntityMutations(hid: string, entity: EntityName) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['entities', hid, entity] });
    qc.invalidateQueries({ queryKey: ['bundle'] });
  };
  const base = `/admin/hotels/${hid}/entities/${entity}`;
  return {
    create: useMutation({ mutationFn: (body: Record<string, unknown>) => api<EntityRecord>(base, { method: 'POST', body }), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, ...body }: Record<string, unknown> & { id: string }) => api<EntityRecord>(`${base}/${id}`, { method: 'PATCH', body }), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => api(`${base}/${id}`, { method: 'DELETE' }), onSuccess: invalidate }),
    reorder: useMutation({ mutationFn: (ids: string[]) => api(`${base}/reorder`, { method: 'POST', body: { ids } }), onSuccess: invalidate }),
  };
}
