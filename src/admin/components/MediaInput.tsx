import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, FolderOpen, Film, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { IMAGE_URL_PATTERN, VIDEO_URL_PATTERN } from '@shared/fields';
import { api, errorMessage } from '../../lib/api';
import { Button, EmptyState, Sheet, Spinner, TextInput, cx } from '../../components/ui';
import { embedUrl } from '../../guest/components/MediaBackground';
import { uploadMedia, type MediaRow } from '../lib/upload';

const isValidUrl = (v: string) => v === '' || /^https?:\/\/\S+$/i.test(v) || /^\/media\/[A-Za-z0-9._\-/]+$/.test(v);

/**
 * URL-or-upload media field with live preview. Broken media is reported
 * inline instead of silently rendering nothing.
 */
export function MediaInput({ hid, id, value, onChange, kind = 'image', invalid }: { hid: string; id: string; value: string; onChange: (v: string) => void; kind?: 'image' | 'video'; invalid?: boolean }) {
  const [draft, setDraft] = useState(value);
  const [previewError, setPreviewError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [library, setLibrary] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
    setPreviewError(false);
  }, [value]);

  const commit = (v: string) => {
    const trimmed = v.trim();
    setDraft(trimmed);
    if (isValidUrl(trimmed)) onChange(trimmed);
  };
  const urlInvalid = !isValidUrl(draft);
  const looksWrong = kind === 'video' ? draft && !VIDEO_URL_PATTERN.test(draft) && !draft.startsWith('/media/') : draft && draft.startsWith('http') && !IMAGE_URL_PATTERN.test(draft) && !/[?&](w|width|fm|format)=/.test(draft);
  const embed = kind === 'video' && value ? embedUrl(value) : null;

  const onFile = async (f: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const m = await uploadMedia(hid, f);
      onChange(m.url);
    } catch (e) {
      setUploadError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <TextInput
          id={id}
          value={draft}
          placeholder={kind === 'video' ? 'https://… (.mp4, YouTube or Vimeo)' : 'https://…/image.jpg or upload'}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          invalid={invalid || urlInvalid}
          className="h-10 rounded-lg text-sm"
          aria-describedby={`${id}-media-help`}
        />
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          accept={kind === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp,image/avif,image/gif'}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = '';
          }}
        />
        <Button variant="secondary" size="sm" className="h-10 shrink-0 rounded-lg" onClick={() => fileRef.current?.click()} loading={uploading} aria-label={`Upload ${kind}`}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Upload</span>
        </Button>
        <Button variant="secondary" size="sm" className="h-10 shrink-0 rounded-lg" onClick={() => setLibrary(true)} aria-label="Choose from media library">
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
        </Button>
        {value && (
          <Button variant="ghost" size="sm" className="h-10 shrink-0 rounded-lg" onClick={() => onChange('')} aria-label="Remove media">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      <p id={`${id}-media-help`} className={cx('text-xs', urlInvalid || uploadError ? 'text-red-600' : 'text-zinc-500')}>
        {urlInvalid ? 'Enter a full http(s) URL.' : uploadError || (looksWrong ? `This URL does not look like a direct ${kind} link — check the preview.` : kind === 'image' ? 'Uploads are resized and converted to WebP automatically (max 8 MB).' : 'MP4/WebM file or a YouTube/Vimeo link.')}
      </p>
      {value && (
        <div className="relative w-full max-w-sm overflow-hidden rounded-lg border border-black/10 bg-zinc-100">
          {kind === 'video' ? (
            embed ? (
              <p className="flex items-center gap-2 p-3 text-sm text-zinc-600">
                <Film className="h-4 w-4" aria-hidden="true" /> Embedded video: {value}
              </p>
            ) : (
              <video src={value} className="aspect-video w-full" muted controls preload="metadata" onError={() => setPreviewError(true)} />
            )
          ) : (
            <img src={value} alt="Preview" className="max-h-44 w-full object-contain" onError={() => setPreviewError(true)} onLoad={() => setPreviewError(false)} />
          )}
          {previewError && (
            <p role="alert" className="flex items-center gap-2 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              This {kind} could not be loaded. Guests will see the branded placeholder instead.
            </p>
          )}
        </div>
      )}
      <MediaPicker hid={hid} open={library} kind={kind} onClose={() => setLibrary(false)} onPick={(url) => { onChange(url); setLibrary(false); }} />
    </div>
  );
}

export function MediaPicker({ hid, open, kind, onClose, onPick }: { hid: string; open: boolean; kind: 'image' | 'video'; onClose: () => void; onPick: (url: string) => void }) {
  const q = useQuery({ queryKey: ['media', hid], queryFn: () => api<{ media: MediaRow[] }>(`/admin/hotels/${hid}/media`).then((r) => r.media), enabled: open });
  const items = (q.data ?? []).filter((m) => m.kind === kind);
  return (
    <Sheet open={open} onClose={onClose} title="Media library" size="lg">
      {q.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : !items.length ? (
        <EmptyState title={`No ${kind}s yet`} description="Upload a file or add a URL in the Media library." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => onPick(m.url)} className="group block w-full overflow-hidden rounded-lg border border-black/10 text-start focus-visible:ring-2">
                {m.kind === 'image' ? <img src={m.url} alt={m.label || m.filename} className="aspect-square w-full object-cover" loading="lazy" /> : <div className="flex aspect-square items-center justify-center bg-zinc-100"><Film className="h-6 w-6" aria-hidden="true" /></div>}
                <span className="block truncate px-2 py-1.5 text-xs">{m.label || m.filename || m.url}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
