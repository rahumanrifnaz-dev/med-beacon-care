import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUnreadCounts } from "@/lib/unread";
import { captureError } from "@/lib/logging";

export function NotificationBell() {
  const { user, profile } = useAuth();
  const { unreadNotifications } = useUnreadCounts(user?.id ?? null);
  const unread = unreadNotifications;

  return (
    <Link to="/notifications" className="p-2 rounded-xl hover:bg-secondary/60 transition-colors relative" aria-label="Notifications">
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 px-1 rounded-full bg-accent text-accent-foreground font-bold flex items-center justify-center"
          style={{ minWidth: 18, height: 18, fontSize: 10 }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}