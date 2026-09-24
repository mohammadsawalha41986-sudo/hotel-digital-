import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ImageOff, Loader2, Minus, Plus, RefreshCw, X } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light' | 'accent';
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-ink hover:brightness-110 shadow-sm',
  accent: 'bg-accent text-white hover:brightness-105 shadow-sm',
  secondary: 'bg-surface text-fg ring-1 ring-inset ring-line hover:bg-black/[0.03]',
  ghost: 'text-fg hover:bg-black/[0.05]',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  light: 'bg-white/95 text-neutral-900 hover:bg-white shadow-sm',
};
const sizes = { sm: 'h-9 px-3.5 text-sm gap-1.5', md: 'h-11 px-5 text-[0.95rem] gap-2', lg: 'h-14 px-6 text-base gap-2.5' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof sizes;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, block, className, children, disabled, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex select-none items-center justify-center rounded-full font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

const iconSizes = { xs: 'h-6 w-6', sm: 'h-8 w-8', md: 'h-10 w-10' };

export function IconButton({ label, className, children, size = 'md', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: keyof typeof iconSizes }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx('inline-flex shrink-0 items-center justify-center rounded-full transition hover:bg-black/5 disabled:opacity-30', iconSizes[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('animate-spin', className ?? 'h-5 w-5')} aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// Image with graceful fallback
// ---------------------------------------------------------------------------
export function Img({
  src,
  alt,
  className,
  fallbackLabel,
  eager,
  sizes: sizesAttr,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  eager?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);
  if (!src || failed) {
    // Branded placeholder: a composed gradient, not a broken-image icon.
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        className={cx('relative flex items-center justify-center overflow-hidden', className)}
        style={{ background: 'radial-gradient(120% 90% at 20% 10%, color-mix(in oklab, var(--c-accent) 55%, var(--c-primary)) 0%, var(--c-primary) 55%, var(--c-secondary) 100%)' }}
      >
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 14px)' }} />
        {fallbackLabel ? (
          <span className="display relative px-4 text-center text-2xl text-white/85">{fallbackLabel}</span>
        ) : alt ? (
          <ImageOff className="relative h-6 w-6 text-white/50" aria-hidden="true" />
        ) : null}
      </div>
    );
  }
  return (
    <div className={cx('relative overflow-hidden bg-black/5', className)}>
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        sizes={sizesAttr}
        {...(eager ? { fetchpriority: 'high' } : {})}
        onError={() => setFailed(true)}
        onLoad={() => setLoaded(true)}
        className={cx('h-full w-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheet: bottom sheet on phones, centered dialog on larger screens
// ---------------------------------------------------------------------------
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeLabel = 'Close',
  hideHeader,
  side,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeLabel?: string;
  hideHeader?: boolean;
  /** 'right' renders a full-height side drawer on desktop (admin editors). */
  side?: 'right';
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel.current)?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === 'Tab' && panel.current) {
        const nodes = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        // Focus outside the dialog (e.g. before initial focus landed) is pulled back in.
        if (!panel.current.contains(document.activeElement)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }[size];
  const isSide = side === 'right';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cx('fixed inset-0 z-[100] flex items-end justify-center', isSide ? 'sm:items-stretch sm:justify-end' : 'sm:items-center sm:p-6')}>
          <motion.div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={isSide ? { x: '100%', opacity: 1 } : { y: 48, opacity: 0 }}
            animate={isSide ? { x: 0, opacity: 1 } : { y: 0, opacity: 1 }}
            exit={isSide ? { x: '100%', opacity: 1 } : { y: 48, opacity: 0 }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            className={cx(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface text-fg shadow-2xl outline-none',
              'rounded-t-[1.75rem]',
              isSide ? cx('sm:h-full sm:max-h-none sm:rounded-none', size === 'xl' ? 'sm:max-w-6xl' : 'sm:max-w-2xl') : cx('sm:rounded-[1.75rem]', width)
            )}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-black/15 sm:hidden" aria-hidden="true" />
            <div className={cx('flex shrink-0 items-start gap-3 px-5 pt-3 pb-3 sm:px-6 sm:pt-5', hideHeader && 'sr-only')}>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-lg font-semibold leading-snug">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-0.5 text-sm text-muted">
                    {description}
                  </p>
                )}
              </div>
              <IconButton label={closeLabel} onClick={onClose} className="-me-2 -mt-1 shrink-0">
                <X className="h-5 w-5" />
              </IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">{children}</div>
            {footer && <div className="shrink-0 border-t border-line bg-surface px-5 pt-3 pb-safe sm:px-6 sm:pb-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------
export function Field({ label, hint, error, required, htmlFor, children, optionalLabel }: { label: ReactNode; hint?: ReactNode; error?: string; required?: boolean; htmlFor?: string; children: ReactNode; optionalLabel?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline gap-1.5 text-sm font-medium">
        <span>{label}</span>
        {required && <span className="text-red-600" aria-hidden="true">*</span>}
        {!required && optionalLabel && <span className="text-xs font-normal text-muted">({optionalLabel})</span>}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-red-600" role="alert" id={htmlFor ? `${htmlFor}-error` : undefined}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  'w-full rounded-2xl border border-line bg-surface px-4 text-[0.95rem] text-fg placeholder:text-muted/70 transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-[color-mix(in_oklab,var(--c-primary)_15%,transparent)] disabled:opacity-60';

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function TextInput({ className, invalid, ...rest }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cx(inputBase, 'h-12', invalid && 'border-red-500', className)} {...rest} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function TextArea({ className, invalid, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} aria-invalid={invalid || undefined} className={cx(inputBase, 'py-3 leading-relaxed', invalid && 'border-red-500', className)} {...rest} />;
});

export function Select({ className, invalid, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select aria-invalid={invalid || undefined} className={cx(inputBase, 'h-12 appearance-none bg-[length:1rem] pe-10', invalid && 'border-red-500', className)} {...rest}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, description, id }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; id?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={fid} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </label>
      <button
        id={fid}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-brand' : 'bg-black/15')}
      >
        <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'start-[1.375rem]' : 'start-0.5')} />
      </button>
    </div>
  );
}

export function Stepper({ value, onChange, min = 1, max = 50, label, decLabel = 'Decrease', incLabel = 'Increase', size = 'md' }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string; decLabel?: string; incLabel?: string; size?: 'sm' | 'md' }) {
  const b = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11';
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] p-1" role="group" aria-label={label}>
      <button type="button" aria-label={decLabel} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className={cx(b, 'inline-flex items-center justify-center rounded-full bg-surface shadow-sm transition disabled:opacity-40')}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <output aria-live="polite" className={cx('min-w-8 text-center font-semibold tabular-nums', size === 'sm' && 'min-w-6 text-sm')}>
        {value}
      </output>
      <button type="button" aria-label={incLabel} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className={cx(b, 'inline-flex items-center justify-center rounded-full bg-surface shadow-sm transition disabled:opacity-40')}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-2xl bg-black/[0.05] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('min-h-10 flex-1 rounded-xl px-3 text-sm font-medium whitespace-nowrap transition', value === o.value ? 'bg-surface shadow-sm' : 'text-muted hover:text-fg')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton rounded-2xl', className)} aria-hidden="true" />;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-black/[0.04] text-muted">{icon}</div>}
      <p className="text-base font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, description, onRetry, retryLabel = 'Try again' }: { title: string; description?: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="text-base font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand' | 'info'; className?: string }) {
  const tones = {
    neutral: 'bg-black/[0.06] text-fg',
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15',
    warning: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20',
    danger: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15',
    brand: 'bg-brand text-brand-ink',
    info: 'bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-600/15',
  };
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>;
}
