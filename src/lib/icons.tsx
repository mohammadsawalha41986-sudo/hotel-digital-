import {
  Accessibility, AlarmClock, Baby, BaggageClaim, Bath, BedDouble, BellOff, Briefcase, Building, Cake, CarFront, CarTaxiFront,
  Cigarette, CircleParking, Clock, Coffee, Compass, ConciergeBell, DoorOpen, Droplets, Dumbbell, Fan, Flower2, HandHeart, Heart,
  IceCreamCone, Info, Key, Lamp, Luggage, MapPin, MessageCircle, Moon, Package, Phone, Pill, Plane, Plug, Sandwich, Scroll,
  ShieldCheck, Shirt, ShowerHead, Siren, Snowflake, Soup, Sparkles, SprayCan, Star, Sun, Trash2, Tv, Utensils, UtensilsCrossed,
  Waves, Wifi, Wine, Wrench, Zap, type LucideIcon,
} from 'lucide-react';

/** Icon registry for admin-chosen icons (names match shared/fields ICONS). */
export const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles, 'bed-double': BedDouble, bath: Bath, shirt: Shirt, wrench: Wrench, snowflake: Snowflake, zap: Zap,
  droplets: Droplets, luggage: Luggage, phone: Phone, 'concierge-bell': ConciergeBell, utensils: Utensils, coffee: Coffee,
  wine: Wine, flower: Flower2, dumbbell: Dumbbell, waves: Waves, car: CarFront, plane: Plane, 'alarm-clock': AlarmClock,
  briefcase: Briefcase, accessibility: Accessibility, 'map-pin': MapPin, wifi: Wifi, shield: ShieldCheck, siren: Siren,
  'message-circle': MessageCircle, star: Star, heart: Heart, moon: Moon, sun: Sun, baby: Baby, key: Key, package: Package,
  pill: Pill, 'baggage-claim': BaggageClaim, 'bell-off': BellOff, 'shower-head': ShowerHead, lamp: Lamp, trash: Trash2,
  info: Info, clock: Clock, 'circle-parking': CircleParking, 'car-taxi-front': CarTaxiFront, building: Building,
  'utensils-crossed': UtensilsCrossed, cake: Cake, soup: Soup, sandwich: Sandwich, 'ice-cream': IceCreamCone,
  cigarette: Cigarette, 'hand-heart': HandHeart, 'spray-can': SprayCan, fan: Fan, tv: Tv, plug: Plug, 'door-open': DoorOpen,
  scroll: Scroll, compass: Compass,
};

export function Icon({ name, className, strokeWidth = 1.6 }: { name?: string | null; className?: string; strokeWidth?: number }) {
  const C = (name && ICON_MAP[name]) || Sparkles;
  return <C className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
