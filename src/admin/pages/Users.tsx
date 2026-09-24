import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { ROLES, ROLE_LABELS, ROLE_MODULES, type Role, GLOBAL_ROLES } from '@shared/domain';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Badge, Button, ErrorState, Field, IconButton, Select, Sheet, Skeleton, TextInput, Toggle } from '../../components/ui';
import { useMe } from '../data';
import { useFeedback } from '../feedback';
import { PageHeader } from '../layout/AdminLayout';
import { tr, L, locale } from '../i18n';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  is_active: boolean;
  last_login_at: string | null;
}

export function Users({ hid }: { hid: string }) {
  const me = useMe();
  const qc = useQueryClient();
  const fb = useFeedback();
  const q = useQuery({ queryKey: ['users', hid], queryFn: () => api<{ users: UserRow[] }>(`/admin/hotels/${hid}/users`).then((r) => r.users) });
  const [editing, setEditing] = useState<UserRow | 'new' | null>(null);
  const revoke = useMutation({
    mutationFn: (uid: string) => api(`/admin/hotels/${hid}/users/${uid}`, { method: 'DELETE' }),
    onSuccess: () => {
      fb.success(tr('Access removed'));
      qc.invalidateQueries({ queryKey: ['users', hid] });
    },
    onError: (e) => fb.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title={tr('Users & roles')}
        description={tr('Staff only see the modules and departments their role allows. Department roles see only their own requests.')}
        actions={
          <Button size="sm" className="rounded-lg" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" aria-hidden="true" />{' '}{tr('Add user')}</Button>
        }
      />
      {q.isLoading ? (
        <Skeleton className="h-64" />
      ) : q.error ? (
        <ErrorState title={tr('Could not load users')} description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/[0.07] bg-white">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="border-b border-black/[0.07] bg-zinc-50 text-xs text-zinc-500 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 text-start">{tr('User')}</th>
                <th scope="col" className="px-4 py-3 text-start">{tr('Role')}</th>
                <th scope="col" className="px-4 py-3 text-start">{tr('Status')}</th>
                <th scope="col" className="px-4 py-3 text-start">{tr('Last sign-in')}</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">{tr('Actions')}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {q.data!.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">{L(ROLE_LABELS[u.role])}</td>
                  <td className="px-4 py-3">{u.is_active ? <Badge tone="success">{tr('Active')}</Badge> : <Badge>{tr('Disabled')}</Badge>}</td>
                  <td className="px-4 py-3 text-zinc-500">{u.last_login_at ? new Date(u.last_login_at).toLocaleString(locale()) : tr('Never')}</td>
                  <td className="px-4 py-3 text-end">
                    {!GLOBAL_ROLES.includes(u.role) || me.data?.user?.role === 'SUPER_ADMIN' ? (
                      <IconButton label={tr('Edit {0}', { 0: u.name })} onClick={() => setEditing(u)} className="h-9 w-9">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                    ) : null}
                    {u.id !== me.data?.user?.id && !GLOBAL_ROLES.includes(u.role) && (
                      <IconButton
                        label={tr('Remove {0} from this hotel', { 0: u.name })}
                        size="sm" className="text-red-600"
                        onClick={async () => {
                          if (await fb.confirm({ title: tr('Remove {0}?', { 0: u.name }), message: tr('They will be signed out and lose access to this hotel.'), confirmLabel: tr('Remove access'), danger: true })) revoke.mutate(u.id);
                        }}
                      >
                        <UserMinus className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <UserEditor hid={hid} user={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function UserEditor({ hid, user, onClose }: { hid: string; user: UserRow | 'new' | null; onClose: () => void }) {
  const me = useMe();
  const qc = useQueryClient();
  const fb = useFeedback();
  const isNew = user === 'new';
  const [form, setForm] = useState({ email: '', name: '', role: 'FNB' as Role, is_active: true, password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastUser, setLastUser] = useState<typeof user>(null);
  if (user !== lastUser) {
    setLastUser(user);
    setErrors({});
    setForm(user && user !== 'new' ? { email: user.email, name: user.name, role: user.role, is_active: user.is_active, password: '' } : { email: '', name: '', role: 'FNB', is_active: true, password: '' });
  }
  const m = useMutation({
    mutationFn: () =>
      isNew
        ? api(`/admin/hotels/${hid}/users`, { method: 'POST', body: form })
        : api(`/admin/hotels/${hid}/users/${(user as UserRow).id}`, { method: 'PATCH', body: { name: form.name, role: form.role, is_active: form.is_active, ...(form.password ? { password: form.password } : {}) } }),
    onSuccess: () => {
      fb.success(isNew ? tr('User added') : tr('User updated'));
      qc.invalidateQueries({ queryKey: ['users', hid] });
      onClose();
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      fb.error(errorMessage(e));
    },
  });
  const roles = ROLES.filter((r) => !GLOBAL_ROLES.includes(r) || me.data?.user?.role === 'SUPER_ADMIN');
  return (
    <Sheet
      open={!!user}
      onClose={onClose}
      title={isNew ? tr('Add user') : tr('Edit user')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tr('Cancel')}</Button>
          <Button loading={m.isPending} onClick={() => m.mutate()}>{tr('Save')}</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label={tr('Email')} htmlFor="u-email" error={errors.email} required>
          <TextInput id="u-email" type="email" disabled={!isNew} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label={tr('Full name')} htmlFor="u-name" error={errors.name} required>
          <TextInput id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label={tr('Role')} htmlFor="u-role" hint={tr('Access: {0}', { 0: ROLE_MODULES[form.role].join(', ') })}>
          <Select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="h-10 rounded-lg text-sm">
            {roles.map((r) => (
              <option key={r} value={r}>
                {L(ROLE_LABELS[r])}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={isNew ? tr('Initial password') : tr('Reset password (optional)')} htmlFor="u-pw" error={errors.password} hint={tr('At least 10 characters with letters and numbers. Share it securely.')}>
          <TextInput id="u-pw" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-10 rounded-lg text-sm" />
        </Field>
        <Toggle label={tr('Account active')} checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
      </div>
    </Sheet>
  );
}
