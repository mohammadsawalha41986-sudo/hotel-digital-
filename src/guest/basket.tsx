import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ModifierGroup } from '@shared/fields';
import { lineAmounts, sumLines, type Totals, type VatSettings } from '@shared/pricing';
import type { MenuItem } from './types';

export interface BasketLine {
  key: string;
  item_id: string;
  name_en: string;
  name_ar: string;
  image: string;
  base_price: number;
  vat_mode: MenuItem['vat_mode'];
  quantity: number;
  modifiers: Record<string, string[]>;
  groups: ModifierGroup[];
  note: string;
}

interface Basket {
  outletId: string | null;
  outletName: { en: string; ar: string } | null;
  lines: BasketLine[];
  notes: string;
}

export function unitPrice(line: Pick<BasketLine, 'base_price' | 'groups' | 'modifiers'>): number {
  let p = line.base_price;
  for (const g of line.groups) for (const id of line.modifiers[g.id] ?? []) p += g.options.find((o) => o.id === id)?.price ?? 0;
  return p;
}

interface BasketApi extends Basket {
  count: number;
  totals: Totals;
  add: (outlet: { id: string; name_en: string; name_ar: string }, line: Omit<BasketLine, 'key'>) => void;
  setQuantity: (key: string, q: number) => void;
  remove: (key: string) => void;
  setNotes: (n: string) => void;
  clear: () => void;
}

const Ctx = createContext<BasketApi | null>(null);
const empty: Basket = { outletId: null, outletName: null, lines: [], notes: '' };

export function BasketProvider({ slug, vat, children }: { slug: string; vat: VatSettings; children: ReactNode }) {
  const key = `hub.basket.${slug}`;
  const [basket, setBasket] = useState<Basket>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? { ...empty, ...JSON.parse(raw) } : empty;
    } catch {
      return empty;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(basket));
    } catch {
      /* ignore */
    }
  }, [basket, key]);

  const add = useCallback<BasketApi['add']>((outlet, line) => {
    setBasket((b) => {
      const base = b.outletId && b.outletId !== outlet.id ? empty : b;
      // Merge identical configurations instead of duplicating lines.
      const sig = JSON.stringify([line.item_id, line.modifiers, line.note]);
      const existing = base.lines.find((l) => JSON.stringify([l.item_id, l.modifiers, l.note]) === sig);
      const lines = existing
        ? base.lines.map((l) => (l === existing ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l))
        : [...base.lines, { ...line, key: `${line.item_id}-${Date.now().toString(36)}` }];
      return { ...base, outletId: outlet.id, outletName: { en: outlet.name_en, ar: outlet.name_ar }, lines };
    });
  }, []);

  const value = useMemo<BasketApi>(() => {
    const totals = sumLines(basket.lines.map((l) => lineAmounts(unitPrice(l), l.quantity, l.vat_mode, vat)));
    return {
      ...basket,
      count: basket.lines.reduce((s, l) => s + l.quantity, 0),
      totals,
      add,
      setQuantity: (k, q) => setBasket((b) => ({ ...b, lines: b.lines.map((l) => (l.key === k ? { ...l, quantity: q } : l)) })),
      remove: (k) => setBasket((b) => {
        const lines = b.lines.filter((l) => l.key !== k);
        return lines.length ? { ...b, lines } : empty;
      }),
      setNotes: (n) => setBasket((b) => ({ ...b, notes: n })),
      clear: () => setBasket(empty),
    };
  }, [basket, vat, add]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBasket() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBasket outside provider');
  return v;
}
