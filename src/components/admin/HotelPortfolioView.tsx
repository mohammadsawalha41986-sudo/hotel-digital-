import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  EyeOff,
  Star,
  CheckCircle2,
  MapPin,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { Hotel } from '../../types/hotel';
import { AdminUser } from '../../types/auth';
import { setHotelPublishStatus } from '../../services/hotelService';

interface HotelPortfolioViewProps {
  hotels: Hotel[];
  currentHotel: Hotel;
  currentUser?: AdminUser | null;
  onSelectHotel: (hotel: Hotel) => void;
  onOpenCreateWizard: () => void;
  onViewLivePortal: (hotel: Hotel) => void;
  onHotelUpdated?: (updated: Hotel) => void;
}

export const HotelPortfolioView: React.FC<HotelPortfolioViewProps> = ({
  hotels,
  currentHotel,
  currentUser,
  onSelectHotel,
  onOpenCreateWizard,
  onViewLivePortal,
  onHotelUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'UNPUBLISHED'>('ALL');
  const [updatingHotelId, setUpdatingHotelId] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const filteredHotels = hotels.filter((h) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      h.name_en.toLowerCase().includes(q) ||
      h.name_ar.toLowerCase().includes(q) ||
      h.city_en.toLowerCase().includes(q) ||
      h.city_ar.toLowerCase().includes(q) ||
      h.slug.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'PUBLISHED') return h.is_published === true;
    if (statusFilter === 'UNPUBLISHED') return h.is_published !== true;

    return true;
  });

  const handleTogglePublish = async (hotel: Hotel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSuperAdmin) return;

    const nextState = !hotel.is_published;
    setUpdatingHotelId(hotel.id);
    try {
      await setHotelPublishStatus(hotel.id, nextState);
      if (onHotelUpdated) {
        onHotelUpdated({ ...hotel, is_published: nextState });
      }
    } catch (err) {
      console.error('[HotelPortfolioView] Failed to toggle publication:', err);
    } finally {
      setUpdatingHotelId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-white tracking-wide">
                Hotel Portfolio & Property Governance
              </h2>
              <p className="text-xs text-stone-400">
                Multi-Property Management & Real-time Tenant Isolation Engine
              </p>
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <button
            onClick={onOpenCreateWizard}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Onboard New Property</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hotels by name, city, or slug..."
            className="w-full pl-10 pr-4 py-2 bg-stone-950/80 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-stone-400 shrink-0">Filter:</span>
          <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-amber-500 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              All ({hotels.length})
            </button>
            <button
              onClick={() => setStatusFilter('PUBLISHED')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'PUBLISHED'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Published
            </button>
            <button
              onClick={() => setStatusFilter('UNPUBLISHED')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'UNPUBLISHED'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Drafts
            </button>
          </div>
        </div>
      </div>

      {/* Hotel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredHotels.map((hotel) => {
          const isActive = currentHotel.id === hotel.id;

          return (
            <div
              key={hotel.id}
              onClick={() => onSelectHotel(hotel)}
              className={`group bg-stone-900/80 rounded-2xl border transition-all p-5 flex flex-col justify-between gap-4 cursor-pointer hover:shadow-xl ${
                isActive
                  ? 'border-amber-500 ring-1 ring-amber-500/30 shadow-amber-500/5'
                  : 'border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="space-y-3">
                {/* Top badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-stone-700">
                      {hotel.slug}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      <Star size={10} className="fill-amber-400" />
                      {hotel.classification_stars} Stars
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hotel.is_published ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Published
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <EyeOff size={10} /> Draft (Unpublished)
                      </span>
                    )}
                  </div>
                </div>

                {/* Hotel Names & City */}
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                    {hotel.name_en}
                  </h3>
                  <h4 className="text-xs text-stone-400 font-arabic line-clamp-1 mt-0.5">
                    {hotel.name_ar}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-stone-400 mt-2">
                    <MapPin size={12} className="text-stone-500" />
                    <span>
                      {hotel.city_en}, {hotel.country_en}
                    </span>
                  </div>
                </div>

                {/* Contact snippet */}
                <div className="pt-2 border-t border-stone-800/80 grid grid-cols-2 gap-2 text-[11px] text-stone-400">
                  {hotel.phone && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone size={11} className="text-stone-500 shrink-0" />
                      <span className="truncate">{hotel.phone}</span>
                    </div>
                  )}
                  {hotel.whatsapp_number && (
                    <div className="flex items-center gap-1.5 truncate">
                      <MessageSquare size={11} className="text-emerald-500 shrink-0" />
                      <span className="truncate">{hotel.whatsapp_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectHotel(hotel);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                    }`}
                  >
                    {isActive ? 'Active Workspace' : 'Switch Property'}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewLivePortal(hotel);
                    }}
                    className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer"
                    title="View Guest Portal"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>

                {isSuperAdmin && (
                  <button
                    onClick={(e) => handleTogglePublish(hotel, e)}
                    disabled={updatingHotelId === hotel.id}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                      hotel.is_published
                        ? 'bg-stone-800/80 border-stone-700 text-stone-400 hover:text-amber-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {updatingHotelId === hotel.id
                      ? '...'
                      : hotel.is_published
                      ? 'Unpublish'
                      : 'Publish Live'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredHotels.length === 0 && (
        <div className="bg-stone-900/40 border border-stone-800 rounded-2xl p-12 text-center text-stone-400 space-y-3">
          <Building2 size={36} className="mx-auto text-stone-600" />
          <h4 className="text-sm font-bold text-white">No properties found matching criteria</h4>
          <p className="text-xs text-stone-500">
            Try adjusting your search terms or filter selection.
          </p>
        </div>
      )}
    </div>
  );
};
