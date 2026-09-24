import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Film, Link2, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Button, EmptyState, ErrorState, Field, IconButton, Skeleton, TextInput } from '../../components/ui';
import { useFeedback } from '../feedback';
import { uploadMedia, type MediaRow } from '../lib/upload';
import { Card, PageHeader } from '../layout/AdminLayout';

export function MediaLibrary({ hid }: { hid: string }) {
  const qc = useQueryClient();
  const fb = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [urlError, setUrlError] = useState('');
  const [uploading, setUploading] = useState(0);
  const q = useQuery({ queryKey: ['media', hid], queryFn: () => api<{ media: MediaRow[] }>(`/admin/hotels/${hid}/media`).then((r) => r.media) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['media', hid] });

  const addUrl = useMutation({
    mutationFn: () => api(`/admin/hotels/${hid}/media/url`, { method: 'POST', body: { url, label } }),
    onSuccess: () => {
      setUrl('');
      setLabel('');
      setUrlError('');
      refresh();
      fb.success('Media link added');
    },
    onError: (e) => setUrlError(e instanceof ApiError ? e.fields.url ?? e.message : errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/hotels/${hid}/media/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      refresh();
      fb.success('Deleted');
    },
    onError: (e) => fb.error(errorMessage(e)),
  });

  const onFiles = async (files: FileList) => {
    for (const f of Array.from(files)) {
      setUploading((n) => n + 1);
      try {
        await uploadMedia(hid, f);
      } catch (e) {
        fb.error(`${f.name}: ${errorMessage(e)}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    refresh();
  };

  return (
    <>
      <PageHeader
        title="Media library"
        description="Uploaded files and external links available to every image and video field. Uploads are validated by content (not file extension) and resized for fast loading."
        actions={
          <>
            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm" className="sr-only" tabIndex={-1} aria-label="Upload files" onChange={(e) => e.target.files && onFiles(e.target.files).then(() => (e.target.value = ''))} />
            <Button size="sm" className="rounded-lg" loading={uploading > 0} onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden="true" /> Upload files
            </Button>
          </>
        }
      />
      <Card title="Add an external link" className="mb-4">
        <form
          className="grid items-start gap-3 md:grid-cols-[1fr_16rem_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            addUrl.mutate();
          }}
        >
          <Field label="Image or video URL" htmlFor="m-url" error={urlError}>
            <TextInput id="m-url" type="url" dir="ltr" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} className="h-10 rounded-lg text-sm" invalid={!!urlError} />
          </Field>
          <Field label="Label" htmlFor="m-label">
            <TextInput id="m-label" value={label} onChange={(e) => setLabel(e.target.value)} className="h-10 rounded-lg text-sm" />
          </Field>
          <Button type="submit" size="sm" className="mt-6 h-10 rounded-lg" loading={addUrl.isPending} disabled={!url}>
            <Link2 className="h-4 w-4" aria-hidden="true" /> Add link
          </Button>
        </form>
      </Card>
      {q.isLoading ? (
        <Skeleton className="h-64" />
      ) : q.error ? (
        <ErrorState title="Could not load media" description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !q.data!.length ? (
        <div className="rounded-2xl border border-black/[0.07] bg-white">
          <EmptyState title="No media yet" description="Upload photos or add links to reuse them across menus, services and the website." />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {q.data!.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-xl border border-black/[0.07] bg-white">
              {m.kind === 'image' ? (
                <img src={m.url} alt={m.label || m.filename} loading="lazy" className="aspect-square w-full bg-zinc-100 object-cover" onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.2')} />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-zinc-100">
                  <Film className="h-7 w-7 text-zinc-500" aria-hidden="true" />
                </div>
              )}
              <div className="flex items-center gap-1 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{m.label || m.filename || m.url}</p>
                  <p className="text-[0.7rem] text-zinc-500">
                    {m.source === 'url' ? 'External link' : m.source === 'guest_upload' ? 'Guest upload' : `${Math.round((m.size_bytes ?? 0) / 1024)} KB`}
                  </p>
                </div>
                <IconButton
                  label="Copy URL"
                  size="sm"
                  onClick={() => {
                    const full = m.url.startsWith('/') ? window.location.origin + m.url : m.url;
                    navigator.clipboard?.writeText(full).then(() => fb.success('URL copied'), () => fb.error('Clipboard unavailable'));
                  }}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
                <IconButton
                  label="Delete media"
                  size="sm" className="text-red-600"
                  onClick={async () => {
                    if (await fb.confirm({ title: 'Delete this file?', message: 'Content still using it will fall back to the branded placeholder.', confirmLabel: 'Delete', danger: true })) remove.mutate(m.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
