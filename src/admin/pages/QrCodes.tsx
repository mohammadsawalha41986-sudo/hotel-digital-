import { Download, FileDown, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button, Field, Segmented, Select, Skeleton, TextInput } from '../../components/ui';
import { useAdminHotel, useEntities } from '../data';
import { useFeedback } from '../feedback';
import { Card, PageHeader } from '../layout/AdminLayout';

type Kind = 'main' | 'room' | 'dining' | 'outlet' | 'spa' | 'services';

async function qrLib() {
  return (await import('qrcode')).default;
}

function download(name: string, href: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}

/** Generates hotel, room, dining, outlet and spa QR codes (PNG, SVG and printable PDF sheet). */
export function QrCodes({ hid }: { hid: string }) {
  const hotel = useAdminHotel(hid);
  const outlets = useEntities(hid, 'outlets');
  const fb = useFeedback();
  const [kind, setKind] = useState<Kind>('main');
  const [room, setRoom] = useState('101');
  const [range, setRange] = useState('101-110');
  const [outletId, setOutletId] = useState('');
  const [lang, setLang] = useState<'' | 'ar' | 'en'>('');
  const [preview, setPreview] = useState('');
  const origin = window.location.origin;
  const slug = hotel.data?.profile.slug ?? '';

  const buildUrl = (k: Kind, r?: string) => {
    const base = `${origin}/h/${slug}`;
    const params = new URLSearchParams();
    if (k === 'room' && r) params.set('room', r);
    if (lang) params.set('lang', lang);
    const path = k === 'dining' ? '/dining' : k === 'outlet' && outletId ? `/dining/${outletId}` : k === 'spa' ? '/spa' : k === 'services' ? '/services' : '';
    const qs = params.toString();
    return `${base}${path}${qs ? `?${qs}` : ''}`;
  };
  const url = buildUrl(kind, room);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    qrLib()
      .then((QR) => QR.toDataURL(url, { width: 480, margin: 2, errorCorrectionLevel: 'M' }))
      .then((d) => alive && setPreview(d))
      .catch(() => alive && setPreview(''));
    return () => {
      alive = false;
    };
  }, [url, slug]);

  const rooms = useMemo(() => {
    const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(range);
    if (m) {
      const [a, b] = [Number(m[1]), Number(m[2])];
      if (b >= a && b - a <= 500) return Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
    }
    return range.split(/[,\s]+/).map((s) => s.trim()).filter((s) => /^[A-Za-z0-9-]{1,12}$/.test(s)).slice(0, 500);
  }, [range]);

  const fileBase = `${slug}-${kind}${kind === 'room' ? `-${room}` : ''}`;
  const png = async () => download(`${fileBase}.png`, await (await qrLib()).toDataURL(url, { width: 1200, margin: 2 }));
  const svg = async () => {
    const s = await (await qrLib()).toString(url, { type: 'svg', margin: 2 });
    download(`${fileBase}.svg`, URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })));
  };

  /** Printable sheet (use the browser's “Save as PDF”): one card per code. */
  const printSheet = async (codes: { title: string; subtitle: string; url: string }[]) => {
    const QR = await qrLib();
    const svgs = await Promise.all(codes.map((c) => QR.toString(c.url, { type: 'svg', margin: 1 })));
    const w = window.open('', '_blank');
    if (!w) return fb.error('Allow pop-ups to print QR codes.');
    const name = hotel.data?.profile.name_en ?? '';
    const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
    w.document.write(`<!doctype html><html><head><title>${esc(name)} QR codes</title><style>
      @page{size:A4;margin:12mm}body{font-family:system-ui,sans-serif;margin:0}
      .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10mm}
      .card{border:1px solid #ddd;border-radius:6mm;padding:8mm;text-align:center;break-inside:avoid}
      .card svg{width:55mm;height:55mm}.h{font-size:11pt;color:#666;margin:0}.t{font-size:20pt;font-weight:700;margin:2mm 0}.u{font-size:7pt;color:#999;word-break:break-all}
      .ar{direction:rtl;font-size:11pt;margin-top:2mm}
    </style></head><body><div class="grid">${codes
      .map((c, i) => `<div class="card"><p class="h">${esc(name)}</p><p class="t">${esc(c.title)}</p>${svgs[i]}<p class="ar">امسح الرمز لطلب الخدمات</p><p>Scan for dining & services</p><p class="u">${esc(c.url)}</p></div>`)
      .join('')}</div></body></html>`);
    w.document.close();
    // Triggered from the opener: inline scripts in the popup would be blocked by CSP.
    window.setTimeout(() => w.print(), 400);
  };

  if (hotel.isLoading) return <Skeleton className="h-96" />;
  const outletName = outlets.data?.find((o) => o.id === outletId)?.name_en as string | undefined;

  return (
    <>
      <PageHeader title="QR codes" description="Room QR codes carry the room number, so guests only confirm their name and phone. Codes point to your live guest site." />
      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <Card title="Single QR code">
          <div className="space-y-4">
            <Segmented
              label="QR type"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'main', label: 'Hotel' },
                { value: 'room', label: 'Room' },
                { value: 'dining', label: 'Dining' },
                { value: 'outlet', label: 'Outlet' },
                { value: 'spa', label: 'Spa' },
                { value: 'services', label: 'Services' },
              ]}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {kind === 'room' && (
                <Field label="Room number" htmlFor="qr-room">
                  <TextInput id="qr-room" value={room} onChange={(e) => setRoom(e.target.value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 12))} className="h-10 rounded-lg text-sm" />
                </Field>
              )}
              {kind === 'outlet' && (
                <Field label="Outlet" htmlFor="qr-outlet">
                  <Select id="qr-outlet" value={outletId} onChange={(e) => setOutletId(e.target.value)} className="h-10 rounded-lg text-sm">
                    <option value="">Choose…</option>
                    {(outlets.data ?? []).map((o) => (
                      <option key={o.id} value={o.id}>
                        {String(o.name_en)}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Language" htmlFor="qr-lang" hint="Empty = guest chooses on the welcome screen.">
                <Select id="qr-lang" value={lang} onChange={(e) => setLang(e.target.value as '' | 'ar' | 'en')} className="h-10 rounded-lg text-sm">
                  <option value="">Guest chooses</option>
                  <option value="ar">Arabic</option>
                  <option value="en">English</option>
                </Select>
              </Field>
            </div>
            <p className="rounded-lg bg-zinc-50 px-3 py-2 font-mono text-xs break-all" data-testid="qr-url">
              {url}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="rounded-lg" onClick={png} disabled={kind === 'outlet' && !outletId}>
                <Download className="h-4 w-4" aria-hidden="true" /> PNG
              </Button>
              <Button size="sm" variant="secondary" className="rounded-lg" onClick={svg} disabled={kind === 'outlet' && !outletId}>
                <FileDown className="h-4 w-4" aria-hidden="true" /> SVG
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="rounded-lg"
                disabled={kind === 'outlet' && !outletId}
                onClick={() => printSheet([{ title: kind === 'room' ? `Room ${room}` : kind === 'outlet' ? outletName ?? 'Dining' : kind === 'main' ? 'Welcome' : kind[0].toUpperCase() + kind.slice(1), subtitle: '', url }])}
              >
                <Printer className="h-4 w-4" aria-hidden="true" /> Print / PDF
              </Button>
            </div>
          </div>
        </Card>
        <Card title="Preview">
          {preview ? <img src={preview} alt={`QR code for ${url}`} className="mx-auto w-64" /> : <Skeleton className="mx-auto h-64 w-64" />}
        </Card>
        <Card title="Room QR codes in bulk" description="Range (e.g. 101-140) or a list (101, 102, 201). Up to 500 rooms." className="xl:col-span-2">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Rooms" htmlFor="qr-range">
              <TextInput id="qr-range" value={range} onChange={(e) => setRange(e.target.value)} className="h-10 w-72 rounded-lg text-sm" />
            </Field>
            <Button size="sm" className="h-10 rounded-lg" disabled={!rooms.length} onClick={() => printSheet(rooms.map((r) => ({ title: `Room ${r}`, subtitle: '', url: buildUrl('room', r) })))}>
              <Printer className="h-4 w-4" aria-hidden="true" /> Print {rooms.length} room codes (PDF)
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
