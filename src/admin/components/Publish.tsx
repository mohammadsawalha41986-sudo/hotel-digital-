import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, History, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../../lib/api';
import { Badge, Button, Field, Sheet, Spinner, TextInput } from '../../components/ui';
import { useAdminHotel, usePublishing } from '../data';
import { useFeedback } from '../feedback';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

/** Publishes every guest-facing change (content, prices, branding, website) as a new version. */
export function PublishDialog({ hid, open, onClose }: { hid: string; open: boolean; onClose: () => void }) {
  const fb = useFeedback();
  const qc = useQueryClient();
  const state = usePublishing(hid, open);
  const [note, setNote] = useState('');
  const m = useMutation({
    mutationFn: () => api<{ publication: { version: number } }>(`/admin/hotels/${hid}/publish`, { method: 'POST', body: { note } }),
    onSuccess: (r) => {
      fb.success(`Published version ${r.publication.version} — guests now see these changes`);
      setNote('');
      qc.invalidateQueries({ queryKey: ['publishing', hid] });
      qc.invalidateQueries({ queryKey: ['publications', hid] });
      qc.invalidateQueries({ queryKey: ['hotel', hid] });
      qc.invalidateQueries({ queryKey: ['bundle'] });
      onClose();
    },
    onError: (e) => fb.error(errorMessage(e)),
  });
  const s = state.data;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Publish updates"
      description="Content, prices, images, branding and the website layout go live together as a new version. Availability and routing changes already apply immediately."
      size="md"
      footer={
        <div className="flex items-center justify-between gap-3">
          <Link to={`/admin/h/${hid}/publishing`} onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900">
            <History className="h-4 w-4" aria-hidden="true" /> Publishing history
          </Link>
          <Button loading={m.isPending} disabled={!s?.has_unpublished_changes} onClick={() => m.mutate()}>
            <UploadCloud className="h-4 w-4" aria-hidden="true" /> Publish now
          </Button>
        </div>
      }
    >
      {state.isLoading ? (
        <Spinner className="h-5 w-5 text-zinc-400" />
      ) : s ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            {s.latest ? `Live: version ${s.latest.version}, published ${when(s.latest.published_at)}.` : 'Nothing has been published yet.'}{' '}
            {s.has_unpublished_changes ? '' : 'Everything is published.'}
          </p>
          {s.changes.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Changes since the last publish ({s.changes.length}{s.changes.length === 100 ? '+' : ''})</p>
              <ul className="max-h-72 divide-y divide-black/[0.06] overflow-y-auto rounded-xl border border-black/[0.07] text-sm">
                {s.changes.map((c, i) => (
                  <li key={i} className="px-3 py-2">
                    <p>{c.summary || `${c.action} ${c.entity}`}</p>
                    <p className="text-xs text-zinc-500">{c.user_email || 'system'} · {when(c.created_at)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {s.has_unpublished_changes && (
            <Field label="Note (optional)" htmlFor="pub-note" hint="Shown in the publishing history, e.g. “Ramadan menu”.">
              <TextInput id="pub-note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
            </Field>
          )}
        </div>
      ) : (
        <p className="text-sm text-red-700">{errorMessage(state.error)}</p>
      )}
    </Sheet>
  );
}

/** Top-bar controls: preview the draft and publish updates. */
export function PublishControls({ hid }: { hid: string }) {
  const hotel = useAdminHotel(hid);
  const state = usePublishing(hid);
  const [open, setOpen] = useState(false);
  const pending = state.data?.has_unpublished_changes;
  const slug = hotel.data?.profile.slug;
  return (
    <div className="flex items-center gap-2">
      {pending ? <Badge tone="warning">Unpublished changes</Badge> : state.data ? <Badge tone="success">All changes live</Badge> : null}
      {slug && (
        <a href={`/h/${slug}?preview=1`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-zinc-700 ring-1 ring-black/10 hover:bg-zinc-50">
          <Eye className="h-4 w-4" aria-hidden="true" /> Preview
        </a>
      )}
      <Button size="sm" className="rounded-lg" onClick={() => setOpen(true)}>
        <UploadCloud className="h-4 w-4" aria-hidden="true" /> Publish updates
        {pending && state.data!.changes.length > 0 && <span className="ms-1 rounded-full bg-white/20 px-1.5 text-xs tabular-nums">{state.data!.changes.length}</span>}
      </Button>
      <PublishDialog hid={hid} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
