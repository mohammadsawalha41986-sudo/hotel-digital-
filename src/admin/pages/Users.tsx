import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { ROLES, ROLE_LABELS, ROLE_MODULES, type Role } from '@shared/domain';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Badge, Button, ErrorState, Field, IconButton, Select, Sheet, Skeleton, TextInput, Toggle } from '../../components/ui';
import { useMe } from '../data';
import { useFeedback } from '../feedback';
import { PageHeader } from '../layout/AdminLayout';

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
      fb.success('Access removed');
      qc.invalidateQueries({ queryKey: ['users', hid] });
    },
    onError: (e) => fb.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Staff only see the modules and departments their role allows. Department roles see only their own requests."
        actions={
          <Button size="sm" className="rounded-lg" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add user
          </Button>
        }
      />
      {q.isLoading ? (
        <Skeleton className="h-64" />
      ) : q.error ? (
        <ErrorState title="Could not load users" description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/[0.07] bg-white">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="border-b border-black/[0.07] bg-zinc-50 text-xs text-zinc-500 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 text-start">User</th>
                <th scope="col" className="px-4 py-3 text-start">Role</th>
                <th scope="col" className="px-4 py-3 text-start">Status</th>
                <th scope="col" className="px-4 py-3 text-start">Last sign-in</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {q.data!.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-3">{u.is_active ? <Badge tone="success">Active</Badge> : <Badge>Disabled</Badge>}</td>
                  <td className="px-4 py-3 text-zinc-500">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}</td>
                  <td className="px-4 py-3 text-end">
                    {u.role !== 'SUPER_ADMIN' || me.data?.user?.global ? (
                      <IconButton label={`Edit ${u.name}`} onClick={() => setEditing(u)} className="h-9 w-9">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                    ) : null}
                    {u.id !== me.data?.user?.id && u.role !== 'SUPER_ADMIN' && (
                      <IconButton
                        label={`Remove ${u.name} from this hotel`}
                        className="h-9 w-9 text-red-600"
                        onClick={async () => {
                          if (await fb.confirm({ title: `Remove ${u.name}?`, message: 'They will be signed out and lose access to this hotel.', confirmLabel: 'Remove access', danger: true })) revoke.mutate(u.id);
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
      fb.success(isNew ? 'User added' : 'User updated');
      qc.invalidateQueries({ queryKey: ['users', hid] });
      onClose();
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fields : {});
      fb.error(errorMessage(e));
    },
  });
  const roles = ROLES.filter((r) => r !== 'SUPER_ADMIN' || me.data?.user?.global);
  return (
    <Sheet
      open={!!user}
      onClose={onClose}
      title={isNew ? 'Add user' : 'Edit user'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={m.isPending} onClick={() => m.mutate()}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Email" htmlFor="u-email" error={errors.email} required>
          <TextInput id="u-email" type="email" disabled={!isNew} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="Full name" htmlFor="u-name" error={errors.name} required>
          <TextInput id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="Role" htmlFor="u-role" hint={`Access: ${ROLE_MODULES[form.role].join(', ')}`}>
          <Select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="h-10 rounded-lg text-sm">
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={isNew ? 'Initial password' : 'Reset password (optional)'} htmlFor="u-pw" error={errors.password} hint="At least 10 characters with letters and numbers. Share it securely.">
          <TextInput id="u-pw" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-10 rounded-lg text-sm" />
        </Field>
        <Toggle label="Account active" checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
      </div>
    </Sheet>
  );
}
