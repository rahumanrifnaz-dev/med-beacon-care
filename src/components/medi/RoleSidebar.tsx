import { AppRole } from "@/lib/auth";
import { NavItem } from "./DashboardShell";
import { MENU_ITEMS, getRoleNav as getRoleNavFromConfig } from "./sidebarConfig";

export interface MenuItem extends NavItem {
  roles: AppRole[];
}

// Re-export getRoleNav to preserve existing imports across the codebase.
export function getRoleNav(role: AppRole): NavItem[] {
  return getRoleNavFromConfig(role);
}
