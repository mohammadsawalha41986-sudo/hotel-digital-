import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Button, Sheet } from '../components/ui';
import { tr } from './i18n';

interface Toast {
  id: number;
  tone: 'success' | 'error';
  message: string;
}
interface ConfirmOpts {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}
interface FeedbackApi {
  success: (m: string) => void;
  error: (m: string) => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
}

const Ctx = createContext<FeedbackApi | null>(null);

/** Toasts (announced via aria-live) and an accessible confirm dialog for the admin. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const seq = useRef(0);

  const push = useCallback((tone: Toast['tone'], message: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, tone, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 3500);
  }, []);

  const api: FeedbackApi = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    confirm: (o) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setConfirmState(o);
      }),
  };
  const settle = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setConfirmState(null);
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[300] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex max-w-md items-start gap-3 rounded-xl bg-zinc-900 px-4 py-3 text-sm text-white shadow-xl"
            >
              {t.tone === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />}
              <span className="flex-1">{t.message}</span>
              <button type="button" aria-label={tr('Dismiss')} onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
                <X className="h-4 w-4 opacity-60" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Sheet
        open={!!confirmState}
        onClose={() => settle(false)}
        title={confirmState?.title ?? ''}
        description={confirmState?.message}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => settle(false)}>{tr('Cancel')}</Button>
            <Button variant={confirmState?.danger ? 'danger' : 'primary'} onClick={() => settle(true)} data-autofocus>
              {confirmState?.confirmLabel ?? tr('Confirm')}
            </Button>
          </div>
        }
      >
        <span />
      </Sheet>
    </Ctx.Provider>
  );
}

export function useFeedback() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFeedback outside provider');
  return v;
}
