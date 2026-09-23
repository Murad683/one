import {
  BarChart,
  Camera,
  Globe,
  Heart,
  Mail,
  Megaphone,
  MessageSquare,
  Palette,
  Phone,
  Search,
  Settings,
  Shield,
  Star,
  User,
  Video,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

// Mirrors admin/src/pages/ServicesPage.tsx's iconMap so an `iconName` picked
// there resolves to the same icon here — kept as a separate copy since the
// admin app and frontend app don't share a package.
const iconMap: Record<string, LucideIcon> = {
  Megaphone,
  Video,
  Globe,
  Palette,
  BarChart,
  Camera,
  Mail,
  Search,
  Shield,
  Settings,
  Star,
  Heart,
  User,
  MessageSquare,
  Phone,
};

export const iconForService = (iconName?: string | null): LucideIcon => {
  return iconMap[iconName || ''] || Wrench;
};
