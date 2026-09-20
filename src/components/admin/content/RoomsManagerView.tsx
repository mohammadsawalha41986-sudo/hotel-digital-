import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
  Bed,
  Maximize2,
} from 'lucide-react';
import { Hotel, RoomType } from '../../../types/hotel';
import { AdminUser, canEditHotelContent } from '../../../types/auth';
import { getRooms, saveRoom, deleteRoom } from '../../../services/hotelService';

interface RoomsManagerViewProps {
  hotel: Hotel;
  currentUser?: AdminUser | null;
  onMarkUnpublishedChanges?: () => void;
}

export const RoomsManagerView: React.FC<RoomsManagerViewProps> = ({
  hotel,
  currentUser,
  onMarkUnpublishedChanges,
}) => {
  const hasEditPermission = canEditHotelContent(currentUser || null, hotel.id);

  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [slug, setSlug] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [sizeSqm, setSizeSqm] = useState(45);
  const [bedTypeEn, setBedTypeEn] = useState('King Bed');
  const [bedTypeAr, setBedTypeAr] = useState('سرير كينج');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(1);
  const [maxGuests, setMaxGuests] = useState(3);
  const [viewEn, setViewEn] = useState('City Skyline View');
  const [viewAr, setViewAr] = useState('إطلالة على أفق المدينة');
  const [imageUrl, setImageUrl] = useState('');
  const [galleryInput, setGalleryInput] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [basePrice, setBasePrice] = useState(0);

  const loadRooms = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getRooms(hotel.id);
      setRooms(data);
    } catch (err: any) {
      console.error('[RoomsManagerView] Failed to fetch rooms:', err);
      setErrorMessage('Failed to load rooms from Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [hotel.id]);

  const notifySuccess = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
    onMarkUnpublishedChanges?.();
  };

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setNameEn('');
    setNameAr('');
    setSlug(`room-${Date.now()}`);
    setDescEn('');
    setDescAr('');
    setSizeSqm(50);
    setBedTypeEn('King Size Bed');
    setBedTypeAr('سرير كينج ملكي');
    setAdults(2);
    setChildren(1);
    setMaxGuests(3);
    setViewEn('City View');
    setViewAr('إطلالة على المدينة');
    setImageUrl('');
    setGalleryInput('');
    setIsActive(true);
    setBasePrice(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: RoomType) => {
    setEditingRoom(room);
    setNameEn(room.name_en || '');
    setNameAr(room.name_ar || '');
    setSlug(room.slug || room.id);
    setDescEn(room.description_en || '');
    setDescAr(room.description_ar || '');
    setSizeSqm(room.size_sqm || 50);
    setBedTypeEn(room.bed_type_en || 'King Bed');
    setBedTypeAr(room.bed_type_ar || 'سرير كينج');
    setAdults(room.occupancy?.adults || 2);
    setChildren(room.occupancy?.children || 0);
    setMaxGuests(room.occupancy?.max_guests || 2);
    setViewEn(room.view_en || '');
    setViewAr(room.view_ar || '');
    setImageUrl(room.images?.[0] || '');
    setGalleryInput(room.images?.slice(1).join('\n') || '');
    setIsActive(room.available_count === undefined || room.available_count > 0);
    setBasePrice(room.base_price || 0);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEditPermission) return;
    if (!nameEn.trim() || !nameAr.trim()) {
      setErrorMessage('Both English and Arabic room names are required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const roomId = editingRoom ? editingRoom.id : (slug.trim() || `room-${Date.now()}`);
    const gallery = galleryInput
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const images = imageUrl.trim() ? [imageUrl.trim(), ...gallery] : gallery;

    const payload: RoomType = {
      id: roomId,
      hotel_id: hotel.id,
      slug: slug.trim() || roomId,
      name_en: nameEn.trim(),
      name_ar: nameAr.trim(),
      category_en: 'Standard',
      category_ar: 'قياسي',
      description_en: descEn.trim(),
      description_ar: descAr.trim(),
      size_sqm: Number(sizeSqm) || 0,
      bed_type_en: bedTypeEn.trim(),
      bed_type_ar: bedTypeAr.trim(),
      occupancy: {
        adults: Number(adults) || 1,
        children: Number(children) || 0,
        max_guests: Number(maxGuests) || 2,
      },
      view_en: viewEn.trim(),
      view_ar: viewAr.trim(),
      smoking_policy_en: 'Non-smoking',
      smoking_policy_ar: 'غير مسموح بالتدخين',
      breakfast_included: false,
      breakfast_info_en: '',
      breakfast_info_ar: '',
      base_price: Number(basePrice) || 0,
      currency: hotel.currency || 'SAR',
      images,
      amenities: editingRoom?.amenities || [],
      features_en: [],
      features_ar: [],
      available_count: isActive ? 1 : 0,
    };

    try {
      await saveRoom(hotel.id, payload);
      notifySuccess(`Room "${payload.name_en}" saved to Firestore.`);
      setIsModalOpen(false);
      await loadRooms();
    } catch (err: any) {
      console.error('[RoomsManagerView] Save failed:', err);
      setErrorMessage(err.message || 'Failed to save room to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (roomId: string, name: string) => {
    if (!hasEditPermission) return;
    if (!window.confirm(`Are you sure you want to delete room type "${name}"?`)) return;

    try {
      await deleteRoom(hotel.id, roomId);
      notifySuccess(`Room type "${name}" deleted.`);
      await loadRooms();
    } catch (err: any) {
      console.error('[RoomsManagerView] Delete failed:', err);
      setErrorMessage('Failed to delete room.');
    }
  };

  const handleToggleActive = async (room: RoomType) => {
    if (!hasEditPermission) return;
    const isCurrentlyActive = (room.available_count === undefined || room.available_count > 0);
    const updated: RoomType = {
      ...room,
      available_count: isCurrentlyActive ? 0 : 1,
    };
    try {
      await saveRoom(hotel.id, updated);
      notifySuccess(`Room "${room.name_en}" is now ${isCurrentlyActive ? 'Hidden' : 'Active'}.`);
      await loadRooms();
    } catch (err) {
      console.error('[RoomsManagerView] Toggle failed:', err);
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
              /hotels/{hotel.id}/rooms
            </span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="text-amber-400" size={22} />
            <span>Rooms & Suites Catalog</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Manage room types, configurations, amenities, and gallery showcases for {hotel.name_en}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadRooms}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
            title="Refresh rooms from Firestore"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-amber-400' : ''} />
          </button>

          {hasEditPermission && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Room Type</span>
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
          Loading room types from Firestore...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && rooms.length === 0 && (
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-12 text-center text-stone-400 space-y-3">
          <Layers size={40} className="mx-auto text-stone-600" />
          <h3 className="text-base font-bold text-white">No room types configured yet</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            This property currently has zero room types in Firestore (<code>/hotels/{hotel.id}/rooms</code>). Click below to create the first room type.
          </p>
          {hasEditPermission && (
            <button
              onClick={handleOpenAdd}
              className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Plus size={15} />
              <span>Add First Room Type</span>
            </button>
          )}
        </div>
      )}

      {/* Room Types Grid */}
      {!isLoading && rooms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => {
            const isRoomActive = (room.available_count === undefined || room.available_count > 0);
            return (
              <div
                key={room.id}
                className={`bg-stone-900 border ${
                  isRoomActive ? 'border-stone-800' : 'border-stone-800/50 opacity-70'
                } rounded-2xl overflow-hidden shadow-lg flex flex-col`}
              >
                {/* Image Showcase */}
                <div className="relative h-44 bg-stone-950 overflow-hidden">
                  {room.images?.[0] ? (
                    <img
                      src={room.images[0]}
                      alt={room.name_en}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-stone-600">
                      <ImageIcon size={32} />
                      <span className="text-[11px] mt-1">No image provided</span>
                    </div>
                  )}

                  {/* Active / Hidden Badge */}
                  <span
                    className={`absolute top-3 end-3 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isRoomActive
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-stone-800/80 text-stone-400 border-stone-700'
                    }`}
                  >
                    {isRoomActive ? 'Active' : 'Hidden'}
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">{room.name_en}</h3>
                    </div>
                    <p className="text-xs text-stone-400 font-serif" dir="rtl">
                      {room.name_ar}
                    </p>

                    <div className="flex flex-wrap gap-2 text-[11px] text-stone-400 mt-2.5">
                      <span className="flex items-center gap-1 bg-stone-800/80 px-2 py-0.5 rounded">
                        <Maximize2 size={11} className="text-amber-400" />
                        {room.size_sqm} m²
                      </span>
                      <span className="flex items-center gap-1 bg-stone-800/80 px-2 py-0.5 rounded">
                        <Bed size={11} className="text-amber-400" />
                        {room.bed_type_en}
                      </span>
                      <span className="flex items-center gap-1 bg-stone-800/80 px-2 py-0.5 rounded">
                        <Users size={11} className="text-amber-400" />
                        {room.occupancy?.max_guests || 2} Guests
                      </span>
                    </div>

                    {room.description_en && (
                      <p className="text-xs text-stone-400 line-clamp-2 mt-2 leading-relaxed">
                        {room.description_en}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {hasEditPermission && (
                    <div className="border-t border-stone-800 pt-3 flex items-center justify-between">
                      <button
                        onClick={() => handleToggleActive(room)}
                        className="text-xs text-stone-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
                        title="Toggle visibility"
                      >
                        {isRoomActive ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{isRoomActive ? 'Hide' : 'Unhide'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(room)}
                          className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(room.id, room.name_en)}
                          className="p-1 text-stone-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete room"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-850">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers size={16} className="text-amber-400" />
                <span>{editingRoom ? `Edit: ${editingRoom.name_en}` : 'Add New Room Type'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Room Name (English) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Royal Deluxe Suite"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">
                    اسم الغرفة / الجناح (بالعربية) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: جناح ديلوكس الملكي"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Slug / Unique ID
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
                    placeholder="royal-deluxe-suite"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Room Size (Square Meters)
                  </label>
                  <input
                    type="number"
                    value={sizeSqm}
                    onChange={(e) => setSizeSqm(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Bed Configuration (EN)</label>
                  <input
                    type="text"
                    value={bedTypeEn}
                    onChange={(e) => setBedTypeEn(e.target.value)}
                    placeholder="King Bed"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">نوع السرير (بالعربية)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={bedTypeAr}
                    onChange={(e) => setBedTypeAr(e.target.value)}
                    placeholder="سرير كينج ملكي"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-right"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Adults</label>
                    <input
                      type="number"
                      min={1}
                      value={adults}
                      onChange={(e) => setAdults(Number(e.target.value))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Children</label>
                    <input
                      type="number"
                      min={0}
                      value={children}
                      onChange={(e) => setChildren(Number(e.target.value))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Max Guests</label>
                    <input
                      type="number"
                      min={1}
                      value={maxGuests}
                      onChange={(e) => setMaxGuests(Number(e.target.value))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Window / Balcony View</label>
                  <input
                    type="text"
                    value={viewEn}
                    onChange={(e) => setViewEn(e.target.value)}
                    placeholder="e.g. City View / Garden View"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Description (English)</label>
                <textarea
                  rows={2}
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  placeholder="Detailed English description of this room type..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 text-right" dir="rtl">الوصف (بالعربية)</label>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={descAr}
                  onChange={(e) => setDescAr(e.target.value)}
                  placeholder="وصف تفصيلي للغرفة أو الجناح..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white text-right"
                />
              </div>

              {/* Main Image URL & Preview */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Primary Showcase Image URL (HTTPS)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white"
                />
                {imageUrl.trim() && (
                  <div className="mt-2 w-32 h-20 bg-stone-950 rounded-lg overflow-hidden border border-stone-800">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Additional Gallery URLs */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Additional Gallery Image URLs (One URL per line)
                </label>
                <textarea
                  rows={2}
                  value={galleryInput}
                  onChange={(e) => setGalleryInput(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-1...&#10;https://images.unsplash.com/photo-2..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="roomActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-stone-700 bg-stone-950 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="roomActiveCheck" className="text-xs text-stone-300 cursor-pointer">
                  <strong>Active & Visible in Guest Hub Portal</strong>
                </label>
              </div>

              <div className="border-t border-stone-800 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Saving...' : 'Save to Firestore'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
