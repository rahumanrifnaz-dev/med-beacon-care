import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function NotificationBell() {
  const { user, profile } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }

    let active = true;

    const loadCount = async () => {
      try {
        // Fetch user-specific unread notifications
        const { data: userData } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", user.id)
          .is("read_at", null);

        if (active) setUnread(userData?.length ?? 0);
      } catch (err) {
        console.error("Notification count error:", err);
        if (active) setUnread(0);
      }
    };

    void loadCount();

    const channelUser = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          void loadCount();
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channelUser);
    };
  }, [user?.id]);

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