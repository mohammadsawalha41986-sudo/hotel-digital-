import React, { useState } from 'react';
import {
  Layers,
  Utensils,
  Sparkles,
  Shirt,
  BellRing,
  Tag,
  Eye,
  Edit2,
  CheckCircle2,
} from 'lucide-react';
import { Hotel, HotelOffer } from '../../types/hotel';
import {
  FBOutlet,
  WellnessService,
} from '../../types/department';
import {
  getHotelFBOutlets,
  getHotelWellnessServices,
} from '../../data/departmentData';
import { MOCK_OFFERS } from '../../data/mockHotels';
import { InRoomServiceItem, InRoomServiceCategory, InRoomServiceCategoryItem } from '../../types/inRoomServices';
import { INITIAL_IN_ROOM_SERVICES, INITIAL_IN_ROOM_CATEGORIES, DEFAULT_DEPARTMENT_WHATSAPP_CONFIG } from '../../data/inRoomServicesData';
import { ServiceIcon } from '../../utils/serviceIcons';
import {
  DEFAULT_LAUNDRY_CATEGORIES,
  DEFAULT_LAUNDRY_GARMENTS,
  DEFAULT_LAUNDRY_OFFERS,
} from '../../data/laundryHubData';
import { LaundryGarmentItem, LaundryOffer } from '../../types/laundry';

export type ContentSubTab = 'rooms' | 'fnb' | 'wellness' | 'laundry' | 'services' | 'offers';

interface HotelContentViewProps {
  hotel: Hotel;
  activeSubTab: ContentSubTab;
  onSelectSubTab: (tab: ContentSubTab) => void;
  onMarkUnpublishedChanges: () => void;
}

export const HotelContentView: React.FC<HotelContentViewProps> = ({
  hotel,
  activeSubTab,
  onSelectSubTab,
  onMarkUnpublishedChanges,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [inRoomCategories, setInRoomCategories] = useState<InRoomServiceCategoryItem[]>(INITIAL_IN_ROOM_CATEGORIES);
  const [inRoomServices, setInRoomServices] = useState<InRoomServiceItem[]>(INITIAL_IN_ROOM_SERVICES);
  const [selectedCategory, setSelectedCategory] = useState<InRoomServiceCategory | 'all'>('all');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [tempWhatsApp, setTempWhatsApp] = useState('');
  const [tempSla, setTempSla] = useState(15);

  // Valet Laundry Data-Driven Administration State
  const [adminLaundryGarments, setAdminLaundryGarments] = useState<LaundryGarmentItem[]>(DEFAULT_LAUNDRY_GARMENTS);
  const [adminLaundryOffers, setAdminLaundryOffers] = useState<LaundryOffer[]>(DEFAULT_LAUNDRY_OFFERS);
  const [laundryCatFilter, setLaundryCatFilter] = useState<string>('all');
  const [editingLaundryItemId, setEditingLaundryItemId] = useState<string | null>(null);
  const [editPrices, setEditPrices] = useState<{ wash: number; press: number; wash_press: number; dry_clean: number; express_surcharge: number }>({
    wash: 0,
    press: 0,
    wash_press: 0,
    dry_clean: 0,
    express_surcharge: 0,
  });
  const [valetWhatsAppNumber, setValetWhatsAppNumber] = useState<string>('+966539201105');

  const offers: HotelOffer[] = hotel.offers && hotel.offers.length > 0 ? hotel.offers : MOCK_OFFERS;
  const fnbOutlets: FBOutlet[] = getHotelFBOutlets(hotel.id);
  const wellnessServices: WellnessService[] = getHotelWellnessServices(hotel.id);

  const notifyChange = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
    onMarkUnpublishedChanges();
  };

  const handleToggleCategoryActive = (id: string) => {
    setInRoomCategories((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextState = !c.active;
          notifyChange(`Category "${c.nameEn}" is now ${nextState ? 'active' : 'hidden'}`);
          return { ...c, active: nextState };
        }
        return c;
      })
    );
  };

  const handleToggleServiceActive = (id: string) => {
    setInRoomServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextState = !s.active;
          notifyChange(`${s.nameEn} is now ${nextState ? 'active' : 'disabled'}`);
          return { ...s, active: nextState };
        }
        return s;
      })
    );
  };

  const handleSaveServiceEdit = (id: string) => {
    setInRoomServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          notifyChange(`Updated routing for ${s.nameEn}`);
          return {
            ...s,
            whatsappNumber: tempWhatsApp.trim() || undefined,
            slaMinutes: Number(tempSla) || 15,
          };
        }
        return s;
      })
    );
    setEditingServiceId(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 end-6 z-50 bg-stone-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="text-amber-400" size={20} />
            <span>Hotel Catalogs & Service Content Manager</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Manage rooms showcase, culinary menus, spa treatments, valet laundry pricing, and housekeeping items.
          </p>
        </div>
      </div>

      {/* Department Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'rooms', label: 'In-Room Services', icon: Layers },
          { id: 'fnb', label: 'Food & Beverage', icon: Utensils },
          { id: 'wellness', label: 'Wellness & Spa', icon: Sparkles },
          { id: 'laundry', label: 'Valet Laundry', icon: Shirt },
          { id: 'services', label: 'Guest Services', icon: BellRing },
          { id: 'offers', label: 'Offers & Packages', icon: Tag },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectSubTab(tab.id as ContentSubTab)}
              className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-stone-850 hover:bg-stone-800 text-stone-300'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-VIEW 1: IN-ROOM SERVICES HUB */}
      {activeSubTab === 'rooms' && (
        <div className="space-y-4">
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-stone-800 bg-stone-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-white uppercase tracking-wider block">
                  In-Room Services Catalog ({inRoomServices.length} Services)
                </span>
                <span className="text-stone-400 text-[11px]">
                  Configurable guest service catalog with custom department WhatsApp routing
                </span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'housekeeping', label: 'Housekeeping' },
                  { id: 'room_comfort', label: 'Comfort' },
                  { id: 'front_office', label: 'Front Office' },
                  { id: 'maintenance', label: 'Maintenance' },
                  { id: 'room_service', label: 'Dining' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as InRoomServiceCategory | 'all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-750'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-stone-800/80">
              {inRoomServices
                .filter((s) => selectedCategory === 'all' || s.category === selectedCategory)
                .map((service) => {
                  const isEditing = editingServiceId === service.id;
                  const defaultDeptWhatsApp =
                    DEFAULT_DEPARTMENT_WHATSAPP_CONFIG[
                      service.category === 'maintenance'
                        ? 'maintenanceWhatsApp'
                        : service.category === 'room_service'
                        ? 'roomServiceWhatsApp'
                        : service.category === 'front_office'
                        ? 'frontOfficeWhatsApp'
                        : 'housekeepingWhatsApp'
                    ];
                  const currentNumber = service.whatsappNumber || defaultDeptWhatsApp;

                  return (
                    <div
                      key={service.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-850/40 transition-colors text-xs"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400 font-bold shrink-0 mt-0.5">
                          {service.nameEn.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white text-xs">{service.nameEn}</h3>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-stone-800 text-amber-400 border border-stone-700">
                              {service.category.replace('_', ' ')}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                service.active
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                  : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                              }`}
                            >
                              {service.active ? 'ACTIVE' : 'DISABLED'}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-400 mt-0.5" dir="rtl">
                            {service.nameAr}
                          </div>
                          <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">
                            {service.descriptionEn}
                          </p>

                          {/* Inline Edit Form */}
                          {isEditing ? (
                            <div className="mt-3 p-3 bg-stone-800/80 rounded-xl border border-stone-700 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] text-stone-400 font-semibold mb-1">
                                    Override WhatsApp Number (leave blank for department default):
                                  </label>
                                  <input
                                    type="text"
                                    value={tempWhatsApp}
                                    onChange={(e) => setTempWhatsApp(e.target.value)}
                                    placeholder={defaultDeptWhatsApp}
                                    className="w-full h-8 px-2.5 bg-stone-900 rounded-lg border border-stone-700 text-white font-mono text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-stone-400 font-semibold mb-1">
                                    Estimated SLA (Minutes):
                                  </label>
                                  <input
                                    type="number"
                                    value={tempSla}
                                    onChange={(e) => setTempSla(Number(e.target.value))}
                                    className="w-full h-8 px-2.5 bg-stone-900 rounded-lg border border-stone-700 text-white font-mono text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveServiceEdit(service.id)}
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs cursor-pointer"
                                >
                                  Save Configuration
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingServiceId(null)}
                                  className="px-3 py-1 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg text-xs cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-stone-400">
                              <span>
                                Target Line: <strong className="text-stone-300 font-mono">{currentNumber}</strong>
                                {service.whatsappNumber && ' (Custom Override)'}
                              </span>
                              <span>•</span>
                              <span>
                                Response SLA: <strong className="text-amber-300 font-mono">~{service.slaMinutes || 15} mins</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingServiceId(service.id);
                            setTempWhatsApp(service.whatsappNumber || '');
                            setTempSla(service.slaMinutes || 15);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit2 size={12} />
                          <span>Configure</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleServiceActive(service.id)}
                          className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                            service.active
                              ? 'bg-stone-800 text-emerald-400 hover:bg-stone-750'
                              : 'bg-stone-800 text-rose-400 hover:bg-stone-750'
                          }`}
                        >
                          <Eye size={12} />
                          <span>{service.active ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: FOOD & BEVERAGE */}
      {activeSubTab === 'fnb' && (
        <div className="space-y-4">
          {fnbOutlets.map((outlet) => {
            const allItems = outlet.menu_categories?.flatMap((c) => c.items || []) || [];
            return (
              <div
                key={outlet.id}
                className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden"
              >
                <div className="p-4 border-b border-stone-800 bg-stone-850 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-xs flex items-center gap-2">
                      <Utensils size={14} className="text-amber-400" />
                      <span>{outlet.name_en}</span>
                      <span className="text-[9px] bg-stone-800 text-amber-300 px-2 py-0.5 rounded-full uppercase font-mono">
                        {outlet.outlet_type}
                      </span>
                    </h3>
                    <div className="text-[11px] text-stone-400 mt-0.5" dir="rtl">{outlet.name_ar}</div>
                  </div>

                  <div className="text-end text-[11px] text-stone-400">
                    <span>Menu: {allItems.length} items</span>
                  </div>
                </div>

                <div className="divide-y divide-stone-800/80">
                  {allItems.slice(0, 8).map((dish) => (
                    <div
                      key={dish.id}
                      className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-stone-850/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {dish.image && (
                          <img
                            src={dish.image}
                            alt=""
                            className="w-12 h-12 object-cover rounded-xl border border-stone-800 shrink-0"
                          />
                        )}
                        <div>
                          <div className="font-semibold text-white">{dish.name_en}</div>
                          <div className="text-[10px] text-stone-400" dir="rtl">{dish.name_ar}</div>
                          <div className="text-[10px] text-stone-500 mt-0.5 capitalize">
                            Code: {dish.item_code}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          SAR {dish.price}
                        </span>
                        <button
                          onClick={() => notifyChange(`Toggled availability for ${dish.name_en}`)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-emerald-400 cursor-pointer"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUB-VIEW 3: WELLNESS & SPA */}
      {activeSubTab === 'wellness' && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-stone-800 bg-stone-850 text-xs font-bold text-white uppercase tracking-wider">
            Spa & Hammam Treatments ({wellnessServices.length} Services)
          </div>
          <div className="divide-y divide-stone-800/80">
            {wellnessServices.map((svc) => (
              <div
                key={svc.id}
                className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-stone-850/40 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-white">{svc.name_en}</h3>
                  <div className="text-[11px] text-stone-400" dir="rtl">{svc.name_ar}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    Duration: {svc.duration_minutes || 60} min • Capacity: {svc.capacity || 1} guests
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-end font-mono">
                    <span className="font-bold text-emerald-400 block">
                      SAR {svc.price}
                    </span>
                    <span className="text-[10px] text-stone-500">Per Guest</span>
                  </div>

                  <button
                    onClick={() => notifyChange(`Updated ${svc.name_en}`)}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 cursor-pointer"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: VALET LAUNDRY */}
      {activeSubTab === 'laundry' && (
        <div className="space-y-6">
          {/* A. GARMENT CATEGORIES OVERVIEW */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-stone-800 bg-stone-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Garment Categories ({DEFAULT_LAUNDRY_CATEGORIES.length} Categories)
                </span>
                <span className="text-[11px] text-stone-400">
                  Guest portal displays categories first. Click a category to filter garment pricing below.
                </span>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setLaundryCatFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    laundryCatFilter === 'all'
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-750'
                  }`}
                >
                  All ({adminLaundryGarments.length})
                </button>
                {DEFAULT_LAUNDRY_CATEGORIES.map((cat) => {
                  const count = adminLaundryGarments.filter((g) => g.category_id === cat.id).length;
                  const isSelected = laundryCatFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setLaundryCatFilter(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950 font-bold'
                          : 'bg-stone-800 text-stone-300 hover:bg-stone-750'
                      }`}
                    >
                      {cat.nameEn} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Cards */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {DEFAULT_LAUNDRY_CATEGORIES.map((cat) => {
                const count = adminLaundryGarments.filter((g) => g.category_id === cat.id && g.is_active).length;
                const isFiltered = laundryCatFilter === cat.id;

                return (
                  <div
                    key={cat.id}
                    onClick={() => setLaundryCatFilter(laundryCatFilter === cat.id ? 'all' : cat.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isFiltered
                        ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                        : 'bg-stone-850/60 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="space-y-0.5 truncate">
                      <div className="font-bold text-xs text-white truncate">{cat.nameEn}</div>
                      <div className="text-[10px] text-stone-400 truncate" dir="rtl">{cat.nameAr}</div>
                      <div className="text-[10px] text-emerald-400 font-mono">
                        {count} active garments
                      </div>
                    </div>
                    <span className="text-stone-500 text-xs font-mono">→</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* B. FEATURED LAUNDRY OFFERS MANAGER */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-stone-800 bg-stone-850 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Featured Laundry Offers ({adminLaundryOffers.length} Promoted Packages)
                </span>
                <span className="text-[11px] text-stone-400">
                  Displayed in guest slider below the Laundry Hero. Toggle packages active/disabled.
                </span>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {adminLaundryOffers.map((off) => (
                <div
                  key={off.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                    off.active
                      ? 'bg-stone-850/80 border-stone-700 text-white'
                      : 'bg-stone-900/40 border-stone-800/40 text-stone-500 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                        {off.badgeEn}
                      </span>
                      <button
                        onClick={() => {
                          setAdminLaundryOffers((prev) =>
                            prev.map((o) => (o.id === off.id ? { ...o, active: !o.active } : o))
                          );
                          notifyChange(`Toggled offer "${off.titleEn}"`);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                          off.active
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                            : 'bg-stone-800 text-stone-400 border border-stone-700 hover:bg-stone-750'
                        }`}
                      >
                        {off.active ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </div>

                    <h4 className="font-bold text-xs text-white line-clamp-1">{off.titleEn}</h4>
                    <p className="text-[11px] text-stone-400 line-clamp-2">{off.descriptionEn}</p>
                  </div>

                  <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
                    <span className="font-mono text-emerald-400 font-bold">
                      {off.price ? `SAR ${off.price}` : off.validityEn}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {off.packageItems ? `${off.packageItems.length} items bundled` : 'Turnaround Offer'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* C. GARMENT ITEMS & 4-SERVICE PRICE MATRIX */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-stone-800 bg-stone-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Garment Catalog & 4-Service Pricing Matrix
                </span>
                <span className="text-[11px] text-stone-400">
                  Each garment supports distinct prices for Wash, Press, Wash & Press, Dry Clean, plus Express surcharge.
                </span>
              </div>
              <span className="text-[11px] text-stone-400 font-mono">
                Showing {adminLaundryGarments.filter((g) => laundryCatFilter === 'all' || g.category_id === laundryCatFilter).length} garments
              </span>
            </div>

            <div className="divide-y divide-stone-800/80">
              {adminLaundryGarments
                .filter((g) => laundryCatFilter === 'all' || g.category_id === laundryCatFilter)
                .map((item) => {
                  const isEditing = editingLaundryItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 transition-colors ${
                        item.is_active ? 'hover:bg-stone-850/40' : 'opacity-60 bg-stone-950/40'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Garment Details */}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-xs sm:text-sm">{item.name_en}</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-mono">
                              {item.item_code}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-400" dir="rtl">{item.name_ar}</div>
                          <div className="text-[10px] text-stone-500 capitalize">
                            Category: {item.category_en} · Express 4-Hour: {item.express_eligible !== false ? 'Eligible' : 'Standard Only'}
                          </div>
                        </div>

                        {/* 4-Service Price Matrix or Inline Editor */}
                        {isEditing ? (
                          <div className="flex flex-wrap items-center gap-3 bg-stone-950 p-3 rounded-xl border border-stone-700">
                            <div>
                              <span className="text-[9px] text-stone-400 uppercase block">Wash</span>
                              <input
                                type="number"
                                value={editPrices.wash}
                                onChange={(e) => setEditPrices({ ...editPrices, wash: Number(e.target.value) })}
                                className="w-14 bg-stone-800 border border-stone-700 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] text-stone-400 uppercase block">Press</span>
                              <input
                                type="number"
                                value={editPrices.press}
                                onChange={(e) => setEditPrices({ ...editPrices, press: Number(e.target.value) })}
                                className="w-14 bg-stone-800 border border-stone-700 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] text-stone-400 uppercase block">Wash & Press</span>
                              <input
                                type="number"
                                value={editPrices.wash_press}
                                onChange={(e) => setEditPrices({ ...editPrices, wash_press: Number(e.target.value) })}
                                className="w-16 bg-stone-800 border border-stone-700 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] text-stone-400 uppercase block">Dry Clean</span>
                              <input
                                type="number"
                                value={editPrices.dry_clean}
                                onChange={(e) => setEditPrices({ ...editPrices, dry_clean: Number(e.target.value) })}
                                className="w-14 bg-stone-800 border border-stone-700 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 pt-3">
                              <button
                                onClick={() => {
                                  setAdminLaundryGarments((prev) =>
                                    prev.map((g) =>
                                      g.id === item.id
                                        ? {
                                            ...g,
                                            prices: {
                                              ...g.prices,
                                              wash: editPrices.wash,
                                              press: editPrices.press,
                                              wash_press: editPrices.wash_press,
                                              dry_clean: editPrices.dry_clean,
                                            },
                                          }
                                        : g
                                    )
                                  );
                                  setEditingLaundryItemId(null);
                                  notifyChange(`Updated pricing for ${item.name_en}`);
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingLaundryItemId(null)}
                                className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono">
                            <div className="text-center px-2 py-1 bg-stone-950 rounded-lg border border-stone-800">
                              <span className="text-stone-400 block text-[9px] uppercase">Wash</span>
                              <span className="text-emerald-400 font-bold">SAR {item.prices.wash}</span>
                            </div>

                            <div className="text-center px-2 py-1 bg-stone-950 rounded-lg border border-stone-800">
                              <span className="text-stone-400 block text-[9px] uppercase">Press</span>
                              <span className="text-emerald-400 font-bold">SAR {item.prices.press}</span>
                            </div>

                            <div className="text-center px-2 py-1 bg-stone-950 rounded-lg border border-stone-800">
                              <span className="text-stone-400 block text-[9px] uppercase">Wash & Press</span>
                              <span className="text-emerald-400 font-bold">SAR {item.prices.wash_press}</span>
                            </div>

                            <div className="text-center px-2 py-1 bg-stone-950 rounded-lg border border-stone-800">
                              <span className="text-stone-400 block text-[9px] uppercase">Dry Clean</span>
                              <span className="text-emerald-400 font-bold">SAR {item.prices.dry_clean}</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingLaundryItemId(item.id);
                                  setEditPrices({
                                    wash: item.prices.wash,
                                    press: item.prices.press,
                                    wash_press: item.prices.wash_press,
                                    dry_clean: item.prices.dry_clean,
                                    express_surcharge: item.prices.express_surcharge || 10,
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white transition-colors"
                                title="Edit Prices"
                              >
                                <Edit2 size={13} />
                              </button>

                              <button
                                onClick={() => {
                                  setAdminLaundryGarments((prev) =>
                                    prev.map((g) => (g.id === item.id ? { ...g, is_active: !g.is_active } : g))
                                  );
                                  notifyChange(`Garment "${item.name_en}" is now ${!item.is_active ? 'active' : 'hidden'}`);
                                }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                  item.is_active
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                                    : 'bg-stone-800 text-stone-400 border border-stone-700 hover:bg-stone-750'
                                }`}
                              >
                                {item.is_active ? 'ACTIVE' : 'HIDDEN'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* D. VALET DISPATCH & WHATSAPP CONFIG */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-white text-sm">Valet Laundry WhatsApp Routing</h3>
              <p className="text-xs text-stone-400">
                Direct mobile number for dispatching valet pickup notifications and special care tickets.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={valetWhatsAppNumber}
                onChange={(e) => setValetWhatsAppNumber(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
              />
              <button
                onClick={() => notifyChange(`Updated Valet WhatsApp to ${valetWhatsAppNumber}`)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: IN-ROOM SERVICE CATEGORIES & ITEMS */}
      {activeSubTab === 'services' && (
        <div className="space-y-6">
          {/* A. CATEGORY-FIRST ARCHITECTURE MANAGER */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-stone-800 bg-stone-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Service Categories ({inRoomCategories.length} Categories)
                </span>
                <span className="text-[11px] text-stone-400">
                  Guest portal displays active categories first. Disabling a category hides it from guests.
                </span>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {inRoomCategories.map((cat) => {
                const serviceCount = inRoomServices.filter(
                  (s) => (s.categoryId === cat.id || s.category === cat.id) && s.active
                ).length;

                return (
                  <div
                    key={cat.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      cat.active
                        ? 'bg-stone-800/80 border-stone-700/80 text-white'
                        : 'bg-stone-900/40 border-stone-800/40 text-stone-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <ServiceIcon name={cat.icon} size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">{cat.nameEn}</div>
                        <div className="text-[10px] text-stone-400 truncate" dir="rtl">{cat.nameAr}</div>
                        <div className="text-[10px] text-amber-400/80 font-medium mt-0.5">
                          {serviceCount} active services
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleCategoryActive(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                        cat.active
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900'
                          : 'bg-stone-800 text-stone-400 border border-stone-700 hover:bg-stone-750'
                      }`}
                    >
                      {cat.active ? 'ACTIVE' : 'HIDDEN'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* B. IN-ROOM SERVICES CATALOG WITH SLA & ROUTING */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-stone-800 bg-stone-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  In-Room Services Catalog ({inRoomServices.length} Services)
                </span>
                <span className="text-[11px] text-stone-400">
                  Configure active state, SLA response targets, and department WhatsApp routing.
                </span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-750'
                  }`}
                >
                  All
                </button>
                {inRoomCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                      selectedCategory === c.id
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-800 text-stone-400 hover:bg-stone-750'
                    }`}
                  >
                    {c.nameEn}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-stone-800/80">
              {inRoomServices
                .filter(
                  (s) =>
                    selectedCategory === 'all' ||
                    s.categoryId === selectedCategory ||
                    s.category === selectedCategory
                )
                .map((svc) => {
                  const isEditing = editingServiceId === svc.id;

                  return (
                    <div
                      key={svc.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-stone-850/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-stone-800 border border-stone-700/60 text-amber-400 flex items-center justify-center shrink-0">
                          <ServiceIcon name={svc.icon} size={17} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white">{svc.nameEn}</h3>
                            <span className="text-[10px] text-stone-400" dir="rtl">{svc.nameAr}</span>
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            Category: <span className="text-amber-300 capitalize">{svc.categoryId || svc.category}</span> • SLA: {svc.slaMinutes || 15} min
                            {svc.whatsappNumber && (
                              <span className="text-emerald-400 ml-2">Override: {svc.whatsappNumber}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleToggleServiceActive(svc.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                            svc.active
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900'
                              : 'bg-rose-950/70 text-rose-300 border border-rose-800/60 hover:bg-rose-900'
                          }`}
                        >
                          {svc.active ? 'ACTIVE' : 'DISABLED'}
                        </button>

                        <button
                          onClick={() => {
                            if (isEditing) {
                              handleSaveServiceEdit(svc.id);
                            } else {
                              setEditingServiceId(svc.id);
                              setTempWhatsApp(svc.whatsappNumber || '');
                              setTempSla(svc.slaMinutes || 15);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 cursor-pointer"
                          title="Edit routing & SLA"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>

                      {isEditing && (
                        <div className="w-full mt-2 pt-2 border-t border-stone-800 flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={tempWhatsApp}
                            onChange={(e) => setTempWhatsApp(e.target.value)}
                            placeholder="WhatsApp: +966..."
                            className="h-8 px-2.5 rounded bg-stone-900 border border-stone-700 text-white font-mono text-[11px]"
                          />
                          <input
                            type="number"
                            value={tempSla}
                            onChange={(e) => setTempSla(Number(e.target.value))}
                            placeholder="SLA min"
                            className="h-8 w-20 px-2 rounded bg-stone-900 border border-stone-700 text-white font-mono text-[11px]"
                          />
                          <button
                            onClick={() => handleSaveServiceEdit(svc.id)}
                            className="h-8 px-3 rounded bg-amber-500 text-stone-950 font-bold text-[10px] hover:bg-amber-400 cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingServiceId(null)}
                            className="h-8 px-2 rounded bg-stone-800 text-stone-400 text-[10px] hover:bg-stone-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: OFFERS & PACKAGES */}
      {activeSubTab === 'offers' && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-stone-800 bg-stone-850 text-xs font-bold text-white uppercase tracking-wider">
            Active Packages & Privileges ({offers.length} Offers)
          </div>
          <div className="divide-y divide-stone-800/80">
            {offers.map((offer) => {
              const discount =
                offer.original_price > offer.offer_price
                  ? Math.round(((offer.original_price - offer.offer_price) / offer.original_price) * 100)
                  : null;
              return (
                <div
                  key={offer.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:bg-stone-850/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{offer.title_en}</h3>
                      {discount && (
                        <span className="text-[9px] bg-amber-500 text-stone-950 font-bold px-1.5 py-0.5 rounded">
                          {discount}% OFF
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5" dir="rtl">{offer.title_ar}</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      Department: {offer.department} • Tag: {offer.badge_en || 'PROMO'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-end font-mono">
                      <span className="text-emerald-400 font-bold block">
                        SAR {offer.offer_price || offer.original_price}
                      </span>
                      <span className="text-[10px] text-stone-500">Valid: {offer.valid_until}</span>
                    </div>

                    <button
                      onClick={() => notifyChange(`Updated offer ${offer.title_en}`)}
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
