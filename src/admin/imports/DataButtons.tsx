import { Download, FileUp } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { downloadFile, errorMessage } from '../../lib/api';
import { Button } from '../../components/ui';
import { useMe } from '../data';
import { useFeedback } from '../feedback';
import { templatePath, useTemplates } from './api';
import { ImportDialog } from './ImportDialog';
import { tr, L } from '../i18n';

/** Small accessible menu for modules with several templates (e.g. laundry garments and prices). */
function ExportMenu({ items, onPick }: { items: { key: string; label: string }[]; onPick: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', off);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', off);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div ref={root} className="relative">
      <Button variant="secondary" size="sm" className="rounded-lg" aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <Download className="h-4 w-4" aria-hidden="true" />{' '}{tr('Export Excel')}</Button>
      {open && (
        <ul id={id} role="menu" className="absolute end-0 z-30 mt-1 min-w-56 rounded-xl border border-black/10 bg-white p-1 shadow-lg">
          {items.map((i) => (
            <li key={i.key} role="none">
              <button
                role="menuitem"
                type="button"
                className="w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-zinc-100 focus-visible:bg-zinc-100"
                onClick={() => {
                  setOpen(false);
                  onPick(i.key);
                }}
              >
                {i.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Module-level "Import Excel" / "Export Excel" next to "Add": opens the shared
 * import dialog preset to this module's template(s).
 */
export function DataButtons({ hid, entity }: { hid: string; entity: string }) {
  const me = useMe();
  const canImport = !!me.data?.permissions?.modules.includes('import');
  // Roles without the import module never ask for templates (the server would refuse).
  const cat = useTemplates(hid, canImport);
  const fb = useFeedback();
  const [open, setOpen] = useState(false);
  if (!canImport) return null;
  const mine = (cat.data?.templates ?? []).filter((t) => t.allowed && t.entities.includes(entity));
  if (!mine.length) return null;
  const exportKey = (key: string) => downloadFile(templatePath(hid, key, true)).catch((e) => fb.error(errorMessage(e)));
  return (
    <>
      <Button variant="secondary" size="sm" className="rounded-lg" onClick={() => setOpen(true)}>
        <FileUp className="h-4 w-4" aria-hidden="true" />{' '}{tr('Import Excel')}</Button>
      {mine.length === 1 ? (
        <Button variant="secondary" size="sm" className="rounded-lg" onClick={() => exportKey(mine[0].key)}>
          <Download className="h-4 w-4" aria-hidden="true" />{' '}{tr('Export Excel')}</Button>
      ) : (
        <ExportMenu items={mine.map((t) => ({ key: t.key, label: `${t.number} ${L({ en: t.title, ar: t.title_ar })}` }))} onPick={exportKey} />
      )}
      <ImportDialog hid={hid} open={open} onClose={() => setOpen(false)} templates={mine.map((t) => t.key)} />
    </>
  );
}
