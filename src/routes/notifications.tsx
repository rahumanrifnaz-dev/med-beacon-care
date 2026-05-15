import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { DashboardShell } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { Bell, Check, Clock, AlertCircle, Info, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  head: () => ({ meta: [{ title: "Notifications · MediCare+" }] }),
});

interface Notification {
  id: string;
  type: "info" | "warning" | "success" | "error";
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  action_url?: string;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "success",
    title: "Prescription Ready",
    message: "Your medication 'Aspirin 500mg' is ready for pickup at Central Pharmacy",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    action_url: "/patient/prescriptions",
  },
  {
    id: "2",
    type: "info",
    title: "Medication Reminder",
    message: "Don't forget to take your evening dose of Metformin at 8:00 PM",
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "3",
    type: "warning",
    title: "Low Adherence",
    message: "Your adherence this week is 60%. Try to maintain consistency with your medication schedule.",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: "4",
    type: "info",
    title: "Doctor's Message",
    message: "Dr. Sarah sent you a message regarding your recent checkup results.",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    action_url: "/patient/messages",
  },
  {
    id: "5",
    type: "success",
    title: "Refill Available",
    message: "Your prescription for 'Lisinopril 10mg' is eligible for refill",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
];

function NotificationsPage() {
  const { profile } = useAuth();
  useRequireRole(["patient", "doctor", "pharmacist", "admin"]);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (!profile) return;

    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) return console.error('Failed to load notifications', error);
      if (active) {
        setNotifications((data ?? []).map((n: any) => ({
          id: n.id,
          type: mapNotificationType(n.type),
          title: n.title,
          message: n.body ?? '',
          created_at: n.created_at,
          read: !!n.read_at,
          action_url: actionUrlFor(n.type, profile.role),
        })));
      }
    };

    void load();

    const channel = supabase
      .channel(`notifications:page:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload: any) => {
          const ev = payload.eventType;
          const record = (payload.new ?? payload.old) as any;
          if (!record) return;
          setNotifications((prev) => {
            if (ev === 'INSERT') {
              const n = {
                id: record.id,
                type: mapNotificationType(record.type),
                title: record.title,
                message: record.body ?? '',
                created_at: record.created_at,
                read: !!record.read_at,
                action_url: actionUrlFor(record.type, profile.role),
              } as Notification;
              return [n, ...prev];
            }
            if (ev === 'UPDATE') {
              return prev.map((p) => (p.id === record.id ? { ...p, title: record.title, message: record.body ?? '', read: !!record.read_at } : p));
            }
            if (ev === 'DELETE') {
              return prev.filter((p) => p.id !== record.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  if (!profile) return null;

  const nav = getRoleNav(profile.role);
  const filteredNotifications = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const openNotification = async (n: Notification) => {
    if (!n.read) await markAsRead(n.id);
    if (n.action_url) navigate({ to: n.action_url as any });
  };

  const markAsRead = async (id: string) => {
    const ts = new Date().toISOString();
    const { error } = await supabase.from('notifications').update({ read_at: ts }).eq('id', id);
    if (error) return toast.error(error.message ?? 'Failed to mark read');
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = async () => {
    const ts = new Date().toISOString();
    const { error } = await supabase.from('notifications').update({ read_at: ts }).eq('user_id', profile?.id ?? '');
    if (error) return toast.error(error.message ?? 'Failed to mark all read');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) return toast.error(error.message ?? 'Failed to delete');
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success('Notification deleted');
  };

  const clearAll = async () => {
    if (!confirm('Are you sure you want to clear all notifications?')) return;
    const { error } = await supabase.from('notifications').delete().eq('user_id', profile?.id ?? '');
    if (error) return toast.error(error.message ?? 'Failed to clear');
    setNotifications([]);
    toast.success('All notifications cleared');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <Check className="w-5 h-5 text-success" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getNotificationBgClass = (type: string, read: boolean) => {
    if (read) return "bg-secondary/20";
    switch (type) {
      case "success":
        return "bg-success/10 border-l-4 border-success";
      case "warning":
        return "bg-warning/10 border-l-4 border-warning";
      case "error":
        return "bg-destructive/10 border-l-4 border-destructive";
      default:
        return "bg-primary/10 border-l-4 border-primary";
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardShell role={profile.role} name={profile.full_name ?? "User"} nav={nav}>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6" />
              Notifications
            </h2>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-2 text-sm rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-primary font-medium"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={clearAll}
                className="px-3 py-2 text-sm rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors text-destructive font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === "all"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === "unread"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications list */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg transition-all ${getNotificationBgClass(
                  notification.type,
                  notification.read
                )} cursor-pointer hover:bg-secondary/40`}
                onClick={() => openNotification(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{notification.title}</h3>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1 hover:bg-secondary/60 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(notification.created_at)}
                      </span>
                      {notification.action_url && (
                        <span className="text-xs font-medium text-primary">
                          View Details →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function mapNotificationType(t: string | null | undefined): Notification["type"] {
  switch (t) {
    case "prescription_dispensed":
    case "verification":
      return "success";
    case "patient_disconnected":
      return "warning";
    default:
      return "info";
  }
}

function actionUrlFor(t: string | null | undefined, role: string): string | undefined {
  switch (t) {
    case "new_prescription":
    case "prescription_dispensed":
      return role === "patient" ? "/patient/prescriptions" : undefined;
    case "new_prescription_pharmacy":
      return role === "pharmacist" ? "/pharmacy/prescriptions" : undefined;
    case "patient_connected":
    case "patient_disconnected":
      return role === "doctor" ? "/doctor/patients" : undefined;
    case "doctor_logged":
      return role === "patient" ? "/patient/adherence" : undefined;
    case "message":
      if (role === "patient") return "/patient/messages";
      if (role === "doctor") return "/doctor/messages";
      if (role === "pharmacist") return "/pharmacy/messages";
      return undefined;
    case "verification":
      return "/settings";
    default:
      return undefined;
  }
}
