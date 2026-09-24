import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Badge, Button, EmptyState, ErrorState, Field, Sheet, Skeleton, TextInput } from '../../components/ui';
import { useMe } from '../data';
import { useFeedback } from '../feedback';
import { PageHeader } from '../layout/AdminLayout';

interface HotelRow {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  is_published: boolean;
  logo: string | null;
  updated_at: string;
}

export function Hotels() {
  const me = useMe();
  const q = useQuery({ queryKey: ['hotels'], queryFn: () => api<{ hotels: HotelRow[] }>('/admin/hotels').then((r) => r.hotels) });
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader
        title="Hotel portfolio"
        description="Each hotel is fully isolated: its own content, requests, routing, users and analytics."
        actions={
          me.data?.user?.global ? (
            <Button size="sm" className="rounded-lg" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> New hotel
            </Button>
          ) : undefined
        }
      />
      {q.isLoading ? (
        <Skeleton className="h-48" />
      ) : q.error ? (
        <ErrorState title="Could not load hotels" description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !q.data!.length ? (
        <EmptyState icon={<Building2 className="h-6 w-6" />} title="No hotels yet" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {q.data!.map((h) => (
            <li key={h.id}>
              <Link to={`/admin/h/${h.id}/dashboard`} className="block rounded-2xl border border-black/[0.07] bg-white p-5 transition hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{h.name_en}</p>
                    <p className="text-sm text-zinc-500" dir="rtl">{h.name_ar}</p>
                  </div>
                  <Badge tone={h.is_published ? 'success' : 'warning'}>{h.is_published ? 'Live' : 'Offline'}</Badge>
                </div>
                <p className="mt-3 font-mono text-xs text-zinc-500">/h/{h.slug}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <CreateHotel open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function CreateHotel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const fb = useFeedback();
  const navigate = useNavigate();
  const [f, setF] = useState({ name_en: '', name_ar: '', slug: '', city_en: '', city_ar: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api<{ id: string }>('/admin/hotels', { method: 'POST', body: { ...f, slug: f.slug || f.name_en.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') } }),
    onSuccess: async (r) => {
      fb.success('Hotel created (offline until you publish it)');
      await qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['hotels'] });
      onClose();
      navigate(`/admin/h/${r.id}/profile`);
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      fb.error(errorMessage(e));
    },
  });
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New hotel"
      description="Starts with default departments, homepage sections and navigation. No sample content is added."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={m.isPending} onClick={() => m.mutate()}>
            Create hotel
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name (English)" htmlFor="h-en" error={errors.name_en} required>
          <TextInput id="h-en" value={f.name_en} onChange={(e) => setF({ ...f, name_en: e.target.value })} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="Name (Arabic)" htmlFor="h-ar" error={errors.name_ar} required>
          <TextInput id="h-ar" dir="rtl" value={f.name_ar} onChange={(e) => setF({ ...f, name_ar: e.target.value })} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="Web address" htmlFor="h-slug" error={errors.slug} required hint="Lowercase letters, digits and hyphens, e.g. swiss-flora-inn">
          <TextInput id="h-slug" value={f.slug} placeholder={f.name_en.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })} className="h-10 rounded-lg text-sm" />
        </Field>
        <div />
        <Field label="City (English)" htmlFor="h-city-en">
          <TextInput id="h-city-en" value={f.city_en} onChange={(e) => setF({ ...f, city_en: e.target.value })} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="City (Arabic)" htmlFor="h-city-ar">
          <TextInput id="h-city-ar" dir="rtl" value={f.city_ar} onChange={(e) => setF({ ...f, city_ar: e.target.value })} className="h-10 rounded-lg text-sm" />
        </Field>
      </div>
    </Sheet>
  );
}
