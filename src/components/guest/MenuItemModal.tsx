import React, { useState, useMemo } from 'react';
import { X, Plus, Minus, Check, Flame, Clock, AlertTriangle, ChefHat } from 'lucide-react';
import { MenuItem, OrderBasketItem, SelectedOptionDetail } from '../../types/department';
import { Language } from '../../types/hotel';

interface MenuItemModalProps {
  item: MenuItem;
  currency: string;
  language: Language;
  onClose: () => void;
  onAddToBasket: (basketItem: OrderBasketItem) => void;
}

export const MenuItemModal: React.FC<MenuItemModalProps> = ({
  item,
  currency,
  language,
  onClose,
  onAddToBasket,
}) => {
  const isAr = language === 'ar';
  const [quantity, setQuantity] = useState(1);
  const [specialNotes, setSpecialNotes] = useState('');

  // Initial options selection: pre-select default option for single-choice groups
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    if (item.option_groups) {
      for (const group of item.option_groups) {
        const defaultChoice = group.options.find((o) => o.is_default);
        if (defaultChoice) {
          initial[group.id] = [defaultChoice.id];
        } else if (group.type === 'single' && group.options.length > 0) {
          initial[group.id] = [group.options[0].id];
        } else {
          initial[group.id] = [];
        }
      }
    }
    return initial;
  });

  const handleToggleSingle = (groupId: string, choiceId: string) => {
    setSelectedChoices((prev) => ({
      ...prev,
      [groupId]: [choiceId],
    }));
  };

  const handleToggleMultiple = (groupId: string, choiceId: string) => {
    setSelectedChoices((prev) => {
      const current = prev[groupId] || [];
      if (current.includes(choiceId)) {
        return {
          ...prev,
          [groupId]: current.filter((id) => id !== choiceId),
        };
      } else {
        return {
          ...prev,
          [groupId]: [...current, choiceId],
        };
      }
    });
  };

  // Calculate unit price and option details
  const { unitPrice, optionDetails } = useMemo(() => {
    let base = item.offer_price ?? item.price;
    const details: SelectedOptionDetail[] = [];

    if (item.option_groups) {
      for (const group of item.option_groups) {
        const chosenIds = selectedChoices[group.id] || [];
        for (const choiceId of chosenIds) {
          const choice = group.options.find((c) => c.id === choiceId);
          if (choice) {
            base += choice.price_delta;
            details.push({
              group_id: group.id,
              group_title: isAr ? group.title_ar : group.title_en,
              choice_id: choice.id,
              choice_name: isAr ? choice.name_ar : choice.name_en,
              price_delta: choice.price_delta,
            });
          }
        }
      }
    }

    return { unitPrice: base, optionDetails: details };
  }, [item, selectedChoices, isAr]);

  const totalPrice = unitPrice * quantity;

  const handleConfirmAdd = () => {
    const basketItem: OrderBasketItem = {
      id: `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      menu_item_id: item.id,
      item_code: item.item_code,
      name_en: item.name_en,
      name_ar: item.name_ar,
      unit_price: unitPrice,
      quantity: quantity,
      selected_options: optionDetails,
      notes: specialNotes.trim() || undefined,
      total_price: totalPrice,
    };
    onAddToBasket(basketItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-stone-200"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header with image */}
        <div className="relative h-56 sm:h-64 bg-stone-100 overflow-hidden shrink-0">
          <img
            src={item.image}
            alt={isAr ? item.name_ar : item.name_en}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 end-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Floating Badges */}
          <div className="absolute bottom-4 start-4 end-4 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="bg-amber-600/90 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {item.item_code}
              </span>
              {item.is_chef_choice && (
                <span className="bg-stone-900/90 text-amber-300 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ChefHat size={12} />
                  <span>{isAr ? 'اختيار الشيف' : "Chef's Selection"}</span>
                </span>
              )}
              {item.is_vegetarian && (
                <span className="bg-emerald-600/90 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
                  {isAr ? 'نباتي' : 'Vegetarian'}
                </span>
              )}
              {item.is_spicy && (
                <span className="bg-rose-600/90 text-white text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Flame size={12} />
                  <span>{isAr ? 'حار' : 'Spicy'}</span>
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold font-serif leading-snug drop-shadow-sm">
              {isAr ? item.name_ar : item.name_en}
            </h3>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-stone-800">
          {/* Price & Meta */}
          <div className="flex items-baseline justify-between pb-3 border-b border-stone-100">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-900">
                  {item.offer_price ?? item.price} {currency}
                </span>
                {item.old_price && (
                  <span className="text-sm text-stone-400 line-through">
                    {item.old_price} {currency}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {isAr ? 'السعر يشمل ضريبة القيمة المضافة 15%' : 'Price includes 15% VAT'}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-stone-600">
              {item.calories && (
                <span className="flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-lg">
                  <Flame size={13} className="text-amber-600" />
                  <span>{item.calories} {isAr ? 'سعرة' : 'kcal'}</span>
                </span>
              )}
              {(item.preparation_time_en || item.preparation_time_ar) && (
                <span className="flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-lg">
                  <Clock size={13} className="text-stone-500" />
                  <span>{isAr ? item.preparation_time_ar : item.preparation_time_en}</span>
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-stone-600 text-sm leading-relaxed">
            {isAr ? item.description_ar : item.description_en}
          </p>

          {/* Allergens Notice */}
          {item.allergens && item.allergens.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200/70 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle size={15} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{isAr ? 'تنبيه مسببات الحساسية: ' : 'Allergen Advisory: '}</span>
                <span>{item.allergens.join(', ')}</span>
              </div>
            </div>
          )}

          {/* Option Groups (Variants & Add-ons) */}
          {item.option_groups && item.option_groups.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-stone-100">
              {item.option_groups.map((group) => {
                const isSingle = group.type === 'single';
                const chosen = selectedChoices[group.id] || [];

                return (
                  <div key={group.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-stone-900">
                        {isAr ? group.title_ar : group.title_en}
                      </span>
                      <span className="text-[11px] text-stone-500 font-medium">
                        {group.is_required
                          ? isAr ? 'إلزامي' : 'Required'
                          : isAr ? 'اختياري' : 'Optional'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.options.map((choice) => {
                        const isSelected = chosen.includes(choice.id);

                        return (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() =>
                              isSingle
                                ? handleToggleSingle(group.id, choice.id)
                                : handleToggleMultiple(group.id, choice.id)
                            }
                            className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer text-start ${
                              isSelected
                                ? 'border-amber-600 bg-amber-50/80 text-amber-950 ring-1 ring-amber-600/30'
                                : 'border-stone-200 hover:border-stone-300 bg-stone-50/60 text-stone-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded-${isSingle ? 'full' : 'md'} flex items-center justify-center border ${
                                  isSelected
                                    ? 'bg-amber-600 border-amber-600 text-white'
                                    : 'border-stone-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check size={11} strokeWidth={3} />}
                              </div>
                              <span>{isAr ? choice.name_ar : choice.name_en}</span>
                            </div>
                            {choice.price_delta > 0 && (
                              <span className="text-amber-800 font-semibold shrink-0">
                                +{choice.price_delta} {currency}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Special Requests / Notes */}
          <div className="space-y-1.5 pt-2 border-t border-stone-100">
            <label className="text-xs font-semibold text-stone-700">
              {isAr ? 'ملاحظات خاصة بالمطبخ أو تحضير الوجبة' : 'Special Kitchen Instructions or Dietary Notes'}
            </label>
            <textarea
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder={
                isAr
                  ? 'مثال: بدون بصل، الصوص جانبي، تغليف إضافي...'
                  : 'E.g., Sauce on the side, extra crispy, allergy notice...'
              }
              rows={2}
              className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-stone-50/50 resize-none"
            />
          </div>
        </div>

        {/* Footer with Quantity & Add Button */}
        <div className="p-4 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between gap-3 shrink-0">
          {/* Quantity Selector */}
          <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center font-bold text-sm text-stone-900">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add to Basket CTA */}
          <button
            onClick={handleConfirmAdd}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-between shadow-md shadow-amber-900/10 transition-all cursor-pointer"
          >
            <span>{isAr ? 'إضافة إلى سلة الطلبات' : 'Add to Order Basket'}</span>
            <span className="font-bold bg-amber-700/50 px-2.5 py-1 rounded-lg">
              {totalPrice} {currency}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
