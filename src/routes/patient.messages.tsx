import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Panel } from "@/components/medi/DashboardShell";
import { useAuth, useRequireRole } from "@/lib/auth";
import { getRoleNav } from "@/components/medi/RoleSidebar";
import { Send, MessageCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/patient/messages")({
  component: PatientMessages,
  head: () => ({ meta: [{ title: "Messages · MediCare+" }] }),
});

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender?: { full_name: string | null };
}

function PatientMessages() {
  const { profile, user } = useAuth();
  useRequireRole("patient");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const doctorId = profile?.doctor_id;

  const loadMessages = async () => {
    if (!user || !doctorId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${doctorId}),and(sender_id.eq.${doctorId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data as Message[]);
    } catch (err) {
      console.error("Failed to load messages:", err);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    setDeleting(messageId);
    try {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) {
        toast.error("Message not found");
        return;
      }
      if (msg.sender_id !== user?.id) {
        toast.error("You can only delete your own messages");
        return;
      }

      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
      setMessages(messages.filter(m => m.id !== messageId));
      toast.success("Message deleted");
    } catch (err) {
      console.error("Failed to delete message:", err);
      toast.error("Failed to delete message");
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    loadMessages();

    if (!user || !doctorId) return;

    const channel = supabase
      .channel(`messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          void loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, doctorId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !doctorId) return;

    // Basic server-side style validation: limit message length
    const content = newMessage.trim().slice(0, 2000);

    try {
      // Rate-limit: allow max 5 messages per 30 seconds per sender
      const since = new Date(Date.now() - 30 * 1000).toISOString();
      const { count, error: countErr } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", user.id)
        .gt("created_at", since);

      if (countErr) {
        console.error("Failed to check message rate:", countErr);
      } else if ((count ?? 0) >= 5) {
        toast.error("You're sending messages too quickly. Please wait a moment.");
        return;
      }

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: doctorId,
        content,
      });

      if (error) throw error;
      setNewMessage("");
      await loadMessages();
      toast.success("Message sent");
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
    }
  };

  if (!profile) return null;

  if (!doctorId) {
    return (
      <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "there"} nav={getRoleNav(profile.role)}>
        <Panel title="Messages" subtitle="Chat with your doctor">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No doctor connected. Connect a doctor first in Find Doctor section.</p>
          </div>
        </Panel>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role={profile.role} name={profile.full_name?.split(" ")[0] ?? "there"} nav={getRoleNav(profile.role)}>
      <Panel title="Messages with your Doctor" subtitle="Direct communication">
        <div className="flex flex-col h-full min-h-96 rounded-xl border border-border bg-background">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"} group`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg relative ${
                      msg.sender_id === user?.id
                        ? "bg-gradient-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                    {msg.sender_id === user?.id && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        disabled={deleting === msg.id}
                        className="opacity-0 group-hover:opacity-100 absolute -right-8 top-1/2 -translate-y-1/2 p-1 hover:text-destructive transition-all disabled:opacity-50"
                        title="Delete message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-4 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow transition-shadow flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </Panel>
    </DashboardShell>
  );
}
