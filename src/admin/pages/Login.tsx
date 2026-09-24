import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Button, Field, TextInput } from '../../components/ui';
import { tr } from '../i18n';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => api('/auth/login', { method: 'POST', body: { email, password } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] });
      const next = new URLSearchParams(window.location.search).get('next');
      navigate(next && next.startsWith('/admin') && !next.startsWith('/admin/login') ? next : '/admin', { replace: true });
    },
  });
  const fields = m.error instanceof ApiError ? m.error.fields : {};

  return (
    <main className="grid min-h-dvh bg-canvas lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#111714] lg:block">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 18px)' }} />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <p className="display text-5xl leading-tight">{tr('Digital Guest Hub')}</p>
          <p className="mt-4 max-w-md text-white/70">{tr('Operations console and website manager for your hotel’s digital concierge — requests, menus, services and branding in one place.')}</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <form
          className="w-full max-w-sm space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
          noValidate
        >
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">{tr('Staff sign in')}</h1>
            <p className="mt-1 text-sm text-zinc-500">{tr('Use the account provided by your hotel administrator.')}</p>
          </div>
          {m.error && !Object.keys(fields).length && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage(m.error)}
            </p>
          )}
          <Field label={tr('Email')} htmlFor="login-email" error={fields.email}>
            <TextInput id="login-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg" />
          </Field>
          <Field label={tr('Password')} htmlFor="login-password" error={fields.password}>
            <TextInput id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg" />
          </Field>
          <Button type="submit" block size="lg" className="rounded-xl" loading={m.isPending}>{tr('Sign in')}</Button>
        </form>
      </div>
    </main>
  );
}
