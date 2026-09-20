import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Image as ImageIcon,
  Clock,
  MapPin,
  ChevronRight,
  Coffee,
  DollarSign,
  Tag,
} from 'lucide-react';
import { Hotel } from '../../../types/hotel';
import { FBOutlet, MenuCategory, MenuItem } from '../../../types/department';
import { AdminUser, canEditHotelContent } from '../../../types/auth';
import { getOutlets, saveOutlet, deleteOutlet } from '../../../services/hotelService';

interface FnbManagerViewProps {
  hotel: Hotel;
  currentUser?: AdminUser | null;
  onMarkUnpublishedChanges?: () => void;
}

export const FnbManagerView: React.FC<FnbManagerViewProps> = ({
  hotel,
  currentUser,
  onMarkUnpublishedChanges,
}) => {
  const hasEditPermission = canEditHotelContent(currentUser || null, hotel.id);

  const [outlets, setOutlets] = useState<FBOutlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Selected Outlet for Menu Management
  const [selectedOutlet, setSelectedOutlet] = useState<FBOutlet | null>(null);

  // Outlet Modal State
  const [isOutletModalOpen, setIsOutletModalOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<FBOutlet | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Outlet Form Fields
  const [outletNameEn, setOutletNameEn] = useState('');
  const [outletNameAr, setOutletNameAr] = useState('');
  const [outletSlug, setOutletSlug] = useState('');
  const [outletType, setOutletType] = useState<any>('restaurant');
  const [shortDescEn, setShortDescEn] = useState('');
  const [shortDescAr, setShortDescAr] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [hoursEn, setHoursEn] = useState('07:00 AM - 11:30 PM');
  const [hoursAr, setHoursAr] = useState('07:00 ص - 11:30 م');
  const [locationEn, setLocationEn] = useState('Ground Floor');
  const [locationAr, setLocationAr] = useState('الطابق الأرضي');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isOutletActive, setIsOutletActive] = useState(true);

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameAr, setCatNameAr] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [targetCatId, setTargetCatId] = useState<string>('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemNameEn, setItemNameEn] = useState('');
  const [itemNameAr, setItemNameAr] = useState('');
  const [itemDescEn, setItemDescEn] = useState('');
  const [itemDescAr, setItemDescAr] = useState('');
  const [itemPrice, setItemPrice] = useState(45);
  const [itemImage, setItemImage] = useState('');
  const [itemCalories, setItemCalories] = useState<number | undefined>(undefined);
  const [itemAvailable, setItemAvailable] = useState(true);

  const loadOutlets = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getOutlets(hotel.id);
      setOutlets(data);
      if (selectedOutlet) {
        const fresh = data.find((o) => o.id === selectedOutlet.id);
        setSelectedOutlet(fresh || null);
      }
    } catch (err: any) {
      console.error('[FnbManagerView] Failed to load outlets:', err);
      setErrorMessage('Failed to load dining outlets from Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOutlets();
  }, [hotel.id]);

  const notifySuccess = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
    onMarkUnpublishedChanges?.();
  };

  // Outlet Add / Edit handlers
  const handleOpenAddOutlet = () => {
    setEditingOutlet(null);
    setOutletNameEn('');
    setOutletNameAr('');
    setOutletSlug(`outlet-${Date.now()}`);
    setOutletType('restaurant');
    setShortDescEn('');
    setShortDescAr('');
    setHeroImage('');
    setHoursEn('07:00 AM - 11:30 PM');
    setHoursAr('07:00 ص - 11:30 م');
    setLocationEn('Main Lobby Floor');
    setLocationAr('بهو الفندق الرئيسي');
    setPhone('');
    setWhatsapp('');
    setIsOutletActive(true);
    setIsOutletModalOpen(true);
  };

  const handleOpenEditOutlet = (outlet: FBOutlet) => {
    setEditingOutlet(outlet);
    setOutletNameEn(outlet.name_en || '');
    setOutletNameAr(outlet.name_ar || '');
    setOutletSlug(outlet.slug || outlet.id);
    setOutletType(outlet.outlet_type || 'restaurant');
    setShortDescEn(outlet.short_description_en || '');
    setShortDescAr(outlet.short_description_ar || '');
    setHeroImage(outlet.hero_image || '');
    setHoursEn(outlet.operating_info?.opening_hours_en || '');
    setHoursAr(outlet.operating_info?.opening_hours_ar || '');
    setLocationEn(outlet.location?.internal_text_en || '');
    setLocationAr(outlet.location?.internal_text_ar || '');
    setPhone(outlet.contact?.phone || '');
    setWhatsapp(outlet.contact?.whatsapp_number || '');
    setIsOutletActive(outlet.is_active !== false);
    setIsOutletModalOpen(true);
  };

  const handleSaveOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEditPermission) return;
    if (!outletNameEn.trim() || !outletNameAr.trim()) {
      setErrorMessage('English and Arabic outlet names are required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const outletId = editingOutlet ? editingOutlet.id : (outletSlug.trim() || `outlet-${Date.now()}`);
    const payload: FBOutlet = {
      id: outletId,
      hotel_id: hotel.id,
      outlet_code: outletId,
      slug: outletSlug.trim() || outletId,
      outlet_type: outletType,
      name_en: outletNameEn.trim(),
      name_ar: outletNameAr.trim(),
      short_description_en: shortDescEn.trim(),
      short_description_ar: shortDescAr.trim(),
      full_description_en: shortDescEn.trim(),
      full_description_ar: shortDescAr.trim(),
      hero_image: heroImage.trim(),
      gallery: editingOutlet?.gallery || [],
      location: {
        building_en: 'Main Building',
        building_ar: 'المبنى الرئيسي',
        floor_en: locationEn.trim(),
        floor_ar: locationAr.trim(),
        internal_text_en: locationEn.trim(),
        internal_text_ar: locationAr.trim(),
      },
      operating_info: {
        opening_hours_en: hoursEn.trim(),
        opening_hours_ar: hoursAr.trim(),
        periods: [],
      },
      contact: {
        phone: phone.trim(),
        extension: '',
        whatsapp_number: whatsapp.trim(),
        whatsapp_enabled: !!whatsapp.trim(),
        default_message_en: '',
        default_message_ar: '',
      },
      audience: 'ALL',
      is_active: isOutletActive,
      is_visible: isOutletActive,
      sort_order: editingOutlet?.sort_order || 1,
      menu_categories: editingOutlet?.menu_categories || [],
    };

    try {
      await saveOutlet(hotel.id, payload);
      notifySuccess(`Outlet "${payload.name_en}" saved to Firestore.`);
      setIsOutletModalOpen(false);
      await loadOutlets();
    } catch (err: any) {
      console.error('[FnbManagerView] Save outlet failed:', err);
      setErrorMessage(err.message || 'Failed to save dining outlet to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOutlet = async (outletId: string, name: string) => {
    if (!hasEditPermission) return;
    if (!window.confirm(`Are you sure you want to delete outlet "${name}" and all its menus?`)) return;

    try {
      await deleteOutlet(hotel.id, outletId);
      if (selectedOutlet?.id === outletId) setSelectedOutlet(null);
      notifySuccess(`Outlet "${name}" deleted from Firestore.`);
      await loadOutlets();
    } catch (err: any) {
      console.error('[FnbManagerView] Delete outlet failed:', err);
      setErrorMessage('Failed to delete outlet.');
    }
  };

  // Category Add / Save handler
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutlet || !catNameEn.trim() || !catNameAr.trim()) return;

    const catId = editingCatId || `cat-${Date.now()}`;
    const existingCats = selectedOutlet.menu_categories || [];
    let updatedCats: MenuCategory[];

    if (editingCatId) {
      updatedCats = existingCats.map((c) =>
        c.id === editingCatId ? { ...c, name_en: catNameEn.trim(), name_ar: catNameAr.trim() } : c
      );
    } else {
      const newCat: MenuCategory = {
        id: catId,
        outlet_id: selectedOutlet.id,
        code: catId,
        name_en: catNameEn.trim(),
        name_ar: catNameAr.trim(),
        is_active: true,
        sort_order: existingCats.length + 1,
        items: [],
      };
      updatedCats = [...existingCats, newCat];
    }

    const updatedOutlet = { ...selectedOutlet, menu_categories: updatedCats };
    try {
      await saveOutlet(hotel.id, updatedOutlet);
      setSelectedOutlet(updatedOutlet);
      setIsCatModalOpen(false);
      setCatNameEn('');
      setCatNameAr('');
      setEditingCatId(null);
      notifySuccess('Menu category updated in Firestore.');
      await loadOutlets();
    } catch (err) {
      console.error('[FnbManagerView] Save category failed:', err);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!selectedOutlet) return;
    if (!window.confirm('Delete this menu category and its items?')) return;

    const updatedCats = (selectedOutlet.menu_categories || []).filter((c) => c.id !== catId);
    const updatedOutlet = { ...selectedOutlet, menu_categories: updatedCats };
    try {
      await saveOutlet(hotel.id, updatedOutlet);
      setSelectedOutlet(updatedOutlet);
      notifySuccess('Category deleted.');
      await loadOutlets();
    } catch (err) {
      console.error('[FnbManagerView] Delete category failed:', err);
    }
  };

  // Item Add / Edit handler
  const handleOpenAddItem = (catId: string) => {
    setTargetCatId(catId);
    setEditingItemId(null);
    setItemNameEn('');
    setItemNameAr('');
    setItemDescEn('');
    setItemDescAr('');
    setItemPrice(45);
    setItemImage('');
    setItemCalories(undefined);
    setItemAvailable(true);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (catId: string, item: MenuItem) => {
    setTargetCatId(catId);
    setEditingItemId(item.id);
    setItemNameEn(item.name_en || '');
    setItemNameAr(item.name_ar || '');
    setItemDescEn(item.description_en || '');
    setItemDescAr(item.description_ar || '');
    setItemPrice(item.price || 0);
    setItemImage(item.image || '');
    setItemCalories(item.calories);
    setItemAvailable(item.is_available !== false);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutlet || !targetCatId || !itemNameEn.trim() || !itemNameAr.trim()) return;

    const itemId = editingItemId || `item-${Date.now()}`;
    const updatedCats = (selectedOutlet.menu_categories || []).map((cat) => {
      if (cat.id !== targetCatId) return cat;
      const currentItems = cat.items || [];
      let nextItems: MenuItem[];

      if (editingItemId) {
        nextItems = currentItems.map((itm) =>
          itm.id === editingItemId
            ? {
                ...itm,
                name_en: itemNameEn.trim(),
                name_ar: itemNameAr.trim(),
                description_en: itemDescEn.trim(),
                description_ar: itemDescAr.trim(),
                price: Number(itemPrice) || 0,
                image: itemImage.trim(),
                calories: itemCalories ? Number(itemCalories) : undefined,
                is_available: itemAvailable,
              }
            : itm
        );
      } else {
        const newItem: MenuItem = {
          id: itemId,
          item_code: itemId,
          category_id: targetCatId,
          name_en: itemNameEn.trim(),
          name_ar: itemNameAr.trim(),
          description_en: itemDescEn.trim(),
          description_ar: itemDescAr.trim(),
          price: Number(itemPrice) || 0,
          currency: hotel.currency || 'SAR',
          image: itemImage.trim(),
          calories: itemCalories ? Number(itemCalories) : undefined,
          is_available: itemAvailable,
          sort_order: currentItems.length + 1,
        };
        nextItems = [...currentItems, newItem];
      }

      return { ...cat, items: nextItems };
    });

    const updatedOutlet = { ...selectedOutlet, menu_categories: updatedCats };
    try {
      await saveOutlet(hotel.id, updatedOutlet);
      setSelectedOutlet(updatedOutlet);
      setIsItemModalOpen(false);
      notifySuccess(`Menu item "${itemNameEn}" saved to Firestore.`);
      await loadOutlets();
    } catch (err) {
      console.error('[FnbManagerView] Save menu item failed:', err);
    }
  };

  const handleDeleteItem = async (catId: string, itemId: string) => {
    if (!selectedOutlet) return;
    if (!window.confirm('Delete this menu item?')) return;

    const updatedCats = (selectedOutlet.menu_categories || []).map((cat) => {
      if (cat.id !== catId) return cat;
      return { ...cat, items: (cat.items || []).filter((i) => i.id !== itemId) };
    });

    const updatedOutlet = { ...selectedOutlet, menu_categories: updatedCats };
    try {
      await saveOutlet(hotel.id, updatedOutlet);
      setSelectedOutlet(updatedOutlet);
      notifySuccess('Menu item deleted.');
      await loadOutlets();
    } catch (err) {
      console.error('[FnbManagerView] Delete item failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 end-6 z-50 bg-stone-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              /hotels/{hotel.id}/outlets
            </span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Utensils className="text-amber-400" size={22} />
            <span>Food & Beverage Dining & Menus</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Manage restaurants, cafes, in-room dining menus, categories, and item pricing for {hotel.name_en}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadOutlets}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
            title="Refresh outlets from Firestore"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-amber-400' : ''} />
          </button>

          {hasEditPermission && (
            <button
              onClick={handleOpenAddOutlet}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Dining Venue</span>
            </button>
          )}
        </div>
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
          <AlertTriangle size={18} className="shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="p-12 text-center text-stone-400 text-sm">
          <RefreshCw size={24} className="animate-spin mx-auto text-amber-400 mb-3" />
          Loading dining outlets from Firestore...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && outlets.length === 0 && (
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-12 text-center text-stone-400 space-y-3">
          <Utensils size={40} className="mx-auto text-stone-600" />
          <h3 className="text-base font-bold text-white">No dining venues configured yet</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            This property currently has zero dining outlets in Firestore (<code>/hotels/{hotel.id}/outlets</code>). Click below to create your first restaurant, lounge, or room service menu.
          </p>
          {hasEditPermission && (
            <button
              onClick={handleOpenAddOutlet}
              className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Plus size={15} />
              <span>Add First Dining Venue</span>
            </button>
          )}
        </div>
      )}

      {/* Outlets Directory & Menu Builder */}
      {!isLoading && outlets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Outlets Sidebar / List */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 px-1">
              Venues ({outlets.length})
            </h2>
            {outlets.map((outlet) => {
              const isSelected = selectedOutlet?.id === outlet.id;
              const isOutletOnline = outlet.is_active !== false;
              return (
                <div
                  key={outlet.id}
                  onClick={() => setSelectedOutlet(outlet)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-lg'
                      : 'bg-stone-900 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{outlet.name_en}</span>
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isOutletOnline
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-stone-800 text-stone-400 border-stone-700'
                      }`}
                    >
                      {isOutletOnline ? 'Active' : 'Hidden'}
                    </span>
                  </div>

                  <p className="text-xs text-stone-400 font-serif mt-0.5" dir="rtl">
                    {outlet.name_ar}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-2">
                    <span className="capitalize">{outlet.outlet_type}</span>
                    <span>•</span>
                    <span>{outlet.menu_categories?.length || 0} Categories</span>
                  </div>

                  {/* Outlet Quick Controls */}
                  {hasEditPermission && (
                    <div className="mt-3 pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditOutlet(outlet);
                        }}
                        className="text-stone-400 hover:text-white flex items-center gap-1"
                      >
                        <Edit2 size={12} />
                        <span>Edit Venue</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOutlet(outlet.id, outlet.name_en);
                        }}
                        className="text-stone-500 hover:text-rose-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Menu Categories & Items Builder */}
          <div className="lg:col-span-2">
            {selectedOutlet ? (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="border-b border-stone-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded">
                      Managing Menu
                    </span>
                    <h2 className="text-lg font-bold text-white mt-1">{selectedOutlet.name_en}</h2>
                    <p className="text-xs text-stone-400">
                      {selectedOutlet.operating_info?.opening_hours_en || 'Daily'} • {selectedOutlet.location?.internal_text_en}
                    </p>
                  </div>

                  {hasEditPermission && (
                    <button
                      onClick={() => {
                        setEditingCatId(null);
                        setCatNameEn('');
                        setCatNameAr('');
                        setIsCatModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                      <Plus size={14} />
                      <span>Add Menu Category</span>
                    </button>
                  )}
                </div>

                {/* Categories & Item Rows */}
                {(!selectedOutlet.menu_categories || selectedOutlet.menu_categories.length === 0) ? (
                  <div className="p-8 text-center text-stone-500 text-xs border border-dashed border-stone-800 rounded-xl">
                    No menu categories yet. Click "Add Menu Category" to begin adding dishes or beverages.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedOutlet.menu_categories.map((cat) => (
                      <div key={cat.id} className="border border-stone-800 rounded-xl overflow-hidden">
                        <div className="bg-stone-850 p-3.5 flex items-center justify-between border-b border-stone-800">
                          <div>
                            <span className="text-xs font-bold text-white">{cat.name_en}</span>
                            <span className="text-xs text-stone-400 ms-2 font-serif" dir="rtl">
                              {cat.name_ar}
                            </span>
                            <span className="text-[11px] text-stone-500 ms-2">
                              ({cat.items?.length || 0} items)
                            </span>
                          </div>

                          {hasEditPermission && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenAddItem(cat.id)}
                                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Plus size={12} />
                                <span>Add Item</span>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCatId(cat.id);
                                  setCatNameEn(cat.name_en);
                                  setCatNameAr(cat.name_ar);
                                  setIsCatModalOpen(true);
                                }}
                                className="p-1 text-stone-400 hover:text-white"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-1 text-stone-500 hover:text-rose-400"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Items in this category */}
                        <div className="divide-y divide-stone-800/60 p-1">
                          {(!cat.items || cat.items.length === 0) ? (
                            <div className="p-4 text-center text-xs text-stone-500">
                              No items in this category. Click "+ Add Item".
                            </div>
                          ) : (
                            cat.items.map((item) => (
                              <div key={item.id} className="p-3 flex items-center justify-between gap-3 hover:bg-stone-850/40 rounded-lg">
                                <div className="flex items-center gap-3">
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt=""
                                      className="w-12 h-12 object-cover rounded-lg bg-stone-950 border border-stone-800 shrink-0"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center text-stone-600 shrink-0">
                                      <Utensils size={16} />
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-white">{item.name_en}</span>
                                      <span className="text-xs text-stone-400 font-serif" dir="rtl">{item.name_ar}</span>
                                    </div>
                                    {item.description_en && (
                                      <p className="text-[11px] text-stone-400 line-clamp-1">{item.description_en}</p>
                                    )}
                                    <span className="text-xs font-bold text-amber-400 mt-0.5 block">
                                      {item.price} {hotel.currency || 'SAR'}
                                    </span>
                                  </div>
                                </div>

                                {hasEditPermission && (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => handleOpenEditItem(cat.id, item)}
                                      className="p-1.5 text-stone-400 hover:text-white rounded bg-stone-800 hover:bg-stone-700 cursor-pointer"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(cat.id, item.id)}
                                      className="p-1.5 text-stone-500 hover:text-rose-400 rounded bg-stone-800 hover:bg-stone-700 cursor-pointer"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center text-stone-500 text-sm">
                Select a dining venue on the left to view and edit its menu categories and dishes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Outlet Modal */}
      {isOutletModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-850">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Utensils size={16} className="text-amber-400" />
                <span>{editingOutlet ? `Edit: ${editingOutlet.name_en}` : 'Add New Dining Venue'}</span>
              </h2>
              <button onClick={() => setIsOutletModalOpen(false)} className="text-stone-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOutlet} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Venue Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={outletNameEn}
                    onChange={(e) => setOutletNameEn(e.target.value)}
                    placeholder="e.g. Al Nakheel Restaurant"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">اسم المطعم / المقهى (بالعربية) *</label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={outletNameAr}
                    onChange={(e) => setOutletNameAr(e.target.value)}
                    placeholder="مثال: مطعم النخيل الراقي"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Venue Type</label>
                  <select
                    value={outletType}
                    onChange={(e) => setOutletType(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="restaurant">Restaurant (Fine / Casual Dining)</option>
                    <option value="cafe">Cafe & Specialty Coffee</option>
                    <option value="lobby_lounge">Lobby Lounge</option>
                    <option value="room_service">24/7 In-Room Dining</option>
                    <option value="pool_bar">Poolside Bar & Lounge</option>
                    <option value="shisha">Shisha Terrace</option>
                    <option value="banquet">Banquet & Catering</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Slug / Identifier</label>
                  <input
                    type="text"
                    value={outletSlug}
                    onChange={(e) => setOutletSlug(e.target.value.toLowerCase().trim())}
                    placeholder="al-nakheel-restaurant"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Operating Hours (EN)</label>
                  <input
                    type="text"
                    value={hoursEn}
                    onChange={(e) => setHoursEn(e.target.value)}
                    placeholder="07:00 AM - 11:30 PM"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">أوقات العمل (بالعربية)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={hoursAr}
                    onChange={(e) => setHoursAr(e.target.value)}
                    placeholder="07:00 ص - 11:30 م"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Floor Location (EN)</label>
                  <input
                    type="text"
                    value={locationEn}
                    onChange={(e) => setLocationEn(e.target.value)}
                    placeholder="Lobby Level"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Orders WhatsApp</label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+966500000000"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Hero Image URL (HTTPS)</label>
                <input
                  type="url"
                  value={heroImage}
                  onChange={(e) => setHeroImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white"
                />
                {heroImage.trim() && (
                  <div className="mt-2 w-32 h-16 bg-stone-950 rounded-lg overflow-hidden border border-stone-800">
                    <img
                      src={heroImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="outletActiveCheck"
                  checked={isOutletActive}
                  onChange={(e) => setIsOutletActive(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-stone-700 bg-stone-950 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="outletActiveCheck" className="text-xs text-stone-300 cursor-pointer">
                  <strong>Active & Discoverable in Dining Portal</strong>
                </label>
              </div>

              <div className="border-t border-stone-800 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOutletModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Saving...' : 'Save Venue'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-850">
              <h2 className="text-sm font-bold text-white">
                {editingCatId ? 'Edit Category' : 'Add Menu Category'}
              </h2>
              <button onClick={() => setIsCatModalOpen(false)} className="text-stone-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Category Name (EN) *</label>
                <input
                  type="text"
                  required
                  value={catNameEn}
                  onChange={(e) => setCatNameEn(e.target.value)}
                  placeholder="e.g. Appetizers / Main Courses / Desserts"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">اسم التصنيف (بالعربية) *</label>
                <input
                  type="text"
                  required
                  dir="rtl"
                  value={catNameAr}
                  onChange={(e) => setCatNameAr(e.target.value)}
                  placeholder="مثال: المقبلات / الأطباق الرئيسية / الحلويات"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white text-right"
                />
              </div>
              <div className="border-t border-stone-800 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 text-xs text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menu Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-850">
              <h2 className="text-sm font-bold text-white">
                {editingItemId ? 'Edit Menu Item' : 'Add New Dish / Drink'}
              </h2>
              <button onClick={() => setIsItemModalOpen(false)} className="text-stone-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Item Name (EN) *</label>
                  <input
                    type="text"
                    required
                    value={itemNameEn}
                    onChange={(e) => setItemNameEn(e.target.value)}
                    placeholder="e.g. Royal Wagyu Burger"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">اسم الصنف (بالعربية) *</label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={itemNameAr}
                    onChange={(e) => setItemNameAr(e.target.value)}
                    placeholder="مثال: برجر واغيو الملكي"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Price ({hotel.currency || 'SAR'}) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Calories (kcal)</label>
                  <input
                    type="number"
                    value={itemCalories || ''}
                    onChange={(e) => setItemCalories(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 520"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Description (EN)</label>
                <textarea
                  rows={2}
                  value={itemDescEn}
                  onChange={(e) => setItemDescEn(e.target.value)}
                  placeholder="Ingredients, preparation details..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">الوصف والمكونات (بالعربية)</label>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={itemDescAr}
                  onChange={(e) => setItemDescAr(e.target.value)}
                  placeholder="المكونات وطريقة التحضير..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Dish Image URL (HTTPS)</label>
                <input
                  type="url"
                  value={itemImage}
                  onChange={(e) => setItemImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="itemAvailCheck"
                  checked={itemAvailable}
                  onChange={(e) => setItemAvailable(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-stone-700 bg-stone-950"
                />
                <label htmlFor="itemAvailCheck" className="text-xs text-stone-300">
                  Available for Guest Ordering
                </label>
              </div>

              <div className="border-t border-stone-800 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 text-xs text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
