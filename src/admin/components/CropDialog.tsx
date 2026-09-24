import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { IMAGE_SPECS } from '@shared/mediaSpecs';
import { Button, Segmented, Sheet } from '../../components/ui';

interface Props {
  open: boolean;
  src: string;
  spec?: string;
  onClose: () => void;
  /** Receives the cropped image as a WebP file. */
  onCropped: (file: File) => Promise<void>;
}

const RATIOS: Record<string, number | null> = { original: null, '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1, '4:5': 4 / 5, '3:1': 3 };

/**
 * Crop to the recommended aspect ratio (or another preset): drag to position,
 * slider or arrow keys to zoom/pan. Output is rendered at up to the
 * recommended pixel size, never upscaled.
 */
export function CropDialog({ open, src, spec, onClose, onCropped }: Props) {
  const s = spec ? IMAGE_SPECS[spec] : undefined;
  const specRatio = s ? s.width / s.height : null;
  const [ratioKey, setRatioKey] = useState<string>('spec');
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const FW = 560;
  const ratio = ratioKey === 'spec' ? specRatio ?? (img ? img.naturalWidth / img.naturalHeight : 1) : RATIOS[ratioKey] ?? (img ? img.naturalWidth / img.naturalHeight : 1);
  const FH = Math.round(FW / ratio);

  useEffect(() => {
    if (!open || !src) return;
    setError('');
    setImg(null);
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => setImg(i);
    i.onerror = () => setError('The image could not be loaded for cropping.');
    i.src = src;
  }, [open, src]);

  const base = img ? Math.max(FW / img.naturalWidth, FH / img.naturalHeight) : 1;
  const scale = base * zoom;
  const dw = img ? img.naturalWidth * scale : FW;
  const dh = img ? img.naturalHeight * scale : FH;
  const clamp = (p: { x: number; y: number }) => ({ x: Math.min(0, Math.max(FW - dw, p.x)), y: Math.min(0, Math.max(FH - dh, p.y)) });

  // Re-centre whenever the frame or zoom changes.
  useEffect(() => {
    setPos((p) => clamp(p.x === 0 && p.y === 0 ? { x: (FW - dw) / 2, y: (FH - dh) / 2 } : p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, ratio, zoom]);

  const onDown = (e: PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
  };
  const onMove = (e: PointerEvent) => {
    if (!drag.current) return;
    setPos(clamp({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y }));
  };
  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      setPos((p) => clamp({ x: p.x + moves[e.key][0], y: p.y + moves[e.key][1] }));
    } else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, z + 0.1));
    else if (e.key === '-') setZoom((z) => Math.max(1, z - 0.1));
  };

  const apply = async () => {
    if (!img) return;
    const sw = FW / scale;
    const sh = FH / scale;
    const targetW = Math.round(Math.min(s?.width ?? 2400, sw));
    const targetH = Math.round(targetW / ratio);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -pos.x / scale, -pos.y / scale, sw, sh, 0, 0, targetW, targetH);
    let blob: Blob | null = null;
    try {
      blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.9));
    } catch {
      blob = null;
    }
    if (!blob) {
      setError('This image is hosted on another website that does not allow editing. Download it and upload it here to crop.');
      return;
    }
    setBusy(true);
    try {
      await onCropped(new File([blob], 'cropped.webp', { type: 'image/webp' }));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const options = [
    ...(specRatio ? [{ value: 'spec', label: `Recommended ${s!.width}×${s!.height}` }] : [{ value: 'spec', label: 'Original' }]),
    ...Object.keys(RATIOS)
      .filter((k) => k !== 'original')
      .map((k) => ({ value: k, label: k })),
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Crop image"
      description="Drag to position. Use the slider or + / − to zoom and the arrow keys to move. The cropped copy is uploaded; the original is kept in the media library."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={apply} loading={busy} disabled={!img}>Apply crop</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Segmented label="Aspect ratio" value={ratioKey} onChange={(v) => { setRatioKey(v); setPos({ x: 0, y: 0 }); }} options={options} />
        <div className="flex justify-center overflow-hidden">
          <div
            role="slider"
            tabIndex={0}
            aria-label="Image position"
            aria-valuetext={`Zoom ${Math.round(zoom * 100)}%`}
            aria-valuenow={Math.round(zoom * 100)}
            onKeyDown={onKey}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            className="relative touch-none select-none overflow-hidden rounded-lg bg-zinc-900 outline-offset-2 focus-visible:outline-2"
            style={{ width: FW, height: FH, maxWidth: '100%', cursor: 'grab' }}
          >
            {img && <img src={src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ left: pos.x, top: pos.y, width: dw, height: dh }} />}
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/60" />
            <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, transparent 33%, rgba(255,255,255,.25) 33%, rgba(255,255,255,.25) calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, rgba(255,255,255,.25) 66%, rgba(255,255,255,.25) calc(66% + 1px), transparent calc(66% + 1px)), linear-gradient(to bottom, transparent 33%, rgba(255,255,255,.25) 33%, rgba(255,255,255,.25) calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, rgba(255,255,255,.25) 66%, rgba(255,255,255,.25) calc(66% + 1px), transparent calc(66% + 1px))' }} />
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <span className="w-12 text-zinc-500">Zoom</span>
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" aria-label="Zoom" />
          <span className="w-12 text-end tabular-nums">{Math.round(zoom * 100)}%</span>
        </label>
        {img && (
          <p className="text-xs text-zinc-500">
            Source {img.naturalWidth}×{img.naturalHeight} · output {Math.round(Math.min(s?.width ?? 2400, FW / scale))}×{Math.round(Math.min(s?.width ?? 2400, FW / scale) / ratio)}
          </p>
        )}
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </Sheet>
  );
}
