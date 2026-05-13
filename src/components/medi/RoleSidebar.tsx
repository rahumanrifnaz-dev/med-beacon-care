import { AppRole } from "@/lib/auth";
import { NavItem } from "./DashboardShell";
import {
  LayoutDashboard,
  MessageCircle,
  Pill,
  QrCode,
  Stethoscope,
  Users,
  Package,
  FileText,
  ClipboardList,
  Settings,
  Bell,
  BarChart3,
} from "lucide-react";

/**
 * Permissions map: single source of truth for sidebar links.
 * Each item declares which roles may see it. Sidebar filters by current role,
 * so adding/removing access is just editing the `roles` array.
 */
export interface MenuItem extends NavItem {
  roles: AppRole[];
}

export const MENU_ITEMS: MenuItem[] = [
  // Role-specific dashboards
  { label: "Overview", to: "/patient", icon: LayoutDashboard, roles: ["patient"] },
  { label: "Dashboard", to: "/doctor", icon: LayoutDashboard, roles: ["doctor"] },
  { label: "Dashboard", to: "/pharmacy", icon: LayoutDashboard, roles: ["pharmacist"] },
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, roles: ["admin"] },

  // Patient
  { label: "Find doctor", to: "/patient/find-doctor", icon: Stethoscope, roles: ["patient"] },
  { label: "Prescriptions", to: "/patient/prescriptions", icon: Pill, roles: ["patient"] },
  { label: "Adherence", to: "/patient/adherence", icon: BarChart3, roles: ["patient"] },
  { label: "Scan QR", to: "/patient/scan-qr", icon: QrCode, roles: ["patient"] },

  // Doctor
  { label: "My Patients", to: "/doctor/patients", icon: Users, roles: ["doctor"] },
  { label: "E-Prescriptions", to: "/doctor/prescriptions", icon: FileText, roles: ["doctor"] },
  { label: "Pending Review", to: "/doctor/pending", icon: ClipboardList, roles: ["doctor"] },

  // Pharmacist
  { label: "Manage Medicines", to: "/pharmacy/medicines", icon: Package, roles: ["pharmacist"] },
  { label: "Prescriptions", to: "/pharmacy/prescriptions", icon: FileText, roles: ["pharmacist"] },
  { label: "Stock", to: "/pharmacy/stock", icon: BarChart3, roles: ["pharmacist"] },

  // Admin
  { label: "Users", to: "/admin/users", icon: Users, roles: ["admin"] },
  { label: "Pharmacist Approval", to: "/admin/pharmacist-approval", icon: ClipboardList, roles: ["admin"] },
  { label: "Reports", to: "/admin/reports", icon: BarChart3, roles: ["admin"] },
  { label: "System Logs", to: "/admin/logs", icon: FileText, roles: ["admin"] },

  // Shared
  { label: "Messages", to: "/patient/messages", icon: MessageCircle, roles: ["patient"] },
  { label: "Messages", to: "/doctor/messages", icon: MessageCircle, roles: ["doctor"] },
  { label: "Messages", to: "/pharmacy/messages", icon: MessageCircle, roles: ["pharmacist"] },
  { label: "Notifications", to: "/notifications", icon: Bell, roles: ["patient", "doctor", "pharmacist", "admin"] },
  { label: "Settings", to: "/settings", icon: Settings, roles: ["patient", "doctor", "pharmacist", "admin"] },
];

export function getRoleNav(role: AppRole): NavItem[] {
  return MENU_ITEMS.filter((item) => item.roles.includes(role));
}
