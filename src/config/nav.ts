import {
  LayoutDashboard,
  Users,
  Kanban,
  Settings,
  Tags,
  Landmark,
  FileSignature,
  Mail,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Contacts", href: "/contacts", icon: Users },
  { title: "Pipeline", href: "/pipeline", icon: Kanban },
  { title: "Loans", href: "/loans", icon: Landmark },
  { title: "Documents", href: "/documents", icon: FileSignature },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Inbox", href: "/inbox", icon: Mail },
  { title: "Tags", href: "/settings/tags", icon: Tags },
  { title: "Settings", href: "/settings", icon: Settings },
];
