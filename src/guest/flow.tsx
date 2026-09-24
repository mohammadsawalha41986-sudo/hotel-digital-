import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { GuestRequestInput } from '@shared/hotel';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useHotel } from './hotel';
import { guestToken, useGuestSession } from './session';
import type { CreatedRequest, ServiceRec, SpaService } from './types';

type Payload = GuestRequestInput['payload'];

export type OpenSheet =
  | { kind: 'service'; entity: 'room_services' | 'hotel_services'; service: ServiceRec }
  | { kind: 'spa'; service: SpaService }
  | { kind: 'feedback' }
  | { kind: 'identity'; reason?: 'in_house_required' }
  | { kind: 'basket' }
  | { kind: 'success'; created: CreatedRequest; department: string }
  | null;

interface Flow {
  sheet: OpenSheet;
  open: (s: OpenSheet) => void;
  close: () => void;
  submit: (payload: Payload) => Promise<CreatedRequest>;
  submitting: boolean;
}

const Ctx = createContext<Flow | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const { slug, bundle } = useHotel();
  const { identity } = useGuestSession();
  const { lang } = useI18n();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: Payload) =>
      api<CreatedRequest>(`/public/hotels/${slug}/requests`, {
        method: 'POST',
        headers: { 'x-guest-token': guestToken() },
        body: { guest: identity!, lang, payload } as unknown as Record<string, unknown>,
      }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['my-requests', slug] });
      setSheet({ kind: 'success', created, department: created.department });
    },
  });

  const submit = useCallback(
    async (payload: Payload) => {
      if (bundle.preview) throw new Error(lang === 'ar' ? 'وضع المعاينة: لا يمكن إرسال الطلبات.' : 'Preview mode: requests cannot be sent from the preview.');
      if (!identity) {
        setSheet({ kind: 'identity' });
        throw new Error('identity required');
      }
      return mutation.mutateAsync(payload);
    },
    [identity, mutation, bundle.preview, lang]
  );

  const value = useMemo<Flow>(() => ({ sheet, open: setSheet, close: () => setSheet(null), submit, submitting: mutation.isPending }), [sheet, submit, mutation.isPending]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFlow() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFlow outside provider');
  return v;
}
