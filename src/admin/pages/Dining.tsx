import { ArrowLeft, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, ErrorState, Skeleton } from '../../components/ui';
import { useAdminHotel, useEntities, type EntityRecord } from '../data';
import { EntityEditor, EntityManager } from '../components/EntityManager';
import { PageHeader } from '../layout/AdminLayout';

export function Dining({ hid }: { hid: string }) {
  const navigate = useNavigate();
  const hotel = useAdminHotel(hid);
  return (
    <>
      <PageHeader title="Dining & menus" description="Outlets appear on the guest Dining page in this order. Open an outlet to manage its menus, categories and items." />
      <EntityManager hid={hid} entity="outlets" currency={hotel.data?.profile.currency} onOpen={(o) => navigate(`/admin/h/${hid}/dining/${o.id}`)} />
    </>
  );
}

export function OutletDetail({ hid }: { hid: string }) {
  const { outletId = '' } = useParams();
  const hotel = useAdminHotel(hid);
  const outlets = useEntities(hid, 'outlets');
  const menus = useEntities(hid, 'menus', outletId);
  const [menu, setMenu] = useState<EntityRecord | null>(null);
  const [category, setCategory] = useState<EntityRecord | null>(null);
  const [editOutlet, setEditOutlet] = useState<EntityRecord | null>(null);
  const cats = useEntities(hid, 'menu_categories', menu?.id ?? null, !!menu);

  // Keep a valid selection as lists change (first menu / category by default).
  useEffect(() => {
    if (menus.data && (!menu || !menus.data.some((m) => m.id === menu.id))) setMenu(menus.data[0] ?? null);
  }, [menus.data, menu]);
  useEffect(() => {
    if (!menu) return setCategory(null);
    if (cats.data && (!category || !cats.data.some((c) => c.id === category.id))) setCategory(cats.data[0] ?? null);
  }, [cats.data, category, menu]);

  const outlet = outlets.data?.find((o) => o.id === outletId);
  if (outlets.isLoading) return <Skeleton className="h-64" />;
  if (!outlet) return <ErrorState title="Outlet not found" description="It may have been deleted." />;
  const currency = hotel.data?.profile.currency;

  return (
    <>
      <Link to={`/admin/h/${hid}/dining`} className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All outlets
      </Link>
      <PageHeader
        title={String(outlet.name_en)}
        description={`${String(outlet.type).replace('_', ' ')} · ${outlet.accepts_orders ? 'Takes orders from guests' : 'Menu only (no ordering)'}${outlet.is_active ? '' : ' · Hidden'}`}
        actions={
          <Button variant="secondary" size="sm" className="rounded-lg" onClick={() => setEditOutlet(outlet)}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit outlet
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <EntityManager hid={hid} entity="menus" parentId={outletId} compact onOpen={setMenu} selectedId={menu?.id} title="Menus" />
          {menu ? (
            <EntityManager hid={hid} entity="menu_categories" parentId={menu.id} compact onOpen={setCategory} selectedId={category?.id} title={`Categories · ${String(menu.name_en)}`} />
          ) : (
            <p className="rounded-2xl border border-dashed border-black/15 p-6 text-sm text-zinc-500">Create a menu first (e.g. “All-day menu”).</p>
          )}
        </div>
        <div className="min-w-0">
          {category ? (
            <EntityManager hid={hid} entity="menu_items" parentId={category.id} currency={currency} title={`Items · ${String(category.name_en)}`} />
          ) : (
            <p className="rounded-2xl border border-dashed border-black/15 p-6 text-sm text-zinc-500">{menu ? 'Add a category (e.g. “Breakfast”), then its items.' : 'Items appear here once a menu and category exist.'}</p>
          )}
        </div>
      </div>
      <EntityEditor hid={hid} entity="outlets" parentId={null} record={editOutlet} onClose={() => { setEditOutlet(null); void outlets.refetch(); }} />
    </>
  );
}
