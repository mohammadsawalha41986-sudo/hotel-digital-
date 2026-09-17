import React from 'react';
import {
  Sparkles,
  Bed,
  BedDouble,
  Wrench,
  Hammer,
  Bell,
  BellRing,
  ConciergeBell,
  UtensilsCrossed,
  Utensils,
  Shirt,
  Package,
  Luggage,
  Snowflake,
  Tv,
  Wifi,
  AlarmClock,
  Clock,
  KeyRound,
  CreditCard,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Flame,
  Droplets,
  Baby,
  Zap,
  Coffee,
  Car,
  PhoneCall,
  Phone,
  Layers,
  HelpCircle,
  CheckCircle,
  Search,
  Compass,
  MapPin,
  Waves,
  Sun,
  Smile,
} from 'lucide-react';

export const SERVICE_ICON_MAP: Record<string, React.ElementType> = {
  // Categories
  Sparkles,
  Bed,
  BedDouble,
  Wrench,
  Hammer,
  Bell,
  BellRing,
  ConciergeBell,
  Utensils,
  UtensilsCrossed,
  Shirt,
  Package,
  Luggage,
  Compass,
  MapPin,

  // Services
  Snowflake,
  Tv,
  Wifi,
  AlarmClock,
  Clock,
  KeyRound,
  CreditCard,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Flame,
  Droplets,
  Baby,
  Zap,
  Coffee,
  Car,
  PhoneCall,
  Phone,
  Layers,
  Waves,
  Sun,
  Smile,
  HelpCircle,
  CheckCircle,
  Search,
};

interface ServiceIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const ServiceIcon: React.FC<ServiceIconProps> = ({
  name,
  className = 'w-5 h-5',
  size = 20,
}) => {
  const IconComponent = SERVICE_ICON_MAP[name] || Sparkles;
  return <IconComponent size={size} className={className} />;
};
