import {
  LayoutDashboard,
  MessagesSquare,
  AlertCircle,
  BookOpen,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/assistant", label: "Asystent AI", icon: Sparkles },
  { href: "/app/conversations", label: "Rozmowy", icon: MessagesSquare },
  { href: "/app/problems", label: "Problematyczne pytania", icon: AlertCircle },
  { href: "/app/faq", label: "Baza wiedzy (FAQ)", icon: BookOpen },
  { href: "/app/tools", label: "Widgety agenta", icon: Wrench },
];
