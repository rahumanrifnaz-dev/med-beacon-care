import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUnreadCounts(userId?: string | null) {
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);

  useEffect(() => {
    if (!userId) {
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }

    let active = true;

    const loadCounts = async () => {
      try {
        const notif = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("read_at", null);
        const notifCount = (notif.count as number) ?? 0;

        const msgs = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", userId)
          .is("read_at", null);
        const msgCount = (msgs.count as number) ?? 0;

        if (active) {
          setUnreadNotifications(notifCount);
          setUnreadMessages(msgCount);
        }
      } catch (err) {
        // swallow, keep counts at current values
        console.error("Failed to load unread counts:", err);
      }
    };

    void loadCounts();

    // remove any existing channel for this user to avoid adding callbacks after subscribe()
    try {
      const existing = supabase.getChannels?.().find((c: any) => String(c.topic).includes(`unread:${userId}`));
      if (existing) supabase.removeChannel(existing);
    } catch (e) {
      // ignore; getChannels may not be available in some runtime environments
    }

    const channel = supabase
      .channel(`unread:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => void loadCounts(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
        () => void loadCounts(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { unreadNotifications, unreadMessages };
}
