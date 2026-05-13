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

export function getRoleNav(role: AppRole): NavItem[] {
  const commonNav: NavItem[] = [
    { label: "Settings", to: "/settings", icon: Settings },
    { label: "Notifications", to: "/notifications", icon: Bell },
  ];

  const roleNavs: Record<AppRole, NavItem[]> = {
    patient: [
      { label: "Overview", to: "/patient", icon: LayoutDashboard },
      { label: "Find doctor", to: "/patient/find-doctor", icon: Stethoscope },
      { label: "Prescriptions", to: "/patient/prescriptions", icon: Pill },
      { label: "Adherence", to: "/patient/adherence", icon: BarChart3 },
      { label: "Scan QR", to: "/patient/scan-qr", icon: QrCode },
      { label: "Messages", to: "/patient/messages", icon: MessageCircle },
      ...commonNav,
    ],
    doctor: [
      { label: "Dashboard", to: "/doctor", icon: LayoutDashboard },
      { label: "My Patients", to: "/doctor/patients", icon: Users },
      { label: "E-Prescriptions", to: "/doctor/prescriptions", icon: FileText },
      { label: "Pending Review", to: "/doctor/pending", icon: ClipboardList },
      { label: "Messages", to: "/doctor/messages", icon: MessageCircle },
      ...commonNav,
    ],
    pharmacist: [
      { label: "Dashboard", to: "/pharmacy", icon: LayoutDashboard },
      { label: "Manage Medicines", to: "/pharmacy/medicines", icon: Package },
      { label: "Prescriptions", to: "/pharmacy/prescriptions", icon: FileText },
      { label: "Stock", to: "/pharmacy/stock", icon: BarChart3 },
      { label: "Messages", to: "/pharmacy/messages", icon: MessageCircle },
      ...commonNav,
    ],
    admin: [
      { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
      { label: "Users", to: "/admin/users", icon: Users },
      { label: "Pharmacist Approval", to: "/admin/pharmacist-approval", icon: ClipboardList },
      { label: "Reports", to: "/admin/reports", icon: BarChart3 },
      { label: "System Logs", to: "/admin/logs", icon: FileText },
      ...commonNav,
    ],
  };

  return roleNavs[role] || commonNav;
}
